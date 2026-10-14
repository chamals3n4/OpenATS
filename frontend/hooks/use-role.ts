import { useCurrentUser } from "@/hooks/queries/use-user";

// The signed in user's role, and the checks built on it. Use this instead of comparing roles by hand
export function useRole() {
  const { data, isLoading } = useCurrentUser();
  const role = data?.data?.role;
  return {
    role,
    isLoading,
    isSuperAdmin: role === "super_admin",
    isManager: role === "super_admin" || role === "hiring_manager",
    isInterviewer: role === "interviewer",
  };
}

export function useIsManager(): boolean {
  return useRole().isManager;
}
