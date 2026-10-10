# OpenATS quickstart
#
#   make setup       install everything, start infra, migrate + seed DB, create the first admin
#   make dev          start infra + backend + frontend together
#   make infra-up      start docker services only (Postgres, Redis)
#   make infra-down    stop docker services
#   make migrate       run pending database migrations
#   make seed          seed the default pipeline stages
#   make admin         create a super admin, or reset one (also the lockout recovery path)
#   make asgardeo       re-run just the Asgardeo tenant setup
#   make build          build both packages
#   make clean          remove all node_modules

.PHONY: setup dev infra-up infra-down wait-for-db migrate seed admin asgardeo encryption-key auth-env build lint clean

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
	@$(MAKE) auth-env
	@echo ""
	@echo "🐘 Starting Postgres and Redis..."
	@$(MAKE) infra-up
	@$(MAKE) wait-for-db
	@echo ""
	@$(MAKE) migrate
	@$(MAKE) seed
	@echo ""
	@$(MAKE) admin
	@echo ""
	@echo "🎉 Setup complete. Run 'make dev' to start OpenATS and sign in with the admin you just created."

encryption-key:
	@command -v openssl >/dev/null 2>&1 || { echo "⚠️  openssl not found, skipping ENCRYPTION_KEY generation. Set it manually."; exit 0; }
	@if [ -f backend/.env ] && grep -qE '^ENCRYPTION_KEY=[[:space:]]*$$' backend/.env; then \
		KEY=$$(openssl rand -hex 32); \
		awk -v key="$$KEY" '{ if ($$0 ~ /^ENCRYPTION_KEY=[[:space:]]*$$/) print "ENCRYPTION_KEY="key; else print $$0 }' backend/.env > backend/.env.tmp && mv backend/.env.tmp backend/.env; \
		echo "🔐 Generated ENCRYPTION_KEY in backend/.env"; \
	fi

# Fills in what Better Auth needs in frontend/.env, without touching a value
# that is already set. A key counts as unset when it is missing, empty or "".
FRONTEND_ENV ?= frontend/.env
BACKEND_ENV ?= backend/.env

define set-if-unset
	if ! grep -qE '^$(1)=' $(FRONTEND_ENV); then \
		printf '%s=%s\n' '$(1)' "$(2)" >> $(FRONTEND_ENV); \
		echo "$(3)"; \
	elif grep -qE '^$(1)=[[:space:]]*(""|'"''"')?[[:space:]]*$$' $(FRONTEND_ENV); then \
		awk -v val="$(2)" '{ if ($$0 ~ /^$(1)=/) print "$(1)=" val; else print $$0 }' $(FRONTEND_ENV) > $(FRONTEND_ENV).tmp && mv $(FRONTEND_ENV).tmp $(FRONTEND_ENV); \
		echo "$(3)"; \
	fi
endef

auth-env:
	@[ -f $(FRONTEND_ENV) ] || { echo "⚠️  $(FRONTEND_ENV) not found, skipping Better Auth setup."; exit 0; }; \
	if command -v openssl >/dev/null 2>&1; then \
		SECRET=$$(openssl rand -hex 32); \
		$(call set-if-unset,BETTER_AUTH_SECRET,$$SECRET,🔐 Generated BETTER_AUTH_SECRET in $(FRONTEND_ENV)); \
	else \
		echo "⚠️  openssl not found, skipping BETTER_AUTH_SECRET generation. Set it manually (32+ characters)."; \
	fi; \
	DB_URL=$$( [ -f $(BACKEND_ENV) ] && grep -E '^DATABASE_URL=' $(BACKEND_ENV) | head -n 1 | cut -d= -f2- ); \
	if [ -n "$$DB_URL" ]; then \
		$(call set-if-unset,DATABASE_URL,$$DB_URL,📄 Copied DATABASE_URL from $(BACKEND_ENV) to $(FRONTEND_ENV)); \
	fi; \
	$(call set-if-unset,BETTER_AUTH_URL,http://localhost:3000,📄 Set BETTER_AUTH_URL in $(FRONTEND_ENV))

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

# Asks for anything not given. To pass values: make admin ARGS="--email a@b.co --first-name A --last-name B"
admin:
	@echo "👤 Creating the super admin account..."
	@pnpm --filter ./frontend exec tsx scripts/create-admin.ts $(ARGS)

asgardeo:
	./setup-asgardeo.sh

build:
	pnpm build

lint:
	pnpm lint

clean:
	rm -rf node_modules backend/node_modules frontend/node_modules

test:
	pnpm test

test-e2e:
	pnpm test:e2e