"use client";
import React, { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await fetchAPI('/api/admin/audit');
        setLogs(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch audit logs');
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

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
          
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading logs...</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-400">{error}</div>
          ) : (
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
                {logs.map((log, i) => (
                  <tr key={log.id || i} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{log.timestamp || new Date().toISOString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        log.eventType === 'AUTH_FAILURE' ? 'bg-rose-900/30 text-rose-400' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {log.eventType || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{log.user || 'system'}</td>
                    <td className="px-4 py-3 text-slate-400">{log.details || ''}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
