// components/ui/Button.tsx
import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant;
  size?:     Size;
  loading?:  boolean;
  icon?:     ReactNode;
}

const variants: Record<Variant, string> = {
  primary:   "bg-[#2563EB] text-white hover:bg-[#1D4ED8] border border-transparent",
  secondary: "bg-white text-[#111827] hover:bg-[#F9FAFB] border border-[#E5E7EB]",
  danger:    "bg-[#DC2626] text-white hover:bg-[#B91C1C] border border-transparent",
  ghost:     "bg-transparent text-[#6B7280] hover:bg-[#F3F4F6] border border-transparent",
};

const sizes: Record<Size, string> = {
  sm:  "h-7  px-3 text-xs  gap-1.5",
  md:  "h-9  px-4 text-sm  gap-2",
  lg:  "h-10 px-5 text-sm  gap-2",
};

export default function Button({
  children,
  variant  = "primary",
  size     = "md",
  loading  = false,
  icon,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center font-medium rounded-lg
        transition-all duration-150 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : icon}
      {children}
    </button>
  );
}