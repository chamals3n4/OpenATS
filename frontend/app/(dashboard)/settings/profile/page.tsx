import { serverFetch } from "@/lib/auth-action";
import { getSession } from "@/lib/session";
import type { CurrentUser } from "@/types";
import { ChangePasswordForm } from "./_components/change-password-form";
import { ProfileView } from "./_components/profile-view";
import {
  formatMemberSince,
  fullNameOf,
  humanizeRole,
} from "./lib/profile-utils";

/** The API's record of the user (join date, status). The page still works without it. */
async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    return (await serverFetch<{ data: CurrentUser }>("/users/me")).data;
  } catch {
    return null;
  }
}

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) {
    return <p className="p-6 text-slate-500">You are not signed in.</p>;
  }

  const me = await getCurrentUser();
  const { user } = session;

  const firstName = me?.firstName ?? user.firstName ?? null;
  const lastName = me?.lastName ?? user.lastName ?? null;
  const email = me?.email ?? user.email;
  const role = me?.role ?? user.role;

  return (
    <ProfileView
      firstName={firstName}
      lastName={lastName}
      fullName={fullNameOf(firstName, lastName, user.name || email)}
      email={email}
      avatarUrl={me?.avatarUrl ?? user.image ?? null}
      roles={role ? [humanizeRole(role)].filter(Boolean) : []}
      memberSince={formatMemberSince(me?.createdAt)}
      isActive={me ? me.isActive : null}
    >
      <ChangePasswordForm />
    </ProfileView>
  );
}
