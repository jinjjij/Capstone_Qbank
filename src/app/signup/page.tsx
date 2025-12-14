"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }

    // 비밀번호 길이 확인
    if (password.length < 8 || password.length > 72) {
      setError("비밀번호는 8~72자여야 합니다");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // 회원가입 성공 시 로그인 페이지로 이동
        router.push("/login?signup=success");
      } else {
        setError(data.error || "회원가입에 실패했습니다");
      }
    } catch (err) {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        {/* 로고 */}
        <div className="auth-logo">
          <h1>Q Bank</h1>
          <p>새로운 계정을 만들어보세요</p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {/* 회원가입 폼 */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="8~72자"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">비밀번호 확인</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="비밀번호를 다시 입력하세요"
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>

        {/* 로그인 링크 */}
        <div className="text-center text-muted" style={{ marginTop: "var(--space-2xl)" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="link">
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
