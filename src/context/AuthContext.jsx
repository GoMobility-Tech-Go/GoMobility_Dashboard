import { createContext, useContext, useEffect, useMemo, useState } from "react";

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
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("goMobilityUser");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
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

  const logout = () => {
    setUser(null);
    localStorage.removeItem("goMobilityUser");
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      signup,
      login,
      logout,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);