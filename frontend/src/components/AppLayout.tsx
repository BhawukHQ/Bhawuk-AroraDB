"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { username, role, logout } = useAuth();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Simple client-side route protection
    if (pathname !== "/login") {
      const storedRole = localStorage.getItem("aroradb_role");
      if (!storedRole) {
        window.location.href = "/login";
      } else if (pathname.startsWith("/admin") && storedRole !== "admin") {
        window.location.href = "/user";
      } else if (pathname.startsWith("/user") && storedRole !== "user") {
        window.location.href = "/admin";
      }
    }
  }, [pathname]);

  // Do not render layout properly until client-side hydration (so context is ready)
  if (!isMounted) return null;

  // Don't show layout on login page
  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="grid grid-cols-12 min-h-screen bg-[#020617] text-white">
      {/* Sidebar */}
      <aside className={`bg-[#0F172A] flex flex-col transition-all duration-300 ${collapsed ? "col-span-1" : "col-span-2"} border-r border-slate-800`}>
        <div className="p-4 border-b border-slate-800 flex justify-between items-center h-16">
          {!collapsed && <span className="font-bold text-lg text-[#6366F1] truncate">Bhawuk-AroraDB</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-slate-700 rounded text-slate-300 mx-auto">
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
          {role === "admin" && (
            <>
              <Link href="/admin" className={`block p-2 rounded transition-colors hover:bg-slate-800 ${pathname === "/admin" ? "bg-slate-800 text-[#6366F1] font-medium" : "text-slate-300"}`}>
                {collapsed ? "A" : "Admin Dashboard"}
              </Link>
              <Link href="/admin/users" className={`block p-2 pl-6 text-sm rounded transition-colors hover:bg-slate-800 ${pathname === "/admin/users" ? "text-[#6366F1]" : "text-slate-400"}`}>
                {collapsed ? "U" : "Tenant Management"}
              </Link>
              <Link href="/admin/audit" className={`block p-2 pl-6 text-sm rounded transition-colors hover:bg-slate-800 ${pathname === "/admin/audit" ? "text-[#6366F1]" : "text-slate-400"}`}>
                {collapsed ? "L" : "Audit Logs"}
              </Link>
            </>
          )}
          {role === "user" && (
            <>
              <Link href="/user" className={`block p-2 rounded transition-colors hover:bg-slate-800 ${pathname === "/user" ? "bg-slate-800 text-[#6366F1] font-medium" : "text-slate-300"}`}>
                {collapsed ? "U" : "User Workspace"}
              </Link>
              <Link href="/user/console" className={`block p-2 pl-6 text-sm rounded transition-colors hover:bg-slate-800 ${pathname === "/user/console" ? "text-[#6366F1]" : "text-slate-400"}`}>
                {collapsed ? "C" : "Multi-Model Console"}
              </Link>
              <Link href="/user/keys" className={`block p-2 pl-6 text-sm rounded transition-colors hover:bg-slate-800 ${pathname === "/user/keys" ? "text-[#6366F1]" : "text-slate-400"}`}>
                {collapsed ? "K" : "API Keys"}
              </Link>
            </>
          )}
          <Link href="/" className={`block p-2 rounded transition-colors hover:bg-slate-800 ${pathname === "/" ? "bg-slate-800 text-[#6366F1] font-medium" : "text-slate-300 mt-4"}`}>
              {collapsed ? "H" : "Home"}
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          {!collapsed ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400 truncate max-w-[100px]">{username} ({role})</span>
              <button 
                onClick={logout}
                className="text-xs font-semibold bg-slate-800 px-3 py-1.5 rounded border border-slate-700 hover:border-red-500 hover:text-red-400 transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
                onClick={logout}
                className="w-full text-xs font-semibold bg-slate-800 p-1.5 rounded border border-slate-700 hover:border-red-500 hover:text-red-400 transition-colors flex justify-center"
                title="Logout"
              >
                L
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex flex-col ${collapsed ? "col-span-11" : "col-span-10"}`}>
        <header className="bg-[#0F172A] border-b border-slate-800 p-4 flex justify-between items-center h-16">
          <h1 className="text-lg font-semibold text-slate-200">
            {role === "admin" ? "System Administration" : "Developer Workspace"}
          </h1>
          <div className="text-sm text-slate-400 flex items-center gap-2">
            Status: <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 inline-block"></span> Online</span>
          </div>
        </header>
        <div className="p-6 flex-1 overflow-auto bg-[#020617]">
          {children}
        </div>
      </main>
    </div>
  );
}
