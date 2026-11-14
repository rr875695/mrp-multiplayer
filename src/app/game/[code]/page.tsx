"use client";

import { useParams } from "next/navigation";
import GameCanvas from "../../../components/GameCanvas";

export default function GamePage() {
  const params = useParams();
  const code = String(params.code).toUpperCase();

  return (
    <main className="min-h-screen bg-[#050608] text-white">
      <div className="mx-auto w-full max-w-[1100px] px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs tracking-[0.35em] text-gray-500">MRP</p>
            <h1 className="text-2xl font-bold">Bhool Bhulaiyaa</h1>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-400">
            Room: <span className="font-bold text-white">{code}</span>
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
          <GameCanvas code={code} />
        </div>
      </div>
    </main>
  );
}
