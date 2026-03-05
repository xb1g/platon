"use client";

import { MetricCard } from "@/components/metric-card";
import { SessionChart } from "@/components/chart-area";
import { ActivityFeed } from "@/components/activity-feed";
import { motion } from "framer-motion";
import { ScrollText, TrendingUp, Bot, Lightbulb, ArrowRight } from "lucide-react";
import Link from "next/link";
import { mockSessions, mockLearnings, agentStats } from "@/lib/mock-data";

const successCount = mockSessions.filter((s) => s.outcome.status === "success").length;
const successRate = Math.round((successCount / mockSessions.length) * 100);
const uniqueAgents = new Set(mockSessions.map((s) => s.agentId)).size;

export default function Dashboard() {
  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted mt-1">
          Overview of your agent memory infrastructure
        </p>
      </motion.div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Sessions"
          value={mockSessions.length.toString()}
          change="+12%"
          icon={ScrollText}
          color="violet"
          index={0}
        />
        <MetricCard
          title="Success Rate"
          value={`${successRate}%`}
          change="+3%"
          icon={TrendingUp}
          color="emerald"
          index={1}
        />
        <MetricCard
          title="Active Agents"
          value={uniqueAgents.toString()}
          change="+2"
          icon={Bot}
          color="sky"
          index={2}
        />
        <MetricCard
          title="Learnings"
          value={mockLearnings.length.toString()}
          change="+5"
          icon={Lightbulb}
          color="amber"
          index={3}
        />
      </div>

      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        <div className="lg:col-span-3">
          <SessionChart />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed />
        </div>
      </div>

      {/* Agent Rankings + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Agent Rankings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-3 glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Top Agents by Sessions
          </h3>
          <div className="space-y-3">
            {agentStats
              .sort((a, b) => b.sessions - a.sessions)
              .map((agent, i) => (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-xs text-text-muted w-5 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-text-secondary">
                        {agent.name}
                      </span>
                      <span className="text-xs text-text-muted">
                        {agent.sessions} sessions · {agent.successRate}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-accent-violet to-accent-sky"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${(agent.sessions / Math.max(...agentStats.map((a) => a.sessions))) * 100}%`,
                        }}
                        transition={{ duration: 0.8, delay: 0.5 + i * 0.05 }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass rounded-2xl p-5"
        >
          <h3 className="text-sm font-semibold text-text-primary mb-4">
            Quick Actions
          </h3>
          <div className="space-y-2">
            <Link
              href="/sessions"
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors group"
            >
              <div className="flex items-center gap-3">
                <ScrollText className="w-4 h-4 text-accent-violet" />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  Browse Sessions
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-violet group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link
              href="/learnings"
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Lightbulb className="w-4 h-4 text-accent-amber" />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  View Learnings
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-amber group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link
              href="/playground"
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-bg-tertiary/50 hover:bg-bg-tertiary transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Bot className="w-4 h-4 text-accent-sky" />
                <span className="text-sm text-text-secondary group-hover:text-text-primary transition-colors">
                  Query Playground
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-text-muted group-hover:text-accent-sky group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
