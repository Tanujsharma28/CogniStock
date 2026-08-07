// components/ui/EmptyState.tsx
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?:        ReactNode;
  title:        string;
  description?: string;
  action?:      ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && (
        <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] mb-4">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-[#111827] mb-1">{title}</p>
      {description && (
        <p className="text-xs text-[#6B7280] max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}