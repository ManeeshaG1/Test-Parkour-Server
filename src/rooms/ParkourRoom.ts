import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

// ============================
// Player Schema
// ============================
export class Player extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 1;
  @type("number") z: number = 0;

  @type("number") rotX: number = 0;
  @type("number") rotY: number = 0;
  @type("number") rotZ: number = 0;
  @type("number") rotW: number = 1;

  @type("number") velocityX: number = 0;
  @type("number") velocityY: number = 0;
  @type("number") velocityZ: number = 0;

  @type("string") currentAnimation: string = "Idle";
  @type("boolean") isGrounded: boolean = true;

  @type("string") name: string = "";
  @type("number") score: number = 0;
  @type("boolean") isReady: boolean = false;
}

// ============================
// Room State
// ============================
export class ParkourRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") roomId: string = "";
  @type("number") maxPlayers: number = 4;
  @type("boolean") gameStarted: boolean = false;
  @type("number") roundTime: number = 0;
}

// ============================
// ParkourRoom
// ============================
export class ParkourRoom extends Room<ParkourRoomState> {
  maxClients = 4;
  private gameTimer: any = null;

  onCreate(options: any) {
    console.log("ParkourRoom created");

    this.setState(new ParkourRoomState());

    if (options.create) {
      this.state.roomId = this.generateRoomId();
      this.roomId = this.state.roomId;
      console.log("Room Code:", this.state.roomId);
    }

    // ======================
    // Player Movement
    // ======================
    this.onMessage("playerMove", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

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

    // ======================
    // Ready Toggle
    // ======================
    this.onMessage("toggleReady", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.isReady = !player.isReady;
      console.log(
        `${player.name} is ${player.isReady ? "READY" : "NOT READY"}`
      );

      this.checkAllPlayersReady();
    });

    // ======================
    // Score Update
    // ======================
    this.onMessage("updateScore", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.score = message.score;
      console.log(`${player.name} score: ${player.score}`);

      this.broadcast("scoreUpdate", {
        playerName: player.name,
        score: player.score,
      });
    });
  }

  onJoin(client: Client, options: any) {
    const playerName = options.playerName || `Player${this.clients.length}`;

    console.log(`${playerName} joined! Session: ${client.sessionId}`);

    const player = new Player();
    player.name = playerName;

    this.state.players.set(client.sessionId, player);

    client.send("roomInfo", {
      roomId: this.state.roomId,
      playerCount: this.state.players.size,
    });

    this.broadcast("lobbyUpdate", {
      playerCount: this.state.players.size,
      maxPlayers: this.maxClients,
      message:
        this.state.players.size < 4
          ? `Waiting for ${4 - this.state.players.size} more player(s)...`
          : "All players joined! Press READY to start",
    });
  }

  onLeave(client: Client) {
    const player = this.state.players.get(client.sessionId);
    const playerName = player ? player.name : client.sessionId;

    console.log(`${playerName} left`);

    this.state.players.delete(client.sessionId);

    if (this.state.players.size > 0 && !this.state.gameStarted) {
      this.checkAllPlayersReady();
    }

    if (this.state.players.size === 0 && this.state.gameStarted) {
      console.log("No players left, ending game");
      this.endGame();
    }
  }

  onDispose() {
    console.log(`Room ${this.roomId} disposing...`);

    if (this.gameTimer) {
      this.gameTimer.clear();
      this.gameTimer = null;
    }
  }

  // ============================
  // Ready Check
  // ============================
  private checkAllPlayersReady() {
    if (this.state.players.size < 4) return;
    if (this.state.gameStarted) return;

    const allReady = [...this.state.players.values()].every((p) => p.isReady);

    if (allReady) {
      console.log("All players ready, starting game in 2 seconds...");
      this.clock.setTimeout(() => this.startGame(), 2000);
    }
  }

  // ============================
  // Start Game
  // ============================
  private startGame() {
    if (this.state.gameStarted) return;

    this.state.gameStarted = true;
    this.state.roundTime = 180;

    this.broadcast("gameStarted", {
      message: "Game has started!",
      roundTime: this.state.roundTime,
    });

    this.gameTimer = this.clock.setInterval(() => {
      if (this.state.roundTime > 0) {
        this.state.roundTime -= 1;

        if (this.state.roundTime === 60)
          this.broadcast("timeWarning", { message: "1 minute left!" });

        if (this.state.roundTime === 30)
          this.broadcast("timeWarning", { message: "30 seconds left!" });

        if (this.state.roundTime === 10)
          this.broadcast("timeWarning", { message: "10 seconds left!" });
      } else {
        this.broadcast("timeUp", { message: "Time's up!" });
        this.endGame();
      }
    }, 1000);
  }

  // ============================
  // End Game
  // ============================
  private endGame() {
    if (!this.state.gameStarted) return;

    if (this.gameTimer) {
      this.gameTimer.clear();
      this.gameTimer = null;
    }

    this.state.gameStarted = false;
  }

  // ============================
  // Room ID Generator
  // ============================
  private generateRoomId(): string {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

// =================================
// 🔥 FINAL EXPORT FIX
// =================================
export { Player, ParkourRoomState, ParkourRoom };
