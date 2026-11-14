"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }

  return code;
}

export default function Home() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Prevent multiple clicks / duplicate player creation
  const actionInProgress = useRef(false);

  // =========================
  // CREATE ROOM
  // =========================
  async function createRoom() {
    if (actionInProgress.current) return;

    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    actionInProgress.current = true;
    setLoading(true);

    try {
      let code = "";
      let room = null;

      // Generate unique room code
      for (let i = 0; i < 10; i++) {
        const newCode = generateRoomCode();

        const { data, error: checkError } = await supabase
          .from("rooms")
          .select("id")
          .eq("code", newCode)
          .maybeSingle();

        if (checkError) {
          throw checkError;
        }

        if (!data) {
          code = newCode;
          break;
        }
      }

      if (!code) {
        throw new Error("Could not generate room code.");
      }

      // Create room
      const { data: newRoom, error: roomError } = await supabase
        .from("rooms")
        .insert({
          code,
          status: "lobby",
          round: 0,
        })
        .select()
        .single();

      if (roomError) {
        throw roomError;
      }

      room = newRoom;

      // Add host
      const { data: player, error: playerError } = await supabase
        .from("players")
        .insert({
          room_id: room.id,
          name: name.trim(),
          is_host: true,
          ready: true,
        })
        .select()
        .single();

      if (playerError) {
        throw playerError;
      }

      // Save player ID for this room
      localStorage.setItem(
        `mrp_player_id_${code}`,
        player.id
      );

      // Navigate to lobby
      router.push(`/room/${code}`);

    } catch (err: any) {
      console.error("Create room error:", err);

      setError(
        err?.message || "Something went wrong while creating the room."
      );

      actionInProgress.current = false;
      setLoading(false);
    }
  }

  // =========================
  // JOIN ROOM
  // =========================
  async function joinRoom() {
    if (actionInProgress.current) return;

    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!roomCode.trim()) {
      setError("Please enter the room code.");
      return;
    }

    actionInProgress.current = true;
    setLoading(true);

    try {
      const code = roomCode.trim().toUpperCase();

      // -------------------------
      // Find room
      // -------------------------
      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (roomError) {
        throw roomError;
      }

      if (!room) {
        throw new Error("Room not found.");
      }

      // -------------------------
      // Check game status
      // -------------------------
      if (room.status !== "lobby") {
        throw new Error("This game has already started.");
      }

      // -------------------------
      // Check player count
      // -------------------------
      const { count, error: countError } = await supabase
        .from("players")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("room_id", room.id);

      if (countError) {
        throw countError;
      }

      if ((count ?? 0) >= 8) {
        throw new Error(
          "Room is full. Maximum 8 players allowed."
        );
      }

      // -------------------------
      // Add player
      // -------------------------
      const { data: player, error: playerError } = await supabase
        .from("players")
        .insert({
          room_id: room.id,
          name: name.trim(),
          is_host: false,
          ready: false,
        })
        .select()
        .single();

      if (playerError) {
        throw playerError;
      }

      // -------------------------
      // Save player ID
      // -------------------------
      localStorage.setItem(
        `mrp_player_id_${code}`,
        player.id
      );

      // -------------------------
      // Navigate to lobby
      // -------------------------
      window.location.href = `/room/${code}`;

    } catch (err: any) {
      console.error("Join room error:", err);

      setError(
        err?.message ||
          "Something went wrong while joining the room."
      );

      actionInProgress.current = false;
      setLoading(false);
    }
  }

  // =========================
  // UI
  // =========================
  return (
    <main className="min-h-screen bg-[#07080a] text-white px-6 py-10">
      <div className="mx-auto max-w-5xl">

        {/* ================= HEADER ================= */}
        <div className="text-center mb-14">

          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-gray-300">
            🎬 Multiplayer Role Play
          </div>

          <h1 className="mt-8 text-7xl font-black tracking-tight">
            MRP
          </h1>

          <p className="mt-5 text-xl text-gray-400">
            Enter the story. Make your choices. Trust nobody.
          </p>

        </div>

        {/* ================= NAME ================= */}
        <div className="mx-auto mb-10 max-w-xl">

          <label className="mb-3 block text-sm text-gray-300">
            Your name
          </label>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            disabled={loading}
            className="w-full rounded-2xl border border-white/20 bg-white/5 px-6 py-5 text-lg outline-none transition focus:border-white/50 disabled:opacity-50"
          />

        </div>

        {/* ================= CARDS ================= */}
        <div className="grid gap-6 md:grid-cols-2">

          {/* ================= CREATE ROOM ================= */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10">

            <div className="text-5xl">
              🎬
            </div>

            <h2 className="mt-8 text-3xl font-bold">
              Create Room
            </h2>

            <p className="mt-3 text-gray-400">
              Create a new story and invite your friends.
            </p>

            <button
              onClick={createRoom}
              disabled={loading}
              className="mt-10 rounded-xl bg-white px-7 py-4 font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating..."
                : "Create Room →"}
            </button>

          </div>

          {/* ================= JOIN ROOM ================= */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-10">

            <div className="text-5xl">
              🚪
            </div>

            <h2 className="mt-8 text-3xl font-bold">
              Join Room
            </h2>

            <p className="mt-3 text-gray-400">
              Enter your friend's room code.
            </p>

            <input
              type="text"
              maxLength={6}
              value={roomCode}
              onChange={(e) =>
                setRoomCode(
                  e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                )
              }
              placeholder="A B C D E F"
              disabled={loading}
              className="mt-8 w-full rounded-xl border border-white/10 bg-black/30 px-5 py-5 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-white/40 disabled:opacity-50"
            />

            <button
              onClick={joinRoom}
              disabled={loading}
              className="mt-5 w-full rounded-xl bg-white px-7 py-4 font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Joining..."
                : "Join Room →"}
            </button>

          </div>

        </div>

        {/* ================= ERROR ================= */}
        {error && (
          <div className="mx-auto mt-8 max-w-xl rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-center text-red-300">
            {error}
          </div>
        )}

        {/* ================= FOOTER ================= */}
        <p className="mt-12 text-center text-gray-600">
          2–8 players • Real-time • Play from any device
        </p>

      </div>
    </main>
  );
}