"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "orizino_splash_seen_v1";

/* ─── Letter-by-letter tagline ─────────────────────────────────── */
function TaglineChars({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span aria-label={text}>
      {text.split("").map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + i * 0.04, duration: 0.4, ease: "easeOut" }}
          className="inline-block"
          style={{ letterSpacing: char === " " ? "0.2em" : undefined }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </span>
  );
}

/* ─── Main component ────────────────────────────────────────────── */
interface Props {
  onComplete: () => void;
}

export function CinematicSplash({ onComplete }: Props) {
  const [phase, setPhase] = useState<"in" | "hold" | "out">("in");

  useEffect(() => {
    /* Phase timeline:
       0.0s  — logo scale-in begins
       1.6s  — switch to "hold" (logo settled, tagline + prompt visible)
       3.8s  — switch to "out" (curtain drops)
       4.5s  — call onComplete
    */
    const t1 = setTimeout(() => setPhase("hold"), 1600);
    const t2 = setTimeout(() => setPhase("out"), 3800);
    const t3 = setTimeout(onComplete, 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  /* Tap/click skips to exit */
  const skip = () => {
    if (phase === "out") return;
    setPhase("out");
    setTimeout(onComplete, 700);
  };

  return (
    <AnimatePresence>
      {phase !== "out" ? (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#080808] select-none cursor-pointer overflow-hidden"
          onClick={skip}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeIn" }}
        >
          {/* Ambient red glow — pulses behind the logo */}
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsl(355,99%,38%,0.18), transparent 65%)",
              top: "50%", left: "50%", x: "-50%", y: "-50%",
            }}
            animate={{ scale: [0.8, 1.3, 1.1], opacity: [0, 0.8, 0.5] }}
            transition={{ duration: 1.8, ease: "easeOut" }}
          />

          {/* Horizontal scan line (cinematic) */}
          <motion.div
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg,transparent,hsl(355,99%,38%,0.5),transparent)" }}
            initial={{ y: "-40vh", opacity: 0 }}
            animate={{ y: "40vh", opacity: [0, 0.8, 0] }}
            transition={{ delay: 0.3, duration: 1.2, ease: "easeInOut" }}
          />

          {/* Logo */}
          <motion.div
            className="relative z-10 flex flex-col items-center gap-8"
            initial={{ scale: 0.55, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.img
              src="/orizino-logo.svg"
              alt="Orizino"
              className="w-48 sm:w-64 h-auto drop-shadow-[0_0_40px_hsl(355,99%,38%,0.35)]"
            />

            {/* Tagline — fades in after logo settles */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.6 }}
            >
              <p className="text-[11px] uppercase tracking-[0.5em] text-white/35 font-light">
                <TaglineChars text="Premium Fashion" delay={0.95} />
              </p>
            </motion.div>
          </motion.div>

          {/* Red hairline — draws across bottom of logo */}
          <motion.div
            className="absolute pointer-events-none"
            style={{ top: "calc(50% + 80px)", left: "50%", x: "-50%" }}
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: "120px", opacity: 0.5 }}
            transition={{ delay: 1.0, duration: 0.7, ease: "easeOut" }}
          >
            <div className="h-px bg-[hsl(355,99%,38%)]" />
          </motion.div>

          {/* "Tap to enter" — appears in hold phase */}
          <AnimatePresence>
            {phase === "hold" && (
              <motion.p
                key="enter"
                className="absolute bottom-14 text-[10px] uppercase tracking-[0.4em] text-white/20 pointer-events-none"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: [0, 0.7, 0.3, 0.7], y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
              >
                Tap anywhere to enter
              </motion.p>
            )}
          </AnimatePresence>

          {/* Corner film-frame tick marks */}
          {[
            "top-6 left-6 border-t border-l",
            "top-6 right-6 border-t border-r",
            "bottom-6 left-6 border-b border-l",
            "bottom-6 right-6 border-b border-r",
          ].map((cls, i) => (
            <motion.div
              key={i}
              className={`absolute w-6 h-6 border-white/15 pointer-events-none ${cls}`}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.08, duration: 0.4 }}
            />
          ))}
        </motion.div>
      ) : (
        /* Exit: vertical wipe curtain drops down (like a film slate) */
        <motion.div
          key="curtain"
          className="fixed inset-0 z-[99999] bg-[#080808] pointer-events-none"
          initial={{ scaleY: 0, originY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.65, ease: [0.76, 0, 0.24, 1] }}
        />
      )}
    </AnimatePresence>
  );
}

/* ─── Wrapper: handles localStorage + SSR ──────────────────────── */
export function FirstVisitSplash() {
  const [show, setShow] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setShow(true);
      }
    } catch {
      /* Private browsing or storage blocked — skip */
    }
  }, []);

  const handleComplete = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
    setDone(true);
  };

  if (!show || done) return null;
  return <CinematicSplash onComplete={handleComplete} />;
}
