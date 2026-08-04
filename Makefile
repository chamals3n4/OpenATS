# OpenATS quickstart
#
#   make setup       install everything, start infra, migrate + seed DB, run Asgardeo setup
#   make dev          start infra + backend + frontend together
#   make infra-up      start docker services only (Postgres, Redis)
#   make infra-down    stop docker services
#   make migrate       run pending database migrations
#   make seed          seed the default pipeline stages
#   make asgardeo       re-run just the Asgardeo tenant setup
#   make build          build both packages
#   make clean          remove all node_modules

.PHONY: setup dev infra-up infra-down wait-for-db migrate seed asgardeo encryption-key build lint clean

setup:
	@echo "📦 Installing dependencies (backend + frontend)..."
	pnpm install
	@echo ""
	@if [ ! -f backend/.env ] && [ -f backend/.env.example ]; then \
		cp backend/.env.example backend/.env; \
		echo "📄 Created backend/.env from .env.example"; \
	fi
	@if [ ! -f frontend/.env ] && [ -f frontend/.env.example ]; then \
		cp frontend/.env.example frontend/.env; \
		echo "📄 Created frontend/.env from .env.example"; \
	fi
	@$(MAKE) encryption-key
	@echo ""
	@echo "🐘 Starting Postgres and Redis..."
	@$(MAKE) infra-up
	@$(MAKE) wait-for-db
	@echo ""
	@echo "🏢 Setting up your Asgardeo tenant..."
	@./setup-asgardeo.sh
	@echo ""
	@$(MAKE) migrate
	@$(MAKE) seed
	@echo ""
	@echo "🎉 Setup complete. Run 'make dev' to start OpenATS."

encryption-key:
	@command -v openssl >/dev/null 2>&1 || { echo "⚠️  openssl not found, skipping ENCRYPTION_KEY generation. Set it manually."; exit 0; }
	@if [ -f backend/.env ] && grep -qE '^ENCRYPTION_KEY=[[:space:]]*$$' backend/.env; then \
		KEY=$$(openssl rand -hex 32); \
		awk -v key="$$KEY" '{ if ($$0 ~ /^ENCRYPTION_KEY=[[:space:]]*$$/) print "ENCRYPTION_KEY="key; else print $$0 }' backend/.env > backend/.env.tmp && mv backend/.env.tmp backend/.env; \
		echo "🔐 Generated ENCRYPTION_KEY in backend/.env"; \
	fi

infra-up:
	docker compose up -d

infra-down:
	docker compose down

wait-for-db:
	@echo "⏳ Waiting for Postgres to accept connections..."
	@for i in $$(seq 1 30); do \
		docker exec openats-postgres pg_isready -U openats >/dev/null 2>&1 && break; \
		sleep 1; \
	done

migrate:
	@echo "🗄️  Running database migrations..."
	pnpm --filter ./backend exec drizzle-kit generate
	pnpm --filter ./backend exec drizzle-kit migrate

seed:
	@echo "🌱 Seeding default pipeline stages..."
	pnpm --filter ./backend exec tsx src/db/seed.ts

dev: infra-up
	pnpm dev

asgardeo:
	./setup-asgardeo.sh

build:
	pnpm build

lint:
	pnpm lint

clean:
	rm -rf node_modules backend/node_modules frontend/node_modules