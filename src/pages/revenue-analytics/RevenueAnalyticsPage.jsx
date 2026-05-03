import { useState, useEffect } from "react";
import { useToast, ToastProvider, PageWrapper, Card, TableCard, MiniStatRow, GlobalStyles, GoldTooltip, AlertBox } from "../../components/ui/index.jsx";
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { api } from "../../services/api.js";

const EMPTY_STATE = (
  <div style={{padding:60,textAlign:"center",color:"rgba(255,255,255,0.3)",fontFamily:"Outfit,sans-serif"}}>
    <div style={{fontSize:40,marginBottom:12}}>📊</div>
    <div style={{fontSize:14}}>Analytics data not available via API</div>
  </div>
);

function Content() {
  const toast = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");
  const [tab, setTab] = useState("pl");

  useEffect(() => {
    api.getRevenueAnalytics()
      .then(res => {
        setAnalytics(res?.data || res || null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const TABS = [
    { id:"pl",           l:"P&L Report"          },
    { id:"commission",   l:"Commission Breakdown" },
    { id:"earnings",     l:"Driver Earnings"      },
    { id:"retention",    l:"User Retention"       },
    { id:"cancellation", l:"Cancellation Analytics" },
    { id:"peak",         l:"Peak vs Off-Peak"     },
  ];

  const totalRevenue = analytics?.total_revenue || 0;
  const totalProfit  = analytics?.total_profit || 0;
  const totalPayout  = analytics?.total_payout || 0;
  const totalFee     = analytics?.platform_fee || 0;

  return (
    <PageWrapper title="Advanced Revenue & Business Analytics"
      subtitle="P&L reports, commission breakdown, driver earnings, retention and cancellation analytics"
      actions={
        <div style={{display:"flex",gap:8}}>
          <select className="gm-input btn-sm" style={{width:140}} value={period} onChange={e=>setPeriod(e.target.value)}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button className="btn-outline btn-sm" onClick={()=>toast("Exporting analytics report...","success")}>↓ Export PDF</button>
        </div>
      }>
      <GlobalStyles/>

      <MiniStatRow items={[
        { label:"Total Revenue", value: loading?"—":totalRevenue?`Rs${(totalRevenue/100000).toFixed(1)}L`:"—", icon:"💰", color:"#D4AF37" },
        { label:"Total Profit",  value: loading?"—":totalProfit?`Rs${(totalProfit/100000).toFixed(1)}L`:"—",  icon:"📈", color:"#34D399" },
        { label:"Total Payouts", value: loading?"—":totalPayout?`Rs${(totalPayout/100000).toFixed(1)}L`:"—",  icon:"💸", color:"#F87171" },
        { label:"Platform Fee",  value: loading?"—":totalFee?`Rs${(totalFee/100000).toFixed(1)}L`:"—",        icon:"🏦", color:"#60A5FA" },
        { label:"Profit Margin", value: loading?"—":(totalRevenue&&totalProfit)?`${((totalProfit/totalRevenue)*100).toFixed(1)}%`:"—", icon:"📊", color:"#A78BFA" },
        { label:"Avg Monthly",   value:"—", icon:"📅", color:"#F59E0B" },
      ]}/>

      <div className="tab-nav">
        {TABS.map(t=>(
          <button key={t.id} className={`tab-btn${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>
        ))}
      </div>

      {tab==="pl" && <Card style={{padding:22}}>{loading ? <div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.3)",fontFamily:"Outfit,sans-serif"}}>Loading...</div> : EMPTY_STATE}</Card>}
      {tab==="commission" && <Card style={{padding:22}}>{EMPTY_STATE}</Card>}
      {tab==="earnings" && <Card style={{padding:22}}>{EMPTY_STATE}</Card>}
      {tab==="retention" && <Card style={{padding:22}}>{EMPTY_STATE}</Card>}
      {tab==="cancellation" && <Card style={{padding:22}}>{EMPTY_STATE}</Card>}
      {tab==="peak" && <Card style={{padding:22}}>{EMPTY_STATE}</Card>}
    </PageWrapper>
  );
}

export default function RevenueAnalyticsPage() {
  return <ToastProvider><Content/></ToastProvider>;
}
