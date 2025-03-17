import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function for conditional Tailwind CSS class names
 * Combines clsx and tailwind-merge for clean conditional classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
