// Campaigns (PRD Part 3) — one-off sends. List with status filter and summary.
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Megaphone, Hourglass, CheckCircle2, IndianRupee } from "lucide-react";
import { StatCard, TableCard } from "../../components/ui";
import { CrmPage, useCrm, useCrmMe, can, Loading, ErrorNote, StatusPill, CategoryPill, Hint, COLORS, CHANNEL, inr, num, dt } from "./crmShared";

const STATUSES = [["", "All statuses"], ["draft", "Draft"], ["pending_approval", "Pending approval"], ["approved", "Approved"], ["sending", "Sending"], ["sent", "Sent"], ["paused", "Paused"], ["cancelled", "Cancelled"]];

export default function CrmCampaignsPage() {
  const navigate = useNavigate();
  const me = useCrmMe();
  const [status, setStatus] = useState("");
  const all = useCrm("/campaigns", { refreshMs: 30000 });
  const rows = useMemo(() => (all.data || []).filter((c) => !status || c.status === status), [all.data, status]);
  const summary = useMemo(() => {
    const list = all.data || [];
    return {
      total: list.length,
      pending: list.filter((c) => c.status === "pending_approval").length,
      sent: list.reduce((t, c) => t + (c.stats?.sent || 0), 0),
      cost: list.filter((c) => ["approved", "sending", "sent"].includes(c.status)).reduce((t, c) => t + (c.estimate?.costInr || 0), 0),
    };
  }, [all.data]);

  return (
    <CrmPage
      title="Campaigns"
      subtitle="One-off messages — segment, cost estimate, approval, then delivery"
      actions={can(me, "marketer") && <Link to="/crm/campaigns/new" className="btn-gold"><Plus size={14} /> New campaign</Link>}
    >
      <ErrorNote error={all.error} />
      {all.data && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 14, marginBottom: 16 }}>
          <StatCard label="Campaigns" value={num(summary.total)} icon={Megaphone} />
          <StatCard label="Awaiting approval" value={num(summary.pending)} icon={Hourglass} iconColor={COLORS.orange} iconBg="rgba(245,158,11,0.1)" />
          <StatCard label="Messages sent" value={num(summary.sent)} icon={CheckCircle2} iconColor={COLORS.green} iconBg="rgba(52,211,153,0.1)" />
          <StatCard label="Approved spend (est.)" value={inr(summary.cost)} icon={IndianRupee} iconColor={COLORS.purple} iconBg="rgba(167,139,250,0.1)" />
        </div>
      )}
      <TableCard
        title="Recent Campaigns" icon="📣"
        actions={
          <select className="gm-input" style={{ width: 180 }} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        }
      >
        {all.loading && !all.data ? <Loading /> : (
          <table className="gm-table">
            <thead><tr><th>Campaign</th><th>Audience</th><th>Channel</th><th>Status</th><th>Recipients</th><th>Est. cost</th><th>Delivered</th><th>Scheduled</th><th>Created by</th></tr></thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c._id} style={{ cursor: "pointer" }} onClick={() => navigate(`/crm/campaigns/${c._id}`)}>
                  <td>{c.name || "Untitled"}</td>
                  <td><span style={{ textTransform: "capitalize" }}>{c.segment?.role || "—"}</span> {c.category === "transactional" && <CategoryPill category="transactional" />}</td>
                  <td>{CHANNEL[c.channel] || c.channel}{c.fallback ? ` → ${CHANNEL[c.fallback] || c.fallback}` : ""}</td>
                  <td><StatusPill status={c.status} /></td>
                  <td>{c.estimate?.at ? num(c.estimate.recipients) : "—"}</td>
                  <td>{c.estimate?.at ? inr(c.estimate.costInr) : "—"}</td>
                  <td>{c.stats?.queued ? `${num(c.stats.sent)} / ${num(c.stats.queued)}` : "—"}</td>
                  <td>{c.scheduledAt ? dt(c.scheduledAt) : "On approval"}</td>
                  <td style={{ fontSize: 12 }}>{c.createdBy}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{dt(c.createdAt)}</div></td>
                </tr>
              ))}
              {all.data && !rows.length && <tr><td colSpan={9} style={{ textAlign: "center", color: "rgba(255,255,255,0.35)" }}>No campaigns found</td></tr>}
            </tbody>
          </table>
        )}
      </TableCard>
      <div style={{ marginTop: 12 }}>
        <Hint>The cost estimate cannot be skipped (PRD §3.2). Campaigns above the approval limit (default ₹500) and all transactional campaigns need approval from a second person.</Hint>
      </div>
    </CrmPage>
  );
}
