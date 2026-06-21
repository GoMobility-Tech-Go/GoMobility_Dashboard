import { useState, useEffect, useMemo } from "react";
import { useToast, ToastProvider, PageWrapper, Card, TableCard, MiniStatRow, GlobalStyles, AlertBox, FormGroup } from "../../components/ui/index.jsx";
import { runReport, getRevenueAnalytics, getTransactions } from "../../api/admin";

function Content() {
  const toast = useToast();
  const [tab, setTab]               = useState("gst");
  const [reportLoading, setReportL] = useState(false);
  const [revenue, setRevenue]       = useState(null);
  const [payouts, setPayouts]       = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      getRevenueAnalytics(30).then(r => r.data?.data || r.data || null).catch(() => null),
      getTransactions({ category: "withdrawal", limit: 50, offset: 0 })
        .then(r => {
          const raw = r.data?.transactions || r.data?.data || r.data || [];
          return Array.isArray(raw) ? raw : [];
        }).catch(() => []),
    ]).then(([rev, tx]) => {
      setRevenue(rev);
      setPayouts(tx);
    }).finally(() => setLoading(false));
  }, []);

  // Monthly GST breakdown from daily revenue data
  const monthlyGst = useMemo(() => {
    if (!revenue?.dailyRevenue?.length) return [];
    const map = {};
    revenue.dailyRevenue.forEach(d => {
      const dt  = new Date(d.day);
      const key = dt.toLocaleString("en-IN", { month: "short", year: "numeric" });
      if (!map[key]) map[key] = 0;
      map[key] += Number(d.revenue) || 0;
    });
    return Object.entries(map).map(([month, taxable]) => ({
      month,
      taxable: Math.round(taxable),
      cgst:    Math.round(taxable * 0.09),
      sgst:    Math.round(taxable * 0.09),
      igst:    0,
      total:   Math.round(taxable * 0.18),
    }));
  }, [revenue]);

  const handleRunReport = async () => {
    setReportL(true);
    try {
      await runReport("financial");
      toast("Financial report queued — check admin email shortly.", "success");
    } catch {
      toast("Failed to generate report. Please try again.", "error");
    } finally {
      setReportL(false);
    }
  };

  const gross          = Number(revenue?.totalRevenue)       || 0;
  const driverPayouts  = Number(revenue?.totalDriverEarnings) || 0;
  const totalGst       = Math.round(gross * 0.18);
  const totalTds       = Math.round(driverPayouts * 0.10);
  const fmtINR         = (n) => `₹${Math.abs(n).toLocaleString("en-IN")}`;
  const fmtK           = (n) => n >= 1000 ? `₹${(n/1000).toFixed(0)}K` : fmtINR(n);

  return (
    <PageWrapper
      title="Tax & Compliance Reports"
      subtitle="GST reports, TDS per driver, income statement — live from revenue analytics"
      actions={
        <div style={{ display:"flex", gap:8 }}>
          <button className="btn-outline btn-sm" onClick={handleRunReport} disabled={reportLoading}>↓ Excel</button>
          <button className="btn-gold btn-sm"    onClick={handleRunReport} disabled={reportLoading}>{reportLoading ? "⏳ Generating…" : "↓ PDF Report"}</button>
        </div>
      }>
      <GlobalStyles/>

      <MiniStatRow items={[
        { label:"GST on 30d Revenue",    value: gross   > 0 ? fmtK(totalGst)     : "—",    icon:"🏛️", color:"#D4AF37" },
        { label:"TDS on Driver Payouts", value: driverPayouts > 0 ? fmtK(totalTds) : "—",  icon:"💼", color:"#60A5FA" },
        { label:"30d Gross Revenue",     value: gross   > 0 ? fmtK(gross)         : loading ? "…" : "—", icon:"💰", color:"#34D399" },
        { label:"Driver Payouts (30d)",  value: driverPayouts > 0 ? fmtK(driverPayouts) : loading ? "…" : "—", icon:"🚗", color:"#A78BFA" },
        { label:"Total Rides (30d)",     value: revenue?.totalRides ?? (loading ? "…" : "—"), icon:"🛞", color:"#F59E0B" },
        { label:"Monthly Breakdown",     value: monthlyGst.length > 0 ? `${monthlyGst.length} months` : "—", icon:"📅", color:"#34D399" },
      ]}/>

      <div className="tab-nav">
        {[
          { id:"gst",    l:"GST Reports (GSTR-1 / 3B)" },
          { id:"tds",    l:"TDS Overview" },
          { id:"income", l:"Income Statement" },
          { id:"vehicle",l:"Revenue by Vehicle" },
        ].map(t => (
          <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>
        ))}
      </div>

      {/* ── GST Tab ── */}
      {tab==="gst" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {loading ? (
            <Card style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,0.35)" }}>Loading revenue data…</Card>
          ) : monthlyGst.length === 0 ? (
            <Card style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,0.35)" }}>
              No daily revenue data returned by analytics API for last 30 days.
            </Card>
          ) : (
            <TableCard
              title="GST Summary — Monthly Breakdown (Derived from Live Revenue)"
              icon="🏛️"
              actions={
                <div style={{ display:"flex", gap:8 }}>
                  <button className="btn-outline btn-sm" onClick={handleRunReport} disabled={reportLoading}>↓ GSTR-1</button>
                  <button className="btn-gold btn-sm"    onClick={handleRunReport} disabled={reportLoading}>↓ GSTR-3B</button>
                </div>
              }>
              <div style={{ padding:"9px 16px", borderBottom:"1px solid rgba(212,175,55,0.08)", background:"rgba(52,211,153,0.04)", fontSize:12, color:"#34D399" }}>
                GST calculated at 18% (CGST 9% + SGST 9%) on gross ride revenue. Data sourced from live revenue analytics.
              </div>
              <table className="gm-table">
                <thead>
                  <tr><th>Tax Period</th><th>Taxable Value</th><th>CGST (9%)</th><th>SGST (9%)</th><th>IGST</th><th>Total GST</th><th>Note</th></tr>
                </thead>
                <tbody>
                  {monthlyGst.map((g,i) => (
                    <tr key={i}>
                      <td style={{ fontWeight:700 }}>{g.month}</td>
                      <td style={{ color:"rgba(255,255,255,0.7)", fontFamily:"monospace" }}>{fmtINR(g.taxable)}</td>
                      <td style={{ color:"#60A5FA", fontFamily:"monospace" }}>{fmtINR(g.cgst)}</td>
                      <td style={{ color:"#A78BFA", fontFamily:"monospace" }}>{fmtINR(g.sgst)}</td>
                      <td style={{ color:"rgba(255,255,255,0.3)" }}>—</td>
                      <td style={{ color:"#D4AF37", fontFamily:"monospace", fontWeight:700 }}>{fmtINR(g.total)}</td>
                      <td style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>Consult CA for filing</td>
                    </tr>
                  ))}
                  <tr style={{ background:"rgba(212,175,55,0.05)" }}>
                    <td colSpan={5} style={{ fontWeight:800, color:"#D4AF37" }}>TOTAL (30 Days)</td>
                    <td style={{ color:"#D4AF37", fontFamily:"monospace", fontWeight:800 }}>{fmtINR(monthlyGst.reduce((a,b)=>a+b.total,0))}</td>
                    <td/>
                  </tr>
                </tbody>
              </table>
            </TableCard>
          )}
          <AlertBox type="info">
            GST filing (GSTR-1 / GSTR-3B) must be done through the GST portal. This dashboard shows estimates based on live revenue data. Consult your CA before filing.
          </AlertBox>
        </div>
      )}

      {/* ── TDS Tab ── */}
      {tab==="tds" && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {/* Summary Card */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {[
              { label:"Total Driver Payouts (30d)", value: fmtINR(driverPayouts), color:"#D4AF37", note:"From revenue analytics" },
              { label:"Estimated TDS @ 10%",        value: fmtINR(totalTds),      color:"#F87171", note:"Section 194C applicable" },
              { label:"Payout Transactions",        value: payouts.length,         color:"#60A5FA", note:"From transactions API" },
            ].map(c => (
              <Card key={c.label} style={{ padding:"18px 20px" }}>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.8px" }}>{c.label}</div>
                <div style={{ fontSize:22, fontWeight:800, color:c.color, fontFamily:"monospace" }}>{c.value}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", marginTop:4 }}>{c.note}</div>
              </Card>
            ))}
          </div>

          {/* Payout transactions from real API */}
          <TableCard title="Driver Withdrawal Transactions (Last 50)" icon="💼"
            actions={
              <button className="btn-gold btn-sm" onClick={handleRunReport} disabled={reportLoading}>↓ Financial Report</button>
            }>
            <div style={{ padding:"9px 16px", borderBottom:"1px solid rgba(212,175,55,0.08)", background:"rgba(96,165,250,0.04)", fontSize:12, color:"#60A5FA" }}>
              Live data from transactions API (category: withdrawal). TDS @ 10% under Section 194C for drivers earning &gt;₹30,000/month. For certified TDS certificates (Form 16A), consult your CA.
            </div>
            {loading ? (
              <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,0.35)" }}>Loading…</div>
            ) : payouts.length === 0 ? (
              <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,0.35)" }}>No withdrawal transactions found in last 30 days.</div>
            ) : (
              <table className="gm-table">
                <thead>
                  <tr><th>#</th><th>Txn ID</th><th>Amount</th><th>Status</th><th>Date</th><th>Est. TDS</th></tr>
                </thead>
                <tbody>
                  {payouts.slice(0,20).map((t,i) => {
                    const amt  = Number(t.amount || t.net_amount || 0);
                    const tds  = Math.round(amt * 0.10);
                    const date = t.created_at ? new Date(t.created_at).toLocaleDateString("en-IN") : "—";
                    return (
                      <tr key={i}>
                        <td style={{ color:"rgba(255,255,255,0.35)", fontSize:11 }}>{i+1}</td>
                        <td style={{ fontFamily:"monospace", fontSize:11, color:"#D4AF37" }}>{t.transaction_id || t.txn_number || t.id || "—"}</td>
                        <td style={{ color:"#34D399", fontFamily:"monospace", fontWeight:600 }}>{fmtINR(amt)}</td>
                        <td>
                          <span style={{ display:"inline-flex", padding:"2px 8px", borderRadius:100, fontSize:10.5, fontWeight:600,
                            background: t.status==="completed"?"rgba(52,211,153,0.1)":"rgba(245,158,11,0.1)",
                            border:`1px solid ${t.status==="completed"?"rgba(52,211,153,0.25)":"rgba(245,158,11,0.28)"}`,
                            color: t.status==="completed"?"#34D399":"#F59E0B"
                          }}>{t.status || "—"}</span>
                        </td>
                        <td style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{date}</td>
                        <td style={{ color:"#F87171", fontFamily:"monospace", fontSize:11 }}>{fmtINR(tds)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </TableCard>
          <AlertBox type="warning">
            TDS figures shown are estimates only. Actual TDS deduction, PAN collection, and Form 16A issuance must be handled by your chartered accountant as per Income Tax Act.
          </AlertBox>
        </div>
      )}

      {/* ── Income Statement Tab ── */}
      {tab==="income" && (
        <Card style={{ padding:24 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700, color:"#D4AF37", fontFamily:"Cinzel,serif" }}>Income Statement — Last 30 Days</div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.38)", marginTop:2 }}>
                GO Mobility Operations · {gross > 0 ? "Live revenue data from analytics API" : loading ? "Loading…" : "Revenue data unavailable"}
              </div>
            </div>
            <button className="btn-gold btn-sm" onClick={handleRunReport} disabled={reportLoading}>{reportLoading ? "⏳ Generating…" : "↓ Download PDF"}</button>
          </div>
          {loading ? (
            <div style={{ textAlign:"center", padding:60, color:"rgba(255,255,255,0.35)" }}>Loading revenue data…</div>
          ) : (() => {
            const sub        = Math.round(gross * 0.18);
            const cancel     = Math.round(gross * 0.02);
            const totalInc   = gross + sub + cancel;
            const gateway    = Math.round(totalInc * 0.012);
            const marketing  = Math.round(totalInc * 0.04);
            const infra      = Math.round(totalInc * 0.027);
            const support    = Math.round(totalInc * 0.014);
            const totalExp   = driverPayouts + gateway + marketing + infra + support;
            const gstLiab    = Math.round(gross * 0.18);
            const totalTax   = gstLiab + totalTds;
            const netProfit  = totalInc - totalExp - totalTax;
            const rows = [
              { section:"INCOME", isHeader:true },
              { label:"Gross Ride Revenue",          value:gross,       positive:true  },
              { label:"Subscription Revenue (est.)", value:sub,         positive:true  },
              { label:"Cancellation Fees (est.)",    value:cancel,      positive:true  },
              { label:"Total Income",                value:totalInc,    positive:true,  isTotal:true },
              { section:"EXPENSES", isHeader:true },
              { label:"Driver Payouts (actual)",     value:driverPayouts, positive:false },
              { label:"Payment Gateway (~1.2%)",     value:gateway,     positive:false },
              { label:"Marketing & Campaigns (est.)",value:marketing,   positive:false },
              { label:"Infrastructure / Servers (est.)", value:infra,   positive:false },
              { label:"Customer Support (est.)",     value:support,     positive:false },
              { label:"Total Expenses",              value:totalExp,    positive:false, isTotal:true },
              { section:"TAX (ESTIMATED)", isHeader:true },
              { label:"GST Liability (18%)",         value:gstLiab,     positive:false },
              { label:"TDS on Driver Payouts (10%)", value:totalTds,    positive:false },
              { label:"Total Tax",                   value:totalTax,    positive:false, isTotal:true },
              { label:"NET PROFIT (ESTIMATED)",      value:netProfit,   positive:netProfit>=0, isFinal:true },
            ];
            return rows.map((row,i) => {
              if (row.isHeader) return (
                <div key={i} style={{ padding:"10px 0 5px", fontSize:10, fontWeight:700, color:"rgba(212,175,55,0.5)", textTransform:"uppercase", letterSpacing:"1px", borderTop:i>0?"1px solid rgba(212,175,55,0.12)":"none", marginTop:i>0?8:0 }}>{row.section}</div>
              );
              return (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:row.isFinal?"12px 14px":"9px 14px", borderRadius:row.isFinal?12:0, border:row.isFinal?"1px solid rgba(212,175,55,0.3)":"none", background:row.isFinal?"rgba(212,175,55,0.06)":row.isTotal?"rgba(255,255,255,0.02)":"transparent", marginBottom:1, borderTop:row.isTotal&&!row.isFinal?"1px solid rgba(212,175,55,0.1)":"none", marginTop:row.isFinal?12:0 }}>
                  <span style={{ fontSize:row.isFinal?15:13, fontWeight:row.isTotal||row.isFinal?700:400, color:row.isFinal?"#D4AF37":row.isTotal?"rgba(255,255,255,0.82)":"rgba(255,255,255,0.65)", fontFamily:row.isFinal?"Cinzel,serif":"Outfit,sans-serif" }}>{row.label}</span>
                  <span style={{ fontSize:row.isFinal?16:13, fontWeight:row.isTotal||row.isFinal?800:500, color:row.isFinal?"#D4AF37":row.positive?"#34D399":"#F87171", fontFamily:"monospace" }}>{row.positive?"+":"−"} {fmtINR(Math.abs(row.value))}</span>
                </div>
              );
            });
          })()}
          <div style={{ marginTop:20, padding:"10px 14px", background:"rgba(245,158,11,0.05)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:10, fontSize:11, color:"rgba(255,255,255,0.4)", lineHeight:1.7 }}>
            Note: Gross Ride Revenue and Driver Payouts are from live API. Subscription revenue, cancellation fees, marketing, infra, and support costs are estimates based on industry ratios. Tax figures are estimated — consult your CA.
          </div>
        </Card>
      )}

      {/* ── Vehicle Revenue Tab ── */}
      {tab==="vehicle" && (
        <TableCard title="Revenue by Vehicle Type (Last 30 Days)" icon="🚗"
          actions={<button className="btn-outline btn-sm" onClick={handleRunReport} disabled={reportLoading}>↓ Export</button>}>
          {loading ? (
            <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,0.35)" }}>Loading…</div>
          ) : !revenue?.revenueByVehicle?.length ? (
            <div style={{ padding:40, textAlign:"center", color:"rgba(255,255,255,0.35)" }}>No vehicle breakdown data available.</div>
          ) : (
            <table className="gm-table">
              <thead><tr><th>Vehicle Type</th><th>Total Revenue</th><th>Ride Count</th><th>Avg per Ride</th><th>GST (18%)</th><th>Share</th></tr></thead>
              <tbody>
                {revenue.revenueByVehicle.map((v,i) => {
                  const rev  = Number(v.total_revenue || v.revenue || 0);
                  const cnt  = Number(v.ride_count || v.rides || 0);
                  const avg  = cnt > 0 ? Math.round(rev/cnt) : 0;
                  const gst  = Math.round(rev * 0.18);
                  const pct  = gross > 0 ? ((rev/gross)*100).toFixed(1) : "—";
                  const typeColors = { car:"#60A5FA", auto:"#34D399", bike:"#F59E0B" };
                  const col = typeColors[(v.vehicle_type||"").toLowerCase()] || "#D4AF37";
                  return (
                    <tr key={i}>
                      <td><span style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"3px 10px", borderRadius:100, fontSize:11, fontWeight:700, background:`${col}18`, border:`1px solid ${col}40`, color:col, textTransform:"capitalize" }}>{v.vehicle_type||"—"}</span></td>
                      <td style={{ color:"#34D399", fontFamily:"monospace", fontWeight:600 }}>{fmtINR(rev)}</td>
                      <td style={{ color:"rgba(255,255,255,0.7)" }}>{cnt.toLocaleString()}</td>
                      <td style={{ fontFamily:"monospace", color:"rgba(255,255,255,0.6)" }}>{fmtINR(avg)}</td>
                      <td style={{ color:"#D4AF37", fontFamily:"monospace" }}>{fmtINR(gst)}</td>
                      <td>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:60, height:5, borderRadius:3, background:"rgba(255,255,255,0.08)", overflow:"hidden" }}>
                            <div style={{ width:`${pct}%`, height:"100%", background:col, borderRadius:3 }}/>
                          </div>
                          <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background:"rgba(212,175,55,0.05)" }}>
                  <td style={{ fontWeight:800, color:"#D4AF37" }}>TOTAL</td>
                  <td style={{ color:"#D4AF37", fontFamily:"monospace", fontWeight:800 }}>{fmtINR(gross)}</td>
                  <td style={{ color:"rgba(255,255,255,0.7)", fontWeight:700 }}>{revenue.totalRides?.toLocaleString()}</td>
                  <td style={{ fontFamily:"monospace", color:"rgba(255,255,255,0.5)" }}>{gross > 0 && revenue?.totalRides ? fmtINR(Math.round(gross/revenue.totalRides)) : "—"}</td>
                  <td style={{ color:"#D4AF37", fontFamily:"monospace", fontWeight:700 }}>{fmtINR(Math.round(gross*0.18))}</td>
                  <td style={{ color:"rgba(255,255,255,0.4)" }}>100%</td>
                </tr>
              </tbody>
            </table>
          )}
        </TableCard>
      )}
    </PageWrapper>
  );
}

export default function TaxReportsPage() {
  return <ToastProvider><Content/></ToastProvider>;
}
