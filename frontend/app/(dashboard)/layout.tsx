import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SiteHeaderServer } from "@/components/layout/site-header-server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DragDropProvider } from "@/components/dynamic-imports";
import { PrefetchProvider } from "@/components/providers/prefetch-provider";
import { CandidateSocketProvider } from "@/components/providers/candidate-socket-provider";
import { SocketAuthProvider } from "@/components/providers/socket-auth-provider";
import { redirect } from "next/navigation";
import { getApiToken, getSession } from "@/lib/session";
import { SetupCompanyGate } from "@/components/guards/setup-company-gate";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { DashboardMainLoading } from "@/components/dashboard-main-loading";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The proxy only checks that a session cookie exists, so this is the real
  // check that the session behind it is valid.
  const session = await getSession();
  if (!session) redirect("/login");

  const socketToken = (await getApiToken()) ?? undefined;

  return (
    <QueryProvider>
      <SocketAuthProvider token={socketToken}>
        <PrefetchProvider />
        <CandidateSocketProvider />
        <div className="[--header-height:calc(--spacing(14))]">
          <SidebarProvider className="flex flex-col">
            <SiteHeaderServer />
            <div className="flex flex-1 min-w-0 overflow-x-hidden w-full">
              <AppSidebar />
              <SidebarInset>
                <DragDropProvider>
                  <SetupCompanyGate>
                    <Suspense fallback={<DashboardMainLoading />}>
                      {children}
                    </Suspense>
                  </SetupCompanyGate>
                </DragDropProvider>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </div>
        <Toaster richColors closeButton />
      </SocketAuthProvider>
    </QueryProvider>
  );
}
