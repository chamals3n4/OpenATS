import { initialsOf } from "../_lib/profile-utils";

export interface ProfileViewProps {
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  /** Already in plain words, e.g. "Hiring manager". */
  roles: string[];
  memberSince: string | null;
  /** Null when the app could not say. */
  isActive: boolean | null;
  /** The sections beside the identity card: personal details, change password. */
  children?: React.ReactNode;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-slate-500 dark:text-neutral-400">{label}</dt>
      <dd className="min-w-0 break-words text-right text-sm font-medium text-slate-900 dark:text-neutral-100">
        {children}
      </dd>
    </div>
  );
}

/**
 * The profile page: who you are on one side, and what you can change on the other. The identity
 * card only states things; everything editable is in the sections passed in as children.
 */
export function ProfileView({
  firstName,
  lastName,
  fullName,
  email,
  avatarUrl,
  roles,
  memberSince,
  isActive,
  children,
}: ProfileViewProps) {
  return (
    <div className="flex flex-1 flex-col bg-slate-50/70 dark:bg-neutral-950">
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">
        <div className="max-w-6xl space-y-6">
          <header>
            <h1 className="text-2xl font-medium leading-none text-slate-900 dark:text-neutral-100">
              My Profile
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-neutral-400">
              Your details, and how you sign in to OpenATS.
            </p>
          </header>

          <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <section
              aria-label="Your account"
              className="overflow-hidden rounded-lg border border-slate-300 bg-white lg:sticky lg:top-0 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <div className="flex flex-col items-center px-6 pb-6 pt-8 text-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={fullName}
                    className="size-24 shrink-0 rounded-full border border-slate-300 object-cover dark:border-neutral-700"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="flex size-24 shrink-0 items-center justify-center rounded-full bg-theme text-3xl font-semibold text-white"
                  >
                    {initialsOf(firstName, lastName, fullName)}
                  </div>
                )}

                <h2 className="mt-4 max-w-full truncate text-lg font-semibold text-slate-900 dark:text-neutral-100">
                  {fullName}
                </h2>
                {email && (
                  <p className="mt-0.5 max-w-full truncate text-sm text-slate-600 dark:text-neutral-400">
                    {email}
                  </p>
                )}
                {roles.length > 0 && (
                  <ul aria-label="Roles" className="mt-3 flex flex-wrap justify-center gap-2">
                    {roles.map((role) => (
                      <li
                        key={role}
                        className="rounded-md border border-theme/30 bg-theme/10 px-2.5 py-0.5 text-xs font-semibold text-theme dark:text-primary"
                      >
                        {role}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {(memberSince || isActive !== null) && (
                <dl className="divide-y divide-slate-200 border-t border-slate-300 px-6 dark:divide-neutral-800 dark:border-neutral-700">
                  {memberSince && <Fact label="Member since">{memberSince}</Fact>}
                  {isActive !== null && (
                    <Fact label="Account status">
                      <span className="inline-flex items-center gap-2">
                        <span
                          aria-hidden
                          className={`size-2 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`}
                        />
                        {isActive ? "Active" : "Deactivated"}
                      </span>
                    </Fact>
                  )}
                </dl>
              )}

              <p className="border-t border-slate-300 bg-slate-50 px-6 py-3.5 text-xs leading-relaxed text-slate-600 dark:border-neutral-700 dark:bg-neutral-950/50 dark:text-neutral-400">
                Your role and email are managed by your administrator. A super admin can change them in
                Settings &gt; User management.
              </p>
            </section>

            <div className="min-w-0 space-y-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
