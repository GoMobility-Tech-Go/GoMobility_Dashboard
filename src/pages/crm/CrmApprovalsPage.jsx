// Approval queue — PRD §3.1 step 6: expensive (above the approval limit) or transactional campaigns need a second person.
import { useNavigate } from "react-router-dom";
import { TableCard } from "../../components/ui";
import { CrmPage, useCrm, useCrmMe, can, Loading, ErrorNote, Pill, CategoryPill, Hint, CHANNEL, inr, num, dt } from "./crmShared";

export default function CrmApprovalsPage() {
  const navigate = useNavigate();
  const me = useCrmMe();
  const { data, error, loading } = useCrm("/campaigns", { params: { status: "pending_approval" }, refreshMs: 20000 });

  return (
    <CrmPage title="Approvals" subtitle="Campaigns waiting for a second person's sign-off before they are sent">
      <ErrorNote error={error} />
      {me && !can(me, "approver") && <div style={{ marginBottom: 12 }}><Hint>You can view this queue. Approving requires the Approver or CRM Admin role.</Hint></div>}
      <TableCard title="Pending Approval" icon="✅">
        {loading && !data ? <Loading /> : (
          <table className="gm-table">
            <thead><tr><th>Campaign</th><th>Audience</th><th>Channel</th><th>Recipients</th><th>Est. cost</th><th>Submitted by</th><th></th></tr></thead>
            <tbody>
              {(data || []).map((c) => {
                const mine = me?.email && [c.createdBy, c.submittedBy].includes(me.email);
                return (
                  <tr key={c._id} style={{ cursor: "pointer" }} onClick={() => navigate(`/crm/campaigns/${c._id}`)}>
                    <td>{c.name || "Untitled"} {c.category === "transactional" && <CategoryPill category="transactional" />}</td>
                    <td style={{ textTransform: "capitalize" }}>{c.segment?.role}</td>
                    <td>{CHANNEL[c.channel] || c.channel}</td>
                    <td>{num(c.estimate?.recipients)}</td>
                    <td><b style={{ color: "#fff" }}>{inr(c.estimate?.costInr)}</b></td>
                    <td style={{ fontSize: 12 }}>{c.submittedBy}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{dt(c.updatedAt)}</div></td>
                    <td>{mine ? <Pill>Yours — needs another approver</Pill> : <span className="btn-outline btn-xs">Review →</span>}</td>
                  </tr>
                );
              })}
              {data && !data.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "rgba(255,255,255,0.35)" }}>Nothing waiting for approval</td></tr>}
            </tbody>
          </table>
        )}
      </TableCard>
    </CrmPage>
  );
}
