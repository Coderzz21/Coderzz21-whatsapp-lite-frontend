import React, { useState, useEffect, useRef } from "react";
import { socket } from "./socket";
import "./ChatBox.css";

function formatTimestamp(ts) {
  return ts || "";
}

export default function ChatBox({ username }) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState(null);
  const endRef = useRef();

  // ✅ Auto-detect backend URL (Render or Localhost)
  const backendURL =
    window.location.hostname === "localhost"
      ? "http://localhost:4000"
      : "https://coderzz21-whatsapp-lite-backend-1.onrender.com";

  // ===== Fetch messages & listen for live updates =====
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`${backendURL}/messages`);
        const data = await res.json();
        setChat(data);
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      }
    };

    fetchMessages();

    const handleMessage = (data) => setChat((prev) => [...prev, data]);
    socket.on("receive_message", handleMessage);
    return () => socket.off("receive_message", handleMessage);
  }, [backendURL]);

  // ===== Send text message =====
  const sendMessage = async () => {
    if (!message.trim()) return;
    setSending(true);
    try {
      socket.emit("send_message", { sender: username, message, type: "text" });
      setMessage("");
      await new Promise((r) => setTimeout(r, 200));
    } finally {
      setSending(false);
    }
  };

  // ===== Send file =====
  const sendFile = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      await fetch(`${backendURL}/upload`, { method: "POST", body: formData });
      setFile(null);
    } catch (err) {
      console.error("File upload error:", err);
    }
  };

  // ===== Auto-scroll to bottom =====
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // ===== Render text, image, video, or file =====
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
            <div className="user-avatar">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="chat-title">Chat as {username}</div>
          </div>
        </div>

        {/* ===== Chat Body ===== */}
        <div className="chat-body">
          <div className="messages">
            {chat.map((msg, i) => {
              const isMe = msg.sender === username;
              return (
                <div
                  key={i}
                  className={`msg-row ${isMe ? "outgoing" : "incoming"}`}
                >
                  <div
                    className={`bubble ${isMe ? "outgoing" : "incoming"} visible`}
                  >
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

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="file"
              id="file-upload"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files[0])}
            />
            <label htmlFor="file-upload" className="upload-label">
              📎
            </label>
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
