import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  LayoutDashboard, Map, MessageSquare, Users, ShieldAlert, Package,
  Bell, Trophy, HeartHandshake, CloudRain, Menu, ChevronLeft,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/map", label: "Live Map", icon: Map },
  { to: "/assistant", label: "AI Assistant", icon: MessageSquare },
  { to: "/checklist", label: "Preparedness", icon: Package },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/family", label: "Family", icon: Users },
  { to: "/community", label: "Community", icon: HeartHandshake },
  { to: "/sos", label: "SOS", icon: ShieldAlert },
  { to: "/badges", label: "Badges", icon: Trophy },
] as const;

export function DashboardShell() {
  const [open, setOpen] = useState(true);
  const loc = useLocation();
  return (
    <div className="min-h-screen gradient-sky">
      <div className="flex">
        <aside
          className={cn(
            "sticky top-0 h-screen shrink-0 border-r border-border/60 bg-sidebar/80 backdrop-blur-xl transition-all",
            open ? "w-64" : "w-20"
          )}
        >
          <div className="flex h-16 items-center justify-between border-b border-border/60 px-4">
            <Link to="/" className="flex items-center gap-2 overflow-hidden">
              <div className="gradient-hero flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-glow">
                <CloudRain className="h-5 w-5" />
              </div>
              {open && <span className="font-display text-sm font-bold gradient-text">Monsoon Copilot</span>}
            </Link>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(!open)}>
              {open ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
          <nav className="space-y-1 p-3">
            {nav.map(({ to, label, icon: Icon }) => {
              const active = loc.pathname === to || (to !== "/dashboard" && loc.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                    active
                      ? "gradient-hero text-white shadow-elegant"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {open && <span>{label}</span>}
                </Link>
              );
            })}
          </nav>
          {open && (
            <div className="mx-3 mt-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-4">
              <div className="text-xs font-semibold text-primary">Daily Safety Score</div>
              <div className="mt-2 font-display text-3xl font-bold gradient-text">82</div>
              <div className="text-xs text-muted-foreground">Great job. Stay alert.</div>
            </div>
          )}
        </aside>
        <main className="min-h-screen flex-1 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
