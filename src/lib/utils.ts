import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convierte cualquier valor a número de forma segura (PostgreSQL NUMERIC puede venir como string) */
export function toNumber(value: unknown): number {
  if (typeof value === "number" && !isNaN(value)) return value;
  const n = parseFloat(String(value ?? ""));
  return isNaN(n) ? 0 : n;
}
