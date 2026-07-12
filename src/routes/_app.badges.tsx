import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";
import { api, ChecklistItem, HazardReport } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/badges")({
  head: () => ({ meta: [{ title: "Badges · Monsoon Copilot" }] }),
  component: Badges,
});

function Badges() {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [hazards, setHazards] = useState<HazardReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBadgesData() {
      try {
        const cl = await api.checklist.get();
        setChecklist(cl);
      } catch (err) {
        console.error("Could not fetch checklist");
      }
      try {
        const hz = await api.hazards.get();
        setHazards(hz);
      } catch (err) {
        console.error("Could not fetch hazards");
      }
      setLoading(false);
    }
    loadBadgesData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-sm font-semibold text-muted-foreground">Calculating badges and levels...</p>
      </div>
    );
  }

  const doneCount = checklist.filter(c => c.done).length;
  const checklistCompleted = checklist.length > 0 && doneCount === checklist.length;
  const hasStartedChecklist = doneCount > 0;
  
  // Mock username for tracking user hazard reports
  const userString = typeof window !== "undefined" ? sessionStorage.getItem("user") : null;
  const username = userString ? JSON.parse(userString).name : "";
  const reportedCount = hazards.filter(h => h.status === "active").length; // count active alerts

  const badgesList = [
    {
      id: "ready",
      emoji: "🎒",
      name: "Ready Citizen",
      desc: "Complete at least one emergency checklist item.",
      unlocked: hasStartedChecklist
    },
    {
      id: "responder",
      emoji: "🛡️",
      name: "Community Sentinel",
      desc: "Contribute to community safety by monitoring active alerts.",
      unlocked: reportedCount > 0
    },
    {
      id: "master",
      emoji: "🏅",
      name: "Monsoon Master",
      desc: "Complete 100% of your personalized emergency safety checklist.",
      unlocked: checklistCompleted
    },
    {
      id: "evac",
      emoji: "📍",
      name: "Navigator",
      desc: "Check nearby official municipal shelter locations.",
      unlocked: true // Checked automatically when viewing dashboard
    },
    {
      id: "vision",
      emoji: "📸",
      name: "Spotter",
      desc: "Upload a photo report verifying street hazards (AI-reviewed).",
      unlocked: false // Future integration
    },
    {
      id: "hero",
      emoji: "🦸",
      name: "Resilience Hero",
      desc: "Acquire all basic badges for ultimate disaster preparedness.",
      unlocked: hasStartedChecklist && checklistCompleted
    }
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 lg:p-8">
      <div className="flex items-center gap-3">
        <div className="gradient-safety flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-elegant">
          <Trophy className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-4xl font-bold">Safety badges</h1>
          <p className="text-sm text-muted-foreground">Earn as you prepare, respond and help your community.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {badgesList.map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`rounded-3xl p-6 text-center transition flex flex-col justify-between ${
              b.unlocked ? "glass shadow-elegant" : "border border-dashed border-border/60 bg-white/30 opacity-60"
            }`}
          >
            <div>
              <div className="text-6xl mb-2">{b.emoji}</div>
              <div className="font-semibold text-lg">{b.name}</div>
              <p className="text-xs text-muted-foreground mt-2 max-w-[200px] mx-auto">{b.desc}</p>
            </div>
            <div className="mt-4 text-xs font-semibold text-primary">
              {b.unlocked ? "Unlocked ✓" : "Locked 🔒"}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
