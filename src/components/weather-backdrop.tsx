import { motion } from "framer-motion";

export function RainBackdrop({ density = 60 }: { density?: number }) {
  const drops = Array.from({ length: density });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {drops.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 3;
        const duration = 0.8 + Math.random() * 1.2;
        const opacity = 0.15 + Math.random() * 0.35;
        return (
          <span
            key={i}
            className="absolute top-0 h-8 w-px bg-gradient-to-b from-transparent via-primary-glow to-transparent"
            style={{
              left: `${left}%`,
              opacity,
              animation: `rain-fall ${duration}s linear ${delay}s infinite`,
            }}
          />
        );
      })}
    </div>
  );
}

export function CloudsBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        className="absolute top-10 left-10 h-40 w-72 rounded-full bg-white/40 blur-3xl"
        animate={{ x: [0, 30, 0], y: [0, -10, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-40 right-20 h-56 w-96 rounded-full bg-primary-glow/30 blur-3xl"
        animate={{ x: [0, -40, 0], y: [0, 20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 left-1/3 h-48 w-80 rounded-full bg-accent/25 blur-3xl"
        animate={{ x: [0, 50, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
