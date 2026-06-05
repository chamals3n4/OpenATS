import { asgardeo } from "@asgardeo/nextjs/server";

function decodeJWT(token: string) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
  } catch {
    return null;
  }
}

export default async function ProfilePage() {
  const client = await asgardeo();
  const sessionId = await client.getSessionId();
  if (!sessionId) {
    return <p className="p-6 text-neutral-500">You are not signed in.</p>;
  }
  const accessToken = await client.getAccessToken(sessionId);
  const claims = decodeJWT(accessToken);

  if (!claims) {
    return <p className="p-6 text-neutral-500">You are not signed in.</p>;
  }

  const fullName = claims.given_name
    ? `${claims.given_name} ${claims.family_name ?? ""}`.trim()
    : (claims.username ?? claims.sub ?? "User");

  const gravatarUrl = claims.profile ?? null;
  const country = claims.address?.country ?? null;
  const roles: string[] = claims.roles ?? [];

  return (
    <div className="w-full px-8 py-8">
      <div className="mb-8">
        <h1 className="text-lg font-medium text-neutral-900 dark:text-white">
          My Profile
        </h1>
        <p className="text-sm text-neutral-500 mt-0.5">
          Your personal information from your identity provider.
        </p>
      </div>

      {/* Avatar card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-6 mb-4">
        <div className="flex items-center gap-5">
          {gravatarUrl ? (
            <img
              src={gravatarUrl}
              alt={fullName}
              className="w-16 h-16 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 text-xl font-medium flex-shrink-0">
              {fullName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-neutral-900 dark:text-white">
              {fullName}
            </p>
            <p className="text-sm text-neutral-500 mt-0.5">
              {claims.email ?? claims.sub}
            </p>
            <div className="flex gap-1.5 mt-2 flex-wrap">
              {roles.map((role) => (
                <span
                  key={role}
                  className="text-xs px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700"
                >
                  {role}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Personal info */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden mb-4">
        <div className="px-6 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            Personal information
          </p>
        </div>
        <ProfileRow label="Full name" value={fullName} />
        <ProfileRow label="Email address" value={claims.email ?? claims.sub} />
        <ProfileRow label="Username" value={claims.username ?? claims.sub} />
        <ProfileRow label="Country" value={country} last />
      </div>

      {/* Organization */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden">
        <div className="px-6 py-3.5 border-b border-neutral-100 dark:border-neutral-800">
          <p className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
            Organization
          </p>
        </div>
        <ProfileRow label="Organization" value={claims.org_name ?? "s3n4"} />
        <ProfileRow label="Roles" value={roles.join(", ")} last />
      </div>
    </div>
  );
}

function ProfileRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value?: string | null;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between px-6 py-4 ${!last ? "border-b border-neutral-100 dark:border-neutral-800" : ""}`}
    >
      <p className="text-sm text-neutral-500 dark:text-neutral-400 w-40 flex-shrink-0">
        {label}
      </p>
      <p className="text-sm text-neutral-900 dark:text-neutral-100 text-right">
        {value ?? <span className="text-neutral-400">—</span>}
      </p>
    </div>
  );
}
