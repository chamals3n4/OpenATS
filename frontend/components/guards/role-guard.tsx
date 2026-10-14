"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRole } from "@/hooks/use-role";

interface RoleGuardProps {
  // "manager" lets in hiring managers and super admins
  allow: "manager" | "super_admin";
  redirectTo: string;
  children: React.ReactNode;
}

// Shows the page only to the allowed roles and sends everyone else to redirectTo
export function RoleGuard({ allow, redirectTo, children }: RoleGuardProps) {
  const router = useRouter();
  const { role, isManager, isSuperAdmin } = useRole();
  const allowed = allow === "super_admin" ? isSuperAdmin : isManager;

  useEffect(() => {
    if (role && !allowed) router.replace(redirectTo);
  }, [role, allowed, router, redirectTo]);

  if (!role || !allowed) return null;
  return <>{children}</>;
}
