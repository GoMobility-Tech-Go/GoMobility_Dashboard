import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

// S3 SPA routing: 404.html stores the original path in sessionStorage,
// then redirects to /. We restore it here so React Router lands on the right page.
(function restoreSpaPath() {
  const redirect = sessionStorage.getItem('spa_redirect');
  if (redirect) {
    sessionStorage.removeItem('spa_redirect');
    window.history.replaceState(null, '', redirect);
  }
})();

// Local CRM testing only: http://localhost:5173/?devLogin=super_admin | admin | ops_team
// Needs the CRM backend running with `npm run dev:local` (DEV_AUTH). import.meta.env.DEV is false in
// production builds, so Vite removes this block entirely.
if (import.meta.env.DEV) {
  const role = new URLSearchParams(window.location.search).get("devLogin");
  if (["super_admin", "admin", "ops_team"].includes(role)) {
    localStorage.setItem("access_token", `dev-${role}`);
    localStorage.setItem("admin_user", JSON.stringify({
      id: `dev-${role}`, name: `Local ${role.replace("_", " ")}`, role: role === "super_admin" ? "Super Admin" : "Admin", initials: "LT",
    }));
    window.history.replaceState(null, "", "/crm");
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </>
);