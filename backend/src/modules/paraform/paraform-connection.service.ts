import { eq } from "drizzle-orm";
import { db } from "../../db";
import {
  paraformConnection,
  type ParaformConnection,
} from "../../db/schema/paraform";
import { decrypt, encrypt } from "../../shared/integrations/crypto";
import {
  buildAuthorizeUrl,
  createPkcePair,
  exchangeCode,
  openState,
  ParaformOAuthError,
  paraformRedirectUri,
  refreshTokens,
  registerClient,
  sealState,
} from "../../shared/integrations/paraform/oauth";
import { McpAuthError } from "../../shared/integrations/paraform/mcp-client";
import {
  mcpParaformApi,
  type ParaformApi,
} from "../../shared/integrations/paraform/paraform-api";

const REFRESH_BUFFER_MS = 60_000;

/** No connection, or one Paraform no longer accepts. The sync stops and tells the admin. */
export class ParaformNotConnectedError extends Error {
  constructor(message = "Paraform is not connected") {
    super(message);
    this.name = "ParaformNotConnectedError";
  }
}

async function getRow(): Promise<ParaformConnection | null> {
  const [row] = await db.select().from(paraformConnection).limit(1);
  return row ?? null;
}

async function markNeedsReconnect(id: number) {
  await db
    .update(paraformConnection)
    .set({ needsReconnect: true, updatedAt: new Date() })
    .where(eq(paraformConnection.id, id));
}

export const paraformConnectionService = {
  getRow,

  /** Starts a sign-in: registers OpenATS with Paraform and returns the page to send the admin to. */
  async getAuthUrl(userId: number): Promise<string> {
    const redirectUri = paraformRedirectUri();
    const clientId = await registerClient(redirectUri);
    const { verifier, challenge } = createPkcePair();
    const state = sealState({ userId, clientId, verifier });
    return buildAuthorizeUrl({ clientId, redirectUri, state, challenge });
  },

  /** Finishes a sign-in. Replaces any earlier connection, which also clears `needsReconnect`. */
  async handleCallback(code: string, state: string): Promise<void> {
    const { userId, clientId, verifier } = openState(state);
    const tokens = await exchangeCode({
      code,
      clientId,
      verifier,
      redirectUri: paraformRedirectUri(),
    });
    if (!tokens.refreshToken) {
      // Without one the connection would stop working within minutes, while looking connected.
      throw new ParaformOAuthError(
        "Paraform did not allow a lasting connection (no refresh token)",
      );
    }

    const values = {
      clientId,
      accessTokenEncrypted: encrypt(tokens.accessToken),
      refreshTokenEncrypted: encrypt(tokens.refreshToken),
      expiresAt: tokens.expiresAt,
      accountEmail: tokens.accountEmail,
      connectedBy: userId,
      needsReconnect: false,
      updatedAt: new Date(),
    };
    await db
      .insert(paraformConnection)
      .values(values)
      .onConflictDoUpdate({
        target: paraformConnection.singleton,
        set: values,
      });
  },

  async disconnect(): Promise<void> {
    await db.delete(paraformConnection);
  },

  async setSendDecisions(enabled: boolean): Promise<boolean> {
    const updated = await db
      .update(paraformConnection)
      .set({ sendDecisions: enabled, updatedAt: new Date() })
      .returning({ id: paraformConnection.id });
    return updated.length > 0;
  },

  /**
   * A usable access token, refreshed first when it is about to expire. Paraform's tokens last
   * minutes, so this refreshes on most runs. A refused refresh marks the connection for the
   * admin to reconnect.
   */
  async getValidAccessToken(): Promise<string> {
    const row = await getRow();
    if (!row) throw new ParaformNotConnectedError();
    if (row.needsReconnect) {
      throw new ParaformNotConnectedError(
        "Paraform sign-in expired. Reconnect it in Settings → Integrations.",
      );
    }

    if (row.expiresAt.getTime() - REFRESH_BUFFER_MS > Date.now()) {
      return decrypt(row.accessTokenEncrypted);
    }

    let refreshed;
    try {
      refreshed = await refreshTokens(
        row.clientId,
        decrypt(row.refreshTokenEncrypted),
      );
    } catch (error) {
      if (error instanceof ParaformOAuthError) {
        await markNeedsReconnect(row.id);
        throw new ParaformNotConnectedError(
          "Paraform sign-in expired. Reconnect it in Settings → Integrations.",
        );
      }
      throw error;
    }

    await db
      .update(paraformConnection)
      .set({
        accessTokenEncrypted: encrypt(refreshed.accessToken),
        // Paraform may rotate the refresh token on every use; keep whichever is newest.
        refreshTokenEncrypted: refreshed.refreshToken
          ? encrypt(refreshed.refreshToken)
          : row.refreshTokenEncrypted,
        expiresAt: refreshed.expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(paraformConnection.id, row.id));
    return refreshed.accessToken;
  },

  /** The Paraform API, signed in as the connection. */
  api(): ParaformApi {
    return mcpParaformApi(() =>
      paraformConnectionService.getValidAccessToken(),
    );
  },

  /**
   * Whether Paraform lets this account use the hiring-manager tools. Signing in can succeed
   * without it (beta access is granted by Paraform), so the settings page asks separately.
   */
  async checkAccess(): Promise<"ok" | "no_access"> {
    try {
      await paraformConnectionService.api().checkAccess();
      return "ok";
    } catch (error) {
      if (error instanceof McpAuthError) return "no_access";
      throw error;
    }
  },
};
