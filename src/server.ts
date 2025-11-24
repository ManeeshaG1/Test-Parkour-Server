import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { monitor } from "@colyseus/monitor";
import { ParkourRoom } from "./rooms/ParkourRoom";

// Get port from Railway environment
const port = Number(process.env.PORT) || 8080;

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => res.send("Parkour Server is running! 🎮"));

// Create HTTP server
const httpServer = createServer(app);

// Create WebSocketTransport
const transport = new WebSocketTransport({
  server: httpServer,
  pingInterval: 10000,
  pingMaxRetries: 5,
});

// Create Colyseus server
const gameServer = new Server({
  transport,
});

// Register parkour room
gameServer.define("parkour_room", ParkourRoom);

// Colyseus monitor (optional)
app.use("/colyseus", monitor());

// Start server
httpServer.listen(port, () => {
  console.log("=================================");
  console.log(`🚀 Server started on port ${port}`);
  console.log("=================================");
});
