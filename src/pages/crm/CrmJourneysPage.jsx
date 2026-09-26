// Journeys (PRD Part 2) — configured once, then run automatically. Toggle on/off and see live run counts.
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { GitBranch, Power, Activity, Target } from "lucide-react";
import { StatCard, TableCard, Toggle } from "../../components/ui";
import { CrmPage, useCrm, useCrmMe, useAction, can, Loading, ErrorNote, Pill, CategoryPill, Hint, COLORS, num } from "./crmShared";
import { crmPost } from "../../api/crm";

const triggerText = (t = {}) => (t.type === "event" ? t.event : t.type === "schedule" ? "Daily schedule" : t.type === "segment_entry" ? "Segment entry" : t.type || "—");

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
  const journeys = data?.journeys || [];
  const totals = useMemo(() => ({
    enabled: journeys.filter((j) => j.enabled).length,
    active: Object.values(stats).reduce((t, s) => t + (s.active || 0), 0),
    goals: Object.values(stats).reduce((t, s) => t + (s.goal_met || 0), 0),
  }), [journeys, stats]);

  async function toggle(j, enabled) {
    const msg = enabled ? `Turn on "${j.name}"? New contacts will start entering this journey.`
      : `Pause "${j.name}"? Running journeys stop where they are (runs paused for over 24 hours expire).`;
    if (!window.confirm(msg)) return;
    await run(j.key, () => crmPost(`/journeys/${encodeURIComponent(j.key)}/toggle`, { enabled }), enabled ? "Journey turned on" : "Journey paused");
    reload();
  }

  const table = (title, icon, list) => (
    <div style={{ marginBottom: 16 }}>
      <TableCard title={title} icon={icon}>
        <table className="gm-table">
          <thead><tr><th>Journey</th><th>Trigger</th><th>Type</th><th>Priority</th><th>Active</th><th>Goal met</th><th>Total runs</th><th>Status</th></tr></thead>
          <tbody>
            {list.map((j) => {
              const s = stats[j.key] || {};
              const total = Object.values(s).reduce((a, b) => a + b, 0);
              return (
                <tr key={j.key} style={{ cursor: "pointer" }} onClick={() => navigate(`/crm/journeys/${encodeURIComponent(j.key)}`)}>
                  <td><div style={{ color: "rgba(255,255,255,0.9)" }}>{j.name}</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>Version {j.version || 1}</div></td>
                  <td style={{ fontSize: 12, fontFamily: "monospace", color: "rgba(255,255,255,0.55)" }}>{triggerText(j.trigger)}</td>
                  <td><CategoryPill category={j.category} /></td>
                  <td>{j.priority ?? "—"}</td>
                  <td>{num(s.active || 0)}</td>
                  <td>{num(s.goal_met || 0)}</td>
                  <td>{num(total)}</td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {can(me, "admin")
                      ? <Toggle checked={!!j.enabled} onChange={(v) => busy !== j.key && toggle(j, v)} label={j.enabled ? "On" : "Off"} />
                      : <Pill tone={j.enabled ? "green" : "gray"}>{j.enabled ? "On" : "Off"}</Pill>}
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
    <CrmPage title="Journeys" subtitle="Automated message flows triggered by what riders and drivers do — driver journeys ship first">
      <ErrorNote error={error} />
      {loading && !data && <Loading />}
      {data && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 14, marginBottom: 16 }}>
            <StatCard label="Journeys" value={num(journeys.length)} icon={GitBranch} />
            <StatCard label="Live" value={num(totals.enabled)} icon={Power} iconColor={COLORS.green} iconBg="rgba(52,211,153,0.1)" />
            <StatCard label="Active runs" value={num(totals.active)} icon={Activity} iconColor={COLORS.blue} iconBg="rgba(96,165,250,0.1)" />
            <StatCard label="Goals met (all time)" value={num(totals.goals)} icon={Target} iconColor={COLORS.purple} iconBg="rgba(167,139,250,0.1)" />
          </div>
          {table("Driver Journeys", "🚗", journeys.filter((j) => j.audience?.roles?.includes("driver")))}
          {table("Passenger Journeys", "🧍", journeys.filter((j) => !j.audience?.roles?.includes("driver")))}
          <Hint>
            <b>Marketing</b> journeys only reach contacts with marketing consent. The ride platform does not record marketing consent yet, so these
            journeys currently reach no one. <b>Transactional</b> journeys (KYC, documents, dues, receipts) do not need consent but still respect quiet hours.
            J-11 is off by default because the ride platform already sends its own subscription expiry reminders. Only CRM admins can turn journeys on or off.
          </Hint>
        </>
      )}
    </CrmPage>
  );
}
