import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { MapPin, MessageCircle, Phone, Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { api, FamilyMember } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/family")({
  head: () => ({ meta: [{ title: "Family · Monsoon Copilot" }] }),
  component: Family,
});

function Family() {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("safe");
  const [submitting, setSubmitting] = useState(false);

  const loadFamily = async () => {
    try {
      const data = await api.family.get();
      setMembers(data);
    } catch (err) {
      toast.error("Failed to load family members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamily();
  }, []);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !location) {
      toast.error("Please enter a name and location.");
      return;
    }

    setSubmitting(true);
    try {
      await api.family.create(name, location, phone || undefined, status);
      toast.success("Family member profile created!");
      setName("");
      setLocation("");
      setPhone("");
      setStatus("safe");
      setIsOpen(false);
      loadFamily();
    } catch (err: any) {
      toast.error(err.message || "Failed to create family member.");
    } finally {
      setSubmitting(false);
    }
  };

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
          onClick={() => setIsOpen(true)}
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

      {/* Add Family Member Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass border border-white/60 bg-white/80 max-w-md rounded-3xl p-6 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add Family Member
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddMember} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="memberName" className="text-xs font-semibold text-muted-foreground">Name</Label>
              <Input
                id="memberName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Arjun (Brother)"
                className="glass border-white/60 h-10"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="memberLoc" className="text-xs font-semibold text-muted-foreground">Last Known Location</Label>
              <Input
                id="memberLoc"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Andheri West, Mumbai"
                className="glass border-white/60 h-10"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="memberPhone" className="text-xs font-semibold text-muted-foreground">Phone Number</Label>
              <Input
                id="memberPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +919876543210"
                className="glass border-white/60 h-10"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground">Current Safety Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="glass border-white/60 h-10">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="safe">Safe</SelectItem>
                  <SelectItem value="unsafe">Unsafe / Needs Assistance</SelectItem>
                  <SelectItem value="traveling">Traveling / Evacuating</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full gradient-hero border-0 text-white shadow-elegant h-11 rounded-xl font-medium mt-4"
            >
              {submitting ? "Adding Profile..." : "Add Family Profile"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
