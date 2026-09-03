"use client";
import { useState, useEffect } from "react";
import {
  LayoutDashboard, Box, Truck, Receipt, BarChart2,
  Sun, GitPullRequest, Settings, LogOut, TrendingUp,
  ClipboardList, AlertTriangle, Activity,
  PackageX, MessageSquare, GitBranch,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { removeToken, getUserRole } from "../lib/auth";

const mainNav = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", roles: ["ADMIN", "MANAGER", "STAFF"] },
  { label: "Inventory",  icon: Box,             path: "/inventory", roles: ["ADMIN", "MANAGER", "STAFF"] },
  { label: "Suppliers",  icon: Truck,           path: "/suppliers", roles: ["ADMIN", "MANAGER"] },
  { label: "Orders",     icon: Receipt,         path: "/orders", roles: ["ADMIN", "MANAGER", "STAFF"] },
];

const intelligenceNav = [
  { label: "AI Insights",     icon: BarChart2,      path: "/ai-insights",     roles: ["ADMIN", "MANAGER", "STAFF"] },
  { label: "Early Warning",   icon: AlertTriangle,  path: "/early-warning",   roles: ["ADMIN", "MANAGER", "STAFF"] },
  { label: "Dead Stock",      icon: PackageX,       path: "/dead-stock",      roles: ["ADMIN", "MANAGER", "STAFF"] },
  { label: "Morning Brief",   icon: Sun,            path: "/morning-brief",   roles: ["ADMIN", "MANAGER", "STAFF"] },
  { label: "Decision Center", icon: GitPullRequest, path: "/decision-center", roles: ["ADMIN", "MANAGER"] },
  { label: "AI Performance",  icon: Activity,       path: "/ai-performance",  roles: ["ADMIN", "MANAGER"] },
  { label: "Audit Logs",      icon: ClipboardList,  path: "/audit-logs",      roles: ["ADMIN"] },
  { label: "Chat",            icon: MessageSquare,  path: "/chat",            roles: ["ADMIN", "MANAGER", "STAFF"] },
  { label: "AI Timeline",     icon: GitBranch,      path: "/ai-timeline",     roles: ["ADMIN", "MANAGER", "STAFF"] },
];

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#4B5563]">
        {label}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

function NavItem({ icon: Icon, label, path, active, onClick }: {
  icon: React.ElementType; label: string; path: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-left transition-colors duration-150 cursor-pointer ${
        active ? "bg-[#1F2937] text-white font-medium" : "text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#E5E7EB]"
      }`}
    >
      <Icon size={15} strokeWidth={active ? 2 : 1.75} />
      {label}
    </button>
  );
}
export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState<string>("STAFF");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setRole(getUserRole() ?? "STAFF");
    setMounted(true);
  }, []);

  const isActive = (path: string) => pathname === path;
  const go = (path: string) => router.push(path);
  const handleLogout = () => { removeToken(); window.location.href = "/login"; };

  const visibleMainNav = mainNav.filter((item) => item.roles.includes(role));
  const visibleIntelligenceNav = intelligenceNav.filter((item) => item.roles.includes(role));

  if (!mounted) {
    return <aside className="w-56 bg-[#111827] flex-shrink-0 min-h-screen border-r border-[#1F2937]" />;
  }

  return (
    <aside className="w-56 bg-[#111827] flex-shrink-0 min-h-screen flex flex-col border-r border-[#1F2937]">
      <div className="h-14 flex items-center px-4 border-b border-[#1F2937]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#2563EB] flex items-center justify-center flex-shrink-0">
            <TrendingUp size={14} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-semibold text-[15px] tracking-tight">CogniStock</span>
        </div>
      </div>
      <nav className="flex-1 px-3 py-4 flex flex-col gap-4 overflow-y-auto">
        <NavGroup label="Operations">
          {visibleMainNav.map((item) => (
            <NavItem key={item.path} icon={item.icon} label={item.label} path={item.path}
              active={isActive(item.path)} onClick={() => go(item.path)} />
          ))}
        </NavGroup>
        <NavGroup label="Intelligence">
          {visibleIntelligenceNav.map((item) => (
            <NavItem key={item.path} icon={item.icon} label={item.label} path={item.path}
              active={isActive(item.path)} onClick={() => go(item.path)} />
          ))}
        </NavGroup>
      </nav>
      <div className="px-3 py-3 border-t border-[#1F2937] flex flex-col gap-0.5">
        {role === "ADMIN" && (
          <NavItem icon={Settings} label="Settings" path="/settings"
            active={isActive("/settings")} onClick={() => go("/settings")} />
        )}
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#9CA3AF] hover:bg-[#1F2937] hover:text-[#FCA5A5] transition-colors duration-150 cursor-pointer">
          <LogOut size={15} strokeWidth={1.75} />
          Logout
        </button>
      </div>
    </aside>
  );
}