import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Camera, MapPin, Plus, ThumbsUp, TrendingUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { api, HazardReport } from "@/lib/api";

export const Route = createFileRoute("/_app/community")({
  head: () => ({ meta: [{ title: "Community · Monsoon Copilot" }] }),
  component: Community,
});

function Community() {
  const [reports, setReports] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Reporting Form modal state
  const [isOpen, setIsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form fields
  const [type, setType] = useState("Waterlogging");
  const [severity, setSeverity] = useState("medium");
  const [description, setDescription] = useState("");
  const [locationName, setLocationName] = useState("");
  const [latitude, setLatitude] = useState(19.119);
  const [longitude, setLongitude] = useState(72.846);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [userLocation, setUserLocation] = useState<{ latitude: number, longitude: number, location_name?: string } | undefined>(undefined);

  const fetchReports = async () => {
    try {
      const data = await api.hazards.get();
      setReports(data);
    } catch (err) {
      toast.error("Failed to load community hazard feed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    const u = api.auth.getStoredUser();
    if (u) {
      if (u.latitude && u.longitude) {
        setUserLocation({
          latitude: u.latitude,
          longitude: u.longitude,
          location_name: u.location_name
        });
        setLatitude(u.latitude);
        setLongitude(u.longitude);
        if (u.location_name) setLocationName(u.location_name);
      }
    }
  }, []);

  const handleConfirm = async (id: number) => {
    try {
      // Optimistic update
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, reports: r.reports + 1 } : r))
      );
      const res = await api.hazards.confirm(id);
      toast.success("Confirmation submitted.");
    } catch {
      toast.error("Failed to submit verification.");
      fetchReports();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
      toast.info("Image attached. Preparing AI analysis...");
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationName) {
      toast.error("Please enter a location name.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("severity", severity);
      formData.append("description", description);
      formData.append("location_name", locationName);
      formData.append("latitude", String(latitude));
      formData.append("longitude", String(longitude));
      
      if (imageFile) {
        formData.append("image", imageFile);
      }

      await api.hazards.report(formData);
      toast.success("Hazard reported. Verified & pinned to the community map!");
      
      // Reset form
      setDescription("");
      setLocationName("");
      setImageFile(null);
      setIsOpen(false);
      
      // Refresh reports
      fetchReports();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit hazard report.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-sm font-semibold text-muted-foreground">Hydrating community feeds...</p>
      </div>
    );
  }

  const reportsToday = reports.length;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Community intelligence</div>
          <h1 className="mt-1 font-display text-4xl font-bold">Report. Verify. Help neighbors.</h1>
          <p className="text-sm text-muted-foreground">Crowdsourced hazards feed authorities & the AI in real time.</p>
        </div>
        <Button 
          onClick={() => setIsOpen(true)}
          className="gradient-hero border-0 text-white shadow-elegant"
        >
          <Plus className="mr-2 h-4 w-4" /> Report hazard
        </Button>
      </div>

      {/* Community Status Banner */}
      <div className="glass rounded-3xl p-6 md:p-8 bg-gradient-to-r from-primary/10 via-accent/5 to-primary/5 border border-white/60 shadow-elegant">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h3 className="font-display text-lg font-bold text-slate-800 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              Community Status: Active Monitoring
            </h3>
            <p className="text-sm text-slate-600 max-w-2xl">
              Monsoon Copilot is actively tracking safety reports in your area. Use the <b>Report Hazard</b> button to log waterlogging, fallen trees, or electric cables. Help verify your neighbors' reports to build a safer routing database.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 animate-fade-in">
            <div className="bg-white/80 backdrop-blur px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm text-center min-w-[100px]">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reports Today</div>
              <div className="text-xl font-bold gradient-text">{reportsToday}</div>
            </div>
            <div className="bg-white/80 backdrop-blur px-4 py-2.5 rounded-2xl border border-slate-100 shadow-sm text-center min-w-[100px]">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Volunteers</div>
              <div className="text-xl font-bold text-emerald-600 font-sans">Active</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="glass rounded-3xl p-6 lg:col-span-2">
          <h3 className="mb-4 font-semibold">Live community reports</h3>
          <div className="space-y-3">
            {reports.map((r, i) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 rounded-2xl bg-white/60 p-4 hover:shadow-elegant transition"
              >
                <div className="gradient-alert flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white">
                  <Camera className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm">{r.type}</span>
                    <Badge variant={r.severity === "high" ? "destructive" : "secondary"}>
                      {r.severity}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="h-3 w-3" /> {r.location}
                  </div>
                  {r.description && (
                    <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">
                      {r.description}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <button 
                    onClick={() => handleConfirm(r.id)}
                    className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-accent transition px-2 py-1 rounded-lg hover:bg-slate-200/50"
                    title="Confirm this hazard report"
                  >
                    <ThumbsUp className="h-4 w-4" /> {r.reports}
                  </button>
                  <div className="text-[10px] text-muted-foreground mr-2">confirms</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="gradient-safety rounded-3xl p-6 text-white shadow-elegant">
            <TrendingUp className="h-6 w-6" />
            <div className="mt-3 font-display text-4xl font-bold">{reportsToday}</div>
            <div className="text-sm opacity-90">active report{reportsToday !== 1 && "s"}</div>
            <div className="mt-4 text-xs opacity-80 font-medium">Updates immediately inside AI Routing Models.</div>
          </div>
          
          <div className="glass rounded-3xl p-6">
            <h3 className="font-semibold">Top volunteers</h3>
            <ul className="mt-3 space-y-3">
              {["Ravi K.", "Meera S.", "Rohan D."].map((n, i) => (
                <li key={n} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="gradient-hero flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white">
                      {n[0]}
                    </div>
                    <span className="text-sm">{n}</span>
                  </div>
                  <Badge className="bg-accent text-accent-foreground">{40 - i * 6} pts</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Report Hazard Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass border border-white/60 bg-white/80 max-w-md rounded-3xl p-6 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Report Local Hazard
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitReport} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Hazard Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="glass border-white/60 h-10">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Waterlogging">Waterlogging</SelectItem>
                  <SelectItem value="Fallen trees">Fallen Tree / Blocked Road</SelectItem>
                  <SelectItem value="Blocked roads">Infrastructure Damage</SelectItem>
                  <SelectItem value="Electric hazards">Electric cable spark</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Severity Level</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="glass border-white/60 h-10">
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low (Passable)</SelectItem>
                  <SelectItem value="medium">Medium (Requires caution)</SelectItem>
                  <SelectItem value="high">High (Dangerous / Blocked)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="locName" className="text-xs font-semibold text-muted-foreground">Address / Landmark</Label>
              <Input
                id="locName"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="e.g. S.V. Road near Bandra Station"
                className="glass border-white/60 h-10"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="lat" className="text-xs font-semibold text-muted-foreground">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => setLatitude(Number(e.target.value))}
                  className="glass border-white/60 h-10"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lng" className="text-xs font-semibold text-muted-foreground">Longitude</Label>
                <Input
                  id="lng"
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => setLongitude(Number(e.target.value))}
                  className="glass border-white/60 h-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="desc" className="text-xs font-semibold text-muted-foreground">Description</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of the hazard (height of water, lanes blocked...)"
                className="glass border-white/60 min-h-16"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="photo" className="text-xs font-semibold text-muted-foreground">Attach Image (Optional)</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="glass border-white/60 h-10 py-1.5 cursor-pointer text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full gradient-hero border-0 text-white shadow-elegant h-11 rounded-xl font-medium mt-4"
            >
              {submitting ? "Submitting Report..." : "Submit Hazard Report"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
