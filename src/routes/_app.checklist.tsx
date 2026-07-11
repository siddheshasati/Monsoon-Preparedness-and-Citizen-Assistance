import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Sparkles, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { api, ChecklistItem } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/checklist")({
  head: () => ({ meta: [{ title: "Preparedness · Monsoon Copilot" }] }),
  component: Checklist,
});

function Checklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for AI regeneration
  const [location, setLocation] = useState("Mumbai");
  const [householdSize, setHouseholdSize] = useState(3);
  const [hasElderly, setHasElderly] = useState(false);
  const [hasChildren, setHasChildren] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchItems = async () => {
    try {
      const data = await api.checklist.get();
      setItems(data);
    } catch (err: any) {
      toast.error("Could not fetch checklist items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleToggle = async (itemId: number) => {
    try {
      // Optimistic update
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, done: !item.done } : item
        )
      );
      await api.checklist.toggle(itemId);
      toast.success("Checklist progress saved.");
    } catch (err) {
      toast.error("Failed to update status on server.");
      // Rollback
      fetchItems();
    }
  };

  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const generated = await api.checklist.generate({
        location,
        household_size: Number(householdSize),
        has_elderly: hasElderly,
        has_children: hasChildren,
        has_pets: hasPets,
      });
      setItems(generated);
      setIsModalOpen(false);
      toast.success("AI Checklist successfully customized for your household!");
    } catch (err: any) {
      toast.error(err.message || "Failed to generate checklist with Groq.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-sm font-semibold text-muted-foreground">Syncing preparedness checklist...</p>
      </div>
    );
  }

  const done = items.filter((i) => i.done).length;
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Preparedness</div>
          <h1 className="mt-1 font-display text-4xl font-bold">Your monsoon checklist</h1>
          <p className="text-sm text-muted-foreground">AI-generated based on your household, location & forecast</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="gradient-hero border-0 text-white shadow-elegant"
        >
          <Sparkles className="mr-2 h-4 w-4" /> Customize with AI
        </Button>
      </div>

      <div className="glass rounded-3xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-muted-foreground">Overall readiness</div>
            <div className="font-display text-4xl font-bold gradient-text">{pct}%</div>
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            {done} of {items.length} tasks completed
          </div>
        </div>
        <Progress value={pct} className="mt-4 h-2" />
      </div>

      <div className="grid gap-3">
        {items.map((item, i) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
            onClick={() => handleToggle(item.id)}
            className="glass flex items-center gap-4 rounded-2xl p-4 text-left transition hover:shadow-elegant"
          >
            {item.done
              ? <CheckCircle2 className="h-6 w-6 shrink-0 text-accent" />
              : <Circle className="h-6 w-6 shrink-0 text-muted-foreground" />}
            <div className="flex-1">
              <div className={`text-sm font-medium ${item.done ? "line-through text-muted-foreground" : ""}`}>
                {item.item}
              </div>
              <div className="text-xs text-muted-foreground">{item.category}</div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* AI Customize Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="glass border border-white/60 bg-white/80 max-w-md rounded-3xl p-6 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Personalize Action Plan
            </DialogTitle>
            <DialogDescription className="text-xs">
              Monsoon Copilot calls Groq Llama 3.3 to construct an emergency action plan tailored to your household characteristics.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegenerate} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label htmlFor="location" className="text-xs font-semibold text-muted-foreground">Neighborhood Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Bandra West, Mumbai"
                className="glass border-white/60 h-10"
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="size" className="text-xs font-semibold text-muted-foreground">Household Size (people)</Label>
              <Input
                id="size"
                type="number"
                min={1}
                max={20}
                value={householdSize}
                onChange={(e) => setHouseholdSize(Number(e.target.value))}
                className="glass border-white/60 h-10"
                required
              />
            </div>

            <div className="grid grid-cols-1 gap-2 pt-2">
              <div className="flex items-center space-x-2 rounded-xl bg-white/40 p-3 border border-white/40">
                <Checkbox
                  id="elderly"
                  checked={hasElderly}
                  onCheckedChange={(checked) => setHasElderly(!!checked)}
                />
                <Label htmlFor="elderly" className="text-xs font-medium cursor-pointer">
                  Includes Elderly / Vulnerable Members
                </Label>
              </div>

              <div className="flex items-center space-x-2 rounded-xl bg-white/40 p-3 border border-white/40">
                <Checkbox
                  id="children"
                  checked={hasChildren}
                  onCheckedChange={(checked) => setHasChildren(!!checked)}
                />
                <Label htmlFor="children" className="text-xs font-medium cursor-pointer">
                  Includes Young Children / Infants
                </Label>
              </div>

              <div className="flex items-center space-x-2 rounded-xl bg-white/40 p-3 border border-white/40">
                <Checkbox
                  id="pets"
                  checked={hasPets}
                  onCheckedChange={(checked) => setHasPets(!!checked)}
                />
                <Label htmlFor="pets" className="text-xs font-medium cursor-pointer">
                  Includes Domestic Pets
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={generating}
              className="w-full gradient-hero border-0 text-white shadow-elegant h-11 rounded-xl font-medium mt-4"
            >
              {generating ? "Generating Plan..." : "Regenerate AI Plan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
