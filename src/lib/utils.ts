import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with proper conflict resolution.
 * Used everywhere — shadcn/ui depends on this.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}