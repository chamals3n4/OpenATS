import { db } from "../../db";
import { appSettings } from "../../db/schema";

/** There is a single settings row; this is its id. */
const SETTINGS_ROW_ID = 1;

/** Turning the analysis on needs a Gemini key on the server, which the settings page cannot add. */
export class GeminiNotConfiguredError extends Error {
  constructor() {
    super("Add a Gemini API key to use this");
    this.name = "GeminiNotConfiguredError";
  }
}

export interface AiSettings {
  /** What was chosen in Settings. */
  cvAnalysisEnabled: boolean;
  /** Whether the server has a Gemini API key at all. */
  geminiConfigured: boolean;
  /** Both of the above: CVs are analysed, and the analysis is shown, only when this is true. */
  active: boolean;
}

export const aiSettingsService = {
  isGeminiConfigured(): boolean {
    return !!process.env.GEMINI_API_KEY?.trim();
  },

  async get(): Promise<AiSettings> {
    const [row] = await db.select().from(appSettings).limit(1);
    const cvAnalysisEnabled = row?.aiCvAnalysisEnabled ?? false;
    const geminiConfigured = aiSettingsService.isGeminiConfigured();
    return { cvAnalysisEnabled, geminiConfigured, active: cvAnalysisEnabled && geminiConfigured };
  },

  /** The one question the rest of the app asks: may a CV be sent to Gemini, and its result shown? */
  async isCvAnalysisActive(): Promise<boolean> {
    // Without a key there is nothing to ask the database about.
    if (!aiSettingsService.isGeminiConfigured()) return false;
    return (await aiSettingsService.get()).active;
  },

  async setCvAnalysisEnabled(enabled: boolean): Promise<AiSettings> {
    if (enabled && !aiSettingsService.isGeminiConfigured()) throw new GeminiNotConfiguredError();
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
