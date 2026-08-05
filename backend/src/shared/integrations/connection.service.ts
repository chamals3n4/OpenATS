import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { integrationConnections } from "../../db";
import { decrypt, encrypt, signState, verifyState } from "./crypto";
import { getProviderClient } from "./registry";

const STATE_TTL_SECONDS = 10 * 60;
const REFRESH_BUFFER_MS = 5 * 60_000;

export type ConnectionStatus = {
  provider: "google_meet";
  connected: boolean;
  accountEmail: string | null;
};

export const integrationConnectionService = {
  getAuthUrl(userId: number): string {
    const state = signState({ userId }, STATE_TTL_SECONDS);
    return getProviderClient("google_meet").getAuthUrl(state);
  },

  async handleCallback(code: string, state: string): Promise<void> {
    const { userId } = verifyState(state);
    const result = await getProviderClient("google_meet").exchangeCode(code);

    await db
      .insert(integrationConnections)
      .values({
        userId,
        provider: "google_meet",
        accessTokenEncrypted: encrypt(result.accessToken),
        refreshTokenEncrypted: encrypt(result.refreshToken),
        expiresAt: result.expiresAt,
        scopes: result.scopes,
        providerAccountEmail: result.accountEmail,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [integrationConnections.userId, integrationConnections.provider],
        set: {
          accessTokenEncrypted: encrypt(result.accessToken),
          refreshTokenEncrypted: encrypt(result.refreshToken),
          expiresAt: result.expiresAt,
          scopes: result.scopes,
          providerAccountEmail: result.accountEmail,
          updatedAt: new Date(),
        },
      });
  },

  async getStatus(userId: number): Promise<ConnectionStatus[]> {
    const rows = await db
      .select()
      .from(integrationConnections)
      .where(eq(integrationConnections.userId, userId));

    const google = rows.find((r) => r.provider === "google_meet");
    return [
      {
        provider: "google_meet",
        connected: !!google,
        accountEmail: google?.providerAccountEmail ?? null,
      },
    ];
  },

  async disconnect(userId: number): Promise<void> {
    await db
      .delete(integrationConnections)
      .where(
        and(
          eq(integrationConnections.userId, userId),
          eq(integrationConnections.provider, "google_meet"),
        ),
      );
  },

  /**
   * Returns a usable access token for the given user's Google connection,
   * refreshing it first if it's within the expiry buffer. Returns null if
   * the user has no connection at all — callers treat that as "not connected".
   */
  async getValidAccessToken(userId: number): Promise<string | null> {
    const [row] = await db
      .select()
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.userId, userId),
          eq(integrationConnections.provider, "google_meet"),
        ),
      )
      .limit(1);

    if (!row) return null;

    if (row.expiresAt.getTime() - REFRESH_BUFFER_MS > Date.now()) {
      return decrypt(row.accessTokenEncrypted);
    }

    const refreshToken = decrypt(row.refreshTokenEncrypted);
    const refreshed = await getProviderClient("google_meet").refreshAccessToken(refreshToken);

    await db
      .update(integrationConnections)
      .set({
        accessTokenEncrypted: encrypt(refreshed.accessToken),
        // Providers may rotate the refresh token on every use — always persist
        // whatever comes back rather than assuming the original stays valid.
        refreshTokenEncrypted: refreshed.refreshToken
          ? encrypt(refreshed.refreshToken)
          : row.refreshTokenEncrypted,
        expiresAt: refreshed.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(integrationConnections.id, row.id));

    return refreshed.accessToken;
  },
};
