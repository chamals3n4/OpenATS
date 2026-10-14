import type { BetterAuthOptions } from "better-auth";
import { APIError } from "better-auth/api";
import { admin, jwt } from "better-auth/plugins";
import {
  PASSWORD_LINK_EXPIRES_IN_SECONDS,
  sendPasswordLinkEmail,
} from "./password-emails";
import { ac, roles } from "./permissions";
import { pool } from "./db";

// Invited users use the reset link to set a password
async function hasPassword(userId: string): Promise<boolean> {
  const result = await pool.query(
    `select 1 from auth_accounts
     where user_id = $1 and provider_id = 'credential' and password is not null
     limit 1`,
    [Number(userId)],
  );
  return result.rowCount !== null && result.rowCount > 0;
}

const DAY_IN_SECONDS = 60 * 60 * 24;

// Optional trusted proxies so rate limits use the real client IP
const trustedProxies = (process.env.AUTH_TRUSTED_PROXIES ?? "")
  .split(",")
  .map((entry) => entry.trim())
  .filter(Boolean);

// No nextCookies() here so scripts can import it
export const authOptions = {
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  // Only allow our own origin
  trustedOrigins: [process.env.BETTER_AUTH_URL].filter(
    (origin): origin is string => Boolean(origin),
  ),
  advanced: {
    database: { generateId: "serial" },
    useSecureCookies: process.env.NODE_ENV === "production",
    ...(trustedProxies.length > 0 ? { ipAddress: { trustedProxies } } : {}),
  },
  // Store rate limits in Postgres so they work across servers
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "auth_rate_limits",
    fields: { lastRequest: "last_request" },
    customRules: {
      // Smaller limits for brute force targets
      "/sign-in/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    // 24 hours so invites work the next day
    resetPasswordTokenExpiresIn: PASSWORD_LINK_EXPIRES_IN_SECONDS,
    revokeSessionsOnPasswordReset: true,
    // Link goes to /reset-password?token=...
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordLinkEmail({
        kind: (await hasPassword(user.id)) ? "reset" : "invite",
        to: user.email,
        name: user.name,
        url,
      });
    },
  },
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
    // 7 day sessions, refreshed once a day
    expiresIn: 7 * DAY_IN_SECONDS,
    updateAge: DAY_IN_SECONDS,
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
        // Block sign in for deactivated users
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
