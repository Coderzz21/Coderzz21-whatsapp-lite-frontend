import React, { useState, useEffect, useRef } from "react";
import { socket } from "./socket";
import "./ChatBox.css";

// Format timestamp to 12-hour with AM/PM and fallback for legacy formats
function formatTimestamp(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (!isNaN(d.getTime())) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  }
  // Legacy `DD/MM/YYYY, HH:MM:SS` fallback
  const parts = String(ts).split(',').map(s => s.trim());
  if (parts.length >= 2) {
    const [datePart, timePart] = parts;
    const m = datePart.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const t = timePart.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m && t) {
      const iso = `${m[3]}-${m[2]}-${m[1]}T${t[1]}:${t[2]}:${t[3]||'00'}`;
      const dd = new Date(iso);
      if (!isNaN(dd.getTime())) return dd.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    }
  }
  return String(ts);
}

export default function ChatBox({ username }) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [sending, setSending] = useState(false);
  const endRef = useRef();

  // Fetch messages on load and listen for new messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const backendURL = "https://coderzz21-whatsapp-lite-backend-1.onrender.com"; // Replace with Render backend URL
        const res = await fetch(`${backendURL}/messages`);
        const data = await res.json();
        setChat(data); // load past messages
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };

    fetchMessages();

    const handleMessage = (data) => {
      setChat((prev) => [...prev, data]);
    };

    socket.on("receive_message", handleMessage);
    return () => socket.off("receive_message", handleMessage);
  }, []);

  // Send text message
  const sendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      socket.emit("send_message", { sender: username, message, type: "text" });
      setMessage(""); // clear input
      // small UX delay to show sending animation
      await new Promise(r => setTimeout(r, 220));
    } finally {
      setSending(false);
    }
  };

  // Auto-scroll to bottom when chat updates
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  return (
    <div className="chat-wrapper">
      <div className="chat-card">
        <div className="chat-header">
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:36,height:36,borderRadius:8,background:'#075e54',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>C</div>
            <div className="chat-title">Chat as {username}</div>
          </div>
        </div>

        <div className="chat-body">
          <div className="messages">
            {chat.map((msg, i) => {
              const isMe = msg.sender === username;
              return (
                <div key={i} className={`msg-row ${isMe? 'outgoing':'incoming'}`}>
                  <div className={`bubble ${isMe? 'outgoing':'incoming'} visible`}>
                    {msg.message}
                  </div>
                  <div className="meta">{msg.sender} • {formatTimestamp(msg.timestamp)}</div>
                </div>
              );
            })}
            <div ref={endRef}></div>
          </div>
        </div>

        <div className="chat-footer">
          <div className="input-area">
            <textarea
              value={message}
              placeholder="Type a message... (Shift+Enter for newline)"
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
          </div>
          <div style={{position:'relative'}}>
            <button className={`send-btn ${sending? 'sending':''}`} onClick={sendMessage} disabled={!message.trim() || sending}>
              <span className="pulse"></span>
              {sending ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
