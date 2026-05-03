import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const AuthContext = createContext(null);

const ALLOWED_USERS = [
  {
    role: "Admin",
    name: "Admin User",
    email: "admin@gomobility.com",
    password: "admin123",
    initials: "AM",
  },
  {
    role: "Super Admin",
    name: "Super Admin",
    email: "superadmin@gomobility.com",
    password: "super123",
    initials: "SA",
  },
];

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("goMobilityUser");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    // If access token exists but no stored user, fetch profile from API and restore session.
    const access = localStorage.getItem('goMobilityAccessToken');
    const storedUser = localStorage.getItem('goMobilityUser');
    let mounted = true;
    if (access && !storedUser) {
      api.getProfile()
        .then((res) => {
          if (!mounted) return;
          const data = res?.data || res || {};
          const apiUser = data.user || data;
          if (!apiUser) return;
          // Preserve existing tokens from storage when restoring
          const refresh = localStorage.getItem('goMobilityRefreshToken');
          loginWithToken({ accessToken: access, refreshToken: refresh, user: apiUser });
        })
        .catch(() => {
          // ignore profile fetch errors; user stays logged out
        });
    }
    return () => { mounted = false; };
  }, []);

  const signup = ({ fullName, email, password, role }) => {
    const matchedUser = ALLOWED_USERS.find(
      (item) =>
        item.email.toLowerCase() === email.toLowerCase() &&
        item.password === password &&
        item.role === role
    );

    if (!matchedUser) {
      return {
        success: false,
        message:
          "Only Admin or Super Admin allowed credentials can sign up in this dashboard.",
      };
    }

    const nextUser = {
      name: fullName || matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
      initials: matchedUser.initials,
    };

    localStorage.setItem("goMobilityUser", JSON.stringify(nextUser));
    localStorage.setItem("goMobilitySignedUp", "true");
    return { success: true, user: nextUser };
  };

  const login = ({ email, password }) => {
    const matchedUser = ALLOWED_USERS.find(
      (item) =>
        item.email.toLowerCase() === email.toLowerCase() &&
        item.password === password
    );

    if (!matchedUser) {
      return {
        success: false,
        message: "Invalid credentials. Use Admin or Super Admin account.",
      };
    }

    const nextUser = {
      name: matchedUser.name,
      email: matchedUser.email,
      role: matchedUser.role,
      initials: matchedUser.initials,
    };

    setUser(nextUser);
    localStorage.setItem("goMobilityUser", JSON.stringify(nextUser));
    return { success: true, user: nextUser };
  };

  // Accepts API response tokens and user object
  const loginWithToken = ({ accessToken, refreshToken, user: apiUser }) => {
    if (!accessToken || !apiUser) {
      return { success: false, message: 'Missing token or user' };
    }
    try {
      localStorage.setItem('goMobilityAccessToken', accessToken);
      if (refreshToken) localStorage.setItem('goMobilityRefreshToken', refreshToken);
      const nextUser = {
        id: apiUser.id,
        fullName: apiUser.fullName || apiUser.name || apiUser.full_name,
        email: apiUser.email,
        phone: apiUser.phone,
        role: apiUser.role,
        isActive: apiUser.isActive,
        isVerified: apiUser.isVerified,
      };
      setUser(nextUser);
      localStorage.setItem('goMobilityUser', JSON.stringify(nextUser));
      return { success: true, user: nextUser };
    } catch (err) {
      return { success: false, message: err.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("goMobilityUser");
    localStorage.removeItem('goMobilityAccessToken');
    localStorage.removeItem('goMobilityRefreshToken');
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      signup,
      login,
      loginWithToken,
      logout,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);