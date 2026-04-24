import { useState } from "react";
import {
  Bell,
  Lock,
  Mail,
  Shield,
  User,
  Moon,
  Eye,
  Settings as SettingsIcon,
  ChevronRight,
  Laptop,
  Smartphone,
  Globe,
  KeyRound,
  BadgeCheck,
  Database,
  Palette,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  CartesianGrid,
} from "recharts";

const notificationUsage = [
  { name: "Email", value: 52, color: "#D4AF37" },
  { name: "SMS", value: 18, color: "#60A5FA" },
  { name: "Push", value: 30, color: "#34D399" },
];

const deviceActivity = [
  { name: "Desktop", value: 64 },
  { name: "Mobile", value: 24 },
  { name: "Tablet", value: 12 },
];

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@1,400&family=Outfit:wght@300;400;500;600;700&display=swap');

    *, *::before, *::after {
      box-sizing: border-box;
    }

    .dbc{
      background:linear-gradient(145deg,rgba(255,255,255,0.048) 0%,rgba(255,255,255,0.012) 100%);
      border:1px solid rgba(212,175,55,0.17);
      border-radius:20px;
      backdrop-filter:blur(14px);
      position:relative;
      overflow:hidden;
      transition:transform .32s cubic-bezier(.22,1,.36,1),box-shadow .32s,border-color .32s;
      min-width:0;
    }

    .dbc::before{
      content:'';
      position:absolute;
      top:0;
      left:0;
      right:0;
      height:1px;
      background:linear-gradient(90deg,transparent,rgba(212,175,55,0.38),transparent);
    }

    .dbc:hover{
      transform:translateY(-3px);
      border-color:rgba(212,175,55,0.34);
      box-shadow:0 24px 64px rgba(0,0,0,0.48);
    }

    .dbm{
      background:linear-gradient(145deg,rgba(255,255,255,0.05) 0%,rgba(255,255,255,0.012) 100%);
      border:1px solid rgba(212,175,55,0.16);
      border-radius:20px;
      backdrop-filter:blur(12px);
      position:relative;
      overflow:hidden;
      transition:transform .32s cubic-bezier(.22,1,.36,1),box-shadow .32s,border-color .32s;
      min-width:0;
    }

    .dbm::before{
      content:'';
      position:absolute;
      top:0;
      left:0;
      right:0;
      height:1px;
      background:linear-gradient(90deg,transparent,rgba(212,175,55,0.34),transparent);
    }

    .dbm:hover{
      transform:translateY(-4px);
      border-color:rgba(212,175,55,0.36);
      box-shadow:0 28px 70px rgba(0,0,0,0.52);
    }

    .bup{
      display:inline-flex;
      align-items:center;
      gap:4px;
      background:rgba(212,175,55,0.12);
      border:1px solid rgba(212,175,55,0.28);
      color:#D4AF37;
      border-radius:999px;
      padding:4px 9px;
      font-size:10px;
      font-weight:600;
      font-family:'Outfit',sans-serif;
      white-space:nowrap;
    }

    .ldot{
      display:inline-block;
      width:7px;
      height:7px;
      border-radius:50%;
      background:#D4AF37;
      flex-shrink:0;
      animation:pdot 2.4s ease-in-out infinite;
    }

    @keyframes pdot{
      0%,100%{box-shadow:0 0 0 0 rgba(212,175,55,.5)}
      50%{box-shadow:0 0 0 7px rgba(212,175,55,0)}
    }

    @keyframes fup{
      from{opacity:0;transform:translateY(22px)}
      to{opacity:1;transform:translateY(0)}
    }

    .fup{
      animation:fup .65s cubic-bezier(.22,1,.36,1) both;
    }

    @keyframes shim{
      0%{background-position:-200% center}
      100%{background-position:200% center}
    }

    .shim{
      background:linear-gradient(90deg,#D4AF37 0%,#f7dc6f 35%,#D4AF37 55%,#b8920f 100%);
      background-size:200% auto;
      -webkit-background-clip:text;
      -webkit-text-fill-color:transparent;
      background-clip:text;
      animation:shim 5s linear infinite;
    }

    .topGrid{
      display:grid;
      grid-template-columns:1fr;
      gap:18px;
      margin-bottom:20px;
    }

    @media(min-width:1100px){
      .topGrid{
        grid-template-columns:minmax(0,1.15fr) minmax(320px,.85fr);
      }
    }

    .mainGrid{
      display:grid;
      grid-template-columns:1fr;
      gap:18px;
    }

    @media(min-width:1200px){
      .mainGrid{
        grid-template-columns:minmax(0,1.5fr) minmax(320px,.9fr);
      }
    }

    .stack{
      display:grid;
      gap:18px;
    }

    .inputDark{
      width:100%;
      height:44px;
      border-radius:12px;
      border:1px solid rgba(212,175,55,0.14);
      background:rgba(255,255,255,0.04);
      color:#fff;
      padding:0 14px;
      outline:none;
      transition:border-color .2s, box-shadow .2s, background .2s;
      font-size:14px;
      font-family:'Outfit',sans-serif;
    }

    .inputDark:focus{
      border-color:rgba(212,175,55,0.34);
      box-shadow:0 0 0 4px rgba(212,175,55,0.08);
      background:rgba(255,255,255,0.055);
    }

    .inputDark::placeholder{
      color:rgba(255,255,255,0.24);
    }

    .sectionBox{
      border-radius:16px;
      background:rgba(255,255,255,0.03);
      border:1px solid rgba(212,175,55,0.1);
      padding:14px 14px;
    }

    .optBtn{
      width:100%;
      border:none;
      border-radius:14px;
      background:rgba(255,255,255,0.03);
      border:1px solid rgba(212,175,55,0.1);
      padding:13px 14px;
      color:#fff;
      text-align:left;
      transition:all .22s ease;
      cursor:pointer;
    }

    .optBtn:hover{
      background:rgba(255,255,255,0.05);
      border-color:rgba(212,175,55,0.2);
      transform:translateX(3px);
    }

    .recharts-cartesian-axis-tick-value{
      font-family:'Outfit',sans-serif;
    }
  `}</style>
);

function SectionTitle({ sub, main }) {
  return (
    <div style={{ minWidth: 0 }}>
      <p
        style={{
          fontFamily: "'Cinzel',serif",
          fontSize: 8.5,
          letterSpacing: 2.5,
          color: "rgba(212,175,55,0.4)",
          textTransform: "uppercase",
          margin: "0 0 4px",
        }}
      >
        {sub}
      </p>
      <h2
        style={{
          fontFamily: "'Cinzel',serif",
          fontSize: "clamp(14px,1.8vw,18px)",
          fontWeight: 700,
          color: "#fff",
          letterSpacing: -0.3,
          margin: 0,
        }}
      >
        {main}
      </h2>
    </div>
  );
}

function Toggle({ enabled, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-label="Toggle setting"
      style={{
        position: "relative",
        width: 44,
        height: 26,
        borderRadius: 999,
        border: "none",
        background: enabled
          ? "linear-gradient(90deg,#D4AF37,#f7dc6f)"
          : "rgba(255,255,255,0.16)",
        cursor: "pointer",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: enabled ? 21 : 3,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: enabled ? "#081327" : "#fff",
          transition: "left .22s ease",
        }}
      />
    </button>
  );
}

function RightCard({ icon: Icon, title, children }) {
  return (
    <div className="dbc" style={{ padding: "20px 22px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 10,
            background: "rgba(212,175,55,0.12)",
            border: "1px solid rgba(212,175,55,0.22)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon size={15} color="#D4AF37" />
        </div>

        <h2
          style={{
            margin: 0,
            fontFamily: "'Cinzel',serif",
            fontSize: 16,
            fontWeight: 700,
            color: "#fff",
            letterSpacing: -0.2,
          }}
        >
          {title}
        </h2>
      </div>

      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function OptionCard({ title, description }) {
  return (
    <button type="button" className="optBtn">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            {title}
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 11,
              color: "rgba(255,255,255,0.34)",
              fontFamily: "'Outfit',sans-serif",
            }}
          >
            {description}
          </p>
        </div>

        <ChevronRight size={15} color="rgba(212,175,55,0.7)" />
      </div>
    </button>
  );
}

function InfoRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
      }}
    >
      <span
        style={{
          fontSize: 12,
          color: "rgba(255,255,255,0.38)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 12.5,
          fontWeight: 600,
          color: "#fff",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function NotificationRow({ title, description, enabled, onChange }) {
  return (
    <div
      className="sectionBox"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
          }}
        >
          {title}
        </p>
        <p
          style={{
            margin: "4px 0 0",
            fontSize: 11,
            color: "rgba(255,255,255,0.34)",
          }}
        >
          {description}
        </p>
      </div>

      <Toggle enabled={enabled} onChange={onChange} />
    </div>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0];
  return (
    <div
      style={{
        background: "rgba(4,18,46,0.96)",
        border: "1px solid rgba(212,175,55,0.22)",
        borderRadius: 12,
        padding: "10px 12px",
        backdropFilter: "blur(12px)",
        boxShadow: "0 14px 28px rgba(0,0,0,0.35)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: 11,
          color: "#fff",
          fontWeight: 600,
        }}
      >
        {item.name}: {item.value}%
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);
  const [pushNotifications, setPushNotifications] = useState(true);

  const [darkMode, setDarkMode] = useState(true);
  const [activityTracking, setActivityTracking] = useState(true);
  const [backupSync, setBackupSync] = useState(true);

  return (
    <>
      <GlobalStyles />

      <div
        style={{
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          fontFamily: "'Outfit',sans-serif",
        }}
      >
        {/* HEADER */}
        <div className="fup topGrid" style={{ animationDelay: "0ms" }}>
          <div className="dbc" style={{ padding: "20px 22px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
                flexWrap: "wrap",
              }}
            >
              <span className="ldot" />
              <p
                style={{
                  fontFamily: "'Cinzel',serif",
                  fontSize: 9,
                  letterSpacing: 3,
                  color: "rgba(212,175,55,0.44)",
                  textTransform: "uppercase",
                  margin: 0,
                }}
              >
                GO Mobility · Preferences Center
              </p>
            </div>

            <h1
              style={{
                fontFamily: "'Cinzel',serif",
                fontSize: "clamp(24px,4.6vw,46px)",
                fontWeight: 900,
                lineHeight: 1.05,
                letterSpacing: "-0.03em",
                margin: "0 0 10px",
              }}
            >
              <span style={{ color: "#fff" }}>Settings </span>
              <span className="shim">Dashboard</span>
            </h1>

            <p
              style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontStyle: "italic",
                fontSize: "clamp(14px,1.4vw,18px)",
                color: "rgba(212,175,55,0.5)",
                lineHeight: 1.7,
                margin: 0,
                maxWidth: 640,
              }}
            >
              Manage your account and platform preferences with a refined control center for profile, security, notifications, and system settings.
            </p>
          </div>

          <div
            className="dbc"
            style={{
              padding: "20px 22px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              gap: 14,
            }}
          >
            <div>
              <SectionTitle sub="Quick Overview" main="Settings Snapshot" />
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.34)",
                }}
              >
                Profile details, notification channels, platform access, and security preferences are all available from one unified dashboard.
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <span className="bup">
                <BadgeCheck size={10} />
                Admin Active
              </span>
              <span className="bup">
                <KeyRound size={10} />
                Security Ready
              </span>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <section className="mainGrid fup" style={{ animationDelay: "90ms" }}>
          {/* LEFT SIDE */}
          <div className="stack">
            {/* ACCOUNT INFORMATION */}
            <div className="dbc" style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "rgba(212,175,55,0.12)",
                    border: "1px solid rgba(212,175,55,0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <User size={15} color="#D4AF37" />
                </div>
                <SectionTitle sub="Profile" main="Account Information" />
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: 11.5,
                      color: "rgba(255,255,255,0.44)",
                    }}
                  >
                    Full Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Admin User"
                    className="inputDark"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: 11.5,
                      color: "rgba(255,255,255,0.44)",
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    defaultValue="admin@gomobility.com"
                    className="inputDark"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: 11.5,
                      color: "rgba(255,255,255,0.44)",
                    }}
                  >
                    Phone Number
                  </label>
                  <input
                    type="text"
                    defaultValue="+91 98765 43210"
                    className="inputDark"
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: 11.5,
                      color: "rgba(255,255,255,0.44)",
                    }}
                  >
                    Role
                  </label>
                  <input
                    type="text"
                    defaultValue="Super Admin"
                    className="inputDark"
                    disabled
                    style={{
                      background: "rgba(255,255,255,0.025)",
                      color: "rgba(255,255,255,0.45)",
                    }}
                  />
                </div>

                <div style={{ paddingTop: 4 }}>
                  <button
                    type="button"
                    style={{
                      height: 42,
                      border: "1px solid rgba(212,175,55,0.24)",
                      borderRadius: 12,
                      background: "linear-gradient(135deg,rgba(212,175,55,0.18),rgba(212,175,55,0.08))",
                      color: "#D4AF37",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      fontSize: 13,
                      fontWeight: 600,
                      fontFamily: "'Outfit',sans-serif",
                      cursor: "pointer",
                      paddingInline: 18,
                    }}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>

            {/* NOTIFICATION PREFERENCES */}
            <div className="dbc" style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "rgba(212,175,55,0.12)",
                    border: "1px solid rgba(212,175,55,0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Bell size={15} color="#D4AF37" />
                </div>
                <SectionTitle sub="Alerts" main="Notification Preferences" />
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <NotificationRow
                  title="Email Alerts"
                  description="Receive important alerts via email"
                  enabled={emailAlerts}
                  onChange={() => setEmailAlerts((prev) => !prev)}
                />

                <NotificationRow
                  title="SMS Alerts"
                  description="Get critical updates via SMS"
                  enabled={smsAlerts}
                  onChange={() => setSmsAlerts((prev) => !prev)}
                />

                <NotificationRow
                  title="Push Notifications"
                  description="Allow instant browser notifications"
                  enabled={pushNotifications}
                  onChange={() => setPushNotifications((prev) => !prev)}
                />
              </div>
            </div>

            {/* EXTRA FEATURES */}
            <div className="dbc" style={{ padding: "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: "rgba(212,175,55,0.12)",
                    border: "1px solid rgba(212,175,55,0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <SettingsIcon size={15} color="#D4AF37" />
                </div>
                <SectionTitle sub="Enhancements" main="Additional Settings" />
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <NotificationRow
                  title="Dark Mode UI"
                  description="Use premium dark appearance across the dashboard"
                  enabled={darkMode}
                  onChange={() => setDarkMode((prev) => !prev)}
                />

                <NotificationRow
                  title="Activity Tracking"
                  description="Track admin usage for audits and analytics"
                  enabled={activityTracking}
                  onChange={() => setActivityTracking((prev) => !prev)}
                />

                <NotificationRow
                  title="Backup Sync"
                  description="Keep configuration synced across sessions"
                  enabled={backupSync}
                  onChange={() => setBackupSync((prev) => !prev)}
                />
              </div>
            </div>
          </div>

          {/* RIGHT SIDE */}
          <div className="stack">
            <RightCard icon={Lock} title="Security">
              <OptionCard
                title="Change Password"
                description="Update your password"
              />
              <OptionCard
                title="Two-Factor Auth"
                description="Enable 2FA for security"
              />
              <OptionCard
                title="Active Sessions"
                description="Manage your sessions"
              />
            </RightCard>

            <RightCard icon={Mail} title="Support">
              <OptionCard
                title="Help Center"
                description="Browse documentation"
              />
              <OptionCard
                title="Contact Support"
                description="Get help from our team"
              />
            </RightCard>

            <RightCard icon={Shield} title="Platform Info">
              <div className="sectionBox" style={{ display: "grid", gap: 10 }}>
                <InfoRow label="Version" value="v2.4.1" />
                <InfoRow label="Environment" value="Production" />
                <InfoRow label="Last Updated" value="Mar 17, 2026" />
              </div>
            </RightCard>

            {/* EXTRA PREMIUM ANALYTICS */}
            <RightCard icon={Palette} title="Notification Analytics">
              <div className="sectionBox">
                <div style={{ width: "100%", height: 190 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomTooltip />} />
                      <Pie
                        data={notificationUsage}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={36}
                        outerRadius={66}
                        paddingAngle={3}
                        stroke="transparent"
                        isAnimationActive
                        animationDuration={1400}
                      >
                        {notificationUsage.map((item) => (
                          <Cell key={item.name} fill={item.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  {notificationUsage.map((item) => (
                    <div
                      key={item.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 10,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 9,
                            height: 9,
                            borderRadius: 999,
                            background: item.color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 11.5,
                            color: "rgba(255,255,255,0.42)",
                          }}
                        >
                          {item.name}
                        </span>
                      </div>

                      <span
                        style={{
                          fontFamily: "'Cinzel',serif",
                          fontSize: 12.5,
                          fontWeight: 700,
                          color: item.color,
                        }}
                      >
                        {item.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </RightCard>

            <RightCard icon={Database} title="Device Activity">
              <div className="sectionBox">
                <div style={{ width: "100%", height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={deviceActivity} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: "rgba(255,255,255,0.42)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="value" name="Usage" radius={[8, 8, 0, 0]}>
                        <Cell fill="#D4AF37" />
                        <Cell fill="#60A5FA" />
                        <Cell fill="#34D399" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  <InfoRow label="Primary Device" value="Desktop" />
                  <InfoRow label="Secondary Device" value="Mobile" />
                  <InfoRow label="Region" value="India / IST" />
                </div>
              </div>
            </RightCard>

            {/* EXTRA SETTINGS OPTIONS */}
            <RightCard icon={Globe} title="System Preferences">
              <OptionCard
                title="Language & Locale"
                description="Manage language, format, and regional preferences"
              />
              <OptionCard
                title="Theme Presets"
                description="Choose interface style presets for dashboard visuals"
              />
              <OptionCard
                title="Connected Devices"
                description="Review active browsers and trusted access points"
              />
            </RightCard>

            <RightCard icon={Laptop} title="Workspace Controls">
              <OptionCard
                title="Dashboard Layout"
                description="Customize your overview layout and widgets"
              />
              <OptionCard
                title="Quick Actions"
                description="Control which shortcuts appear on your dashboard"
              />
              <OptionCard
                title="Mobile Access"
                description="Manage mobile admin device visibility and alerts"
              />
            </RightCard>

            <RightCard icon={Smartphone} title="Admin Features">
              <OptionCard
                title="Role Permissions"
                description="Review access levels for managers and operators"
              />
              <OptionCard
                title="System Logs"
                description="Inspect audit events and activity history"
              />
              <OptionCard
                title="Security Policies"
                description="Apply enterprise security standards and rules"
              />
            </RightCard>
          </div>
        </section>
      </div>
    </>
  );
}