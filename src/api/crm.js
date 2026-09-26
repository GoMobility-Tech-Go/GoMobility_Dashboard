import axios from "axios";

// ── GoMobility CRM backend (separate service — gomobility-crm repo) ──────────
// No separate login: we send the admin dashboard token (localStorage access_token). The CRM verifies it with the
// ride backend (GET /auth/me) and maps roles: super_admin → admin, admin → approver, ops_team → marketer.
// Production: set VITE_CRM_API_URL (e.g. https://crm-api.gomobility.co.in/api).
const crm = axios.create({
  baseURL: import.meta.env.VITE_CRM_API_URL || "http://localhost:4100/api",
  timeout: 20000,
});

crm.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// The ride backend rotates tokens close to expiry; the CRM forwards the new token in this header.
// If we did not store it, the old token would stop working and the admin would be signed out.
const saveRotated = (res) => {
  const t = res?.headers?.["x-new-access-token"];
  if (t) localStorage.setItem("access_token", t);
};

crm.interceptors.response.use(
  (res) => { saveRotated(res); return res; },
  // A 401 here does NOT sign the admin out — it may only mean this role has no CRM access.
  // The page shows the error; the admin session itself is managed by the ride backend.
  (err) => { saveRotated(err.response); return Promise.reject(err); }
);

// Backend error codes → readable messages
const MESSAGES = {
  second_person_required: "A different person must approve this campaign.",
  approval_requires_user_login: "Approvals require a signed-in user.",
  estimate_required: "Run the estimate before submitting.",
  estimate_outdated_reestimate: "The campaign changed after the estimate. Please re-run the estimate.",
  estimate_stale_reestimate: "The estimate is older than 24 hours. Please re-run it.",
  no_recipients: "No one in this segment can be reached.",
  opt_in_reason_required_min_10_chars: "Please give a reason (at least 10 characters).",
  contact_suppressed_unsuppress_first: "This contact is suppressed. Remove the suppression first.",
  contact_not_found: "Contact not found.",
  query_too_short: "Enter at least 3 characters.",
  campaign_not_found: "Campaign not found.",
  journey_not_found: "Journey not found.",
};

export const crmErrorText = (e) => {
  const code = e?.response?.data?.error;
  const status = e?.response?.status;
  if (status === 401) return "Your session has expired. Please sign in again.";
  if (code === "crm_access_denied") return "Your admin role does not have access to the CRM.";
  if (status === 503 && code === "ride_auth_unavailable") return "Your login could not be verified right now. Please try again shortly.";
  if (!e?.response) return "Unable to reach the CRM service.";
  if (!code) return e.message || "Something went wrong.";
  if (MESSAGES[code]) return MESSAGES[code];
  if (code.startsWith("forbidden:needs_")) return `This action requires the ${code.split("_").pop()} role.`;
  if (code.startsWith("invalid_campaign:")) return "Please fix the campaign: " + code.slice(17).split(",").map((p) => p.replace(/_/g, " ")).join("; ");
  if (code.startsWith("not_editable_in:") || code.startsWith("cannot_estimate_in:")) return `Not allowed while the campaign is ${code.split(":")[1].replace(/_/g, " ")}.`;
  if (code.startsWith("cannot_cancel:")) return `A ${code.split(":")[1]} campaign cannot be cancelled.`;
  return code.replace(/_/g, " ");
};

// Machine-readable reason: "session_expired" | "crm_access_denied" | "unreachable" | backend code
export const crmErrorCode = (e) => (!e?.response ? "unreachable" : e.response.data?.error || String(e.response.status));

export const crmGet = (path, params) => crm.get(path, { params }).then((r) => r.data);
export const crmPost = (path, body) => crm.post(path, body ?? {}).then((r) => r.data);
export const crmPatch = (path, body) => crm.patch(path, body).then((r) => r.data);

export default crm;
