"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

type Role = "admin" | "user" | null;

interface AuthContextType {
  username: string | null;
  role: Role;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const router = useRouter();

  // Helper to read cookie by name
  const getCookie = (name: string) => {
    if (typeof document === "undefined") return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
    return null;
  };

  // Load from cookies on mount
  useEffect(() => {
    const storedUser = getCookie("aroradb_user");
    const storedRole = getCookie("aroradb_role");
    
    if (storedUser && storedRole) {
      setUsername(storedUser);
      setRole(storedRole as Role);
    }
  }, []);

  const login = () => {
    // Redirect to backend Cognito login endpoint
    // Assuming backend is on localhost:8080 or same domain in prod
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
    window.location.href = `${backendUrl}/api/auth/cognito/login`;
  };

  const logout = () => {
    setUsername(null);
    setRole(null);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
    window.location.href = `${backendUrl}/api/auth/cognito/logout`;
  };

  return (
    <AuthContext.Provider value={{ username, role, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
