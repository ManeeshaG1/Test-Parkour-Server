import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

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

export class ParkourRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") roomId: string = "";
  @type("number") maxPlayers: number = 4;
  @type("boolean") gameStarted: boolean = false;
  @type("number") roundTime: number = 0;
}

// -------------------------
// ParkourRoom
// -------------------------
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

    // -------------------------
    // Player movement updates
    // -------------------------
    this.onMessage("playerMove", (client, message) => {
      const player = this.state.players.get(client.sessionId) as Player;
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

    // -------------------------
    // Ready toggle
    // -------------------------
    this.onMessage("toggleReady", (client) => {
      const player = this.state.players.get(client.sessionId) as Player;
      if (!player) return;

      player.isReady = !player.isReady;
      console.log(
        `${player.name} is ${player.isReady ? "READY" : "NOT READY"}`
      );
      this.checkAllPlayersReady();
    });

    this.onMessage("updateScore", (client, message) => {
      const player = this.state.players.get(client.sessionId) as Player;
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
    console.log(`Client ${client.sessionId} joining room...`);
    console.log("Options received from client:", options);

    // Check if playerName exists and is valid
    let playerName: string;
    if (
      options &&
      typeof options.playerName === "string" &&
      options.playerName.length > 0
    ) {
      playerName = options.playerName;
    } else {
      playerName = `Player${this.clients.length}`;
      console.warn(
        `Client ${client.sessionId} did not provide a valid playerName. Using default: ${playerName}`
      );
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

    // Send room info to client
    client.send("roomInfo", {
      roomId: this.state.roomId,
      playerCount: this.state.players.size,
    });

    console.log(
      `Players in room: ${this.state.players.size}/${this.maxClients}`
    );

    // Send waiting status to all clients
    this.broadcast("lobbyUpdate", {
      playerCount: this.state.players.size,
      maxPlayers: this.maxClients,
      message:
        this.state.players.size < 4
          ? `Waiting for ${4 - this.state.players.size} more player(s)...`
          : "All players joined! Press READY to start",
    });
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId) as
      | Player
      | undefined;
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

  private checkAllPlayersReady() {
    const minPlayers = 4;
    if (this.state.players.size < minPlayers) {
      console.log(
        `Waiting for more players: ${this.state.players.size}/${minPlayers}`
      );
      return;
    }

    if (this.state.gameStarted) return;

    let allReady = true;
    let readyCount = 0;

    this.state.players.forEach((player: Player) => {
      if (player.isReady) readyCount++;
      else allReady = false;
    });

    console.log(`Ready Status: ${readyCount}/${this.state.players.size}`);

    if (allReady) {
      console.log(
        `All ${this.state.players.size} players ready! Starting game in 2 seconds...`
      );

      this.clock.setTimeout(() => {
        this.startGame();
      }, 2000);
    }
  }

  private startGame() {
    if (this.state.gameStarted) return;

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
      } else {
        this.broadcast("timeUp", { message: "Time's up!" });
        this.endGame();
      }
    }, 1000);
  }

  private endGame() {
    if (!this.state.gameStarted) return;

    if (this.gameTimer) {
      this.gameTimer.clear();
      this.gameTimer = null;
    }

    this.state.gameStarted = false;

    let winner: Player | null = null;
    let highestScore = -1;

    this.state.players.forEach((player: Player) => {
      if (player.score > highestScore) {
        highestScore = player.score;
        winner = player;
      }
    });
  }

  private generateRoomId(): string {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}
