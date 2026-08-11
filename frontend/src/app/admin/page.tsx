export default function AdminPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <h2 className="text-2xl font-bold mb-4">Cluster Telemetry</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface p-5 rounded-lg border border-slate-800 shadow-sm">
          <h3 className="text-slate-400 text-sm font-medium mb-1">CPU Usage</h3>
          <p className="text-3xl text-highlight font-mono font-semibold">42%</p>
        </div>
        <div className="bg-surface p-5 rounded-lg border border-slate-800 shadow-sm">
          <h3 className="text-slate-400 text-sm font-medium mb-1">Memory</h3>
          <p className="text-3xl text-highlight font-mono font-semibold">16.4 GB</p>
        </div>
        <div className="bg-surface p-5 rounded-lg border border-slate-800 shadow-sm">
          <h3 className="text-slate-400 text-sm font-medium mb-1">Active Nodes</h3>
          <p className="text-3xl text-highlight font-mono font-semibold">3 <span className="text-lg text-slate-500">/ 3</span></p>
        </div>
      </div>

      <div className="bg-surface p-5 rounded-lg border border-slate-800 shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-semibold text-lg text-slate-200">Log Compaction</h3>
            <p className="text-sm text-slate-400 mt-1">Optimize cluster storage by compacting telemetry and audit logs.</p>
          </div>
          <button className="bg-highlight hover:bg-indigo-600 text-white font-medium px-4 py-2 rounded-md text-sm transition-colors">
            Run Manual Compaction
          </button>
        </div>
        <div className="bg-background rounded p-3 border border-slate-800 inline-block">
          <span className="text-sm text-slate-400">Last compaction run: <span className="text-slate-300 font-medium">2 hours ago</span> • Space saved: <span className="text-green-400 font-medium">1.2 GB</span></span>
        </div>
      </div>

      <div className="bg-surface p-5 rounded-lg border border-slate-800 shadow-sm">
        <h3 className="font-semibold text-lg text-slate-200 mb-4">Cluster Audit Viewer</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-medium">Timestamp</th>
                <th className="pb-3 font-medium">Event</th>
                <th className="pb-3 font-medium">User / Source</th>
                <th className="pb-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800/50">
                <td className="py-3 text-slate-300 font-mono text-xs">2026-08-11 12:00:01</td>
                <td className="py-3 font-medium text-slate-200">Node joined</td>
                <td className="py-3 text-slate-400">System</td>
                <td className="py-3 text-right"><span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-xs">Success</span></td>
              </tr>
              <tr className="border-b border-slate-800/50">
                <td className="py-3 text-slate-300 font-mono text-xs">2026-08-11 11:45:12</td>
                <td className="py-3 font-medium text-slate-200">API Key Revoked</td>
                <td className="py-3 text-slate-400">admin@stitch.ui</td>
                <td className="py-3 text-right"><span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-xs">Success</span></td>
              </tr>
              <tr>
                <td className="py-3 text-slate-300 font-mono text-xs">2026-08-11 10:30:00</td>
                <td className="py-3 font-medium text-slate-200">Config updated</td>
                <td className="py-3 text-slate-400">admin@stitch.ui</td>
                <td className="py-3 text-right"><span className="bg-green-500/10 text-green-400 px-2 py-1 rounded text-xs">Success</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
