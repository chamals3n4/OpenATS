import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { clientFetch } from "@/lib/client-fetch";
import type { User, CurrentUser } from "@/types";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => clientFetch<{ data: CurrentUser }>("/users/me"),
  });
}

export function useUsers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => clientFetch<{ data: User[] }>("/users"),
    staleTime: 1000 * 60 * 5,
    enabled: options?.enabled ?? true,
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => clientFetch<{ data: User }>(`/users/${id}`),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) =>
      clientFetch<{ data: User }>(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["users", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
