import type { BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";
import { admin, jwt } from "better-auth/plugins";
import { ac, roles } from "./auth-permissions";
import { pool } from "./db";

// Plain options object. nextCookies() is deliberately not added here (see
// lib/auth.ts) so scripts can import this file outside Next.js.
export const authOptions = {
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  advanced: { database: { generateId: "serial" } },
  emailAndPassword: { enabled: true, disableSignUp: true },
  user: {
    modelName: "users",
    fields: {
      image: "avatar_url",
      emailVerified: "email_verified",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
    additionalFields: {
      firstName: { type: "string", required: true, fieldName: "first_name" },
      lastName: { type: "string", required: true, fieldName: "last_name" },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
        fieldName: "is_active",
      },
    },
  },
  session: {
    modelName: "auth_sessions",
    cookieCache: { enabled: true, maxAge: 300 },
    fields: {
      userId: "user_id",
      expiresAt: "expires_at",
      ipAddress: "ip_address",
      userAgent: "user_agent",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  account: {
    modelName: "auth_accounts",
    fields: {
      userId: "user_id",
      accountId: "account_id",
      providerId: "provider_id",
      accessToken: "access_token",
      refreshToken: "refresh_token",
      idToken: "id_token",
      accessTokenExpiresAt: "access_token_expires_at",
      refreshTokenExpiresAt: "refresh_token_expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  verification: {
    modelName: "auth_verifications",
    fields: {
      expiresAt: "expires_at",
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
  databaseHooks: {
    session: {
      create: {
        // A deactivated user (is_active = false) cannot start a session.
        // Express rejects them on every request anyway; this stops the
        // sign-in itself and gives the login page a reason to show.
        async before(session, ctx) {
          if (!ctx) return;
          const user = await ctx.context.internalAdapter.findUserById(
            session.userId,
          );
          if (user && (user as { isActive?: boolean }).isActive === false) {
            throw APIError.from("FORBIDDEN", {
              message: "This account has been deactivated.",
              code: "ACCOUNT_DEACTIVATED",
            });
          }
        },
      },
    },
  },
  plugins: [
    admin({
      ac,
      roles,
      adminRoles: ["super_admin"],
      defaultRole: "interviewer",
      schema: {
        user: { fields: { banReason: "ban_reason", banExpires: "ban_expires" } },
        session: { fields: { impersonatedBy: "impersonated_by" } },
      },
    }),
    jwt({
      jwt: {
        expirationTime: "15m",
        definePayload: ({ user }) => ({ email: user.email }),
      },
      schema: {
        jwks: {
          modelName: "auth_jwks",
          fields: {
            publicKey: "public_key",
            privateKey: "private_key",
            createdAt: "created_at",
            expiresAt: "expires_at",
          },
        },
      },
    }),
  ],
} satisfies BetterAuthOptions;
