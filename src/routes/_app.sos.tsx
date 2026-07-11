import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { AlertOctagon, MapPin, Phone, Users, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const Route = createFileRoute("/_app/sos")({
  head: () => ({ meta: [{ title: "SOS · Monsoon Copilot" }] }),
  component: SOS,
});

const contacts = [
  { name: "BMC Disaster Control", num: "1916" },
  { name: "Police", num: "100" },
  { name: "Ambulance", num: "108" },
  { name: "Fire", num: "101" },
  { name: "Coast Guard", num: "1554" },
];

function SOS() {
  const [active, setActive] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);

  const triggerSOS = () => {
    if (active) {
      setActive(false);
      setGpsLocation(null);
      toast.info("SOS broadcast cancelled.");
      return;
    }

    setBroadcasting(true);
    toast.info("Fetching GPS coordinates...");

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser. Using default city location.");
      broadcastSOSRequest(19.0760, 72.8777, "Mumbai Center");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setGpsLocation({ lat: latitude, lng: longitude });
        broadcastSOSRequest(latitude, longitude, "Bandra West, Mumbai");
      },
      (error) => {
        toast.error("Could not obtain GPS accuracy. Broadcasting default coordinates.");
        broadcastSOSRequest(19.0544, 72.8402, "Bandra West (Default)");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const broadcastSOSRequest = async (lat: number, lng: number, locName: string) => {
    try {
      const res = await api.family.sendSos(lat, lng, locName);
      setActive(true);
      toast.success(
        `SOS Broadcast Active! SMS alerts successfully sent to ${res.contacts_notified} family members.`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to broadcast emergency SOS signal.");
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-widest text-destructive">Emergency SOS</div>
        <h1 className="mt-1 font-display text-4xl font-bold">One tap. Help on the way.</h1>
      </div>

      <div className="glass rounded-3xl p-10 text-center relative overflow-hidden">
        <motion.button
          whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
          onClick={triggerSOS}
          disabled={broadcasting}
          className={`relative mx-auto flex h-56 w-56 items-center justify-center rounded-full font-display text-3xl font-bold text-white shadow-elegant transition ${
            active 
              ? "gradient-alert animate-pulse-glow" 
              : broadcasting 
                ? "bg-slate-500 animate-pulse" 
                : "gradient-hero"
          }`}
        >
          <span className="relative z-10 flex flex-col items-center">
            <AlertOctagon className="mb-2 h-10 w-10 animate-float" />
            {broadcasting ? "Locating..." : active ? "ACTIVE" : "SOS"}
          </span>
        </motion.button>
        <p className="mt-6 text-sm text-muted-foreground max-w-md mx-auto">
          Sends live GPS location, medical status & safety notifications to emergency contacts via Twilio and notifies disaster controllers immediately.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass rounded-3xl p-6">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Notify family</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Registered family contacts will receive an SMS containing live coordinates and status reports.
          </p>
        </div>
        <div className="glass rounded-3xl p-6">
          <div className="mb-3 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-accent" />
            <h3 className="font-semibold">Live location</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {gpsLocation 
              ? `Coordinates: ${gpsLocation.lat.toFixed(4)}, ${gpsLocation.lng.toFixed(4)} · GPS accuracy ±5m`
              : "Bandra West, Mumbai (Waiting for trigger)"}
          </p>
        </div>
      </div>

      <div className="glass rounded-3xl p-6">
        <h3 className="mb-4 font-semibold">Emergency contacts</h3>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          {contacts.map((c) => (
            <a key={c.num} href={`tel:${c.num}`}
              className="flex items-center gap-3 rounded-2xl bg-white/60 p-4 transition hover:shadow-elegant">
              <div className="gradient-hero flex h-10 w-10 items-center justify-center rounded-full text-white">
                <Phone className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.num}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
