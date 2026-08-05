"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { saveToken } from "../../lib/auth";
import { Mail, Lock, Eye, EyeOff, Sparkles, TrendingUp, Package, Bell } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
  } catch (err: any) {
    setError("Email ya password galat hai");
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex">
      {/* LEFT — Animated Hero */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-[#030712] via-[#0f172a] to-[#1e1b4b] relative overflow-hidden flex-col justify-center p-12">
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-purple-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <span className="text-white font-medium text-lg">CogniStock</span>
          </div>

          <h1 className="text-4xl font-semibold text-white leading-tight mb-4">
            Manage Inventory<br />Smarter with AI
          </h1>
          <p className="text-gray-400 text-sm mb-10 max-w-sm">
            Real-time forecasting, automated purchase orders, and intelligent supplier selection — all in one platform.
          </p>

          <div className="space-y-3 max-w-xs">
            <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-3 animate-[floatCard_4s_ease-in-out_infinite]">
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TrendingUp size={16} className="text-blue-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">AI Demand Forecast</p>
                <p className="text-gray-500 text-xs">91% prediction accuracy</p>
              </div>
            </div>

            <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-3 animate-[floatCard_4s_ease-in-out_infinite]" style={{ animationDelay: "0.8s" }}>
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Package size={16} className="text-purple-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Auto Purchase Orders</p>
                <p className="text-gray-500 text-xs">Supplier-matched instantly</p>
              </div>
            </div>

            <div className="bg-white/[0.06] backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center gap-3 animate-[floatCard_4s_ease-in-out_infinite]" style={{ animationDelay: "1.6s" }}>
              <div className="w-9 h-9 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <Bell size={16} className="text-cyan-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Real-Time Alerts</p>
                <p className="text-gray-500 text-xs">Never run out of stock</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT — Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-medium text-gray-900 mb-1">Welcome back 👋</h1>
          <p className="text-sm text-gray-500 mb-6">Login to your CogniStock account</p>

          <form onSubmit={handleLogin}>
            <div className="relative mb-4">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="relative mb-2">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full bg-white border border-gray-300 rounded-lg pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && <p className="text-red-600 text-xs mb-3">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="text-center text-gray-400 text-xs mt-6">CogniStock · AI Inventory Intelligence</p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes floatCard {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}