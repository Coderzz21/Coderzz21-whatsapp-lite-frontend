import { io } from "socket.io-client";

export const socket = io("https://coderzz21-whatsapp-lite-backend-1.onrender.com", {
  transports: ["websocket"],
});
