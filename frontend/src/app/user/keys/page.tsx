import React from 'react';

const mockKeys = [
  { id: 'key_1', name: 'Production Backend API', prefix: 'ar_live_a8f...', scopes: ['read:sql', 'write:sql'], ips: 'Any', created: '2026-07-15' },
  { id: 'key_2', name: 'Staging Vector Search', prefix: 'ar_test_b92...', scopes: ['read:vector'], ips: '192.168.1.0/24', created: '2026-08-01' },
];

export default function ApiKeysPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 font-sans">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Key List */}
        <div className="lg:col-span-2 space-y-6">
          <header className="flex justify-between items-center">
            <h1 className="text-2xl font-semibold tracking-tight text-white">API Keys</h1>
          </header>
          
          <div className="bg-[#0F172A] border border-slate-800 rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#020617]/50 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Key Prefix</th>
                  <th className="px-4 py-3 font-medium">Scopes</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {mockKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-4 font-medium text-white">{k.name}</td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-400">{k.prefix}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map(s => (
                          <span key={s} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 border border-slate-700 text-slate-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button className="text-rose-400 hover:text-rose-300 text-xs font-medium">Revoke</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col: Create Form */}
        <div className="lg:col-span-1">
          <div className="bg-[#0F172A] border border-slate-800 rounded-lg p-5 sticky top-6">
            <h2 className="text-lg font-medium text-white mb-4">Create New Key</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Key Name</label>
                <input type="text" placeholder="e.g. Analytics Script" className="w-full bg-[#020617] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white" />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">Permissions (Scopes)</label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input type="checkbox" className="rounded bg-[#020617] border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                    <span>read:sql</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input type="checkbox" className="rounded bg-[#020617] border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                    <span>write:sql</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input type="checkbox" className="rounded bg-[#020617] border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                    <span>read:doc</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input type="checkbox" className="rounded bg-[#020617] border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                    <span>write:doc</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm cursor-pointer">
                    <input type="checkbox" className="rounded bg-[#020617] border-slate-700 text-indigo-600 focus:ring-indigo-500" />
                    <span>read:vector</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">IP Whitelist (Optional)</label>
                <input type="text" placeholder="e.g. 192.168.1.1/32, 10.0.0.0/8" className="w-full bg-[#020617] border border-slate-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-white" />
              </div>

              <div className="pt-2">
                <button type="button" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
                  Generate Key
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
