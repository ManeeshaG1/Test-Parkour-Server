import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { monitor } from "@colyseus/monitor";
import { ParkourRoom } from "./rooms/ParkourRoom";

// Get port from Railway environment
const port = Number(process.env.PORT);

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get("/", (req, res) => res.send("Parkour Server is running! 🎮"));

// Create a single HTTP server for both Express and Colyseus
const httpServer = createServer(app);

// Create Colyseus server using that HTTP server
const gameServer = new Server({
  server: httpServer,
});

// Register parkour room
gameServer.define("parkour_room", ParkourRoom);

// Colyseus monitor (optional, works only locally)
app.use("/colyseus", monitor());

// Start server
httpServer.listen(port, () => {
  console.log("=================================");
  console.log(`🚀 Server started on port ${port}`);
  console.log("=================================");
});
