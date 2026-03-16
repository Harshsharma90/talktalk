// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./components/Auth/LoginPage";
import OtpPage from "./components/Auth/OtpPage";
import ProfileSetup from "./components/Auth/ProfileSetup";
import Dashboard from "./components/Dashboard/Dashboard";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash"><div className="splash-logo">💬</div></div>;
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="splash"><div className="splash-logo">💬</div></div>;
  return user ? <Navigate to="/" replace /> : children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/otp" element={<PublicRoute><OtpPage /></PublicRoute>} />
        <Route path="/setup" element={<ProtectedRoute><ProfileSetup /></ProtectedRoute>} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
