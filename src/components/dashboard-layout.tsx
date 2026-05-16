import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "./ui/button";
import { AppSidebar } from "./app-sidebar";
import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";

export function DashboardLayout({ 
  children, 
  title, 
  subtitle,
  hideMobileNav = false 
}: { 
  children: ReactNode; 
  title: string; 
  subtitle?: string;
  hideMobileNav?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <div className="md:pl-64">
        <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur">
          <div className="flex h-14 items-center gap-3 px-4 md:px-8 lg:px-10">
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
              <h1 className="truncate text-[14px] md:text-[15px] font-semibold tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="truncate text-[10px] md:text-[11.5px] text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
        </header>
        <main className={cn(
          "px-4 py-6 md:px-8 md:py-8 lg:px-10 lg:py-10 pb-24 md:pb-8",
          hideMobileNav && "pb-8"
        )}>
          {children}
        </main>
      </div>
      {!hideMobileNav && <MobileNav />}
    </div>
  );
}
