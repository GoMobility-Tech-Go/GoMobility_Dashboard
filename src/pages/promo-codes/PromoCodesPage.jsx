import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, TableCard, Badge, AvatarCell, MiniStatRow, Modal, FormGroup, Toggle, AlertBox, GlobalStyles, Card } from "../../components/ui/index.jsx";
import { useAuth } from "../../context/AuthContext";
const PROMOS = [{ code: "GORIDE50", discount: "50%", limit: 500, used: 312, expiry: "30 Apr 2026", status: "Active", type: "Percentage" }, { code: "WELCOME30", discount: "30%", limit: 1000, used: 847, expiry: "31 May 2026", status: "Active", type: "Percentage" }, { code: "MONSOON25", discount: "25%", limit: 2000, used: 1204, expiry: "30 Jun 2026", status: "Active", type: "Percentage" }, { code: "FLAT100", discount: "Rs100", limit: 200, used: 198, expiry: "15 Apr 2026", status: "Expired", type: "Flat" }, { code: "NEWUSER40", discount: "40%", limit: 5000, used: 2341, expiry: "31 Dec 2026", status: "Active", type: "Percentage" }, { code: "BIKEONLY20", discount: "20%", limit: 800, used: 621, expiry: "31 May 2026", status: "Active", type: "Vehicle-Specific" }];
const TOP = [{ rank: 1, name: "Priya Singh", refs: 47, earned: 2350, last: "2 days ago" }, { rank: 2, name: "Rahul Sharma", refs: 38, earned: 1900, last: "3 days ago" }, { rank: 3, name: "Amit Kumar", refs: 31, earned: 1550, last: "5 days ago" }, { rank: 4, name: "Neha Gupta", refs: 24, earned: 1200, last: "7 days ago" }, { rank: 5, name: "Raj Patel", refs: 18, earned: 900, last: "10 days ago" }];
function Content() {
  const toast = useToast(), { user } = useAuth(), [tab, setTab] = useState("codes"), [cm, setCm] = useState(false);
  const [promos, setPromos] = useState(PROMOS), [refActive, setRefActive] = useState(true);
  const [nc, setNc] = useState({ code: "", discount: "", limit: "", expiry: "", type: "Percentage" });
  if (user?.role !== "Super Admin") return <PageWrapper title="Promo Codes" subtitle=""><GlobalStyles /><AlertBox type="error">This section is accessible to Super Admins only.</AlertBox></PageWrapper>;
  const togglePromo = (i) => { setPromos(p => p.map((x, j) => j === i ? { ...x, status: x.status === "Active" ? "Expired" : "Active" } : x)); toast(`Promo ${promos[i].status === "Active" ? "deactivated" : "activated"}`, promos[i].status === "Active" ? "error" : "success"); };
  const createPromo = () => { if (!nc.code || !nc.discount) { toast("Fill required fields", "error"); return; } setPromos(p => [...p, { ...nc, limit: +nc.limit || 100, used: 0, status: "Active" }]); toast(`Promo ${nc.code} created!`, "success"); setCm(false); setNc({ code: "", discount: "", limit: "", expiry: "", type: "Percentage" }); };
  return (
    <PageWrapper title="Promo Codes & Referrals" subtitle="Manage discount codes and referral program — Super Admin only"
      actions={<><button className="btn-outline btn-sm" onClick={() => toast("Bulk CSV uploaded!", "success")}>Bulk Upload</button><button className="btn-gold btn-sm" onClick={() => setCm(true)}>+ Create Promo</button></>}>
      <GlobalStyles />
      <MiniStatRow items={[{ label: "Active Codes", value: String(promos.filter(p => p.status === "Active").length), icon: "🎟️", color: "#D4AF37" }, { label: "Discount Given", value: "Rs84,200", icon: "💸", color: "#F87171" }, { label: "Total Uses", value: "5,523", icon: "📊" }, { label: "Referral Bonus Paid", value: "Rs24,150", icon: "🤝", color: "#34D399" }]} />
      <div className="tab-nav">{[{ id: "codes", l: "Promo Codes" }, { id: "referral", l: "Referral Config" }, { id: "top", l: "Top Referrers" }].map(t => <button key={t.id} className={`tab-btn${tab === t.id ? " active" : ""}`} onClick={() => setTab(t.id)}>{t.l}</button>)}</div>
      {tab === "codes" && <TableCard title="All Promo Codes" icon="🎟️">
        <table className="gm-table"><thead><tr><th>Code</th><th>Type</th><th>Discount</th><th>Limit</th><th>Used</th><th>Expiry</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{promos.map((p, i) => <tr key={i}><td style={{ fontFamily: "monospace", fontWeight: 700, color: "#D4AF37", letterSpacing: "1px", fontSize: 12.5 }}>{p.code}</td><td><span style={{ display: "inline-flex", padding: "3px 8px", borderRadius: 100, fontSize: 10.5, fontWeight: 600, background: "rgba(96,165,250,0.1)", border: "1px solid rgba(96,165,250,0.24)", color: "#60A5FA" }}>{p.type}</span></td><td style={{ fontWeight: 700, color: "#34D399" }}>{p.discount}</td><td>{p.limit.toLocaleString()}</td>
            <td><div style={{ fontSize: 12, marginBottom: 3 }}>{p.used}/{p.limit}</div><div className="prog-bar" style={{ width: 80, height: 4 }}><div className="prog-fill" style={{ width: `${Math.min(100, (p.used / p.limit) * 100).toFixed(0)}%` }} /></div></td>
            <td style={{ fontSize: 12 }}>{p.expiry}</td><td><Badge status={p.status} /></td>
            <td><button className={`${p.status === "Active" ? "btn-danger" : "btn-success"} btn-xs`} onClick={() => togglePromo(i)}>{p.status === "Active" ? "Deactivate" : "Activate"}</button></td>
          </tr>)}</tbody></table>
      </TableCard>}
      {tab === "referral" && <Card style={{ padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 20 }}>Referral Program Configuration</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FormGroup label="Referrer Bonus (Rs)" hint="Credited when referred user completes first ride"><input type="number" className="gm-input" defaultValue="50" /></FormGroup>
          <FormGroup label="Referred User Bonus (Rs)" hint="Discount on first ride for new user"><input type="number" className="gm-input" defaultValue="30" /></FormGroup>
          <FormGroup label="Max Referrals Per User"><input type="number" className="gm-input" defaultValue="20" /></FormGroup>
          <FormGroup label="Program Status"><div style={{ paddingTop: 8 }}><Toggle checked={refActive} onChange={setRefActive} label={refActive ? "Program Active" : "Program Inactive"} /></div></FormGroup>
        </div>
        <button className="btn-gold" style={{ marginTop: 8 }} onClick={() => toast("Referral config saved!", "success")}>Save Configuration</button>
      </Card>}
      {tab === "top" && <TableCard title="Top Referrers Leaderboard" icon="🏆">
        <table className="gm-table"><thead><tr><th>Rank</th><th>User</th><th>Referrals</th><th>Bonus Earned</th><th>Last Referral</th></tr></thead>
          <tbody>{TOP.map((r, i) => <tr key={i}><td style={{ fontWeight: 800, color: ["#D4AF37", "#C0C0C0", "#CD7F32", "rgba(255,255,255,0.5)", "rgba(255,255,255,0.4)"][i], fontSize: 18 }}>{["🥇", "🥈", "🥉", "4", "5"][i]}</td><td><AvatarCell name={r.name} /></td><td style={{ fontWeight: 700, color: "#D4AF37" }}>{r.refs}</td><td style={{ color: "#34D399", fontFamily: "monospace" }}>Rs{r.earned.toLocaleString()}</td><td style={{ fontSize: 12 }}>{r.last}</td></tr>)}</tbody>
        </table>
      </TableCard>}
      <Modal open={cm} onClose={() => setCm(false)} title="Create Promo Code">
        <FormGroup label="Promo Code"><input className="gm-input" placeholder="e.g. GORIDE50" value={nc.code} onChange={e => setNc({ ...nc, code: e.target.value.toUpperCase() })} style={{ textTransform: "uppercase", fontFamily: "monospace", fontWeight: 700, letterSpacing: "1px" }} /></FormGroup>
        <FormGroup label="Type"><select className="gm-input" value={nc.type} onChange={e => setNc({ ...nc, type: e.target.value })}><option>Percentage</option><option>Flat</option><option>Vehicle-Specific</option></select></FormGroup>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}><FormGroup label="Discount (% or Rs)"><input className="gm-input" placeholder="50% or Rs100" value={nc.discount} onChange={e => setNc({ ...nc, discount: e.target.value })} /></FormGroup><FormGroup label="Usage Limit"><input type="number" className="gm-input" placeholder="500" value={nc.limit} onChange={e => setNc({ ...nc, limit: e.target.value })} /></FormGroup></div>
        <FormGroup label="Expiry Date"><input type="date" className="gm-input" value={nc.expiry} onChange={e => setNc({ ...nc, expiry: e.target.value })} /></FormGroup>
        <div style={{ display: "flex", gap: 8 }}><button className="btn-outline" onClick={() => setCm(false)}>Cancel</button><button className="btn-gold" onClick={createPromo}>Create Code</button></div>
      </Modal>
    </PageWrapper>
  );
}
export default function PromoCodesPage() { return <ToastProvider><Content /></ToastProvider>; }
