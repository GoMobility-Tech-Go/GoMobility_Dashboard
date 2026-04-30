import { useState } from "react";
import {
  useToast,
  ToastProvider,
  PageWrapper,
  TableCard,
  FilterBar,
  SearchBox,
  AvatarCell,
  AlertBox,
  MiniStatRow,
  GlobalStyles,
} from "../../components/ui/index.jsx";
import { genActivityLogs } from "../../data/mockData.js";
import { useAuth } from "../../context/AuthContext";

const LOGS = genActivityLogs(20);

const AC = {
  User_Blocked: "red",
  Driver_Blocked: "red",
  Review_Hidden: "red",
  KYC_Approved: "green",
  Payout_Approved: "green",
  Wallet_Credited: "green",
  Refund_Initiated: "gold",
  Fare_Updated: "gold",
  Plan_Created: "blue",
  Ticket_Replied: "purple",
};

const CC = {
  red: "#F87171",
  green: "#34D399",
  gold: "#D4AF37",
  blue: "#60A5FA",
  purple: "#A78BFA",
  gray: "rgba(255,255,255,0.45)",
};

const RC = {
  Super_Admin: "gold",
  Admin: "blue",
  Support: "purple",
  Finance: "green",
};

function Content() {
  const toast = useToast();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [rf, setRf] = useState("");
  const [af, setAf] = useState("");

  if (user?.role !== "Super Admin") {
    return (
      <PageWrapper title="Activity Logs" subtitle="">
        <GlobalStyles />
        <AlertBox type="error">
          This section is accessible to Super Admins only.
        </AlertBox>
      </PageWrapper>
    );
  }

  const filtered = LOGS.filter((l) => {
    const q = search.toLowerCase();

    return (
      (l.admin.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.target.toLowerCase().includes(q)) &&
      (!rf || l.role === rf) &&
      (!af || l.action === af)
    );
  });

  const getAC = (action) => {
    const k = action.replace(/ /g, "_");
    return AC[k] || "gray";
  };

  const getRC = (role) => {
    const k = role.replace(/ /g, "_");
    return RC[k] || "gray";
  };

  return (
    <PageWrapper
      title="Admin Activity Logs"
      subtitle="Complete audit trail of all admin actions — Super Admin exclusive"
      actions={
        <button
          className="btn-outline btn-sm"
          onClick={() => toast("Logs exported!", "success")}
        >
          Export Logs
        </button>
      }
    >
      <GlobalStyles />

      <MiniStatRow
        items={[
          {
            label: "Total Logs (Today)",
            value: "4,821",
            icon: "📋",
          },
          {
            label: "Admin Actions",
            value: "38",
            icon: "⚡",
            color: "#D4AF37",
          },
          {
            label: "Security Events",
            value: "2",
            icon: "🔐",
            color: "#F87171",
          },
          {
            label: "Config Changes",
            value: "7",
            icon: "⚙️",
            color: "#60A5FA",
          },
        ]}
      />

      <TableCard
        title="All Activity Logs"
        icon="📋"
        footer={
          <span
            style={{
              fontSize: 12,
              color: "rgba(255,255,255,0.35)",
            }}
          >
            Showing {filtered.length} of 4,821 entries
          </span>
        }
      >
        <FilterBar>
          <SearchBox
            placeholder="Search by admin, action, target..."
            value={search}
            onChange={setSearch}
          />

          <select
            className="gm-input"
            style={{ width: 140 }}
            value={rf}
            onChange={(e) => setRf(e.target.value)}
          >
            <option value="">All Roles</option>
            <option>Super Admin</option>
            <option>Admin</option>
            <option>Support</option>
            <option>Finance</option>
          </select>

          <select
            className="gm-input"
            style={{ width: 170 }}
            value={af}
            onChange={(e) => setAf(e.target.value)}
          >
            <option value="">All Actions</option>
            <option>User Blocked</option>
            <option>KYC Approved</option>
            <option>Refund Initiated</option>
            <option>Fare Updated</option>
            <option>Plan Created</option>
            <option>Review Hidden</option>
            <option>Ticket Replied</option>
            <option>Payout Approved</option>
          </select>

          <input
            type="date"
            className="gm-input"
            style={{ width: 140 }}
          />
        </FilterBar>

        <table className="gm-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Admin</th>
              <th>Role</th>
              <th>Action</th>
              <th>Target</th>
              <th>IP Address</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((l, i) => {
              const ac = getAC(l.action);
              const rc = getRC(l.role);
              const ac_c = CC[ac] || CC.gray;

              return (
                <tr key={i}>
                  <td
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.45)",
                    }}
                  >
                    {l.ts}
                  </td>

                  <td>
                    <AvatarCell name={l.admin} />
                  </td>

                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        padding: "3px 8px",
                        borderRadius: 100,
                        fontSize: 10.5,
                        fontWeight: 600,
                        background: `${CC[rc] || CC.gray}15`,
                        border: `1px solid ${CC[rc] || CC.gray}30`,
                        color: CC[rc] || CC.gray,
                      }}
                    >
                      {l.role}
                    </span>
                  </td>

                  <td>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "3px 9px",
                        borderRadius: 100,
                        fontSize: 10.5,
                        fontWeight: 600,
                        background: `${ac_c}15`,
                        border: `1px solid ${ac_c}30`,
                        color: ac_c,
                      }}
                    >
                      {l.action}
                    </span>
                  </td>

                  <td style={{ fontSize: 12 }}>{l.target}</td>

                  <td
                    style={{
                      fontFamily: "monospace",
                      fontSize: 11,
                      color: "rgba(255,255,255,0.38)",
                    }}
                  >
                    {l.ip}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableCard>
    </PageWrapper>
  );
}

export default function ActivityLogsPage() {
  return (
    <ToastProvider>
      <Content />
    </ToastProvider>
  );
}