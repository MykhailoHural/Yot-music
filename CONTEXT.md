# YouTube Music Auto-Classifier — Context

## What we're building
An AI-powered tool that:
1. Authenticates with YouTube via OAuth.
2. Extracts user playlists and tracks.
3. Enriches metadata using Spotify and Last.fm APIs.
4. Classifies tracks into 1-5 genres using Claude AI.
5. Creates NEW YouTube playlists based on these genres.
6. Provides a UI to manage and monitor the pipeline.

## Current Phase
Phase 0.5: Project Initialization.

## Tech Stack
- **Framework:** Next.js 14+ (App Router, TypeScript)
- **ORM:** Prisma
- **Database:** PostgreSQL (via Docker locally)
- **Auth:** NextAuth.js v4 (Google Provider)
- **APIs:** YouTube Data API v3, Spotify Web API, Last.fm API
- **AI:** Anthropic API (Claude Sonnet 4.6)
- **Styling:** Tailwind CSS + shadcn/ui

## Architectural Rules (NON-NEGOTIABLE)
1. **Pipeline Isolation:** Each stage (Extract, Enrich, Classify, Create) must be independent and idempotent.
2. **Read-Only Sources:** Never modify or delete existing user playlists. Only create NEW playlists.
3. **Security:** 
    - `userId` must always come from the session, never from request bodies.
    - OAuth tokens must be encrypted before being stored in the database.
    - API keys (especially Anthropic) must never be exposed to the client.
4. **Genre Taxonomy:** Use a controlled list of genres for classification. Claude must not invent genres.
5. **Budget & Quotas:** Implement safety caps for AI costs and respect YouTube API quotas with resumability.

## Coding Conventions
- Use Functional Components and Hooks.
- Prefer Tailwind CSS for styling.
- Ensure type safety with Zod and TypeScript.
- Error handling must be robust, especially for external API calls.

## Folder Structure (Planned)
```
yt-music-classifier/
├── src/
│   ├── app/            # Next.js App Router
│   ├── components/     # UI components
│   ├── lib/            # Shared logic (prisma, api clients, pipeline)
│   ├── data/           # Static data (genre taxonomy)
│   └── types/          # TypeScript definitions
├── prisma/             # Database schema and migrations
├── docker/             # Docker configuration
└── ...
```

## How to ask AI for help
- Refer to `MUSIC_PROJECT_PLAN.md` for the long-term roadmap.
- Refer to `CONTEXT.md` (this file) for current architectural rules.
- When implementing a pipeline stage, ensure it follows the "Plan -> Act -> Validate" cycle.
