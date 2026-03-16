// src/components/Chat/ChatWindow.jsx
import { useState, useEffect, useRef } from "react";
import { db } from "../../firebase";
import {
  collection, query, orderBy, onSnapshot, limit, doc,
} from "firebase/firestore";
import { sendMessage,setTyping } from "../../utils/firestore";
import { useAuth } from "../../context/AuthContext";
import { format, isToday, isYesterday, isSameDay } from "date-fns";
import EmojiPicker from "emoji-picker-react";


export default function ChatWindow({ contact, chatId, onBack }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isContactTyping, setIsContactTyping] = useState(false);
const typingTimeoutRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!chatId) return;
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(200)
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [chatId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  useEffect(() => {
  if (!chatId || !contact?.uid) return;
  const unsub = onSnapshot(
    doc(db, "chats", chatId, "typing", contact.uid),
    (snap) => {
      if (snap.exists()) {
        setIsContactTyping(snap.data().isTyping);
      } else {
        setIsContactTyping(false);
      }
    }
  );
  return unsub;
}, [chatId, contact?.uid]);

 const handleSend = async () => {
  const trimmed = text.trim();
  if (!trimmed || !chatId) return;
  setText("");
  setSending(true);
  setTyping(chatId, user.uid, false);
  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
}

const handleKey = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
    return;
  }
  // Set typing true
  setTyping(chatId, user.uid, true);
  // Clear typing after 2 seconds of no input
  if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
  typingTimeoutRef.current = setTimeout(() => {
    setTyping(chatId, user.uid, false);
  }, 2000);
};

  const onEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
    inputRef.current?.focus();
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return format(date, "h:mm a");
  };

  const getDateLabel = (ts) => {
    if (!ts) return "";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMMM d, yyyy");
  };

  // Group messages with date dividers
  const renderMessages = () => {
    let lastDate = null;
    return messages.map((msg, i) => {
      const isOut = msg.senderId === user.uid;
      const isSystem = msg.senderId === "system";
      const msgDate = msg.createdAt?.toDate ? msg.createdAt.toDate() : null;
      const showDate = msgDate && (!lastDate || !isSameDay(lastDate, msgDate));
      if (msgDate) lastDate = msgDate;

      return (
        <div key={msg.id}>
          {showDate && (
            <div className="msg-date-divider">
              <span>{getDateLabel(msg.createdAt)}</span>
            </div>
          )}
          {isSystem ? (
            <div className="sys-msg">
              <span>🔔 {msg.text}</span>
            </div>
          ) : (
            <div className={`msg-row ${isOut ? "out" : "in"}`}>
              <div className="msg-bubble">
                {msg.text}
                <div className="msg-time">
                  {formatTime(msg.createdAt)}
                  {isOut && (
                    <span className={`msg-tick ${msg.readBy?.length > 1 ? "read" : ""}`}>
                      {msg.readBy?.length > 1 ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <>
      {/* Header */}
      <div className="chat-area-header">
<button
  className="icon-btn"
  id="back-btn"
  style={{ marginRight: 4 }}
  onClick={() => {
    const chatArea = document.querySelector(".chat-area");
    if (chatArea) chatArea.classList.remove("mobile-open");
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.style.display = "flex";
    onBack();
  }}
>
  ←
</button>
      <div className="chat-item-avatar">
          {contact?.photoURL ? (
            <img src={contact.photoURL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
          ) : "👤"}
        </div>
        <div>
          <div className="chat-area-name">{contact?.displayName}</div>
          <div className="chat-area-status">
            {contact?.online ? "🟢 Online" : `Last seen ${contact?.lastSeen ? format(contact.lastSeen.toDate?.() || new Date(), "h:mm a") : "recently"}`}
          </div>
        </div>
        <div className="chat-header-actions">
          <button className="icon-btn" title="Voice call">📞</button>
          <button className="icon-btn" title="Video call">📹</button>
          <button className="icon-btn" title="Search">🔍</button>
        </div>
      </div>

      {/* Messages */}
      <div className="messages-wrap">
        {messages.length === 0 && (
          <div style={{ textAlign: "center", marginTop: 40, color: "var(--text-muted)", fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
            Say hello to {contact?.displayName}!
          </div>
        )}
        {renderMessages()}
        {isContactTyping && (
  <div className="msg-row in">
    <div className="msg-bubble" style={{ padding: "10px 14px" }}>
      <div className="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </div>
)}
<div ref={bottomRef} />
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        {showEmoji && (
          <div className="emoji-picker-wrap">
            <EmojiPicker
              onEmojiClick={onEmojiClick}
              theme="dark"
              height={380}
              width={320}
            />
          </div>
        )}
        <button className="emoji-btn" onClick={() => setShowEmoji(!showEmoji)}>😊</button>
        <button className="attach-btn" title="Attach file">📎</button>
        <textarea
          ref={inputRef}
          className="message-input"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          onFocus={() => setShowEmoji(false)}
        />
        <button className="send-btn" onClick={handleSend} disabled={!text.trim() || sending}>
          ➤
        </button>
      </div>
    </>
  );
}
