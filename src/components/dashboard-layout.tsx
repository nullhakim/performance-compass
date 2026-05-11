import { ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";

export function DashboardLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
          <div className="flex h-16 items-center px-6 lg:px-10">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        </header>
        <main className="px-6 py-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
