// Journeys ke "notify ops" steps ke alerts — jaise J-16: driver ka document 3+ din se manual review mein atka.
import { TableCard } from "../../components/ui";
import { CrmPage, useCrm, Loading, ErrorNote, Pill, Hint, dt } from "./crmShared";

export default function CrmAlertsPage() {
  const { data, error, loading } = useCrm("/ops/notifications", { params: { limit: 200 }, refreshMs: 30000 });
  return (
    <CrmPage title="Ops alerts" subtitle="Jahan insaan ko kuch karna hai — journeys yahan batati hain">
      <ErrorNote error={error} />
      <TableCard title="Alerts (naye pehle)" icon="🔔">
        {loading && !data ? <Loading /> : (
          <table className="gm-table">
            <thead><tr><th>Kab</th><th>Journey</th><th>Kya hua</th><th>User ID</th></tr></thead>
            <tbody>
              {(data || []).map((a) => (
                <tr key={a._id}>
                  <td style={{ whiteSpace: "nowrap" }}>{dt(a.occurredAt || a.createdAt)}</td>
                  <td><Pill tone="gold">{(a.payload?.journey || "—").split("_")[0]}</Pill></td>
                  <td style={{ fontSize: 12.5 }}>{a.payload?.text || JSON.stringify(a.payload)}</td>
                  <td style={{ fontSize: 11 }}>{a.userId}</td>
                </tr>
              ))}
              {data && !data.length && <tr><td colSpan={4} style={{ textAlign: "center", color: "rgba(255,255,255,0.35)" }}>Koi alert nahi</td></tr>}
            </tbody>
          </table>
        )}
      </TableCard>
      <div style={{ marginTop: 12 }}><Hint>Slack pe bhi chahiye toh CRM backend mein OPS_ALERT_WEBHOOK_URL set karein.</Hint></div>
    </CrmPage>
  );
}
