/**
 * Repository exports.
 * Centralized access to all repositories.
 */

export { BaseRepository, type PaginationParams, type PaginatedResult } from "./base.repository";
export { SubjectRepository, subjectRepository, type SubjectWithCounts, type CreateSubjectData, type UpdateSubjectData } from "./subject.repository";
export { NoteRepository, noteRepository, type NoteWithSignedUrl, type NoteFilters, type CreateNoteData, type UpdateNoteData } from "./note.repository";
export { QuizRepository, quizRepository, type QuizWithCounts, type QuizDetail, type QuizQuestion, type QuizAttemptWithAnswers, type QuizAnswer, type QuizFilters, type CreateQuizData, type UpdateQuizData, type CreateQuestionData, type UpdateQuestionData, type CreateAttemptData, type SubmitAttemptData } from "./quiz.repository";
export { FlashcardRepository, flashcardRepository, type DeckWithCounts, type DeckDetail, type DeckCard, type DeckProgress, type CardProgressDetail, type DeckFilters, type CreateDeckData, type UpdateDeckData, type CreateCardData, type UpdateCardData, type UpsertProgressData } from "./flashcard.repository";