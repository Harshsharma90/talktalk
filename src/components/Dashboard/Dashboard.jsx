// src/components/Dashboard/Dashboard.jsx
import { useState, useEffect } from "react";
import { auth, db } from "../../firebase";
import { signOut } from "firebase/auth";
import { setUserOnline,markChatAsRead  } from "../../utils/firestore";
import { collection, onSnapshot, doc, getDoc,} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { format, isToday } from "date-fns";
import ChatWindow from "../Chat/ChatWindow";
import AddContactModal from "./AddContactModal";
import { useNavigate } from "react-router-dom";
import { requestNotificationPermission, onForegroundMessage } from "../../utils/notifications"; 

export default function Dashboard() {
  const { user, userProfile } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [activeChatId, setActiveChatId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
 
  useEffect(() => {
    setUserOnline(user.uid, true);
     requestNotificationPermission(user.uid);
    const handleVisibility = () => setUserOnline(user.uid, !document.hidden);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      setUserOnline(user.uid, false);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

 

  
 useEffect(() => {
  const unsubs = contacts.map((c) => {
    if (!c.chatId) return () => {};
    return onSnapshot(doc(db, "chats", c.chatId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setContacts((prev) =>
          prev.map((p) =>
            p.chatId === c.chatId
              ? {
                  ...p,
                  lastMessage: data.lastMessage,
                  lastMessageTime: data.lastMessageTime,
                  unreadCount: data[`unread_${user.uid}`] || 0,
                }
              : p
          )
        );
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

  // Listen for new contacts added by others in real time
useEffect(() => {
  if (!user?.uid) return;
  const unsub = onSnapshot(
    collection(db, "users", user.uid, "contacts"),
    async (snap) => {
      const updatedContacts = [];
      for (const d of snap.docs) {
        const userSnap = await getDoc(doc(db, "users", d.id));
        if (userSnap.exists()) {
          const chatId = [user.uid, d.id].sort().join("_");
          const chatSnap = await getDoc(doc(db, "chats", chatId));
          const chatData = chatSnap.exists() ? chatSnap.data() : {};
          updatedContacts.push({
            ...userSnap.data(),
            id: d.id,
            chatId,
            lastMessage: chatData.lastMessage || null,
            lastMessageTime: chatData.lastMessageTime || null,
            unreadCount: chatData[`unread_${user.uid}`] || 0,
          });
        }
      }
      updatedContacts.sort((a, b) => {
        const aTime = a.lastMessageTime?.toMillis?.() || 0;
        const bTime = b.lastMessageTime?.toMillis?.() || 0;
        return bTime - aTime;
      });
      setContacts(updatedContacts);
      setLoading(false);
    }
  );
  return unsub;
}, [user?.uid]);


 

const handleSelectContact = async (contact) => {
  setActiveContact(contact);
  setActiveChatId(contact.chatId);
  setShowProfile(false);
  const chatArea = document.querySelector(".chat-area");
  if (chatArea) chatArea.classList.add("mobile-open");
  // Reset unread count
  if (contact.chatId) {
    markChatAsRead(contact.chatId, user.uid);
    setContacts((prev) =>
      prev.map((c) => c.id === contact.id ? { ...c, unreadCount: 0 } : c)
    );
  }
};

const handleContactAdded = (newContact, chatId) => {
  const contactWithChat = { 
    ...newContact, 
    id: newContact.uid || newContact.id, 
    chatId, 
    lastMessage: null 
  };
  setContacts((prev) => {
    const exists = prev.find((c) => c.id === contactWithChat.id);
    if (exists) return prev;
    return [contactWithChat, ...prev];
  });
  setActiveContact(contactWithChat);
  setActiveChatId(chatId);
  const chatArea = document.querySelector(".chat-area");
  if (chatArea) chatArea.classList.add("mobile-open");
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
          {loading && (
            <div style={{ padding: 24, textAlign: "center", color: "var(--text-muted)" }}>
              Loading chats...
            </div>
          )}

        {!loading && filteredContacts.length === 0 && (
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
  {contact.unreadCount > 0 && activeChatId !== contact.chatId && (
    <div className="badge">{contact.unreadCount > 99 ? "99+" : contact.unreadCount}</div>
  )}
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
<button
  className="btn"
  style={{ width: "auto", padding: "8px 20px", marginTop: 4 }}
  onClick={() => navigate("/setup")}
>
  ✏️ Edit Profile
</button>
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