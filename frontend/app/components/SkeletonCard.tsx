import type { JSX } from "react";
import { cn } from "@/lib/cn";
import type { SkeletonCardProps } from "@/app/types/event";

export default function SkeletonCard({
  className,
}: SkeletonCardProps): JSX.Element {
  return (
    <div
      className={cn(
        "glass-panel h-[360px] animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5",
        className,
      )}
    />
  );
}
