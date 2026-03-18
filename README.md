# OpenATS

Open-source applicant tracking system for companies that want full control over their hiring process.

Most ATS tools are expensive, bloated, or black boxes. OpenATS is built to be self-hosted, transparent, and customizable — so teams can run their own hiring pipeline without depending on a SaaS vendor.

## Features

- Job posting and management
- Candidate application tracking
- Hiring pipeline stages (Applied, Screening, Interview, Offer)
- Resume parsing
- Authentication via WSO2 Asgardeo

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Express.js, TypeScript, Node.js |
| Database | PostgreSQL, Drizzle ORM |
| Auth | WSO2 Asgardeo |
| Package Manager | pnpm |

## Getting Started

### Prerequisites

- Node.js 18+
- Git
- PostgreSQL database (Neon recommended — free tier)
- pnpm

### Installation

```bash
git clone https://github.com/chamals3n4/OpenATS.git
cd OpenATS
```

Install dependencies:

```bash
# Frontend
cd web && pnpm install

# Backend
cd api && pnpm install
```

Set up environment variables:

```bash
cd web && cp .env.example .env
cd api && cp .env.example .env
```

Run database migrations and seed:

```bash
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
pnpm tsx src/db/seed.ts
```

## Running the Project

```bash
# Frontend (http://localhost:3000)
cd web && pnpm dev

# Backend (http://localhost:5000)
cd api && pnpm dev
```

Run both in separate terminals.

For Asgardeo setup and full configuration, see the documentation.

## Contributing

See `CONTRIBUTING.md` for setup instructions, branching rules, and how to submit a pull request.
