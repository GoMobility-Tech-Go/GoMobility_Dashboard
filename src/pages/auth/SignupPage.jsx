import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Zap, UserPlus } from "lucide-react";
import { signupSendOtp, signupVerifyOtp } from "../../api/auth";
import logo from "../../assets/Logo.jpeg";

/* ─── Particle canvas ─── */
const ParticleCanvas = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    resize();
    window.addEventListener("resize", resize);
    const COUNT = 60;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width, y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.3,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.5 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,175,55,${p.alpha})`; ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(212,175,55,${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

const SignupPage = () => {
  const navigate = useNavigate();
  const [mounted, setMounted]   = useState(false);
  const [step, setStep]         = useState("details"); // "details" | "verify-otp" | "success"
  const [fullName, setFullName] = useState("");
  const [phone, setPhone]       = useState("");
  const [otp, setOtp]           = useState("");
  const [devOtp, setDevOtp]     = useState(null);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  // Step 1: send OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName.trim()) { setError("Full name is required."); return; }
    if (!phone.trim())    { setError("Phone number is required."); return; }
    setLoading(true);
    try {
      const res = await signupSendOtp(phone.trim());
      const data = res.data?.data || res.data || {};
      if (data.otp) setDevOtp(data.otp); // show OTP hint in dev/when SMS not configured
      setStep("verify-otp");
      setOtp("");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Failed to send OTP.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: verify OTP and create account
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp) { setError("Please enter OTP."); return; }
    if (otp.length !== 6) { setError("OTP must be 6 digits."); return; }
    setLoading(true);
    try {
      await signupVerifyOtp(phone.trim(), otp, fullName.trim());
      setStep("success");
      setTimeout(() => navigate("/login"), 2200);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Outfit:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .su-root { font-family:'Outfit',sans-serif; width:100vw; height:100vh; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#04102e; position:relative; }
        .su-root::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 70% 60% at 15% 50%,rgba(10,40,120,0.85) 0%,transparent 70%), radial-gradient(ellipse 50% 70% at 85% 30%,rgba(8,28,90,0.7) 0%,transparent 65%), radial-gradient(ellipse 60% 50% at 50% 100%,rgba(212,175,55,0.06) 0%,transparent 60%); pointer-events:none; z-index:0; }
        .su-root::after { content:''; position:absolute; inset:0; background-image:linear-gradient(rgba(212,175,55,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.04) 1px,transparent 1px); background-size:60px 60px; pointer-events:none; z-index:0; }
        .su-card { position:relative; z-index:2; width:100%; max-width:980px; height:min(600px,calc(100vh - 40px)); display:flex; border-radius:28px; overflow:hidden; box-shadow:0 0 0 1px rgba(212,175,55,0.18),0 40px 120px rgba(0,0,8,0.7),0 0 80px rgba(10,30,100,0.5),inset 0 1px 0 rgba(212,175,55,0.12); margin:0 16px; }
        .su-left { position:relative; width:44%; flex-shrink:0; background:linear-gradient(145deg,#071540 0%,#0a2170 40%,#0b3398 100%); display:flex; flex-direction:column; justify-content:space-between; padding:36px 32px; overflow:hidden; }
        .su-left::before { content:''; position:absolute; top:-80px; right:-80px; width:280px; height:280px; border-radius:50%; background:radial-gradient(circle,rgba(212,175,55,0.12) 0%,transparent 70%); pointer-events:none; }
        .su-crown { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:320px; height:320px; opacity:0.04; pointer-events:none; }
        .su-right { flex:1; background:#f5f0e8; background-image:radial-gradient(ellipse at top right,rgba(212,175,55,0.08) 0%,transparent 50%),radial-gradient(ellipse at bottom left,rgba(10,30,100,0.06) 0%,transparent 55%); display:flex; align-items:center; justify-content:center; padding:36px 40px; position:relative; overflow:hidden; }
        .su-right::before { content:''; position:absolute; top:-1px; left:0; width:100%; height:3px; background:linear-gradient(90deg,transparent,rgba(212,175,55,0.6),transparent); }
        .su-field-label { font-family:'Cinzel',serif; font-size:10px; letter-spacing:2px; color:#3d5096; font-weight:600; display:block; margin-bottom:7px; text-transform:uppercase; }
        .su-input { width:100%; height:50px; background:rgba(255,255,255,0.8); border:1.5px solid rgba(180,160,100,0.25); border-radius:12px; padding:0 16px; font-family:'Outfit',sans-serif; font-size:14px; color:#0c1f5e; outline:none; transition:border-color .25s,box-shadow .25s,background .25s; }
        .su-input::placeholder { color:#b0a88a; font-weight:300; }
        .su-input:focus { border-color:#D4AF37; background:#fff; box-shadow:0 0 0 3px rgba(212,175,55,0.12),0 4px 16px rgba(212,175,55,0.08); }
        .su-error { background:rgba(200,30,30,0.07); border:1px solid rgba(200,30,30,0.2); border-radius:10px; padding:10px 14px; font-size:12.5px; color:#c01818; font-family:'Outfit',sans-serif; font-weight:500; animation:shake .35s ease; }
        .su-success { background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.3); border-radius:10px; padding:12px 16px; font-size:13px; color:#15803d; font-family:'Outfit',sans-serif; font-weight:600; text-align:center; }
        .su-dev-hint { background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.35); border-radius:10px; padding:10px 14px; font-size:12.5px; color:#7a5f10; font-family:'Outfit',sans-serif; text-align:center; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        .su-btn { width:100%; height:52px; border-radius:13px; border:none; cursor:pointer; font-family:'Cinzel',serif; font-size:13px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#0a1840; background:linear-gradient(135deg,#f0d060 0%,#D4AF37 45%,#b8922a 100%); box-shadow:0 6px 30px rgba(212,175,55,0.4),0 1px 0 rgba(255,255,255,0.3) inset; position:relative; overflow:hidden; transition:transform .2s,box-shadow .2s; margin-top:6px; }
        .su-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 12px 40px rgba(212,175,55,0.5),0 1px 0 rgba(255,255,255,0.3) inset; }
        .su-btn:disabled { opacity:.8; cursor:not-allowed; }
        .su-btn::after { content:''; position:absolute; top:0; left:-100%; width:60%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent); transform:skewX(-20deg); animation:shimmer 2.5s infinite; }
        .su-back-btn { width:100%; height:46px; border-radius:13px; border:1px solid rgba(212,175,55,0.3); cursor:pointer; font-family:'Cinzel',serif; font-size:12px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#D4AF37; background:rgba(212,175,55,0.08); transition:all .2s; margin-top:8px; }
        .su-back-btn:hover:not(:disabled) { background:rgba(212,175,55,0.15); }
        @keyframes shimmer { 0%{left:-100%} 60%,100%{left:150%} }
        .su-spinner { display:inline-block; width:16px; height:16px; border:2px solid rgba(10,24,64,0.3); border-top-color:#0a1840; border-radius:50%; animation:spin .7s linear infinite; vertical-align:middle; margin-right:8px; }
        @keyframes spin { to{transform:rotate(360deg)} }
        @media(max-width:680px){ .su-left{display:none!important} .su-right{padding:32px 24px} .su-card{max-width:420px;height:auto;min-height:0} }
      `}</style>

      <div className="su-root">
        <ParticleCanvas />
        <div
          className="su-card"
          style={{
            transform: mounted ? "translateY(0)" : "translateY(40px)",
            opacity:   mounted ? 1 : 0,
            transition: "transform 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.9s ease",
          }}
        >
          {/* ── LEFT PANEL ── */}
          <div className="su-left">
            <ParticleCanvas />
            <svg className="su-crown" viewBox="0 0 200 200" fill="none">
              <path d="M100 20 L130 80 L180 50 L160 130 H40 L20 50 L70 80 Z" fill="#D4AF37"/>
              <rect x="40" y="135" width="120" height="12" rx="4" fill="#D4AF37"/>
              <circle cx="100" cy="20" r="8" fill="#D4AF37"/>
              <circle cx="180" cy="50" r="6" fill="#D4AF37"/>
              <circle cx="20" cy="50" r="6" fill="#D4AF37"/>
            </svg>

            <div style={{ position:"relative", zIndex:1, display:"flex", alignItems:"center", gap:12 }}>
              <img src={logo} alt="GO Mobility" style={{ width:46, height:46, borderRadius:12, objectFit:"cover", border:"1.5px solid rgba(212,175,55,0.4)", boxShadow:"0 0 20px rgba(212,175,55,0.2)" }} />
              <div>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:18, fontWeight:700, color:"#fff", letterSpacing:2 }}>GO Mobility</div>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:"#D4AF37", letterSpacing:3, marginTop:2 }}>Royal Command Centre</div>
              </div>
            </div>

            <div style={{ position:"relative", zIndex:1, flex:1, display:"flex", flexDirection:"column", justifyContent:"center", padding:"24px 0" }}>
              <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(212,175,55,0.12)", border:"1px solid rgba(212,175,55,0.25)", borderRadius:100, padding:"6px 14px", fontSize:11, color:"#D4AF37", letterSpacing:1, width:"fit-content", fontFamily:"'Outfit',sans-serif", fontWeight:500 }}>
                <ShieldCheck size={12} /> Admin Registration
              </div>
              <h1 style={{ fontFamily:"'Cinzel',serif", fontSize:"clamp(22px,2.4vw,30px)", fontWeight:700, color:"#fff", lineHeight:1.25, marginTop:20 }}>
                Join the<br /><span style={{ color:"#D4AF37" }}>Command</span><br />Centre
              </h1>
              <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, fontStyle:"italic", color:"rgba(255,255,255,0.6)", lineHeight:1.8, marginTop:16, maxWidth:280 }}>
                Register with your phone number. An OTP will be sent to verify your identity.
              </p>
              <div style={{ width:48, height:2, background:"linear-gradient(90deg,#D4AF37,transparent)", marginTop:20, borderRadius:2 }} />
            </div>

            <div style={{ position:"relative", zIndex:1, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:16, padding:"16px 18px", backdropFilter:"blur(6px)" }}>
              <div style={{ fontSize:10, letterSpacing:"2px", color:"#D4AF37", fontFamily:"'Cinzel',serif", fontWeight:600, marginBottom:8 }}>⬡ OTP Based Login</div>
              <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.65)", fontFamily:"'Outfit',sans-serif", fontWeight:300, lineHeight:1.6 }}>
                No password needed. After registration, sign in with your phone number — OTP sent via SMS.
              </div>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div className="su-right">
            <svg style={{ position:"absolute", top:20, right:20, width:60, height:60, opacity:0.12 }} viewBox="0 0 60 60">
              <path d="M0 0 L60 0 L60 60" stroke="#D4AF37" strokeWidth="1.5" fill="none"/>
              <circle cx="60" cy="0" r="4" fill="#D4AF37"/>
            </svg>

            <div style={{ width:"100%", maxWidth:360 }}>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:10, letterSpacing:"3px", color:"#8B6914", textTransform:"uppercase", marginBottom:10 }}>⬡ Admin Portal</div>

              {/* ── SUCCESS ── */}
              {step === "success" ? (
                <div style={{ textAlign:"center", padding:"28px 0" }}>
                  <div style={{ fontSize:40, marginBottom:14 }}>✅</div>
                  <div style={{ fontFamily:"'Cinzel',serif", fontSize:16, fontWeight:700, color:"#15803d", marginBottom:8 }}>Account Created!</div>
                  <div style={{ fontSize:13, color:"#6b7280", fontFamily:"'Outfit',sans-serif" }}>Redirecting to login…</div>
                </div>
              ) : step === "details" ? (
                /* ── STEP 1: Name + Phone ── */
                <>
                  <h2 style={{ fontFamily:"'Cinzel',serif", fontSize:"clamp(26px,3vw,34px)", fontWeight:900, color:"#0c1f5e", letterSpacing:-0.5, lineHeight:1 }}>
                    Create<br />Account
                  </h2>
                  <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, fontStyle:"italic", color:"#7a6a4a", marginTop:6 }}>
                    Register as Admin — OTP will be sent to your phone
                  </p>

                  <div style={{ display:"flex", alignItems:"center", gap:10, margin:"22px 0" }}>
                    <div style={{ flex:1, height:1, background:"linear-gradient(90deg,rgba(212,175,55,0.5),rgba(212,175,55,0.1))" }}/>
                    <Zap size={13} color="#D4AF37" />
                    <div style={{ flex:1, height:1, background:"linear-gradient(270deg,rgba(212,175,55,0.5),rgba(212,175,55,0.1))" }}/>
                  </div>

                  <form onSubmit={handleSendOtp} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div>
                      <label className="su-field-label">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => { setFullName(e.target.value); if (error) setError(""); }}
                        placeholder="Enter your full name"
                        className="su-input"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="su-field-label">Phone Number</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); if (error) setError(""); }}
                        placeholder="9876543210"
                        className="su-input"
                      />
                    </div>
                    {error && <div className="su-error">{error}</div>}
                    <button type="submit" className="su-btn" disabled={loading}>
                      {loading
                        ? <><span className="su-spinner" />Sending OTP…</>
                        : <span style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}><UserPlus size={14} /> Send OTP</span>
                      }
                    </button>
                  </form>
                </>
              ) : (
                /* ── STEP 2: OTP Verify ── */
                <>
                  <h2 style={{ fontFamily:"'Cinzel',serif", fontSize:"clamp(26px,3vw,34px)", fontWeight:900, color:"#0c1f5e", letterSpacing:-0.5, lineHeight:1 }}>
                    Verify<br />OTP
                  </h2>
                  <p style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:15, fontStyle:"italic", color:"#7a6a4a", marginTop:6 }}>
                    Code sent to {phone}
                  </p>

                  <div style={{ display:"flex", alignItems:"center", gap:10, margin:"22px 0" }}>
                    <div style={{ flex:1, height:1, background:"linear-gradient(90deg,rgba(212,175,55,0.5),rgba(212,175,55,0.1))" }}/>
                    <Zap size={13} color="#D4AF37" />
                    <div style={{ flex:1, height:1, background:"linear-gradient(270deg,rgba(212,175,55,0.5),rgba(212,175,55,0.1))" }}/>
                  </div>

                  {devOtp && (
                    <div className="su-dev-hint" style={{ marginBottom:14 }}>
                      🔑 OTP: <strong style={{ fontSize:18, letterSpacing:4 }}>{devOtp}</strong>
                    </div>
                  )}

                  <form onSubmit={handleVerifyOtp} style={{ display:"flex", flexDirection:"column", gap:14 }}>
                    <div>
                      <label className="su-field-label">6-Digit OTP</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={otp}
                        onChange={(e) => { const v = e.target.value.replace(/\D/g,"").slice(0,6); setOtp(v); if (error) setError(""); }}
                        placeholder="000000"
                        maxLength="6"
                        className="su-input"
                        style={{ textAlign:"center", fontSize:24, letterSpacing:8 }}
                        autoFocus
                      />
                    </div>
                    {error && <div className="su-error">{error}</div>}
                    <button type="submit" className="su-btn" disabled={loading}>
                      {loading ? <><span className="su-spinner" />Creating Account…</> : "Verify & Create Account"}
                    </button>
                    <button
                      type="button"
                      className="su-back-btn"
                      onClick={() => { setStep("details"); setOtp(""); setError(""); setDevOtp(null); }}
                      disabled={loading}
                    >
                      Back
                    </button>
                  </form>
                </>
              )}

              <p style={{ textAlign:"center", marginTop:16, fontSize:12, color:"#8a7a5a", fontFamily:"'Outfit',sans-serif" }}>
                Already registered?{" "}
                <Link
                  to="/login"
                  style={{ color:"#0c3caa", fontFamily:"'Cinzel',serif", fontSize:10.5, fontWeight:600, letterSpacing:1, textDecoration:"none", borderBottom:"1px solid transparent", transition:"border-color .2s" }}
                  onMouseEnter={(e) => e.target.style.borderBottomColor = "#D4AF37"}
                  onMouseLeave={(e) => e.target.style.borderBottomColor = "transparent"}
                >
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignupPage;
