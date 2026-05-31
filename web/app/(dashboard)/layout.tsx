import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeaderServer } from "@/components/site-header-server";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DragDropProvider } from "@/components/dynamic-imports";
import { PrefetchProvider } from "@/components/prefetch-provider";
import { SetupCompanyGate } from "@/components/setup-company-gate";
import { QueryProvider } from "@/components/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { DashboardMainLoading } from "@/components/dashboard-main-loading";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <PrefetchProvider />
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
    </QueryProvider>
  );
}
