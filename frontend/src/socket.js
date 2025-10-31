import { io } from "socket.io-client";

const backendURL =
  window.location.hostname === "localhost"
    ? "http://localhost:4000"
    : "https://coderzz21-whatsapp-lite-backend-1.onrender.com";

export const socket = io(backendURL);
