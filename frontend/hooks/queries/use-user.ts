import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { serverFetch } from "@/lib/auth-action";
import type { User, CurrentUser } from "@/types";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => serverFetch<{ data: CurrentUser }>("/users/me"),
  });
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: () => serverFetch<{ data: User[] }>("/users"),
    staleTime: 1000 * 60 * 5,
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => serverFetch<{ data: User }>(`/users/${id}`),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) =>
      serverFetch<{ data: User }>(`/users/${id}`, {
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
