"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/queries/use-user";

interface ManagerGuardProps {
  children: React.ReactNode;
  redirectTo: string;
}

export function ManagerGuard({ children, redirectTo }: ManagerGuardProps) {
  const router = useRouter();
  const { data: currentUserRes, isLoading } = useCurrentUser();
  const role = currentUserRes?.data?.role;
  const isManager = role === "super_admin" || role === "hiring_manager";

  useEffect(() => {
    if (role && !isManager) router.replace(redirectTo);
  }, [role, isManager, router, redirectTo]);

  if (isLoading || !role) return null;
  if (!isManager) return null;
  return <>{children}</>;
}
