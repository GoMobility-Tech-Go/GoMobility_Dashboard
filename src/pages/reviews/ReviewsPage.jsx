import { useState, useEffect } from "react";
import { useToast, ToastProvider, PageWrapper, TableCard, Badge, AvatarCell, MiniStatRow, AlertBox, GlobalStyles, Card } from "../../components/ui/index.jsx";
import { api } from "../../services/api.js";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { GoldTooltip } from "../../components/ui/index.jsx";

function normalizeReview(r) {
  return {
    id: r.id || r.review_id,
    text: r.comment || r.text || r.review_text || '',
    user: r.reviewer?.full_name || r.user || 'Unknown',
    driver: r.reviewee?.full_name || r.driver || 'Unknown',
    rating: r.rating || 0,
    time: r.created_at ? new Date(r.created_at).toLocaleString('en-IN') : '',
  };
}

function Content() {
  const toast = useToast();
  const [tab, setTab] = useState("flagged");
  const [flagged, setFlagged] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getFlaggedReviews()
      .then(res => {
        const raw = res?.data?.reviews || res?.reviews || res?.data || [];
        setFlagged(Array.isArray(raw) ? raw.map(normalizeReview) : []);
      })
      .catch(() => toast("Failed to load flagged reviews", "error"))
      .finally(() => setLoading(false));
  }, []);

  const hide = (id) => {
    api.hideReview(id).catch(() => {});
    setFlagged(f => f.filter(r => r.id !== id));
    toast("Review hidden", "error");
  };

  const unflag = (id) => {
    api.unflagReview(id).catch(() => {});
    setFlagged(f => f.filter(r => r.id !== id));
    toast("Review unflagged", "success");
  };

  return (
    <PageWrapper title="Review & Rating Moderation" subtitle="Monitor reviews, moderate content and track driver rating trends">
      <GlobalStyles/>
      <MiniStatRow items={[
        { label:"Flagged Reviews", value:String(flagged.length), icon:"🚩", color:"#F87171" },
        { label:"Avg Platform Rating", value:"—", icon:"⭐", color:"#D4AF37" },
        { label:"Low Rating Drivers", value:"—", icon:"⚠️", color:"#F59E0B" },
        { label:"Reviews Today", value:"—", icon:"📝" },
      ]}/>
      {!loading && flagged.length > 0 && (
        <AlertBox type="error">{flagged.length} reviews flagged and pending moderation action.</AlertBox>
      )}
      <div className="tab-nav">
        {[{ id:"flagged", l:`Flagged Reviews (${flagged.length})` }, { id:"low", l:"Low Rating Alerts" }].map(t => (
          <button key={t.id} className={`tab-btn${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>{t.l}</button>
        ))}
      </div>
      {tab === "flagged" && (
        <TableCard title="Flagged Reviews" icon="🚩">
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.35)", fontFamily: "Outfit,sans-serif" }}>Loading...</div>
          ) : flagged.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "rgba(255,255,255,0.35)" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>No flagged reviews!
            </div>
          ) : (
            <table className="gm-table">
              <thead><tr><th>Review</th><th>By User</th><th>For Driver</th><th>Rating</th><th>Flagged</th><th>Actions</th></tr></thead>
              <tbody>{flagged.map((r) => (
                <tr key={r.id}>
                  <td style={{ maxWidth: 200, fontSize: 12, color: "rgba(255,255,255,0.55)", fontStyle: "italic" }}>"{r.text}"</td>
                  <td>{r.user}</td>
                  <td>{r.driver}</td>
                  <td style={{ color: "#F87171", fontWeight: 700 }}>{"★".repeat(Math.max(0, r.rating))} {r.rating}.0</td>
                  <td style={{ fontSize: 12 }}>{r.time}</td>
                  <td>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button className="btn-danger btn-xs" onClick={() => hide(r.id)}>Hide</button>
                      <button className="btn-outline btn-xs" onClick={() => unflag(r.id)}>Unflag</button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </TableCard>
      )}
      {tab === "low" && (
        <TableCard title="Low Rating Drivers (Below 3.5★)" icon="⚠️">
          <div style={{ padding: 50, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "Outfit,sans-serif" }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
            Low rating driver analytics not available via API
          </div>
        </TableCard>
      )}
    </PageWrapper>
  );
}
export default function ReviewsPage() { return <ToastProvider><Content/></ToastProvider>; }
