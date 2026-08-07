// components/ui/SectionHeader.tsx
import { ReactNode } from "react";

interface SectionHeaderProps {
  title:        string;
  description?: string;
  action?:      ReactNode;
}

export default function SectionHeader({ title, description, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-[18px] font-semibold text-[#111827] leading-tight">{title}</h1>
        {description && (
          <p className="text-sm text-[#6B7280] mt-0.5">{description}</p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}