// app/backEndTest/page.tsx
"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function BackEndTestPage() {
  const [user, setUser] = useState<{id: number, email: string} | null>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then(res => res.json())
      .then(data => {
        if (data.id && data.email) setUser(data);
      })
      .catch(() => {});
  }, []);

  const testPages = [
    { href: "/backEndTest/account", title: "계정 생성", desc: "새 사용자 계정 생성 (관리자 권한 설정 가능)" },
    { href: "/backEndTest/login", title: "로그인", desc: "세션 생성 및 로그인 테스트" },
    { href: "/backEndTest/book", title: "문제집 생성", desc: "새 문제집 생성 및 관리" },
    { href: "/backEndTest/ai", title: "AI 테스트", desc: "AI API 및 문제 생성 테스트" },
  ];

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ 
        position: "fixed", 
        top: "10px", 
        left: "10px", 
        padding: "8px 12px", 
        background: "var(--bg-secondary)", 
        borderRadius: "var(--radius-md)",
        fontSize: "0.85rem",
        color: "var(--text-secondary)",
        zIndex: 100
      }}>
        {user ? (
          <>
            <div><strong>ID:</strong> {user.id}</div>
            <div><strong>Email:</strong> {user.email}</div>
          </>
        ) : (
          <div style={{ color: "var(--error)" }}>로그인 필요</div>
        )}
      </div>
      <h1 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>🔧 Backend Test Suite</h1>
      <p style={{ marginBottom: "2rem", color: "var(--text-secondary)" }}>
        API 엔드포인트와 기능을 테스트할 수 있는 페이지 모음입니다.
      </p>

      <div style={{ display: "grid", gap: "1rem" }}>
        {testPages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            style={{
              display: "block",
              padding: "1.5rem",
              background: "linear-gradient(135deg, var(--primary-start) 0%, var(--primary-end) 100%)",
              borderRadius: "var(--radius-lg)",
              textDecoration: "none",
              color: "#1a1a1a",
              transition: "transform 0.2s, box-shadow 0.2s",
              boxShadow: "var(--shadow-md)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "var(--shadow-lg)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "var(--shadow-md)";
            }}
          >
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.25rem", color: "#1a1a1a" }}>{page.title}</h3>
            <p style={{ margin: 0, opacity: 0.8, fontSize: "0.95rem", color: "#333" }}>{page.desc}</p>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: "2rem", padding: "1rem", background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
        <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem", color: "var(--text-primary)" }}>💡 개발자 팁</h3>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          F12를 눌러 개발자 도구를 열고 콘솔에서 직접 API를 테스트할 수 있습니다.
          <br />
          예: <code style={{ background: "var(--bg-primary)", padding: "2px 6px", borderRadius: "4px" }}>await fetch("/api/books").then(r =&gt; r.json())</code>
        </p>
      </div>
    </div>
  );
}
