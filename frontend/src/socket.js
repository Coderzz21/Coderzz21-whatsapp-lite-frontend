import { io } from "socket.io-client";

// ✅ Always use Render backend
export const socket = io("https://coderzz21-whatsapp-lite-backend-1.onrender.com");
