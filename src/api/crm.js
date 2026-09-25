import axios from "axios";

// ── GoMobility CRM backend (alag service — gomobility-crm repo) ──────────────
// Login alag nahi: admin dashboard ka hi token (localStorage access_token) bhejte hain. CRM use ride backend ke
// GET /auth/me se verify karta hai, aur role map karta hai: super_admin → admin, admin → approver, ops_team → marketer.
// Production mein VITE_CRM_API_URL set karo (jaise https://crm-api.gomobility.co.in/api).
const crm = axios.create({
  baseURL: import.meta.env.VITE_CRM_API_URL || "http://localhost:4100/api",
  timeout: 20000,
});

crm.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Ride backend expiry ke paas token badal deta hai — CRM wo naya token header mein aage bhejta hai.
// Save na kiya toh purana token ride backend pe mar jaata aur admin logout ho jaata.
const saveRotated = (res) => {
  const t = res?.headers?.["x-new-access-token"];
  if (t) localStorage.setItem("access_token", t);
};

crm.interceptors.response.use(
  (res) => { saveRotated(res); return res; },
  // 401 pe poora admin panel logout NAHI — ho sakta hai sirf CRM access na ho (role map mein nahi).
  // Page error dikhayega; admin session ride backend khud sambhalta hai.
  (err) => { saveRotated(err.response); return Promise.reject(err); }
);

export const crmErrorText = (e) => {
  const code = e?.response?.data?.error;
  if (e?.response?.status === 401) return "CRM access nahi mila — dobara login karein ya role check karein.";
  if (e?.response?.status === 503 && code === "ride_auth_unavailable") return "Login verify nahi ho paya (ride backend down).";
  if (!e?.response) return "CRM server se connection nahi hua.";
  return code || e.message || "Kuch galat hua";
};

export const crmGet = (path, params) => crm.get(path, { params }).then((r) => r.data);
export const crmPost = (path, body) => crm.post(path, body ?? {}).then((r) => r.data);
export const crmPatch = (path, body) => crm.patch(path, body).then((r) => r.data);

export default crm;
