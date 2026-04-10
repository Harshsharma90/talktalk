
import { useState } from "react";
import { findUserByEmail, addContact } from "../../utils/firestore";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import toast from "react-hot-toast";

export default function AddContactModal({ onClose, onAdded }) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
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
      const found = await findUserByEmail(query.trim());
      if (!found) {
        setError("No user found with that email");
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
      const theirUid = result.uid || result.id;
      const contactSnap = await getDoc(doc(db, "users", user.uid, "contacts", theirUid));
      if (contactSnap.exists()) {
        toast.error(`${result.displayName} is already in your contacts!`);
        setAdding(false);
        return;
      }
      const chatId = await addContact(user.uid, theirUid);
      const contactData = { ...result, uid: theirUid, id: theirUid };
      toast.success(`${result.displayName} added!`);
      onAdded(contactData, chatId);
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

        <div className="field">
          <label>Email Address</label>
          <input
            type="email"
            placeholder="user@example.com"
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
              <div className="result-phone">{result.email}</div>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn"
            onClick={handleSearch}
            disabled={loading || !query.trim()}
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