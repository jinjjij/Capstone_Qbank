import { NextResponse } from "next/server";
import OpenAI from "openai";

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseTimeoutMs(raw: string | undefined, fallback: number): number {
	if (!raw) return fallback;
	const n = Number(raw);
	if (!Number.isFinite(n) || n <= 0) return fallback;
	return Math.floor(n);
}

function isRetryableOpenAIError(error: unknown): boolean {
	const anyErr = error as any;
	const status = typeof anyErr?.status === "number" ? anyErr.status : undefined;
	if (status === 429) return true;
	if (status === 408) return true;
	if (typeof status === "number" && status >= 500 && status <= 599) return true;
	return false;
}

async function createChatCompletionWithRetry(
	openai: OpenAI,
	params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
	options: { timeoutMs: number; maxAttempts: number }
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
	const { timeoutMs, maxAttempts } = options;
	let lastError: unknown;

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
		try {
			return await openai.chat.completions.create(params, { signal: controller.signal });
		} catch (err) {
			lastError = err;
			if (attempt >= maxAttempts || !isRetryableOpenAIError(err)) throw err;
			const backoffMs = Math.min(2000, 250 * 2 ** (attempt - 1));
			await sleep(backoffMs);
		} finally {
			clearTimeout(timeoutId);
		}
	}

	throw lastError;
}

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

function normalizeExtractedText(text: string): string {
	// PDFs often contain excessive whitespace / line breaks which waste tokens.
	return (text || "")
		.replace(/\r\n/g, "\n")
		.replace(/[\t\f\v]+/g, " ")
		.replace(/[ ]{2,}/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

function extractJsonArray(text: string): unknown {
	const cleaned = stripCodeFences(text);
	try {
		return JSON.parse(cleaned);
	} catch {
		// Fallback: try to find the first JSON array substring
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

	// Assume UTF-8 text
	const ab = await file.arrayBuffer();
	return new TextDecoder("utf-8").decode(ab);
}

export async function POST(request: Request) {
	try {
		const formData = await request.formData();
		const file = (formData.get("file") ?? formData.get("pdf")) as File | null;
		const questionCount = parsePositiveInt(formData.get("questionCount"));
		const message = (formData.get("message") as string | null) ?? "";

		if (!questionCount) {
			return NextResponse.json({ ok: false, error: "INVALID_FIELD" }, { status: 400 });
		}

		const trimmedMessage = message.trim();
		if (!file && !trimmedMessage) {
			// At least one of (file, message) must be present
			return NextResponse.json({ ok: false, error: "INVALID_FIELD" }, { status: 400 });
		}

		let textContent = "";
		if (file) {
			const fullText = await readTextFromUploadedFile(file);
			// Keep prompts smaller for speed/stability; PDFs beyond ~1 page can explode tokens.
			textContent = normalizeExtractedText(fullText).slice(0, 12000);
		}

		const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
		// 최신 모델(문서 기준): gpt-5.2 / gpt-5-mini / gpt-5-nano 등
		// 기본값은 "빠른" 쪽을 우선: gpt-5-mini
		const model = process.env.OPENAI_MODEL || "gpt-5-mini";
		const timeoutMs = parseTimeoutMs(process.env.OPENAI_TIMEOUT_MS, 45000);
		const maxAttempts = 3;

		const baseRule = `다음 조건을 만족하는 ${questionCount}개의 객관식 문제를 생성하세요. 각 문제는 JSON 형식으로 {question: string, choices: [{id: string, text: string}], answer: {id: string}}이어야 합니다. 응답은 JSON 배열로만 하세요.`;

		const prompt = file
			? `${trimmedMessage ? `추가 지시사항: ${trimmedMessage}\n\n` : ""}${baseRule}\n\n텍스트: ${textContent}`
			: `${baseRule}\n\n주제/요구사항: ${trimmedMessage}`;

		const baseRuleFor = (n: number) =>
			`다음 조건을 만족하는 ${n}개의 객관식 문제를 생성하세요. 각 문제는 JSON 형식으로 {question: string, choices: [{id: string, text: string}], answer: {id: string}}이어야 합니다. 응답은 JSON 배열로만 하세요.`;

		// Token issues typically start when questionCount > ~10 or PDF content grows.
		// Batch generation reduces truncation risk and improves perceived reliability.
		const batchSize = questionCount > 10 ? 5 : questionCount;
		const batches: number[] = [];
		for (let remaining = questionCount; remaining > 0; remaining -= batchSize) {
			batches.push(Math.min(batchSize, remaining));
		}

		const aggregated: { type: "MCQ"; question: unknown; choices: unknown; answer: unknown }[] = [];

		for (const batchCount of batches) {
			// Increase output budget vs. previous fixed 2000 to reduce truncation/invalid JSON.
			const maxTokens = Math.max(1200, Math.min(6000, batchCount * 500));

			const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
			{
				type: "function",
				function: {
					name: "return_questions",
					description: "Return generated MCQ questions as a JSON payload.",
					parameters: {
						type: "object",
						additionalProperties: false,
						required: ["items"],
						properties: {
							items: {
								type: "array",
								minItems: batchCount,
								items: {
									type: "object",
									additionalProperties: false,
									required: ["question", "choices", "answer"],
									properties: {
										question: { type: "string" },
										choices: {
											type: "array",
											minItems: 2,
											items: {
												type: "object",
												additionalProperties: false,
												required: ["id", "text"],
												properties: {
													id: { type: "string" },
													text: { type: "string" },
												},
											},
										},
										answer: {
											type: "object",
											additionalProperties: false,
											required: ["id"],
											properties: {
												id: { type: "string" },
											},
										},
									},
								},
							},
						},
					},
				},
			},
			];

			const baseRule = baseRuleFor(batchCount);
			const batchPrompt = file
				? `${trimmedMessage ? `추가 지시사항: ${trimmedMessage}\n\n` : ""}${baseRule}\n\n텍스트: ${textContent}`
				: `${baseRule}\n\n주제/요구사항: ${trimmedMessage}`;

			const response = await createChatCompletionWithRetry(
				openai,
				{
					model,
					messages: [{ role: "user", content: batchPrompt }],
					tools,
					tool_choice: { type: "function", function: { name: "return_questions" } },
					temperature: 0.2,
					max_completion_tokens: maxTokens,
				},
				{ timeoutMs, maxAttempts }
			);

			let rawItems: unknown = null;
			const toolCall = response.choices[0]?.message?.tool_calls?.[0];
			if (toolCall?.type === "function" && toolCall.function?.name === "return_questions") {
				try {
					const parsedArgs = JSON.parse(toolCall.function.arguments || "{}") as any;
					rawItems = parsedArgs?.items;
				} catch {
					rawItems = null;
				}
			}

			if (!Array.isArray(rawItems)) {
				// Fallback: parse as plain JSON array if a model didn't follow tool calls.
				const content = response.choices[0]?.message?.content || "[]";
				rawItems = extractJsonArray(content);
			}

			if (!Array.isArray(rawItems)) {
				return NextResponse.json({ ok: false, error: "INVALID_AI_RESPONSE" }, { status: 502 });
			}

			const items = (rawItems as any[]).map((q: any) => ({
				type: "MCQ" as const,
				question: q?.question,
				choices: q?.choices,
				answer: q?.answer,
			}));

			aggregated.push(...items);
		}

		return NextResponse.json({ ok: true, data: { items: aggregated.slice(0, questionCount) } }, { status: 200 });
	} catch (error) {
		const anyErr = error as any;
		if (anyErr?.name === "AbortError") {
			return NextResponse.json({ ok: false, error: "OPENAI_TIMEOUT" }, { status: 504 });
		}
		console.error(error);
		return NextResponse.json({ ok: false, error: "INTERNAL_ERROR" }, { status: 500 });
	}
}
