import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { monitor } from "@colyseus/monitor";
import { ParkourRoom } from "./rooms/ParkourRoom";

// Server configuration
const port = Number(process.env.PORT || 2567);
const app = express();

// Enable CORS for Unity WebGL
app.use(cors());
app.use(express.json());

// Create Colyseus server
const gameServer = new Server({
  server: createServer(app),
  express: app,
});

// Register the parkour room
// filterBy allows multiple rooms with same name but different IDs
gameServer.define("parkour_room", ParkourRoom)
  .filterBy(['roomId']);

// Monitor panel - view at http://localhost:2567/colyseus
app.use("/colyseus", monitor());

// Basic health check endpoint
app.get("/", (req, res) => {
  res.send("Parkour Server is running! 🎮");
});

// Start the server
gameServer.listen(port);

console.log("=================================");
console.log(`🚀 Server started on port ${port}`);
console.log(`📊 Monitor: http://localhost:${port}/colyseus`);
console.log("=================================");