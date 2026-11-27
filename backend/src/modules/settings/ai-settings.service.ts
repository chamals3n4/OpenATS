import { selectedAiProvider, environmentApiKey, defaultAiModel, type AiProvider } from "../candidate/ai-provider";
import { encrypt, decrypt } from "../../shared/integrations/crypto";
import { db } from "../../db";
import { appSettings } from "../../db/schema";

/** There is a single settings row; this is its id. */
const SETTINGS_ROW_ID = 1;

/** Analysis needs a key for the selected provider. */
export class GeminiNotConfiguredError extends Error {
  constructor() {
    super("Add an API key for the selected AI provider to use this");
    this.name = "GeminiNotConfiguredError";
  }
}

export interface AiSettings {
  /** What was chosen in Settings. */
  cvAnalysisEnabled: boolean;
  /** Whether the server has a Gemini API key at all. */
  geminiConfigured: boolean;
  /** Both of the above: CVs are analysed, and the analysis is shown, only when this is true. */
  provider: AiProvider;
  model: string;
  configured: boolean;
  active: boolean;
}

type AiCredentials = { provider: AiProvider; apiKey: string; model: string };
function credentialsForRow(row: typeof appSettings.$inferSelect | undefined): AiCredentials | null {
  if (row?.aiCvProvider === "none") return null;
  const provider = (row?.aiCvProvider as AiProvider | null) ?? selectedAiProvider();
  const apiKey = row?.aiCvApiKeyEncrypted ? decrypt(row.aiCvApiKeyEncrypted) : environmentApiKey(provider);
  return apiKey ? { provider, apiKey, model: row?.aiCvModel ?? defaultAiModel(provider) } : null;
}

export const aiSettingsService = {
  isGeminiConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY?.trim();
  },

  async get(): Promise<AiSettings> {
    const [row] = await db.select().from(appSettings).limit(1);
    const cvAnalysisEnabled = row?.aiCvAnalysisEnabled ?? false;
    const geminiConfigured = aiSettingsService.isGeminiConfigured();
    const removed = row?.aiCvProvider === "none";
    const provider = removed ? selectedAiProvider() : (row?.aiCvProvider as AiProvider | null) ?? selectedAiProvider();
    const configured = !removed && (!!row?.aiCvApiKeyEncrypted || !!environmentApiKey(provider));
    return { cvAnalysisEnabled, geminiConfigured, provider, model: row?.aiCvModel ?? defaultAiModel(provider), configured, active: cvAnalysisEnabled && configured };
  },

  /** Whether analysis is enabled and a provider key is configured. */
  async isCvAnalysisActive(): Promise<boolean> {
    return (await aiSettingsService.get()).active;
  },

  async credentials(): Promise<AiCredentials> {
    const [row] = await db.select().from(appSettings).limit(1);
    const credentials = credentialsForRow(row);
    if (!credentials) throw new GeminiNotConfiguredError();
    return credentials;
  },

  /** Snapshot the enabled switch and provider together; queued jobs never switch providers mid-run. */
  async activeCredentials(): Promise<AiCredentials | null> {
    const [row] = await db.select().from(appSettings).limit(1);
    return row?.aiCvAnalysisEnabled ? credentialsForRow(row) : null;
  },

  async setProvider(provider: AiProvider, apiKey?: string): Promise<AiSettings> {
    const [row] = await db.select().from(appSettings).limit(1);
    const previousProvider = row?.aiCvProvider === "none" ? null : (row?.aiCvProvider as AiProvider | null) ?? selectedAiProvider();
    const encrypted = apiKey ? encrypt(apiKey) : provider === previousProvider ? row?.aiCvApiKeyEncrypted ?? null : null;
    await db.insert(appSettings).values({ id: SETTINGS_ROW_ID, aiCvProvider: provider, aiCvApiKeyEncrypted: encrypted })
      .onConflictDoUpdate({ target: appSettings.id, set: {
        aiCvProvider: provider, aiCvApiKeyEncrypted: encrypted,
        // A provider change requires an explicit opt-in before sharing CVs with it.
        ...(provider !== previousProvider ? { aiCvAnalysisEnabled: false, aiCvModel: null } : {}), updatedAt: new Date(),
      } });
    return aiSettingsService.get();
  },

  async setModel(model: string): Promise<AiSettings> {
    await db.insert(appSettings).values({ id: SETTINGS_ROW_ID, aiCvModel: model })
      .onConflictDoUpdate({ target: appSettings.id, set: { aiCvModel: model, updatedAt: new Date() } });
    return aiSettingsService.get();
  },

  async removeProvider(): Promise<AiSettings> {
    await db.insert(appSettings).values({ id: SETTINGS_ROW_ID, aiCvProvider: "none", aiCvApiKeyEncrypted: null, aiCvModel: null, aiCvAnalysisEnabled: false })
      .onConflictDoUpdate({ target: appSettings.id, set: { aiCvProvider: "none", aiCvApiKeyEncrypted: null, aiCvModel: null, aiCvAnalysisEnabled: false, updatedAt: new Date() } });
    return aiSettingsService.get();
  },

  async setCvAnalysisEnabled(enabled: boolean): Promise<AiSettings> {
    if (enabled && !(await aiSettingsService.get()).configured) throw new GeminiNotConfiguredError();
    await db
      .insert(appSettings)
      .values({ id: SETTINGS_ROW_ID, aiCvAnalysisEnabled: enabled })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: { aiCvAnalysisEnabled: enabled, updatedAt: new Date() },
      });
    return aiSettingsService.get();
  },
};
