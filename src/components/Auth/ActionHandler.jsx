import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import {
  applyActionCode,
  verifyPasswordResetCode,
  confirmPasswordReset,
} from "firebase/auth";
import toast from "react-hot-toast";

export default function ActionHandler() {
  const [mode, setMode] = useState("");
  const [oobCode, setOobCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get("mode");
    const code = params.get("oobCode");
    setMode(m);
    setOobCode(code);

    if (m === "verifyEmail" && code) {
      applyActionCode(auth, code)
        .then(() => {
          setDone(true);
          setLoading(false);
          toast.success("Email verified successfully!");
          setTimeout(() => navigate("/login"), 3000);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    } else if (m === "resetPassword" && code) {
      verifyPasswordResetCode(auth, code)
        .then(() => setLoading(false))
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    } else {
      setError("Invalid or missing action code.");
      setLoading(false);
    }
  }, []);

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) return toast.error("Password must be at least 6 characters");
    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setDone(true);
      toast.success("Password reset successful!");
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-card">
        {loading && (
          <>
            <div className="auth-icon">⏳</div>
            <h1 className="auth-title">Processing...</h1>
            <p className="auth-subtitle">Please wait</p>
          </>
        )}

        {!loading && error && (
          <>
            <div className="auth-icon">❌</div>
            <h1 className="auth-title">Link Expired</h1>
            <p className="auth-subtitle">This link has expired or already been used.</p>
            <button className="btn" style={{ marginTop: 16 }} onClick={() => navigate("/login")}>
              Back to Login
            </button>
          </>
        )}

        {!loading && done && mode === "verifyEmail" && (
          <>
            <div className="auth-icon">✅</div>
            <h1 className="auth-title">Email Verified!</h1>
            <p className="auth-subtitle">Redirecting to login...</p>
          </>
        )}

        {!loading && done && mode === "resetPassword" && (
          <>
            <div className="auth-icon">✅</div>
            <h1 className="auth-title">Password Reset!</h1>
            <p className="auth-subtitle">Redirecting to login...</p>
          </>
        )}

        {!loading && !error && !done && mode === "resetPassword" && (
          <>
            <div className="auth-icon">🔐</div>
            <h1 className="auth-title">Reset Password</h1>
            <p className="auth-subtitle">Enter your new password</p>
            <form onSubmit={handlePasswordReset}>
              <div className="field">
                <label>New Password</label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />
              </div>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? <span className="spinner" /> : "Reset Password →"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}