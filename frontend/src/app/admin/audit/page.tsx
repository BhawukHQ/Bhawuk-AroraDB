import React from 'react';

const mockLogs = [
  { id: 'log_9x8f', timestamp: '2026-08-11 22:45:12', user: 'alice@example.com', eventType: 'AUTH_FAILURE', details: 'Invalid API key format' },
  { id: 'log_8d7c', timestamp: '2026-08-11 22:41:05', user: 'system', eventType: 'COMPACTION_START', details: 'Triggered manual compaction on partition 4' },
  { id: 'log_7b6a', timestamp: '2026-08-11 22:30:11', user: 'bob@startup.io', eventType: 'SCHEMA_UPDATE', details: 'Added column "metadata" to "users" table' },
  { id: 'log_6a5f', timestamp: '2026-08-11 22:15:00', user: 'diana@corp.com', eventType: 'KEY_CREATED', details: 'Created scoped key: read:sql, write:doc' },
];

export default function AdminAuditPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">Global Audit Log</h1>
          <button className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-md text-sm font-medium border border-slate-700 transition-colors">
            Export CSV
          </button>
        </header>

        <div className="bg-[#0F172A] border border-slate-800 rounded-lg">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <div className="flex space-x-3">
              <select className="bg-[#020617] border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500">
                <option>All Event Types</option>
                <option>AUTH_FAILURE</option>
                <option>KEY_CREATED</option>
                <option>SCHEMA_UPDATE</option>
                <option>COMPACTION_START</option>
              </select>
              <input type="date" className="bg-[#020617] border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-300" />
            </div>
          </div>
          
          <table className="w-full text-left text-sm">
            <thead className="bg-[#020617]/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Event Type</th>
                <th className="px-4 py-3 font-medium">User / Actor</th>
                <th className="px-4 py-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 text-slate-300">
              {mockLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{log.timestamp}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      log.eventType === 'AUTH_FAILURE' ? 'bg-rose-900/30 text-rose-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {log.eventType}
                    </span>
                  </td>
                  <td className="px-4 py-3">{log.user}</td>
                  <td className="px-4 py-3 text-slate-400">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
