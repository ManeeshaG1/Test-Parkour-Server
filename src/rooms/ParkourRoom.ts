import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

// Player schema - must match Unity Player class exactly
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

// Room state - must match Unity ParkourRoomState class exactly
export class ParkourRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") roomId: string = "";
  @type("number") maxPlayers: number = 4;
  @type("boolean") gameStarted: boolean = false;
  @type("number") roundTime: number = 0;
}

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

    // Handle player movement updates
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

    // Handle ready toggle
    this.onMessage("toggleReady", (client) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      player.isReady = !player.isReady;
      console.log(
        `${player.name} is ${player.isReady ? "READY" : "NOT READY"}`
      );

      this.checkAllPlayersReady();
    });

    // Handle score updates
    this.onMessage("updateScore", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.score = message.score;
        console.log(`${player.name} score: ${player.score}`);
        this.broadcast("scoreUpdate", {
          playerName: player.name,
          score: player.score,
        });
      }
    });
  }

  onJoin(client: Client, options: any) {
    const playerName = options.playerName || `Player${this.clients.length}`;
    console.log(`${playerName} joined! Session: ${client.sessionId}`);

    const player = new Player();
    player.name = playerName;
    player.isReady = false;

    // Set initial spawn position (will be overridden by Unity spawn points)
    player.x = 0;
    player.y = 1;
    player.z = 0;

    this.state.players.set(client.sessionId, player);

    // Send room info to the joining client
    client.send("roomInfo", {
      roomId: this.state.roomId,
      playerCount: this.state.players.size,
    });

    console.log(
      `Players in room: ${this.state.players.size}/${this.maxClients}`
    );
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    const playerName = player ? player.name : client.sessionId;

    console.log(`${playerName} left`);
    this.state.players.delete(client.sessionId);
    console.log(`Players remaining: ${this.state.players.size}`);

    // Recheck ready status if game hasn't started
    if (this.state.players.size > 0 && !this.state.gameStarted) {
      this.checkAllPlayersReady();
    }

    // End game if no players left
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
    // MUST HAVE EXACTLY 4 PLAYERS
    if (this.state.players.size !== 4) {
      console.log(`Waiting for more players: ${this.state.players.size}/4`);
      return;
    }

    if (this.state.gameStarted) return;

    let allReady = true;
    let readyCount = 0;

    this.state.players.forEach((player) => {
      if (player.isReady) {
        readyCount++;
      } else {
        allReady = false;
      }
    });

    console.log(`Ready Status: ${readyCount}/${this.state.players.size}`);

    // Start game when ALL 4 PLAYERS are ready
    if (allReady && this.state.players.size === 4) {
      console.log("All 4 players ready! Starting game in 2 seconds...");

      // Small delay before starting game
      this.clock.setTimeout(() => {
        this.startGame();
      }, 2000);
    }
  }

  private startGame() {
    if (this.state.gameStarted) {
      console.log("Game already started");
      return;
    }

    this.state.gameStarted = true;
    this.state.roundTime = 180; // 3 minutes

    // Broadcast game started
    this.broadcast("gameStarted", {
      message: "Game has started!",
      roundTime: this.state.roundTime,
    });

    console.log("GAME STARTED! Round Time:", this.state.roundTime, "seconds");

    // Start game timer
    this.gameTimer = this.clock.setInterval(() => {
      if (this.state.roundTime > 0) {
        this.state.roundTime -= 1;

        // Time warnings
        if (this.state.roundTime === 60) {
          this.broadcast("timeWarning", { message: "1 minute remaining!" });
        } else if (this.state.roundTime === 30) {
          this.broadcast("timeWarning", { message: "30 seconds remaining!" });
        } else if (this.state.roundTime === 10) {
          this.broadcast("timeWarning", { message: "10 seconds remaining!" });
        }
      } else {
        this.broadcast("timeUp", { message: "Time's up!" });
        this.endGame();
      }
    }, 1000);
  }

  private endGame() {
    if (!this.state.gameStarted) return;

    // Stop game timer
    if (this.gameTimer) {
      this.gameTimer.clear();
      this.gameTimer = null;
    }

    this.state.gameStarted = false;

    // Find winner
    let winner: Player | null = null;
    let highestScore = -1;

    this.state.players.forEach((player) => {
      if (player.score > highestScore) {
        highestScore = player.score;
        winner = player;
      }
    });

    // Broadcast game end
    this.broadcast("gameEnded", {
      winner: winner ? winner.name : "No winner",
      highestScore: highestScore,
    });

    console.log("GAME ENDED!");
    if (winner) {
      console.log(`Winner: ${winner.name} with ${highestScore} points`);
    }

    // Reset all players' ready status
    this.state.players.forEach((player) => {
      player.isReady = false;
      player.score = 0;
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
