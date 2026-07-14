"use client";

// Minimal toast hook that wraps sonner
import { toast as sonnerToast } from "sonner";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

function toast(options: ToastOptions) {
  const { title, description, variant, duration } = options;
  const message = title ?? "";
  if (variant === "destructive") {
    sonnerToast.error(message, { description, duration });
  } else {
    sonnerToast.success(message, { description, duration });
  }
}

function useToast() {
  return { toast };
}

export { useToast, toast };
