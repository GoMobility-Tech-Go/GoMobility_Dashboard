import { useState, useEffect, useCallback, useMemo } from "react";
import { ChevronLeft, ChevronRight, EyeOff, Flag, Star, X, RefreshCw } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getFlaggedReviews, hideReview, unflagReview } from "../../api/admin";

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}) : "—";

const TOOLTIP_STYLE = {
  background:"#020d26", border:"1px solid rgba(212,175,55,0.2)",
  borderRadius:10, color:"#fff", fontFamily:"Outfit,sans-serif", fontSize:12,
  boxShadow:"0 8px 24px rgba(0,0,0,0.4)",
};

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
  const [reviews, setReviews]   = useState([]);
  const [allReviews, setAll]    = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [offset, setOffset]     = useState(0);
  const [starFilter, setStarFilter] = useState(0);
  const [toast, setToast]       = useState(null);
  const [acting, setActing]     = useState({});
  const LIMIT = 20;

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),3500); };

  // Load a bigger batch for stats
  useEffect(() => {
    getFlaggedReviews({ limit: 100, offset: 0 })
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setAll(d.items || d.reviews || d.data || []);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit:LIMIT, offset };
    if (starFilter > 0) params.rating = starFilter;
    getFlaggedReviews(params)
      .then((res) => {
        const d = res.data?.data || res.data || {};
        setReviews(d.items || d.reviews || d.data || []);
        setTotal(d.pagination?.total || d.total || 0);
      })
      .catch(() => showToast("Failed to load reviews.", "error"))
      .finally(() => setLoading(false));
  }, [offset, starFilter]);

  useEffect(() => { load(); }, [load]);

  const act = async (id, key, fn, msg) => {
    setActing((p) => ({ ...p, [key]: true }));
    try {
      await fn();
      showToast(msg);
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setAll((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
    } catch (err) {
      showToast(err.response?.data?.message || "Action failed.", "error");
    } finally {
      setActing((p) => ({ ...p, [key]: false }));
    }
  };

  // Stats computed from allReviews batch
  const stats = useMemo(() => {
    const src = allReviews.length > 0 ? allReviews : reviews;
    const withRating = src.filter(r => r.rating > 0);
    const avgRating  = withRating.length > 0
      ? (withRating.reduce((s,r) => s + r.rating, 0) / withRating.length).toFixed(1)
      : "—";
    const dist = [1,2,3,4,5].map(star => ({
      star: `${star}★`,
      count: src.filter(r => Math.round(r.rating) === star).length,
      fill: star <= 2 ? "#f87171" : star === 3 ? "#f59e0b" : "#4ade80",
    }));
    const flagReasons = src.reduce((acc, r) => {
      const reason = r.flag_reason || "Other";
      acc[reason] = (acc[reason]||0) + 1;
      return acc;
    }, {});
    const topReason = Object.entries(flagReasons).sort((a,b)=>b[1]-a[1])[0];
    return { avgRating, dist, topReason: topReason?.[0] || "—" };
  }, [allReviews, reviews]);

  const totalPages  = Math.ceil(total / LIMIT);
  const currentPage = Math.floor(offset / LIMIT) + 1;

  return (
    <div style={{ fontFamily:"Outfit,sans-serif" }}>
      <style>{`@keyframes gmPulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)} />}

      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:22, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"Cinzel,serif", fontSize:22, fontWeight:700, color:"#fff", margin:0 }}>Flagged Reviews</h1>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:13, marginTop:4 }}>{total} reviews flagged for moderation</p>
        </div>
        <button onClick={load} disabled={loading} style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 16px", background:"rgba(212,175,55,0.08)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:10, color:"#D4AF37", fontSize:13, cursor:"pointer", opacity:loading?0.5:1 }}>
          <RefreshCw size={13}/> Refresh
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:22 }}>

        {/* Avg Rating card */}
        <div style={{ background:"rgba(245,158,11,0.06)", border:"1px solid rgba(245,158,11,0.15)", borderRadius:14, padding:"18px 22px", display:"flex", flexDirection:"column", justifyContent:"space-between" }}>
          <div style={{ fontSize:10, color:"rgba(245,158,11,0.6)", textTransform:"uppercase", letterSpacing:"1px", fontFamily:"Cinzel,serif", marginBottom:10 }}>Avg Rating (Flagged)</div>
          <div style={{ display:"flex", alignItems:"flex-end", gap:12 }}>
            <div style={{ fontSize:38, fontWeight:800, color:"#f59e0b", fontFamily:"Cinzel,serif", lineHeight:1 }}>{stats.avgRating}</div>
            <div style={{ paddingBottom:4 }}>
              <div style={{ display:"flex", gap:2, marginBottom:4 }}>
                {[1,2,3,4,5].map(s=>(
                  <Star key={s} size={14} fill={s <= Math.round(Number(stats.avgRating)||0)?"#f59e0b":"transparent"} color={s <= Math.round(Number(stats.avgRating)||0)?"#f59e0b":"rgba(255,255,255,0.15)"} />
                ))}
              </div>
              <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>out of 5</div>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ background:"rgba(248,113,113,0.06)", border:"1px solid rgba(248,113,113,0.15)", borderRadius:14, padding:"18px 22px" }}>
          <div style={{ fontSize:10, color:"rgba(248,113,113,0.6)", textTransform:"uppercase", letterSpacing:"1px", fontFamily:"Cinzel,serif", marginBottom:10 }}>Total Flagged</div>
          <div style={{ fontSize:38, fontWeight:800, color:"#f87171", fontFamily:"Cinzel,serif", lineHeight:1, marginBottom:8 }}>{total}</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>Top reason: <span style={{ color:"rgba(255,255,255,0.5)" }}>{stats.topReason}</span></div>
        </div>

        {/* Low rating count */}
        <div style={{ background:"rgba(52,211,153,0.06)", border:"1px solid rgba(52,211,153,0.15)", borderRadius:14, padding:"18px 22px" }}>
          <div style={{ fontSize:10, color:"rgba(52,211,153,0.6)", textTransform:"uppercase", letterSpacing:"1px", fontFamily:"Cinzel,serif", marginBottom:10 }}>1–2 Star Reviews</div>
          <div style={{ fontSize:38, fontWeight:800, color:"#34D399", fontFamily:"Cinzel,serif", lineHeight:1, marginBottom:8 }}>
            {stats.dist.filter(d=>d.star==="1★"||d.star==="2★").reduce((s,d)=>s+d.count,0)}
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>High-priority moderation needed</div>
        </div>
      </div>

      {/* Rating Distribution Chart */}
      {(allReviews.length > 0 || reviews.length > 0) && (
        <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(212,175,55,0.1)", borderRadius:16, padding:22, marginBottom:22 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
            <div style={{ fontFamily:"Cinzel,serif", fontSize:13, color:"rgba(255,255,255,0.7)" }}>Star Rating Distribution</div>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>from flagged reviews</span>
          </div>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={stats.dist} margin={{ top:4, right:4, left:0, bottom:0 }} barSize={36}>
              <XAxis dataKey="star" tick={{ fill:"rgba(255,255,255,0.5)", fontSize:12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:"rgba(255,255,255,0.3)", fontSize:10 }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} reviews`, "Count"]} />
              <Bar dataKey="count" radius={[4,4,0,0]}>
                {stats.dist.map((d,i) => <Cell key={i} fill={d.fill} opacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Star Filter */}
      <div style={{ display:"flex", gap:8, alignItems:"center", marginBottom:18, flexWrap:"wrap" }}>
        <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)", fontFamily:"Cinzel,serif" }}>Filter by star:</span>
        {[0,1,2,3,4,5].map(s => (
          <button key={s} onClick={()=>{setStarFilter(s);setOffset(0);}} style={{
            padding:"6px 14px", borderRadius:10, border:"1px solid",
            fontSize:12, cursor:"pointer", fontWeight:600,
            borderColor: starFilter===s ? "#D4AF37" : "rgba(212,175,55,0.2)",
            background: starFilter===s ? "rgba(212,175,55,0.12)" : "transparent",
            color: starFilter===s ? "#D4AF37" : "rgba(255,255,255,0.4)",
          }}>
            {s === 0 ? "All" : `${s} ★`}
          </button>
        ))}
      </div>

      {/* Review List */}
      {loading
        ? <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
            {Array(4).fill(0).map((_,i)=>(
              <div key={i} style={{ height:110, borderRadius:14, background:"rgba(255,255,255,0.04)", animation:"gmPulse 1.5s ease-in-out infinite" }}/>
            ))}
          </div>
        : reviews.length === 0
          ? <div style={{ textAlign:"center", padding:60 }}>
              <div style={{ fontSize:36, marginBottom:12 }}>🎉</div>
              <div style={{ fontSize:14, color:"rgba(255,255,255,0.3)" }}>No flagged reviews {starFilter > 0 ? `for ${starFilter}★` : ""}</div>
            </div>
          : (
            <>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {reviews.map((r) => (
                  <div key={r.id} style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(239,68,68,0.18)", borderRadius:14, padding:20, transition:"border-color .2s" }}
                    onMouseEnter={(e)=>e.currentTarget.style.borderColor="rgba(239,68,68,0.35)"}
                    onMouseLeave={(e)=>e.currentTarget.style.borderColor="rgba(239,68,68,0.18)"}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8, flexWrap:"wrap" }}>
                          {/* Avatar circle */}
                          <div style={{ width:32, height:32, borderRadius:"50%", background:"rgba(212,175,55,0.15)", border:"1px solid rgba(212,175,55,0.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, color:"#D4AF37", flexShrink:0 }}>
                            {(r.reviewer?.name || r.reviewer_name || "A")[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontSize:13, fontWeight:600, color:"#fff" }}>{r.reviewer?.name || r.reviewer_name || "Anonymous"}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.35)" }}>{fmt(r.created_at)}</div>
                          </div>
                          <Stars rating={r.rating || 0} />
                          <span style={{ padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:600, background:"rgba(239,68,68,0.15)", color:"#f87171", border:"1px solid rgba(239,68,68,0.3)" }}>Flagged</span>
                        </div>
                        <p style={{ margin:0, fontSize:13, color:"rgba(255,255,255,0.65)", lineHeight:1.6, paddingLeft:42 }}>{r.comment || r.review || r.content || "—"}</p>
                        {r.flag_reason && (
                          <div style={{ marginTop:8, paddingLeft:42, fontSize:11, color:"rgba(239,68,68,0.7)" }}>
                            Flag reason: <span style={{ color:"rgba(239,68,68,0.9)", fontWeight:600 }}>{r.flag_reason}</span>
                          </div>
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
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Page {currentPage} of {totalPages} · {total} total</span>
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
