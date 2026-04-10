import { QueryClient, HydrationBoundary, dehydrate } from "@tanstack/react-query";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DragDropProvider } from "@/components/drag-drop-provider";
import { PrefetchProvider } from "@/components/prefetch-provider";
import { SetupCompanyGate } from "@/components/setup-company-gate";
import { Toaster } from "@/components/ui/sonner";
import { serverFetch } from "@/lib/auth-action";
import type { AnalyticsReport, Department } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Prefetch the two heaviest/most-needed queries on the server so the data
  // is embedded in the initial HTML. HydrationBoundary transfers this into
  // the client React Query cache during hydration — no client-side loading
  // state at all for the overview page and the department dropdown.
  const queryClient = new QueryClient();

  await Promise.allSettled([
    queryClient.prefetchQuery({
      queryKey: ["reports", "analytics", "7d", "all"],
      queryFn: () =>
        serverFetch<{ data: AnalyticsReport }>("/reports/analytics?period=7d"),
      staleTime: 1000 * 60 * 5,
    }),
    queryClient.prefetchQuery({
      queryKey: ["departments"],
      queryFn: () =>
        serverFetch<{ data: Department[] }>("/company/departments"),
      staleTime: 1000 * 60 * 10,
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PrefetchProvider />
      <div className="[--header-height:calc(--spacing(14))]">
        <SidebarProvider className="flex flex-col">
          <SiteHeader />
          <div className="flex flex-1 min-w-0 overflow-x-hidden w-full">
            <AppSidebar />
            <SidebarInset>
              <DragDropProvider>
                <SetupCompanyGate>{children}</SetupCompanyGate>
              </DragDropProvider>
            </SidebarInset>
          </div>
        </SidebarProvider>
      </div>
      <Toaster richColors closeButton />
    </HydrationBoundary>
  );
}
