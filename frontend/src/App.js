import React, { useState } from "react";
import Login from "./Login";
import ChatBox from "./ChatBox";

export default function App() {
  const [user, setUser] = useState(null);
  return user ? <ChatBox username={user} /> : <Login onLogin={setUser} />;
}
