
import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/sidebar/Sidebar";

/* ── sidebar pixel widths ── */
const FULL = 268;
const COLL = 76;

/* ── detect lg breakpoint (≥ 1024px) ── */
function useIsDesktop() {
  const [yes, setYes] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const h = (e) => setYes(e.matches);
    mq.addEventListener("change", h);
    setYes(mq.matches);
    return () => mq.removeEventListener("change", h);
  }, []);
  return yes;
}

/* ══════════════════════════════════════════════════
   MainLayout
   ▸ Desktop  → sidebar is fixed; main content margin-
     left equals sidebar width so they never overlap.
   ▸ Mobile   → sidebar slides in as an overlay;
     content stays full-width (marginLeft = 0).
══════════════════════════════════════════════════ */
const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const isDesktop = useIsDesktop();

  const sidebarWidth = desktopCollapsed ? COLL : FULL;

  // Pure JS margin — zero conflict with Tailwind or inline style precedence.
  const contentMarginLeft = isDesktop ? sidebarWidth : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg,#010917 0%,#020D26 25%,#04122E 55%,#030C22 80%,#010917 100%)",
        backgroundAttachment: "fixed",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── decorative grid ── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(212,175,55,0.022) 1px,transparent 1px)," +
            "linear-gradient(90deg,rgba(212,175,55,0.022) 1px,transparent 1px)",
          backgroundSize: "58px 58px",
        }}
      />

      {/* ── ambient blue blob top-left ── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          top: -200,
          left: -200,
          width: 560,
          height: 560,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(30,80,200,0.13) 0%,transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── ambient gold blob bottom-right ── */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: -120,
          right: -100,
          width: 480,
          height: 480,
          borderRadius: "50%",
          background:
            "radial-gradient(circle,rgba(212,175,55,0.07) 0%,transparent 65%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ── SIDEBAR ── */}
      <Sidebar
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        desktopCollapsed={desktopCollapsed}
        setDesktopCollapsed={setDesktopCollapsed}
        sidebarWidth={sidebarWidth}
      />

      {/* ── MAIN CONTENT ──
          marginLeft is 100 % JavaScript-driven.
          No Tailwind class touches margin here, so there is
          absolutely no specificity / precedence conflict.
      ── */}
   <main
  style={{
    position: "relative",
    zIndex: 1,
    minHeight: "100vh",
    marginLeft: contentMarginLeft,
    transition: "margin-left 0.32s cubic-bezier(0.4,0,0.2,1)",
    width: isDesktop ? `calc(100% - ${contentMarginLeft}px)` : "100%",
    maxWidth: "100%",
    overflowX: "hidden",
  }}
>
        {/* inner padding — more room on desktop, compact on mobile */}
        <div
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: isDesktop ? "28px 36px 44px 36px" : "16px 14px 36px 14px",
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;