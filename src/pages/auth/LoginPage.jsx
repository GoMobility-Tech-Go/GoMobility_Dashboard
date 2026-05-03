



import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Zap } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import logo from "../../assets/Logo.jpeg";

/* ─── Particle canvas background ─── */
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

    const COUNT = 60;
    const particles = Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.3,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.alpha})`;
        ctx.fill();
      });
      /* draw lines between close particles */
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
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
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
};

/* ─── Main Component ─── */
const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loginWithToken } = useAuth();
  const [step, setStep] = useState("signin"); // "signin" or "verify-otp"
  const [formData, setFormData] = useState({ phone: "", email: "", role: "passenger" });
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [tempAuth, setTempAuth] = useState(null); // Store temp auth data for OTP step

  useEffect(() => {
    setTimeout(() => setMounted(true), 80);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSigninSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validate phone or email
    if (!formData.phone && !formData.email) {
      setError("Please enter phone number or email.");
      return;
    }
    
    if (!formData.role) {
      setError("Please select a role.");
      return;
    }

    setLoading(true);
    try {
      // Call API to send OTP
      const payload = {
        ...(formData.phone && { phone: formData.phone }),
        ...(formData.email && { email: formData.email }),
        role: formData.role
      };
      
      const result = await api.signin(payload);
      
      // Store temp auth data for OTP verification
      setTempAuth({
        phone: formData.phone,
        email: formData.email,
        role: formData.role
      });
      
      // Move to OTP verification step
      setStep("verify-otp");
      setOtp("");
      setError("");
    } catch (err) {
      setError(err.message || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!otp) {
      setError("Please enter OTP.");
      return;
    }

    if (otp.length !== 6) {
      setError("OTP must be 6 digits.");
      return;
    }

    setLoading(true);
    try {
      // Call API to verify OTP
      const payload = {
        ...(tempAuth.phone && { phone: tempAuth.phone }),
        ...(tempAuth.email && { email: tempAuth.email }),
        otp: otp,
        role: tempAuth.role
      };
      
      const result = await api.verifySignin(payload);

      // support both result.data and top-level shape
      const data = result.data || result;
      const accessToken = data.accessToken || data.token || data.access_token;
      const refreshToken = data.refreshToken || data.refresh_token;
      const apiUser = data.user || data;

      if (!accessToken || !apiUser) {
        throw new Error('Invalid response from server');
      }

      const loginResult = loginWithToken({ accessToken, refreshToken, user: apiUser });
      if (!loginResult.success) {
        setError(loginResult.message || 'Login failed');
        return;
      }
      navigate("/");
    } catch (err) {
      setError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignin = () => {
    setStep("signin");
    setOtp("");
    setTempAuth(null);
    setError("");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Outfit:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .login-root {
          font-family: 'Outfit', sans-serif;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #04102e;
          position: relative;
        }

        /* Radial ambient glow */
        .login-root::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 60% at 15% 50%, rgba(10,40,120,0.85) 0%, transparent 70%),
            radial-gradient(ellipse 50% 70% at 85% 30%, rgba(8,28,90,0.7) 0%, transparent 65%),
            radial-gradient(ellipse 60% 50% at 50% 100%, rgba(212,175,55,0.06) 0%, transparent 60%);
          pointer-events: none;
          z-index: 0;
        }

        /* Subtle grid lines */
        .login-root::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(212,175,55,0.04) 1px, transparent 1px),
            linear-gradient(90deg, rgba(212,175,55,0.04) 1px, transparent 1px);
          background-size: 60px 60px;
          pointer-events: none;
          z-index: 0;
        }

        .card-wrapper {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: 980px;
          height: min(640px, calc(100vh - 40px));
          display: flex;
          border-radius: 28px;
          overflow: hidden;
          box-shadow:
            0 0 0 1px rgba(212,175,55,0.18),
            0 40px 120px rgba(0,0,8,0.7),
            0 0 80px rgba(10,30,100,0.5),
            inset 0 1px 0 rgba(212,175,55,0.12);
          transform: translateY(${mounted ? "0" : "40px"});
          opacity: ${mounted ? "1" : "0"};
          transition: transform 0.9s cubic-bezier(0.22,1,0.36,1), opacity 0.9s ease;
          margin: 0 16px;
        }

        /* ── LEFT PANEL ── */
        .left-panel {
          position: relative;
          width: 44%;
          flex-shrink: 0;
          background: linear-gradient(145deg, #071540 0%, #0a2170 40%, #0b3398 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 36px 32px;
          overflow: hidden;
        }

        .left-panel::before {
          content: '';
          position: absolute;
          top: -80px; right: -80px;
          width: 280px; height: 280px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .left-panel::after {
          content: '';
          position: absolute;
          bottom: -100px; left: -60px;
          width: 320px; height: 320px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(10,50,180,0.4) 0%, transparent 65%);
          pointer-events: none;
        }

        /* floating crown decorative SVG */
        .crown-bg {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%,-50%);
          width: 320px; height: 320px;
          opacity: 0.04;
          pointer-events: none;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          position: relative;
          z-index: 1;
        }

        .brand-logo {
          width: 46px; height: 46px;
          border-radius: 12px;
          object-fit: cover;
          border: 1.5px solid rgba(212,175,55,0.4);
          box-shadow: 0 0 20px rgba(212,175,55,0.2);
        }

        .brand-name {
          font-family: 'Cinzel', serif;
          font-size: 18px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 2px;
        }

        .brand-sub {
          font-family: 'Cinzel', serif;
          font-size: 11px;
          color: #D4AF37;
          letter-spacing: 3px;
          margin-top: 2px;
        }

        .left-body {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 24px 0;
        }

        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(212,175,55,0.12);
          border: 1px solid rgba(212,175,55,0.25);
          border-radius: 100px;
          padding: 6px 14px;
          font-size: 11px;
          color: #D4AF37;
          letter-spacing: 1px;
          width: fit-content;
          font-family: 'Outfit', sans-serif;
          font-weight: 500;
        }

        .left-heading {
          font-family: 'Cinzel', serif;
          font-size: clamp(22px, 2.4vw, 30px);
          font-weight: 700;
          color: #fff;
          line-height: 1.25;
          margin-top: 20px;
          letter-spacing: 0.5px;
        }

        .left-heading span {
          color: #D4AF37;
        }

        .left-desc {
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px;
          font-style: italic;
          color: rgba(255,255,255,0.6);
          line-height: 1.8;
          margin-top: 16px;
          max-width: 280px;
        }

        .divider-gold {
          width: 48px;
          height: 2px;
          background: linear-gradient(90deg, #D4AF37, transparent);
          margin-top: 20px;
          border-radius: 2px;
        }

        .demo-box {
          position: relative;
          z-index: 1;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(212,175,55,0.2);
          border-radius: 16px;
          padding: 16px 18px;
          backdrop-filter: blur(6px);
        }

        .demo-label {
          font-size: 10px;
          letter-spacing: 2px;
          color: #D4AF37;
          font-family: 'Cinzel', serif;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .demo-row {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .demo-cred {
          font-size: 11.5px;
          color: rgba(255,255,255,0.65);
          font-family: 'Outfit', sans-serif;
          font-weight: 300;
          letter-spacing: 0.2px;
        }

        /* ── RIGHT PANEL ── */
        .right-panel {
          flex: 1;
          background: #f5f0e8;
          background-image:
            radial-gradient(ellipse at top right, rgba(212,175,55,0.08) 0%, transparent 50%),
            radial-gradient(ellipse at bottom left, rgba(10,30,100,0.06) 0%, transparent 55%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 36px 40px;
          position: relative;
          overflow: hidden;
        }

        .right-panel::before {
          content: '';
          position: absolute;
          top: -1px; left: 0;
          width: 100%; height: 3px;
          background: linear-gradient(90deg, transparent, rgba(212,175,55,0.6), transparent);
        }

        /* Corner ornament */
        .corner-ornament {
          position: absolute;
          top: 20px; right: 20px;
          width: 60px; height: 60px;
          opacity: 0.12;
          pointer-events: none;
        }

        .form-container {
          width: 100%;
          max-width: 360px;
        }

        .form-tagline {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 3px;
          color: #8B6914;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .form-title {
          font-family: 'Cinzel', serif;
          font-size: clamp(26px, 3vw, 34px);
          font-weight: 900;
          color: #0c1f5e;
          letter-spacing: -0.5px;
          line-height: 1;
        }

        .form-subtitle {
          font-family: 'Cormorant Garamond', serif;
          font-size: 15px;
          font-style: italic;
          color: #7a6a4a;
          margin-top: 6px;
        }

        .form-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          margin: 22px 0;
        }

        .form-divider-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(212,175,55,0.5), rgba(212,175,55,0.1));
        }

        .form-divider-icon {
          color: #D4AF37;
          font-size: 14px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .field-label {
          font-family: 'Cinzel', serif;
          font-size: 10px;
          letter-spacing: 2px;
          color: #3d5096;
          font-weight: 600;
          display: block;
          margin-bottom: 7px;
          text-transform: uppercase;
        }

        .input-wrap {
          position: relative;
        }

        .input-field {
          width: 100%;
          height: 50px;
          background: rgba(255,255,255,0.8);
          border: 1.5px solid rgba(180,160,100,0.25);
          border-radius: 12px;
          padding: 0 44px 0 16px;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          color: #0c1f5e;
          outline: none;
          transition: border-color 0.25s, box-shadow 0.25s, background 0.25s;
          backdrop-filter: blur(4px);
        }

        .input-field::placeholder {
          color: #b0a88a;
          font-weight: 300;
        }

        .input-field:focus {
          border-color: #D4AF37;
          background: #fff;
          box-shadow:
            0 0 0 3px rgba(212,175,55,0.12),
            0 4px 16px rgba(212,175,55,0.08);
        }

        .error-box {
          background: rgba(200,30,30,0.07);
          border: 1px solid rgba(200,30,30,0.2);
          border-radius: 10px;
          padding: 10px 14px;
          font-size: 12.5px;
          color: #c01818;
          font-family: 'Outfit', sans-serif;
          font-weight: 500;
          animation: shake 0.35s ease;
        }

        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }

        .submit-btn {
          width: 100%;
          height: 52px;
          border-radius: 13px;
          border: none;
          cursor: pointer;
          font-family: 'Cinzel', serif;
          font-size: 13px;
          font-weight: 700;
          letter-spacing: 2.5px;
          text-transform: uppercase;
          color: #0a1840;
          background: linear-gradient(135deg, #f0d060 0%, #D4AF37 45%, #b8922a 100%);
          box-shadow:
            0 6px 30px rgba(212,175,55,0.4),
            0 1px 0 rgba(255,255,255,0.3) inset;
          position: relative;
          overflow: hidden;
          transition: transform 0.2s, box-shadow 0.2s;
          margin-top: 6px;
        }

        .submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 60%);
          border-radius: inherit;
          opacity: 0;
          transition: opacity 0.25s;
        }

        .submit-btn:hover:not(:disabled)::before {
          opacity: 1;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 12px 40px rgba(212,175,55,0.5),
            0 1px 0 rgba(255,255,255,0.3) inset;
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.8;
          cursor: not-allowed;
        }

        /* Ripple shimmer on btn */
        .submit-btn::after {
          content: '';
          position: absolute;
          top: 0; left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          transform: skewX(-20deg);
          animation: shimmer 2.5s infinite;
        }

        @keyframes shimmer {
          0% { left: -100%; }
          60%,100% { left: 150%; }
        }

        /* Loading spinner inside button */
        .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(10,24,64,0.3);
          border-top-color: #0a1840;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .signup-link {
          text-align: center;
          font-family: 'Outfit', sans-serif;
          font-size: 12.5px;
          color: #8a7a5a;
          margin-top: 18px;
        }

        .signup-link a {
          color: #0c3caa;
          font-weight: 600;
          text-decoration: none;
          position: relative;
          font-family: 'Cinzel', serif;
          font-size: 11px;
          letter-spacing: 1px;
        }

        .signup-link a::after {
          content: '';
          position: absolute;
          bottom: -1px; left: 0;
          width: 0; height: 1px;
          background: #D4AF37;
          transition: width 0.3s;
        }

        .signup-link a:hover::after {
          width: 100%;
        }

        /* ── MOBILE ── */
        @media (max-width: 680px) {
          .left-panel { display: none !important; }
          .right-panel { padding: 32px 24px; }
          .card-wrapper { max-width: 420px; height: auto; min-height: 0; }
        }
      `}</style>

      <div className="login-root">
        <ParticleCanvas />

        <div className="card-wrapper">
          {/* LEFT */}
          <div className="left-panel">
            <ParticleCanvas />

            <div className="brand">
              <img src={logo} alt="GO Mobility" className="brand-logo" />
              <div>
                <div className="brand-name">GO Mobility</div>
                <div className="brand-sub">Royal Command Centre</div>
              </div>
            </div>

            {/* Decorative crown SVG */}
            <svg className="crown-bg" viewBox="0 0 200 200" fill="none">
              <path d="M100 20 L130 80 L180 50 L160 130 H40 L20 50 L70 80 Z" fill="#D4AF37"/>
              <rect x="40" y="135" width="120" height="12" rx="4" fill="#D4AF37"/>
              <circle cx="100" cy="20" r="8" fill="#D4AF37"/>
              <circle cx="180" cy="50" r="6" fill="#D4AF37"/>
              <circle cx="20" cy="50" r="6" fill="#D4AF37"/>
            </svg>

            <div className="left-body">
              <div className="badge">
                <ShieldCheck size={12} />
                Secure Royal Access Portal
              </div>
              <h1 className="left-heading">
                Your Kingdom<br />
                <span>Awaits</span><br />
                Command
              </h1>
              <p className="left-desc">
                Only Administrators & Super Admins may enter. Every action within is logged, protected, and royal.
              </p>
              <div className="divider-gold" />
            </div>

            <div className="demo-box">
              <div className="demo-label">⬡ Demo Credentials</div>
              <div className="demo-row">
                <div className="demo-cred">Admin · admin@gomobility.com / admin123</div>
                <div className="demo-cred">Super Admin · superadmin@gomobility.com / super123</div>
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="right-panel">
            {/* Corner ornament */}
            <svg className="corner-ornament" viewBox="0 0 60 60">
              <path d="M0 0 L60 0 L60 60" stroke="#D4AF37" strokeWidth="1.5" fill="none"/>
              <circle cx="60" cy="0" r="4" fill="#D4AF37"/>
            </svg>

            <div className="form-container">
              <div className="form-tagline">⬡ Admin Portal</div>
              
              {step === "signin" ? (
                <>
                  <h2 className="form-title">Welcome<br/>Back</h2>
                  <p className="form-subtitle">Sign in with phone or email</p>

                  <div className="form-divider">
                    <div className="form-divider-line" />
                    <Zap size={13} color="#D4AF37" />
                    <div className="form-divider-line" style={{ background: 'linear-gradient(270deg, rgba(212,175,55,0.5), rgba(212,175,55,0.1))' }} />
                  </div>

                  <form onSubmit={handleSigninSubmit}>
                    <div className="field-group">
                      <div>
                        <label className="field-label">Phone Number</label>
                        <div className="input-wrap">
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="+91 9876543210"
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div style={{ textAlign: 'center', color: '#8a7a5a', fontSize: '12px', letterSpacing: '1px' }}>
                        — OR —
                      </div>

                      <div>
                        <label className="field-label">Email Address</label>
                        <div className="input-wrap">
                          <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="official@gomobility.com"
                            className="input-field"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="field-label">Role</label>
                        <div className="input-wrap">
                          <select
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="input-field"
                            style={{ cursor: 'pointer', appearance: 'none', paddingRight: '40px' }}
                          >
                            <option value="passenger">Passenger</option>
                            <option value="driver">Driver</option>
                            <option value="admin">Admin</option>
                          </select>
                          <div style={{
                            position: 'absolute',
                            right: '14px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            color: '#D4AF37',
                            fontSize: '12px'
                          }}>▼</div>
                        </div>
                      </div>

                      {error && <div className="error-box">{error}</div>}

                      <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                      >
                        {loading ? (
                          <><span className="spinner" />Sending OTP…</>
                        ) : (
                          "Send OTP"
                        )}
                      </button>
                    </div>
                  </form>

                  <p className="signup-link">
                    Need access?{" "}
                    <Link to="/signup">Request Access</Link>
                  </p>
                </>
              ) : (
                <>
                  <h2 className="form-title">Verify<br/>OTP</h2>
                  <p className="form-subtitle">Enter the code sent to {tempAuth?.phone || tempAuth?.email}</p>

                  <div className="form-divider">
                    <div className="form-divider-line" />
                    <Zap size={13} color="#D4AF37" />
                    <div className="form-divider-line" style={{ background: 'linear-gradient(270deg, rgba(212,175,55,0.5), rgba(212,175,55,0.1))' }} />
                  </div>

                  <form onSubmit={handleVerifyOtpSubmit}>
                    <div className="field-group">
                      <div>
                        <label className="field-label">6-Digit OTP</label>
                        <div className="input-wrap">
                          <input
                            type="text"
                            value={otp}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                              setOtp(val);
                              if (error) setError("");
                            }}
                            placeholder="000000"
                            maxLength="6"
                            className="input-field"
                            style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
                          />
                        </div>
                      </div>

                      {error && <div className="error-box">{error}</div>}

                      <button
                        type="submit"
                        className="submit-btn"
                        disabled={loading}
                      >
                        {loading ? (
                          <><span className="spinner" />Verifying…</>
                        ) : (
                          "Verify & Login"
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleBackToSignin}
                        className="submit-btn"
                        style={{
                          marginTop: '8px',
                          background: 'rgba(212,175,55,0.1)',
                          color: '#D4AF37',
                          border: '1px solid rgba(212,175,55,0.3)'
                        }}
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