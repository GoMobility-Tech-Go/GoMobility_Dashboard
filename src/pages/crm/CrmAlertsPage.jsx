// Alerts raised by journey "notify ops" steps — e.g. J-16: a driver document stuck in manual review for 3+ days.
import { TableCard } from "../../components/ui";
import { CrmPage, useCrm, Loading, ErrorNote, Pill, Hint, dt, shortKey } from "./crmShared";

export default function CrmAlertsPage() {
  const { data, error, loading } = useCrm("/ops/notifications", { params: { limit: 200 }, refreshMs: 30000 });
  return (
    <CrmPage title="Ops Alerts" subtitle="Situations where a journey needs a person to step in">
      <ErrorNote error={error} />
      <TableCard title="Alerts (newest first)" icon="🔔">
        {loading && !data ? <Loading /> : (
          <table className="gm-table">
            <thead><tr><th>Raised</th><th>Journey</th><th>Details</th><th>User ID</th></tr></thead>
            <tbody>
              {(data || []).map((a) => (
                <tr key={a._id}>
                  <td style={{ whiteSpace: "nowrap" }}>{dt(a.occurredAt || a.createdAt)}</td>
                  <td><Pill tone="gold">{shortKey(a.payload?.journey) || "—"}</Pill></td>
                  <td style={{ fontSize: 12.5 }}>{a.payload?.text || JSON.stringify(a.payload)}</td>
                  <td style={{ fontSize: 11 }}>{a.userId}</td>
                </tr>
              ))}
              {data && !data.length && <tr><td colSpan={4} style={{ textAlign: "center", color: "rgba(255,255,255,0.35)" }}>No alerts</td></tr>}
            </tbody>
          </table>
        )}
      </TableCard>
      <div style={{ marginTop: 12 }}><Hint>To receive these alerts in Slack as well, set OPS_ALERT_WEBHOOK_URL on the CRM service.</Hint></div>
    </CrmPage>
  );
}
