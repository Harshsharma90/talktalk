// src/components/Dashboard/AddContactModal.jsx
import { useState } from "react";
import { findUserByPhone, findUserByEmail, addContact,sendSystemMessage } from "../../utils/firestore";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function AddContactModal({ onClose, onAdded }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState("phone"); // "phone" | "email"
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      let found;
      if (searchType === "phone") {
        found = await findUserByPhone(query.trim());
      } else {
        found = await findUserByEmail(query.trim());
      }
      if (!found) {
        setError("No user found with that " + searchType);
      } else if (found.uid === user.uid) {
        setError("That's you! Search for someone else.");
      } else {
        setResult(found);
      }
    } catch (e) {
      setError("Search failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

const handleAdd = async () => {
  if (!result) return;
  setAdding(true);
  try {
    const chatId = await addContact(user.uid, result.uid);
    toast.success(`${result.displayName} added!`);
    onAdded(result, chatId);
    onClose();
  } catch (e) {
    toast.error("Failed to add contact");
  } finally {
    setAdding(false);
  }
};

return (
  <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div className="modal">
      <h3 className="modal-title">👤 Add New Contact</h3>

      <div className="tab-group" style={{ marginBottom: 16 }}>
        <button className={`tab-btn ${searchType === "phone" ? "active" : ""}`} onClick={() => { setSearchType("phone"); setResult(null); setError(""); }}>
          📱 Phone
        </button>
        <button className={`tab-btn ${searchType === "email" ? "active" : ""}`} onClick={() => { setSearchType("email"); setResult(null); setError(""); }}>
          ✉️ Email
        </button>
      </div>

      <div className="field">
        <label>{searchType === "phone" ? "Phone Number (with country code)" : "Email Address"}</label>
        <input
          type={searchType === "phone" ? "tel" : "email"}
          placeholder={searchType === "phone" ? "+91XXXXXXXXXX" : "user@example.com"}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setError(""); setResult(null); }}
          autoFocus
        />
        {error && <p className="error-msg">{error}</p>}
      </div>

      {result && (
        <div className="search-result">
          <div className="chat-item-avatar" style={{ width: 44, height: 44, fontSize: 20 }}>
            {result.photoURL ? (
              <img src={result.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
            ) : "👤"}
          </div>
          <div className="result-info">
            <div className="result-name">{result.displayName}</div>
            <div className="result-phone">{result.phoneNumber || result.email}</div>
          </div>
        </div>
      )}

      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          className="btn"
          onClick={handleSearch}
          disabled={loading || adding || !query.trim()}
          style={{ display: result ? "none" : "flex" }}
        >
          {loading ? <span className="spinner" /> : "🔍 Search"}
        </button>
        <button
          className="btn"
          onClick={handleAdd}
          disabled={adding || !result}
          style={{ display: result ? "flex" : "none" }}
        >
          {adding ? <span className="spinner" /> : "➕ Add Contact"}
        </button>
      </div>
    </div>
  </div>
);
}
