"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { assignRoles, type Role } from "../../../lib/game";

type Room = {
  id: string;
  code: string;
  status: "lobby" | "playing" | "finished";
  round: number;
};

type Player = {
  id: string;
  name: string;
  role: string | null;
  score: number;
  ready: boolean;
  is_host: boolean;
};

export default function RoomLobby() {
  const params = useParams();
  const router = useRouter();

  const code = String(params.code).toUpperCase();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const [playerId, setPlayerId] = useState<string | null>(null);

  /*
   * Get current player ID
   */
  useEffect(() => {
    const id = localStorage.getItem(`mrp_player_id_${code}`);
    setPlayerId(id);
  }, []);

  /*
   * LOAD ROOM
   */
  async function loadRoom() {
    try {
      setError("");

      /*
       * IMPORTANT:
       * Do NOT use maybeSingle() here.
       * We take the first matching room safely.
       */
      const { data: roomRows, error: roomError } = await supabase
        .from("rooms")
        .select("id, code, status, round")
        .eq("code", code)
        .limit(1);

      if (roomError) {
        throw roomError;
      }

      if (!roomRows || roomRows.length === 0) {
        setError("Room not found.");
        setLoading(false);
        return;
      }

      const roomData = roomRows[0] as Room;

      /*
       * If game already started,
       * everyone should enter the game page.
       */
      if (roomData.status === "playing") {
        router.replace(`/game/${code}`);
        return;
      }

      setRoom(roomData);

      /*
       * LOAD PLAYERS
       */
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("id, name, ready, is_host, score")
        .eq("room_id", roomData.id)
        .order("created_at", { ascending: true });

      if (playersError) {
        throw playersError;
      }

      setPlayers((playersData || []) as Player[]);
    } catch (err) {
      console.error("LOAD ROOM ERROR:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not load room.");
      }
    } finally {
      setLoading(false);
    }
  }

  /*
   * INITIAL LOAD
   */
  useEffect(() => {
    loadRoom();
  }, [code]);


  /*
 * FALLBACK STATUS CHECK
 *
 * Realtime event miss ho jaye to bhi
 * har device game start detect kar lega.
 */
useEffect(() => {
  const checkGameStatus = async () => {
    try {
      const { data, error } = await supabase
        .from("rooms")
        .select("status")
        .eq("code", code)
        .limit(1);

      if (error) {
        console.error("STATUS CHECK ERROR:", error);
        return;
      }

      if (data && data.length > 0) {
        if (data[0].status === "playing") {
          router.replace(`/game/${code}`);
        }
      }
    } catch (err) {
      console.error("STATUS CHECK FAILED:", err);
    }
  };

  const interval = setInterval(checkGameStatus, 1000);

  return () => {
    clearInterval(interval);
  };
}, [code, router]);

  /*
   * REALTIME: PLAYERS
   *
   * When someone joins or changes Ready status,
   * all devices update automatically.
   */
  useEffect(() => {
    if (!room?.id) return;

    const playersChannel = supabase
      .channel(`players-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${room.id}`,
        },
        async () => {
          console.log("Players changed");

          const { data, error } = await supabase
            .from("players")
            .select("id, name, ready, is_host, score")
            .eq("room_id", room.id)
            .order("created_at", { ascending: true });

          if (!error) {
            setPlayers((data || []) as Player[]);
          }
        }
      )
      .subscribe((status) => {
        console.log("Players realtime:", status);
      });

    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, [room?.id]);

  /*
   * REALTIME: ROOM STATUS
   *
   * Host starts game -> database status becomes "playing"
   * -> every connected player moves to /game/[code]
   */
  useEffect(() => {
    if (!room?.id) return;

    const roomChannel = supabase
      .channel(`room-${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          console.log("ROOM UPDATED:", payload);

          const updatedRoom = payload.new as Room;

          setRoom(updatedRoom);

          if (updatedRoom.status === "playing") {
            router.replace(`/game/${code}`);
          }
        }
      )
      .subscribe((status) => {
        console.log("Room realtime:", status);
      });

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [room?.id, code]);

  /*
   * TOGGLE READY
   */
  async function toggleReady() {
    if (!playerId) {
      setError("Player session not found. Please join the room again.");
      return;
    }

    if (actionLoading) return;

    const currentPlayer = players.find(
      (player) => player.id === playerId
    );

    if (!currentPlayer) {
      setError("Your player was not found in this room.");
      return;
    }

    try {
      setActionLoading(true);
      setError("");

      const { error } = await supabase
        .from("players")
        .update({
          ready: !currentPlayer.ready,
        })
        .eq("id", playerId);

      if (error) {
        throw error;
      }

      /*
       * Immediately update local UI.
       */
      setPlayers((currentPlayers) =>
        currentPlayers.map((player) =>
          player.id === playerId
            ? {
                ...player,
                ready: !player.ready,
              }
            : player
        )
      );
    } catch (err) {
      console.error("READY ERROR:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not change ready status.");
      }
    } finally {
      setActionLoading(false);
    }
  }

  /*
   * START GAME
   */
  async function startGame() {
  if (!room) return;

  setError("");

  if (players.length < 2) {
    setError("At least 2 players are required.");
    return;
  }

  setLoading(true);

  try {
    /*
     * If roles are already assigned, do not assign them again.
     * This prevents roles from changing after refresh/re-entry.
     */
    const rolesAlreadyAssigned = players.every(
      (player) => player.role
    );

    if (!rolesAlreadyAssigned) {
      const shuffledRoles = assignRoles(players.length);

      /*
       * Assign each role exactly once.
       */
      for (let i = 0; i < players.length; i++) {
        const player = players[i];

        const { error: roleError } = await supabase
          .from("players")
          .update({
            role: shuffledRoles[i],
          })
          .eq("id", player.id)
          .eq("room_id", room.id);

        if (roleError) {
          throw roleError;
        }
      }
    }

    /*
     * Start the game only after roles
     * have been successfully saved.
     */
    const { error: roomError } = await supabase
      .from("rooms")
      .update({
        status: "playing",
        round: 1,
      })
      .eq("id", room.id);

    if (roomError) {
      throw roomError;
    }

    router.replace(`/game/${code}`);
  } catch (err: any) {
    console.error(err);

    setError(
      err?.message ||
        "Could not start the game."
    );
  } finally {
    setLoading(false);
  }
}
  /*
   * LOADING
   */
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07080a] text-white">
        <p className="text-gray-400">
          Loading room...
        </p>
      </main>
    );
  }

  /*
   * ROOM ERROR
   */
  if (!room) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07080a] px-6 text-white">
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            Room Error
          </h1>

          <p className="mt-3 text-red-400">
            {error || "Room not found."}
          </p>
        </div>
      </main>
    );
  }

  const currentPlayer = players.find(
    (player) => player.id === playerId
  );

  const allReady =
    players.length >= 2 &&
    players.every((player) => player.ready);

  return (
    <main className="min-h-screen bg-[#07080a] px-6 py-10 text-white">
      <div className="mx-auto max-w-4xl">

        {/* HEADER */}

        <div className="text-center">

          <div className="inline-block rounded-full border border-white/10 bg-white/5 px-5 py-2 text-sm text-gray-400">
            🎬 Multiplayer Role Play
          </div>

          <h1 className="mt-8 text-5xl font-black">
            Waiting Room
          </h1>

          <p className="mt-3 text-gray-400">
            Waiting for your players...
          </p>

        </div>

        {/* ROOM CODE */}

        <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-8 text-center">

          <p className="text-sm uppercase tracking-widest text-gray-500">
            Room Code
          </p>

          <div className="mt-4 text-6xl font-black tracking-[0.25em]">
            {code}
          </div>

          <p className="mt-4 text-gray-500">
            Share this code with your friends
          </p>

          <p className="mt-3 text-sm text-gray-500">
            Game Status: {room.status}
          </p>

        </div>

        {/* PLAYERS */}

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-8">

          <div className="flex items-center justify-between">

            <h2 className="text-2xl font-bold">
              Players
            </h2>

            <span className="rounded-full bg-white/10 px-4 py-2 text-sm text-gray-300">
              {players.length}/8
            </span>

          </div>

          <div className="mt-6 space-y-3">

            {players.map((player, index) => (

              <div
                key={player.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-5 py-4"
              >

                <div className="flex items-center gap-4">

                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 font-bold">
                    {index + 1}
                  </div>

                  <div>

                    <p className="font-semibold">

                      {player.name}

                      {player.is_host && (
                        <span className="ml-2 text-xs text-yellow-400">
                          HOST
                        </span>
                      )}

                    </p>

                    {player.id === playerId && (
                      <p className="text-xs text-gray-500">
                        You
                      </p>
                    )}

                  </div>

                </div>

                <div>

                  {player.ready ? (

                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-400">
                      ✓ Ready
                    </span>

                  ) : (

                    <span className="rounded-full bg-white/5 px-3 py-1 text-sm text-gray-500">
                      Not Ready
                    </span>

                  )}

                </div>

              </div>

            ))}

          </div>

        </div>

        {/* ERROR */}

        {error && (

          <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-3 text-center text-red-300">
            {error}
          </div>

        )}

        {/* BUTTONS */}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">

          <button
            onClick={toggleReady}
            disabled={actionLoading}
            className="flex-1 rounded-2xl bg-white px-6 py-4 font-bold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {actionLoading
              ? "Please wait..."
              : currentPlayer?.ready
              ? "I'm Not Ready"
              : "I'm Ready ✓"}
          </button>

          {currentPlayer?.is_host && (

            <button
              onClick={startGame}
              disabled={actionLoading || !allReady}
              className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-6 py-4 font-bold transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {actionLoading
                ? "Starting..."
                : "Start Game →"}
            </button>

          )}

        </div>

        <p className="mt-8 text-center text-sm text-gray-600">
          2–8 players • Real-time multiplayer
        </p>

      </div>
    </main>
  );
}