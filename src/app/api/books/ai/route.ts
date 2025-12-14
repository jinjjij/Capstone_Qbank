import { NextResponse } from "next/server";
import OpenAI from "openai";

function parsePositiveInt(raw: unknown): number | null {
  const n = typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
}

function extractJsonArray(text: string): unknown {
  const cleaned = stripCodeFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start >= 0 && end > start) {
      const sub = cleaned.slice(start, end + 1);
      return JSON.parse(sub);
    }
    throw new Error("INVALID_JSON");
  }
}

async function readTextFromUploadedFile(file: File): Promise<string> {
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();

  const isPdf = type.includes("pdf") || name.endsWith(".pdf");
  if (isPdf) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text || "";
  }

  const ab = await file.arrayBuffer();
  return new TextDecoder("utf-8").decode(ab);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = (formData.get("file") ?? formData.get("pdf")) as File | null;
    const questionCount = parsePositiveInt(formData.get("questionCount"));
    const message = (formData.get("message") as string | null) ?? "";
    const questionType = "MCQ";

    if (!file || !questionCount || questionType !== "MCQ") {
      return NextResponse.json({ ok: false, error: "INVALID_FIELD" }, { status: 400 });
    }

    const fullText = await readTextFromUploadedFile(file);
    const textContent = fullText.slice(0, 20000);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL || "gpt-4";

    const instruction = message.trim() ? `추가 지시사항: ${message.trim()}\n\n` : "";

    const prompt = `${instruction}다음 텍스트에서 ${questionCount}개의 객관식 문제를 생성하세요. 각 문제는 JSON 형식으로 {question: string, choices: [{id: string, text: string}], answer: {id: string}}이어야 합니다. 응답은 JSON 배열로만 하세요.\n\n텍스트: ${textContent}`;

    const response = await openai.chat.completions.create({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
    });

    const content = response.choices[0]?.message?.content || "[]";
    const parsed = extractJsonArray(content);
    if (!Array.isArray(parsed)) {
      return NextResponse.json({ ok: false, error: "INVALID_AI_RESPONSE" }, { status: 502 });
    }

    const items = parsed.map((q: any) => ({ type: "MCQ", question: q?.question, choices: q?.choices, answer: q?.answer }));

    return NextResponse.json(
      { ok: true, data: { items }, deprecated: "Use POST /api/ai/query instead." },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}