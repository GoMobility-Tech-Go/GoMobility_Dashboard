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
  AvatarCell,
} from "../../components/ui/index.jsx";
import { triggerEngagement } from "../../api/admin";

const NAMES = [
  "Rahul Sharma",
  "Priya Singh",
  "Amit Kumar",
  "Neha Gupta",
  "Vikram Yadav",
  "Suresh Reddy",
  "Arjun Nair",
  "Deepak Soni",
];

const MSGS = [
  {
    id: 1,
    from: "Super Admin",
    to: "Vikram Yadav",
    type: "driver",
    msg: "Rate structure updated from tomorrow. New per-km rate is Rs9 for bike. Please confirm acknowledgement.",
    time: "10:32 AM",
    delivered: true,
    read: true,
  },
  {
    id: 2,
    from: "Super Admin",
    to: "All Drivers",
    type: "broadcast",
    msg: "Important: New cancellation policy effective from May 1. Drivers with >15% cancellation rate will be suspended.",
    time: "9:15 AM",
    delivered: true,
    read: false,
  },
  {
    id: 3,
    from: "Super Admin",
    to: "Priya Singh",
    type: "user",
    msg: "We have processed your refund of Rs150. It will reflect in your wallet within 2 hours. Sorry for the inconvenience.",
    time: "Yesterday 4:42 PM",
    delivered: true,
    read: true,
  },
  {
    id: 4,
    from: "Super Admin",
    to: "All Users",
    type: "broadcast",
    msg: "Weekend special offer: Use code WEEKEND30 to get 30% off on your next 3 rides!",
    time: "Yesterday 10:00 AM",
    delivered: true,
    read: false,
  },
];

const CONVERSATIONS = [
  {
    name: "Vikram Yadav",
    type: "Driver",
    lastMsg: "Rate update acknowledged. Thank you!",
    time: "10:45 AM",
    unread: 0,
    avatar: "VY",
  },
  {
    name: "Priya Singh",
    type: "User",
    lastMsg: "Thank you for the quick resolution!",
    time: "4:50 PM",
    unread: 0,
    avatar: "PS",
  },
  {
    name: "Amit Kumar",
    type: "Driver",
    lastMsg: "When will the new zone be active?",
    time: "Yesterday",
    unread: 2,
    avatar: "AK",
  },
  {
    name: "Rahul Sharma",
    type: "User",
    lastMsg: "My wallet balance is still not updated",
    time: "2 days ago",
    unread: 1,
    avatar: "RS",
  },
];

function Content() {
  const toast = useToast();

  const [tab, setTab] = useState("compose");
  const [selConv, setSelConv] = useState(CONVERSATIONS[0]);
  const [msgText, setMsgText] = useState("");
  const [composeType, setComposeType] = useState("broadcast-drivers");
  const [composeMsg, setComposeMsg] = useState("");
  const [composeTarget, setComposeTarget] = useState("");
  const [msgs, setMsgs] = useState(MSGS);
  const [sending, setSending] = useState(false);
  const [composeSubject, setComposeSubject] = useState("");

  const [chatMsgs, setChatMsgs] = useState([
    {
      from: "Super Admin",
      text: "Rate structure updated from tomorrow.",
      time: "10:32 AM",
      mine: true,
    },
    {
      from: "Vikram Yadav",
      text: "Rate update acknowledged. Thank you!",
      time: "10:45 AM",
      mine: false,
    },
  ]);

  const sendMsg = () => {
    if (!msgText.trim()) return;

    setChatMsgs((m) => [
      ...m,
      {
        from: "Super Admin",
        text: msgText,
        time: "Now",
        mine: true,
      },
    ]);

    setMsgText("");
    toast("Message sent!", "success");
  };

  const sendBroadcast = async () => {
    if (!composeMsg.trim()) {
      toast("Enter a message", "error");
      return;
    }
    setSending(true);
    try {
      const audienceMap = {
        "broadcast-drivers": "drivers",
        "broadcast-users":   "users",
        "broadcast-gold":    "gold_drivers",
        "broadcast-city":    "users",
      };
      await triggerEngagement({
        type:    audienceMap[composeType] || "users",
        message: composeMsg,
        title:   composeSubject.trim() || "Admin Broadcast",
      });
      const target = composeType.includes("driver") ? "All Drivers" : "All Users";
      setMsgs((m) => [{
        id: m.length + 1,
        from: "Super Admin",
        to: target,
        type: "broadcast",
        msg: composeMsg,
        time: new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }),
        delivered: true,
        read: false,
      }, ...m]);
      toast(`Broadcast sent to ${target}!`, "success");
      setComposeMsg("");
      setComposeSubject("");
    } catch {
      toast("Failed to send broadcast. Please try again.", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <PageWrapper
      title="Broadcast Messaging"
      subtitle="Direct messages to drivers/users and bulk broadcasts with delivery tracking"
    >
      <GlobalStyles />

      <MiniStatRow
        items={[
          {
            label: "Messages Sent",
            value: "284",
            icon: "📤",
            color: "#D4AF37",
          },
          {
            label: "Broadcast Today",
            value: "4",
            icon: "📢",
            color: "#60A5FA",
          },
          {
            label: "Delivery Rate",
            value: "99.2%",
            icon: "✅",
            color: "#34D399",
          },
          {
            label: "Read Rate",
            value: "72.4%",
            icon: "👁",
            color: "#A78BFA",
          },
          {
            label: "Unread",
            value: "3",
            icon: "🔔",
            color: "#F59E0B",
          },
          {
            label: "Active Conversations",
            value: String(CONVERSATIONS.length),
            icon: "💬",
          },
        ]}
      />

      <div className="tab-nav">
        {[
          { id: "compose", l: "📤 Compose & Broadcast" },
          { id: "inbox", l: "💬 Direct Messages" },
          { id: "history", l: "📋 Message History" },
        ].map((t) => (
          <button
            key={t.id}
            className={`tab-btn${tab === t.id ? " active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === "compose" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <Card style={{ padding: 22 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
                marginBottom: 18,
              }}
            >
              📢 Bulk Broadcast Message
            </div>

            <FormGroup label="Target Audience">
              <select
                className="gm-input"
                value={composeType}
                onChange={(e) => setComposeType(e.target.value)}
              >
                <option value="broadcast-drivers">All Drivers (387)</option>
                <option value="broadcast-users">All Users (14,820)</option>
                <option value="broadcast-gold">Gold Tier Drivers (31)</option>
                <option value="broadcast-city">Specific City</option>
              </select>
            </FormGroup>

            {composeType === "broadcast-city" && (
              <FormGroup label="Select City">
                <select className="gm-input">
                  <option>Patna</option>
                  <option>Delhi</option>
                  <option>Mumbai</option>
                  <option>Bangalore</option>
                </select>
              </FormGroup>
            )}

            <FormGroup label="Subject">
              <input
                className="gm-input"
                placeholder="e.g. Important Policy Update"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
            </FormGroup>

            <FormGroup label="Message">
              <textarea
                className="gm-input"
                rows="5"
                placeholder="Type your broadcast message here..."
                style={{ resize: "vertical" }}
                value={composeMsg}
                onChange={(e) => setComposeMsg(e.target.value)}
              />

              <div
                style={{
                  textAlign: "right",
                  fontSize: 11,
                  color: "rgba(255,255,255,0.3)",
                  marginTop: 4,
                }}
              >
                {composeMsg.length} characters
              </div>
            </FormGroup>

            <FormGroup label="Send via">
              <div style={{ display: "flex", gap: 8 }}>
                {["In-App Message", "Push Notification", "Both"].map((v) => (
                  <button
                    key={v}
                    style={{
                      flex: 1,
                      padding: "8px 0",
                      borderRadius: 9,
                      border: "1px solid rgba(212,175,55,0.2)",
                      background: "rgba(212,175,55,0.06)",
                      color: "#D4AF37",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "Outfit,sans-serif",
                    }}
                    onClick={() => toast(`Will send via ${v}!`, "success")}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </FormGroup>

            <button
              className="btn-gold"
              style={{
                width: "100%",
                justifyContent: "center",
                marginTop: 4,
                opacity: sending ? 0.6 : 1,
                cursor: sending ? "not-allowed" : "pointer",
              }}
              onClick={sendBroadcast}
              disabled={sending}
            >
              {sending ? "⏳ Sending…" : "📤 Send Broadcast"}
            </button>
          </Card>

          <Card style={{ padding: 22 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
                marginBottom: 18,
              }}
            >
              💬 Direct Message (Specific User/Driver)
            </div>

            <FormGroup label="Message Type">
              <select className="gm-input">
                <option>Message a Driver by Name</option>
                <option>Message a User by Name</option>
                <option>Message by Driver ID</option>
                <option>Message by User ID</option>
              </select>
            </FormGroup>

            <FormGroup label="Search Driver/User">
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 11,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "rgba(212,175,55,0.45)",
                    fontSize: 13,
                    pointerEvents: "none",
                  }}
                >
                  🔍
                </span>

                <input
                  className="gm-input"
                  placeholder="Search by name or ID..."
                  style={{ paddingLeft: 32 }}
                  value={composeTarget}
                  onChange={(e) => setComposeTarget(e.target.value)}
                />
              </div>
            </FormGroup>

            {composeTarget && (
              <div
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(212,175,55,0.12)",
                  borderRadius: 10,
                  marginBottom: 14,
                }}
              >
                {NAMES.filter((n) =>
                  n.toLowerCase().includes(composeTarget.toLowerCase())
                )
                  .slice(0, 4)
                  .map((n, i) => (
                    <div
                      key={i}
                      onClick={() => setComposeTarget(n)}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        borderBottom:
                          i < 3
                            ? "1px solid rgba(212,175,55,0.06)"
                            : "none",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "rgba(212,175,55,0.05)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <AvatarCell
                        name={n}
                        sub={i % 2 === 0 ? "Driver" : "User"}
                      />
                    </div>
                  ))}
              </div>
            )}

            <FormGroup label="Message">
              <textarea
                className="gm-input"
                rows="5"
                placeholder="Type your message..."
                style={{ resize: "vertical" }}
                value={composeMsg}
                onChange={(e) => setComposeMsg(e.target.value)}
              />
            </FormGroup>

            <button
              className="btn-gold"
              style={{
                width: "100%",
                justifyContent: "center",
              }}
              onClick={() => {
                if (!composeTarget || !composeMsg) {
                  toast("Select recipient and enter message", "error");
                  return;
                }

                toast(`Message sent to ${composeTarget}!`, "success");
                setComposeMsg("");
                setComposeTarget("");
              }}
            >
              📤 Send Message
            </button>
          </Card>
        </div>
      )}

      {tab === "inbox" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1fr) minmax(0,2fr)",
            gap: 16,
            height: 480,
          }}
        >
          {/* Conversation List */}
          <Card
            style={{
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid rgba(212,175,55,0.1)",
                fontSize: 13,
                fontWeight: 700,
                color: "rgba(255,255,255,0.85)",
              }}
            >
              Conversations
            </div>

            <div style={{ overflowY: "auto", flex: 1 }}>
              {CONVERSATIONS.map((c, i) => (
                <div
                  key={i}
                  onClick={() => setSelConv(c)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(212,175,55,0.07)",
                    cursor: "pointer",
                    background:
                      selConv?.name === c.name
                        ? "rgba(212,175,55,0.06)"
                        : "transparent",
                    transition: "all .2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        background:
                          c.type === "Driver"
                            ? "linear-gradient(135deg,#3b82f6,#1d4ed8)"
                            : "linear-gradient(135deg,#D4AF37,#b8920f)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "#04081A",
                        flexShrink: 0,
                      }}
                    >
                      {c.avatar}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: "rgba(255,255,255,0.85)",
                          }}
                        >
                          {c.name}
                        </div>

                        <div
                          style={{
                            fontSize: 10,
                            color: "rgba(255,255,255,0.35)",
                          }}
                        >
                          {c.time}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginTop: 2,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            color: "rgba(255,255,255,0.45)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: 140,
                          }}
                        >
                          {c.lastMsg}
                        </div>

                        {c.unread > 0 && (
                          <span
                            style={{
                              background: "#D4AF37",
                              color: "#04081A",
                              fontSize: 10,
                              fontWeight: 800,
                              borderRadius: "50%",
                              width: 18,
                              height: 18,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {c.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Chat Panel */}
          <Card
            style={{
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                padding: "12px 18px",
                borderBottom: "1px solid rgba(212,175,55,0.1)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background:
                    selConv?.type === "Driver"
                      ? "linear-gradient(135deg,#3b82f6,#1d4ed8)"
                      : "linear-gradient(135deg,#D4AF37,#b8920f)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 800,
                  color: "#04081A",
                }}
              >
                {selConv?.avatar}
              </div>

              <div>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "rgba(255,255,255,0.88)",
                  }}
                >
                  {selConv?.name}
                </div>

                <div
                  style={{
                    fontSize: 11,
                    color:
                      selConv?.type === "Driver" ? "#60A5FA" : "#D4AF37",
                  }}
                >
                  {selConv?.type}
                </div>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {chatMsgs.map((m, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: m.mine ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "75%",
                      background: m.mine
                        ? "linear-gradient(135deg,rgba(212,175,55,0.2),rgba(212,175,55,0.08))"
                        : "rgba(255,255,255,0.05)",
                      border: `1px solid ${
                        m.mine
                          ? "rgba(212,175,55,0.25)"
                          : "rgba(255,255,255,0.08)"
                      }`,
                      borderRadius: m.mine
                        ? "16px 16px 4px 16px"
                        : "16px 16px 16px 4px",
                      padding: "10px 14px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "rgba(255,255,255,0.85)",
                        lineHeight: 1.5,
                      }}
                    >
                      {m.text}
                    </div>

                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.35)",
                        marginTop: 4,
                        textAlign: m.mine ? "right" : "left",
                      }}
                    >
                      {m.time} {m.mine && "✓✓"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                padding: "12px 16px",
                borderTop: "1px solid rgba(212,175,55,0.1)",
                display: "flex",
                gap: 10,
                alignItems: "flex-end",
              }}
            >
              <textarea
                className="gm-input"
                rows="2"
                placeholder="Type a message..."
                style={{
                  resize: "none",
                  flex: 1,
                }}
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMsg();
                  }
                }}
              />

              <button
                className="btn-gold"
                style={{
                  flexShrink: 0,
                  height: 40,
                }}
                onClick={sendMsg}
              >
                Send
              </button>
            </div>
          </Card>
        </div>
      )}

      {tab === "history" && (
        <TableCard
          title="Message History"
          icon="📋"
          actions={
            <button
              className="btn-outline btn-sm"
              onClick={() => toast("Exported!", "success")}
            >
              ↓ Export
            </button>
          }
        >
          <table className="gm-table">
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Type</th>
                <th>Message</th>
                <th>Time</th>
                <th>Delivered</th>
                <th>Read</th>
              </tr>
            </thead>

            <tbody>
              {msgs.map((m, i) => (
                <tr key={i}>
                  <td>{m.from}</td>

                  <td
                    style={{
                      fontWeight: 600,
                      color:
                        m.type === "broadcast"
                          ? "#F59E0B"
                          : m.type === "driver"
                          ? "#60A5FA"
                          : "#D4AF37",
                    }}
                  >
                    {m.to}
                  </td>

                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        padding: "3px 8px",
                        borderRadius: 100,
                        fontSize: 10.5,
                        fontWeight: 600,
                        background:
                          m.type === "broadcast"
                            ? "rgba(245,158,11,0.1)"
                            : m.type === "driver"
                            ? "rgba(96,165,250,0.1)"
                            : "rgba(212,175,55,0.1)",
                        border: `1px solid ${
                          m.type === "broadcast"
                            ? "rgba(245,158,11,0.28)"
                            : m.type === "driver"
                            ? "rgba(96,165,250,0.28)"
                            : "rgba(212,175,55,0.28)"
                        }`,
                        color:
                          m.type === "broadcast"
                            ? "#F59E0B"
                            : m.type === "driver"
                            ? "#60A5FA"
                            : "#D4AF37",
                      }}
                    >
                      {m.type}
                    </span>
                  </td>

                  <td
                    style={{
                      fontSize: 12,
                      maxWidth: 220,
                      color: "rgba(255,255,255,0.6)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {m.msg}
                  </td>

                  <td style={{ fontSize: 12 }}>{m.time}</td>

                  <td>
                    {m.delivered ? (
                      <span style={{ color: "#34D399" }}>✓✓ Yes</span>
                    ) : (
                      <span style={{ color: "#F87171" }}>✗ No</span>
                    )}
                  </td>

                  <td>
                    {m.read ? (
                      <span style={{ color: "#60A5FA" }}>✓ Yes</span>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.35)" }}>
                        Unread
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </PageWrapper>
  );
}

export default function BroadcastMessagingPage() {
  return (
    <ToastProvider>
      <Content />
    </ToastProvider>
  );
}