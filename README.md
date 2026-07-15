## OpenATS

OpenATS is a modern open source applicant tracking system built to make hiring transparent, customizable, and accessible for teams everywhere.

Most ATS tools are expensive, bloated, or black boxes. OpenATS is built to be self-hosted, transparent, and customizable - so teams can run their own hiring pipeline without depending on a SaaS vendor.

Website: [openats.dev](https://openats.dev)

Live demo: [demo.openats.dev](https://demo.openats.dev)

- Email: `demo@openats.dev`
- Password: `Demo@123#`

## Self-hosting with Docker

Postgres, Redis, the API, the CV analysis worker and the frontend, in one command:

```bash
cp .env.example .env
docker compose up -d --build
docker compose --profile seed run --rm seed   # first time only
```

The frontend is then on http://localhost:3000 and the API on http://localhost:8080.
You will need a WSO2 Asgardeo tenant before the UI renders — see
[docs/DOCKER.md](docs/DOCKER.md) for the full walkthrough and
[docs/IAM_SETUP.md](docs/IAM_SETUP.md) for auth setup.

## Key Features

- Centralized candidate management in one place
- Structured hiring pipeline with customizable stages
- Team collaboration with shared feedback
- Built-in candidate evaluation and assessments
- AI-powered CV parsing and candidate insights
- Custom career page builder for your brand
- Automated alerts and notifications
- Easy integration and extensibility
- Full data ownership with open-source flexibility

## Technology Overview

OpenATS is organized as a multi-app repository:

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript, PostgreSQL, Drizzle ORM, Socket.IO
- **Identity & Access Management**: WSO2 Identity Platform
- **Package manager**: pnpm

## Contributing

See `CONTRIBUTING.md` for setup instructions, branching rules, and how to submit a pull request.

---

[openats.dev](https://openats.dev)
