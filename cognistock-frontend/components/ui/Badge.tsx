// components/ui/Badge.tsx

type BadgeVariant = "default" | "success" | "warning" | "danger" | "critical" | "info" | "muted";

interface BadgeProps {
  variant?:  BadgeVariant;
  children:  React.ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default:  "bg-[#EFF6FF] text-[#1D4ED8] border border-[#DBEAFE]",
  success:  "bg-[#ECFDF5] text-[#065F46] border border-[#D1FAE5]",
  warning:  "bg-[#FFFBEB] text-[#92400E] border border-[#FEF3C7]",
  danger:   "bg-[#FEF2F2] text-[#991B1B] border border-[#FEE2E2]",
  critical: "bg-[#FEF2F2] text-[#991B1B] border border-[#DC2626]/30 font-semibold",
  info:     "bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]",
  muted:    "bg-[#F9FAFB] text-[#9CA3AF] border border-[#F3F4F6]",
};

export default function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5
        text-xs font-medium rounded-md
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}