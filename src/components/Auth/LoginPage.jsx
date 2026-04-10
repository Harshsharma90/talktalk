// src/components/Auth/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase";
import { signOut } from "firebase/auth";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [tab, setTab] = useState("phone"); 
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
const [resetEmail, setResetEmail] = useState("");
const [resetLoading, setResetLoading] = useState(false);

  const navigate = useNavigate();
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
    await sendPasswordResetEmail(auth, resetEmail.trim().toLowerCase(), {
  url: "https://batcheed2.vercel.app/login",
  handleCodeInApp: false,
});
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

const handleGoogleLogin = async () => {
  setLoading(true);
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const uid = result.user.uid;
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) {
      await setDoc(doc(db, "users", uid), {
        uid,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        phoneNumber: null,
        status: "Hey there! I am using ChatApp",
        createdAt: serverTimestamp(),
        online: true,
      });
    }
  } catch (err) {
    toast.error(err.message || "Google login failed");
  } finally {
    setLoading(false);
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
      <h1 className="auth-title">Welcome to ChatApp</h1>
      <p className="auth-subtitle">Connect with friends instantly</p>

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
<button
  type="button"
  className="btn btn-ghost"
  onClick={handleGoogleLogin}
  disabled={loading}
  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}
>
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
  Continue with Google
</button>
<div className="divider">or</div>
<button type="button" className="btn btn-ghost" onClick={() => setIsSignUp(!isSignUp)}>
  {isSignUp ? "Already have an account? Sign In" : "New here? Create Account"}
</button>
        </form>
      )}
    </div>
  </div>
);
}
