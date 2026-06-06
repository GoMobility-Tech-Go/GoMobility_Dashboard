import { createContext, useContext, useMemo, useState } from "react";
import { logoutApi } from "../api/auth";

const AuthContext = createContext(null);

function normalizeRole(raw) {
  if (!raw) return "Admin";
  const r = String(raw).toLowerCase().replace(/[-_\s]+/g, "");
  if (r === "superadmin") return "Super Admin";
  return "Admin";
}

function buildInitials(name) {
  if (!name) return "AD";
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("admin_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Called after OTP verify succeeds — save token + user
  const loginWithToken = ({ accessToken, refreshToken, user: apiUser }) => {
    if (!accessToken || !apiUser) {
      return { success: false, message: "Missing token or user" };
    }
    // Only allow admin / super admin
    const rawRole = apiUser.role || "";
    const role = normalizeRole(rawRole);

    try {
      localStorage.setItem("access_token", accessToken);
      if (refreshToken) localStorage.setItem("refresh_token", refreshToken);

      const name =
        apiUser.fullName || apiUser.name || apiUser.full_name || "Admin";
      const nextUser = {
        id: apiUser.id,
        name,
        email: apiUser.email || null,
        phone: apiUser.phone_number || apiUser.phone || null,
        role,
        initials: buildInitials(name),
        isActive: apiUser.is_active ?? apiUser.isActive,
      };
      setUser(nextUser);
      localStorage.setItem("admin_user", JSON.stringify(nextUser));
      return { success: true, user: nextUser };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const logout = () => {
    logoutApi();
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("admin_user");
    // clean up old keys from previous auth implementation
    localStorage.removeItem("goMobilityAccessToken");
    localStorage.removeItem("goMobilityRefreshToken");
    localStorage.removeItem("goMobilityUser");
  };

  const value = useMemo(
    () => ({ user, isAuthenticated: !!user, loginWithToken, logout }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
