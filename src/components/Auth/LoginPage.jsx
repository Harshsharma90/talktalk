// src/components/Auth/LoginPage.jsx
import { useState, useRef,useEffect  } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { signOut } from "firebase/auth";
import {
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [tab, setTab] = useState("phone"); 
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
const [resetEmail, setResetEmail] = useState("");
const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();
const recaptchaRef = useRef(null);

useEffect(() => {
  if (tab === "phone") {
    setTimeout(() => setupRecaptcha(), 500);
  }
}, [tab]);

const setupRecaptcha = () => {
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
    window.recaptchaVerifier = null;
  }
  window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
    size: "invisible",
    callback: () => {},
  });
};

const handlePhoneSubmit = async (e) => {
  e.preventDefault();
  const fullPhone = `+91${phone.replace(/\D/g, "")}`;
  if (fullPhone.length < 13) return toast.error("Enter a valid 10-digit number");
  if (!window.recaptchaVerifier) {
    return toast.error("Please complete the reCAPTCHA first");
  }
  setLoading(true);
  try {
    const confirmation = await signInWithPhoneNumber(auth, fullPhone, window.recaptchaVerifier);
    window.confirmationResult = confirmation;
    navigate("/otp", { state: { phone: fullPhone } });
  } catch (err) {
    console.error("Phone auth error:", err);
    toast.error(err.message || "Failed to send OTP");
    if (window.recaptchaVerifier) {
      window.recaptchaVerifier.clear();
      window.recaptchaVerifier = null;
    }
    setupRecaptcha();
  } finally {
    setLoading(false);
  }
};

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Fill all fields");
    setLoading(true);
    try {
      let userCredential;
 if (isSignUp) {
  userCredential = await createUserWithEmailAndPassword(auth, email, password);
  navigate("/setup");
  return;
} else {
  userCredential = await signInWithEmailAndPassword(auth, email, password);
}
const uid = userCredential.user.uid;
const snap = await getDoc(doc(db, "users", uid));
if (!snap.exists()) navigate("/setup");
    } catch (err) {
    const msg = err.code === "auth/user-not-found" ? "This email is not registered. Please sign up first."
  : err.code === "auth/wrong-password" ? "Incorrect password. Please try again."
  : err.code === "auth/invalid-credential" ? "Incorrect password. Please try again."
  : err.code === "auth/email-already-in-use" ? "This email is already registered. Please sign in instead."
  : err.code === "auth/invalid-email" ? "Please enter a valid email address."
  : err.code === "auth/too-many-requests" ? "Too many attempts. Please try again later."
  : "Something went wrong. Please try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
  e.preventDefault();
  if (!resetEmail.trim()) return toast.error("Enter your email address");
  setResetLoading(true);
  try {
    await sendPasswordResetEmail(auth, resetEmail.trim().toLowerCase());
    toast.success("Password reset email sent! Check your inbox.");
    setResetMode(false);
    setResetEmail("");
  } catch (err) {
    const msg = err.code === "auth/user-not-found"
      ? "No account found with this email"
      : err.code === "auth/invalid-email"
      ? "Enter a valid email address"
      : err.message;
    toast.error(msg);
  } finally {
    setResetLoading(false);
  }
};

const handleResendVerification = async () => {
  if (!email) return toast.error("Enter your email first");
  setLoading(true);
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      toast.success("Verification email resent! Check your inbox.");
    } else {
      toast.success("Your email is already verified. Please sign in.");
    }
  } catch (err) {
    toast.error("Could not resend. Check your email and password.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="auth-root">
      <div className="auth-card">
        <div className="auth-icon">💬</div>
        <h1 className="auth-title">Welcome to ChatApp chote</h1>
        <p className="auth-subtitle">Connect with friends instantly</p>

        <div className="tab-group">
          <button className={`tab-btn ${tab === "phone" ? "active" : ""}`} onClick={() => setTab("phone")}>
            📱 Phone
          </button>
          <button className={`tab-btn ${tab === "email" ? "active" : ""}`} onClick={() => setTab("email")}>
            ✉️ Email
          </button>
        </div>

        {tab === "phone" ? (
          <form onSubmit={handlePhoneSubmit}>
            <div className="field">
              <label>Mobile Number</label>
              <div className="input-group">
                <div className="prefix">🇮🇳 +91</div>
                <input
                  type="tel"
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
                  autoFocus
                />
              </div>
            </div>
            <div id="recaptcha-container" ref={recaptchaRef}></div>
            <button type="submit" className="btn" disabled={loading || phone.length !== 10}>
              {loading ? <span className="spinner" /> : "Send OTP →"}
            </button>
          </form>
      ) : (
          <>
            {resetMode ? (
              <form onSubmit={handleForgotPassword}>
                <div style={{ marginBottom: 20, padding: 12, background: "var(--bg-secondary)", borderRadius: 8, fontSize: 13, color: "var(--text-secondary)" }}>
                  Enter your email and we'll send you a link to reset your password.
                </div>
                <div className="field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    autoFocus
                  />
                </div>
                <button type="submit" className="btn" disabled={resetLoading}>
                  {resetLoading ? <span className="spinner" /> : "📧 Send Reset Link"}
                </button>
                <div className="divider">or</div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => { setResetMode(false); setResetEmail(""); }}
                >
                  ← Back to Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailSubmit}>
                <div className="field">
                  <label>Email Address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="field">
                  <label>Password</label>
                  <input
                    type="password"
                    placeholder={isSignUp ? "Create a password" : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
           {!isSignUp && (
  <div style={{ textAlign: "right", marginBottom: 12, marginTop: -8 }}>
    <button
      type="button"
      onClick={() => setResetMode(true)}
      style={{ background: "none", border: "none", color: "var(--accent)", fontSize: 13, cursor: "pointer", fontFamily: "var(--font)" }}
    >
      Forgot password?
    </button>
  </div>
)}
                <button type="submit" className="btn" disabled={loading}>
                  {loading ? <span className="spinner" /> : isSignUp ? "Create Account →" : "Sign In →"}
                </button>
                <div className="divider">or</div>
                <button type="button" className="btn btn-ghost" onClick={() => setIsSignUp(!isSignUp)}>
                  {isSignUp ? "Already have an account? Sign In" : "New here? Create Account"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
