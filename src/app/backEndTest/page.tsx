// app/backEndTest/page.tsx
"use client";

export default function BackEndTestPage() {
  return (
    <main style={{ padding: 24 }}>
      <h1>BackEnd Test Page</h1>
      <p>이 페이지에서 F12 열고 콘솔에서 API 테스트하면 됨.</p>
      <p>예: <code>fetch("/api/books")</code></p>
    </main>
  );
}
