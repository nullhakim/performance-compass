import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { AppSidebar } from "./app-sidebar";

export function DashboardLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
          <div className="flex h-16 items-center gap-4 px-6 lg:px-10">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-slate-100"
            >
              <Link to="/" title="Back to Main Menu">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
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
