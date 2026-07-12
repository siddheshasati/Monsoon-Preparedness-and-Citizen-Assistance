import { Link, useNavigate } from "@tanstack/react-router";
import { CloudRain, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export function SiteHeader() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  useEffect(() => {
    setUser(api.auth.getStoredUser());
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass border-b border-white/50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <div className="gradient-hero flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-glow">
              <CloudRain className="h-5 w-5" />
            </div>
            <span className="gradient-text">Monsoon Copilot</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
            <Link to="/" activeProps={{ className: "text-foreground" }} className="hover:text-foreground">Home</Link>
            <Link to="/dashboard" activeProps={{ className: "text-foreground" }} className="hover:text-foreground">Dashboard</Link>
            <Link to="/map" activeProps={{ className: "text-foreground" }} className="hover:text-foreground">Live Map</Link>
            <Link to="/assistant" activeProps={{ className: "text-foreground" }} className="hover:text-foreground">AI Assistant</Link>
            <Link to="/community" activeProps={{ className: "text-foreground" }} className="hover:text-foreground">Community</Link>
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <>
                <span className="hidden text-xs font-semibold text-muted-foreground md:inline-block">
                  Hi, {user.name}
                </span>
                <Button size="sm" asChild className="gradient-hero border-0 text-white shadow-elegant hover:opacity-90">
                  <Link to="/dashboard">Go to App</Link>
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={handleLogout} title="Sign Out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                  <Link to="/auth">Sign in</Link>
                </Button>
                <Button size="sm" asChild className="gradient-hero border-0 text-white shadow-elegant hover:opacity-90">
                  <Link to="/auth">Open App</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
