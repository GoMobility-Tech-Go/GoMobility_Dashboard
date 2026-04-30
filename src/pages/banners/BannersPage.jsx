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
} from "../../components/ui/index.jsx";

const INIT_BANNERS = [
  {
    id: 1,
    title: "Weekend Mega Offer 30% Off!",
    msg: "Book any ride this weekend and get 30% cashback in wallet!",
    type: "offer",
    target: "users",
    status: "Active",
    start: "Apr 26, 2026",
    end: "Apr 28, 2026",
    clicks: 1284,
    views: 8420,
    ctr: 15.2,
  },
  {
    id: 2,
    title: "New Cab Service Launched!",
    msg: "Premium AC Cab now available in Rajendra Nagar zone.",
    type: "feature",
    target: "users",
    status: "Active",
    start: "Apr 20, 2026",
    end: "May 20, 2026",
    clicks: 842,
    views: 6100,
    ctr: 13.8,
  },
  {
    id: 3,
    title: "Earn 2x This Weekend!",
    msg: "Complete 10 rides this weekend and earn double incentive.",
    type: "offer",
    target: "drivers",
    status: "Active",
    start: "Apr 26, 2026",
    end: "Apr 28, 2026",
    clicks: 312,
    views: 387,
    ctr: 80.6,
  },
  {
    id: 4,
    title: "App Maintenance — Sunday 2 AM",
    msg: "App will be down for maintenance Sunday 2–4 AM.",
    type: "maintenance",
    target: "all",
    status: "Scheduled",
    start: "Apr 28, 2026",
    end: "Apr 28, 2026",
    clicks: 0,
    views: 0,
    ctr: 0,
  },
  {
    id: 5,
    title: "Safety Feature Update",
    msg: "We have added real-time trip sharing and SOS improvements.",
    type: "update",
    target: "all",
    status: "Expired",
    start: "Apr 10, 2026",
    end: "Apr 15, 2026",
    clicks: 2840,
    views: 14820,
    ctr: 19.2,
  },
];

const TC = {
  offer: {
    color: "#D4AF37",
    icon: "🎉",
    bg: "rgba(212,175,55,0.1)",
  },
  feature: {
    color: "#60A5FA",
    icon: "🚀",
    bg: "rgba(96,165,250,0.1)",
  },
  maintenance: {
    color: "#F59E0B",
    icon: "🔧",
    bg: "rgba(245,158,11,0.1)",
  },
  update: {
    color: "#34D399",
    icon: "✅",
    bg: "rgba(52,211,153,0.1)",
  },
  emergency: {
    color: "#F87171",
    icon: "🚨",
    bg: "rgba(248,113,113,0.1)",
  },
};

function Preview({ b }) {
  if (!b || (!b.title && !b.msg)) return null;

  const c = TC[b.type] || TC.feature;

  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.color}28`,
        borderRadius: 14,
        padding: "14px 18px",
        marginBottom: 18,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.38)",
          marginBottom: 8,
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        Preview
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(0,0,0,0.28)",
          borderRadius: 11,
          padding: "13px 16px",
        }}
      >
        <span style={{ fontSize: 26, flexShrink: 0 }}>{c.icon}</span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "rgba(255,255,255,0.9)",
              marginBottom: 3,
            }}
          >
            {b.title || "Banner Title"}
          </div>

          <div
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.5)",
            }}
          >
            {b.msg || "Message..."}
          </div>
        </div>

        <button
          style={{
            background: c.color,
            color: "#04081A",
            border: "none",
            borderRadius: 8,
            padding: "7px 14px",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          Open
        </button>
      </div>
    </div>
  );
}

function Content() {
  const toast = useToast();

  const [banners, setBanners] = useState(INIT_BANNERS);
  const [cm, setCm] = useState(false);

  const [nb, setNb] = useState({
    title: "",
    msg: "",
    type: "offer",
    target: "users",
    start: "",
    end: "",
    priority: false,
  });

  const create = () => {
    if (!nb.title || !nb.msg) {
      toast("Fill required fields", "error");
      return;
    }

    setBanners((b) => [
      ...b,
      {
        id: b.length + 1,
        ...nb,
        status: "Scheduled",
        clicks: 0,
        views: 0,
        ctr: 0,
      },
    ]);

    toast("Banner created and scheduled!", "success");
    setCm(false);

    setNb({
      title: "",
      msg: "",
      type: "offer",
      target: "users",
      start: "",
      end: "",
      priority: false,
    });
  };

  const toggle = (id) => {
    const b = banners.find((x) => x.id === id);

    setBanners((x) =>
      x.map((y) =>
        y.id === id
          ? {
              ...y,
              status: y.status === "Active" ? "Paused" : "Active",
            }
          : y,
      ),
    );

    toast(
      `Banner ${b?.status === "Active" ? "paused" : "activated"}`,
      b?.status === "Active" ? "error" : "success",
    );
  };

  const del = (id) => {
    setBanners((b) => b.filter((x) => x.id !== id));
    toast("Banner deleted", "error");
  };

  const active = banners.filter((b) => b.status === "Active");

  return (
    <PageWrapper
      title="In-App Banners & Announcements"
      subtitle="Create, schedule and track banners shown inside the app"
      actions={
        <button className="btn-gold btn-sm" onClick={() => setCm(true)}>
          + Create Banner
        </button>
      }
    >
      <GlobalStyles />

      <MiniStatRow
        items={[
          {
            label: "Active Banners",
            value: String(active.length),
            icon: "📣",
            color: "#D4AF37",
          },
          {
            label: "Scheduled",
            value: String(
              banners.filter((b) => b.status === "Scheduled").length,
            ),
            icon: "⏰",
            color: "#60A5FA",
          },
          {
            label: "Total Views",
            value: banners.reduce((a, b) => a + b.views, 0).toLocaleString(),
            icon: "👁",
            color: "#34D399",
          },
          {
            label: "Total Clicks",
            value: banners.reduce((a, b) => a + b.clicks, 0).toLocaleString(),
            icon: "👆",
            color: "#A78BFA",
          },
          {
            label: "Avg CTR",
            value: `${(
              banners.filter((b) => b.ctr > 0).reduce((a, b) => a + b.ctr, 0) /
              Math.max(1, banners.filter((b) => b.ctr > 0).length)
            ).toFixed(1)}%`,
            icon: "📊",
            color: "#F59E0B",
          },
          {
            label: "Expired",
            value: String(banners.filter((b) => b.status === "Expired").length),
            icon: "⌛",
          },
        ]}
      />

      {active.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 11,
              color: "rgba(212,175,55,0.5)",
              marginBottom: 10,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Currently Active Banners
          </div>

          {active.map((b) => (
            <Preview key={b.id} b={b} />
          ))}
        </div>
      )}

      <TableCard
        title="All Banners"
        icon="📣"
        actions={
          <select className="gm-input btn-sm" style={{ width: 130 }}>
            <option>All Status</option>
            <option>Active</option>
            <option>Scheduled</option>
            <option>Expired</option>
          </select>
        }
      >
        <table className="gm-table">
          <thead>
            <tr>
              <th>Banner</th>
              <th>Type</th>
              <th>Target</th>
              <th>Schedule</th>
              <th>Views</th>
              <th>Clicks</th>
              <th>CTR</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {banners.map((b, i) => {
              const c = TC[b.type] || TC.feature;

              const sc =
                {
                  Active: "#34D399",
                  Scheduled: "#F59E0B",
                  Paused: "#60A5FA",
                  Expired: "rgba(255,255,255,0.35)",
                }[b.status] || "#34D399";

              return (
                <tr key={i}>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 17 }}>{c.icon}</span>

                      <div>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontWeight: 600,
                            maxWidth: 170,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.title}
                        </div>

                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.38)",
                            maxWidth: 170,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {b.msg}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        padding: "3px 8px",
                        borderRadius: 100,
                        fontSize: 10.5,
                        fontWeight: 600,
                        background: c.bg,
                        border: `1px solid ${c.color}28`,
                        color: c.color,
                      }}
                    >
                      {b.type}
                    </span>
                  </td>

                  <td style={{ fontSize: 12 }}>
                    {b.target === "all"
                      ? "All"
                      : b.target === "users"
                        ? "Users"
                        : "Drivers"}
                  </td>

                  <td
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.45)",
                    }}
                  >
                    {b.start} – {b.end}
                  </td>

                  <td
                    style={{
                      color: "#D4AF37",
                      fontFamily: "monospace",
                    }}
                  >
                    {b.views.toLocaleString()}
                  </td>

                  <td
                    style={{
                      color: "#A78BFA",
                      fontFamily: "monospace",
                    }}
                  >
                    {b.clicks.toLocaleString()}
                  </td>

                  <td
                    style={{
                      color:
                        b.ctr > 20
                          ? "#34D399"
                          : b.ctr > 10
                            ? "#D4AF37"
                            : "rgba(255,255,255,0.45)",
                      fontWeight: 700,
                    }}
                  >
                    {b.ctr.toFixed(1)}%
                  </td>

                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        padding: "3px 9px",
                        borderRadius: 100,
                        fontSize: 10.5,
                        fontWeight: 600,
                        background: `${sc}14`,
                        border: `1px solid ${sc}28`,
                        color: sc,
                      }}
                    >
                      {b.status}
                    </span>
                  </td>

                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      {b.status !== "Expired" && (
                        <button
                          className={`${
                            b.status === "Active" ? "btn-danger" : "btn-success"
                          } btn-xs`}
                          onClick={() => toggle(b.id)}
                        >
                          {b.status === "Active" ? "Pause" : "Activate"}
                        </button>
                      )}

                      <button
                        className="btn-danger btn-xs"
                        onClick={() => del(b.id)}
                      >
                        Del
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>

      <Modal open={cm} onClose={() => setCm(false)} title="Create Banner">
        <Preview b={nb.title || nb.msg ? nb : null} />

        <FormGroup label="Banner Title">
          <input
            className="gm-input"
            placeholder="e.g. Weekend 30% Off!"
            value={nb.title}
            onChange={(e) =>
              setNb({
                ...nb,
                title: e.target.value,
              })
            }
          />
        </FormGroup>

        <FormGroup label="Message">
          <textarea
            className="gm-input"
            rows="3"
            placeholder="Message shown to users..."
            style={{ resize: "vertical" }}
            value={nb.msg}
            onChange={(e) =>
              setNb({
                ...nb,
                msg: e.target.value,
              })
            }
          />
        </FormGroup>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <FormGroup label="Banner Type">
            <select
              className="gm-input"
              value={nb.type}
              onChange={(e) =>
                setNb({
                  ...nb,
                  type: e.target.value,
                })
              }
            >
              {Object.entries(TC).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.icon} {k}
                </option>
              ))}
            </select>
          </FormGroup>

          <FormGroup label="Target">
            <select
              className="gm-input"
              value={nb.target}
              onChange={(e) =>
                setNb({
                  ...nb,
                  target: e.target.value,
                })
              }
            >
              <option value="users">Users Only</option>
              <option value="drivers">Drivers Only</option>
              <option value="all">Everyone</option>
            </select>
          </FormGroup>

          <FormGroup label="Start Date">
            <input
              type="date"
              className="gm-input"
              value={nb.start}
              onChange={(e) =>
                setNb({
                  ...nb,
                  start: e.target.value,
                })
              }
            />
          </FormGroup>

          <FormGroup label="End Date">
            <input
              type="date"
              className="gm-input"
              value={nb.end}
              onChange={(e) =>
                setNb({
                  ...nb,
                  end: e.target.value,
                })
              }
            />
          </FormGroup>
        </div>

        <FormGroup label="Priority">
          <div style={{ paddingTop: 6 }}>
            <Toggle
              checked={nb.priority}
              onChange={(v) =>
                setNb({
                  ...nb,
                  priority: v,
                })
              }
              label="Pin as priority banner (shown first)"
            />
          </div>
        </FormGroup>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-outline" onClick={() => setCm(false)}>
            Cancel
          </button>

          <button className="btn-gold" onClick={create}>
            Create & Schedule
          </button>
        </div>
      </Modal>
    </PageWrapper>
  );
}

export default function BannersPage() {
  return (
    <ToastProvider>
      <Content />
    </ToastProvider>
  );
}
