import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { clientFetch } from "@/lib/client-fetch";
import type { ApiNotification } from "@/lib/notifications";

export const NOTIFICATIONS_KEY = ["notifications"] as const;

type NotificationsResponse = { data: ApiNotification[]; meta: { unread: number } };

/** The signed-in user's notifications. Kept fresh by the socket, which refetches on news. */
export function useNotifications() {
  return useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: () => clientFetch<NotificationsResponse>("/notifications"),
    staleTime: 1000 * 60,
    // A fallback for a socket that dropped without noticing.
    refetchInterval: 1000 * 60 * 2,
  });
}

/** Marks the given notifications read, or all of them without ids. Updates the list at once. */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: number[]) =>
      clientFetch("/notifications/read", { method: "POST", body: JSON.stringify(ids ? { ids } : {}) }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATIONS_KEY });
      const previous = queryClient.getQueryData<NotificationsResponse>(NOTIFICATIONS_KEY);
      if (previous) {
        const now = new Date().toISOString();
        const marked = new Set(ids ?? previous.data.map((n) => n.id));
        const data = previous.data.map((n) => (marked.has(n.id) && !n.readAt ? { ...n, readAt: now } : n));
        const newlyRead = previous.data.filter((n) => marked.has(n.id) && !n.readAt).length;
        queryClient.setQueryData<NotificationsResponse>(NOTIFICATIONS_KEY, {
          data,
          meta: { unread: ids ? Math.max(0, previous.meta.unread - newlyRead) : 0 },
        });
      }
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(NOTIFICATIONS_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}
