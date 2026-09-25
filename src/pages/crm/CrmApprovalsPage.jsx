// Approval ka intezaar — PRD §3.1 step 6: mehenga (Settings limit se upar) ya transactional campaign doosra insaan approve kare.
import { useNavigate } from "react-router-dom";
import { TableCard } from "../../components/ui";
import { CrmPage, useCrm, useCrmMe, can, Loading, ErrorNote, Pill, Hint, CHANNEL, inr, num, dt } from "./crmShared";

export default function CrmApprovalsPage() {
  const navigate = useNavigate();
  const me = useCrmMe();
  const { data, error, loading } = useCrm("/campaigns", { params: { status: "pending_approval" }, refreshMs: 20000 });

  return (
    <CrmPage title="Approvals" subtitle="Ye campaigns bhejne se pehle kisi doosre insaan ki haan maang rahe hain">
      <ErrorNote error={error} />
      {me && !can(me, "approver") && <Hint>Aap dekh sakte hain, par approve sirf admin / super admin kar sakta hai.</Hint>}
      <div style={{ marginTop: 12 }}>
        <TableCard title="Pending approval" icon="✅">
          {loading && !data ? <Loading /> : (
            <table className="gm-table">
              <thead><tr><th>Campaign</th><th>Kisko</th><th>Channel</th><th>Recipients</th><th>Kharcha</th><th>Submit kiya</th><th></th></tr></thead>
              <tbody>
                {(data || []).map((c) => {
                  const mine = me?.email && [c.createdBy, c.submittedBy].includes(me.email);
                  return (
                    <tr key={c._id} style={{ cursor: "pointer" }} onClick={() => navigate(`/crm/campaigns/${c._id}`)}>
                      <td>{c.name || "(bina naam)"} {c.category === "transactional" && <Pill tone="blue">Transactional</Pill>}</td>
                      <td>{c.segment?.role}</td>
                      <td>{CHANNEL[c.channel] || c.channel}</td>
                      <td>{num(c.estimate?.recipients)}</td>
                      <td><b style={{ color: "#fff" }}>{inr(c.estimate?.costInr)}</b></td>
                      <td style={{ fontSize: 12 }}>{c.submittedBy}<div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{dt(c.updatedAt)}</div></td>
                      <td>{mine ? <Pill>Aapka — doosra approve karega</Pill> : <span className="btn-outline btn-xs">Dekhein →</span>}</td>
                    </tr>
                  );
                })}
                {data && !data.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "rgba(255,255,255,0.35)" }}>Kuch pending nahi 🎉</td></tr>}
              </tbody>
            </table>
          )}
        </TableCard>
      </div>
    </CrmPage>
  );
}
