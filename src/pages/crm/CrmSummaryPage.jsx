// Daily Summary — one page with yesterday's numbers (vs the day before), today so far, driver groups, app update,
// worst area and time, WhatsApp limit, and "what to do today". Copy the text to share it. Data: CRM /summary.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, ArrowRight } from "lucide-react";
import { crmGet } from "../../api/crm";
import { CrmPage, useCrm, Loading, ErrorNote, Section, Grid, COLORS, num, inr, dt, Tile, Tiles, AreaButtons, dayKeyLabel, pctOf, Empty } from "./crmShared";
import { dim, soft } from "./crmMessageParts";
import { useToast } from "../../components/ui";

const GROUP = [["active", "Active", COLORS.green], ["slowing", "Slowing down", COLORS.gold], ["gone_7", "Gone 7+ days", COLORS.orange], ["gone_14", "Gone 14+ days", "#FB7185"],
  ["gone_30", "Gone 30+ days", COLORS.red], ["never_online", "Never online", COLORS.purple], ["kyc_pending", "KYC not finished", COLORS.blue]];

// "▲ 10 vs day before" (up = good unless `bad`)
function Delta({ now, before, bad = false, label = "vs day before" }) {
  if (before == null || now == null) return null;
  const d = now - before;
  if (!d) return <span style={{ color: dim }}>same {label}</span>;
  const good = bad ? d < 0 : d > 0;
  return <span style={{ color: good ? COLORS.green : COLORS.red }}>{d > 0 ? "▲" : "▼"} {num(Math.abs(d))} {label}</span>;
}

export default function CrmSummaryPage() {
  const toast = useToast();
  const [area, setArea] = useState("ncr");
  const d = useCrm("/summary", { params: { area }, refreshMs: 300000 });
  const r = d.data;
  const y = r?.yesterdayNumbers, b = r?.dayBefore, t = r?.todaySoFar;
  const gt = r?.groups.today || {}, gy = r?.groups.yesterday, gw = r?.groups.weekAgo;

  async function copy() {
    try {
      const text = await crmGet("/summary/text", { area });
      await navigator.clipboard.writeText(text);
      toast?.("Summary copied — paste it in WhatsApp / email", "success");
    } catch { toast?.("Could not copy", "error"); }
  }

  return (
    <CrmPage title="Daily Summary" subtitle="Yesterday at a glance, today so far, and what to do next"
      actions={r && <button className="btn-outline" onClick={copy}><Copy size={14} /> Copy as text</button>}>
      <ErrorNote error={d.error} />
      <div style={{ marginBottom: 14 }}><AreaButtons value={area} onChange={setArea} /></div>
      {d.loading && !r && <Loading />}
      {r && (
        <>
          <Section title="What to do today" subtitle="The most useful next steps from today's numbers">
            {r.todo.length ? r.todo.map((x, i) => (
              <Link key={x.key} to={x.group ? `${x.link}?group=${x.group}` : x.link} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, marginBottom: 8, textDecoration: "none",
                background: i === 0 ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${i === 0 ? "rgba(212,175,55,0.35)" : "rgba(255,255,255,0.07)"}`,
              }}>
                <span style={{ width: 24, height: 24, borderRadius: "50%", background: COLORS.gold, color: "#0b1030", fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ color: "#fff", fontSize: 13, flex: 1 }}>{x.text}</span>
                <ArrowRight size={16} color={COLORS.gold} />
              </Link>
            )) : <Empty>Nothing urgent today</Empty>}
          </Section>

          <Section title={`Yesterday — ${dayKeyLabel(r.yesterday)}`} subtitle="Full day, compared with the day before">
            <Tiles min={175}>
              <Tile label="Drivers online" value={num(y.driversOnline)} sub={<Delta now={y.driversOnline} before={b.driversOnline} />} color={COLORS.green} />
              <Tile label="Came back after 7+ days" value={num(y.cameBack)} sub="online again after a week or more away" color={COLORS.green} />
              <Tile label="Rides completed" value={num(y.rides)} sub={<Delta now={y.rides} before={b.rides} />} />
              <Tile label="Requests missed" value={num(y.missedRequests)} sub={<>{num(y.missedDrivers)} drivers · {inr(y.missedFare)} · <Delta now={y.missedRequests} before={b.missedRequests} bad /></>} color={COLORS.red} />
              <Tile label="Messages sent" value={num(y.messages.sent)} sub={`${num(y.messages.read)} read · ${num(y.messages.failed)} failed`} color={COLORS.gold} />
              <Tile label="Message cost" value={inr(y.messages.cost)} sub={<Delta now={Math.round(y.messages.cost)} before={Math.round(b.messages.cost)} bad />} color={COLORS.orange} />
              <Tile label="App updated" value={num(y.appUpdated)} sub={`${num(r.app.pending)} of ${num(r.app.total)} still on an old version`} color={COLORS.blue} />
            </Tiles>
          </Section>

          <Section title="Today so far" subtitle={`Until ${dt(r.generatedAt)}`}>
            <Tiles min={160}>
              <Tile label="Drivers online" value={num(t.driversOnline)} color={COLORS.green} />
              <Tile label="Rides" value={num(t.rides)} />
              <Tile label="Requests missed" value={num(t.missedRequests)} sub={inr(t.missedFare)} color={COLORS.red} />
              <Tile label="Messages" value={num(t.messages.sent)} sub={`${num(t.messages.read)} read · ${inr(t.messages.cost)}`} color={COLORS.gold} />
              <Tile label="App updated" value={num(t.appUpdated)} color={COLORS.blue} />
            </Tiles>
          </Section>

          <Grid min={360}>
            <Section title="Driver groups now" subtitle={gy ? "Change vs yesterday · vs 7 days ago" : "Change shows from tomorrow"} style={{ marginBottom: 0 }}>
              {GROUP.map(([k, label, color]) => (
                <Link key={k} to={`/crm/driver-groups?group=${k}`} style={{ display: "grid", gridTemplateColumns: "1fr 60px 1fr", gap: 8, alignItems: "center", padding: "7px 0", borderTop: "1px solid rgba(255,255,255,0.05)", textDecoration: "none", fontSize: 12.5 }}>
                  <span style={{ color: soft }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: color, marginRight: 8 }} />{label}</span>
                  <b style={{ color, textAlign: "right" }}>{num(gt[k])}</b>
                  <span style={{ fontSize: 11 }}>
                    <Delta now={gt[k]} before={gy?.[k]} bad={k !== "active"} label="vs yesterday" />
                    {gw && <span style={{ color: dim }}> · 7d ago {num(gw[k])}</span>}
                  </span>
                </Link>
              ))}
            </Section>

            <Section title="Where and when rides are missed" subtitle="Last 30 days — worst areas" style={{ marginBottom: 0 }}>
              {r.worstAreas.length ? r.worstAreas.map((a, i) => (
                <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderTop: i ? "1px solid rgba(255,255,255,0.05)" : "none", fontSize: 12.5 }}>
                  <span><b style={{ color: "#fff" }}>{a.area}</b> <span style={{ color: COLORS.red }}>· worst {a.peak.label}</span></span>
                  <span style={{ color: soft }}>{num(a.missed)} missed · {inr(a.missedFare)}</span>
                </div>
              )) : <Empty>No data yet</Empty>}
              <Link to="/crm/demand" style={{ fontSize: 12, color: COLORS.gold, display: "inline-block", marginTop: 8 }}>Open Where Rides Missed →</Link>
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 12.5 }}>
                <div style={{ color: dim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".6px", marginBottom: 4 }}>WhatsApp (last 24 h)</div>
                <span style={{ color: "#fff" }}>{num(r.whatsapp.used)} of {num(r.whatsapp.limit)} people</span>
                <span style={{ color: r.whatsapp.marketingLeft > 20 ? COLORS.green : COLORS.red }}> · {num(r.whatsapp.marketingLeft)} marketing left</span>
                <div style={{ color: dim, fontSize: 11.5, marginTop: 4 }}>App update reminder (J-24): {r.app.j24On ? `on · ${num(r.app.perDay)} drivers a day` : "off"} · {pctOf(r.app.total - r.app.pending, r.app.total)} on the new version</div>
              </div>
            </Section>
          </Grid>
        </>
      )}
    </CrmPage>
  );
}
