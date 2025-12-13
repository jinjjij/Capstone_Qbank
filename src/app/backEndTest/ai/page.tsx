// app/backEndTest/ai/page.tsx
"use client";

import { useState } from "react";

export default function AITestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [questionCount, setQuestionCount] = useState("");
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file || !title || !description || !questionCount) {
      setResult("모든 필드를 입력하세요.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("pdf", file);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("questionCount", questionCount);

    try {
      const response = await fetch("/api/books/ai", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult("오류: " + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{
      padding: 24,
      backgroundColor: "#f9f9f9",
      border: "2px solid #007bff",
      borderRadius: 8,
      margin: 20,
      fontFamily: "Arial, sans-serif"
    }}>
      <h1 style={{ color: "#007bff", textAlign: "center" }}>AI 문제집 생성 API 테스트</h1>
      <p style={{ textAlign: "center", color: "#555" }}>PDF를 업로드하여 문제집을 생성하는 API를 테스트합니다.</p>

      <form onSubmit={handleSubmit} style={{
        marginTop: 20,
        display: "flex",
        flexDirection: "column",
        gap: 15,
        maxWidth: 400,
        margin: "20px auto"
      }}>
        <div>
          <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>PDF 파일: </label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFile(e.target.files?.[0] || null)}
            required
            style={{
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
              width: "100%"
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>제목: </label>
          <input
            type="text"
            value={title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
            required
            style={{
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
              width: "100%"
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>설명: </label>
          <textarea
            value={description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
            required
            style={{
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
              width: "100%",
              minHeight: 80
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>문제 개수: </label>
          <input
            type="number"
            value={questionCount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuestionCount(e.target.value)}
            required
            style={{
              padding: 8,
              border: "1px solid #ccc",
              borderRadius: 4,
              width: "100%"
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 10,
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: 4,
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: 16
          }}
        >
          {loading ? "업로드 중..." : "문제집 생성"}
        </button>
      </form>

      {result && (
        <pre style={{
          marginTop: 20,
          background: "#e9ecef",
          padding: 10,
          borderRadius: 4,
          overflow: "auto",
          maxWidth: 600,
          margin: "20px auto"
        }}>
          {result}
        </pre>
      )}
    </main>
  );
}