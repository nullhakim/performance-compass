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
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-8 lg:px-10">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-muted"
            >
              <Link to="/" title="Back to Main Menu">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="truncate text-[11.5px] text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        </header>
        <main className="px-8 py-8 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
