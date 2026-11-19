/**
 * Flashcard service.
 * Contains business logic for flashcard operations.
 */

import {
  flashcardRepository,
  type DeckWithCounts,
  type DeckDetail,
  type DeckCard,
  type DeckProgress,
  type CardProgressDetail,
  type DeckFilters,
  type CreateDeckData,
  type UpdateDeckData,
  type CreateCardData,
  type UpdateCardData,
  type UpsertProgressData,
} from "@/app/lib/repositories";

import { BaseService } from "./base.service";
import { canUseFreeFeature, incrementUsage } from "@/app/lib/billing/limits";
import { generateText } from "@/app/lib/ai/ai";
import {
  buildFlashcardsInput,
  parseFlashcardsOutput,
  resolveFlashcardSourceText,
  type FlashcardDifficulty,
} from "@/app/lib/ai/flashcards-prompt";
import { prisma } from "@/app/lib/auth";

const MODEL_UNAVAILABLE_MESSAGE = "Flashcards unavailable right now. Please try again.";
const NOT_READY_MESSAGE = "This note isn't ready for flashcards yet. Wait for text extraction to finish, then try again.";
const UNREADABLE_MESSAGE = "We couldn't read this note. Try re-uploading it as a clearer PDF or image.";

export class FlashcardService extends BaseService {
  protected readonly resourceName = "Deck";

  // ========================================================================
  // Decks
  // ========================================================================

  /**
   * List all decks for a user
   */
  async list(userId: string, filters: DeckFilters = {}): Promise<FlashcardServiceResponse<DeckWithCounts[]>> {
    return this.tryCatch(
      () => flashcardRepository.findManyByUserId(userId, filters),
      "Failed to list decks"
    );
  }

  /**
   * Paginated list of decks for a user
   */
  async listPaginated(
    userId: string,
    page: number,
    limit: number,
    filters: DeckFilters = {}
  ): Promise<FlashcardServiceResponse<{ items: DeckWithCounts[]; total: number; page: number; limit: number; totalPages: number }>> {
    return this.tryCatch(
      () => flashcardRepository.findManyByUserIdPaginated(userId, { page, limit }, filters),
      "Failed to list decks"
    );
  }

  /**
   * Get a single deck by ID (with counts)
   */
  async getById(userId: string, deckId: string): Promise<FlashcardServiceResponse<DeckWithCounts | null>> {
    return this.tryCatch(async () => {
      const deck = await flashcardRepository.findByIdAndUserId(deckId, userId);
      if (!deck) {
        return this.notFoundError();
      }
      return this.success(deck);
    }, "Failed to get deck");
  }

  /**
   * Get a single deck by ID with cards and progress
   */
  async getDetailById(userId: string, deckId: string): Promise<FlashcardServiceResponse<DeckDetail | null>> {
    return this.tryCatch(async () => {
      const deck = await flashcardRepository.findDetailByIdAndUserId(deckId, userId);
      if (!deck) {
        return this.notFoundError();
      }
      return this.success(deck);
    }, "Failed to get deck");
  }

  /**
   * Create a manual deck
   */
  async create(userId: string, data: CreateDeckData): Promise<FlashcardServiceResponse<DeckWithCounts>> {
    return this.tryCatch(async () => {
      // Check free tier limit for decks (unlimited now, but keep for consistency)
      await this.checkQuota(userId, "flashcardDecks", canUseFreeFeature, "decks");

      // Check for existing deck with same idempotency key
      if (data.idempotencyKey) {
        const existing = await flashcardRepository.findByIdempotencyKey(userId, data.idempotencyKey);
        if (existing) {
          return this.success(existing);
        }
      }

      // Validate sourceNoteId if provided
      if (data.sourceNoteId) {
        const note = await prisma.note.findFirst({
          where: { id: data.sourceNoteId, userId },
        });
        if (!note) {
          return this.notFoundError("Source note");
        }
      }

      const deck = await flashcardRepository.create(data);

      await this.incrementQuota(userId, "flashcardDecks", incrementUsage);

      await this.logActivity({
        userId,
        type: "flashcard_deck_created",
        label: `Created deck "${deck.title}"`,
      });

      return this.success(deck);
    }, "Failed to create deck");
  }

  /**
   * Generate a deck from a note using AI
   */
  async generateFromNote(
    userId: string,
    noteId: string,
    options: {
      title?: string;
      count: number;
      difficulty: string;
      idempotencyKey?: string | null;
    }
  ): Promise<FlashcardServiceResponse<DeckWithCounts>> {
    return this.tryCatch(async () => {
      // Check free tier limit for decks
      await this.checkQuota(userId, "flashcardDecks", canUseFreeFeature, "decks");

      // Check for existing deck with same idempotency key
      if (options.idempotencyKey) {
        const existing = await flashcardRepository.findByIdempotencyKey(userId, options.idempotencyKey);
        if (existing) {
          return this.success(existing);
        }
      }

      // Find the note
      const note = await prisma.note.findFirst({
        where: { id: noteId, userId },
      });
      if (!note) {
        return this.notFoundError("Note");
      }

      // Resolve source text
      const noteText = resolveFlashcardSourceText({
        content: note.content,
        extractedText: note.extractedText,
        fileUrl: note.fileUrl,
        fileName: note.fileName,
        fileType: note.fileType,
      });

      if (!noteText) {
        if (note.extractionStatus === "failed") {
          return this.unprocessableEntityError(UNREADABLE_MESSAGE);
        }
        return this.conflictError(NOT_READY_MESSAGE);
      }

      const deckTitle = options.title ?? note.title;

      // Generate cards
      let raw: string;
      try {
        raw = await generateText(
          buildFlashcardsInput(note.title, noteText, options.count, options.difficulty as FlashcardDifficulty),
          { feature: "flashcards" },
        );
      } catch {
        return this.serviceUnavailableError(MODEL_UNAVAILABLE_MESSAGE);
      }

      // Parse and validate AI output
      const cards = parseFlashcardsOutput(raw, options.count);
      if (!cards) {
        return this.serviceUnavailableError(MODEL_UNAVAILABLE_MESSAGE);
      }

      // Persist deck and cards in transaction
      const created = await flashcardRepository.createWithCards(
        {
          title: deckTitle,
          difficulty: options.difficulty,
          sourceNoteId: noteId,
          userId,
          idempotencyKey: options.idempotencyKey,
        },
        cards.map((c) => ({
          front: c.front,
          back: c.back,
          position: 0, // Will be set by index in createWithCards
        }))
      );

      await this.incrementQuota(userId, "flashcardDecks", incrementUsage);

      await this.logActivity({
        userId,
        type: "flashcard_deck_created",
        noteId,
        label: `Generated deck "${created.deck.title}" from "${note.title}"`,
      });

      return this.success(created.deck);
    }, "Failed to generate deck");
  }

  /**
   * Update a deck
   */
  async update(userId: string, deckId: string, data: UpdateDeckData): Promise<FlashcardServiceResponse<DeckWithCounts>> {
    return this.tryCatch(async () => {
      // Verify ownership
      const owns = await flashcardRepository.userOwnsDeck(userId, deckId);
      if (!owns) {
        return this.forbiddenError();
      }

      const deck = await flashcardRepository.update(deckId, userId, data);

      await this.logActivity({
        userId,
        type: "flashcard_deck_updated",
        label: `Updated deck "${deck.title}"`,
      });

      return this.success(deck);
    }, "Failed to update deck");
  }

  /**
   * Delete a deck
   */
  async delete(userId: string, deckId: string): Promise<FlashcardServiceResponse<{ deleted: true }>> {
    return this.tryCatch(async () => {
      const deck = await flashcardRepository.findByIdAndUserId(deckId, userId);
      if (!deck) {
        return this.notFoundError();
      }

      await flashcardRepository.delete(deckId, userId);

      await this.logActivity({
        userId,
        type: "flashcard_deck_deleted",
        label: `Deleted deck "${deck.title}"`,
      });

      return this.success({ deleted: true });
    }, "Failed to delete deck");
  }

  // ========================================================================
  // Cards
  // ========================================================================

  /**
   * Get cards for a deck
   */
  async getCards(userId: string, deckId: string): Promise<FlashcardServiceResponse<DeckCard[]>> {
    return this.tryCatch(async () => {
      const owns = await flashcardRepository.userOwnsDeck(userId, deckId);
      if (!owns) {
        return this.forbiddenError();
      }

      const cards = await flashcardRepository.findCardsByDeckId(deckId);
      return this.success(cards);
    }, "Failed to get cards");
  }

  /**
   * Add a card to a deck
   */
  async addCard(
    userId: string,
    deckId: string,
    data: Omit<CreateCardData, "deckId" | "position">
  ): Promise<FlashcardServiceResponse<DeckCard>> {
    return this.tryCatch(async () => {
      const owns = await flashcardRepository.userOwnsDeck(userId, deckId);
      if (!owns) {
        return this.forbiddenError();
      }

      const position = await flashcardRepository.getMaxCardPosition(deckId);
      const card = await flashcardRepository.createCard({
        ...data,
        deckId,
        position: position + 1,
      });

      return this.success(card);
    }, "Failed to add card");
  }

  /**
   * Update a card
   */
  async updateCard(userId: string, deckId: string, cardId: string, data: UpdateCardData): Promise<FlashcardServiceResponse<DeckCard>> {
    return this.tryCatch(async () => {
      const owns = await flashcardRepository.userOwnsDeck(userId, deckId);
      if (!owns) {
        return this.forbiddenError();
      }

      const card = await flashcardRepository.findCardById(deckId, cardId);
      if (!card) {
        return this.notFoundError("Card");
      }

      const updated = await flashcardRepository.updateCard(cardId, data);
      return this.success(updated);
    }, "Failed to update card");
  }

  /**
   * Delete a card
   */
  async deleteCard(userId: string, deckId: string, cardId: string): Promise<FlashcardServiceResponse<{ deleted: true }>> {
    return this.tryCatch(async () => {
      const owns = await flashcardRepository.userOwnsDeck(userId, deckId);
      if (!owns) {
        return this.forbiddenError();
      }

      const card = await flashcardRepository.findCardById(deckId, cardId);
      if (!card) {
        return this.notFoundError("Card");
      }

      // Also delete any progress for this card
      await prisma.flashcardProgress.deleteMany({ where: { cardId } });
      await flashcardRepository.deleteCard(cardId);

      return this.success({ deleted: true });
    }, "Failed to delete card");
  }

  // ========================================================================
  // Progress
  // ========================================================================

  /**
   * Get progress for a deck
   */
  async getProgress(userId: string, deckId: string): Promise<FlashcardServiceResponse<DeckProgress[]>> {
    return this.tryCatch(async () => {
      const owns = await flashcardRepository.userOwnsDeck(userId, deckId);
      if (!owns) {
        return this.forbiddenError();
      }

      const progress = await flashcardRepository.findProgressByUserAndDeck(userId, deckId);
      return this.success(progress);
    }, "Failed to get progress");
  }

  /**
   * Update progress for a card
   */
  async updateProgress(
    userId: string,
    deckId: string,
    cardId: string,
    status: string
  ): Promise<FlashcardServiceResponse<CardProgressDetail>> {
    return this.tryCatch(async () => {
      const owns = await flashcardRepository.userOwnsDeck(userId, deckId);
      if (!owns) {
        return this.forbiddenError();
      }

      // Verify card belongs to deck
      const card = await flashcardRepository.findCardById(deckId, cardId);
      if (!card) {
        return this.notFoundError("Card");
      }

      const progress = await flashcardRepository.upsertProgress({
        userId,
        deckId,
        cardId,
        status,
      });

      await this.logActivity({
        userId,
        type: "flashcard_studied",
        label: `Studied card (${status})`,
      });

      return this.success(progress);
    }, "Failed to update progress");
  }
}

// Type exports for backward compatibility
export type FlashcardServiceResponse<T> = import("./base.service").ServiceResponse<T>;
export type FlashcardServiceResult<T> = import("./base.service").ServiceResult<T>;
export type FlashcardServiceError = import("./base.service").ServiceError;

// Singleton instance
export const flashcardService = new FlashcardService();

// Type exports for the route handlers
export type { DeckWithCounts, DeckDetail, DeckCard, DeckFilters, CreateDeckData, UpdateDeckData, CreateCardData, UpdateCardData };