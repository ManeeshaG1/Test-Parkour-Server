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
