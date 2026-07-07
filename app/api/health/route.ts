import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Unauthenticated liveness/readiness probe for container orchestrators
// (Docker healthcheck, Kubernetes probes, uptime monitors). Confirms the
// app process is up and can reach the database.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}
