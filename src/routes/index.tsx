import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, FileText, LogOut, ArrowRight, Users, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logout } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Super App Internal — Bank Galuh" },
      { name: "description", content: "Main gateway of Bank Galuh Internal Super App." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const userName = "Admin";

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/70 bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-border">
              <img src="/logo-icon.png" alt="Bank Galuh" className="h-full w-full object-contain p-1" />
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-foreground">Super App Internal</p>
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Bank Galuh</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-medium text-foreground">Welcome back, {userName}</p>
              <p className="text-[11px] text-muted-foreground">HR / Manager</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout} className="h-9 gap-2">
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-16 md:py-20">
        <div className="mb-12 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            Main Menu
          </div>
          <h1 className="mt-5 text-[34px] font-semibold leading-tight tracking-tight text-foreground md:text-[40px]">
            Select a module to start
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Quick access to all your internal tools. Monitor team performance and manage meeting documentation in one place.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <ModuleCard
            to="/dashboard"
            title="Employee Tracker"
            description="Manage employee data, KPIs, and monthly target achievements."
            icon={<BarChart3 className="h-6 w-6" />}
            secondaryIcon={<Users className="h-4 w-4" />}
          />
          <ModuleCard
            to="/meetings"
            title="Meeting Minutes"
            description="Record meeting minutes, attendance, and monitor Action Items status."
            icon={<FileText className="h-6 w-6" />}
            secondaryIcon={<Users className="h-4 w-4" />}
          />
        </div>

        <p className="mt-16 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Super App Internal · Bank Galuh (Perumda BPR Galuh Ciamis)
        </p>
      </main>
    </div>
  );
}

type ModuleCardProps = {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  secondaryIcon: React.ReactNode;
};

function ModuleCard({ to, title, description, icon, secondaryIcon }: ModuleCardProps) {
  return (
    <Link to={to} className="group block">
      <Card className="relative h-full overflow-hidden border-border/70 shadow-none transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        <div
          className="absolute inset-x-0 top-0 h-[3px] bg-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        />
        <CardContent className="flex h-full flex-col gap-7 p-7">
          <div className="flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/8 text-primary ring-1 ring-primary/15 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {icon}
            </div>
            <div className="text-muted-foreground/40 transition-colors group-hover:text-primary">
              {secondaryIcon}
            </div>
          </div>
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            <p className="text-[13.5px] leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <div className="mt-auto flex items-center gap-1.5 text-[13px] font-medium text-primary">
            <span>Open module</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
