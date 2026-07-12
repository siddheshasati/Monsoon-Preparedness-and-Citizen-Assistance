import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CloudRain, Shield, Map, MessageSquare, Bell, Users, Sparkles,
  ArrowRight, CheckCircle2, Zap, Radio, HeartHandshake,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { CloudsBackdrop, RainBackdrop } from "@/components/weather-backdrop";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Landing });

const features = [
  { icon: Sparkles, title: "Personalized AI Planner", desc: "Groq Llama drafts a preparedness plan tuned to your home, family & neighborhood." },
  { icon: CloudRain, title: "Hyperlocal Forecast", desc: "Rain probability, intensity and flood risk down to your street." },
  { icon: Shield, title: "Emergency SOS", desc: "One-tap SOS with live location sharing to family & authorities." },
  { icon: Map, title: "Live Hazard Map", desc: "Community-reported waterlogging, fallen trees & safer alternate routes." },
  { icon: MessageSquare, title: "Multilingual Assistant", desc: "Chat or speak in your language — 24×7 disaster guidance." },
  { icon: Users, title: "Family Safety", desc: "Know every loved one is safe with real-time status pins." },
];

function Landing() {
  return (
    <div className="min-h-screen gradient-sky">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <CloudsBackdrop />
        <RainBackdrop density={40} />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-2 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
          >
            <div className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium">
              <Zap className="h-3.5 w-3.5 text-primary" />
              Powered by Groq Llama · RAG · Voice AI
            </div>
            <h1 className="font-display text-5xl font-bold leading-tight md:text-6xl">
              Stay safe every <span className="gradient-text">monsoon</span>.
              <br /> Your AI copilot for the rain.
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Personalized preparedness plans, live flood risk, SOS, and community intelligence —
              built for families, NGOs and authorities.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gradient-hero border-0 text-white shadow-elegant hover:opacity-90">
                <Link to="/dashboard">Open Dashboard <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="glass border-white/60">
                <Link to="/assistant">Talk to AI Assistant</Link>
              </Button>
            </div>
            <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
              {[
                { k: "12K+", v: "Families protected" },
                { k: "48", v: "Cities covered" },
                { k: "24×7", v: "AI response" },
              ].map((s) => (
                <div key={s.v} className="glass rounded-2xl p-3">
                  <div className="font-display text-2xl font-bold gradient-text">{s.k}</div>
                  <div className="text-xs text-muted-foreground">{s.v}</div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.1 }}
            className="relative"
          >
            <div className="glass rounded-3xl p-6 shadow-elegant">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium text-muted-foreground">LIVE WEATHER</div>
                  <div className="font-display text-4xl font-bold">27°C · Heavy Rain</div>
                </div>
                <div className="animate-float text-6xl">🌧️</div>
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                {[
                  { label: "Rainfall", value: "42mm", color: "text-primary" },
                  { label: "Flood risk", value: "68%", color: "text-destructive" },
                  { label: "Safety", value: "82", color: "text-accent" },
                ].map((m) => (
                  <div key={m.label} className="rounded-2xl bg-white/60 p-3">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</div>
                    <div className={`font-display text-2xl font-bold ${m.color}`}>{m.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <div className="text-xs font-semibold text-primary">AI Recommendation</div>
                    <p className="mt-1 text-sm">
                      Heavy rainfall in the next 3 hours. Avoid low-lying areas and check your safety dashboard for real-time local updates.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <Radio className="h-3.5 w-3.5 text-accent animate-pulse" />
                Streaming from OpenWeather · IMD · Community reports
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 glass hidden rounded-2xl p-4 shadow-elegant md:block">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/20">
                  <CheckCircle2 className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Family status</div>
                  <div className="text-sm font-semibold">All 3 members safe</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-2xl text-center">
          <div className="text-xs font-semibold uppercase tracking-widest text-primary">Everything you need</div>
          <h2 className="mt-3 font-display text-4xl font-bold">One calm dashboard for every rainstorm</h2>
          <p className="mt-4 text-muted-foreground">
            From personalized planning to live rescue coordination — Monsoon Copilot brings it all together.
          </p>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ duration: 0.4, delay: i * 0.05 }}
              className="glass group rounded-3xl p-6 transition hover:shadow-elegant"
            >
              <div className="gradient-hero mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-glow transition group-hover:scale-110">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="glass rounded-3xl p-10">
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { icon: Users, title: "Citizens", desc: "Personal plans, SOS & family tracking." },
              { icon: HeartHandshake, title: "Volunteers", desc: "Accept tasks, log rescues, coordinate aid." },
              { icon: Shield, title: "NGOs", desc: "Relief camps, resources, situation summaries." },
              { icon: Bell, title: "Government", desc: "Analytics, hazard heatmaps, broadcast alerts." },
            ].map((r) => (
              <div key={r.title}>
                <r.icon className="h-8 w-8 text-primary" />
                <div className="mt-3 font-semibold">{r.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative mx-auto max-w-7xl px-6 pb-24">
        <div className="gradient-hero relative overflow-hidden rounded-3xl p-12 text-center text-white shadow-elegant">
          <RainBackdrop density={30} />
          <h2 className="relative font-display text-4xl font-bold">Ready before the next rain?</h2>
          <p className="relative mt-3 text-white/80">Get your AI-personalized preparedness plan in under 60 seconds.</p>
          <Button asChild size="lg" className="relative mt-6 bg-white text-primary hover:bg-white/90">
            <Link to="/dashboard">Open Monsoon Copilot <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © 2026 AI Monsoon Copilot · Built for resilient communities.
      </footer>
    </div>
  );
}
