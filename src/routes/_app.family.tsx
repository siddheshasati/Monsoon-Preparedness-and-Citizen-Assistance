import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { MapPin, MessageCircle, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api, FamilyMember } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/family")({
  head: () => ({ meta: [{ title: "Family · Monsoon Copilot" }] }),
  component: Family,
});

function Family() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFamily() {
      try {
        const data = await api.family.get();
        setMembers(data);
      } catch (err) {
        toast.error("Failed to load family members.");
      } finally {
        setLoading(false);
      }
    }
    loadFamily();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-sm font-semibold text-muted-foreground">Hydrating family profiles...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Family safety</div>
          <h1 className="mt-1 font-display text-4xl font-bold">Everyone's location, one glance</h1>
        </div>
        <Button 
          onClick={() => toast.info("Add Member feature is a placeholder. Add details directly into database family_members.")}
          className="gradient-hero border-0 text-white shadow-elegant"
        >
          <Plus className="mr-2 h-4 w-4" /> Add member
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {members.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
            className="glass rounded-3xl p-6"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="gradient-hero flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white">
                  {m.name[0]}
                </div>
                <div>
                  <div className="text-lg font-semibold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">Updated {new Date(m.updated_at).toLocaleTimeString()}</div>
                </div>
              </div>
              <Badge className={m.status === "safe" ? "bg-accent text-accent-foreground" : "bg-warning text-warning-foreground"}>
                {m.status}
              </Badge>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/60 p-3 text-sm">
              <MapPin className="h-4 w-4 text-primary" />
              {m.location}
            </div>
            <div className="mt-3 flex gap-2">
              <a href={`tel:${m.phone || ""}`} className="flex-1">
                <Button variant="outline" size="sm" className="glass border-white/60 w-full">
                  <Phone className="mr-2 h-3.5 w-3.5" /> Call
                </Button>
              </a>
              <Button 
                variant="outline" 
                size="sm" 
                className="glass border-white/60 flex-1"
                onClick={() => toast.info(`SMS message alert via Twilio logged to: ${m.phone}`)}
              >
                <MessageCircle className="mr-2 h-3.5 w-3.5" /> Message
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
