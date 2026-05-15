import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Database,
  Target,
  Building2,
  FolderTree,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  title: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavGroup = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: NavItem[];
};

const items: (NavItem | NavGroup)[] = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { title: "Employees", to: "/employees", icon: Users },
  {
    title: "Master Data",
    icon: Database,
    children: [
      { title: "Categories", to: "/categories", icon: FolderTree },
      { title: "Products", to: "/products", icon: Package },
    ],
  },
  { title: "Targets & Achievements", to: "/targets", icon: Target },
];

function isGroup(i: NavItem | NavGroup): i is NavGroup {
  return (i as NavGroup).children !== undefined;
}

export function AppSidebar() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-14 items-center gap-3 border-b border-sidebar-border px-5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-white/10">
          <img src="/src/assets/logo-icon.png" alt="Bank Galuh" className="h-full w-full object-contain p-1" />
        </div>
        <div className="flex min-w-0 flex-col leading-tight">
          <p className="truncate text-[13px] font-semibold text-sidebar-foreground">Bank Galuh</p>
          <p className="truncate text-[10px] uppercase tracking-[0.12em] text-sidebar-foreground/55">Perumda BPR Galuh</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {items.map((item) => {
          if (isGroup(item)) {
            return (
              <div key={item.title} className="pt-3">
                <div className="flex items-center gap-2 px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/45">
                  <item.icon className="h-3 w-3" />
                  {item.title}
                </div>
                {item.children.map((child) => {
                  const active = currentPath.startsWith(child.to);
                  return (
                    <Link
                      key={child.to}
                      to={child.to}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <child.icon className="h-4 w-4" />
                      <span>{child.title}</span>
                    </Link>
                  );
                })}
              </div>
            );
          }
          const active = item.to === "/" ? currentPath === "/" : currentPath.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border px-5 py-4 text-[10px] leading-relaxed text-sidebar-foreground/55">
        <p className="font-semibold text-sidebar-foreground/80">Bank Galuh Ciamis</p>
        <p>Banking Performance Suite</p>
      </div>
    </aside>
  );
}
