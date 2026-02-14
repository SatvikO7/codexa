import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatPrice(amount: number, currency: string = "INR"): string {
  const symbol = currency === "INR" ? "₹" : "$";
  return `${symbol}${amount}`;
}

export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
}

export function getFileIcon(filename: string): string {
  const ext = getFileExtension(filename).toLowerCase();
  const iconMap: Record<string, string> = {
    js: "📄",
    ts: "📄",
    jsx: "⚛️",
    tsx: "⚛️",
    py: "🐍",
    java: "☕",
    go: "🐹",
    rs: "🦀",
    html: "🌐",
    css: "🎨",
    json: "📋",
    md: "📝",
  };
  return iconMap[ext] || "📄";
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}
