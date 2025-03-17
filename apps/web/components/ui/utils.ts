import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges tailwind classes using clsx and tailwind-merge
 * This helps prevent conflicts when combining utility classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 