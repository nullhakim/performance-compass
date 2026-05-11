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
  { title: "Dashboard", to: "/", icon: LayoutDashboard },
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
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Performance</p>
          <p className="text-xs text-sidebar-foreground/60 leading-tight">Tracker</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          if (isGroup(item)) {
            return (
              <div key={item.title} className="pt-2">
                <div className="flex items-center gap-2 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                  <item.icon className="h-3.5 w-3.5" />
                  {item.title}
                </div>
                {item.children.map((child) => {
                  const active = currentPath.startsWith(child.to);
                  return (
                    <Link
                      key={child.to}
                      to={child.to}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/60">
        <p className="font-medium text-sidebar-foreground/80">HR / Manager</p>
        <p>Banking Performance Suite</p>
      </div>
    </aside>
  );
}
