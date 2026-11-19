/**
 * Flashcard repository.
 * Data access layer for flashcard decks, cards, and progress.
 */

import { BaseRepository, type PaginatedResult } from "@/app/lib/repositories/base.repository";
import { prisma } from "@/app/lib/auth";
import { Prisma } from "@/app/generated/prisma/client";

export interface DeckWithCounts {
  id: string;
  title: string;
  difficulty: string | null;
  sourceNoteId: string | null;
  idempotencyKey: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  _count: {
    cards: number;
  };
}

export interface DeckDetail extends DeckWithCounts {
  cards: DeckCard[];
  progress: DeckProgress[];
}

export interface DeckCard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeckProgress {
  id: string;
  userId: string;
  deckId: string;
  cardId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardProgressDetail {
  id: string;
  userId: string;
  deckId: string;
  cardId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeckFilters {
  sourceNoteId?: string;
}

export interface CreateDeckData {
  title: string;
  difficulty: string | null;
  sourceNoteId: string | null;
  userId: string;
  idempotencyKey?: string | null;
}

export interface UpdateDeckData {
  title?: string;
  difficulty?: string | null;
}

export interface CreateCardData {
  deckId: string;
  front: string;
  back: string;
  position: number;
}

export interface UpdateCardData {
  front?: string;
  back?: string;
  position?: number;
}

export interface UpsertProgressData {
  userId: string;
  deckId: string;
  cardId: string;
  status: string;
}

export class FlashcardRepository extends BaseRepository {
  /**
   * Find a deck by ID and user ID with counts
   */
  async findByIdAndUserId(deckId: string, userId: string): Promise<DeckWithCounts | null> {
    const deck = await prisma.flashcardDeck.findFirst({
      where: { id: deckId, userId },
      include: { _count: { select: { cards: true } } },
    });
    return deck as DeckWithCounts | null;
  }

  /**
   * Find a deck by ID and user ID with cards and progress
   */
  async findDetailByIdAndUserId(deckId: string, userId: string): Promise<DeckDetail | null> {
    const deck = await prisma.flashcardDeck.findFirst({
      where: { id: deckId, userId },
      include: {
        _count: { select: { cards: true } },
        cards: { orderBy: { position: "asc" } },
        progress: { select: { cardId: true, status: true } },
      },
    });
    if (!deck) return null;
    return {
      ...deck,
      cards: deck.cards as DeckCard[],
      progress: deck.progress as DeckProgress[],
    };
  }

  /**
   * Find many decks by user ID with counts
   */
  async findManyByUserId(userId: string, filters: DeckFilters = {}): Promise<DeckWithCounts[]> {
    const where: Prisma.FlashcardDeckWhereInput = { userId };
    if (filters.sourceNoteId) {
      where.sourceNoteId = filters.sourceNoteId;
    }

    const decks = await prisma.flashcardDeck.findMany({
      where,
      include: { _count: { select: { cards: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return decks as DeckWithCounts[];
  }

  /**
   * Find many decks by user ID with pagination
   */
  async findManyByUserIdPaginated(
    userId: string,
    pagination: { page: number; limit: number },
    filters: DeckFilters = {}
  ): Promise<PaginatedResult<DeckWithCounts>> {
    const where: Prisma.FlashcardDeckWhereInput = { userId };
    if (filters.sourceNoteId) {
      where.sourceNoteId = filters.sourceNoteId;
    }

    return this.paginate(
      (args) =>
        prisma.flashcardDeck.findMany({
          ...args,
          include: { _count: { select: { cards: true } } },
        }) as Promise<DeckWithCounts[]>,
      (args) => prisma.flashcardDeck.count(args),
      where,
      { updatedAt: "desc" } as Prisma.FlashcardDeckOrderByWithRelationInput,
      pagination
    );
  }

  /**
   * Find deck by idempotency key
   */
  async findByIdempotencyKey(userId: string, idempotencyKey: string): Promise<DeckWithCounts | null> {
    const deck = await prisma.flashcardDeck.findFirst({
      where: { userId, idempotencyKey },
      include: { _count: { select: { cards: true } } },
    });
    return deck as DeckWithCounts | null;
  }

  /**
   * Create a new deck
   */
  async create(data: CreateDeckData): Promise<DeckWithCounts> {
    const deck = await prisma.flashcardDeck.create({
      data: {
        title: data.title,
        difficulty: data.difficulty,
        sourceNoteId: data.sourceNoteId,
        userId: data.userId,
        idempotencyKey: data.idempotencyKey,
      },
      include: { _count: { select: { cards: true } } },
    });
    return deck as DeckWithCounts;
  }

  /**
   * Create a deck with cards in a transaction
   */
  async createWithCards(
    deckData: CreateDeckData,
    cards: Array<Omit<CreateCardData, "deckId">>
  ): Promise<{ deck: DeckWithCounts; cardCount: number }> {
    const result = await prisma.$transaction(async (tx) => {
      const deck = await tx.flashcardDeck.create({
        data: {
          title: deckData.title,
          difficulty: deckData.difficulty,
          sourceNoteId: deckData.sourceNoteId,
          userId: deckData.userId,
          idempotencyKey: deckData.idempotencyKey,
        },
      });

      await tx.flashcard.createMany({
        data: cards.map((c, index) => ({
          deckId: deck.id,
          front: c.front,
          back: c.back,
          position: index,
        })),
      });

      return { deck, cardCount: cards.length };
    });

    // Fetch with counts
    const deckWithCounts = await this.findByIdAndUserId(result.deck.id, deckData.userId);
    return { deck: deckWithCounts!, cardCount: result.cardCount };
  }

  /**
   * Update a deck
   */
  async update(deckId: string, userId: string, data: UpdateDeckData): Promise<DeckWithCounts> {
    const updateData: Prisma.FlashcardDeckUpdateInput = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.difficulty !== undefined && data.difficulty !== null) updateData.difficulty = data.difficulty;

    const deck = await prisma.flashcardDeck.update({
      where: { id: deckId },
      data: updateData,
      include: { _count: { select: { cards: true } } },
    });
    return deck as DeckWithCounts;
  }

  /**
   * Delete a deck (and all cards/progress)
   */
  async delete(deckId: string, _userId: string): Promise<void> {
    await prisma.$transaction([
      prisma.flashcardProgress.deleteMany({ where: { deckId } }),
      prisma.flashcard.deleteMany({ where: { deckId } }),
      prisma.flashcardDeck.delete({ where: { id: deckId } }),
    ]);
  }

  /**
   * Check if user owns a deck
   */
  async userOwnsDeck(userId: string, deckId: string): Promise<boolean> {
    const count = await prisma.flashcardDeck.count({
      where: { id: deckId, userId },
    });
    return count > 0;
  }

  // ========================================================================
  // Cards
  // ========================================================================

  /**
   * Find cards for a deck
   */
  async findCardsByDeckId(deckId: string): Promise<DeckCard[]> {
    const cards = await prisma.flashcard.findMany({
      where: { deckId },
      orderBy: { position: "asc" },
    });
    return cards as DeckCard[];
  }

  /**
   * Find a card by ID and deck ID
   */
  async findCardById(deckId: string, cardId: string): Promise<DeckCard | null> {
    const card = await prisma.flashcard.findFirst({
      where: { id: cardId, deckId },
    });
    return card as DeckCard | null;
  }

  /**
   * Create a card
   */
  async createCard(data: CreateCardData): Promise<DeckCard> {
    const card = await prisma.flashcard.create({
      data: {
        deckId: data.deckId,
        front: data.front,
        back: data.back,
        position: data.position,
      },
    });
    return card as DeckCard;
  }

  /**
   * Update a card
   */
  async updateCard(cardId: string, data: UpdateCardData): Promise<DeckCard> {
    const card = await prisma.flashcard.update({
      where: { id: cardId },
      data: {
        front: data.front,
        back: data.back,
        position: data.position,
      },
    });
    return card as DeckCard;
  }

  /**
   * Delete a card
   */
  async deleteCard(cardId: string): Promise<void> {
    await prisma.flashcard.delete({
      where: { id: cardId },
    });
  }

  /**
   * Get max card position for a deck
   */
  async getMaxCardPosition(deckId: string): Promise<number> {
    const lastCard = await prisma.flashcard.findFirst({
      where: { deckId },
      orderBy: { position: "desc" },
      select: { position: true },
    });
    return lastCard?.position ?? -1;
  }

  // ========================================================================
  // Progress
  // ========================================================================

  /**
   * Find progress for a user and deck
   */
  async findProgressByUserAndDeck(userId: string, deckId: string): Promise<DeckProgress[]> {
    const progress = await prisma.flashcardProgress.findMany({
      where: { userId, deckId },
    });
    return progress as DeckProgress[];
  }

  /**
   * Upsert progress for a card
   */
  async upsertProgress(data: UpsertProgressData): Promise<CardProgressDetail> {
    const progress = await prisma.flashcardProgress.upsert({
      where: { userId_cardId: { userId: data.userId, cardId: data.cardId } },
      update: { status: data.status, updatedAt: new Date() },
      create: {
        userId: data.userId,
        deckId: data.deckId,
        cardId: data.cardId,
        status: data.status,
      },
    });
    return progress as CardProgressDetail;
  }
}

// Singleton instance
export const flashcardRepository = new FlashcardRepository();