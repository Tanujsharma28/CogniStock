// components/ui/Card.tsx
import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm:   "p-4",
  md:   "p-5",
  lg:   "p-6",
};

export default function Card({
  children,
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-white border border-[#E5E7EB] rounded-xl shadow-sm ${paddingMap[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}