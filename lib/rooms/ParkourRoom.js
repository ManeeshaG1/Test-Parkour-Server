"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParkourRoom = exports.ParkourRoomState = exports.Player = void 0;
const colyseus_1 = require("colyseus");
const schema_1 = require("@colyseus/schema");
class Player extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.x = 0;
        this.y = 1;
        this.z = 0;
        this.rotX = 0;
        this.rotY = 0;
        this.rotZ = 0;
        this.rotW = 1;
        this.velocityX = 0;
        this.velocityY = 0;
        this.velocityZ = 0;
        this.currentAnimation = "Idle";
        this.isGrounded = true;
        this.name = "";
        this.score = 0;
        this.isReady = false;
    }
}
exports.Player = Player;
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "x", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "y", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "z", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "rotX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "rotY", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "rotZ", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "rotW", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "velocityX", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "velocityY", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "velocityZ", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "currentAnimation", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "isGrounded", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], Player.prototype, "name", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], Player.prototype, "score", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], Player.prototype, "isReady", void 0);
class ParkourRoomState extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.players = new schema_1.MapSchema();
        this.roomId = "";
        this.maxPlayers = 4;
        this.gameStarted = false;
        this.roundTime = 0;
    }
}
exports.ParkourRoomState = ParkourRoomState;
__decorate([
    (0, schema_1.type)({ map: Player }),
    __metadata("design:type", Object)
], ParkourRoomState.prototype, "players", void 0);
__decorate([
    (0, schema_1.type)("string"),
    __metadata("design:type", String)
], ParkourRoomState.prototype, "roomId", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ParkourRoomState.prototype, "maxPlayers", void 0);
__decorate([
    (0, schema_1.type)("boolean"),
    __metadata("design:type", Boolean)
], ParkourRoomState.prototype, "gameStarted", void 0);
__decorate([
    (0, schema_1.type)("number"),
    __metadata("design:type", Number)
], ParkourRoomState.prototype, "roundTime", void 0);
// -------------------------
// ParkourRoom
// -------------------------
class ParkourRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = 4;
        this.gameTimer = null;
    }
    onCreate(options) {
        console.log("ParkourRoom created");
        this.setState(new ParkourRoomState());
        // Always generate and set roomId
        this.state.roomId = this.generateRoomId();
        this.roomId = this.state.roomId;
        console.log("Room Code:", this.state.roomId);
        // -------------------------
        // Player movement updates
        // -------------------------
        this.onMessage("playerMove", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (!player)
                return;
            player.x = message.x;
            player.y = message.y;
            player.z = message.z;
            player.rotX = message.rotX;
            player.rotY = message.rotY;
            player.rotZ = message.rotZ;
            player.rotW = message.rotW;
            player.velocityX = message.velocityX ?? 0;
            player.velocityY = message.velocityY ?? 0;
            player.velocityZ = message.velocityZ ?? 0;
            player.currentAnimation = message.currentAnimation ?? "Idle";
            player.isGrounded = message.isGrounded ?? true;
        });
        // -------------------------
        // Ready toggle
        // -------------------------
        this.onMessage("toggleReady", (client) => {
            const player = this.state.players.get(client.sessionId);
            if (!player)
                return;
            player.isReady = !player.isReady;
            console.log(`${player.name} is ${player.isReady ? "READY" : "NOT READY"}`);
            this.checkAllPlayersReady();
        });
        this.onMessage("updateScore", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (!player)
                return;
            player.score = message.score;
            console.log(`${player.name} score: ${player.score}`);
            this.broadcast("scoreUpdate", {
                playerName: player.name,
                score: player.score,
            });
        });
    }
    onJoin(client, options) {
        console.log(`Client ${client.sessionId} joining room...`);
        console.log("Options received from client:", options);
        // Check if playerName exists and is valid
        let playerName;
        if (options &&
            typeof options.playerName === "string" &&
            options.playerName.length > 0) {
            playerName = options.playerName;
        }
        else {
            playerName = `Player${this.clients.length}`;
            console.warn(`Client ${client.sessionId} did not provide a valid playerName. Using default: ${playerName}`);
        }
        console.log(`${playerName} joined! Session: ${client.sessionId}`);
        const player = new Player();
        player.name = playerName;
        player.isReady = false;
        // Initial spawn
        player.x = 0;
        player.y = 1;
        player.z = 0;
        this.state.players.set(client.sessionId, player);
        // WAIT for next tick before sending messages
        this.clock.setTimeout(() => {
            client.send("roomInfo", {
                roomId: this.state.roomId,
                playerCount: this.state.players.size,
            });
        }, 100);
        console.log(`Players in room: ${this.state.players.size}/${this.maxClients}`);
        // Send waiting status to all clients
        this.broadcast("lobbyUpdate", {
            playerCount: this.state.players.size,
            maxPlayers: this.maxClients,
            message: this.state.players.size < 4
                ? `Waiting for ${4 - this.state.players.size} more player(s)...`
                : "All players joined! Press READY to start",
        });
    }
    onLeave(client, consented) {
        const player = this.state.players.get(client.sessionId);
        const playerName = player ? player.name : client.sessionId;
        console.log(`${playerName} left`);
        this.state.players.delete(client.sessionId);
        console.log(`Players remaining: ${this.state.players.size}`);
        if (this.state.players.size > 0 && !this.state.gameStarted) {
            this.checkAllPlayersReady();
        }
        if (this.state.players.size === 0 && this.state.gameStarted) {
            console.log("No players left, ending game");
            this.endGame();
        }
    }
    onDispose() {
        console.log("Room", this.roomId, "disposing");
        if (this.gameTimer) {
            this.gameTimer.clear();
            this.gameTimer = null;
        }
    }
    checkAllPlayersReady() {
        const minPlayers = 4;
        if (this.state.players.size < minPlayers) {
            console.log(`Waiting for more players: ${this.state.players.size}/${minPlayers}`);
            return;
        }
        if (this.state.gameStarted)
            return;
        let allReady = true;
        let readyCount = 0;
        this.state.players.forEach((player) => {
            if (player.isReady)
                readyCount++;
            else
                allReady = false;
        });
        console.log(`Ready Status: ${readyCount}/${this.state.players.size}`);
        if (allReady) {
            console.log(`All ${this.state.players.size} players ready! Starting game in 2 seconds...`);
            this.clock.setTimeout(() => {
                this.startGame();
            }, 2000);
        }
    }
    startGame() {
        if (this.state.gameStarted)
            return;
        this.state.gameStarted = true;
        this.state.roundTime = 180; // 3 minutes
        this.broadcast("gameStarted", {
            message: "Game has started!",
            roundTime: this.state.roundTime,
        });
        console.log("GAME STARTED! Round Time:", this.state.roundTime, "seconds");
        this.gameTimer = this.clock.setInterval(() => {
            if (this.state.roundTime > 0) {
                this.state.roundTime -= 1;
                if (this.state.roundTime === 60)
                    this.broadcast("timeWarning", { message: "1 minute remaining!" });
                if (this.state.roundTime === 30)
                    this.broadcast("timeWarning", { message: "30 seconds remaining!" });
                if (this.state.roundTime === 10)
                    this.broadcast("timeWarning", { message: "10 seconds remaining!" });
            }
            else {
                this.broadcast("timeUp", { message: "Time's up!" });
                this.endGame();
            }
        }, 1000);
    }
    endGame() {
        if (!this.state.gameStarted)
            return;
        if (this.gameTimer) {
            this.gameTimer.clear();
            this.gameTimer = null;
        }
        this.state.gameStarted = false;
        let winner = null;
        let highestScore = -1;
        this.state.players.forEach((player) => {
            if (player.score > highestScore) {
                highestScore = player.score;
                winner = player;
            }
        });
    }
    generateRoomId() {
        const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let i = 0; i < 4; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
}
exports.ParkourRoom = ParkourRoom;
