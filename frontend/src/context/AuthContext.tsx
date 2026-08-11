"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";

type Role = "admin" | "user" | null;

interface AuthContextType {
  username: string | null;
  role: Role;
  login: (username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<Role>(null);
  const router = useRouter();

  // Load from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("aroradb_user");
    const storedRole = localStorage.getItem("aroradb_role");
    if (storedUser && storedRole) {
      setUsername(storedUser);
      setRole(storedRole as Role);
    }
  }, []);

  const login = (user: string) => {
    let assignedRole: Role = null;
    if (user.toLowerCase() === "bhawuk") {
      assignedRole = "admin";
    } else if (user.toLowerCase() === "mukul") {
      assignedRole = "user";
    } else {
      // default generic fallback for demo if someone else tries
      assignedRole = "user";
    }

    setUsername(user);
    setRole(assignedRole);
    localStorage.setItem("aroradb_user", user);
    localStorage.setItem("aroradb_role", assignedRole);

    // Redirect to respective portal
    if (assignedRole === "admin") {
      router.push("/admin");
    } else {
      router.push("/user");
    }
  };

  const logout = () => {
    setUsername(null);
    setRole(null);
    localStorage.removeItem("aroradb_user");
    localStorage.removeItem("aroradb_role");
    router.push("/login");
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
