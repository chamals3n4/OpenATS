import { asgardeo } from "@asgardeo/nextjs/server";
import { serverFetch } from "@/lib/auth-action";
import type { CurrentUser } from "@/types";
import { ProfileView } from "./_components/profile-view";
import {
  formatMemberSince,
  humanizeRole,
  identityFromClaims,
  type IdentityClaims,
} from "./lib/profile-utils";

function decodeJWT(token: string): IdentityClaims | null {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

/** The app's own record of the user (role, join date). The page still works without it. */
async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return (await serverFetch<{ data: CurrentUser }>("/users/me")).data;
  } catch {
    return null;
  }
}

export default async function ProfilePage() {
  const client = await asgardeo();
  const sessionId = await client.getSessionId();
  if (!sessionId) {
    return <p className="p-6 text-slate-500">You are not signed in.</p>;
  }
  const accessToken = await client.getAccessToken(sessionId);
  const claims = decodeJWT(accessToken);
  if (!claims) {
    return <p className="p-6 text-slate-500">You are not signed in.</p>;
  }

  const identity = identityFromClaims(claims);
  const me = await getCurrentUser();

  // The app's role is the one that decides what they can do; the sign-in provider's list is the fallback.
  const roles = (me ? [me.role] : identity.roles).map(humanizeRole).filter(Boolean);

  return (
    <ProfileView
      firstName={me?.firstName || identity.firstName}
      lastName={me?.lastName || identity.lastName}
      fullName={identity.fullName}
      email={identity.email ?? me?.email ?? null}
      username={identity.username}
      country={identity.country}
      avatarUrl={me?.avatarUrl ?? identity.avatarUrl}
      roles={roles}
      memberSince={formatMemberSince(me?.createdAt)}
      isActive={me ? me.isActive : null}
    />
  );
}
