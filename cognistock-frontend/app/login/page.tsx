"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { saveToken } from "../../lib/auth";
import { Mail, Lock, Eye, EyeOff, TrendingUp, Package, Bell, BarChart2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:8080/api/auth/login", {
        email: email.trim(),
        password: password.trim(),
      });
      saveToken(res.data.token);
      window.location.replace("/dashboard");
    } catch {
      setError("Invalid email or password.");
      setLoading(false);
    }
  };

  const features = [
    { icon: BarChart2, label: "AI Demand Forecasting",   desc: "30-day predictions with 91% accuracy" },
    { icon: Package,   label: "Auto Purchase Orders",     desc: "Supplier-matched and sent instantly"  },
    { icon: Bell,      label: "Real-Time Stock Alerts",   desc: "Never run out of critical inventory"  },
    { icon: TrendingUp,label: "Decision Intelligence",    desc: "AI decisions, human approval"         },
  ];

  return (
    <div className="min-h-screen flex">

      {/* LEFT — Enterprise brand panel */}
      <div className="hidden lg:flex w-[45%] bg-[#111827] flex-col justify-between p-12">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#2563EB] flex items-center justify-center">
            <TrendingUp size={15} className="text-white" strokeWidth={2.5} />
          </div>
          <span className="text-white font-semibold text-[16px] tracking-tight">CogniStock</span>
        </div>

        {/* Center content */}
        <div>
          <h1 className="text-3xl font-semibold text-white leading-snug mb-3">
            Smarter inventory.<br />Fewer stockouts.
          </h1>
          <p className="text-[#9CA3AF] text-sm mb-10 leading-relaxed max-w-xs">
            AI-powered supply chain intelligence for modern operations teams.
          </p>

          <div className="flex flex-col gap-3">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1F2937] flex items-center justify-center flex-shrink-0">
                  <f.icon size={14} className="text-[#60A5FA]" />
                </div>
                <div>
                  <p className="text-white text-xs font-medium">{f.label}</p>
                  <p className="text-[#6B7280] text-[11px]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <p className="text-[#4B5563] text-xs">
          © 2026 CogniStock · Enterprise Supply Chain Intelligence
        </p>
      </div>

      {/* RIGHT — Login form */}
      <div className="flex-1 flex items-center justify-center bg-[#F7F8FA] p-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-md bg-[#2563EB] flex items-center justify-center">
              <TrendingUp size={13} className="text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[#111827] font-semibold text-[15px]">CogniStock</span>
          </div>

          <h2 className="text-xl font-semibold text-[#111827] mb-1">Sign in</h2>
          <p className="text-sm text-[#6B7280] mb-4">Enter your credentials to continue</p>

          <div 
            onClick={() => {
              setEmail("admin@cognistock.com");
              setPassword("Admin@123");
            }}
            className="mb-5 p-3 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] cursor-pointer hover:bg-[#DBEAFE] transition-colors flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-semibold text-[#1E40AF]">Demo Admin Login</p>
              <p className="text-[11px] text-[#3B82F6]">admin@cognistock.com · Admin@123</p>
            </div>
            <span className="text-xs font-medium text-[#2563EB] bg-white px-2 py-1 rounded shadow-sm">Auto-fill</span>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-3">
            {/* Email */}
            <div className="relative">
              <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg
                  pl-9 pr-3 py-2.5 text-sm text-[#111827]
                  placeholder:text-[#9CA3AF]
                  focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]
                  transition-colors"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-white border border-[#E5E7EB] rounded-lg
                  pl-9 pr-10 py-2.5 text-sm text-[#111827]
                  placeholder:text-[#9CA3AF]
                  focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]
                  transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280]"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {error && (
              <p className="text-xs text-[#DC2626]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1 bg-[#2563EB] hover:bg-[#1D4ED8]
                text-white rounded-lg py-2.5 text-sm font-medium
                transition-colors duration-150 disabled:opacity-50 cursor-pointer
                disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-center text-[#9CA3AF] text-xs mt-8">
            CogniStock · AI Inventory Intelligence
          </p>
        </div>
      </div>
    </div>
  );
}