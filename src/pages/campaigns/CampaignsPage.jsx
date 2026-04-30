import { useState } from "react";
import {
  useToast,
  ToastProvider,
  PageWrapper,
  Card,
  TableCard,
  MiniStatRow,
  GlobalStyles,
  FormGroup,
  Toggle,
  Modal,
  AlertBox,
} from "../../components/ui/index.jsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { GoldTooltip } from "../../components/ui/index.jsx";

// ─────────────────────────────────────────────
// Static Data
// ─────────────────────────────────────────────

const CAMPAIGNS = [
  {
    id: 1,
    name: "Weekend Cashback Blast",
    type: "cashback",
    offer: "Rs50 on 3 rides",
    startDate: "Apr 26",
    endDate: "Apr 28",
    budget: 50000,
    spent: 18200,
    users: 364,
    conversions: 284,
    status: "Active",
  },
  {
    id: 2,
    name: "Driver Double Earnings Day",
    type: "driver",
    offer: "2x earnings",
    startDate: "Apr 27",
    endDate: "Apr 27",
    budget: 30000,
    spent: 0,
    users: 387,
    conversions: 0,
    status: "Scheduled",
  },
  {
    id: 3,
    name: "Patna City Launch Promo",
    type: "city_launch",
    offer: "First 5 rides free",
    startDate: "Apr 1",
    endDate: "Apr 15",
    budget: 80000,
    spent: 72400,
    users: 1240,
    conversions: 892,
    status: "Completed",
  },
  {
    id: 4,
    name: "Referral Bonus April",
    type: "referral",
    offer: "Rs100 per referral",
    startDate: "Apr 1",
    endDate: "Apr 30",
    budget: 100000,
    spent: 43200,
    users: 432,
    conversions: 432,
    status: "Active",
  },
  {
    id: 5,
    name: "A/B Test — Surge Messaging",
    type: "ab_test",
    offer: "A: Alert / B: No Alert",
    startDate: "Apr 20",
    endDate: "Apr 25",
    budget: 5000,
    spent: 4800,
    users: 2000,
    conversions: 0,
    status: "Completed",
  },
];

const AB_RESULTS = [
  {
    variant: "Variant A (Surge Alert)",
    rides: 642,
    revenue: 128400,
    conversion: 64.2,
    ctr: 42.1,
  },
  {
    variant: "Variant B (No Alert)",
    rides: 498,
    revenue: 99600,
    conversion: 49.8,
    ctr: 31.8,
  },
];

// ─────────────────────────────────────────────
// Config Maps
// ─────────────────────────────────────────────

const TYPE_CONF = {
  cashback:    { color: "#D4AF37", icon: "💸", label: "Cashback Offer"    },
  driver:      { color: "#60A5FA", icon: "⚡", label: "Driver Incentive"  },
  city_launch: { color: "#34D399", icon: "🏙️", label: "City Launch"       },
  referral:    { color: "#A78BFA", icon: "🤝", label: "Referral Campaign" },
  ab_test:     { color: "#F59E0B", icon: "🧪", label: "A/B Test"          },
};

const STATUS_CONF = {
  Active: {
    color: "#34D399",
    bg: "rgba(52,211,153,0.1)",
    br: "rgba(52,211,153,0.25)",
  },
  Scheduled: {
    color: "#F59E0B",
    bg: "rgba(245,158,11,0.1)",
    br: "rgba(245,158,11,0.25)",
  },
  Completed: {
    color: "rgba(255,255,255,0.4)",
    bg: "rgba(255,255,255,0.05)",
    br: "rgba(255,255,255,0.1)",
  },
  Paused: {
    color: "#F87171",
    bg: "rgba(248,113,113,0.1)",
    br: "rgba(248,113,113,0.25)",
  },
};

// ─────────────────────────────────────────────
// Default new-campaign state
// ─────────────────────────────────────────────

const EMPTY_CAMPAIGN = {
  name: "",
  type: "cashback",
  offer: "",
  startDate: "",
  endDate: "",
  budget: "",
  target: "users",
  description: "",
};

// ─────────────────────────────────────────────
// Tab definitions
// ─────────────────────────────────────────────

const TABS = [
  { id: "list",        l: "All Campaigns"         },
  { id: "performance", l: "Performance Analytics"  },
  { id: "ab",          l: "A/B Test Results"       },
  { id: "templates",   l: "Quick Templates"        },
];

// ─────────────────────────────────────────────
// Quick-template definitions
// ─────────────────────────────────────────────

const TEMPLATES = [
  { title: "Weekend Cashback",   desc: "Rs50 cashback on 3 rides this weekend",          icon: "💸", color: "#D4AF37", type: "cashback"    },
  { title: "Double Earnings Day", desc: "All drivers earn 2x incentive for 24 hours",    icon: "⚡", color: "#60A5FA", type: "driver"      },
  { title: "City Launch Offer",  desc: "First 5 rides free for new city users",          icon: "🏙️", color: "#34D399", type: "city_launch"  },
  { title: "Referral Boost",     desc: "Rs100 bonus for every successful referral",      icon: "🤝", color: "#A78BFA", type: "referral"    },
  { title: "Festival Special",   desc: "Flat 20% off on all rides during festival",      icon: "🎉", color: "#F59E0B", type: "cashback"    },
  { title: "New User Welcome",   desc: "First ride free for newly registered users",     icon: "👋", color: "#F87171", type: "cashback"    },
];

// ─────────────────────────────────────────────
// A/B Result metric rows helper
// ─────────────────────────────────────────────

function abMetrics(v) {
  return [
    ["Total Rides",       v.rides,                        "#D4AF37"],
    ["Revenue",           `Rs${v.revenue.toLocaleString()}`, "#34D399"],
    ["Conversion Rate",   `${v.conversion}%`,             "#60A5FA"],
    ["CTR",               `${v.ctr}%`,                    "#A78BFA"],
  ];
}

// ─────────────────────────────────────────────
// Chart color palette
// ─────────────────────────────────────────────

const CHART_COLORS = ["#D4AF37", "#34D399", "#60A5FA", "#A78BFA", "#F59E0B"];

// ─────────────────────────────────────────────
// Content (inner component, inside ToastProvider)
// ─────────────────────────────────────────────

function Content() {
  const toast = useToast();

  const [campaigns, setCampaigns] = useState(CAMPAIGNS);
  const [createModal, setCreateModal] = useState(false);
  const [tab, setTab] = useState("list");
  const [nc, setNc] = useState(EMPTY_CAMPAIGN);

  // ── Helpers ──────────────────────────────

  /** Update a single field in the new-campaign form */
  const setField = (key) => (e) => setNc((prev) => ({ ...prev, [key]: e.target.value }));

  /** Compute total budget, spent, users, conversions */
  const totals = campaigns.reduce(
    (acc, c) => ({
      budget:      acc.budget      + c.budget,
      spent:       acc.spent       + c.spent,
      users:       acc.users       + c.users,
      conversions: acc.conversions + c.conversions,
    }),
    { budget: 0, spent: 0, users: 0, conversions: 0 }
  );

  /** Data for bar charts — only campaigns that have spend */
  const perfData = campaigns
    .filter((c) => c.spent > 0)
    .map((c) => ({
      name:        c.name.split(" ").slice(0, 2).join(" "),
      spent:       c.spent,
      conversions: c.conversions,
      roi:         c.spent > 0
        ? ((c.conversions * 300 - c.spent) / c.spent * 100).toFixed(0)
        : 0,
    }));

  // ── Actions ──────────────────────────────

  const createCampaign = () => {
    if (!nc.name || !nc.offer || !nc.budget) {
      toast("Fill required fields", "error");
      return;
    }
    setCampaigns((prev) => [
      ...prev,
      {
        id:          prev.length + 1,
        ...nc,
        budget:      Number(nc.budget),
        spent:       0,
        users:       0,
        conversions: 0,
        status:      "Scheduled",
      },
    ]);
    toast(`Campaign "${nc.name}" created!`, "success");
    setCreateModal(false);
    setNc(EMPTY_CAMPAIGN);
  };

  const toggleCampaign = (id) => {
    const camp = campaigns.find((c) => c.id === id);
    const isActive = camp?.status === "Active";

    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: isActive ? "Paused" : "Active" } : c
      )
    );
    toast(
      `Campaign ${isActive ? "paused" : "activated"}!`,
      isActive ? "error" : "success"
    );
  };

  const loadTemplate = (t) => {
    setNc({ ...nc, name: t.title, type: t.type, offer: t.desc });
    setCreateModal(true);
    toast("Template loaded!", "success");
  };

  // ── Render ───────────────────────────────

  return (
    <PageWrapper
      title="Marketing & Campaign Manager"
      subtitle="Create cashback offers, referral campaigns, driver incentives and A/B tests"
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-outline btn-sm"
            onClick={() => toast("Campaign report exported!", "success")}
          >
            ↓ Export Report
          </button>
          <button
            className="btn-gold btn-sm"
            onClick={() => setCreateModal(true)}
          >
            + Create Campaign
          </button>
        </div>
      }
    >
      <GlobalStyles />

      {/* ── Summary Stats ── */}
      <MiniStatRow
        items={[
          {
            label: "Active Campaigns",
            value: String(campaigns.filter((c) => c.status === "Active").length),
            icon: "🎯",
            color: "#D4AF37",
          },
          {
            label: "Scheduled",
            value: String(campaigns.filter((c) => c.status === "Scheduled").length),
            icon: "⏰",
            color: "#60A5FA",
          },
          {
            label: "Total Budget",
            value: `Rs${(totals.budget / 1000).toFixed(0)}K`,
            icon: "💰",
            color: "#34D399",
          },
          {
            label: "Total Spent",
            value: `Rs${(totals.spent / 1000).toFixed(0)}K`,
            icon: "💸",
            color: "#F87171",
          },
          {
            label: "Total Users Reached",
            value: totals.users.toLocaleString(),
            icon: "👥",
            color: "#A78BFA",
          },
          {
            label: "Total Conversions",
            value: totals.conversions.toLocaleString(),
            icon: "✅",
            color: "#D4AF37",
          },
        ]}
      />

      {/* ── Tab Navigation ── */}
      <div className="tab-nav">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.l}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════
          TAB: All Campaigns
      ══════════════════════════════════════ */}
      {tab === "list" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {campaigns.map((c, i) => {
            const tc  = TYPE_CONF[c.type] || TYPE_CONF.cashback;
            const sc  = STATUS_CONF[c.status] || STATUS_CONF.Active;
            const pct = c.budget > 0 ? Math.min(100, (c.spent / c.budget) * 100) : 0;
            const roi = c.budget > 0
              ? ((c.conversions * 300) / c.budget * 100).toFixed(0)
              : 0;

            return (
              <Card key={i} style={{ padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>

                  {/* Icon */}
                  <span style={{ fontSize: 32, flexShrink: 0 }}>{tc.icon}</span>

                  {/* Main Info */}
                  <div style={{ flex: 1, minWidth: 220 }}>

                    {/* Name + Badges */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.9)", fontFamily: "Cinzel,serif" }}>
                        {c.name}
                      </div>

                      {/* Type badge */}
                      <span style={{
                        display: "inline-flex",
                        padding: "2px 8px",
                        borderRadius: 100,
                        fontSize: 10.5,
                        fontWeight: 600,
                        background: `${tc.color}15`,
                        border: `1px solid ${tc.color}28`,
                        color: tc.color,
                      }}>
                        {tc.label}
                      </span>

                      {/* Status badge */}
                      <span style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "2px 8px",
                        borderRadius: 100,
                        fontSize: 10.5,
                        fontWeight: 600,
                        background: sc.bg,
                        border: `1px solid ${sc.br}`,
                        color: sc.color,
                      }}>
                        {c.status === "Active" && (
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#34D399" }} />
                        )}
                        {c.status}
                      </span>
                    </div>

                    {/* Offer */}
                    <div style={{ fontSize: 13, color: "#D4AF37", fontWeight: 600, marginBottom: 8 }}>
                      Offer: {c.offer}
                    </div>

                    {/* Meta row */}
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 12 }}>
                      <span>📅 {c.startDate} – {c.endDate}</span>
                      <span>👥 {c.users.toLocaleString()} users reached</span>
                      <span>✅ {c.conversions} conversions</span>
                    </div>

                    {/* Budget progress bar */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 5 }}>
                        <span>Budget: Rs{c.budget.toLocaleString()}</span>
                        <span>Spent: Rs{c.spent.toLocaleString()} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="prog-bar" style={{ height: 6 }}>
                        <div style={{
                          height: "100%",
                          width: `${pct}%`,
                          borderRadius: 100,
                          background: pct > 90
                            ? "linear-gradient(90deg,#F87171,#fca5a5)"
                            : "linear-gradient(90deg,#D4AF37,#f7dc6f)",
                        }} />
                      </div>
                    </div>
                  </div>

                  {/* Right-side: ROI + action buttons */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, alignItems: "flex-end" }}>

                    {/* ROI box */}
                    <div style={{
                      textAlign: "center",
                      background: "rgba(52,211,153,0.06)",
                      border: "1px solid rgba(52,211,153,0.2)",
                      borderRadius: 10,
                      padding: "8px 16px",
                    }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: "#34D399", fontFamily: "monospace" }}>
                        {roi}%
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                        Est. ROI
                      </div>
                    </div>

                    {/* Pause / Activate */}
                    {(c.status === "Active" || c.status === "Scheduled") && (
                      <button
                        className={`${c.status === "Active" ? "btn-danger" : "btn-success"} btn-sm`}
                        onClick={() => toggleCampaign(c.id)}
                      >
                        {c.status === "Active" ? "Pause" : "Activate"}
                      </button>
                    )}

                    <button
                      className="btn-outline btn-sm"
                      onClick={() => toast("Campaign analytics opened!", "success")}
                    >
                      View Stats
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB: Performance Analytics
      ══════════════════════════════════════ */}
      {tab === "performance" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

          {/* Spend chart */}
          <Card style={{ padding: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
              Campaign Spend
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginBottom: 16 }}>
              Budget spent per campaign
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perfData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `Rs${(v / 1000).toFixed(0)}K`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<GoldTooltip />} />
                <Bar dataKey="spent" name="Spent (Rs)" radius={[0, 4, 4, 0]}>
                  {perfData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} fillOpacity={0.85} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Conversions chart */}
          <Card style={{ padding: 22 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 4 }}>
              Conversions per Campaign
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginBottom: 16 }}>
              Total conversions (bookings from campaign)
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={perfData} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="rgba(212,175,55,0.07)" strokeDasharray="4 6" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  width={80}
                />
                <Tooltip content={<GoldTooltip />} />
                <Bar dataKey="conversions" name="Conversions" fill="#34D399" radius={[0, 4, 4, 0]} fillOpacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB: A/B Test Results
      ══════════════════════════════════════ */}
      {tab === "ab" && (
        <div>
          <AlertBox type="info">
            A/B Test: "Surge Alert Messaging" — Completed Apr 25, 2026. Winner: Variant A
          </AlertBox>

          {/* Variant cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            {AB_RESULTS.map((v, i) => (
              <Card
                key={i}
                style={{
                  padding: 22,
                  borderColor: i === 0 ? "rgba(212,175,55,0.35)" : "rgba(255,255,255,0.1)",
                }}
              >
                {/* Variant header */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 24 }}>{i === 0 ? "🏆" : "🧪"}</span>
                  <div>
                    <div style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: i === 0 ? "#D4AF37" : "rgba(255,255,255,0.65)",
                      fontFamily: "Cinzel,serif",
                    }}>
                      {v.variant}
                    </div>
                    {i === 0 && (
                      <div style={{ fontSize: 11, color: "#34D399", marginTop: 2 }}>
                        ✓ WINNER — Higher conversions
                      </div>
                    )}
                  </div>
                </div>

                {/* Metric rows */}
                {abMetrics(v).map(([label, val, color], j) => (
                  <div
                    key={j}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: j < 3 ? "1px solid rgba(212,175,55,0.07)" : "none",
                      fontSize: 13,
                    }}
                  >
                    <span style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
                    <span style={{ fontWeight: 700, color, fontFamily: "monospace" }}>{val}</span>
                  </div>
                ))}
              </Card>
            ))}
          </div>

          {/* Create new A/B test */}
          <Card style={{ padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 12 }}>
              Create New A/B Test
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <FormGroup label="Test Name">
                <input className="gm-input" placeholder="e.g. Promo Banner Test" />
              </FormGroup>
              <FormGroup label="Variant A">
                <input className="gm-input" placeholder="e.g. Blue CTA Button" />
              </FormGroup>
              <FormGroup label="Variant B">
                <input className="gm-input" placeholder="e.g. Gold CTA Button" />
              </FormGroup>
              <FormGroup label="Traffic Split (% for A)">
                <input type="number" className="gm-input" defaultValue="50" />
              </FormGroup>
              <FormGroup label="Duration (days)">
                <input type="number" className="gm-input" defaultValue="7" />
              </FormGroup>
              <FormGroup label="Success Metric">
                <select className="gm-input">
                  <option>Conversion Rate</option>
                  <option>Click-Through Rate</option>
                  <option>Revenue</option>
                </select>
              </FormGroup>
            </div>
            <button
              className="btn-gold btn-sm"
              onClick={() => toast("A/B Test created and launched!", "success")}
            >
              🧪 Launch A/B Test
            </button>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════
          TAB: Quick Templates
      ══════════════════════════════════════ */}
      {tab === "templates" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
          {TEMPLATES.map((t, i) => (
            <Card key={i} style={{ padding: 20, borderColor: `${t.color}22` }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{t.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.88)", marginBottom: 6, fontFamily: "Cinzel,serif" }}>
                {t.title}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 14, lineHeight: 1.5 }}>
                {t.desc}
              </div>
              <button
                className="btn-outline btn-sm"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => loadTemplate(t)}
              >
                Use Template
              </button>
            </Card>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════
          Modal: Create Campaign
      ══════════════════════════════════════ */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="🎯 Create Campaign"
        maxWidth={580}
      >
        <FormGroup label="Campaign Name">
          <input
            className="gm-input"
            placeholder="e.g. Weekend Cashback Blast"
            value={nc.name}
            onChange={setField("name")}
          />
        </FormGroup>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormGroup label="Campaign Type">
            <select className="gm-input" value={nc.type} onChange={setField("type")}>
              {Object.entries(TYPE_CONF).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.icon} {v.label}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Target Audience">
            <select className="gm-input" value={nc.target} onChange={setField("target")}>
              <option value="users">All Users</option>
              <option value="drivers">All Drivers</option>
              <option value="new">New Users Only</option>
              <option value="churned">Churned Users</option>
              <option value="city">Specific City</option>
            </select>
          </FormGroup>

          <FormGroup label="Offer Details">
            <input
              className="gm-input"
              placeholder="e.g. Rs50 cashback on 3 rides"
              value={nc.offer}
              onChange={setField("offer")}
            />
          </FormGroup>

          <FormGroup label="Budget (Rs)">
            <input
              type="number"
              className="gm-input"
              placeholder="50000"
              value={nc.budget}
              onChange={setField("budget")}
            />
          </FormGroup>

          <FormGroup label="Start Date">
            <input
              type="date"
              className="gm-input"
              value={nc.startDate}
              onChange={setField("startDate")}
            />
          </FormGroup>

          <FormGroup label="End Date">
            <input
              type="date"
              className="gm-input"
              value={nc.endDate}
              onChange={setField("endDate")}
            />
          </FormGroup>
        </div>

        <FormGroup label="Description">
          <textarea
            className="gm-input"
            rows="3"
            placeholder="Campaign details and terms..."
            value={nc.description}
            onChange={setField("description")}
            style={{ resize: "vertical" }}
          />
        </FormGroup>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-outline" onClick={() => setCreateModal(false)}>
            Cancel
          </button>
          <button className="btn-gold" onClick={createCampaign}>
            Create Campaign
          </button>
        </div>
      </Modal>
    </PageWrapper>
  );
}

// ─────────────────────────────────────────────
// Root export — wraps Content in ToastProvider
// ─────────────────────────────────────────────

export default function CampaignsPage() {
  return (
    <ToastProvider>
      <Content />
    </ToastProvider>
  );
}