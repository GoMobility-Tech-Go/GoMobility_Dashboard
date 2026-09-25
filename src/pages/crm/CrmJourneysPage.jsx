// Journeys (PRD Part 2) — "ek baar set, phir apne aap chalti hai". Yahan: ON/OFF, kitne chal rahe, goal kitno ka hua.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TableCard, Toggle } from "../../components/ui";
import { CrmPage, useCrm, useCrmMe, useAction, can, Loading, ErrorNote, Pill, Hint, num } from "./crmShared";
import { crmPost } from "../../api/crm";

const who = (j) => (j.audience?.roles || []).join(", ") || "—";
const triggerText = (t = {}) => (t.type === "event" ? `Event: ${t.event}` : t.type === "schedule" ? "Roz ka check (schedule)" : t.type === "segment_entry" ? "Segment mein aaye" : t.type || "—");

export default function CrmJourneysPage() {
  const navigate = useNavigate();
  const me = useCrmMe();
  const { data, error, loading, reload } = useCrm("/journeys", { refreshMs: 30000 });
  const { busy, run } = useAction();

  const stats = useMemo(() => {
    const m = {};
    for (const { _id, n } of data?.stats || []) (m[_id.k] ||= {})[_id.s] = n;
    return m;
  }, [data]);

  async function toggle(j, enabled) {
    const msg = enabled ? `${j.name} ON karein? Naye log is journey mein aane lagenge.`
      : `${j.name} PAUSE karein? Chalti runs wahin ruk jayengi (24h se zyada ruki toh expire).`;
    if (!window.confirm(msg)) return;
    await run(j.key, () => crmPost(`/journeys/${encodeURIComponent(j.key)}/toggle`, { enabled }), enabled ? "Journey ON" : "Journey paused");
    reload();
  }

  const journeys = data?.journeys || [];
  const drivers = journeys.filter((j) => j.audience?.roles?.includes("driver"));
  const passengers = journeys.filter((j) => !j.audience?.roles?.includes("driver"));

  const table = (title, icon, list) => (
    <div style={{ marginBottom: 16 }}>
      <TableCard title={title} icon={icon}>
        <table className="gm-table">
          <thead><tr><th>Journey</th><th>Trigger</th><th>Type</th><th>Priority</th><th>Chal rahi</th><th>Goal poora</th><th>Kul</th><th>ON / OFF</th></tr></thead>
          <tbody>
            {list.map((j) => {
              const s = stats[j.key] || {};
              const total = Object.values(s).reduce((a, b) => a + b, 0);
              return (
                <tr key={j.key} style={{ cursor: "pointer" }} onClick={() => navigate(`/crm/journeys/${encodeURIComponent(j.key)}`)}>
                  <td><div style={{ color: "rgba(255,255,255,0.9)" }}>{j.name}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{who(j)} · v{j.version || 1}</div></td>
                  <td style={{ fontSize: 12 }}>{triggerText(j.trigger)}</td>
                  <td><Pill tone={j.category === "transactional" ? "blue" : "gold"}>{j.category === "transactional" ? "Transactional" : "Marketing"}</Pill></td>
                  <td>{j.priority ?? "—"}</td>
                  <td>{num(s.active || 0)}</td>
                  <td>{num(s.goal_met || 0)}</td>
                  <td>{num(total)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {can(me, "admin")
                      ? <Toggle checked={!!j.enabled} onChange={(v) => busy !== j.key && toggle(j, v)} label={j.enabled ? "ON" : "OFF"} />
                      : <Pill tone={j.enabled ? "green" : "gray"}>{j.enabled ? "ON" : "OFF"}</Pill>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>
    </div>
  );

  return (
    <CrmPage title="Journeys" subtitle="Automatic message flows — driver journeys pehle (supply hi bottleneck hai, PRD §2.5)">
      <ErrorNote error={error} />
      {loading && !data && <Loading />}
      {data && (
        <>
          {table("Driver journeys", "🚗", drivers)}
          {table("Passenger journeys", "🧍", passengers)}
          <Hint>
            <b>Marketing</b> journeys sirf unhe jaati hain jinka marketing consent hai — ride backend mein abhi consent column nahi, isliye ye abhi kisi ko nahi jaayengi.
            {" "}<b>Transactional</b> (KYC, documents, dues, receipt) consent ke bina bhi jaati hain, par quiet hours maanti hain.
            {" "}J-11 OFF hai: ride backend abhi khud subscription expiry reminder (D-5, D-1) bhejta hai — wo band hone ke baad ON karein.
            {" "}ON/OFF sirf CRM admin (super admin) kar sakta hai.
          </Hint>
        </>
      )}
    </CrmPage>
  );
}
