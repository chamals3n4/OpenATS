import { initialsOf } from "../lib/profile-utils";

export interface ProfileViewProps {
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string | null;
  username: string | null;
  country: string | null;
  avatarUrl: string | null;
  /** Already in plain words, e.g. "Hiring manager". */
  roles: string[];
  memberSince: string | null;
  /** Null when the app could not say. */
  isActive: boolean | null;
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 px-6 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm font-medium text-slate-500 dark:text-neutral-400">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-[15px] text-slate-900 dark:text-neutral-100">
        {children}
      </dd>
    </div>
  );
}

export function ProfileView({
  firstName,
  lastName,
  fullName,
  email,
  username,
  country,
  avatarUrl,
  roles,
  memberSince,
  isActive,
}: ProfileViewProps) {
  return (
    <div className="flex flex-1 flex-col bg-slate-50/70 dark:bg-neutral-950">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
        <div className="max-w-3xl space-y-6">
          <header>
            <h1 className="text-2xl font-medium leading-none text-slate-900 dark:text-neutral-100">
              My Profile
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
              Your account and what you can do in OpenATS.
            </p>
          </header>

          <section className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center gap-5 px-6 py-6">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="size-20 shrink-0 rounded-full border border-slate-300 object-cover dark:border-neutral-700"
                />
              ) : (
                <div
                  aria-hidden
                  className="flex size-20 shrink-0 items-center justify-center rounded-full bg-slate-100 text-2xl font-semibold text-slate-700 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  {initialsOf(firstName, lastName, fullName)}
                </div>
              )}

              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold text-slate-900 dark:text-neutral-100">
                  {fullName}
                </h2>
                {email && (
                  <p className="mt-0.5 truncate text-[15px] text-slate-600 dark:text-neutral-400">
                    {email}
                  </p>
                )}
                {roles.length > 0 && (
                  <ul aria-label="Roles" className="mt-3 flex flex-wrap gap-2">
                    {roles.map((role) => (
                      <li
                        key={role}
                        className="rounded-full border border-slate-300 bg-slate-100 px-3 py-0.5 text-sm font-medium text-slate-700 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
                      >
                        {role}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <dl className="divide-y divide-slate-200 border-t border-slate-300 dark:divide-neutral-800 dark:border-neutral-700">
              {username && <Detail label="Username">{username}</Detail>}
              {country && <Detail label="Country">{country}</Detail>}
              {memberSince && <Detail label="Member since">{memberSince}</Detail>}
              {isActive !== null && (
                <Detail label="Account status">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className={`size-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                    />
                    {isActive ? "Active" : "Deactivated"}
                  </span>
                </Detail>
              )}
            </dl>
          </section>

          <p className="text-sm leading-relaxed text-slate-500 dark:text-neutral-400">
            Your name, email and username come from the account you sign in
            with, so they can&apos;t be changed here. To update them, change
            them in your sign-in account.
          </p>
        </div>
      </div>
    </div>
  );
}
