"use client";

import { motion } from "framer-motion";
import { Button } from "../ui/button";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* floating flags backdrop */}
      <FloatingFlags />

      <motion.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative mx-auto max-w-5xl px-5 pt-20 pb-16 text-center sm:pt-28"
      >
        <motion.span
          variants={rise}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-lime" />
          </span>
          Canada · Mexico · USA — Summer 2026
        </motion.span>

        <motion.h1
          variants={rise}
          className="mt-7 font-display text-5xl font-extrabold leading-[0.95] tracking-tight sm:text-7xl md:text-8xl"
        >
          Call the
          <br />
          <span className="text-gradient">whole tournament.</span>
        </motion.h1>

        <motion.p
          variants={rise}
          className="mx-auto mt-6 max-w-xl text-lg text-muted sm:text-xl"
        >
          Pick your champion, fill the bracket, and see how you stack up against the
          world. Share your call. Battle your friends. No sign-up required.
        </motion.p>

        <motion.div
          variants={rise}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button href="/predict" size="lg" className="w-full sm:w-auto">
            Make your prediction →
          </Button>
          <Button href="/compare" variant="outline" size="lg" className="w-full sm:w-auto">
            See the crowd
          </Button>
        </motion.div>

        <motion.p variants={rise} className="mt-5 text-xs text-faint">
          Takes 30 seconds. Free forever.
        </motion.p>
      </motion.div>
    </section>
  );
}

const FLAGS = ["🇧🇷", "🇦🇷", "🇫🇷", "🏴󠁧󠁢󠁥󠁮󠁧󠁿", "🇪🇸", "🇩🇪", "🇵🇹", "🇳🇱", "🇲🇽", "🇺🇸", "🇯🇵", "🇲🇦", "🇭🇷", "🇧🇪", "🇺🇾"];

function FloatingFlags() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-0 overflow-hidden opacity-70">
      {FLAGS.map((f, i) => {
        const left = (i * 67) % 100;
        const top = (i * 41) % 100;
        const delay = (i % 6) * 0.6;
        const size = 28 + ((i * 13) % 36);
        return (
          <motion.span
            key={i}
            className="absolute blur-[0.5px]"
            style={{ left: `${left}%`, top: `${top}%`, fontSize: size }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.15, 0.5, 0.15], y: [0, -18, 0] }}
            transition={{ duration: 7 + (i % 5), repeat: Infinity, delay, ease: "easeInOut" }}
          >
            {f}
          </motion.span>
        );
      })}
    </div>
  );
}
