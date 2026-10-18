// Not reachable — drivers / passengers the CRM cannot reach and why: not on WhatsApp, app removed (dead push token),
// no push token, pressed Stop, blocked by ops, no phone. For the team to call or SMS them (Excel download).
// Data: CRM /reach. "Not on WhatsApp" is known only after one WhatsApp was tried.
import { useState } from "react";
import { TableCard } from "../../components/ui";
import { CrmPage, useCrm, Loading, ErrorNote, Pill, Hint, Section, Paged, COLORS, num, dt, Tile, Tiles, AreaButtons, Chips, pctOf, Empty } from "./crmShared";
import { ContactCell, DownloadButton, dim } from "./crmMessageParts";

const ROLES = [["driver", "Drivers"], ["passenger", "Passengers"]];
const TONE = { no_whatsapp: "red", push_dead: "orange", no_push: "gray", stopped: "purple", suppressed: "red", no_phone: "red" };
const SHORT = { no_whatsapp: "No WhatsApp", push_dead: "App removed", no_push: "No push", stopped: "Pressed Stop", suppressed: "Blocked", no_phone: "No phone" };

export default function CrmReachPage() {
  const [role, setRole] = useState("driver");
  const [area, setArea] = useState("ncr");
  const [kind, setKind] = useState("unreachable");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const params = { role, area, kind, ...(search ? { q: search } : {}) };
  const d = useCrm("/reach", { params, refreshMs: 300000 });
  const r = d.data;
  const label = (k) => r?.kinds.find((x) => x.key === k)?.label || k;

  return (
    <CrmPage title="Not reachable" subtitle="Who the CRM cannot reach and why — call or SMS them instead">
      <ErrorNote error={d.error} />
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
        <Chips items={ROLES} value={role} onChange={setRole} />
        <AreaButtons value={area} onChange={setArea} />
      </div>
      {d.loading && !r && <Loading />}
      {r && (
        <>
          <Section title={`${num(r.total)} ${role}s`} subtitle="Click a number to list those people">
            <Tiles>
              {r.kinds.map((k) => (
                <Tile key={k.key} label={k.label} value={num(r.counts[k.key])} sub={pctOf(r.counts[k.key], r.total)}
                  color={k.key === "unreachable" ? COLORS.red : "#fff"} active={kind === k.key} onClick={() => setKind(k.key)} />
              ))}
            </Tiles>
          </Section>

          <TableCard title={`${label(kind)} (${num(r.list.length)})`} icon="📵" actions={<DownloadButton path="/reach/export" params={params} />}>
            <form onSubmit={(e) => { e.preventDefault(); setSearch(q.trim()); }} style={{ display: "flex", gap: 6, padding: "4px 0 12px", justifyContent: "flex-end" }}>
              <input className="gm-input" style={{ width: 220 }} placeholder="Name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn-outline btn-sm" type="submit">Search</button>
            </form>
            <Paged rows={r.list} resetKey={`${role}|${area}|${kind}|${search}`}>{(pageRows) => (
              <table className="gm-table">
                <thead><tr><th>{role === "driver" ? "Driver" : "Passenger"}</th><th>City</th><th>Problems</th><th>Last online</th><th>Last ride</th><th>Rides (30d / total)</th>{role === "driver" && <th>App</th>}</tr></thead>
                <tbody>
                  {r.list.length === 0 && <tr><td colSpan={7}><Empty>Nobody here</Empty></td></tr>}
                  {pageRows.map((x) => (
                    <tr key={x.userId}>
                      <td><ContactCell name={x.name} phone={x.phone} userId={x.userId} /></td>
                      <td style={{ fontSize: 12 }}>{x.city || (x.cityId ? `#${x.cityId}` : "—")}</td>
                      <td>
                        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{x.problems.map((p) => <Pill key={p.key} tone={TONE[p.key]}>{SHORT[p.key] || p.label}</Pill>)}</div>
                        {x.waFailedAt && <div style={{ fontSize: 10.5, color: dim, marginTop: 3 }}>WhatsApp failed {dt(x.waFailedAt)}</div>}
                      </td>
                      <td style={{ fontSize: 12 }}>{x.lastOnlineAt ? dt(x.lastOnlineAt) : "—"}</td>
                      <td style={{ fontSize: 12 }}>{x.lastRideAt ? dt(x.lastRideAt) : "—"}</td>
                      <td style={{ fontSize: 12 }}>{num(x.rides30d)} / {num(x.ridesTotal)}</td>
                      {role === "driver" && <td style={{ fontSize: 12 }}>{x.appVersion ? `v${x.appVersion}` : "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}</Paged>
          </TableCard>
          <div style={{ marginTop: 16 }}>
            <Hint>
              <b>No WhatsApp and no working push</b> = the CRM has no way left to reach them — only a call or SMS works.
              "Not on WhatsApp" is learnt when a WhatsApp fails (Meta 131026) and is retried after 30 days. "App removed" = the phone rejected the push token.
            </Hint>
          </div>
        </>
      )}
    </CrmPage>
  );
}
