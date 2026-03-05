"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Bot,
} from "lucide-react";
import clsx from "clsx";
import { StatusBadge } from "./status-badge";
import { SearchBar } from "./search-bar";
import type { MockSession } from "@/lib/mock-data";

type SortKey = "createdAt" | "duration" | "agentId";

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
        active
          ? "bg-accent-violet-dim text-accent-violet border border-accent-violet/30"
          : "bg-bg-tertiary text-text-muted hover:text-text-secondary border border-transparent"
      )}
    >
      {label}
    </button>
  );
}

export function SessionTable({ sessions }: { sessions: MockSession[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 8;

  const filtered = useMemo(() => {
    let result = sessions;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.task.summary.toLowerCase().includes(q) ||
          s.agentId.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      result = result.filter((s) => s.outcome.status === statusFilter);
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "createdAt") cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      else if (sortKey === "duration") cmp = a.duration - b.duration;
      else if (sortKey === "agentId") cmp = a.agentId.localeCompare(b.agentId);
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [sessions, search, statusFilter, sortKey, sortAsc]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  function formatDuration(s: number) {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchBar
          placeholder="Search sessions..."
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          className="flex-1"
        />
        <div className="flex gap-2">
          <FilterChip label="All" active={!statusFilter} onClick={() => { setStatusFilter(null); setPage(0); }} />
          <FilterChip label="Success" active={statusFilter === "success"} onClick={() => { setStatusFilter(statusFilter === "success" ? null : "success"); setPage(0); }} />
          <FilterChip label="Failed" active={statusFilter === "failed"} onClick={() => { setStatusFilter(statusFilter === "failed" ? null : "failed"); setPage(0); }} />
          <FilterChip label="Partial" active={statusFilter === "partial"} onClick={() => { setStatusFilter(statusFilter === "partial" ? null : "partial"); setPage(0); }} />
        </div>
      </div>

      {/* Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left px-5 py-3 text-text-muted font-medium">Task</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">
                  <button onClick={() => toggleSort("agentId")} className="flex items-center gap-1 hover:text-text-secondary transition-colors">
                    Agent <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">Status</th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">
                  <button onClick={() => toggleSort("duration")} className="flex items-center gap-1 hover:text-text-secondary transition-colors">
                    Duration <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left px-5 py-3 text-text-muted font-medium">
                  <button onClick={() => toggleSort("createdAt")} className="flex items-center gap-1 hover:text-text-secondary transition-colors">
                    Time <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {paged.map((session, i) => (
                  <motion.tr
                    key={session.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, delay: i * 0.03 }}
                    className="border-b border-border-default/50 last:border-0 hover:bg-bg-tertiary/30 transition-colors group"
                  >
                    <td className="px-5 py-3.5">
                      <Link href={`/sessions/${session.id}`} className="block">
                        <span className="text-text-primary group-hover:text-accent-violet transition-colors font-medium">
                          {session.task.summary}
                        </span>
                        <span className="block text-xs text-text-muted mt-0.5">{session.id}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <Bot className="w-3.5 h-3.5 text-text-muted" />
                        <span className="text-text-secondary text-xs">{session.agentId}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={session.outcome.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-text-muted">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="text-xs">{formatDuration(session.duration)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-text-muted">
                      {formatTime(session.createdAt)}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border-default">
            <span className="text-xs text-text-muted">
              {filtered.length} sessions · Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-bg-tertiary disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-text-muted" />
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-bg-tertiary disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-text-muted" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
