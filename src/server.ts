import { Server } from "@colyseus/core";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { monitor } from "@colyseus/monitor";
import { ParkourRoom } from "./rooms/ParkourRoom";

const port = Number(process.env.PORT || 8080);

const app = express();
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Parkour Server is running! 🎮");
});

const httpServer = createServer(app);

const gameServer = new Server({
  server: httpServer,
  pingInterval: 6000,
  pingMaxRetries: 4,
});

gameServer.define("parkour_room", ParkourRoom);

app.use("/colyseus", monitor());

httpServer.listen(port, "0.0.0.0", () => {
  console.log("=================================");
  console.log(`🚀 Server listening on port ${port}`);
  console.log(`📡 WebSocket: ws://0.0.0.0:${port}`);
  console.log("=================================");
});
