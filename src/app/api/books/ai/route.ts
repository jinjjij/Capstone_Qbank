"use server";

import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { writeFile, unlink, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("pdf") as File;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const questionCount = parseInt(formData.get("questionCount") as string);

    if (!file || !title || !description || !questionCount) {
      return NextResponse.json({ error: "필수 필드가 누락되었습니다." }, { status: 400 });
    }

    // PDF를 임시 파일로 저장
    const tempDir = path.join(process.cwd(), "temp");
    await mkdir(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `${Date.now()}.pdf`);
    await writeFile(tempPath, Buffer.from(await file.arrayBuffer()));

    // PDF를 TXT로 변환
    const buffer = await import("fs").then(fs => fs.readFileSync(tempPath));
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    const textContent = data.text;

    // 임시 파일 삭제
    await unlink(tempPath);

    // bookCode 생성 (nanoid 10자리, 중복 확인)
    let bookCode;
    while (true) {
      bookCode = nanoid(10);
      const exists = await db.book.findUnique({
        where: { bookCode },
      });
      if (!exists) break;
    }

    // OpenAI API 호출 부분
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `다음 텍스트에서 ${questionCount}개의 객관식 문제를 생성하세요. 각 문제는 JSON 형식으로 {question: string, choices: [{id: string, text: string}], answer: {id: string}}이어야 합니다. 응답은 JSON 배열로만 하세요.\n\n텍스트: ${textContent}`;
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 2000,
    });
    const questionsData = JSON.parse(response.choices[0].message.content || "[]");

    // DB에 저장
    const book = await db.book.create({
      data: {
        bookCode,
        title,
        description,
        questionCount,
        // authorId는 세션에서 가져와야 함, 일단 null로 가정
      },
    });

    // Question들 생성
    for (let i = 0; i < questionsData.length; i++) {
      const q = questionsData[i];
      await db.question.create({
        data: {
          bookId: book.id,
          orderIndex: i + 1,
          type: "MCQ",
          question: q.question,
          choices: q.choices,
          answer: q.answer,
          // authorId: book.authorId,
        },
      });
    }

    return NextResponse.json({ message: "문제집 생성 완료", book }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "서버 오류" }, { status: 500 });
  }
}