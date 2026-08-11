"use client";
import React, { useEffect, useState } from 'react';
import { fetchAPI } from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        const data = await fetchAPI('/api/v1/admin/users');
        setUsers(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch users');
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, []);

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
            <div className="text-sm text-slate-400">Total Users: {users.length}</div>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading users...</div>
          ) : error ? (
            <div className="p-8 text-center text-rose-400">{error}</div>
          ) : (
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
                {users.map((u, i) => (
                  <tr key={u.id || i} className="hover:bg-slate-800/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300">
                        {u.role || 'User'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{u.storage || '0 GB'}</td>
                    <td className="px-4 py-3">{u.rps || 0}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.status === 'Active' ? 'bg-emerald-900/30 text-emerald-400' :
                        u.status === 'Suspended' ? 'bg-rose-900/30 text-rose-400' : 'bg-amber-900/30 text-amber-400'
                      }`}>
                        {u.status || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium mr-3">Edit</button>
                      <button className="text-rose-400 hover:text-rose-300 text-sm font-medium">Suspend</button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No users found.</td>
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
