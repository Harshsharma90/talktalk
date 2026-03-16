// src/components/Dashboard/Dashboard.jsx
import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { signOut } from "firebase/auth";
import { getUserContacts, setUserOnline, getOrCreateChat, acceptContactRequest, declineContactRequest } from "../../utils/firestore";
import {
  collection, onSnapshot, doc, getDoc,
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { format, isToday } from "date-fns";
import ChatWindow from "../Chat/ChatWindow";
import AddContactModal from "./AddContactModal";
import toast from "react-hot-toast";

export default function Dashboard() {
  const { user, userProfile } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);

  const loadContacts = async () => {
    try {
      const list = await getUserContacts(user.uid);
      setContacts(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
    setUserOnline(user.uid, true);
    const handleVisibility = () => setUserOnline(user.uid, !document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      setUserOnline(user.uid, false);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  
  useEffect(() => {
    const unsubs = contacts.map((c) => {
      return onSnapshot(doc(db, "users", c.id), (snap) => {
        if (snap.exists()) {
          setContacts((prev) =>
            prev.map((p) => (p.id === c.id ? { ...p, ...snap.data() } : p))
          );
          if (activeContact?.id === c.id) {
            setActiveContact((prev) => ({ ...prev, ...snap.data() }));
          }
        }
      });
    });
    return () => unsubs.forEach((u) => u());
  }, [contacts.length]);

  // Listen for chat last message updates
  useEffect(() => {
    const unsubs = contacts.map((c) => {
      if (!c.chatId) return () => {};
      return onSnapshot(doc(db, "chats", c.chatId), (snap) => {
        if (snap.exists()) {
          setContacts((prev) =>
            prev.map((p) =>
              p.chatId === c.chatId
                ? { ...p, lastMessage: snap.data().lastMessage, lastMessageTime: snap.data().lastMessageTime }
                : p
            )
          );
        }
      });
    });
    return () => unsubs.forEach((u) => u());
  }, [contacts.length]);


  useEffect(() => {
    if (!user?.uid) return;
    let unsub;
    const setupListener = () => {
      unsub = onSnapshot(
        collection(db, "users", user.uid, "requests"),
        async (snap) => {
          console.log("Requests updated:", snap.size);
          const reqs = [];
          for (const d of snap.docs) {
            try {
              const fromSnap = await getDoc(doc(db, "users", d.data().fromUid));
              if (fromSnap.exists()) {
                reqs.push({ id: d.id, ...d.data(), profile: fromSnap.data() });
              }
            } catch (e) {
              console.warn("Could not fetch request sender profile:", e);
            }
          }
          setRequests(reqs);
        },
        (error) => {
          console.error("Requests listener error:", error);
          setTimeout(setupListener, 3000);
        }
      );
    };
    const timer = setTimeout(setupListener, 500);
    return () => {
      clearTimeout(timer);
      unsub?.();
    };
  }, [user?.uid]);

const handleSelectContact = async (contact) => {
  setActiveContact(contact);
  setActiveChatId(contact.chatId);
  setShowProfile(false);
  const chatArea = document.querySelector(".chat-area");
  if (chatArea) chatArea.classList.add("mobile-open");
};

  const handleContactAdded = (newContact, chatId) => {
    const contactWithChat = { ...newContact, id: newContact.uid, chatId, lastMessage: null };
    setContacts((prev) => {
      const exists = prev.find((c) => c.id === newContact.uid);
      if (exists) return prev;
      return [contactWithChat, ...prev];
    });
    handleSelectContact(contactWithChat);
  };

  const handleAcceptRequest = async (req) => {
    try {
      const chatId = await acceptContactRequest(user.uid, req.fromUid);
      const newContact = { ...req.profile, id: req.fromUid, chatId, lastMessage: null };
      setContacts((prev) => {
        const exists = prev.find((c) => c.id === req.fromUid);
        if (exists) return prev;
        return [newContact, ...prev];
      });
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      toast.success(`${req.profile.displayName} added to contacts!`);
    } catch (e) {
      console.error("Accept request error:", e);
      toast.error("Failed to accept request");
    }
  };

  const handleDeclineRequest = async (req) => {
    try {
      await declineContactRequest(user.uid, req.fromUid);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      toast.success("Request declined");
    } catch (e) {
      toast.error("Failed to decline request");
    }
  };

  const handleLogout = () => {
    signOut(auth)
      .then(() => console.log("signOut success"))
      .catch((e) => console.error("signOut error:", e));
  };

  const filteredContacts = contacts.filter((c) =>
    c.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phoneNumber?.includes(searchQuery)
  );

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    if (isToday(date)) return format(date, "h:mm a");
    return format(date, "dd/MM/yy");
  };

  return (
    <div className="dashboard">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header-left">
            <div className="sidebar-avatar" onClick={() => setShowProfile(!showProfile)}>
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              ) : "👤"}
            </div>
           <span className="sidebar-brand">💬 {userProfile?.displayName || "ChatApp"}</span>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button className="icon-btn" onClick={() => setShowAddModal(true)} title="Add contact">➕</button>
       <button
  className="icon-btn"
  onClick={handleLogout}
  title="Logout"
  style={{ fontSize: 14, color: "var(--text-secondary)", border: "1px solid var(--border-light)", borderRadius: 8, padding: "4px 10px", width: "auto", height: "auto" }}
>
  Logout
</button>
          </div>
        </div>
        <div className="search-box">
          <div className="search-input-wrap">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="chats-list">
          {requests.length > 0 && (
            <div style={{ borderBottom: "1px solid var(--border)" }}>
              <div style={{ padding: "10px 20px 6px", fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
                Contact Requests ({requests.length})
              </div>
              {requests.map((req) => (
                <div key={req.id} style={{ padding: "10px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-card)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="chat-item-avatar" style={{ width: 38, height: 38, fontSize: 16, flexShrink: 0 }}>
                      {req.profile?.photoURL ? (
                        <img src={req.profile.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                      ) : "👤"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{req.profile?.displayName}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{req.profile?.phoneNumber || req.profile?.email}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                    <button
                      onClick={() => handleAcceptRequest(req)}
                      style={{ flex: 1, padding: "6px", background: "var(--accent)", border: "none", borderRadius: 6, color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                    >
                      ✓ Accept
                    </button>
                    <button
                      onClick={() => handleDeclineRequest(req)}
                      style={{ flex: 1, padding: "6px", background: "transparent", border: "1px solid var(--border-light)", borderRadius: 6, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}
                    >
                      ✕ Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
              Loading chats...
            </div>
          )}

          {!loading && filteredContacts.length === 0 && requests.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>👥</div>
              {searchQuery ? "No results" : "No contacts yet. Add someone!"}
            </div>
          )}

          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className={`chat-item ${activeChatId === contact.chatId ? "active" : ""}`}
              onClick={() => handleSelectContact(contact)}
            >
              <div className="chat-item-avatar">
                {contact.photoURL ? (
                  <img src={contact.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                ) : "👤"}
              </div>
              {contact.online && <div className="online-dot" />}
              <div className="chat-item-info">
                <div className="chat-item-name">{contact.displayName}</div>
                <div className="chat-item-last">
                  {contact.lastMessage || contact.status || "Start chatting..."}
                </div>
              </div>
              <div className="chat-item-meta">
                <div className="chat-item-time">
                  {formatTime(contact.lastMessageTime)}
                </div>
              </div>
            </div>
          ))}

        </div>
      </div>
<div className="chat-area" style={{ flexDirection: "column" }}>
          {activeContact && activeChatId ? (
          <ChatWindow
            contact={activeContact}
            chatId={activeChatId}
            onBack={() => setActiveContact(null)}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <h3>Welcome, {userProfile?.displayName}!</h3>
            <p>Select a contact to start chatting</p>
            <button className="btn" style={{ width: "auto", marginTop: 16 }} onClick={() => setShowAddModal(true)}>
              ➕ Add Contact
            </button>
          </div>
        )}
      </div>
      {showProfile && (
         <div className={`profile-panel ${window.innerWidth <= 768 ? "mobile-open" : ""}`}>

          <div className="profile-panel-header">
<button
  className="icon-btn"
  onClick={() => {
    setShowProfile(false);
    const chatArea = document.querySelector(".chat-area");
    if (chatArea) chatArea.classList.remove("mobile-open");
  }}
>
  ← Back
</button> My Profile
          </div>
          <div className="profile-panel-content">
            <div className="profile-big-avatar">
              {userProfile?.photoURL ? (
                <img src={userProfile.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
              ) : "👤"}
            </div>
            <div className="profile-name">{userProfile?.displayName}</div>
            <div className="profile-status">{userProfile?.status}</div>
            {userProfile?.phoneNumber && (
              <div className="profile-info-row" style={{ width: "100%" }}>
                <span>📱</span>
                <div className="profile-info-text">
                  <span className="profile-info-label">Phone</span>
                  <span className="profile-info-value">{userProfile.phoneNumber}</span>
                </div>
              </div>
            )}
            {userProfile?.email && (
              <div className="profile-info-row" style={{ width: "100%" }}>
                <span>✉️</span>
                <div className="profile-info-text">
                  <span className="profile-info-label">Email</span>
                  <span className="profile-info-value">{userProfile.email}</span>
                </div>
              </div>
            )}
            <button className="btn btn-ghost" style={{ marginTop: 8 }} onClick={handleLogout}>
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}
      {showAddModal && (
        <AddContactModal
          onClose={() => setShowAddModal(false)}
          onAdded={handleContactAdded}
        />
      )}
    </div>
  );
}