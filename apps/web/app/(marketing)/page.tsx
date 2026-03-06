"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, ArrowRight, ChevronRight, Sparkles } from "lucide-react";

/* ─── Floating geometric block ─── */
function FloatingBlock({
  w,
  h,
  x,
  y,
  color,
  delay,
  duration,
}: {
  w: number;
  h: number;
  x: string;
  y: string;
  color: string;
  delay: number;
  duration: number;
}) {
  return (
    <motion.div
      className="absolute rounded-xl"
      style={{
        width: w,
        height: h,
        left: x,
        top: y,
        backgroundColor: color,
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      animate={{
        y: [0, -10, 0, 8, 0],
      }}
      transition={{
        y: { duration, repeat: Infinity, ease: "easeInOut", delay },
        opacity: { duration: 0.6, delay: delay * 0.3 },
        scale: { duration: 0.6, delay: delay * 0.3 },
      }}
    />
  );
}

/* ─── Arrow link (Mistral-style) ─── */
function ArrowLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 text-text-primary hover:text-accent-violet transition-colors"
    >
      <span className="text-sm font-medium tracking-wide">{children}</span>
      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      <span className="block h-px bg-current mt-0.5 w-0 group-hover:w-full transition-all duration-300 absolute bottom-0 left-0" />
    </Link>
  );
}

/* ─── Feature item ─── */
function FeatureItem({
  title,
  description,
  index,
}: {
  title: string;
  description: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.12 }}
    >
      <div className="border-t border-border-default/60 pt-8 pb-10">
        <h3 className="text-xl md:text-2xl font-semibold text-text-primary mb-4 leading-snug">
          {title}
        </h3>
        <div className="flex items-start gap-3">
          <ArrowRight className="w-5 h-5 text-accent-violet mt-0.5 shrink-0" />
          <p className="text-sm text-text-muted leading-relaxed max-w-md">
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Stat ─── */
function Stat({
  value,
  label,
  delay,
}: {
  value: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className="text-3xl md:text-4xl font-bold text-text-primary mb-1">
        {value}
      </div>
      <div className="text-sm text-text-muted">{label}</div>
    </motion.div>
  );
}

const companies = ["Ordinal", "Nexus", "Mintlify", "Luminai", "Greptile"];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* ═══ NAVBAR ═══ */}
      <motion.nav
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10"
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-white/10 backdrop-blur flex items-center justify-center border border-white/10">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white">Platon</span>
          </Link>

          {/* Center nav */}
          <div className="hidden md:flex items-center gap-8">
            {["Products", "Solutions", "Research", "Company"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                {item}
              </a>
            ))}
          </div>

          {/* Right CTA */}
          <div className="flex items-center gap-3">
            <a
              href="#cta"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/20 text-sm text-white/80 hover:text-white hover:border-white/40 transition-all"
            >
              Contact Sales
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-white/20 text-sm text-white/80 hover:text-white hover:border-white/40 transition-all"
            >
              Open Dashboard
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex flex-col justify-end px-6 md:px-10 pb-16">
        {/* Atmospheric background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Base gradient */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 120% 80% at 50% 100%, #2d1854 0%, #1a0a2e 40%, #09090b 80%)",
            }}
          />

          {/* Warm glow at bottom */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 100% 50% at 40% 95%, rgba(139,92,246,0.15) 0%, transparent 70%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 30% at 30% 100%, rgba(217,119,87,0.12) 0%, transparent 70%)",
            }}
          />

          {/* Mountain layers */}
          <div
            className="absolute bottom-0 left-0 right-0 h-[70%]"
            style={{
              clipPath:
                "polygon(0% 100%, 0% 65%, 5% 55%, 12% 60%, 18% 45%, 25% 52%, 32% 38%, 38% 42%, 42% 30%, 48% 35%, 52% 25%, 58% 32%, 62% 22%, 68% 28%, 72% 18%, 78% 25%, 82% 20%, 88% 30%, 92% 22%, 96% 28%, 100% 20%, 100% 100%)",
              background:
                "linear-gradient(180deg, rgba(80,40,120,0.5) 0%, rgba(60,25,90,0.6) 50%, rgba(45,20,70,0.7) 100%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[55%]"
            style={{
              clipPath:
                "polygon(0% 100%, 0% 70%, 4% 58%, 10% 65%, 16% 50%, 22% 58%, 28% 42%, 35% 50%, 40% 38%, 45% 45%, 52% 35%, 58% 42%, 65% 30%, 70% 38%, 76% 28%, 82% 35%, 88% 25%, 92% 32%, 97% 25%, 100% 30%, 100% 100%)",
              background:
                "linear-gradient(180deg, rgba(60,25,90,0.6) 0%, rgba(40,15,65,0.8) 50%, rgba(30,12,55,0.9) 100%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 right-0 h-[40%]"
            style={{
              clipPath:
                "polygon(0% 100%, 0% 60%, 8% 48%, 15% 55%, 22% 40%, 30% 50%, 38% 35%, 45% 45%, 52% 30%, 60% 42%, 68% 28%, 75% 38%, 82% 25%, 90% 35%, 95% 28%, 100% 35%, 100% 100%)",
              background:
                "linear-gradient(180deg, rgba(40,15,65,0.8) 0%, rgba(25,10,45,0.95) 60%, #09090b 100%)",
            }}
          />

          {/* Diagonal light beam */}
          <motion.div
            className="absolute w-[200%] h-px top-0 left-[-50%] origin-center"
            style={{
              background:
                "linear-gradient(90deg, transparent 20%, rgba(139,92,246,0.08) 45%, rgba(139,92,246,0.15) 50%, rgba(139,92,246,0.08) 55%, transparent 80%)",
              transform: "rotate(25deg) translateY(35vh)",
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.5, delay: 0.5 }}
          />
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          {/* Announcement pill */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-12"
          >
            <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-accent-violet" />
              <span className="text-sm text-white/70">
                New: Agent Memory Protocol is live.
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="text-5xl sm:text-6xl md:text-8xl font-light text-white leading-[1.05] tracking-tight mb-8 max-w-4xl"
          >
            AI Agents for
            <br />
            Memory Optimization.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="text-base md:text-lg text-white/50 max-w-xl mb-12 leading-relaxed"
          >
            Platon works hand in hand with your AI agents to turn memory into a
            real engine — not a pile of disconnected context windows and
            experiments.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1 }}
            className="flex items-center gap-8 mb-4"
          >
            <Link
              href="/dashboard"
              className="group inline-flex flex-col"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-white tracking-wide">
                Get started
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="h-px w-full bg-white/30 mt-2 group-hover:bg-accent-violet transition-colors" />
            </Link>
            <Link
              href="/dashboard"
              className="group inline-flex flex-col"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-white tracking-wide">
                Open dashboard
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="h-px w-full bg-white/30 mt-2 group-hover:bg-accent-violet transition-colors" />
            </Link>
          </motion.div>
        </div>

        {/* Company logos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="relative z-10 max-w-7xl mx-auto w-full mt-20 pt-8 border-t border-white/10"
        >
          <div className="flex items-center gap-10 md:gap-14 flex-wrap">
            {companies.map((name) => (
              <span
                key={name}
                className="text-white/20 text-sm md:text-base font-semibold tracking-wide hover:text-white/35 transition-colors cursor-default"
              >
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═══ FEATURES SPLIT ═══ */}
      <section
        id="products"
        className="relative px-6 md:px-10 py-24 md:py-32"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left — geometric art + headline */}
          <div className="relative min-h-[500px] lg:min-h-[700px]">
            {/* Floating blocks */}
            <FloatingBlock w={100} h={130} x="10%" y="5%" color="rgba(139,92,246,0.12)" delay={0} duration={6} />
            <FloatingBlock w={70} h={90} x="45%" y="0%" color="rgba(139,92,246,0.08)" delay={0.5} duration={7} />
            <FloatingBlock w={55} h={70} x="70%" y="12%" color="rgba(139,92,246,0.1)" delay={1} duration={5.5} />
            <FloatingBlock w={80} h={100} x="5%" y="30%" color="rgba(139,92,246,0.06)" delay={1.5} duration={8} />
            <FloatingBlock w={60} h={80} x="55%" y="25%" color="rgba(139,92,246,0.09)" delay={0.8} duration={6.5} />
            <FloatingBlock w={90} h={60} x="25%" y="50%" color="rgba(139,92,246,0.07)" delay={1.2} duration={7.5} />
            <FloatingBlock w={50} h={65} x="65%" y="45%" color="rgba(139,92,246,0.11)" delay={0.3} duration={5} />
            <FloatingBlock w={110} h={80} x="15%" y="65%" color="rgba(139,92,246,0.05)" delay={2} duration={9} />
            <FloatingBlock w={40} h={55} x="50%" y="60%" color="rgba(139,92,246,0.08)" delay={1.8} duration={6} />

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="absolute bottom-0 left-0 right-0"
            >
              <h2 className="text-3xl md:text-5xl font-light text-text-primary leading-tight">
                Your AI memory
                <br />
                belongs in
                <br />
                your agents.{" "}
                <span className="inline-flex items-center align-middle ml-1">
                  <span className="w-8 h-8 rounded-lg bg-accent-violet inline-flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </span>
                </span>
              </h2>
            </motion.div>
          </div>

          {/* Right — feature list */}
          <div className="flex flex-col justify-center">
            <FeatureItem
              title="Reflection engine, built for depth."
              description="Automatically analyze every session to extract what went well, what failed, and reusable tactics. Every learning is scored for confidence and stored in a knowledge graph."
              index={0}
            />
            <FeatureItem
              title="Enterprise agents with persistent memory."
              description="Deploy agents that execute, adapt, and deliver real results — with powerful orchestration, memory retrieval, and safety built in from day one."
              index={1}
            />
            <FeatureItem
              title="Self-contained private deployments."
              description="Build privately anywhere — on-premises, cloud, edge, devices, and more — while retaining full control of your data and complete tenant isolation."
              index={2}
            />
            <FeatureItem
              title="Deeply integrated retrieval and context."
              description="Combine vector similarity search with graph traversal for retrieval that understands relationships, provenance, and patterns — not just keywords."
              index={3}
            />
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section id="solutions" className="relative px-6 md:px-10 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-10 md:p-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <Stat value="50K+" label="Sessions processed" delay={0} />
              <Stat value="12K" label="Learnings extracted" delay={0.1} />
              <Stat value="340ms" label="Avg retrieval time" delay={0.2} />
              <Stat value="99.9%" label="Uptime" delay={0.3} />
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section
        id="research"
        className="relative px-6 md:px-10 py-24 md:py-32"
      >
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-4">
              Three steps to smarter agents
            </h2>
          </motion.div>

          <div className="space-y-0">
            {[
              {
                step: "01",
                title: "Dump sessions",
                desc: "Your agents send session data via MCP or REST API after each task — tools used, events, outcomes, errors.",
              },
              {
                step: "02",
                title: "Reflect & learn",
                desc: "Our reflection engine analyzes each session, extracts learnings, identifies patterns, and scores confidence.",
              },
              {
                step: "03",
                title: "Retrieve & improve",
                desc: "Before the next task, agents query relevant memories — failures to avoid, tactics to reuse, context to apply.",
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="flex gap-6 md:gap-8 py-8 border-b border-border-default/50 last:border-0 group"
              >
                <span className="text-3xl md:text-4xl font-light text-accent-violet/30 group-hover:text-accent-violet/60 transition-colors shrink-0 w-16">
                  {item.step}
                </span>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold text-text-primary mb-2 group-hover:text-accent-violet transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-text-muted leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section id="cta" className="relative px-6 md:px-10 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-light text-text-primary mb-6 leading-tight">
              Give your agents the memory
              <br />
              they deserve
            </h2>
            <p className="text-text-muted max-w-md mx-auto mb-10">
              Start building agents that learn from every interaction. Free tier
              available — no credit card required.
            </p>
            <Link
              href="/dashboard"
              className="group inline-flex flex-col items-center"
            >
              <span className="flex items-center gap-2 text-base font-medium text-text-primary tracking-wide">
                Get Started
                <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="h-px w-full bg-border-default mt-2 group-hover:bg-accent-violet transition-colors" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border-default/50 px-6 md:px-10 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-accent-violet flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-text-secondary">
              Platon
            </span>
          </div>
          <div className="flex items-center gap-6">
            {["Product", "Docs", "GitHub", "Twitter"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
          <span className="text-xs text-text-muted">
            &copy; 2026 Platon. All rights reserved.
          </span>
        </div>
      </footer>
    </div>
  );
}
