import { NextResponse } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, status: "unavailable", error: "OPENAI_API_KEY not configured" },
        { status: 503 }
      );
    }

    // Simple health check: try a minimal request to OpenAI
    // Using a very small model request to minimize cost/latency
    const response = await client.responses.create({
      model: "gpt-5-nano",
      input: "health check",
      max_output_tokens: 10,
    });

    // If we got a response, OpenAI is available
    return NextResponse.json(
      {
        ok: true,
        status: "available",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("OpenAI health check failed:", message);
    return NextResponse.json(
      {
        ok: false,
        status: "unavailable",
        error: message || "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
