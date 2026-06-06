import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, EyeOff, Flag, Star, X } from "lucide-react";
import { getFlaggedReviews, hideReview, unflagReview } from "../../api/admin";

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";

const Toast = ({ msg, type, onClose }) => (
  <div style={{ position:"fixed", bottom:28, right:28, zIndex:9999, background:type==="error"?"#7f1d1d":"#14532d", border:`1px solid ${type==="error"?"#ef4444":"#22c55e"}`, borderRadius:12, padding:"12px 20px", color:"#fff", fontSize:13, fontFamily:"Outfit,sans-serif", display:"flex", alignItems:"center", gap:12, boxShadow:"0 8px 32px rgba(0,0,0,0.4)" }}>
  <span style={{ flex:1 }}>{msg}</span>
  <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.6)", cursor:"pointer" }}><X size={14}/></button>
  </div>
);

const Stars = ({ rating }) => (
  <div style={{ display:"flex", gap:2 }}>
    {[1,2,3,4,5].map((s) => (
      <Star key={s} size={13} fill={s<=rating?"#f59e0b":"transparent"} color={s<=rating?"#f59e0b":"rgba(255,255,255,0.2)"} />
    ))}
  </div>
);

export default function ReviewsPage() {
  const [reviews, setReviews] = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset]   = useState(0);
  const [toast, setToast]     = useState(null);
  const [acting, setActing]   = useState({});
  const LIMIT = 20;

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  const load = useCallback(() => {
    setLoading(true);
    getFlaggedReviews({ limit:LIMIT, offset })
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setReviews(d.items || d.reviews || d.data || []);
        setTotal(d.pagination?.total || d.total || 0);
      })
      .catch(() => showToast("Failed to load reviews.", "error"))
      .finally(() => setLoading(false));
  }, [offset]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, key, fn, msg) => {
    setActing((p) => ({ ...p, [key]: true }));
    try {
      await fn();
      showToast(msg);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
    } catch (err) {
      showToast(err.response?.data?.message || "Action failed.", "error");
    } finally {
      setActing((p) => ({ ...p, [key]: false }));
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Flagged Reviews</h1>
        <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>Total: {total} flagged reviews</p>
      </div>

      {loading
        ? <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {Array(4).fill(0).map((_,i)=>(
              <div key={i} style={{ height:110, borderRadius:14, background:"rgba(255,255,255,0.04)", animation:"gmPulse 1.5s ease-in-out infinite" }}/>
            ))}
          </div>
        : reviews.length === 0
          ? <div style={{ textAlign:"center", padding:60, color:"rgba(255,255,255,0.3)", fontSize:14 }}>No flagged reviews</div>
          : (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {reviews.map((r) => (
                  <div key={r.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:14, padding:20, position:"relative" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8, flexWrap:"wrap" }}>
                          <span style={{ fontSize:13, fontWeight:600, color:"#fff" }}>{r.reviewer?.name || r.reviewer_name || "Anonymous"}</span>
                          <Stars rating={r.rating || 0} />
                          <span style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{fmt(r.created_at)}</span>
                          <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:600, background:"rgba(239,68,68,0.15)", color:"#f87171", border:"1px solid rgba(239,68,68,0.3)" }}>Flagged</span>
                        </div>
                        <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.65)", lineHeight:1.6 }}>{r.comment || r.review || r.content || "—"}</p>
                        {r.flag_reason && (
                          <div style={{ marginTop:8, fontSize:11, color:"rgba(239,68,68,0.7)" }}>Reason: {r.flag_reason}</div>
                        )}
                      </div>
                      <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                        <button
                          onClick={() => act(r.id, `h${r.id}`, () => hideReview(r.id), "Review hidden.")}
                          disabled={acting[`h${r.id}`]}
                          title="Hide Review"
                          style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.25)", borderRadius:8, color:"#f87171", fontSize:12, cursor:"pointer", opacity:acting[`h${r.id}`]?0.5:1 }}
                        >
                          <EyeOff size={13}/> Hide
                        </button>
                        <button
                          onClick={() => act(r.id, `u${r.id}`, () => unflagReview(r.id), "Review unflagged.")}
                          disabled={acting[`u${r.id}`]}
                          title="Unflag Review"
                          style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px", background:"rgba(34,197,94,0.1)", border:"1px solid rgba(34,197,94,0.25)", borderRadius:8, color:"#4ade80", fontSize:12, cursor:"pointer", opacity:acting[`u${r.id}`]?0.5:1 }}
                        >
                          <Flag size={13}/> Unflag
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {total > LIMIT && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:16 }}>
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Page {currentPage} of {totalPages}</span>
                  <div style={{ display:"flex", gap:8 }}>
                    {[{icon:<ChevronLeft size={14}/>,dis:offset===0,fn:()=>setOffset(Math.max(0,offset-LIMIT))},{icon:<ChevronRight size={14}/>,dis:offset+LIMIT>=total,fn:()=>setOffset(offset+LIMIT)}].map((b,i)=>(
                      <button key={i} onClick={b.fn} disabled={b.dis} style={{ width:32, height:32, borderRadius:8, border:"1px solid rgba(212,175,55,0.2)", background:"transparent", cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", justifyContent:"center", opacity:b.dis?0.3:1 }}>{b.icon}</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )
      }
    </div>
  );
}
