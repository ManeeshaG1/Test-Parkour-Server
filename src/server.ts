import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { monitor } from "@colyseus/monitor";
import { ParkourRoom } from "./rooms/ParkourRoom";

const port = Number(process.env.PORT) || 8080;
const app = express();

// Enable CORS for all origins
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("Parkour Server is running! 🎮");
});

// Create HTTP server
const httpServer = createServer(app);

// Create Colyseus server with WebSocketTransport
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
    pingInterval: 6000,
    pingMaxRetries: 4,
  }),
});

// Register room
gameServer.define("parkour_room", ParkourRoom);

// Colyseus monitor
app.use("/colyseus", monitor());

// Listen
httpServer.listen(port, "0.0.0.0", () => {
  console.log("=================================");
  console.log(`🚀 Server listening on port ${port}`);
  console.log(`📡 WebSocket: ws://localhost:${port}`);
  console.log(`🌐 Public: wss://test-parkour-server-production.up.railway.app`);
  console.log("=================================");
});
