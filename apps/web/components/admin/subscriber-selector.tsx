"use client";

import React from "react";
import { useRouter } from "next/navigation";

type SubscriberOption = {
  subscriberId: string;
  sessionCount: number;
  learningCount: number;
};

export function SubscriberSelector({
  subscribers,
  selectedSubscriberId,
}: {
  subscribers: SubscriberOption[];
  selectedSubscriberId: string | null;
}) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      router.push(`/admin/graph?subscriberId=${encodeURIComponent(value)}`);
    } else {
      router.push("/admin/graph");
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label
        htmlFor="subscriber-select"
        className="text-sm text-text-secondary"
      >
        Customer
      </label>
      <select
        id="subscriber-select"
        value={selectedSubscriberId ?? ""}
        onChange={handleChange}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-text-primary outline-none transition focus:border-accent-sky/40 focus:bg-white/10"
      >
        <option value="">All customers</option>
        {subscribers.map((s) => (
          <option key={s.subscriberId} value={s.subscriberId}>
            {s.subscriberId} — {s.sessionCount}s / {s.learningCount}l
          </option>
        ))}
      </select>
    </div>
  );
}
