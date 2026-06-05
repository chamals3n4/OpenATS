import { asgardeo } from "@asgardeo/nextjs/server";
import { SiteHeader } from "./site-header";

async function getAccessToken(): Promise<string | undefined> {
  try {
    const client = await asgardeo();
    const sessionId = await client.getSessionId();
    return await client.getAccessToken(sessionId);
  } catch {
    return undefined;
  }
}

export async function SiteHeaderServer() {
  const accessToken = await getAccessToken();
  return <SiteHeader accessToken={accessToken} />;
}
