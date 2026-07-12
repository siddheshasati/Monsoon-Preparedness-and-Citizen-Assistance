import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  CloudRain, Droplets, Wind, Gauge, Eye,
  ShieldAlert, Sparkles, Users, MapPin, Navigation, Home, Shield
} from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Progress } from "@/components/ui/progress";
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
import { api, WeatherResponse, ChecklistItem, API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Monsoon Copilot" }] }),
  component: Dashboard,
});

function Stat({ icon: Icon, label, value, unit, tint = "text-primary" }: any) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <Icon className={`h-4 w-4 ${tint}`} />
      </div>
      <div className="mt-2 font-display text-3xl font-bold">
        {value}<span className="ml-1 text-sm text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function Dashboard() {
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [rainForecast, setRainForecast] = useState<Array<{ hour: string; mm: number }>>([]);
  const [weeklyForecast, setWeeklyForecast] = useState<Array<{ day: string; high: number; low: number; rain: number }>>([]);
  const [family, setFamily] = useState<any[]>([]);
  const [shelters, setShelters] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile update modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLocationName, setEditLocationName] = useState("");
  const [editLatitude, setEditLatitude] = useState<number | "">("");
  const [editLongitude, setEditLongitude] = useState<number | "">("");
  const [editRole, setEditRole] = useState("citizen");
  const [editLocating, setEditLocating] = useState(false);
  const [updating, setUpdating] = useState(false);

  const openEditModal = () => {
    const userStr = typeof window !== "undefined" ? sessionStorage.getItem("user") : null;
    const user = userStr ? JSON.parse(userStr) : null;
    if (user) {
      setEditName(user.name || "");
      setEditPhone(user.phone || "");
      setEditLocationName(user.location_name || "");
      setEditLatitude(user.latitude ?? "");
      setEditLongitude(user.longitude ?? "");
      setEditRole(user.role || "citizen");
    }
    setIsEditModalOpen(true);
  };

  const fallbackEditIPLocation = async () => {
    setEditLocating(true);
    try {
      let response = await fetch("https://ipapi.co/json/");
      if (response.ok) {
        const data = await response.json();
        if (data.latitude && data.longitude) {
          setEditLatitude(data.latitude);
          setEditLongitude(data.longitude);
          if (data.city && !editLocationName) {
            setEditLocationName(data.city);
          }
          setEditLocating(false);
          toast.success("Location estimated successfully!");
          return;
        }
      }
    } catch (e) {
      console.error("ipapi.co fallback failed:", e);
    }

    try {
      let response = await fetch("https://freeipapi.com/api/json");
      if (response.ok) {
        const data = await response.json();
        if (data.latitude && data.longitude) {
          setEditLatitude(data.latitude);
          setEditLongitude(data.longitude);
          if (data.cityName && !editLocationName) {
            setEditLocationName(data.cityName);
          }
          setEditLocating(false);
          toast.success("Location estimated successfully!");
          return;
        }
      }
    } catch (e) {
      console.error("freeipapi.com fallback failed:", e);
    }

    setEditLocating(false);
    toast.error("Could not estimate location. Please enter manually.");
  };

  const detectEditLocation = () => {
    if (!navigator.geolocation) {
      fallbackEditIPLocation();
      return;
    }
    setEditLocating(true);
    toast.info("Fetching GPS coordinates...");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setEditLatitude(lat);
        setEditLongitude(lon);
        
        try {
          const res = await fetch(`${API_BASE_URL}/api/auth/reverse-geocode?latitude=${lat}&longitude=${lon}`);
          if (res.ok) {
            const data = await res.json();
            if (data.location_name) {
              setEditLocationName(data.location_name);
              toast.success(`GPS location updated: ${data.location_name}`);
            } else {
              toast.success("GPS location updated successfully!");
            }
          } else {
            toast.success("GPS location updated successfully!");
          }
        } catch (e) {
          console.error("Reverse geocoding failed:", e);
          toast.success("GPS location updated successfully!");
        }
        setEditLocating(false);
      },
      (error) => {
        console.warn("Browser geolocation failed, trying IP fallback...", error);
        fallbackEditIPLocation();
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const updatedUser = await api.auth.updateMe({
        name: editName,
        phone: editPhone || undefined,
        location_name: editLocationName,
        latitude: editLatitude !== "" ? Number(editLatitude) : null,
        longitude: editLongitude !== "" ? Number(editLongitude) : null,
        role: editRole,
      });
      sessionStorage.setItem("user", JSON.stringify(updatedUser));
      toast.success("Profile details updated successfully!");
      setIsEditModalOpen(false);
      
      // Update weather city display immediately
      if (weather) {
        setWeather({
          ...weather,
          city: updatedUser.location_name || weather.city
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile.");
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const w = await api.weather.getCurrent();
        setWeather(w);
      } catch (err: any) {
        toast.error("Failed to load live weather.");
      }

      try {
        const f = await api.weather.getForecast();
        setRainForecast(f.hourly_rain);
        setWeeklyForecast(f.week);
      } catch (err) {
        console.error("Failed to load weather forecasts");
      }

      try {
        const fam = await api.family.get();
        setFamily(fam);
      } catch (err) {
        console.error("Failed to load family status");
      }

      try {
        const sh = await api.family.getShelters();
        setShelters(sh);
      } catch (err) {
        console.error("Failed to load shelter listings");
      }

      try {
        const al = await api.alerts.get();
        setAlerts(Array.isArray(al) ? al : []);
      } catch (err) {
        console.error("Failed to load active alerts");
      }

      try {
        const cl = await api.checklist.get();
        setChecklist(cl);
      } catch (err) {
        console.error("Failed to load checklist info");
      }
      
      setLoading(false);
    }

    loadDashboardData();
  }, []);

  if (loading || !weather) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <CloudRain className="h-10 w-10 animate-bounce text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">Hydrating dashboard statistics...</p>
        </div>
      </div>
    );
  }

  // Calculate checklist counts
  const totalChecklist = checklist.length;
  const doneChecklist = checklist.filter((c) => c.done).length;
  const kitDone = checklist.filter((c) => c.category === "Kit" && c.done).length;
  const kitTotal = checklist.filter((c) => c.category === "Kit").length;
  const familyDone = checklist.filter((c) => c.category === "Family" && c.done).length;
  const familyTotal = checklist.filter((c) => c.category === "Family").length;
  const homeDone = checklist.filter((c) => c.category === "Home" && c.done).length;
  const homeTotal = checklist.filter((c) => c.category === "Home").length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6 lg:p-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">
            Good evening · {weather.city}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="font-display text-4xl font-bold">Your monsoon briefing</h1>
            <Button variant="outline" size="sm" onClick={openEditModal} className="glass rounded-xl h-8 text-xs font-medium border-white/60 bg-white/20">
              ⚙️ Update Details
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Updated {new Date(weather.updatedAt).toLocaleTimeString()}</p>
        </div>
        <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
          <div className="animate-float text-4xl">🌧️</div>
          <div>
            <div className="font-display text-3xl font-bold">{weather.temp}°C</div>
            <div className="text-xs text-muted-foreground">{weather.condition}</div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Droplets} label="Rainfall (1h)" value={weather.rainfall} unit="mm" tint="text-primary" />
        <Stat icon={Wind} label="Wind" value={weather.wind} unit="km/h" tint="text-accent" />
        <Stat icon={Gauge} label="Pressure" value={weather.pressure} unit="hPa" tint="text-primary" />
        <Stat icon={Eye} label="Visibility" value={weather.visibility} unit="km" tint="text-warning" />
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Rainfall forecast chart */}
        <div className="glass rounded-3xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Hyperlocal rainfall — next 8 hours</h3>
              <p className="text-xs text-muted-foreground">Intensity (mm) & probability</p>
            </div>
            <Badge className="gradient-hero border-0 text-white">Heavy Rain Alert</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rainForecast}>
                <defs>
                  <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.52 0.19 255)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.72 0.15 235)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.9 0.02 230)" />
                <XAxis dataKey="hour" stroke="oklch(0.5 0.03 250)" fontSize={12} />
                <YAxis stroke="oklch(0.5 0.03 250)" fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid oklch(0.9 0.02 230)" }} />
                <Area type="monotone" dataKey="mm" stroke="oklch(0.52 0.19 255)" strokeWidth={2.5} fill="url(#rainGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Flood risk */}
        <div className="glass rounded-3xl p-6">
          <h3 className="font-semibold">Flood Risk</h3>
          <p className="text-xs text-muted-foreground">Based on rainfall + terrain + drainage</p>
          <div className="mt-6 text-center">
            <div className="relative mx-auto h-40 w-40">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="42" stroke="oklch(0.92 0.02 230)" strokeWidth="10" fill="none" />
                <circle
                  cx="50" cy="50" r="42"
                  stroke="url(#floodGrad)" strokeWidth="10" fill="none"
                  strokeDasharray={`${weather.flood_risk * 2.64} 264`} strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="floodGrad">
                    <stop offset="0%" stopColor="oklch(0.7 0.2 35)" />
                    <stop offset="100%" stopColor="oklch(0.6 0.24 15)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="font-display text-4xl font-bold text-destructive">{weather.flood_risk}%</div>
                <div className="text-xs text-muted-foreground">
                  {weather.flood_risk > 60 ? "HIGH" : weather.flood_risk > 30 ? "MEDIUM" : "LOW"}
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {weather.flood_risk > 60 
                ? "Subway routes and major low-lying junctions likely to waterlog soon."
                : "Drainage networks running at normal capacities. Low current risk."}
            </p>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="glass rounded-3xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <div className="gradient-hero flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-glow">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold">AI Recommendations</h3>
              <p className="text-xs text-muted-foreground">Personalized for your household</p>
            </div>
          </div>
          <ul className="space-y-3">
            {[
              weather.rainfall > 30 
                ? "Delay non-essential travel immediately. Waterlogging reported on main arteries."
                : "Weather is moderate, check local community hazard reports before traveling.",
              "Verify your emergency kit list. Complete remaining checklist items.",
              "Charge primary power banks now. Grid fluctuations expected during thunderstorms.",
              "Stay connected to the family dashboard and monitor safe routes."
            ].map((rec) => (
              <li key={rec} className="flex gap-3 rounded-2xl bg-white/50 p-3 text-sm">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Safety score */}
        <div className="gradient-safety rounded-3xl p-6 text-white shadow-elegant">
          <div className="text-xs font-semibold uppercase tracking-widest opacity-80">Daily Safety Score</div>
          <div className="mt-2 font-display text-6xl font-bold">{weather.safety_score}</div>
          <div className="mt-1 text-sm opacity-90">
            {weather.safety_score > 80 
              ? "Great preparedness! You've protected your family & home." 
              : "Review your checklist to improve your safety score."}
          </div>
          <Progress value={weather.safety_score} className="mt-4 bg-white/25" />
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl bg-white/15 p-2"><div className="font-bold">{kitDone}/{kitTotal || 4}</div><div className="opacity-80">Kit</div></div>
            <div className="rounded-xl bg-white/15 p-2"><div className="font-bold">{familyDone}/{familyTotal || 2}</div><div className="opacity-80">Family</div></div>
            <div className="rounded-xl bg-white/15 p-2"><div className="font-bold">{homeDone}/{homeTotal || 2}</div><div className="opacity-80">Home</div></div>
          </div>
        </div>

        {/* Week forecast */}
        <div className="glass rounded-3xl p-6 lg:col-span-3">
          <h3 className="mb-4 font-semibold">7-day monsoon outlook</h3>
          <div className="grid grid-cols-3 gap-3 md:grid-cols-7">
            {weeklyForecast.map((d) => (
              <div key={d.day} className="rounded-2xl bg-white/50 p-4 text-center">
                <div className="text-xs font-semibold text-muted-foreground">{d.day}</div>
                <CloudRain className="mx-auto my-2 h-6 w-6 text-primary" />
                <div className="text-sm font-bold">{d.high}° <span className="text-muted-foreground">{d.low}°</span></div>
                <div className="mt-1 text-[10px] text-primary">{d.rain}% rain</div>
              </div>
            ))}
          </div>
        </div>

        {/* Family + Shelters */}
        <div className="glass rounded-3xl p-6 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Family Status</h3>
          </div>
          <ul className="space-y-3">
            {family.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-2xl bg-white/50 p-3">
                <div>
                  <div className="text-sm font-semibold">{m.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{m.location}</div>
                </div>
                <Badge variant={m.status === "safe" ? "default" : "secondary"}
                  className={m.status === "safe" ? "bg-accent text-accent-foreground" : "bg-warning text-warning-foreground"}>
                  {m.status}
                </Badge>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Nearby Shelters</h3>
          </div>
          <ul className="space-y-3">
            {shelters.slice(0, 3).map((s) => (
              <li key={s.id} className="rounded-2xl bg-white/50 p-3">
                <div className="text-sm font-semibold">{s.name}</div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Navigation className="h-3 w-3" />{s.distance}</span>
                  <span>{s.occupancy}/{s.capacity}</span>
                </div>
                <Progress value={(s.occupancy / s.capacity) * 100} className="mt-2 h-1.5" />
              </li>
            ))}
          </ul>
        </div>

        {/* Alerts strip */}
        <div className="glass rounded-3xl p-6 lg:col-span-3">
          <h3 className="mb-4 font-semibold">Active alerts</h3>
          <div className="grid gap-3 md:grid-cols-3">
            {alerts.map((a) => {
              const c = a.level === "high" ? "border-destructive/40 bg-destructive/5" :
                        a.level === "medium" ? "border-warning/40 bg-warning/5" :
                        "border-accent/40 bg-accent/5";
              return (
                <div key={a.id} className={`rounded-2xl border p-4 ${c}`}>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="uppercase text-[10px]">{a.level}</Badge>
                    <span className="text-xs text-muted-foreground">{a.time}</span>
                  </div>
                  <div className="mt-2 text-sm font-semibold">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.area}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="glass border border-white/60 bg-white/80 max-w-md rounded-3xl p-6 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              Update Profile Details
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateProfile} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="editName" className="text-xs font-semibold text-muted-foreground">Full Name</Label>
              <Input
                id="editName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder=""
                className="glass border-white/60 h-10"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="editPhone" className="text-xs font-semibold text-muted-foreground">Phone Number</Label>
              <Input
                id="editPhone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder=""
                className="glass border-white/60 h-10"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="editLocationName" className="text-xs font-semibold text-muted-foreground">Address / City</Label>
                <button
                  type="button"
                  onClick={detectEditLocation}
                  disabled={editLocating}
                  className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-1"
                >
                  📍 {editLocating ? "Locating..." : "Detect GPS"}
                </button>
              </div>
              <Input
                id="editLocationName"
                value={editLocationName}
                onChange={(e) => setEditLocationName(e.target.value)}
                placeholder=""
                className="glass border-white/60 h-10"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Profile Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "citizen", label: "Citizen" },
                  { id: "volunteer", label: "Volunteer" },
                  { id: "ngo", label: "NGO Member" },
                  { id: "admin", label: "Govt Official" },
                ].map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setEditRole(r.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                      editRole === r.id
                        ? "gradient-hero text-white border-transparent shadow-elegant"
                        : "bg-white/40 border-white/60 text-muted-foreground hover:bg-white/60"
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 rounded-xl h-11"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updating}
                className="flex-1 gradient-hero border-0 text-white shadow-elegant h-11 rounded-xl font-medium"
              >
                {updating ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
