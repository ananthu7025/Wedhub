import axios from "axios";

// axios instance for acessing /api from server
const httpServer = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_BASE_URL + "/api" || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export default httpServer;
