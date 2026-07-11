import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Bell, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { api, AlertData } from "@/lib/api";

export const Route = createFileRoute("/_app/alerts")({
  head: () => ({ meta: [{ title: "Alerts · Monsoon Copilot" }] }),
  component: Alerts,
});

function Alerts() {
  const [alerts, setAlerts] = useState<AlertData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("medium");
  const [area, setArea] = useState("");
  const [time, setTime] = useState("Active · Next 6h");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);

  const loadAlerts = async () => {
    try {
      const data = await api.alerts.get();
      setAlerts(data);
    } catch (err) {
      toast.error("Failed to load real-time alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setUserRole(u.role || "citizen");
      } catch (e) {
        setUserRole("citizen");
      }
    }
  }, []);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !area || !time) {
      toast.error("Please fill in Title, Area, and Time.");
      return;
    }

    setSubmitting(true);
    try {
      await api.alerts.create({
        title,
        level,
        area,
        time,
        latitude: latitude === "" ? undefined : Number(latitude),
        longitude: longitude === "" ? undefined : Number(longitude),
      });
      toast.success("Emergency safety alert broadcasted successfully!");
      setTitle("");
      setLevel("medium");
      setArea("");
      setTime("Active · Next 6h");
      setLatitude("");
      setLongitude("");
      setIsOpen(false);
      loadAlerts();
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast alert.");
    } finally {
      setSubmitting(false);
    }
  };

  const isEligibleToAlert = userRole && ["ngo", "volunteer", "admin"].includes(userRole);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-sm font-semibold text-muted-foreground">Syncing broadcast warnings...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="gradient-alert flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-elegant">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-4xl font-bold">Real-time alerts</h1>
            <p className="text-sm text-muted-foreground">IMD · BMC · Community-verified</p>
          </div>
        </div>

        {isEligibleToAlert && (
          <Button 
            onClick={() => setIsOpen(true)}
            className="gradient-alert border-0 text-white shadow-elegant"
          >
            <Plus className="mr-2 h-4 w-4" /> Broadcast warning
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center text-muted-foreground">
            No active alerts in your location. Stay safe!
          </div>
        ) : (
          alerts.map((a, i) => {
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
          })
        )}
      </div>

      {/* Broadcast Alert Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass border border-white/60 bg-white/80 max-w-md rounded-3xl p-6 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <Send className="h-5 w-5 text-destructive animate-pulse" />
              Broadcast Warning
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateAlert} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="alertTitle" className="text-xs font-semibold text-muted-foreground">Warning Title</Label>
              <Input
                id="alertTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Extreme Rainfall and Flash Floods"
                className="glass border-white/60 h-10"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Alert Severity</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger className="glass border-white/60 h-10">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Information)</SelectItem>
                  <SelectItem value="medium">Medium (Advisory)</SelectItem>
                  <SelectItem value="high">High (Red Alert / Dangerous)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="alertArea" className="text-xs font-semibold text-muted-foreground">Target Area / Region</Label>
              <Input
                id="alertArea"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="e.g. Milan Subway, Andheri"
                className="glass border-white/60 h-10"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="alertTime" className="text-xs font-semibold text-muted-foreground">Duration / Timeframe</Label>
              <Input
                id="alertTime"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="e.g. Next 6 hours / Ongoing"
                className="glass border-white/60 h-10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="alertLat" className="text-xs font-semibold text-muted-foreground">Latitude (Optional)</Label>
                <Input
                  id="alertLat"
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value === "" ? "" : Number(e.target.value))}
                  className="glass border-white/60 h-10"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="alertLng" className="text-xs font-semibold text-muted-foreground">Longitude (Optional)</Label>
                <Input
                  id="alertLng"
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value === "" ? "" : Number(e.target.value))}
                  className="glass border-white/60 h-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full gradient-alert border-0 text-white shadow-elegant h-11 rounded-xl font-medium mt-4 animate-float"
            >
              {submitting ? "Broadcasting Warning..." : "Publish Emergency Broadcast"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
