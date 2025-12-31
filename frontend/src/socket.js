import { io } from "socket.io-client";

// ✅ Always use Render backend with auto-reconnection (v4.8.3+)
export const socket = io(process.env.REACT_APP_BACKEND_URL || "https://coderzz21-whatsapp-lite-backend-1.onrender.com", {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 999,
  transports: ["websocket", "polling"],
  autoConnect: true,
  upgrade: true,
  rememberUpgrade: true
});
