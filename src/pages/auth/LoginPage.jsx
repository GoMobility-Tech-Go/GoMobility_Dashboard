import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { sendOtp, verifyOtp } from "../../api/auth";
import logo from "../../assets/Logo.jpeg";

/* ─── Particle canvas background ─── */
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

/* ─── Main Component ─── */
const LoginPage = () => {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [step, setStep] = useState("signin");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState("admin");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [devOtp, setDevOtp] = useState(null);

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!phone.trim()) { setError("Please enter your phone number."); return; }
    setLoading(true);
    try {
      const res = await sendOtp(phone.trim(), role);
      const data = res.data?.data || res.data || {};
      if (data.otp) setDevOtp(data.otp); // show OTP hint when SMS not configured
      setStep("verify-otp");
      setOtp("");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to send OTP.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp) { setError("Please enter OTP."); return; }
    if (otp.length !== 6) { setError("OTP must be 6 digits."); return; }
    setLoading(true);
    try {
      const res = await verifyOtp(phone.trim(), otp, role);
      const data = res.data?.data || res.data || {};
      const accessToken = data.accessToken || data.token || data.access_token;
      const refreshToken = data.refreshToken || data.refresh_token;
      const apiUser = data.user || {};

      if (!accessToken) throw new Error("Invalid response from server.");
      if (apiUser.role && !["admin", "Admin", "super_admin", "Super Admin"].includes(apiUser.role)) {
        throw new Error("Access denied. Admin accounts only.");
      }

      const result = loginWithToken({ accessToken, refreshToken, user: apiUser });
      if (!result.success) { setError(result.message || "Login failed."); return; }
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "OTP verification failed.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Outfit:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .login-root { font-family:'Outfit',sans-serif; width:100vw; height:100vh; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#04102e; position:relative; }
        .login-root::before { content:''; position:absolute; inset:0; background: radial-gradient(ellipse 70% 60% at 15% 50%,rgba(10,40,120,0.85) 0%,transparent 70%), radial-gradient(ellipse 50% 70% at 85% 30%,rgba(8,28,90,0.7) 0%,transparent 65%), radial-gradient(ellipse 60% 50% at 50% 100%,rgba(212,175,55,0.06) 0%,transparent 60%); pointer-events:none; z-index:0; }
        .login-root::after { content:''; position:absolute; inset:0; background-image:linear-gradient(rgba(212,175,55,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(212,175,55,0.04) 1px,transparent 1px); background-size:60px 60px; pointer-events:none; z-index:0; }
        .card-wrapper { position:relative; z-index:2; width:100%; max-width:980px; height:min(620px,calc(100vh - 40px)); display:flex; border-radius:28px; overflow:hidden; box-shadow:0 0 0 1px rgba(212,175,55,0.18),0 40px 120px rgba(0,0,8,0.7),0 0 80px rgba(10,30,100,0.5),inset 0 1px 0 rgba(212,175,55,0.12); transform:translateY(${mounted?"0":"40px"}); opacity:${mounted?"1":"0"}; transition:transform 0.9s cubic-bezier(0.22,1,0.36,1),opacity 0.9s ease; margin:0 16px; }
        .left-panel { position:relative; width:44%; flex-shrink:0; background:linear-gradient(145deg,#071540 0%,#0a2170 40%,#0b3398 100%); display:flex; flex-direction:column; justify-content:space-between; padding:36px 32px; overflow:hidden; }
        .left-panel::before { content:''; position:absolute; top:-80px; right:-80px; width:280px; height:280px; border-radius:50%; background:radial-gradient(circle,rgba(212,175,55,0.12) 0%,transparent 70%); pointer-events:none; }
        .crown-bg { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:320px; height:320px; opacity:0.04; pointer-events:none; }
        .brand { display:flex; align-items:center; gap:12px; position:relative; z-index:1; }
        .brand-logo { width:46px; height:46px; border-radius:12px; object-fit:cover; border:1.5px solid rgba(212,175,55,0.4); box-shadow:0 0 20px rgba(212,175,55,0.2); }
        .brand-name { font-family:'Cinzel',serif; font-size:18px; font-weight:700; color:#fff; letter-spacing:2px; }
        .brand-sub { font-family:'Cinzel',serif; font-size:11px; color:#D4AF37; letter-spacing:3px; margin-top:2px; }
        .left-body { position:relative; z-index:1; flex:1; display:flex; flex-direction:column; justify-content:center; padding:24px 0; }
        .badge { display:inline-flex; align-items:center; gap:6px; background:rgba(212,175,55,0.12); border:1px solid rgba(212,175,55,0.25); border-radius:100px; padding:6px 14px; font-size:11px; color:#D4AF37; letter-spacing:1px; width:fit-content; font-family:'Outfit',sans-serif; font-weight:500; }
        .left-heading { font-family:'Cinzel',serif; font-size:clamp(22px,2.4vw,30px); font-weight:700; color:#fff; line-height:1.25; margin-top:20px; }
        .left-heading span { color:#D4AF37; }
        .left-desc { font-family:'Cormorant Garamond',serif; font-size:15px; font-style:italic; color:rgba(255,255,255,0.6); line-height:1.8; margin-top:16px; max-width:280px; }
        .divider-gold { width:48px; height:2px; background:linear-gradient(90deg,#D4AF37,transparent); margin-top:20px; border-radius:2px; }
        .right-panel { flex:1; background:#f5f0e8; background-image:radial-gradient(ellipse at top right,rgba(212,175,55,0.08) 0%,transparent 50%),radial-gradient(ellipse at bottom left,rgba(10,30,100,0.06) 0%,transparent 55%); display:flex; align-items:center; justify-content:center; padding:36px 40px; position:relative; overflow:hidden; }
        .right-panel::before { content:''; position:absolute; top:-1px; left:0; width:100%; height:3px; background:linear-gradient(90deg,transparent,rgba(212,175,55,0.6),transparent); }
        .form-container { width:100%; max-width:360px; }
        .form-tagline { font-family:'Cinzel',serif; font-size:10px; letter-spacing:3px; color:#8B6914; text-transform:uppercase; margin-bottom:10px; }
        .form-title { font-family:'Cinzel',serif; font-size:clamp(26px,3vw,34px); font-weight:900; color:#0c1f5e; letter-spacing:-0.5px; line-height:1; }
        .form-subtitle { font-family:'Cormorant Garamond',serif; font-size:15px; font-style:italic; color:#7a6a4a; margin-top:6px; }
        .form-divider { display:flex; align-items:center; gap:10px; margin:22px 0; }
        .form-divider-line { flex:1; height:1px; background:linear-gradient(90deg,rgba(212,175,55,0.5),rgba(212,175,55,0.1)); }
        .field-group { display:flex; flex-direction:column; gap:14px; }
        .field-label { font-family:'Cinzel',serif; font-size:10px; letter-spacing:2px; color:#3d5096; font-weight:600; display:block; margin-bottom:7px; text-transform:uppercase; }
        .input-field { width:100%; height:50px; background:rgba(255,255,255,0.8); border:1.5px solid rgba(180,160,100,0.25); border-radius:12px; padding:0 16px; font-family:'Outfit',sans-serif; font-size:14px; color:#0c1f5e; outline:none; transition:border-color .25s,box-shadow .25s,background .25s; }
        .input-field::placeholder { color:#b0a88a; font-weight:300; }
        .input-field:focus { border-color:#D4AF37; background:#fff; box-shadow:0 0 0 3px rgba(212,175,55,0.12),0 4px 16px rgba(212,175,55,0.08); }
        .error-box { background:rgba(200,30,30,0.07); border:1px solid rgba(200,30,30,0.2); border-radius:10px; padding:10px 14px; font-size:12.5px; color:#c01818; font-family:'Outfit',sans-serif; font-weight:500; animation:shake .35s ease; }
        .dev-otp-hint { background:rgba(212,175,55,0.1); border:1px solid rgba(212,175,55,0.35); border-radius:10px; padding:10px 14px; font-size:12.5px; color:#7a5f10; font-family:'Outfit',sans-serif; text-align:center; margin-bottom:10px; }
        @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
        .submit-btn { width:100%; height:52px; border-radius:13px; border:none; cursor:pointer; font-family:'Cinzel',serif; font-size:13px; font-weight:700; letter-spacing:2.5px; text-transform:uppercase; color:#0a1840; background:linear-gradient(135deg,#f0d060 0%,#D4AF37 45%,#b8922a 100%); box-shadow:0 6px 30px rgba(212,175,55,0.4),0 1px 0 rgba(255,255,255,0.3) inset; position:relative; overflow:hidden; transition:transform .2s,box-shadow .2s; margin-top:6px; }
        .submit-btn:hover:not(:disabled) { transform:translateY(-2px); box-shadow:0 12px 40px rgba(212,175,55,0.5),0 1px 0 rgba(255,255,255,0.3) inset; }
        .submit-btn:disabled { opacity:.8; cursor:not-allowed; }
        .submit-btn::after { content:''; position:absolute; top:0; left:-100%; width:60%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.25),transparent); transform:skewX(-20deg); animation:shimmer 2.5s infinite; }
        @keyframes shimmer { 0%{left:-100%} 60%,100%{left:150%} }
        .back-btn { width:100%; height:48px; border-radius:13px; border:1px solid rgba(212,175,55,0.3); cursor:pointer; font-family:'Cinzel',serif; font-size:12px; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#D4AF37; background:rgba(212,175,55,0.08); transition:all .2s; margin-top:8px; }
        .back-btn:hover:not(:disabled) { background:rgba(212,175,55,0.15); }
        .spinner { display:inline-block; width:16px; height:16px; border:2px solid rgba(10,24,64,0.3); border-top-color:#0a1840; border-radius:50%; animation:spin .7s linear infinite; vertical-align:middle; margin-right:8px; }
        @keyframes spin { to{transform:rotate(360deg)} }
        @media(max-width:680px){ .left-panel{display:none!important} .right-panel{padding:32px 24px} .card-wrapper{max-width:420px;height:auto;min-height:0} }
      `}</style>

      <div className="login-root">
        <ParticleCanvas />
        <div className="card-wrapper">
          {/* LEFT */}
          <div className="left-panel">
            <ParticleCanvas />
            <svg className="crown-bg" viewBox="0 0 200 200" fill="none">
              <path d="M100 20 L130 80 L180 50 L160 130 H40 L20 50 L70 80 Z" fill="#D4AF37"/>
              <rect x="40" y="135" width="120" height="12" rx="4" fill="#D4AF37"/>
              <circle cx="100" cy="20" r="8" fill="#D4AF37"/>
              <circle cx="180" cy="50" r="6" fill="#D4AF37"/>
              <circle cx="20" cy="50" r="6" fill="#D4AF37"/>
            </svg>
            <div className="brand">
              <img src={logo} alt="GO Mobility" className="brand-logo" />
              <div>
                <div className="brand-name">GO Mobility</div>
                <div className="brand-sub">Royal Command Centre</div>
              </div>
            </div>
            <div className="left-body">
              <div className="badge"><ShieldCheck size={12} /> Secure Admin Portal</div>
              <h1 className="left-heading">Your Kingdom<br /><span>Awaits</span><br />Command</h1>
              <p className="left-desc">Only Administrators may enter. Every action within is logged, protected, and royal.</p>
              <div className="divider-gold" />
            </div>
            <div style={{ position:"relative", zIndex:1, background:"rgba(255,255,255,0.04)", border:"1px solid rgba(212,175,55,0.2)", borderRadius:16, padding:"16px 18px", backdropFilter:"blur(6px)" }}>
              <div style={{ fontSize:10, letterSpacing:"2px", color:"#D4AF37", fontFamily:"'Cinzel',serif", fontWeight:600, marginBottom:8 }}>⬡ OTP Login</div>
              <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.65)", fontFamily:"'Outfit',sans-serif", fontWeight:300 }}>Enter your registered admin phone number to receive OTP via SMS</div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="right-panel">
            <svg style={{ position:"absolute", top:20, right:20, width:60, height:60, opacity:0.12 }} viewBox="0 0 60 60">
              <path d="M0 0 L60 0 L60 60" stroke="#D4AF37" strokeWidth="1.5" fill="none"/>
              <circle cx="60" cy="0" r="4" fill="#D4AF37"/>
            </svg>

            <div className="form-container">
              <div className="form-tagline">⬡ Admin Portal</div>

              {step === "signin" ? (
                <>
                  <h2 className="form-title">Welcome<br />Back</h2>
                  <p className="form-subtitle">Sign in with your admin phone number</p>
                  <div className="form-divider">
                    <div className="form-divider-line" />
                    <Zap size={13} color="#D4AF37" />
                    <div className="form-divider-line" style={{ background:"linear-gradient(270deg,rgba(212,175,55,0.5),rgba(212,175,55,0.1))" }} />
                  </div>
                  <form onSubmit={handleSendOtp}>
                    <div className="field-group">
                      <div>
                        <label className="field-label">Login As</label>
                        <div style={{ display:"flex", gap:8, marginTop:4 }}>
                          {[{val:"admin",label:"Admin"},{val:"super_admin",label:"Super Admin 👑"}].map(opt => (
                            <button key={opt.val} type="button" onClick={() => setRole(opt.val)}
                              style={{ flex:1, padding:"11px 0", borderRadius:10, border:"1.5px solid", cursor:"pointer", fontSize:12, fontFamily:"'Cinzel',serif", fontWeight:600, letterSpacing:"0.5px", transition:"all .2s",
                                borderColor: role===opt.val ? "#D4AF37" : "rgba(180,160,100,0.25)",
                                background:  role===opt.val ? "rgba(212,175,55,0.12)" : "rgba(255,255,255,0.5)",
                                color:       role===opt.val ? "#8B6914" : "#7a6a4a" }}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="field-label">Phone Number</label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => { setPhone(e.target.value); if (error) setError(""); }}
                          placeholder="+91 9876543210"
                          className="input-field"
                          autoFocus
                        />
                      </div>
                      {error && <div className="error-box">{error}</div>}
                      <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? <><span className="spinner" />Sending OTP…</> : "Send OTP"}
                      </button>
                    </div>
                  </form>
                  <p style={{ textAlign:"center", marginTop:16, fontSize:12, color:"#8a7a5a", fontFamily:"'Outfit',sans-serif" }}>
                    New admin?{" "}
                    <Link to="/signup" style={{ color:"#0c3caa", fontFamily:"'Cinzel',serif", fontSize:10.5, fontWeight:600, letterSpacing:1, textDecoration:"none", borderBottom:"1px solid transparent", transition:"border-color .2s" }}
                      onMouseEnter={(e)=>e.target.style.borderBottomColor="#D4AF37"}
                      onMouseLeave={(e)=>e.target.style.borderBottomColor="transparent"}
                    >
                      Create Account
                    </Link>
                  </p>
                </>
              ) : (
                <>
                  <h2 className="form-title">Verify<br />OTP</h2>
                  <p className="form-subtitle">Enter the 6-digit code sent to {phone}</p>
                  <div className="form-divider">
                    <div className="form-divider-line" />
                    <Zap size={13} color="#D4AF37" />
                    <div className="form-divider-line" style={{ background:"linear-gradient(270deg,rgba(212,175,55,0.5),rgba(212,175,55,0.1))" }} />
                  </div>
                  <form onSubmit={handleVerifyOtp}>
                    <div className="field-group">
                      {devOtp && (
                        <div className="dev-otp-hint">🔑 OTP: <strong style={{ fontSize:18, letterSpacing:4 }}>{devOtp}</strong></div>
                      )}
                      <div>
                        <label className="field-label">6-Digit OTP</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={otp}
                          onChange={(e) => { const v = e.target.value.replace(/\D/g,"").slice(0,6); setOtp(v); if (error) setError(""); }}
                          placeholder="000000"
                          maxLength="6"
                          className="input-field"
                          style={{ textAlign:"center", fontSize:24, letterSpacing:8 }}
                          autoFocus
                        />
                      </div>
                      {error && <div className="error-box">{error}</div>}
                      <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? <><span className="spinner" />Verifying…</> : "Verify & Login"}
                      </button>
                      <button
                        type="button"
                        className="back-btn"
                        onClick={() => { setStep("signin"); setOtp(""); setError(""); setDevOtp(null); }}
                        disabled={loading}
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;
