import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, Card, TableCard, MiniStatRow, GlobalStyles, AlertBox, FormGroup } from "../../components/ui/index.jsx";

const GST_DATA = [
  { month:"Jan 2026", taxable:620000, cgst:55800, sgst:55800, igst:0,     total:111600, filed:true  },
  { month:"Feb 2026", taxable:665000, cgst:59850, sgst:59850, igst:0,     total:119700, filed:true  },
  { month:"Mar 2026", taxable:742000, cgst:66780, sgst:66780, igst:0,     total:133560, filed:true  },
  { month:"Apr 2026", taxable:702000, cgst:63180, sgst:63180, igst:0,     total:126360, filed:false },
];

const TDS_DRIVERS = [
  { name:"Rahul Sharma",  pan:"ABCDE1234F", earnings:48000, tdsRate:"10%", tdsAmt:4800,  status:"Deducted" },
  { name:"Vikram Yadav",  pan:"FGHIJ5678K", earnings:52000, tdsRate:"10%", tdsAmt:5200,  status:"Deducted" },
  { name:"Suresh Reddy",  pan:"KLMNO9012L", earnings:39000, tdsRate:"10%", tdsAmt:3900,  status:"Deducted" },
  { name:"Amit Singh",    pan:"PQRST3456M", earnings:61000, tdsRate:"10%", tdsAmt:6100,  status:"Deducted" },
  { name:"Priya Devi",    pan:"UVWXY7890N", earnings:28000, tdsRate:"10%", tdsAmt:2800,  status:"Pending"  },
  { name:"Deepak Kumar",  pan:"ABCDE4321Z", earnings:44000, tdsRate:"10%", tdsAmt:4400,  status:"Deducted" },
];

const AUDIT_LOGS = [
  { ts:"Apr 23, 2026 14:32", action:"GST Return Filed",      user:"Finance Team",  ref:"GSTR-3B/Apr26",   status:"Success" },
  { ts:"Apr 20, 2026 10:15", action:"TDS Payment Processed", user:"Finance Team",  ref:"TDS/Q4/2025-26",  status:"Success" },
  { ts:"Apr 15, 2026 09:00", action:"Income Statement Generated", user:"Super Admin", ref:"IS/Mar26",    status:"Success" },
  { ts:"Apr 10, 2026 11:45", action:"Driver PAN Verification", user:"Admin",        ref:"PAN-BATCH-042",  status:"Success" },
  { ts:"Apr 05, 2026 16:20", action:"Audit Export Requested", user:"Super Admin",   ref:"AUDIT/Q4/2025",  status:"Success" },
  { ts:"Apr 01, 2026 08:30", action:"GST Return Filed",       user:"Finance Team",  ref:"GSTR-1/Mar26",   status:"Success" },
];

function Content() {
  const toast = useToast();
  const [tab, setTab] = useState("gst");

  const totalGST = GST_DATA.reduce((a,b)=>a+b.total,0);
  const totalTDS = TDS_DRIVERS.reduce((a,b)=>a+b.tdsAmt,0);

  return (
    <PageWrapper title="Tax & Compliance Reports"
      subtitle="GST reports, TDS per driver, income statement and audit-ready financial logs"
      actions={
        <div style={{display:"flex",gap:8}}>
          <button className="btn-outline btn-sm" onClick={()=>toast("Exporting to Excel...","success")}>↓ Excel</button>
          <button className="btn-gold btn-sm" onClick={()=>toast("Generating PDF report...","success")}>↓ PDF</button>
        </div>
      }>
      <GlobalStyles/>

      <MiniStatRow items={[
        { label:"GST Collected (YTD)",    value:`Rs${(totalGST/1000).toFixed(0)}K`,    icon:"🏛️", color:"#D4AF37" },
        { label:"TDS Deducted (Month)",   value:`Rs${(totalTDS/1000).toFixed(0)}K`,    icon:"💼", color:"#60A5FA" },
        { label:"Returns Pending",        value:"1",                                   icon:"⚠️", color:"#F87171" },
        { label:"Drivers w/ PAN",         value:`${TDS_DRIVERS.filter(d=>d.pan).length}/${TDS_DRIVERS.length}`, icon:"🪪", color:"#34D399" },
        { label:"Filing Status",          value:"Mar Filed",                           icon:"✅", color:"#34D399" },
        { label:"Next Due",               value:"Apr 20, 2026",                        icon:"📅", color:"#F59E0B" },
      ]}/>

      <div className="tab-nav">
        {[
          {id:"gst",     l:"GST Reports (GSTR-1 / 3B)"},
          {id:"tds",     l:"TDS per Driver"},
          {id:"income",  l:"Income Statement"},
          {id:"audit",   l:"Audit Logs"},
        ].map(t=><button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>)}
      </div>

      {tab==="gst" && (
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <AlertBox type="warning">⚠️ April 2026 GST return pending. Due date: May 20, 2026. File before deadline to avoid penalty.</AlertBox>
          <TableCard title="GST Summary — Monthly (GSTR-3B Format)" icon="🏛️"
            actions={
              <div style={{display:"flex",gap:8}}>
                <button className="btn-outline btn-sm" onClick={()=>toast("GSTR-1 downloaded!","success")}>↓ GSTR-1</button>
                <button className="btn-gold btn-sm" onClick={()=>toast("GSTR-3B downloaded!","success")}>↓ GSTR-3B</button>
              </div>
            }>
            <table className="gm-table">
              <thead><tr><th>Tax Period</th><th>Taxable Value</th><th>CGST (9%)</th><th>SGST (9%)</th><th>IGST</th><th>Total GST</th><th>Filing Status</th><th>Actions</th></tr></thead>
              <tbody>
                {GST_DATA.map((g,i)=>(
                  <tr key={i}>
                    <td style={{fontWeight:700}}>{g.month}</td>
                    <td style={{color:"rgba(255,255,255,0.7)",fontFamily:"monospace"}}>Rs{g.taxable.toLocaleString()}</td>
                    <td style={{color:"#60A5FA",fontFamily:"monospace"}}>Rs{g.cgst.toLocaleString()}</td>
                    <td style={{color:"#A78BFA",fontFamily:"monospace"}}>Rs{g.sgst.toLocaleString()}</td>
                    <td style={{color:"rgba(255,255,255,0.3)"}}>—</td>
                    <td style={{color:"#D4AF37",fontFamily:"monospace",fontWeight:700}}>Rs{g.total.toLocaleString()}</td>
                    <td>
                      <span style={{display:"inline-flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:100,fontSize:10.5,fontWeight:600,background:g.filed?"rgba(52,211,153,0.1)":"rgba(248,113,113,0.1)",border:`1px solid ${g.filed?"rgba(52,211,153,0.25)":"rgba(248,113,113,0.28)"}`,color:g.filed?"#34D399":"#F87171"}}>
                        {g.filed?"✓ Filed":"⚠ Pending"}
                      </span>
                    </td>
                    <td>
                      {g.filed
                        ? <button className="btn-outline btn-xs" onClick={()=>toast("Acknowledgement downloaded!","success")}>Download ACK</button>
                        : <button className="btn-gold btn-xs" onClick={()=>toast("Redirecting to GST portal...","success")}>File Now</button>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCard>
        </div>
      )}

      {tab==="tds" && (
        <TableCard title="TDS Deduction Report — Per Driver (Section 194C)" icon="💼"
          actions={
            <div style={{display:"flex",gap:8}}>
              <button className="btn-outline btn-sm" onClick={()=>toast("Form 26Q downloaded!","success")}>↓ Form 26Q</button>
              <button className="btn-gold btn-sm" onClick={()=>toast("TDS certificate generated!","success")}>↓ Form 16A</button>
            </div>
          }>
          <div style={{padding:"10px 16px",borderBottom:"1px solid rgba(212,175,55,0.08)",background:"rgba(96,165,250,0.04)",fontSize:12,color:"#60A5FA"}}>
            TDS @ 10% under Section 194C for drivers earning &gt;Rs30,000/month. Total deducted this month: <strong style={{color:"#D4AF37"}}>Rs{totalTDS.toLocaleString()}</strong>
          </div>
          <table className="gm-table">
            <thead><tr><th>Driver Name</th><th>PAN Number</th><th>Gross Earnings</th><th>TDS Rate</th><th>TDS Amount</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {TDS_DRIVERS.map((d,i)=>(
                <tr key={i}>
                  <td style={{fontWeight:600}}>{d.name}</td>
                  <td style={{fontFamily:"monospace",fontSize:12}}>{d.pan}</td>
                  <td style={{color:"#D4AF37",fontFamily:"monospace"}}>Rs{d.earnings.toLocaleString()}</td>
                  <td style={{color:"#F59E0B",fontWeight:700}}>{d.tdsRate}</td>
                  <td style={{color:"#F87171",fontFamily:"monospace",fontWeight:700}}>Rs{d.tdsAmt.toLocaleString()}</td>
                  <td><span style={{display:"inline-flex",padding:"3px 9px",borderRadius:100,fontSize:10.5,fontWeight:600,background:d.status==="Deducted"?"rgba(52,211,153,0.1)":"rgba(248,113,113,0.1)",border:`1px solid ${d.status==="Deducted"?"rgba(52,211,153,0.25)":"rgba(248,113,113,0.28)"}`,color:d.status==="Deducted"?"#34D399":"#F87171"}}>{d.status}</span></td>
                  <td><button className="btn-outline btn-xs" onClick={()=>toast("Form 16A generated!","success")}>Form 16A</button></td>
                </tr>
              ))}
              <tr style={{background:"rgba(212,175,55,0.05)"}}>
                <td colSpan={4} style={{fontWeight:800,color:"#D4AF37"}}>TOTAL TDS (This Month)</td>
                <td style={{color:"#F87171",fontFamily:"monospace",fontWeight:800,fontSize:14}}>Rs{totalTDS.toLocaleString()}</td>
                <td colSpan={2}/>
              </tr>
            </tbody>
          </table>
        </TableCard>
      )}

      {tab==="income" && (
        <Card style={{padding:24}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:"#D4AF37",fontFamily:"Cinzel,serif"}}>Income Statement — April 2026</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.38)",marginTop:2}}>GO Mobility Operations · Audit-ready format</div>
            </div>
            <button className="btn-gold btn-sm" onClick={()=>toast("Income statement PDF downloaded!","success")}>↓ Download PDF</button>
          </div>
          {[
            { section:"INCOME", rows:[], isHeader:true },
            { label:"Gross Ride Revenue",        value:842000,  positive:true  },
            { label:"Subscription Revenue",      value:184200,  positive:true  },
            { label:"Cancellation Fees Collected",value:18400,  positive:true  },
            { label:"Total Income",              value:1044600, positive:true, isTotal:true },
            { section:"EXPENSES", rows:[], isHeader:true },
            { label:"Driver Payouts",            value:580000,  positive:false },
            { label:"Payment Gateway Charges",   value:12600,   positive:false },
            { label:"Marketing & Campaigns",     value:42000,   positive:false },
            { label:"Infrastructure / Servers",  value:28000,   positive:false },
            { label:"Customer Support Cost",     value:15000,   positive:false },
            { label:"Total Expenses",            value:677600,  positive:false, isTotal:true },
            { section:"TAX", rows:[], isHeader:true },
            { label:"GST Liability",             value:126360,  positive:false },
            { label:"TDS Liability",             value:27100,   positive:false },
            { label:"Total Tax",                 value:153460,  positive:false, isTotal:true },
            { label:"NET PROFIT",                value:213540,  positive:true,  isFinal:true },
          ].map((row,i)=>{
            if(row.isHeader) return <div key={i} style={{padding:"10px 0 5px",fontSize:10,fontWeight:700,color:"rgba(212,175,55,0.5)",textTransform:"uppercase",letterSpacing:"1px",borderTop:i>0?"1px solid rgba(212,175,55,0.12)":"none",marginTop:i>0?8:0}}>{row.section}</div>;
            return (
              <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:row.isFinal?"12px 14px":"9px 14px",borderRadius:row.isFinal?12:0,border:row.isFinal?"1px solid rgba(212,175,55,0.3)":"none",background:row.isFinal?"rgba(212,175,55,0.06)":row.isTotal?"rgba(255,255,255,0.02)":"transparent",marginBottom:1,borderTop:row.isTotal&&!row.isFinal?"1px solid rgba(212,175,55,0.1)":"none",marginTop:row.isFinal?12:0}}>
                <span style={{fontSize:row.isFinal?15:13,fontWeight:row.isTotal||row.isFinal?700:400,color:row.isFinal?"#D4AF37":row.isTotal?"rgba(255,255,255,0.82)":"rgba(255,255,255,0.65)",fontFamily:row.isFinal?"Cinzel,serif":"Outfit,sans-serif"}}>{row.label}</span>
                <span style={{fontSize:row.isFinal?16:13,fontWeight:row.isTotal||row.isFinal?800:500,color:row.isFinal?"#D4AF37":row.positive?"#34D399":"#F87171",fontFamily:"monospace"}}>{row.positive?"+":"-"} Rs{row.value.toLocaleString()}</span>
              </div>
            );
          })}
        </Card>
      )}

      {tab==="audit" && (
        <TableCard title="Audit-Ready Financial Logs" icon="📋"
          actions={<button className="btn-outline btn-sm" onClick={()=>toast("Audit logs exported!","success")}>↓ Export Audit Log</button>}>
          <div style={{padding:"10px 16px",borderBottom:"1px solid rgba(212,175,55,0.08)",background:"rgba(52,211,153,0.04)",fontSize:12,color:"#34D399"}}>
            All financial actions are logged with timestamp, user, and reference ID. Tamper-proof audit trail.
          </div>
          <table className="gm-table">
            <thead><tr><th>Timestamp</th><th>Action</th><th>Performed By</th><th>Reference ID</th><th>Status</th></tr></thead>
            <tbody>
              {AUDIT_LOGS.map((l,i)=>(
                <tr key={i}>
                  <td style={{fontFamily:"monospace",fontSize:11,color:"rgba(255,255,255,0.5)"}}>{l.ts}</td>
                  <td style={{fontWeight:600}}>{l.action}</td>
                  <td style={{color:"#60A5FA"}}>{l.user}</td>
                  <td style={{fontFamily:"monospace",fontSize:11,color:"#D4AF37"}}>{l.ref}</td>
                  <td><span style={{display:"inline-flex",padding:"3px 9px",borderRadius:100,fontSize:10.5,fontWeight:600,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.25)",color:"#34D399"}}>{l.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableCard>
      )}
    </PageWrapper>
  );
}

export default function TaxReportsPage() {
  return <ToastProvider><Content/></ToastProvider>;
}
