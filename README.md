# LeadPulse AI

**Transform a simple website URL into a fully automated sales engine.**

LeadPulse AI researches your market, identifies high-intent leads, crafts a custom marketing strategy, and executes AI-driven outreach to book appointments or close deals — all with a "human-in-the-loop" review process to ensure brand alignment.

## Project Structure

```
ownly-automation/
├── backend/                # Backend services & Supabase
│   ├── supabase/
│   │   ├── migrations/     # Database migration files
│   │   └── config.toml     # Supabase local config
│   └── src/
│       ├── functions/      # Edge Functions (AI processing, outreach)
│       ├── lib/            # Shared utilities
│       └── types/          # TypeScript type definitions
├── frontend/               # React + Vite + Tailwind web app
└── README.md
```

## Tech Stack

- **Backend:** Supabase (Postgres, Auth, Edge Functions, Realtime)
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **AI:** OpenAI / Gemini for lead research & outreach generation

## Getting Started

### Prerequisites

- Node.js 18+ & Bun
- Supabase CLI
- GitHub CLI (`gh`)

### Backend Setup

1. Install Supabase CLI: `npm install -g supabase`
2. Link to the Supabase project: `supabase link --project-ref <ref>`
3. Apply migrations: `supabase db push`

### Frontend Setup

```bash
cd frontend
bun install
bun dev
```

## Database Schema

Three core tables power the system:

- **`businesses`** — Customer businesses (the users of LeadPulse AI)
- **`campaigns`** — Marketing campaigns created for each business
- **`leads`** — Individual leads discovered and tracked per campaign

See `backend/supabase/migrations/` for full schema details.
