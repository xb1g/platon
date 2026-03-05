"use client";

import { motion } from "framer-motion";
import { SessionTable } from "@/components/session-table";
import { mockSessions } from "@/lib/mock-data";

export default function SessionsPage() {
  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-text-primary">Sessions</h1>
        <p className="text-sm text-text-muted mt-1">
          Explore and filter all agent sessions
        </p>
      </motion.div>

      <SessionTable sessions={mockSessions} />
    </div>
  );
}
