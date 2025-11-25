"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const colyseus_1 = require("colyseus");
const ws_transport_1 = require("@colyseus/ws-transport");
const http_1 = require("http");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const monitor_1 = require("@colyseus/monitor");
const ParkourRoom_1 = require("./rooms/ParkourRoom");
const port = Number(process.env.PORT || 8080);
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.get("/", (req, res) => {
    res.send("Parkour Server is running! 🎮");
});
const httpServer = (0, http_1.createServer)(app);
const gameServer = new colyseus_1.Server({
    transport: new ws_transport_1.WebSocketTransport({
        server: httpServer,
        pingInterval: 6000,
        pingMaxRetries: 4,
    }),
});
gameServer.define("parkour_room", ParkourRoom_1.ParkourRoom);
app.use("/colyseus", (0, monitor_1.monitor)());
httpServer.listen(port, "0.0.0.0", () => {
    console.log("=================================");
    console.log(`🚀 Server listening on port ${port}`);
    console.log(`📡 WebSocket: ws://localhost:${port}`);
    console.log(`🌐 Public: wss://test-parkour-server-production.up.railway.app`);
    console.log("=================================");
});
