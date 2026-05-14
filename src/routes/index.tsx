import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, FileText, LogOut, ArrowRight, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Super App Internal — Bank Galuh" },
      { name: "description", content: "Gerbang utama Super App Internal Bank Galuh." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  const navigate = useNavigate();
  const userName = "Admin";

  const handleLogout = () => {
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-indigo-50/40">
      <header className="border-b bg-card/70 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-1 shadow-sm border">
              <img src="/src/assets/logo-icon.png" alt="Bank Galuh" className="h-full w-full object-contain" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900">Super App Internal</p>
              <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Bank Galuh</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">Welcome back, {userName}</p>
              <p className="text-xs text-muted-foreground">HR / Manager</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12 md:py-20">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-wider text-primary">Main Menu</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Pilih modul untuk memulai
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            Akses cepat ke seluruh tools internal Anda. Pantau kinerja tim dan kelola dokumentasi rapat dari satu tempat.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <ModuleCard
            to="/dashboard"
            title="Employee Tracker"
            description="Kelola data karyawan, KPI, dan pencapaian target bulanan."
            icon={<BarChart3 className="h-7 w-7" />}
            secondaryIcon={<Users className="h-5 w-5" />}
            accent="from-indigo-500 to-violet-600"
          />
          <ModuleCard
            to="/meetings"
            title="Meeting Minutes"
            description="Catat hasil rapat, daftar hadir, dan pantau status Action Items."
            icon={<FileText className="h-7 w-7" />}
            secondaryIcon={<Users className="h-5 w-5" />}
            accent="from-sky-500 to-indigo-600"
          />
        </div>

        <p className="mt-12 text-center text-xs text-muted-foreground">
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
  accent: string;
};

function ModuleCard({ to, title, description, icon, secondaryIcon, accent }: ModuleCardProps) {
  return (
    <Link to={to} className="group block">
      <Card className="relative h-full overflow-hidden border-border/60 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">
        <div
          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent} opacity-80`}
          aria-hidden
        />
        <CardContent className="flex h-full flex-col gap-6 p-8">
          <div className="flex items-start justify-between">
            <div
              className={`flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br ${accent} text-white shadow-md transition-transform duration-300 group-hover:scale-105`}
            >
              {icon}
            </div>
            <div className="text-muted-foreground/40 transition-colors group-hover:text-primary">
              {secondaryIcon}
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          </div>
          <div className="mt-auto flex items-center gap-2 text-sm font-medium text-primary">
            <span>Buka modul</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
