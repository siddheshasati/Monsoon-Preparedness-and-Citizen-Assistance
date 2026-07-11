import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/alerts")({
  head: () => ({ meta: [{ title: "Alerts · Monsoon Copilot" }] }),
  component: Alerts,
});

interface AlertData {
  id: number;
  title: string;
  level: string;
  area: string;
  time: string;
  body?: string;
}

function Alerts() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/api/alerts`);
        if (!res.ok) throw new Error("Network response error");
        const data = await res.json();
        setAlerts(data);
      } catch (err) {
        toast.error("Failed to load real-time alerts.");
      } finally {
        setLoading(false);
      }
    }
    loadAlerts();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-sm font-semibold text-muted-foreground">Syncing broadcast warnings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <div className="gradient-alert flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-elegant">
          <Bell className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold">Real-time alerts</h1>
          <p className="text-sm text-muted-foreground">IMD · BMC · Community-verified</p>
        </div>
      </div>

      <div className="space-y-4">
        {alerts.map((a, i) => {
          const border = a.level === "high" ? "border-destructive/50" :
                         a.level === "medium" ? "border-warning/50" : "border-accent/50";
          const tint = a.level === "high" ? "text-destructive" :
                       a.level === "medium" ? "text-warning" : "text-accent";
          return (
            <motion.div key={a.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
              className={`glass rounded-3xl border-l-4 p-6 ${border}`}
            >
              <div className="flex items-start gap-4">
                <AlertTriangle className={`mt-1 h-6 w-6 ${tint}`} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="uppercase text-[10px]">{a.level} alert</Badge>
                    <span className="text-xs text-muted-foreground">{a.area} · {a.time}</span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold">{a.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {a.body || `Severe ${a.level}-level weather hazards reported at ${a.area}. Please take necessary precautions and verify safety checkpoints.`}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
