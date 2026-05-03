import { useState } from "react";
import { useToast, ToastProvider, PageWrapper, TableCard, Badge, MiniStatRow, Modal, FormGroup, AlertBox, GlobalStyles } from "../../components/ui/index.jsx";
import { api } from "../../services/api.js";

function Content() {
  const toast = useToast();
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleRefund = () => {
    toast("No refund list API available — use individual refund actions from Ride or Transaction detail", "error");
  };

  return (
    <PageWrapper title="Refund Management" subtitle="Review and process passenger refund requests within SLA">
      <GlobalStyles/>
      <MiniStatRow items={[
        { label:"Pending", value:"—", icon:"⏳", color:"#D4AF37" },
        { label:"Approved Today", value:"—", icon:"✅", color:"#34D399" },
        { label:"Rejected", value:"—", icon:"❌", color:"#F87171" },
        { label:"Total Refunded", value:"—", icon:"💸", color:"#D4AF37" },
      ]}/>
      <TableCard title="Refund Requests" icon="↩">
        <div style={{ padding: 50, textAlign: "center", color: "rgba(255,255,255,0.3)", fontFamily: "Outfit,sans-serif" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>↩</div>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Refund list API not available</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>
            Initiate refunds from individual ride or transaction detail
          </div>
          <button
            className="btn-gold"
            style={{ marginTop: 20 }}
            onClick={() => toast("Use POST /payments/refund to initiate a refund", "success")}
          >
            Initiate Refund
          </button>
        </div>
      </TableCard>
    </PageWrapper>
  );
}
export default function RefundsPage() { return <ToastProvider><Content/></ToastProvider>; }
