"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-250 ease-out focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed btn-hover-scale";

    const variants = {
      primary:
        "bg-primary text-white rounded-pill px-6 py-3 shadow-glow hover:brightness-110 focus:ring-primary",
      secondary:
        "bg-surface-card text-white border border-glass-light rounded-pill px-6 py-3 hover:bg-surface-secondary focus:ring-primary/50",
      danger:
        "bg-danger text-white rounded-pill px-6 py-3 hover:bg-red-500 focus:ring-danger",
      ghost:
        "text-text-sub hover:text-white hover:bg-white/5 rounded-pill px-6 py-3 focus:ring-white/20",
    };

    const sizes = {
      sm: "text-small px-4 py-2",
      md: "text-body px-6 py-3",
      lg: "text-body px-8 py-4",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };