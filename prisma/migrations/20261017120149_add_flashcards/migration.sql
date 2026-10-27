-- Create flashcard decks, cards, and study progress tables.

CREATE TABLE "FlashcardDeck" (
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    difficulty TEXT,
    "sourceNoteId" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "FlashcardDeck_pkey" PRIMARY KEY (id),
    CONSTRAINT "FlashcardDeck_sourceNoteId_fkey" FOREIGN KEY ("sourceNoteId") REFERENCES "Note"(id) ON DELETE SET NULL,
    CONSTRAINT "FlashcardDeck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RadonUser"(id) ON DELETE CASCADE
);

CREATE TABLE "Flashcard" (
    id TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Flashcard_pkey" PRIMARY KEY (id),
    CONSTRAINT "Flashcard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"(id) ON DELETE CASCADE
);

CREATE TABLE "FlashcardProgress" (
    id TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deckId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    status TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FlashcardProgress_pkey" PRIMARY KEY (id),
    CONSTRAINT "FlashcardProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RadonUser"(id) ON DELETE CASCADE,
    CONSTRAINT "FlashcardProgress_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES "FlashcardDeck"(id) ON DELETE CASCADE,
    CONSTRAINT "FlashcardProgress_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Flashcard"(id) ON DELETE CASCADE
);

-- Indexes.
CREATE INDEX "FlashcardDeck_userId_idx" ON "FlashcardDeck"("userId");
CREATE INDEX "FlashcardDeck_sourceNoteId_idx" ON "FlashcardDeck"("sourceNoteId");
CREATE UNIQUE INDEX "FlashcardDeck_userId_idempotencyKey_key" ON "FlashcardDeck"("userId", "idempotencyKey");
CREATE INDEX "Flashcard_deckId_idx" ON "Flashcard"("deckId");
CREATE INDEX "Flashcard_deckId_position_idx" ON "Flashcard"("deckId", "position");
CREATE INDEX "FlashcardProgress_userId_deckId_idx" ON "FlashcardProgress"("userId", "deckId");
CREATE INDEX "FlashcardProgress_cardId_idx" ON "FlashcardProgress"("cardId");
CREATE UNIQUE INDEX "FlashcardProgress_userId_cardId_key" ON "FlashcardProgress"("userId", "cardId");

-- Add relations to existing models (Note.userId referenced above already exists).
