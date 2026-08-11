import React from 'react';

const mockUsers = [
  { id: 1, email: 'alice@example.com', role: 'Enterprise', storage: '120 GB', rps: 450, status: 'Active' },
  { id: 2, email: 'bob@startup.io', role: 'Pro', storage: '15 GB', rps: 80, status: 'Active' },
  { id: 3, email: 'charlie@dev.local', role: 'Free', storage: '1.2 GB', rps: 5, status: 'Suspended' },
  { id: 4, email: 'diana@corp.com', role: 'Enterprise', storage: '850 GB', rps: 1200, status: 'Active' },
  { id: 5, email: 'evan@test.net', role: 'Pro', storage: '45 GB', rps: 120, status: 'Warning' },
];

export default function AdminUsersPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-white">User Management</h1>
          <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
            Invite User
          </button>
        </header>

        <div className="bg-[#0F172A] border border-slate-800 rounded-lg">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <div className="flex space-x-2">
              <input type="text" placeholder="Filter by email..." className="bg-[#020617] border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500 w-64" />
              <select className="bg-[#020617] border border-slate-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500">
                <option>All Roles</option>
                <option>Enterprise</option>
                <option>Pro</option>
                <option>Free</option>
              </select>
            </div>
            <div className="text-sm text-slate-400">Total Users: 1,248</div>
          </div>
          
          <table className="w-full text-left text-sm">
            <thead className="bg-[#020617]/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Storage Used</th>
                <th className="px-4 py-3 font-medium">Avg RPS</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {mockUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-white">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">{u.storage}</td>
                  <td className="px-4 py-3">{u.rps}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.status === 'Active' ? 'bg-emerald-900/30 text-emerald-400' :
                      u.status === 'Suspended' ? 'bg-rose-900/30 text-rose-400' : 'bg-amber-900/30 text-amber-400'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium mr-3">Edit</button>
                    <button className="text-rose-400 hover:text-rose-300 text-sm font-medium">Suspend</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
