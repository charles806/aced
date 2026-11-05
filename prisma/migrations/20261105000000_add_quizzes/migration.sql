-- CreateTable Quiz
CREATE TABLE "Quiz" (
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    "sourceNoteId" TEXT,
    "timeLimit" INTEGER,
    "questionCount" INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "Quiz_pkey" PRIMARY KEY (id)
);

CREATE INDEX "Quiz_userId_idx" ON "Quiz"("userId");
CREATE INDEX "Quiz_sourceNoteId_idx" ON "Quiz"("sourceNoteId");
CREATE UNIQUE INDEX "Quiz_userId_idempotencyKey_key" ON "Quiz"("userId","idempotencyKey");

-- CreateTable QuizQuestion
CREATE TABLE "QuizQuestion" (
    id TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    prompt TEXT NOT NULL,
    options TEXT[] NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    explanation TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY (id)
);

CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");
CREATE INDEX "QuizQuestion_quizId_position_idx" ON "QuizQuestion"("quizId","position");

-- CreateTable QuizAttempt
CREATE TABLE "QuizAttempt" (
    id TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    status TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    deadline TIMESTAMP(3) NOT NULL,
    score INTEGER,
    "correctCount" INTEGER,
    "incorrectCount" INTEGER,
    "unansweredCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY (id)
);

CREATE INDEX "QuizAttempt_userId_idx" ON "QuizAttempt"("userId");
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");
CREATE INDEX "QuizAttempt_userId_quizId_idx" ON "QuizAttempt"("userId","quizId");
CREATE INDEX "QuizAttempt_status_idx" ON "QuizAttempt"("status");

-- CreateTable QuizAnswer
CREATE TABLE "QuizAnswer" (
    id TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuizAnswer_pkey" PRIMARY KEY (id),
    CONSTRAINT "QuizAnswer_attemptId_questionId_key" UNIQUE ("attemptId","questionId")
);

CREATE INDEX "QuizAnswer_attemptId_idx" ON "QuizAnswer"("attemptId");
CREATE INDEX "QuizAnswer_questionId_idx" ON "QuizAnswer"("questionId");

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_sourceNoteId_fkey" FOREIGN KEY ("sourceNoteId") REFERENCES "Note"(id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RadonUser"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "RadonUser"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "QuizAttempt"(id) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizAnswer" ADD CONSTRAINT "QuizAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"(id) ON DELETE CASCADE ON UPDATE CASCADE;
