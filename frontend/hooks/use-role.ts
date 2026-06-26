import { useCurrentUser } from "@/hooks/queries/use-user";

export function useIsManager(): boolean {
  const { data } = useCurrentUser();
  const role = data?.data?.role;
  return role === "super_admin" || role === "hiring_manager";
}
