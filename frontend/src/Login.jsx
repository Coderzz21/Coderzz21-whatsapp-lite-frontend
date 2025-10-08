import React, { useState } from "react";
import "./Login.css";

const BACKEND_URL = "https://coderzz21-whatsapp-lite-backend-1.onrender.com";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        onLogin(username);
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError("Cannot connect to server");
      console.error(err);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="logo">WL</div>
          <div>
            <h3 className="login-title">Message ME</h3>
            <div className="login-sub">Sign in to continue to the chat</div>
          </div>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          <div className="form-row">
            <input
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-row">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button className="submit-btn" type="submit">Login</button>
          {error && <div className="error">{error}</div>}
        </form>
      </div>
    </div>
  );
}
