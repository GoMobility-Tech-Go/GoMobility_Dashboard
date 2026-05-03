import { ToastProvider, PageWrapper, TableCard, MiniStatRow, AlertBox, GlobalStyles } from "../../components/ui/index.jsx";

function Content() {
  return (
    <PageWrapper title="Driver Payouts" subtitle="Manage and process driver withdrawal requests">
      <GlobalStyles/>
      <MiniStatRow items={[
        { label:"Pending", value:"—", icon:"⏳", color:"#D4AF37" },
        { label:"Pending Amount", value:"—", icon:"💰", color:"#D4AF37" },
        { label:"Processed Today", value:"—", icon:"✅", color:"#34D399" },
        { label:"Total Paid (Month)", value:"—", icon:"🏦", color:"#60A5FA" },
      ]}/>
      <TableCard title="Withdrawal Requests" icon="💰">
        <div style={{ padding: 50, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "Outfit,sans-serif" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>💰</div>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Admin payout list API not available</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
            Driver cash balances are tracked per driver via{" "}
            <code style={{ color: "rgba(212,175,55,0.6)" }}>GET /drivers/cash/balance</code>
          </div>
        </div>
      </TableCard>
    </PageWrapper>
  );
}
export default function PayoutsPage() { return <ToastProvider><Content/></ToastProvider>; }
