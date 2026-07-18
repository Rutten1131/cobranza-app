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
        "bg-primary text-[#0a0807] rounded-sm font-bold px-6 py-3 hover:bg-[#f3ece1] hover:text-[#0a0807] transition-all",
      secondary:
        "bg-[#131110] text-[#f3ece1] border border-glass rounded-sm px-6 py-3 hover:bg-[#1a1715] transition-all",
      danger:
        "bg-danger text-[#f3ece1] rounded-sm px-6 py-3 hover:bg-red-500 transition-all",
      ghost:
        "text-text-sub hover:text-[#f3ece1] hover:bg-white/5 rounded-sm px-6 py-3",
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