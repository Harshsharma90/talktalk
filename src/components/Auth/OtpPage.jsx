// src/components/Auth/OtpPage.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from "../../firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

export default function OtpPage() {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const inputs = useRef([]);
  const navigate = useNavigate();
  const location = useLocation();
  const phone = location.state?.phone || "";

  useEffect(() => {
    if (!phone) navigate("/login");
    inputs.current[0]?.focus();
    const t = setInterval(() => setResendTimer((p) => (p > 0 ? p - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  const handleChange = (i, val) => {
    const v = val.replace(/\D/g, "").slice(0, 1);
    const arr = [...otp];
    arr[i] = v;
    setOtp(arr);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (paste.length === 6) {
      setOtp(paste.split(""));
      inputs.current[5]?.focus();
    }
  };

  const verifyOtp = async () => {
    const code = otp.join("");
    if (code.length !== 6) return toast.error("Enter all 6 digits");
    setLoading(true);
    try {
      const result = await window.confirmationResult.confirm(code);
      const uid = result.user.uid;
      const snap = await getDoc(doc(db, "users", uid));
      if (!snap.exists()) {
        await setDoc(doc(db, "users", uid), {
          uid,
          displayName: `User_${uid.slice(0, 5)}`,
          phoneNumber: phone,
          email: null,
          photoURL: null,
          status: "Hey there! I am using ChatApp",
          createdAt: serverTimestamp(),
          online: true,
        });
        navigate("/setup");
      }
    } catch (err) {
      toast.error("Invalid OTP. Please try again.");
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = () => {
    toast("Resend not implemented — go back and retry", { icon: "ℹ️" });
    setResendTimer(30);
  };

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-icon">🔐</div>
        <h1 className="auth-title">Verify OTP</h1>
        <p className="auth-subtitle">
          We sent a 6-digit code to <strong>{phone}</strong>
        </p>

        <div className="otp-inputs" onPaste={handlePaste}>
          {otp.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              type="text"
              inputMode="numeric"
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              maxLength={1}
            />
          ))}
        </div>

        <button className="btn" onClick={verifyOtp} disabled={loading || otp.join("").length !== 6}>
          {loading ? <span className="spinner" /> : "Verify & Continue →"}
        </button>

        <div className="resend-row">
          Didn't receive?{" "}
          <button className="resend-btn" onClick={handleResend} disabled={resendTimer > 0}>
            {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <button className="btn btn-ghost" onClick={() => navigate("/login")}>
            ← Change Number
          </button>
        </div>
      </div>
    </div>
  );
}
