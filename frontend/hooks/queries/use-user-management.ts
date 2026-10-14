import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  createUser,
  deleteUser,
  fetchUsers,
  sendPasswordResetLink,
  setUserPassword,
  updateUser,
  type CreateUserPayload,
  type UpdateUserPayload,
} from "@/lib/users/client";

// User management goes through the Next.js /api/users routes (Better Auth admin)
const managedUsersKey = ["user-management"] as const;

export function useManagedUsers() {
  return useQuery({
    queryKey: managedUsersKey,
    queryFn: async () => {
      try {
        return await fetchUsers();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to fetch users");
        throw e;
      }
    },
  });
}

// Refresh this list and the app wide ["users"] list (e.g. the hiring team picker)
function useRefreshUsers() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: managedUsersKey }),
      queryClient.invalidateQueries({ queryKey: ["users"] }),
    ]);
}

export function useCreateUser() {
  const refresh = useRefreshUsers();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: refresh,
  });
}

export function useUpdateManagedUser() {
  const refresh = useRefreshUsers();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserPayload }) => updateUser(id, data),
    onSuccess: refresh,
  });
}

export function useRemoveUser() {
  const refresh = useRefreshUsers();
  return useMutation({
    mutationFn: (id: number) => deleteUser(id),
    onSuccess: refresh,
  });
}

export function useSetUserPassword() {
  return useMutation({
    mutationFn: ({ id, password }: { id: number; password: string }) =>
      setUserPassword(id, password),
  });
}

export function useSendPasswordResetLink() {
  return useMutation({
    mutationFn: (id: number) => sendPasswordResetLink(id),
  });
}
