export default function UserPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <h2 className="text-2xl font-bold mb-4">Database Workspace</h2>

      <div className="bg-surface p-5 rounded-lg border border-slate-800 shadow-sm">
        <h3 className="font-semibold text-lg text-slate-200 mb-3">SQL Query Workbench</h3>
        <div className="bg-background border border-slate-700 rounded-md p-4 font-mono text-sm text-slate-300 mb-4 h-32 focus-within:border-highlight transition-colors cursor-text">
          <span className="text-highlight font-semibold">SELECT</span> * <span className="text-highlight font-semibold">FROM</span> telemetry_logs<br />
          <span className="text-highlight font-semibold">WHERE</span> cluster_id = <span className="text-green-400">'prod-us-east'</span><br />
          <span className="text-highlight font-semibold">ORDER BY</span> timestamp <span className="text-highlight font-semibold">DESC</span><br />
          <span className="text-highlight font-semibold">LIMIT</span> 100;
        </div>
        <div className="flex justify-end gap-3">
          <button className="text-slate-400 hover:text-slate-200 px-4 py-2 text-sm transition-colors">
            Clear
          </button>
          <button className="bg-highlight hover:bg-indigo-600 text-white font-medium px-5 py-2 rounded-md text-sm transition-colors shadow-sm">
            Execute Query
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-surface p-5 rounded-lg border border-slate-800 shadow-sm">
          <h3 className="font-semibold text-lg text-slate-200 mb-4">Document Explorer</h3>
          <ul className="space-y-1 text-sm text-slate-300">
            <li className="flex items-center gap-3 p-2 rounded hover:bg-slate-800 cursor-pointer transition-colors group">
              <span className="text-slate-500 group-hover:text-highlight">📄</span> config_schema.json
            </li>
            <li className="flex items-center gap-3 p-2 rounded hover:bg-slate-800 cursor-pointer transition-colors group">
              <span className="text-slate-500 group-hover:text-highlight">📄</span> deployment_guide.md
            </li>
            <li className="flex items-center gap-3 p-2 rounded hover:bg-slate-800 cursor-pointer transition-colors group">
              <span className="text-slate-500 group-hover:text-highlight">📄</span> release_notes_v2.txt
            </li>
            <li className="flex items-center gap-3 p-2 rounded hover:bg-slate-800 cursor-pointer transition-colors group text-slate-500">
              <span className="text-slate-600">📁</span> archived_logs/
            </li>
          </ul>
        </div>

        <div className="bg-surface p-5 rounded-lg border border-slate-800 shadow-sm">
          <h3 className="font-semibold text-lg text-slate-200 mb-4">API Key Manager</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-md border border-slate-700/50">
              <div className="flex flex-col">
                <span className="font-mono text-sm text-slate-300">sk_live_...4f9a</span>
                <span className="text-xs text-slate-500 mt-0.5">Created 2 days ago</span>
              </div>
              <span className="text-xs font-medium bg-green-500/10 text-green-400 px-2 py-1 rounded-md border border-green-500/20">Active</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-md border border-slate-700/50 opacity-60">
              <div className="flex flex-col">
                <span className="font-mono text-sm text-slate-400">sk_test_...8b21</span>
                <span className="text-xs text-slate-500 mt-0.5">Created 1 month ago</span>
              </div>
              <span className="text-xs font-medium bg-slate-500/10 text-slate-400 px-2 py-1 rounded-md border border-slate-500/20">Revoked</span>
            </div>
            <button className="w-full mt-4 border border-dashed border-slate-600 text-slate-400 hover:text-highlight hover:border-highlight hover:bg-highlight/5 rounded-md py-2.5 text-sm font-medium transition-all">
              + Generate New Key
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
