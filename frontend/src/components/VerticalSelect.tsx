"use client";
import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export interface VerticalOption {
  id: string;
  slug: string;
  name: string;
}

interface VerticalSelectProps {
  value: string;
  onChange: (value: string) => void;
  showInherit?: boolean;
  className?: string;
  disabled?: boolean;
}

export function VerticalSelect({
  value,
  onChange,
  showInherit = false,
  className,
  disabled = false,
}: VerticalSelectProps) {
  const [verticals, setVerticals] = useState<VerticalOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("verticals")
      .select("id, slug, name")
      .eq("active", true)
      .order("name")
      .then(({ data }: { data: VerticalOption[] | null }) => {
        if (!cancelled) {
          if (data) setVerticals(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled || loading}
      className={cn(
        "w-full bg-neutral-900 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white",
        "focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        className
      )}
    >
      {showInherit ? (
        <option value="">Inherit from offer</option>
      ) : (
        <option value="">Select vertical (optional)</option>
      )}
      {verticals.map((v) => (
        <option key={v.id} value={v.id}>
          {v.name}
        </option>
      ))}
    </select>
  );
}