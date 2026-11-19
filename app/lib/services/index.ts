/**
 * Service exports.
 * Centralized access to all services.
 */

export { SubjectService, subjectService } from "./subject.service";
export { NoteService, noteService } from "./note.service";
export { QuizService, quizService } from "./quiz.service";
export { FlashcardService, flashcardService } from "./flashcard.service";
export type { ServiceResponse, ServiceError, ServiceResult, ServiceErrorCode } from "./base.service";