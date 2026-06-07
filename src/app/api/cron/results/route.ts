import { NextResponse } from "next/server";
import { syncResultsFromFeed } from "@/lib/results";
import { recomputeAllScores } from "@/lib/actions/score";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Polls live results and re-scores all entries.
 * Triggered by Vercel Cron (see vercel.json). Protected by CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sync = await syncResultsFromFeed();
    const score = await recomputeAllScores();
    return NextResponse.json({ ok: true, sync, score });
  } catch (err) {
    console.error("cron/results failed", err);
    return NextResponse.json({ ok: false, error: "Job failed" }, { status: 500 });
  }
}
