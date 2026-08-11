"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const { login } = useAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      login(username.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] text-white">
      <div className="w-full max-w-md p-8 bg-[#0F172A] rounded-xl shadow-2xl border border-slate-800">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">AroraDB</h1>
          <p className="text-slate-400">Sign in to your workspace</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] text-white"
              placeholder="e.g., bhawuk or mukul"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#6366F1] text-white"
              placeholder="••••••••"
              disabled
            />
            <p className="text-xs text-slate-500 mt-2">Password is mocked for this demo.</p>
          </div>

          <button
            type="submit"
            className="w-full bg-[#6366F1] hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors"
          >
            Sign In
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-slate-400">
          <p>Demo Roles:</p>
          <p>Admin: <span className="text-indigo-400 font-semibold">bhawuk</span></p>
          <p>User: <span className="text-indigo-400 font-semibold">mukul</span></p>
        </div>
      </div>
    </div>
  );
}
