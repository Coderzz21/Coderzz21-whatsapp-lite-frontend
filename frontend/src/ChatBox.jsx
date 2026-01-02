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
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const endRef = useRef();

  // ✅ Hosted Render backend only
  const backendURL = process.env.REACT_APP_BACKEND_URL || "https://coderzz21-whatsapp-lite-backend-1.onrender.com";
  const [resourceBase, setResourceBase] = useState("/messages");
  const [uploadPath, setUploadPath] = useState("/upload");

  // ===== Fetch messages & listen for new ones =====
  useEffect(() => {
    const detectAndFetchMessages = async () => {
      // Try root-level routes first, then /api/messages
      const candidates = ["/messages", "/api/messages"];
      let ok = false;
      for (const path of candidates) {
        try {
          const res = await fetch(`${backendURL}${path}`);
          if (!res.ok) {
            // Not found or server error - try next
            continue;
          }
          const data = await res.json();
          setChat(data);
          setResourceBase(path);
          ok = true;
          break;
        } catch (err) {
          // network / CORS / html responses will be caught here; try next
          continue;
        }
      }
      if (!ok) {
        console.error("Failed to reach backend on expected paths");
        // Retry detection after 3s
        setTimeout(detectAndFetchMessages, 3000);
      }
    };

    const detectUploadPath = async (base) => {
      // Skip CORS preflight check - use default upload path
      setUploadPath(`${base}/upload`);
    };

    // Invoke async init function instead of using top-level await
    (async () => {
      await detectAndFetchMessages();
      await detectUploadPath(resourceBase);
    })();

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
  }, [backendURL]);

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
      if (replyingTo) {
        socket.emit("send_reply", { 
          sender: username, 
          message, 
          type: "text",
          replyToId: replyingTo.id
        });
      } else {
        socket.emit("send_message", { sender: username, message, type: "text" });
      }
      setMessage("");
      setReplyingTo(null);
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
    if (!file) {
      alert("No file selected");
      return;
    }

    setSending(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "uploads");
    formData.append("folder", "whatsapp-lite/media");
    formData.append("public_id", `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`);

    try {
      console.log("📤 Uploading file to Cloudinary:", file.name);
      console.log("👤 Sender:", username);

      const res = await fetch(`https://api.cloudinary.com/v1_1/dxxmwxyzw/upload`, {
        method: "POST",
        body: formData,
      });

      console.log("📬 Upload response status:", res.status);

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}`;
        try {
          const text = await res.text();
          try {
            const error = JSON.parse(text);
            errorMsg = error.error?.message || error.message || text.substring(0, 200) || errorMsg;
          } catch {
            errorMsg = text.substring(0, 200) || errorMsg;
          }
        } catch (e) {
          console.error("Error reading response:", e);
        }
        throw new Error(errorMsg);
      }

      const response = await res.json();
      console.log("✅ Upload successful:", response.secure_url);

      // Create message object
      const now = new Date();
      const timestamp = now.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
      });

      const msg = {
        type: "file",
        message: response.secure_url,
        sender: username,
        timestamp,
      };

      // Add to local chat
      setChat((prev) => [...prev, msg]);

      // Send via socket to backend for persistence
      socket.emit("send_message", msg);

      // Clear preview after successful upload
      setFile(null);
      setPreviewUrl(null);
    } catch (err) {
      console.error("❌ File upload error:", err);
      alert(`Failed to upload file:\n${err.message}`);
    } finally {
      setSending(false);
    }
  };

  // ===== Delete message =====
  const deleteMessage = (messageId, sender) => {
    if (sender === username) {
      socket.emit("delete_message", { messageId, sender: username });
    }
  };

  // ===== Add emoji to message =====
  const insertEmoji = (emojiChar) => {
    setMessage((prev) => prev + emojiChar);
    setShowEmojiPicker(false);
  };

  // ===== Auto-scroll =====
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // ===== Handle file selection and preview =====
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [file]);

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
                <div key={msg.id || i}>
                  {/* Reply Preview */}
                  {msg.replyTo && (
                    <div className={`reply-preview ${isMe ? "outgoing" : "incoming"}`}>
                      <div className="reply-indicator">↩️ Replying to {msg.replyTo.sender}</div>
                      <div className="reply-content">
                        {msg.replyTo.type === "file" ? "📎 " : ""}{msg.replyTo.message?.substring(0, 50)}...
                      </div>
                    </div>
                  )}
                  
                  <div className={`msg-row ${isMe ? "outgoing" : "incoming"}`}>
                    <div className={`bubble ${isMe ? "outgoing" : "incoming"} visible`}>
                      {renderMessageContent(msg)}
                      {msg.deleted && <span className="deleted-text">[Message Deleted]</span>}
                    </div>
                    
                    {/* Message Actions */}
                    <div className={`msg-actions ${isMe ? "outgoing" : "incoming"}`}>
                      {!msg.deleted && (
                        <button 
                          className="action-btn reply-btn"
                          onClick={() => setReplyingTo(msg)}
                          title="Reply"
                        >
                          ↩️
                        </button>
                      )}
                    </div>
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

        {/* ===== File Preview ===== */}
        {previewUrl && (
          <div className="file-preview-section">
            {file && file.type.startsWith("image/") && (
              <img src={previewUrl} alt="preview" className="file-preview-img" />
            )}
            {file && file.type.startsWith("video/") && (
              <video src={previewUrl} controls className="file-preview-video" />
            )}
            {file && !file.type.startsWith("image/") && !file.type.startsWith("video/") && (
              <div className="file-preview-info">
                📄 {file.name}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={() => { setFile(null); setPreviewUrl(null); }}
                className="cancel-btn"
                disabled={sending}
              >
                ✕ Cancel
              </button>
              <button
                onClick={sendFile}
                className={`send-file-btn ${sending ? "sending" : ""}`}
                disabled={sending}
              >
                {sending ? "Uploading..." : "📤 Send Media"}
              </button>
            </div>
          </div>
        )}
 
        {/* ===== Input Footer ===== */}
         <div className="chat-footer">
           {/* ===== Reply Preview ===== */}
           {replyingTo && (
             <div className="reply-input-preview">
               <div className="reply-info">
                 ↩️ Replying to <strong>{replyingTo.sender}</strong>
               </div>
               <div className="reply-preview-text">
                 {replyingTo.type === "file" ? "📎 " : ""}{replyingTo.message?.substring(0, 50)}...
               </div>
               <button 
                 className="clear-reply-btn"
                 onClick={() => setReplyingTo(null)}
               >
                 ✕
               </button>
             </div>
           )}
           
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
             <span className="tooltip">
               <label
                 htmlFor="file-upload"
                 className="upload-label"
               >
                 📎
               </label>
               <span className="tooltip-text">Attach file</span>
             </span>
 
             {/* ===== Send Button ===== */}
             <button
               className={`send-btn ${sending ? "sending" : ""}`}
               onClick={sendMessage}
               disabled={sending || !message.trim()}
             >
               <span className="pulse"></span>
               {sending ? "..." : "Send"}
             </button>
           </div>
         </div>
       </div>
     </div>
   );
 }
