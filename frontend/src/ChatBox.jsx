import React, { useState, useEffect, useRef } from "react";
import { socket } from "./socket";
// Removed online picker; using local `EMOJIS` constant only
import "./ChatBox.css"; // ✅ keep your custom styles

// Fallback constant emoji list (used when online picker is unavailable)
const EMOJIS = [
  '😊','😂','❤️','👍','🎉','🔥','💯','✨','🙏','👏','💪','🎯',
  '😃','😄','😁','😆','😉','😍','😘','😎','🤩','🤗','🤔','😅',
  '😇','🤠','🤡','🤖','😴','😪','😵','🤯','😬','😐','😶','🙄',
  '😤','😡','😳','🥳','🤤','😜','😝','🤪','😺','😸','😹','😻',
  '💥','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕',
  '💞','💓','💗','💖','💘','💝','🌟','🎶','🎵','🎧','🎤','🎬',
  '🍕','🍔','🍟','🌮','🍣','🍩','🍪','☕','🍺','🍷','🥂','🍾',
  '🌞','🌝','⭐','🌈','⚡','❄️','☔','🌊','🍀','🌹','🌺','🌸',
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮',
  '🚗','🚀','✈️','⛵','🏠','📱','💻','🔒','🔑','📷','💡','🔔',
  '✅','❌','➕','➖','➡️','⬅️','🔁','🔄','♻️','🔍','🔔','📌'
];

function formatTimestamp(ts) {
  return ts || "";
}

export default function ChatBox({ username }) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const endRef = useRef();

  // ✅ Hosted Render backend only
  const backendURL = "https://coderzz21-whatsapp-lite-backend-1.onrender.com";

  // ===== Fetch messages & listen for new ones =====
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${backendURL}/messages`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setChat(data);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
        // Retry after 3 seconds
        setTimeout(fetchMessages, 3000);
      }
    };

    fetchMessages();
    
    const handleMessage = (data) => setChat((prev) => [...prev, data]);
    const handleConnect = () => console.log("✅ Connected to server");
    const handleDisconnect = () => console.log("❌ Disconnected from server");
    const handleConnectError = (err) => console.error("Connection error:", err);

    socket.on("receive_message", handleMessage);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    
    return () => {
      socket.off("receive_message", handleMessage);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, []);

  // ===== Send text message =====
  const sendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      if (!socket.connected) {
        alert("Connecting to server... Please try again");
        setSending(false);
        return;
      }
      socket.emit("send_message", { sender: username, message, type: "text" });
      setMessage("");
      await new Promise((r) => setTimeout(r, 200));
    } catch (err) {
      console.error("Send error:", err);
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  // ===== Send file =====
  const sendFile = async () => {
    if (!file) return;
    setSending(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      if (!socket.connected) {
        alert("Connecting to server... Please try again");
        return;
      }
      const res = await fetch(`${backendURL}/upload`, { 
        method: "POST", 
        body: formData 
      });
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
      setFile(null);
    } catch (err) {
      console.error("File upload error:", err);
      alert("Failed to upload file");
    } finally {
      setSending(false);
    }
  };

  // ===== Auto-scroll =====
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // ===== Add emoji to message =====
  const insertEmoji = (emojiChar) => {
    setMessage((prev) => prev + emojiChar);
    setShowEmojiPicker(false);
  };

  // ===== Render message content =====
  const renderMessageContent = (msg) => {
    if (msg.type === "file") {
      const url = msg.message;
      if (url.match(/\.(jpg|jpeg|png|gif|bmp|webp)$/i)) {
        return <img src={url} alt="media" className="preview-img" />;
      } else if (url.match(/\.(mp4|webm|mov)$/i)) {
        return <video src={url} controls className="preview-video" />;
      } else {
        return (
          <a href={url} target="_blank" rel="noreferrer" className="file-link">
            📄 {url.split("/").pop()}
          </a>
        );
      }
    }
    return msg.message;
  };

  return (
    <div className="chat-wrapper">
      <div className="chat-card">
        {/* ===== Header ===== */}
        <div className="chat-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="user-avatar">{username.charAt(0).toUpperCase()}</div>
            <div className="chat-title">Chat as {username}</div>
          </div>
        </div>

        {/* ===== Chat Body ===== */}
        <div className="chat-body">
          <div className="messages">
            {chat.map((msg, i) => {
              const isMe = msg.sender === username;
              return (
                <div key={i} className={`msg-row ${isMe ? "outgoing" : "incoming"}`}>
                  <div className={`bubble ${isMe ? "outgoing" : "incoming"} visible`}>
                    {renderMessageContent(msg)}
                  </div>
                  <div className="meta">
                    {msg.sender} • {formatTimestamp(msg.timestamp)}
                  </div>
                </div>
              );
            })}
            <div ref={endRef}></div>
          </div>
        </div>

        {/* ===== Input Footer ===== */}
        <div className="chat-footer">
          <div className="input-area">
            <textarea
              value={message}
              placeholder="Type a message... (Shift+Enter for newline)"
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
          </div>

          {/* ===== Emoji Picker Toggle ===== */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                fontSize: "22px",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              😊
            </button>
            {showEmojiPicker && (
              <div style={{ position: "absolute", bottom: "60px", right: "0", width: 340, zIndex: 50 }}>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(8, 30px)",
                  gap: 6,
                  padding: 8,
                  background: "#fff",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                  maxWidth: 340,
                  maxHeight: 220,
                  overflowY: "auto",
                  boxSizing: "border-box",
                  paddingRight: 6
                }}>
                  {EMOJIS.map((e, idx) => (
                    <button
                      key={idx}
                      onClick={() => insertEmoji(e)}
                      style={{
                        fontSize: 18,
                        width: 30,
                        height: 30,
                        padding: 0,
                        margin: 0,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        lineHeight: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      aria-label={`emoji-${idx}`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ===== File Upload ===== */}
            <input
              type="file"
              id="file-upload"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files[0])}
            />
            <label htmlFor="file-upload" className="upload-label">📎</label>

            {/* ===== Send Button ===== */}
            <button
              className={`send-btn ${sending ? "sending" : ""}`}
              onClick={file ? sendFile : sendMessage}
              disabled={sending || (!message.trim() && !file)}
            >
              <span className="pulse"></span>
              {sending ? "..." : file ? "Send File" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
