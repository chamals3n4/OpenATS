## OpenATS

OpenATS is a modern open source applicant tracking system built to make hiring transparent, customizable, and accessible for teams everywhere.

Most ATS tools are expensive, bloated, or black boxes. OpenATS is built to be self-hosted, transparent, and customizable - so teams can run their own hiring pipeline without depending on a SaaS vendor.

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

## Prerequisites

Before running OpenATS, make sure you have:

- Node.js (20+ recommended)
- pnpm
- PostgreSQL database (local or hosted, e.g. Neon)
- Git
- A code editor (VS Code recommended)

## Technology Overview

OpenATS is organized as a multi-app repository:

- **Web app (`web`)**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **API (`api`)**: Express.js, TypeScript, PostgreSQL, Drizzle ORM, Socket.IO
- **Documentation site (`docs`)**: Docusaurus
- **Auth/Identity**: WSO2 Asgardeo
- **Package manager**: pnpm

## Documentation

Check out the OpenATS website to find in-depth documentation for everything that OpenATS offers.

## Contributing

See `CONTRIBUTING.md` for setup instructions, branching rules, and how to submit a pull request.
