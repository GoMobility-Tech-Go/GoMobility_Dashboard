import { useState } from "react";
import {
  useToast,
  ToastProvider,
  PageWrapper,
  Card,
  MiniStatRow,
  GlobalStyles,
  FormGroup,
  Toggle,
  AlertBox,
} from "../../components/ui/index.jsx";

const FEATURE_FLAGS = [
  {
    key: "ride_scheduling",
    label: "Ride Scheduling",
    desc: "Allow users to schedule rides in advance",
    enabled: true,
  },
  {
    key: "cab_sharing",
    label: "Cab Sharing / Pool",
    desc: "Enable cab-sharing feature for cost splitting",
    enabled: false,
  },
  {
    key: "wallet_pay",
    label: "Wallet Payments",
    desc: "Allow wallet balance as payment method",
    enabled: true,
  },
  {
    key: "surge_pricing",
    label: "Surge Pricing",
    desc: "Dynamic fare multiplier during high demand",
    enabled: true,
  },
  {
    key: "sos_button",
    label: "SOS Emergency Button",
    desc: "In-app SOS button for passenger safety",
    enabled: true,
  },
  {
    key: "driver_chat",
    label: "Driver-User In-App Chat",
    desc: "Allow messaging between driver and passenger",
    enabled: false,
  },
  {
    key: "ride_later",
    label: "Ride Later Feature",
    desc: "Schedule rides up to 24 hours in advance",
    enabled: true,
  },
  {
    key: "referral_system",
    label: "Referral System",
    desc: "User referral bonus program",
    enabled: true,
  },
  {
    key: "ai_route",
    label: "AI Route Optimization",
    desc: "Smart routing using ML model",
    enabled: false,
  },
  {
    key: "subscription",
    label: "GO Pass Subscriptions",
    desc: "Monthly and annual ride passes",
    enabled: true,
  },
  {
    key: "driver_rating",
    label: "Driver Rating System",
    desc: "Post-ride rating and review feature",
    enabled: true,
  },
  {
    key: "promo_codes",
    label: "Promo Codes",
    desc: "Discount promo code entry at checkout",
    enabled: true,
  },
];

function Content() {
  const toast = useToast();

  const [flags, setFlags] = useState(FEATURE_FLAGS);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(false);
  const [minVersion, setMinVersion] = useState("2.4.1");
  const [currentVersion, setCurrentVersion] = useState("2.8.0");
  const [maintenanceMsg, setMaintenanceMsg] = useState(
    "We are performing scheduled maintenance. Back in 30 minutes!"
  );
  const [rateLimit, setRateLimit] = useState("100");
  const [sessionTimeout, setSessionTimeout] = useState("30");

  const toggleFlag = (key) => {
    const flag = flags.find((f) => f.key === key);

    setFlags(
      flags.map((f) =>
        f.key === key ? { ...f, enabled: !f.enabled } : f
      )
    );

    toast(
      `Feature "${flag?.label}" ${flag?.enabled ? "disabled" : "enabled"}!`,
      flag?.enabled ? "error" : "success"
    );
  };

  const saveConfig = (section) => {
    if (maintenanceMode) {
      toast(
        "⚠️ MAINTENANCE MODE ACTIVATED — App is now unreachable for users!",
        "warning"
      );
    } else {
      toast(`${section} configuration saved successfully!`, "success");
    }
  };

  return (
    <PageWrapper
      title="App Version & Config Management"
      subtitle="Force updates, feature flags, maintenance mode and API settings — Super Admin only"
      actions={
        <button
          className="btn-gold btn-sm"
          onClick={() => saveConfig("All")}
        >
          💾 Save All Changes
        </button>
      }
    >
      <GlobalStyles />

      <MiniStatRow
        items={[
          {
            label: "Current Version",
            value: currentVersion,
            icon: "📱",
            color: "#34D399",
          },
          {
            label: "Min Required",
            value: minVersion,
            icon: "⚡",
            color: "#D4AF37",
          },
          {
            label: "Active Features",
            value:
              String(flags.filter((f) => f.enabled).length) +
              "/" +
              flags.length,
            icon: "🚩",
            color: "#60A5FA",
          },
          {
            label: "Maintenance Mode",
            value: maintenanceMode ? "ON" : "OFF",
            icon: "🔧",
            color: maintenanceMode ? "#F87171" : "#34D399",
          },
          {
            label: "Force Update",
            value: forceUpdate ? "Active" : "Off",
            icon: "🔄",
            color: forceUpdate ? "#F59E0B" : "rgba(255,255,255,0.5)",
          },
          {
            label: "API Rate Limit",
            value: `${rateLimit}/min`,
            icon: "⚙️",
            color: "#A78BFA",
          },
        ]}
      />

      {maintenanceMode && (
        <AlertBox type="error">
          🔴 MAINTENANCE MODE IS ACTIVE — App is currently showing maintenance
          screen to all users!
        </AlertBox>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 16,
          marginBottom: 18,
        }}
      >
        {/* Version Control */}
        <Card style={{ padding: 22 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(255,255,255,0.85)",
              marginBottom: 4,
            }}
          >
            📱 Version Control
          </div>

          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.38)",
              marginBottom: 18,
            }}
          >
            Manage app version requirements
          </div>

          <FormGroup label="Current Live Version">
            <input
              className="gm-input"
              value={currentVersion}
              onChange={(e) => setCurrentVersion(e.target.value)}
            />
          </FormGroup>

          <FormGroup
            label="Minimum Required Version"
            hint="Users below this version get force update screen"
          >
            <input
              className="gm-input"
              value={minVersion}
              onChange={(e) => setMinVersion(e.target.value)}
            />
          </FormGroup>

          <FormGroup label="Force Update">
            <div style={{ paddingTop: 6 }}>
              <Toggle
                checked={forceUpdate}
                onChange={(v) => {
                  setForceUpdate(v);
                  toast(
                    v
                      ? "Force update enabled — old users will be blocked!"
                      : "Force update disabled",
                    v ? "warning" : "success"
                  );
                }}
                label="Force users to update (block old versions)"
              />
            </div>
          </FormGroup>

          <FormGroup label="Update Message">
            <textarea
              className="gm-input"
              rows="2"
              defaultValue="A new version is available. Please update the app to continue."
              style={{ resize: "none" }}
            />
          </FormGroup>

          <button
            className="btn-gold btn-sm"
            onClick={() => saveConfig("Version")}
          >
            Save Version Config
          </button>
        </Card>

        {/* Maintenance Mode */}
        <Card
          style={{
            padding: 22,
            border: maintenanceMode
              ? "1px solid rgba(248,113,113,0.4)"
              : "undefined",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: maintenanceMode
                ? "#F87171"
                : "rgba(255,255,255,0.85)",
              marginBottom: 4,
            }}
          >
            🔧 Maintenance Mode
          </div>

          <div
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.38)",
              marginBottom: 18,
            }}
          >
            Temporarily shut down the app for all users
          </div>

          <FormGroup label="Maintenance Status">
            <div style={{ paddingTop: 6 }}>
              <Toggle
                checked={maintenanceMode}
                onChange={(v) => {
                  setMaintenanceMode(v);

                  if (v) {
                    toast(
                      "MAINTENANCE MODE ON — App offline for users!",
                      "error"
                    );
                  } else {
                    toast("Maintenance mode OFF — App is live!", "success");
                  }
                }}
                label={
                  maintenanceMode
                    ? "🔴 App is OFFLINE"
                    : "🟢 App is LIVE"
                }
              />
            </div>
          </FormGroup>

          <FormGroup label="Maintenance Message">
            <textarea
              className="gm-input"
              rows="3"
              value={maintenanceMsg}
              onChange={(e) => setMaintenanceMsg(e.target.value)}
              style={{ resize: "vertical" }}
            />
          </FormGroup>

          <FormGroup label="Expected Duration">
            <input
              className="gm-input"
              placeholder="e.g. 30 minutes"
              defaultValue="30 minutes"
            />
          </FormGroup>

          <FormGroup label="Schedule Maintenance">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              <input type="date" className="gm-input" />
              <input
                type="time"
                className="gm-input"
                defaultValue="02:00"
              />
            </div>
          </FormGroup>

          <button
            className={maintenanceMode ? "btn-success btn-sm" : "btn-danger btn-sm"}
            onClick={() => setMaintenanceMode(!maintenanceMode)}
            style={{
              width: "100%",
              justifyContent: "center",
            }}
          >
            {maintenanceMode
              ? "✅ Disable Maintenance Mode"
              : "🔧 Enable Maintenance Mode"}
          </button>
        </Card>
      </div>

      {/* API Rate Limit */}
      <Card style={{ padding: 22, marginBottom: 18 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "rgba(255,255,255,0.85)",
            marginBottom: 4,
          }}
        >
          ⚙️ API & System Settings
        </div>

        <div
          style={{
            fontSize: 11,
            color: "rgba(255,255,255,0.38)",
            marginBottom: 18,
          }}
        >
          Rate limiting, timeout and security settings
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))",
            gap: 16,
          }}
        >
          <FormGroup
            label="API Rate Limit (req/min)"
            hint="Max API calls per user per minute"
          >
            <input
              type="number"
              className="gm-input"
              value={rateLimit}
              onChange={(e) => setRateLimit(e.target.value)}
            />
          </FormGroup>

          <FormGroup
            label="Admin Session Timeout (min)"
            hint="Auto logout after inactivity"
          >
            <input
              type="number"
              className="gm-input"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
            />
          </FormGroup>

          <FormGroup
            label="Max Ride Radius (km)"
            hint="Maximum distance user can book for"
          >
            <input
              type="number"
              className="gm-input"
              defaultValue="80"
            />
          </FormGroup>

          <FormGroup
            label="Driver Search Radius (km)"
            hint="Radius to search for available drivers"
          >
            <input
              type="number"
              className="gm-input"
              defaultValue="5"
            />
          </FormGroup>

          <FormGroup
            label="Ride Matching Timeout (sec)"
            hint="Cancel matching if no driver found"
          >
            <input
              type="number"
              className="gm-input"
              defaultValue="120"
            />
          </FormGroup>

          <FormGroup
            label="Max Cancellations Per Day"
            hint="Auto-block user after N cancellations"
          >
            <input
              type="number"
              className="gm-input"
              defaultValue="3"
            />
          </FormGroup>
        </div>

        <button
          className="btn-gold btn-sm"
          style={{ marginTop: 8 }}
          onClick={() => saveConfig("API Settings")}
        >
          Save API Settings
        </button>
      </Card>

      {/* Feature Flags */}
      <Card style={{ padding: 22 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
              }}
            >
              🚩 Feature Flags
            </div>

            <div
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.38)",
                marginTop: 2,
              }}
            >
              Toggle features ON/OFF without code deployment —{" "}
              {flags.filter((f) => f.enabled).length}/{flags.length} active
            </div>
          </div>

          <button
            className="btn-outline btn-sm"
            onClick={() => toast("Feature flags saved!", "success")}
          >
            Save Flags
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))",
            gap: 10,
          }}
        >
          {flags.map((f, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: f.enabled
                  ? "rgba(212,175,55,0.04)"
                  : "rgba(255,255,255,0.025)",
                border: `1px solid ${
                  f.enabled
                    ? "rgba(212,175,55,0.18)"
                    : "rgba(255,255,255,0.08)"
                }`,
                borderRadius: 12,
                padding: "12px 16px",
                transition: "all .2s",
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  marginRight: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: f.enabled
                      ? "rgba(255,255,255,0.88)"
                      : "rgba(255,255,255,0.5)",
                    marginBottom: 2,
                  }}
                >
                  {f.label}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.35)",
                    lineHeight: 1.4,
                  }}
                >
                  {f.desc}
                </div>
              </div>

              <Toggle
                checked={f.enabled}
                onChange={() => toggleFlag(f.key)}
              />
            </div>
          ))}
        </div>
      </Card>
    </PageWrapper>
  );
}

export default function AppConfigPage() {
  return (
    <ToastProvider>
      <Content />
    </ToastProvider>
  );
}