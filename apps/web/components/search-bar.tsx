"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

export function SearchBar({
  placeholder = "Search...",
  value,
  onChange,
  className,
}: {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      className={clsx(
        "relative flex items-center rounded-xl border transition-all duration-300",
        focused
          ? "border-accent-violet/50 bg-bg-secondary shadow-[0_0_20px_rgba(139,92,246,0.1)]"
          : "border-border-default bg-bg-secondary hover:border-border-hover",
        className
      )}
    >
      <Search
        className={clsx(
          "w-4 h-4 ml-4 transition-colors",
          focused ? "text-accent-violet" : "text-text-muted"
        )}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        className="w-full bg-transparent px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted outline-none"
      />
    </div>
  );
}
