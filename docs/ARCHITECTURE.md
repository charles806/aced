# ACED Architecture Documentation

## Overview

ACED is a Next.js 16.3.3 application using the App Router with React Server Components, built for educational content creation and study tools.

## Tech Stack

- **Framework**: Next.js 16.3.3 (App Router, RSC)
- **Database**: PostgreSQL with Prisma ORM 7.9.1
- **Authentication**: Radon SDK (Radon Auth)
- **Background Jobs**: Inngest
- **AI/ML**: Vercel AI SDK with multi-provider abstraction (NIM, brewkeg)
- **File Storage**: Radon Storage (S3-compatible)
- **Validation**: Zod
- **UI**: React 19, Tailwind CSS, Radix UI primitives

## Layered Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      API Routes (app/api/)                   │
│  - Request validation (Zod)                                  │
│  - Authentication & authorization                            │
│  - Response formatting (standardized envelopes)              │
└──────────────────────────┬────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────┐
│                     Services (app/lib/services/)               │
│  - Business logic                                            │
│  - Quota enforcement (free tier)                             │
│  - Activity logging                                          │
│  - AI orchestration                                          │
│  - Ownership verification                                    │
│  - Extends BaseService for shared patterns                   │
└──────────────────────────┬────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────┐
│                   Repositories (app/lib/repositories/)         │
│  - Data access layer                                         │
│  - Prisma queries                                            │
│  - Pagination, filtering, sorting                            │
│  - Extends BaseRepository for shared patterns                │
└──────────────────────────┬────────────────────────────────────┘
                           │
┌──────────────────────────▼────────────────────────────────────┐
│                     Database (Prisma/PostgreSQL)               │
└────────────────────────────────────────────────────────────────┘
```

## Domain Structure

```
app/
├── api/                    # API Routes (thin controllers)
│   ├── ai/tutor/           # AI Tutor conversations
│   ├── billing/            # Subscription management
│   ├── flashcards/         # Flashcard decks & cards
│   ├── notes/              # Notes with file upload
│   ├── quizzes/            # Quizzes, questions, attempts
│   ├── subject/            # Subject management
│   └── webhooks/           # Payment webhooks
├── lib/
│   ├── ai/                 # AI prompts & providers
│   ├── billing/            # Subscription & limits
│   ├── config/             # Environment & constants
│   ├── extraction/         # PDF/OCR processing
│   ├── repositories/       # Data access layer
│   │   ├── base.repository.ts
│   │   ├── subject.repository.ts
│   │   ├── note.repository.ts
│   │   ├── quiz.repository.ts
│   │   └── flashcard.repository.ts
│   ├── responses/          # Standardized API responses
│   ├── services/           # Business logic layer
│   │   ├── base.service.ts
│   │   ├── subject.service.ts
│   │   ├── note.service.ts
│   │   ├── quiz.service.ts
│   │   └── flashcard.service.ts
│   ├── validators/         # Zod schemas
│   └── activity.ts         # Activity logging
├── dashboard/              # Dashboard pages
└── components/             # React components
```

## Service Layer Pattern

All services extend `BaseService` which provides:

```typescript
abstract class BaseService {
  protected abstract readonly resourceName: string;
  
  // Error handling
  protected tryCatch<T>(operation, errorMessage, errorCode?)
  protected notFoundError(resource?)
  protected forbiddenError(resource?)
  protected quotaExceededError(resource, limit)
  protected conflictError(message)
  protected unprocessableEntityError(message)
  protected serviceUnavailableError(message)
  protected internalError(message?)
  protected validationError(message?)
  protected success<T>(data)
  
  // Helpers
  protected verifyOwnership<T>(userId, resourceId, checker)
  protected logActivity(input)
  protected checkQuota(userId, feature, checker, resourceName)
  protected incrementQuota(userId, feature, incrementer)
}
```

## Repository Layer Pattern

All repositories extend `BaseRepository` which provides:

```typescript
abstract class BaseRepository<T> {
  protected abstract model: PrismaModel;
  
  // Queries
  findManyByUserId(userId, filters?)
  findManyByUserIdPaginated(userId, pagination, filters?)
  findByIdAndUserId(id, userId)
  findByIdempotencyKey(userId, key)
  userOwnsResource(userId, resourceId)
  
  // Mutations
  create(data)
  update(id, userId, data)
  delete(id, userId)
  
  // Helpers
  protected execute<T>(operation, errorMessage)
  protected paginate(query, pagination)
}
```

## Standardized API Responses

All API routes return consistent response envelopes:

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: string, message: string, details?: object } }
```

HTTP Status Codes:
- 200: Success
- 201: Created
- 400: Validation error
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 409: Conflict
- 422: Unprocessable entity
- 503: Service unavailable
- 500: Internal error

## Free Tier Quotas

All users now have unlimited access, but quotas are tracked for analytics:

| Feature | Limit (Legacy) | Current |
|---------|---------------|---------|
| Notes Uploaded | 10 | Unlimited |
| Flashcard Decks | 5 | Unlimited |
| Quizzes | 5 | Unlimited |
| AI Chat Messages | 50 | Unlimited |

Quota checking uses `canUseFreeFeature(userId, feature)` and `incrementUsage(userId, feature)`.

## Background Jobs (Inngest)

| Function | Trigger | Purpose |
|----------|---------|---------|
| `note/extraction.requested` | Note upload | Extract text from PDF/images |
| `note/extraction.process` | Extraction requested | OCR + text extraction |
| `quiz/generate` | Quiz generation | AI question generation |
| `flashcards/generate` | Deck generation | AI flashcard generation |
| `tutor/respond` | Tutor message | AI tutor response |

## Authentication

- **Radon Auth**: Handles signup, login, session management
- **Session**: JWT in httpOnly cookie
- **User ID**: Available via `getUserId()` in server components/API routes
- **Middleware**: Protects dashboard routes

## Environment Variables

See `docs/ENVIRONMENT.md` for complete list.

## Deployment

- **Platform**: Vercel
- **Database**: Neon/PostgreSQL
- **Storage**: Radon Storage (S3-compatible)
- **Background Jobs**: Inngest Cloud