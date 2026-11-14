"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { getMazeRoom, isCorrectGate, type Gate } from "../lib/game";

export default function GameCanvas({ code }: { code: string }) {
  const [onlinePlayers, setOnlinePlayers] = useState(0);
  const [syncError, setSyncError] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    let channel: any = null;
    let roomId = "";
    let playerId = "";
    let playerName = "Player";
    let initialRoom = 1;
    let initialAlive = true;
    let initialWinner = false;
    let lastBroadcastAt = 0;

    async function startGame() {
      if (!containerRef.current || gameRef.current) return;

      const storedPlayerId = localStorage.getItem(`mrp_player_id_${code}`);
      if (!storedPlayerId) {
        setSyncError("Player session not found. Please rejoin this room.");
        return;
      }
      playerId = storedPlayerId;

      const { data: roomRows, error: roomError } = await supabase
        .from("rooms")
        .select("id")
        .eq("code", code.toUpperCase())
        .limit(1);
      if (roomError || !roomRows?.length) {
        setSyncError(roomError?.message || "Room not found.");
        return;
      }
      roomId = roomRows[0].id;

      const { data: me, error: playerError } = await supabase
        .from("players")
        .select("id, name, current_room, is_alive, is_winner")
        .eq("id", playerId)
        .eq("room_id", roomId)
        .maybeSingle();
      if (playerError || !me) {
        setSyncError(playerError?.message || "Your player record was not found. Rejoin the room.");
        return;
      }

      playerName = me.name || "Player";
      initialRoom = me.current_room ?? 1;
      initialAlive = me.is_alive ?? true;
      initialWinner = me.is_winner ?? false;

      if (cancelled) return;

      const Phaser = (await import("phaser")).default;
      if (cancelled || !containerRef.current) return;

      channel = supabase.channel(`maze-room-${roomId}`, {
        config: {
          broadcast: { self: false },
          presence: { key: playerId },
        },
      });

      channel
        .on("broadcast", { event: "player-move" }, ({ payload }: any) => {
          if (payload?.playerId !== playerId) sceneRef.current?.updateRemotePlayer(payload);
        })
        .on("broadcast", { event: "player-state" }, ({ payload }: any) => {
          if (payload?.playerId !== playerId) sceneRef.current?.updateRemotePlayer(payload);
        })
        .on("presence", { event: "sync" }, () => {
          const presence = channel.presenceState();
          console.log("PRESENCE STATE:", presence);
          console.log("PRESENCE KEYS:", Object.keys(presence));
          console.log("MY PLAYER ID:", playerId);
          const uniqueIds = new Set<string>();
          Object.values(presence).forEach((entries: any) => {
            entries.forEach((entry: any) => {
              if (entry.playerId) {
                uniqueIds.add(entry.playerId);
                if (entry.playerId !== playerId) {
                  sceneRef.current?.updateRemotePlayer({
                    playerId: entry.playerId,
                    name: entry.name,
                    roomNumber: entry.roomNumber,
                    x: 450,
                    y: 330,
                    is_alive: entry.is_alive,
                    is_winner: entry.is_winner,
                  });
                }
              }
            });
          });
          setOnlinePlayers(uniqueIds.size);
        })
        .subscribe(async (status: string) => {
          if (status === "SUBSCRIBED") {
            setSyncError("");
            // await channel.track({
            //   playerId,
            //   name: playerName,
            //   roomNumber: initialRoom,
            //   online_at: new Date().toISOString(),
            // });
            const trackResult = await channel.track({
              playerId,
              name: playerName,
              roomNumber: initialRoom,
              online_at: new Date().toISOString(),
            });

            console.log("TRACK RESULT:", trackResult);
            console.log("PLAYER ID:", playerId);
            console.log("PRESENCE STATE:", channel.presenceState());
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            setSyncError("Realtime connection failed. Check Supabase Realtime settings.");
          }
        });

      class MazeScene extends Phaser.Scene {
        player!: any;
        cursors!: any;
        keys!: any;
        touchInput = { up: false, down: false, left: false, right: false };

        setTouchDirection(direction: "up" | "down" | "left" | "right", pressed: boolean) {
          this.touchInput[direction] = pressed;
        }

        roomNumber = 1;
        transitioning = false;
        eliminated = false;
        won = false;

        wallRects: {
          x: number;
          y: number;
          width: number;
          height: number;
        }[] = [];

        gates: {
          label: string;
          x: number;
          y: number;
          width: number;
          height: number;
        }[] = [];

        roomTitle!: any;
        clueText!: any;
        remotePlayers: Map<string, { sprite: any; label: any }> = new Map();

        constructor() {
          super("MazeScene");
        }

        create() {
          sceneRef.current = this;
          this.createRoom(initialRoom);
          if (!initialAlive) {
            this.eliminated = true;
            this.finishGame("YOU ARE ELIMINATED", "Your run has already ended.");
          } else if (initialWinner) {
            this.won = true;
            this.finishGame("TREASURE FOUND!", "You have already claimed the treasure.");
          }
        }

        updateRemotePlayer(payload: any) {
          if (!payload?.playerId || payload.playerId === playerId) return;
          let remote = this.remotePlayers.get(payload.playerId);
          if (!remote) {
            const sprite = this.add.circle(payload.x ?? 450, payload.y ?? 330, 15, 0x45a3ff, 0.9);
            const label = this.add.text(payload.x ?? 450, (payload.y ?? 330) - 25, payload.name || "Player", {
              fontFamily: "Arial", fontSize: "11px", color: "#8ecaff",
            }).setOrigin(0.5);
            remote = { sprite, label };
            this.remotePlayers.set(payload.playerId, remote);
          }
          const sameRoom = payload.roomNumber === this.roomNumber && payload.is_alive !== false && payload.is_winner !== true;
          remote.sprite.setVisible(sameRoom);
          remote.label.setVisible(sameRoom);
          if (sameRoom && typeof payload.x === "number" && typeof payload.y === "number") {
            remote.sprite.setPosition(payload.x, payload.y);
            remote.label.setPosition(payload.x, payload.y - 25);
          }
        }

        broadcastState(extra: Record<string, any> = {}) {
          if (!channel) return;
          channel.send({
            type: "broadcast",
            event: "player-state",
            payload: {
              playerId, name: playerName, roomNumber: this.roomNumber,
              x: this.player?.x ?? 450, y: this.player?.y ?? 330,
              is_alive: !this.eliminated, is_winner: this.won, ...extra,
            },
          });
          channel.track({
            playerId, name: playerName, roomNumber: this.roomNumber,
            is_alive: !this.eliminated, is_winner: this.won,
          });
        }

        // =====================================================
        // CREATE ROOM
        // =====================================================

        createRoom(roomNumber: number) {
          this.roomNumber = roomNumber;
          this.transitioning = false;
          this.touchInput = { up: false, down: false, left: false, right: false };

          this.children.removeAll();
          this.remotePlayers.clear();

          this.wallRects = [];
          this.gates = [];

          const width = 900;
          const height = 600;

          // =====================================================
          // BACKGROUND
          // =====================================================

          this.add
            .rectangle(
              width / 2,
              height / 2,
              width,
              height,
              0x08090c
            )
            .setStrokeStyle(2, 0x333333);

          // =====================================================
          // HEADER
          // =====================================================

          this.add.text(
            35,
            25,
            "BHOOL BHULAIYAA",
            {
              fontFamily: "Arial",
              fontSize: "30px",
              color: "#ffffff",
              fontStyle: "bold",
            }
          );

          const room = getMazeRoom(roomNumber);

          this.roomTitle = this.add.text(
            35,
            62,
            room.title,
            {
              fontFamily: "Arial",
              fontSize: "16px",
              color: "#777f91",
            }
          );

          // =====================================================
          // CLUE
          // =====================================================

          this.add
            .rectangle(
              width / 2,
              125,
              650,
              75,
              0x15171c
            )
            .setStrokeStyle(1, 0x444444);

          this.add
            .text(
              width / 2,
              105,
              "CLUE",
              {
                fontFamily: "Arial",
                fontSize: "14px",
                color: "#8b93a6",
                fontStyle: "bold",
              }
            )
            .setOrigin(0.5);

          this.clueText = this.add
            .text(
              width / 2,
              140,
              room.clue,
              {
                fontFamily: "Arial",
                fontSize: "17px",
                color: "#ffffff",
                align: "center",
              }
            )
            .setOrigin(0.5);

          // =====================================================
          // MAZE WALLS
          // =====================================================

          const wallColor = 0x252830;

          // -----------------------------------------------------
          // TOP WALL
          // -----------------------------------------------------

          this.createWall(
            width / 2,
            215,
            800,
            18,
            wallColor
          );

          // -----------------------------------------------------
          // LEFT WALL
          // -----------------------------------------------------

          this.createWall(
            50,
            375,
            18,
            320,
            wallColor
          );

          // -----------------------------------------------------
          // RIGHT WALL
          // -----------------------------------------------------

          this.createWall(
            850,
            375,
            18,
            320,
            wallColor
          );

          // -----------------------------------------------------
          // BOTTOM WALL
          //
          // IMPORTANT:
          // There are 3 openings for Gate A/B/C.
          // -----------------------------------------------------

          this.createWall(
            130,
            535,
            140,
            18,
            wallColor
          );

          this.createWall(
            335,
            535,
            110,
            18,
            wallColor
          );

          this.createWall(
            555,
            535,
            110,
            18,
            wallColor
          );

          this.createWall(
            770,
            535,
            140,
            18,
            wallColor
          );

          // =====================================================
          // INNER WALLS
          // =====================================================

          //   this.createWall(
          //     280,
          //     350,
          //     18,
          //     180,
          //     wallColor
          //   );

          //   this.createWall(
          //     620,
          //     350,
          //     18,
          //     180,
          //     wallColor
          //   );

          // =====================================================
          // ROOM 01 MAZE WALLS
          // =====================================================

          if (roomNumber === 1) {
            // Left vertical wall
            this.createWall(
              300,
              330,
              12,
              100,
              wallColor
            );

            // Right vertical wall
            this.createWall(
              600,
              330,
              12,
              100,
              wallColor
            );

            // Top middle wall
            this.createWall(
              450,
              300,
              120,
              12,
              wallColor
            );

            // Bottom-left wall
            this.createWall(
              300,
              430,
              140,
              12,
              wallColor
            );

            // Bottom-right wall
            this.createWall(
              600,
              430,
              140,
              12,
              wallColor
            );

            // Small center wall
            this.createWall(
              450,
              455,
              12,
              45,
              wallColor
            );
          }



          // =====================================================
          // PLAYER
          // =====================================================

          this.player = this.add.circle(
            width / 2,
            330,
            18,
            0xffffff
          );

          this.add
            .text(
              width / 2,
              360,
              "YOU",
              {
                fontFamily: "Arial",
                fontSize: "12px",
                color: "#ffffff",
                fontStyle: "bold",
              }
            )
            .setOrigin(0.5);

          // =====================================================
          // GATES
          // =====================================================

          this.createGate(220, 495, "A", room.gates.A.name);
          this.createGate(450, 495, "B", room.gates.B.name);
          this.createGate(680, 495, "C", room.gates.C.name);

          // =====================================================
          // CONTROLS
          // =====================================================

          this.add
            .text(
              width / 2,
              570,
              "W A S D  /  ARROW KEYS  —  MOVE",
              {
                fontFamily: "Arial",
                fontSize: "14px",
                color: "#666d7d",
              }
            )
            .setOrigin(0.5);

          // =====================================================
          // KEYBOARD
          // =====================================================

          this.cursors =
            this.input.keyboard?.createCursorKeys();

          this.keys =
            this.input.keyboard?.addKeys(
              "W,A,S,D"
            );

          this.cameras.main.setBackgroundColor(
            0x08090c
          );
        }

        // =====================================================
        // CREATE WALL
        // =====================================================

        createWall(
          x: number,
          y: number,
          width: number,
          height: number,
          color: number
        ) {
          this.add.rectangle(
            x,
            y,
            width,
            height,
            color
          );

          this.wallRects.push({
            x,
            y,
            width,
            height,
          });
        }

        // =====================================================
        // CREATE GATE
        // =====================================================

        createGate(
          x: number,
          y: number,
          label: string,
          name: string
        ) {
          const width = 130;
          const height = 65;

          this.add
            .rectangle(
              x,
              y,
              width,
              height,
              0x101216
            )
            .setStrokeStyle(
              2,
              0x555b69
            );

          this.add
            .text(
              x,
              y - 8,
              `GATE ${label}`,
              {
                fontFamily: "Arial",
                fontSize: "16px",
                color: "#ffffff",
                fontStyle: "bold",
              }
            )
            .setOrigin(0.5);

          this.add
            .text(
              x,
              y + 16,
              name,
              {
                fontFamily: "Arial",
                fontSize: "11px",
                color: "#777f91",
              }
            )
            .setOrigin(0.5);

          this.gates.push({
            label,
            x,
            y,
            width,
            height,
          });
        }

        // =====================================================
        // CHECK WALL COLLISION
        // =====================================================

        collidesWithWall(
          x: number,
          y: number
        ) {
          const radius = 18;

          for (const wall of this.wallRects) {
            const left =
              wall.x - wall.width / 2;

            const right =
              wall.x + wall.width / 2;

            const top =
              wall.y - wall.height / 2;

            const bottom =
              wall.y + wall.height / 2;

            const closestX =
              Phaser.Math.Clamp(
                x,
                left,
                right
              );

            const closestY =
              Phaser.Math.Clamp(
                y,
                top,
                bottom
              );

            const dx =
              x - closestX;

            const dy =
              y - closestY;

            const distance =
              Math.sqrt(
                dx * dx + dy * dy
              );

            if (distance < radius) {
              return true;
            }
          }

          return false;
        }

        // =====================================================
        // CHECK GATE
        // =====================================================

        getEnteredGate(
          x: number,
          y: number
        ) {
          const radius = 22;

          for (const gate of this.gates) {
            const left =
              gate.x - gate.width / 2;

            const right =
              gate.x + gate.width / 2;

            const top =
              gate.y - gate.height / 2;

            const bottom =
              gate.y + gate.height / 2;

            if (
              x + radius > left &&
              x - radius < right &&
              y + radius > top &&
              y - radius < bottom
            ) {
              return gate;
            }
          }

          return null;
        }

        // =====================================================
        // ENTER GATE
        // =====================================================

        async enterGate(
          gate: {
            label: string;
            x: number;
            y: number;
            width: number;
            height: number;
          }
        ) {
          if (this.transitioning || this.eliminated || this.won) return;

          this.transitioning = true;
          const selectedGate = gate.label as Gate;
          const room = getMazeRoom(this.roomNumber);
          const gateName = room.gates[selectedGate].name;

          // Wrong gate: immediate and permanent elimination.
          if (!isCorrectGate(this.roomNumber, selectedGate)) {
            this.eliminated = true;
            const { error } = await supabase.from("players").update({
              is_alive: false,
              is_winner: false,
            }).eq("id", playerId).eq("room_id", roomId);
            if (error) console.error("Could not save elimination:", error);
            this.broadcastState({ is_alive: false });
            this.finishGame(
              "YOU ARE ELIMINATED",
              `${gateName} was the wrong gate. Your journey ends here.`
            );
            return;
          }

          // In the treasure room, the player must choose the Crown Gate.
          if (room.isTreasureRoom) {
            this.won = true;
            const { error } = await supabase.from("players").update({
              is_alive: false,
              is_winner: true,
            }).eq("id", playerId).eq("room_id", roomId);
            if (error) console.error("Could not save winner:", error);
            this.broadcastState({ is_alive: false, is_winner: true });
            this.finishGame(
              "TREASURE FOUND!",
              "You chose the Crown Gate and completed all 11 rooms."
            );
            return;
          }

          const nextRoom = this.roomNumber + 1;
          const { error } = await supabase.from("players").update({
            current_room: nextRoom,
            is_alive: true,
            is_winner: false,
          }).eq("id", playerId).eq("room_id", roomId);
          if (error) {
            console.error("Could not save room progress:", error);
            this.transitioning = false;
            this.showMessage("SYNC ERROR", "Could not save your progress. Please try again.");
            return;
          }

          this.broadcastState({ roomNumber: nextRoom, x: 450, y: 330 });
          this.showMessage(
            "CORRECT GATE",
            `${gateName} opens. Entering Room ${nextRoom}...`
          );

          this.time.delayedCall(1000, () => {
            if (!this.eliminated && !this.won) {
              this.createRoom(nextRoom);
              this.broadcastState({ roomNumber: nextRoom, x: 450, y: 330 });
            }
          });
        }

        // =====================================================
        // END GAME OVERLAY
        // =====================================================

        finishGame(title: string, message: string) {
          this.transitioning = true;

          const overlay = this.add.rectangle(
            450, 300, 620, 190, 0x101216, 0.98
          );
          overlay.setStrokeStyle(2, this.won ? 0xd6b45c : 0xb83232);

          this.add.text(450, 255, title, {
            fontFamily: "Arial",
            fontSize: "30px",
            color: this.won ? "#f4d477" : "#ff6262",
            fontStyle: "bold",
            align: "center",
          }).setOrigin(0.5);

          this.add.text(450, 325, message, {
            fontFamily: "Arial",
            fontSize: "16px",
            color: "#c4cad5",
            align: "center",
            wordWrap: { width: 540 },
          }).setOrigin(0.5);
        }

        showMessage(
          title: string,
          message: string
        ) {
          const overlay =
            this.add.rectangle(
              450,
              300,
              560,
              150,
              0x101216,
              0.97
            );

          overlay.setStrokeStyle(
            2,
            0x555b69
          );

          const titleText =
            this.add
              .text(
                450,
                265,
                title,
                {
                  fontFamily: "Arial",
                  fontSize: "25px",
                  color: "#ffffff",
                  fontStyle: "bold",
                }
              )
              .setOrigin(0.5);

          const messageText =
            this.add
              .text(
                450,
                315,
                message,
                {
                  fontFamily: "Arial",
                  fontSize: "15px",
                  color: "#a5adbd",
                  align: "center",
                  wordWrap: {
                    width: 480,
                  },
                }
              )
              .setOrigin(0.5);

          this.time.delayedCall(
            1000,
            () => {
              overlay.destroy();
              titleText.destroy();
              messageText.destroy();
            }
          );
        }

        // =====================================================
        // PLAYER MOVEMENT
        // =====================================================

        update() {
          if (
            !this.player ||
            this.transitioning ||
            this.eliminated ||
            this.won
          ) {
            return;
          }

          const speed = 3;

          let dx = 0;
          let dy = 0;

          if (
            this.cursors?.left.isDown ||
            this.keys?.A.isDown || this.touchInput.left
          ) {
            dx -= speed;
          }

          if (
            this.cursors?.right.isDown ||
            this.keys?.D.isDown || this.touchInput.right
          ) {
            dx += speed;
          }

          if (
            this.cursors?.up.isDown ||
            this.keys?.W.isDown || this.touchInput.up
          ) {
            dy -= speed;
          }

          if (
            this.cursors?.down.isDown ||
            this.keys?.S.isDown || this.touchInput.down
          ) {
            dy += speed;
          }

          // =================================================
          // TRY X MOVEMENT
          // =================================================

          const newX =
            this.player.x + dx;

          if (
            !this.collidesWithWall(
              newX,
              this.player.y
            )
          ) {
            this.player.x = newX;
          }

          // =================================================
          // TRY Y MOVEMENT
          // =================================================

          const newY =
            this.player.y + dy;

          if (
            !this.collidesWithWall(
              this.player.x,
              newY
            )
          ) {
            this.player.y = newY;
          }

          // =================================================
          // CHECK GATE ENTRY
          // =================================================

          const enteredGate =
            this.getEnteredGate(
              this.player.x,
              this.player.y
            );

          if (enteredGate) {
            void this.enterGate(enteredGate);
          }

          const now = Date.now();
          if (now - lastBroadcastAt > 80) {
            lastBroadcastAt = now;
            if (channel) {
              channel.send({
                type: "broadcast",
                event: "player-move",
                payload: {
                  playerId, name: playerName, x: this.player.x, y: this.player.y,
                  roomNumber: this.roomNumber, is_alive: !this.eliminated, is_winner: this.won,
                },
              });
            }
          }

          // =================================================
          // KEEP PLAYER INSIDE MAP
          // =================================================

          this.player.x =
            Phaser.Math.Clamp(
              this.player.x,
              75,
              825
            );

          this.player.y =
            Phaser.Math.Clamp(
              this.player.y,
              240,
              525
            );
        }
      }

      const config = {
        type: Phaser.AUTO,

        width: 900,
        height: 600,

        parent: containerRef.current,

        backgroundColor: "#08090c",

        scene: MazeScene,

        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter:
            Phaser.Scale.CENTER_BOTH,
          width: 900,
          height: 600,
        },

        render: {
          antialias: true,
        },
      };

      const game = new Phaser.Game(config);

      gameRef.current = game;
    }

    startGame();

    return () => {
      cancelled = true;

      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      sceneRef.current = null;
    };
  }, [code]);

  const pressDirection = (
    direction: "up" | "down" | "left" | "right",
    pressed: boolean
  ) => {
    sceneRef.current?.setTouchDirection(direction, pressed);
  };

  const touchButton = (
    direction: "up" | "down" | "left" | "right",
    symbol: string,
    label: string
  ) => (
    <button
      key={direction}
      type="button"
      aria-label={label}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        pressDirection(direction, true);
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        pressDirection(direction, false);
      }}
      onPointerCancel={() => pressDirection(direction, false)}
      onLostPointerCapture={() => pressDirection(direction, false)}
      className="flex h-14 w-14 select-none items-center justify-center rounded-xl border border-white/20 bg-white/10 text-2xl font-bold text-white shadow-lg active:bg-white/25"
      style={{ touchAction: "none", WebkitUserSelect: "none", WebkitTapHighlightColor: "transparent" }}
    >
      {symbol}
    </button>
  );

  return (
    <div className="w-full">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2 text-xs text-gray-400">
        <span>Live players: {onlinePlayers}</span>
        <span>{syncError || "Connecting to realtime..."}</span>
      </div>
      <div
        ref={containerRef}
        className="flex w-full justify-center overflow-hidden"
        style={{
          width: "100%",
          maxWidth: "100%",
          minHeight: "min(600px, 70vh)",
          touchAction: "pan-y",
        }}
      />

      {/* Touch controls for phones and tablets */}
      <div
        className="md:hidden"
        style={{
          display: "flex",
          justifyContent: "center",
          width: "100%",
          padding: "18px 0 28px",
          touchAction: "pan-y",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 64px)",
            gridTemplateRows: "repeat(3, 64px)",
            gap: "8px",
            justifyItems: "center",
            alignItems: "center",
          }}
        >
          <div />
          {touchButton("up", "↑", "Move up")}
          <div />
          {touchButton("left", "←", "Move left")}
          <div style={{ color: "#9ca3af", fontSize: 11, fontWeight: 600 }}>MOVE</div>
          {touchButton("right", "→", "Move right")}
          <div />
          {touchButton("down", "↓", "Move down")}
          <div />
        </div>
      </div>
      <p className="md:hidden" style={{ margin: "0 0 24px", textAlign: "center", color: "#6b7280", fontSize: 12 }}>
        Hold a direction to move. Release to stop.
      </p>
    </div>
  );
}