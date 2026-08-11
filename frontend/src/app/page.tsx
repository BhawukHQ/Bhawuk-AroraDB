"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "topology" | "modules">("overview");
  const { role } = useAuth();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-[#0F172A] p-6 rounded-xl border border-slate-800">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Platform Overview Hub</h1>
          <p className="text-slate-400">Welcome to Bhawuk-AroraDB, the enterprise multi-model database platform.</p>
        </div>
        <div className="flex gap-4">
          <Link href="/login" className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded border border-slate-700 transition-colors">
            Login
          </Link>
          {role === "admin" && (
            <Link href="/admin" className="px-4 py-2 bg-[#6366F1] hover:bg-indigo-500 text-white rounded transition-colors">
              Go to Admin
            </Link>
          )}
          {role === "user" && (
            <Link href="/user" className="px-4 py-2 bg-[#6366F1] hover:bg-indigo-500 text-white rounded transition-colors">
              Go to Workspace
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-800">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === "overview"
                ? "border-[#6366F1] text-[#6366F1]"
                : "border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300"
            }`}
          >
            Overview
          </button>
          {role === "admin" && (
            <>
              <button
                onClick={() => setActiveTab("topology")}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "topology"
                    ? "border-[#6366F1] text-[#6366F1]"
                    : "border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300"
                }`}
              >
                Cluster Topology
              </button>
              <button
                onClick={() => setActiveTab("modules")}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "modules"
                    ? "border-[#6366F1] text-[#6366F1]"
                    : "border-transparent text-slate-400 hover:text-slate-300 hover:border-slate-300"
                }`}
              >
                Modules & Engines
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-[#0F172A] p-6 rounded-xl border border-slate-800 min-h-[400px]">
        {activeTab === "overview" && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Connection Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-900 rounded border border-slate-800">
                <h3 className="text-sm font-medium text-slate-400 mb-1">REST API Endpoint</h3>
                <code className="text-[#6366F1]">https://api.aroradb.io/v1</code>
              </div>
              <div className="p-4 bg-slate-900 rounded border border-slate-800">
                <h3 className="text-sm font-medium text-slate-400 mb-1">PostgreSQL Wire (SQL Engine)</h3>
                <code className="text-[#6366F1]">postgres://user:pass@api.aroradb.io:5432/db</code>
              </div>
            </div>
            
            <h2 className="text-xl font-semibold text-white mt-8">System Status</h2>
            <div className="flex items-center gap-3 p-4 bg-slate-900 rounded border border-slate-800">
              <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
              <span className="text-slate-200">All systems operational (3/3 Nodes Healthy)</span>
            </div>
          </div>
        )}

        {role === "admin" && activeTab === "topology" && (
          <div className="space-y-6 text-center">
            <h2 className="text-xl font-semibold text-white mb-8">Kubernetes Deployment Architecture</h2>
            
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="px-8 py-3 bg-indigo-900/50 border border-indigo-500/50 rounded-lg text-indigo-200 font-medium w-64">
                AWS ALB Gateway
              </div>
              <div className="text-slate-600">↓ routes to ↓</div>
              <div className="flex gap-8 justify-center">
                <div className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 w-48">
                  Frontend (Next.js)
                </div>
                <div className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 w-48">
                  Backend API (Go)
                </div>
              </div>
              <div className="text-slate-600 text-right pr-24">↓ handles storage ↓</div>
              <div className="flex gap-4 justify-center bg-slate-900 p-6 rounded-xl border border-slate-800 w-full max-w-2xl">
                <div className="flex-1 p-4 bg-slate-800 rounded border border-slate-700">
                  <div className="text-sm font-semibold text-slate-300 mb-2">Pod-0 (Leader)</div>
                  <div className="text-xs text-slate-500">gp3 NVMe Storage</div>
                </div>
                <div className="flex-1 p-4 bg-slate-800 rounded border border-slate-700">
                  <div className="text-sm font-semibold text-slate-300 mb-2">Pod-1 (Replica)</div>
                  <div className="text-xs text-slate-500">gp3 NVMe Storage</div>
                </div>
                <div className="flex-1 p-4 bg-slate-800 rounded border border-slate-700">
                  <div className="text-sm font-semibold text-slate-300 mb-2">Pod-2 (Replica)</div>
                  <div className="text-xs text-slate-500">gp3 NVMe Storage</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {role === "admin" && activeTab === "modules" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-white">KV Storage Engine</h3>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">Active</span>
              </div>
              <p className="text-sm text-slate-400 mb-4">Bitcask Log-Structured Merge Tree engine handling the core disk persistence.</p>
              <div className="text-xs text-slate-500 border-t border-slate-800 pt-3">Module ID: core.engine.kv</div>
            </div>

            <div className="p-5 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-white">Relational SQL Engine</h3>
                <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">Paused (Phase 3)</span>
              </div>
              <p className="text-sm text-slate-400 mb-4">Provides ANSI SQL query parsing, planning, and execution over KV rows.</p>
              <div className="text-xs text-slate-500 border-t border-slate-800 pt-3">Module ID: ext.engine.sql</div>
            </div>

            <div className="p-5 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-white">JSON Document Store</h3>
                <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">Paused (Phase 3)</span>
              </div>
              <p className="text-sm text-slate-400 mb-4">Schema-free document storage with Inverted Indexing for full-text search.</p>
              <div className="text-xs text-slate-500 border-t border-slate-800 pt-3">Module ID: ext.engine.doc</div>
            </div>

            <div className="p-5 bg-slate-900 rounded-lg border border-slate-800 hover:border-slate-600 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-white">Vector AI Engine</h3>
                <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">Paused (Phase 3)</span>
              </div>
              <p className="text-sm text-slate-400 mb-4">HNSW indexing for high-dimensional embeddings and fast nearest-neighbor retrieval.</p>
              <div className="text-xs text-slate-500 border-t border-slate-800 pt-3">Module ID: ext.engine.vector</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
