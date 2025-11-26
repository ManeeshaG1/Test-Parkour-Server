import { Room, Client } from "@colyseus/core";
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
  @type("boolean") isRunning: boolean = false;
  @type("boolean") isSliding: boolean = false;
}

export class ParkourRoomState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
  @type("string") roomId: string = "";
  @type("number") maxPlayers: number = 2;
  @type("boolean") gameStarted: boolean = false;
  @type("number") roundTime: number = 0;
}

export class ParkourRoom extends Room<ParkourRoomState> {
  maxClients = 2;
  private gameTimer: any = null;

  onCreate(options: any) {
    console.log(
      "🎮 ParkourRoom created with options:",
      JSON.stringify(options)
    );
    this.setState(new ParkourRoomState());

    // Always generate and set roomId
    this.state.roomId = this.generateRoomId();
    this.roomId = this.state.roomId;
    console.log("✅ Room Code:", this.state.roomId);

    // Player movement updates
    this.onMessage("playerMove", (client, message) => {
      const player = this.state.players.get(client.sessionId) as Player;
      if (!player) {
        console.warn(
          `⚠️ playerMove: Player not found for session ${client.sessionId}`
        );
        return;
      }

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

    // Ready toggle
    this.onMessage("toggleReady", (client) => {
      const player = this.state.players.get(client.sessionId) as Player;
      if (!player) {
        console.warn(
          `⚠️ toggleReady: Player not found for session ${client.sessionId}`
        );
        return;
      }

      player.isReady = !player.isReady;
      console.log(
        `${player.isReady ? "✅" : "⏳"} ${player.name} is ${
          player.isReady ? "READY" : "NOT READY"
        }`
      );
      this.checkAllPlayersReady();
    });

    this.onMessage("updateScore", (client, message) => {
      const player = this.state.players.get(client.sessionId) as Player;
      if (!player) {
        console.warn(
          `⚠️ updateScore: Player not found for session ${client.sessionId}`
        );
        return;
      }

      player.score = message.score;
      console.log(`🎯 ${player.name} score: ${player.score}`);

      this.broadcast("scoreUpdate", {
        playerName: player.name,
        score: player.score,
      });
    });

    console.log("✅ All message handlers registered");
  }

  onJoin(client: Client, options: any) {
    console.log(`👤 Client ${client.sessionId} attempting to join...`);
    console.log("📦 Options received:", JSON.stringify(options));

    try {
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
          `⚠️ No valid playerName provided. Using default: ${playerName}`
        );
      }

      console.log(`✅ ${playerName} joined! Session: ${client.sessionId}`);

      const player = new Player();
      player.name = playerName;
      player.isReady = false;
      player.x = 0;
      player.y = 1;
      player.z = 0;

      this.state.players.set(client.sessionId, player);

      // Send room info after delay
      this.clock.setTimeout(() => {
        try {
          client.send("roomInfo", {
            roomId: this.state.roomId,
            playerCount: this.state.players.size,
          });
          console.log(`📤 Sent roomInfo to ${playerName}`);
        } catch (error) {
          console.error(`❌ Error sending roomInfo to ${playerName}:`, error);
        }
      }, 100);

      console.log(
        `👥 Players in room: ${this.state.players.size}/${this.maxClients}`
      );

      this.broadcast("lobbyUpdate", {
        playerCount: this.state.players.size,
        maxPlayers: this.maxClients,
        message:
          this.state.players.size < 2
            ? `Waiting for ${2 - this.state.players.size} more player(s)...`
            : "All players joined! Press READY to start",
      });
    } catch (error) {
      console.error(`❌ Error in onJoin for ${client.sessionId}:`, error);
    }
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId) as
      | Player
      | undefined;
    const playerName = player ? player.name : client.sessionId;

    console.log(`👋 ${playerName} left (consented: ${consented})`);
    this.state.players.delete(client.sessionId);
    console.log(`👥 Players remaining: ${this.state.players.size}`);

    if (this.state.players.size > 0 && !this.state.gameStarted) {
      this.checkAllPlayersReady();
    }

    if (this.state.players.size === 0) {
      if (this.state.gameStarted) {
        console.log("🛑 No players left, ending game");
        this.endGame();
      }
      console.log("🗑️ Room will dispose soon (no players)");
    }
  }

  onDispose() {
    console.log("🗑️ Room", this.roomId, "disposing");

    if (this.gameTimer) {
      this.gameTimer.clear();
      this.gameTimer = null;
    }
  }

  private checkAllPlayersReady() {
    const minPlayers = 2;
    if (this.state.players.size < minPlayers) {
      console.log(
        `⏳ Waiting for more players: ${this.state.players.size}/${minPlayers}`
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

    console.log(`📊 Ready Status: ${readyCount}/${this.state.players.size}`);

    if (allReady) {
      console.log(
        `🎉 All ${this.state.players.size} players ready! Starting game in 2 seconds...`
      );

      this.clock.setTimeout(() => {
        this.startGame();
      }, 2000);
    }
  }

  private startGame() {
    if (this.state.gameStarted) return;

    this.state.gameStarted = true;
    this.state.roundTime = 180;

    this.broadcast("gameStarted", {
      message: "Game has started!",
      roundTime: this.state.roundTime,
    });

    console.log(
      "🚀 GAME STARTED! Round Time:",
      this.state.roundTime,
      "seconds"
    );

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

    console.log("🏁 Game ended!");
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
