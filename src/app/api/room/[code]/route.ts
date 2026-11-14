import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);

export async function GET(
  request: Request,
  context: {
    params: Promise<{ code: string }>;
  }
) {
  try {
    const { code } = await context.params;

    const roomCode = code.toUpperCase();

    const { data: room, error } = await supabase
      .from("rooms")
      .select("id, code, status, round")
      .eq("code", roomCode)
      .maybeSingle();

    if (error) {
      console.error("ROOM API ERROR:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        {
          status: 500,
        }
      );
    }

    if (!room) {
      return NextResponse.json(
        {
          error: "Room not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(room, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (error) {
    console.error("API ERROR:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch room status",
      },
      {
        status: 500,
      }
    );
  }
}