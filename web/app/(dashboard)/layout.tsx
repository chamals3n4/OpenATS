import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DragDropProvider } from "@/components/drag-drop-provider";
import { ThemeInitializer } from "@/components/theme-initializer";
import { QueryProvider } from "@/components/query-provider";
import { SetupCompanyGate } from "@/components/setup-company-gate";
import { Toaster } from "@/components/ui/sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <div className="[--header-height:calc(--spacing(14))]">
        <ThemeInitializer />
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
    </QueryProvider>
  );
}
