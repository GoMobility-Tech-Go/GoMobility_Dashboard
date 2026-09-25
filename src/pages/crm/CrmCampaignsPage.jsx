// Campaigns (PRD Part 3) — one-off sends. List + status filter.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { TableCard } from "../../components/ui";
import { CrmPage, useCrm, useCrmMe, can, Loading, ErrorNote, StatusPill, Pill, Hint, CHANNEL, inr, num, dt } from "./crmShared";

const STATUSES = ["", "draft", "pending_approval", "approved", "sending", "sent", "paused", "cancelled"];
const LABEL = { "": "Sab", draft: "Draft", pending_approval: "Approval baaki", approved: "Approved", sending: "Bhej rahe", sent: "Bhej diya", paused: "Ruka hua", cancelled: "Cancelled" };

export default function CrmCampaignsPage() {
  const navigate = useNavigate();
  const me = useCrmMe();
  const [status, setStatus] = useState("");
  const { data, error, loading } = useCrm("/campaigns", { params: status ? { status } : undefined, refreshMs: 30000 });

  return (
    <CrmPage
      title="Campaigns"
      subtitle="Ek baar ke messages — segment → estimate (₹) → approval → send"
      actions={can(me, "marketer") && <Link to="/crm/campaigns/new" className="btn-gold"><Plus size={14} /> Naya campaign</Link>}
    >
      <ErrorNote error={error} />
      <TableCard
        title="Campaigns (aakhri 100)" icon="📣"
        actions={
          <select className="gm-input" style={{ width: 170 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{LABEL[s]}</option>)}
          </select>
        }
      >
        {loading && !data ? <Loading /> : (
          <table className="gm-table">
            <thead><tr><th>Naam</th><th>Kisko</th><th>Channel</th><th>Status</th><th>Recipients</th><th>Est. kharcha</th><th>Gaye</th><th>Kab</th><th>Banaya</th></tr></thead>
            <tbody>
              {(data || []).map((c) => (
                <tr key={c._id} style={{ cursor: "pointer" }} onClick={() => navigate(`/crm/campaigns/${c._id}`)}>
                  <td>{c.name || "(bina naam)"}</td>
                  <td>{c.segment?.role || "—"} {c.category === "transactional" && <Pill tone="blue">Transactional</Pill>}</td>
                  <td>{CHANNEL[c.channel] || c.channel}{c.fallback ? ` → ${CHANNEL[c.fallback] || c.fallback}` : ""}</td>
                  <td><StatusPill status={c.status} /></td>
                  <td>{c.estimate?.at ? num(c.estimate.recipients) : "—"}</td>
                  <td>{c.estimate?.at ? inr(c.estimate.costInr) : "—"}</td>
                  <td>{c.stats?.queued ? `${num(c.stats.sent)} / ${num(c.stats.queued)}` : "—"}</td>
                  <td>{c.scheduledAt ? dt(c.scheduledAt) : "Turant"}</td>
                  <td style={{ fontSize: 12 }}>{c.createdBy}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{dt(c.createdAt)}</div></td>
                </tr>
              ))}
              {data && !data.length && <tr><td colSpan={9} style={{ textAlign: "center", color: "rgba(255,255,255,0.35)" }}>Koi campaign nahi</td></tr>}
            </tbody>
          </table>
        )}
      </TableCard>
      <div style={{ marginTop: 12 }}>
        <Hint>Estimate step skip nahi hota (PRD §3.2). Approval limit (Settings, default ₹500) se mehenga ya transactional campaign ho toh <b>doosra insaan</b> approve karega — Approvals page.</Hint>
      </div>
    </CrmPage>
  );
}
