import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, EyeOff, Crown } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import logo from "../../assets/Logo.jpeg";

/* ─── Particle Canvas ─── */
const ParticleCanvas = () => {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.6 + 0.3,
      vx: (Math.random() - 0.5) * 0.32,
      vy: (Math.random() - 0.5) * 0.32,
      alpha: Math.random() * 0.5 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,175,55,${p.alpha})`;
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(212,175,55,${0.07 * (1 - dist / 100)})`;
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
  const { signup } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "Admin",
  });

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!formData.fullName || !formData.email || !formData.password) {
      setError("Please fill all fields.");
      return;
    }
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    const result = signup(formData);
    setLoading(false);
    if (!result.success) { setError(result.message); return; }
    navigate("/login");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Outfit:wght@300;400;500;600&display=swap');

        .font-cinzel  { font-family: 'Cinzel', serif !important; }
        .font-cormorant { font-family: 'Cormorant Garamond', serif !important; }
        .font-outfit  { font-family: 'Outfit', sans-serif !important; }

        .su-input {
          transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
        }
        .su-input:focus {
          outline: none;
          border-color: #D4AF37 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(212,175,55,0.13), 0 4px 16px rgba(212,175,55,0.08) !important;
        }
        .su-input::placeholder { color: #b0a88a; font-weight: 300; }

        .su-select {
          appearance: none;
          cursor: pointer;
          transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
        }
        .su-select:focus {
          outline: none;
          border-color: #D4AF37 !important;
          background: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(212,175,55,0.13) !important;
        }

        .gold-btn {
          background: linear-gradient(135deg, #f0d060 0%, #D4AF37 45%, #b8922a 100%);
          box-shadow: 0 6px 30px rgba(212,175,55,0.4), 0 1px 0 rgba(255,255,255,0.3) inset;
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
          overflow: hidden;
        }
        .gold-btn::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%);
          border-radius: inherit;
          opacity: 0;
          transition: opacity 0.25s;
        }
        .gold-btn:hover:not(:disabled)::before { opacity: 1; }
        .gold-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 40px rgba(212,175,55,0.5), 0 1px 0 rgba(255,255,255,0.3) inset;
        }
        .gold-btn:active:not(:disabled) { transform: translateY(0); }
        .gold-btn:disabled { opacity: 0.8; cursor: not-allowed; }
        .gold-btn::after {
          content: '';
          position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          transform: skewX(-20deg);
          animation: shimmer 2.5s infinite;
        }
        @keyframes shimmer { 0% { left: -100%; } 60%, 100% { left: 150%; } }

        .crown-bg {
          position: absolute; top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 280px; height: 280px;
          opacity: 0.04; pointer-events: none;
        }

        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
        .shake { animation: shake 0.35s ease; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner { animation: spin 0.7s linear infinite; }

        .link-gold { position: relative; }
        .link-gold::after {
          content: ''; position: absolute; bottom: -1px; left: 0;
          width: 0; height: 1px; background: #D4AF37;
          transition: width 0.3s;
        }
        .link-gold:hover::after { width: 100%; }
      `}</style>

      {/* ROOT */}
      <div
        className="font-outfit w-screen h-screen overflow-hidden flex items-center justify-center relative"
        style={{ background: "#04102e" }}
      >
        {/* Grid */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(212,175,55,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.035) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 15% 50%, rgba(10,40,120,0.85) 0%, transparent 70%), radial-gradient(ellipse 50% 70% at 85% 30%, rgba(8,28,90,0.7) 0%, transparent 65%)",
          }}
        />
        <ParticleCanvas />

        {/* CARD */}
        <div
          className="relative z-10 flex w-full mx-4 overflow-hidden"
          style={{
            maxWidth: 980,
            height: "min(660px, calc(100vh - 40px))",
            borderRadius: 28,
            boxShadow:
              "0 0 0 1px rgba(212,175,55,0.18), 0 40px 120px rgba(0,0,8,0.7), inset 0 1px 0 rgba(212,175,55,0.12)",
            transform: mounted ? "translateY(0)" : "translateY(40px)",
            opacity: mounted ? 1 : 0,
            transition: "transform 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.9s ease",
          }}
        >
          {/* ── LEFT PANEL ── */}
          <div
            className="hidden lg:flex flex-col justify-between relative overflow-hidden flex-shrink-0"
            style={{
              width: "42%",
              background: "linear-gradient(145deg, #071540 0%, #0a2170 40%, #0b3398 100%)",
              padding: "34px 30px",
            }}
          >
            <ParticleCanvas />

            {/* Glow blob */}
            <div
              className="absolute pointer-events-none"
              style={{
                top: -80, right: -80, width: 280, height: 280, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)",
              }}
            />

            {/* Crown watermark */}
            <svg className="crown-bg" viewBox="0 0 200 200" fill="none">
              <path d="M100 20 L130 80 L180 50 L160 130 H40 L20 50 L70 80 Z" fill="#D4AF37"/>
              <rect x="40" y="135" width="120" height="12" rx="4" fill="#D4AF37"/>
              <circle cx="100" cy="20" r="8" fill="#D4AF37"/>
              <circle cx="180" cy="50" r="6" fill="#D4AF37"/>
              <circle cx="20" cy="50" r="6" fill="#D4AF37"/>
            </svg>

            {/* Brand */}
            <div className="relative z-10 flex items-center gap-3">
              <img
                src={logo} alt="GO Mobility"
                className="w-11 h-11 rounded-xl object-cover"
                style={{ border: "1.5px solid rgba(212,175,55,0.4)", boxShadow: "0 0 20px rgba(212,175,55,0.2)" }}
              />
              <div>
                <div className="font-cinzel text-white font-bold tracking-widest" style={{ fontSize: 17 }}>GO Mobility</div>
                <div className="font-cinzel text-[#D4AF37]" style={{ fontSize: 9, letterSpacing: 3 }}>Royal Command Centre</div>
              </div>
            </div>

            {/* Body */}
            <div className="relative z-10 flex-1 flex flex-col justify-center py-5">
              <div
                className="inline-flex items-center gap-2 font-outfit font-medium text-[#D4AF37] w-fit"
                style={{
                  background: "rgba(212,175,55,0.12)",
                  border: "1px solid rgba(212,175,55,0.25)",
                  borderRadius: 100, padding: "6px 14px",
                  fontSize: 10.5, letterSpacing: 1,
                }}
              >
                <ShieldCheck size={12} /> Admin Access Portal
              </div>

              <h1
                className="font-cinzel font-bold text-white mt-5 leading-snug"
                style={{ fontSize: "clamp(20px, 2.2vw, 28px)", letterSpacing: 0.5 }}
              >
                Create your<br />
                <span className="text-[#D4AF37]">royal blue</span><br />
                admin account
              </h1>

              <p
                className="font-cormorant italic mt-4 leading-relaxed"
                style={{ fontSize: 14.5, color: "rgba(255,255,255,0.58)", maxWidth: 260 }}
              >
                Signup is restricted to Admin and Super Admin accounts only. After successful registration, login to open the dashboard.
              </p>

              <div
                className="mt-5 rounded-full"
                style={{ width: 48, height: 2, background: "linear-gradient(90deg, #D4AF37, transparent)" }}
              />
            </div>

            {/* Demo box */}
            <div
              className="relative z-10 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(212,175,55,0.2)",
                padding: "14px 16px",
                backdropFilter: "blur(6px)",
              }}
            >
              <p className="font-cinzel font-semibold text-[#D4AF37] mb-2" style={{ fontSize: 9, letterSpacing: 2, textTransform: "uppercase" }}>
                ⬡ Allowed Demo Credentials
              </p>
              <p className="font-outfit text-white/60 mb-1" style={{ fontSize: 11, fontWeight: 300 }}>Admin · admin@gomobility.com / admin123</p>
              <p className="font-outfit text-white/60" style={{ fontSize: 11, fontWeight: 300 }}>Super Admin · superadmin@gomobility.com / super123</p>
            </div>
          </div>

          {/* ── RIGHT PANEL ── */}
          <div
            className="flex-1 flex items-center justify-center relative overflow-hidden"
            style={{
              background: "#f5f0e8",
              backgroundImage:
                "radial-gradient(ellipse at top right, rgba(212,175,55,0.08) 0%, transparent 50%), radial-gradient(ellipse at bottom left, rgba(10,30,100,0.06) 0%, transparent 55%)",
              padding: "32px 38px",
            }}
          >
            {/* Top gold line */}
            <div
              className="absolute top-0 left-0 w-full pointer-events-none"
              style={{ height: 3, background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent)" }}
            />

            {/* Corner ornament */}
            <svg className="absolute top-5 right-5 opacity-10 pointer-events-none" width="55" height="55" viewBox="0 0 60 60">
              <path d="M0 0 L60 0 L60 60" stroke="#D4AF37" strokeWidth="1.5" fill="none"/>
              <circle cx="60" cy="0" r="4" fill="#D4AF37"/>
            </svg>

            {/* Mobile brand */}
            <div className="lg:hidden absolute top-5 left-5 flex items-center gap-2">
              <img src={logo} alt="GO Mobility" className="w-9 h-9 rounded-xl object-cover" style={{ border: "1.5px solid rgba(212,175,55,0.4)" }}/>
              <div className="font-cinzel font-bold text-[#0c1f5e]" style={{ fontSize: 15, letterSpacing: 2 }}>GO Mobility</div>
            </div>

            <div className="w-full" style={{ maxWidth: 340 }}>

              {/* Heading */}
              <p className="font-cinzel text-[#8B6914] mb-2" style={{ fontSize: 9.5, letterSpacing: 3, textTransform: "uppercase" }}>
                ⬡ Admin Portal
              </p>
              <h2 className="font-cinzel font-black text-[#0c1f5e] leading-none" style={{ fontSize: "clamp(26px, 3vw, 34px)", letterSpacing: -0.5 }}>
                Sign Up
              </h2>
              <p className="font-cormorant italic text-[#7a6a4a] mt-1" style={{ fontSize: 14 }}>
                Register as Admin or Super Admin
              </p>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(212,175,55,0.5), rgba(212,175,55,0.1))" }}/>
                <Crown size={12} color="#D4AF37" />
                <div className="flex-1 h-px" style={{ background: "linear-gradient(270deg, rgba(212,175,55,0.5), rgba(212,175,55,0.1))" }}/>
              </div>

              {/* FORM */}
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">

                {/* Full Name */}
                <div>
                  <label className="font-cinzel font-semibold text-[#3d5096] block mb-1.5" style={{ fontSize: 9.5, letterSpacing: 2, textTransform: "uppercase" }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Enter full name"
                    className="su-input font-outfit w-full h-12 rounded-xl px-4 text-[#0c1f5e]"
                    style={{ fontSize: 13.5, background: "rgba(255,255,255,0.8)", border: "1.5px solid rgba(180,160,100,0.25)" }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="font-cinzel font-semibold text-[#3d5096] block mb-1.5" style={{ fontSize: 9.5, letterSpacing: 2, textTransform: "uppercase" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter official email"
                    className="su-input font-outfit w-full h-12 rounded-xl px-4 text-[#0c1f5e]"
                    style={{ fontSize: 13.5, background: "rgba(255,255,255,0.8)", border: "1.5px solid rgba(180,160,100,0.25)" }}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="font-cinzel font-semibold text-[#3d5096] block mb-1.5" style={{ fontSize: 9.5, letterSpacing: 2, textTransform: "uppercase" }}>
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter password"
                      className="su-input font-outfit w-full h-12 rounded-xl text-[#0c1f5e]"
                      style={{ fontSize: 13.5, background: "rgba(255,255,255,0.8)", border: "1.5px solid rgba(180,160,100,0.25)", paddingLeft: 16, paddingRight: 44 }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center text-[#9a8a6a] hover:text-[#D4AF37] transition-colors duration-200"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Role */}
                <div>
                  <label className="font-cinzel font-semibold text-[#3d5096] block mb-1.5" style={{ fontSize: 9.5, letterSpacing: 2, textTransform: "uppercase" }}>
                    Role
                  </label>
                  <div className="relative">
                    <select
                      name="role"
                      value={formData.role}
                      onChange={handleChange}
                      className="su-select su-input font-outfit w-full h-12 rounded-xl text-[#0c1f5e]"
                      style={{ fontSize: 13.5, background: "rgba(255,255,255,0.8)", border: "1.5px solid rgba(180,160,100,0.25)", paddingLeft: 16, paddingRight: 40 }}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Super Admin">Super Admin</option>
                    </select>
                    {/* Custom dropdown arrow */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#9a8a6a]">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="shake font-outfit font-medium text-red-700 rounded-xl px-4 py-2.5"
                    style={{ fontSize: 12, background: "rgba(200,30,30,0.07)", border: "1px solid rgba(200,30,30,0.2)" }}
                  >
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="gold-btn font-cinzel font-bold text-[#0a1840] w-full h-12 rounded-xl mt-1"
                  style={{ fontSize: 11, letterSpacing: "2.5px", textTransform: "uppercase" }}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="spinner w-4 h-4 flex-shrink-0" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="rgba(10,24,64,0.3)" strokeWidth="2"/>
                        <path d="M8 2a6 6 0 0 1 6 6" stroke="#0a1840" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      Creating Account…
                    </span>
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              {/* Login link */}
              <p className="font-outfit text-center text-[#8a7a5a] mt-4" style={{ fontSize: 12 }}>
                Already registered?{" "}
                <Link
                  to="/login"
                  className="link-gold font-cinzel font-semibold text-[#0c3caa]"
                  style={{ fontSize: 10.5, letterSpacing: 1 }}
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