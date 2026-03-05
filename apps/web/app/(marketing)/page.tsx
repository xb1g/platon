"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Zap, ArrowRight, Brain, Database, Network, Shield, BarChart3, Cpu } from "lucide-react";

/* ─── Floating annotation dot ─── */
function FloatingDot({
  x,
  y,
  label,
  delay = 0,
}: {
  x: string;
  y: string;
  label: string;
  delay?: number;
}) {
  return (
    <motion.div
      className="absolute hidden md:flex items-center gap-2"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 1 + delay, ease: "backOut" }}
    >
      {/* Corner brackets */}
      <div className="relative w-10 h-10">
        {/* dot */}
        <motion.div
          className="absolute inset-0 m-auto w-3 h-3 rounded-full bg-accent-violet"
          animate={{ boxShadow: ["0 0 0 0 rgba(139,92,246,0.4)", "0 0 12px 4px rgba(139,92,246,0)", "0 0 0 0 rgba(139,92,246,0.4)"] }}
          transition={{ duration: 3, repeat: Infinity, delay }}
        />
        {/* brackets */}
        <svg viewBox="0 0 40 40" className="absolute inset-0 w-full h-full text-accent-violet/50">
          <path d="M2 10 L2 2 L10 2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M30 2 L38 2 L38 10" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M38 30 L38 38 L30 38" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 38 L2 38 L2 30" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>
      <span className="text-[11px] font-mono tracking-wider text-accent-violet/80 whitespace-nowrap">
        {label}
      </span>
    </motion.div>
  );
}

/* ─── Feature card ─── */
function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: typeof Brain;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative glass rounded-2xl p-6 hover:border-accent-violet/30 transition-all duration-300"
    >
      <div className="w-10 h-10 rounded-xl bg-accent-violet-dim flex items-center justify-center mb-4 group-hover:bg-accent-violet/20 transition-colors">
        <Icon className="w-5 h-5 text-accent-violet" />
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed">{description}</p>
    </motion.div>
  );
}

/* ─── Stat ─── */
function Stat({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className="text-center"
    >
      <div className="text-3xl md:text-4xl font-bold text-text-primary mb-1">{value}</div>
      <div className="text-sm text-text-muted">{label}</div>
    </motion.div>
  );
}

/* ─── Company logos (placeholder) ─── */
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
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16 border-b border-white/5">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent-violet flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-lg font-semibold text-text-primary">Platon</span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-text-muted hover:text-text-primary transition-colors">
              Product
            </a>
            <a href="#stats" className="text-sm text-text-muted hover:text-text-primary transition-colors">
              Customers
            </a>
            <a href="#cta" className="text-sm text-text-muted hover:text-text-primary transition-colors">
              Company
            </a>
          </div>

          {/* CTA */}
          <Link
            href="/dashboard"
            className="text-sm font-medium text-text-primary hover:text-accent-violet transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </motion.nav>

      {/* ═══ HERO ═══ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-16">
        {/* Background arcs */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg
            viewBox="0 0 1200 1200"
            className="w-[min(100vw,1200px)] h-[min(100vh,1200px)] opacity-[0.12]"
            fill="none"
          >
            {[180, 300, 420, 540].map((r, i) => (
              <motion.circle
                key={r}
                cx="600"
                cy="600"
                r={r}
                stroke="url(#arcGrad)"
                strokeWidth="1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: i * 0.2, ease: "easeOut" }}
              />
            ))}
            <defs>
              <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>

          {/* Diagonal accent line */}
          <motion.div
            className="absolute w-px h-[140%] bg-gradient-to-b from-transparent via-accent-violet/20 to-transparent rotate-[25deg]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          />
        </div>

        {/* Floating dots */}
        <FloatingDot x="22%" y="18%" label="MEMORY STORED" delay={0} />
        <FloatingDot x="68%" y="14%" label="PATTERN DETECTED" delay={0.3} />
        <FloatingDot x="15%" y="50%" label="AGENT LEARNING" delay={0.6} />
        <FloatingDot x="78%" y="48%" label="CONTEXT RETRIEVED" delay={0.9} />

        {/* Hero content */}
        <div className="relative z-10 text-center max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-light text-text-primary leading-[1.1] tracking-tight mb-6">
              AI Agents for{" "}
              <span className="block">Memory Optimization</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="text-base md:text-lg text-text-muted max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Platon works hand in hand with your AI agents to turn memory
            into a real engine — not a pile of disconnected context windows.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-accent-violet text-white font-medium text-sm tracking-wide uppercase hover:bg-accent-violet/90 transition-all shadow-[0_0_24px_rgba(139,92,246,0.25)] hover:shadow-[0_0_32px_rgba(139,92,246,0.35)]"
            >
              Open Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-border-default text-text-secondary font-medium text-sm tracking-wide uppercase hover:border-border-hover hover:text-text-primary transition-all"
            >
              Learn More
            </a>
          </motion.div>
        </div>

        {/* Company logos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="relative z-10 mt-24 mb-8"
        >
          <p className="text-xs text-text-muted text-center uppercase tracking-widest mb-6">
            Trusted by leading teams
          </p>
          <div className="flex items-center justify-center gap-10 md:gap-14 flex-wrap">
            {companies.map((name) => (
              <span
                key={name}
                className="text-text-muted/40 text-base md:text-lg font-semibold tracking-wide hover:text-text-muted/60 transition-colors cursor-default"
              >
                {name}
              </span>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ═══ FEATURES ═══ */}
      <section id="features" className="relative px-6 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-light text-text-primary mb-4">
              Memory infrastructure that{" "}
              <span className="text-accent-violet">works</span>
            </h2>
            <p className="text-text-muted max-w-lg mx-auto">
              Everything your agents need to learn, remember, and improve — in one platform.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard
              icon={Brain}
              title="Reflection Engine"
              description="Automatically analyze every session to extract what went well, what failed, and reusable tactics for the future."
              index={0}
            />
            <FeatureCard
              icon={Network}
              title="Knowledge Graph"
              description="Store learnings in a rich graph structure that surfaces relevant context based on similarity and provenance."
              index={1}
            />
            <FeatureCard
              icon={Database}
              title="Vector + Graph Retrieval"
              description="Combine semantic search with graph traversal for retrieval that understands relationships, not just keywords."
              index={2}
            />
            <FeatureCard
              icon={Shield}
              title="Tenant Isolation"
              description="Every query, every learning, every session is scoped to your tenant. No cross-contamination, ever."
              index={3}
            />
            <FeatureCard
              icon={BarChart3}
              title="Confidence Scoring"
              description="Every learning carries a confidence score that increases as more sessions validate the same pattern."
              index={4}
            />
            <FeatureCard
              icon={Cpu}
              title="MCP Protocol"
              description="Drop-in integration via Model Context Protocol. Your agents dump sessions, we handle the rest."
              index={5}
            />
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section id="stats" className="relative px-6 py-24">
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
      <section className="relative px-6 py-24 md:py-32">
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
      <section id="cta" className="relative px-6 py-24 md:py-32">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-light text-text-primary mb-6 leading-tight">
              Give your agents the memory<br />they deserve
            </h2>
            <p className="text-text-muted max-w-md mx-auto mb-10">
              Start building agents that learn from every interaction.
              Free tier available — no credit card required.
            </p>
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-accent-violet text-white font-medium text-sm tracking-wide uppercase hover:bg-accent-violet/90 transition-all shadow-[0_0_24px_rgba(139,92,246,0.25)] hover:shadow-[0_0_40px_rgba(139,92,246,0.4)]"
            >
              Get Started
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-border-default/50 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-accent-violet flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-medium text-text-secondary">Platon</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Product
            </a>
            <a href="#" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Docs
            </a>
            <a href="#" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              GitHub
            </a>
            <a href="#" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Twitter
            </a>
          </div>
          <span className="text-xs text-text-muted">&copy; 2026 Platon. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
