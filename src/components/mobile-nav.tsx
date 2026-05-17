import { Link, useRouterState, useRouter } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Target,
  FolderTree,
  Package,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logout } from "@/lib/auth";

const items = [
  { title: "Home", to: "/dashboard", icon: LayoutDashboard },
  { title: "Employee", to: "/employees", icon: Users },
  { title: "Categories", to: "/categories", icon: FolderTree },
  { title: "Products", to: "/products", icon: Package },
  { title: "Target", to: "/targets", icon: Target },
];

export function MobileNav() {
  const currentPath = useRouterState({ select: (r) => r.location.pathname });
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-background/80 px-2 pb-safe backdrop-blur-lg md:hidden">
      {items.map((item) => {
        const active = item.to === "/dashboard" 
          ? currentPath === "/dashboard" 
          : currentPath.startsWith(item.to);
        
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", active && "scale-110")} />
            <span className="text-[10px] font-medium">{item.title}</span>
          </Link>
        );
      })}
      <button
        onClick={() => {
          logout();
          router.navigate({ to: "/login" });
        }}
        className="flex flex-col items-center gap-1 px-3 py-1 transition-colors text-muted-foreground hover:text-foreground"
      >
        <LogOut className="h-5 w-5" />
        <span className="text-[10px] font-medium">Log out</span>
      </button>
    </nav>
  );
}
