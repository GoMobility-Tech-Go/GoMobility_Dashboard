// Har message ka log — kis channel se, kis journey/campaign se, gaya ya kyun roka gaya.
import { useEffect, useState } from "react";
import { TableCard } from "../../components/ui";
import { crmGet, crmErrorText } from "../../api/crm";
import { CrmPage, Loading, ErrorNote, StatusPill, Pill, CHANNEL, inr, dt } from "./crmShared";

const STATUSES = ["", "dry_run", "queued", "sent", "delivered", "read", "failed", "skipped", "blocked"];

export default function CrmMessagesPage() {
  const [filters, setFilters] = useState({ channel: "", status: "", kind: "" });
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const params = (before) => Object.fromEntries(Object.entries({ ...filters, before, limit: 50 }).filter(([, v]) => v));

  useEffect(() => {
    let alive = true;
    setLoading(true); setError(null);
    crmGet("/messages", params())
      .then((r) => { if (alive) { setItems(r.items); setNext(r.nextBefore); } })
      .catch((e) => alive && setError(crmErrorText(e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  async function more() {
    setLoading(true);
    try { const r = await crmGet("/messages", params(next)); setItems((p) => [...p, ...r.items]); setNext(r.nextBefore); }
    catch (e) { setError(crmErrorText(e)); }
    finally { setLoading(false); }
  }

  const sel = (k, opts, label) => (
    <select className="gm-input" style={{ width: 170 }} value={filters[k]} onChange={(e) => setFilters((p) => ({ ...p, [k]: e.target.value }))}>
      {opts.map(([v, l]) => <option key={v} value={v}>{v ? l : label}</option>)}
    </select>
  );

  return (
    <CrmPage title="Messages" subtitle="CRM se gaya har message — dry run, failed aur roke gaye bhi">
      <ErrorNote error={error} />
      <TableCard
        title="Message log" icon="✉️"
        actions={<>
          {sel("channel", [["", ""], ...Object.entries(CHANNEL)], "Saare channels")}
          {sel("status", STATUSES.map((s) => [s, s]), "Saare status")}
          {sel("kind", [["", ""], ["journey", "Journeys"], ["campaign", "Campaigns"]], "Journey + campaign")}
        </>}
        footer={next && <button className="btn-outline btn-sm" disabled={loading} onClick={more}>{loading ? "Load…" : "Aur dikhao"}</button>}
      >
        {loading && !items.length ? <Loading /> : (
          <table className="gm-table">
            <thead><tr><th>Kab</th><th>User</th><th>Channel</th><th>Kahan se</th><th>Message</th><th>Status</th><th>Kharcha</th></tr></thead>
            <tbody>
              {items.map((m) => (
                <tr key={m._id}>
                  <td style={{ whiteSpace: "nowrap" }}>{dt(m.createdAt)}</td>
                  <td style={{ fontSize: 11.5 }}>{m.userId || "—"}<div style={{ color: "rgba(255,255,255,0.35)" }}>{m.role}</div></td>
                  <td>{CHANNEL[m.channel] || m.channel}{m.direction === "in" && <> <Pill tone="blue">Aaya</Pill></>}</td>
                  <td style={{ fontSize: 12 }}>{m.source?.kind === "campaign" ? "Campaign" : (m.source?.ref || "—").split("_")[0]}{m.source?.node ? ` · ${m.source.node}` : ""}{m.category === "transactional" && <div><Pill tone="blue">Transactional</Pill></div>}</td>
                  <td style={{ fontSize: 12, maxWidth: 360 }}>{m.payload?.title ? <b style={{ color: "rgba(255,255,255,0.85)" }}>{m.payload.title} </b> : null}{m.payload?.body || (m.payload?.templateName ? `Template: ${m.payload.templateName}` : "")}</td>
                  <td><StatusPill status={m.status} />{m.error && <div style={{ fontSize: 10.5, color: "#F87171", marginTop: 3 }}>{m.error}</div>}</td>
                  <td>{m.costInr ? inr(m.costInr) : "—"}</td>
                </tr>
              ))}
              {!loading && !items.length && <tr><td colSpan={7} style={{ textAlign: "center", color: "rgba(255,255,255,0.35)" }}>Koi message nahi</td></tr>}
            </tbody>
          </table>
        )}
      </TableCard>
    </CrmPage>
  );
}
