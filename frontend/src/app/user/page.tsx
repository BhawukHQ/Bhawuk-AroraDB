import React from 'react';

export default function UserDashboard() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Dashboard</h1>
          <div className="text-sm text-slate-400">Current Plan: <span className="text-indigo-400 font-medium">Pro</span></div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Storage Utilization Gauge */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-6 lg:col-span-1 flex flex-col items-center justify-center relative">
            <h3 className="absolute top-6 left-6 text-slate-400 text-xs font-medium uppercase tracking-wider">Storage Utilization</h3>
            {/* Mock Gauge */}
            <div className="mt-8 relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray="440" strokeDashoffset="88" className="text-amber-500 transition-all duration-1000 ease-out" />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">80%</span>
                <span className="text-xs text-amber-500 font-medium">Soft Limit</span>
              </div>
            </div>
            <div className="mt-6 w-full flex justify-between text-xs text-slate-400">
              <span>0 GB</span>
              <span>40 GB / 50 GB (Hard Limit)</span>
            </div>
          </div>

          {/* Request Volume & Errors */}
          <div className="lg:col-span-2 grid grid-rows-2 gap-6">
            <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5 flex flex-col">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-4">Request Volume (7d)</h3>
              <div className="flex-1 border border-dashed border-slate-700 rounded flex items-center justify-center text-slate-500 text-sm">
                [Timeline Chart Placeholder]
              </div>
            </div>
            
            <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5 flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider">Error Rate Tracking</h3>
                <span className="text-rose-400 text-xs font-bold bg-rose-900/20 px-2 py-1 rounded">0.12% Avg</span>
              </div>
              <div className="flex-1 border border-dashed border-slate-700 rounded flex items-center justify-center text-slate-500 text-sm">
                [Error Rate Chart Placeholder]
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
