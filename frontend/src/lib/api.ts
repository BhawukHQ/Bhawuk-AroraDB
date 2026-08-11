export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

export async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  // Use mock token for now since AuthContext relies on localStorage role
  const role = typeof window !== 'undefined' ? localStorage.getItem("aroradb_role") : null;
  const token = role === "admin" ? "admin_token" : (role === "user" ? "user_token" : "");

  const defaultHeaders = {
    "Content-Type": "application/json",
    ...(token ? { "X-Arora-Token": token } : {}),
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined') {
      // Force logout on 401
      localStorage.removeItem("aroradb_role");
      localStorage.removeItem("aroradb_user");
      window.location.href = "/login";
    }
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || `API error: ${response.status}`);
  }

  return response.json();
}
