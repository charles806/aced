# ACED — Study Smarter with AI

> An AI-powered study platform that keeps your notes and study materials organized, tracks your study time and progress, and uses AI to help you actually understand what you're learning.

## 🎯 Overview

ACED is a comprehensive study management platform built for students who want to:
- **Organize** subjects, notes, and study materials in one place
- **Track** study time and progress with detailed analytics
- **Learn** with AI-powered summaries, flashcards, quizzes, and an AI Tutor
- **Stay motivated** with gamified progress tracking and study streaks

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Runtime** | React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS v4 |
| **Database** | PostgreSQL (via Prisma ORM) |
| **Authentication** | Custom auth with Argon2 password hashing |
| **AI/ML** | OpenAI API, Inngest for background jobs |
| **File Storage** | Custom storage via @radonsdk/storage |
| **Payments** | @radonsdk/payments |
| **Analytics** | Vercel Analytics |
| **Email** | AWS SES v2 |
| **PDF Processing** | pdf-parse, pdfjs-dist |
| **Testing** | Vitest |
| **Deployment** | Vercel |

## ✨ Features

### Core Features
- **Dashboard** — Centralized view of study progress, upcoming tasks, and activity feed
- **Subjects Management** — Create, organize, and track subjects with progress visualization
- **Notes System** — Rich note-taking with file uploads, AI summaries, and search
- **AI Tutor** — Interactive AI-powered tutoring for any subject
- **Flashcards** — Spaced repetition flashcard system with AI generation
- **Quizzes** — AI-generated practice quizzes with instant feedback
- **Study Timer** — Pomodoro-style timer with session tracking
- **AI Summaries** — Automatic summarization of notes and documents
- **Progress Analytics** — Visual charts and progress tracking

### Technical Features
- **Server Components** — Optimized rendering with React Server Components
- **Edge-ready** — Middleware and API routes optimized for edge deployment
- **Background Jobs** — Inngest for reliable async processing (AI generation, emails)
- **Type Safety** — End-to-end TypeScript with Prisma-generated types
- **Responsive Design** — Mobile-first with dedicated bottom navigation
- **Dark Mode** — System-aware theme with manual toggle
- **Accessibility** — WCAG AA compliant with proper ARIA attributes

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL database
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ACED

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npm run prebuild

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `OPENAI_API_KEY` | OpenAI API key for AI features | ✅ |
| `INNGEST_EVENT_KEY` | Inngest event key for background jobs | ✅ |
| `INNGEST_SIGNING_KEY` | Inngest signing key | ✅ |
| `NEXTAUTH_SECRET` | Secret for session encryption | ✅ |
| `AWS_ACCESS_KEY_ID` | AWS access key for SES | ✅ |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key for SES | ✅ |
| `AWS_REGION` | AWS region (e.g., us-east-1) | ✅ |
| `SENDER_EMAIL` | Verified sender email for SES | ✅ |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app | ✅ |
| `INNGEST_DEV` | Set to `1` only for local development | ❌ |

> **Important**: `INNGEST_DEV` must NOT be set in production (only for local development).

## 📁 Project Structure

```
ACED/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── inngest/       # Inngest webhook endpoint
│   │   └── ...            # Other API routes
│   ├── dashboard/         # Protected dashboard pages
│   │   ├── subjects/      # Subjects management
│   │   ├── notes/         # Notes system
│   │   ├── ai-tutor/      # AI Tutor
│   │   ├── flashcards/    # Flashcards
│   │   ├── quizzes/       # Quizzes
│   │   ├── summary/       # AI Summaries
│   │   ├── upcoming/      # Upcoming tasks
│   │   └── settings/      # User settings
│   ├── actions/           # Server Actions
│   ├── lib/               # Shared utilities
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── dashboard/         # Dashboard-specific components
│   │   ├── shell.tsx      # Main layout shell
│   │   ├── sidebar.tsx    # Desktop sidebar navigation
│   │   ├── topbar.tsx     # Top navigation bar
│   │   ├── mobile-nav.tsx # Mobile bottom navigation
│   │   └── ...            # Other dashboard components
│   ├── billing/           # Billing/upgrade components
│   ├── settings/          # Settings components
│   └── ...                # Shared components
├── prisma/                # Prisma schema & migrations
├── public/                # Static assets
├── scripts/               # Utility scripts
├── inngest/               # Inngest functions
├── types/                 # TypeScript type definitions
└── next.config.ts         # Next.js configuration
```

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build for production (uses webpack) |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest tests |
| `npm run prebuild` | Generate Prisma client (runs before build) |

## 🏗 Build & Deployment

### Production Build

```bash
npm run build
```

**Note**: This project uses `--webpack` flag for production builds instead of Turbopack due to a known sandbox/port binding issue with Turbopack in certain environments. The build command in `package.json` is configured as:

```json
"build": "next build --webpack"
```

This ensures reliable production builds on Vercel and other platforms.

### Deploy to Vercel

1. Push to GitHub/GitLab/Bitbucket
2. Import project in Vercel
3. Add environment variables
4. Deploy

The app is configured for zero-config deployment on Vercel.

### Docker Deployment

```bash
# Build image
docker build -t aced .

# Run container
docker run -p 3000:3000 --env-file .env.production aced
```

## 🐛 Troubleshooting

### Turbopack Build Failures

**Error**: `Operation not permitted (os error 1)` / `binding to a port` during build

**Cause**: Turbopack's parallel processing tries to bind to ports that may be restricted in sandboxed environments or certain CI/CD systems.

**Solution**: Use webpack for production builds by adding `--webpack` flag:
```bash
next build --webpack
```

This is already configured in `package.json`.

### Font Loading Issues in Sandbox

**Error**: `getaddrinfo ENOTFOUND fonts.googleapis.com`

**Cause**: `next/font/google` tries to download font CSS at build time, but sandboxed environments may lack internet access.

**Solution**: This works fine on Vercel (which has internet access). For local sandbox builds, you may need to:
- Use `--webpack` flag (already configured)
- Ensure network access to fonts.googleapis.com

### Database Connection Issues

**Error**: `Can't reach database server`

**Solutions**:
1. Verify `DATABASE_URL` is correct
2. Ensure database allows connections from your IP
3. Run `npx prisma migrate deploy` for production migrations
4. Check Prisma client is generated: `npm run prebuild`

### Inngest Background Jobs Not Running

**Error**: Functions not triggering

**Solutions**:
1. Verify `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are set
2. Ensure `INNGEST_DEV` is NOT set in production
3. Check Inngest dashboard for function registration
4. Verify the `/api/inngest` endpoint is accessible

## 🧪 Testing

```bash
# Run all tests
npm run test

# Run tests in watch mode
npx vitest

# Run with coverage
npx vitest run --coverage
```

## 📦 Key Dependencies

### Production
- `next@16.3.1` — React framework
- `react@19.2.8` / `react-dom@19.2.8` — UI library
- `@prisma/client@7.9.1` — Database ORM
- `inngest@4.21.0` — Background jobs
- `openai@7.25.0` — AI integration
- `@vercel/analytics@2.0.1` — Analytics
- `framer-motion@13.4.3` — Animations
- `lucide-react@1.33.0` — Icons
- `tailwindcss@4` — Styling
- `argon2@0.45.1` — Password hashing

### Development
- `typescript@5` — Type checking
- `eslint@9` / `eslint-config-next@16.3.1` — Linting
- `vitest@5.0.1` — Testing
- `prisma@7.9.1` — Database tools

## 🔒 Security

- Passwords hashed with Argon2
- CSRF protection via Next.js built-ins
- Secure HTTP headers via Next.js middleware
- Environment variables for all secrets
- Server-side validation on all mutations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) — The React framework
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS
- [Prisma](https://prisma.io/) — Next-generation ORM
- [Inngest](https://inngest.com/) — Reliable background jobs
- [Vercel](https://vercel.com/) — Deployment platform
- [Lucide](https://lucide.dev/) — Beautiful icons
- [Framer Motion](https://www.framer.com/motion/) — Animations

---

**Built with ❤️ for students everywhere**
