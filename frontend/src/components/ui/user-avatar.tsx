"use client";
import React, { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function deriveDisplayName(user: {
  user_metadata?: { full_name?: string };
  email?: string;
} | null): string {
  if (!user) return "Account";
  if (user.user_metadata?.full_name) return user.user_metadata.full_name;
  if (user.email) {
    const local = user.email.split("@")[0];
    return local
      .split(/[._-]/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }
  return "Account";
}

// ─── Size Presets ─────────────────────────────────────────────────────────────

const sizes = {
  sm: { px: 28, className: "h-7 w-7 text-xs" },
  md: { px: 48, className: "h-12 w-12 text-lg" },
} as const;

type AvatarSize = keyof typeof sizes;

// ─── Component ────────────────────────────────────────────────────────────────

interface UserAvatarProps {
  avatarUrl?: string | null;
  displayName: string;
  size?: AvatarSize;
  className?: string;
}

export function UserAvatar({
  avatarUrl,
  displayName,
  size = "sm",
  className,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const { px, className: sizeClass } = sizes[size];

  // Show initials fallback when no URL or image failed to load
  if (!avatarUrl || imgError) {
    return (
      <div
        className={cn(
          "rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold flex-shrink-0",
          sizeClass,
          className,
        )}
      >
        {getInitials(displayName)}
      </div>
    );
  }

  return (
    <Image
      src={avatarUrl}
      width={px}
      height={px}
      alt="User avatar"
      className={cn(
        "rounded-full flex-shrink-0 object-cover border border-neutral-700",
        sizeClass,
        className,
      )}
      onError={() => setImgError(true)}
    />
  );
}
