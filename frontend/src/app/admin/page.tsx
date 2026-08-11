import React from 'react';

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">AroraDB Admin Control Plane</h1>
          <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Generate Report
          </button>
        </header>

        {/* Macro Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Total Tenants</h3>
            <div className="text-3xl font-bold text-white">1,248</div>
            <div className="mt-2 text-emerald-400 text-xs font-medium">↑ 12% from last month</div>
          </div>
          <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Storage Provisioned</h3>
            <div className="text-3xl font-bold text-white">45.2 TB</div>
            <div className="mt-2 text-emerald-400 text-xs font-medium">↑ 5% from last month</div>
          </div>
          <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-2">Global RPS</h3>
            <div className="text-3xl font-bold text-white">124k</div>
            <div className="mt-2 text-rose-400 text-xs font-medium">↓ 2% from last month</div>
          </div>
        </div>

        {/* Telemetry Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5 min-h-[300px] flex flex-col">
            <h3 className="text-white text-sm font-medium mb-4">Bitcask I/O Throughput</h3>
            <div className="flex-1 border border-dashed border-slate-700 rounded flex items-center justify-center text-slate-500 text-sm">
              [Telemetry Chart Placeholder]
            </div>
          </div>
          <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5 min-h-[300px] flex flex-col">
            <h3 className="text-white text-sm font-medium mb-4">Merge Process Active Threads</h3>
            <div className="flex-1 border border-dashed border-slate-700 rounded flex items-center justify-center text-slate-500 text-sm">
              [Telemetry Chart Placeholder]
            </div>
          </div>
        </div>

        {/* Trigger Panel */}
        <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5">
          <h3 className="text-white text-sm font-medium mb-4">System Maintenance</h3>
          <div className="flex space-x-4">
            <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-sm font-medium border border-slate-700 transition-colors">
              Trigger Global Compaction
            </button>
            <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded text-sm font-medium border border-slate-700 transition-colors">
              Initiate Cold Backup
            </button>
            <button className="bg-rose-900/50 hover:bg-rose-900/80 text-rose-300 px-4 py-2 rounded text-sm font-medium border border-rose-800 transition-colors ml-auto">
              Emergency Flush
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
