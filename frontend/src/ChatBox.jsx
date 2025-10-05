import React, { useState, useEffect, useRef } from "react";
import { socket } from "./socket";

export default function ChatBox({ username }) {
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
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
  const sendMessage = () => {
    if (!message.trim()) return;
    socket.emit("send_message", { sender: username, message, type: "text" });
    setMessage(""); // clear input
  };

  // Auto-scroll to bottom when chat updates
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  return (
    <div style={{ maxWidth: 500, margin: "20px auto", fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ textAlign: "center" }}>Chat as {username}</h2>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 10,
          height: 400,
          overflowY: "auto",
          padding: 10,
          backgroundColor: "#f5f5f5",
        }}
      >
        {chat.map((msg, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.sender === username ? "flex-end" : "flex-start",
              marginBottom: 10,
            }}
          >
            <div
              style={{
                backgroundColor: msg.sender === username ? "#DCF8C6" : "#FFFFFF",
                padding: "8px 12px",
                borderRadius: 15,
                maxWidth: "80%",
                wordBreak: "break-word",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              }}
            >
              {msg.message}
            </div>
            <small style={{ color: "#555", marginTop: 2 }}>
              {msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </small>
          </div>
        ))}
        <div ref={endRef}></div>
      </div>

      {/* Input area */}
      <div style={{ display: "flex", marginTop: 10 }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: 20,
            border: "1px solid #ccc",
            outline: "none",
          }}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          style={{
            marginLeft: 5,
            padding: "8px 15px",
            borderRadius: 20,
            backgroundColor: "#075E54",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
