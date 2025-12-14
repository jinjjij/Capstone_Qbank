"use client";

import React, { useState } from "react";

export default function LoginTestPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password: password,
        }),
      });

      const data = await res.json();
      setResponse({
        status: res.status,
        statusText: res.statusText,
        data: data,
      });
    } catch (error) {
      setResponse({
        error: "Network error",
        details: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/session", {
        method: "DELETE",
      });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        message: "로그아웃 완료",
      });
    } catch (error) {
      setResponse({
        error: "Network error",
        details: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: "100vh", 
      padding: "40px", 
      backgroundColor: "#f0f2f5" 
    }}>
      <div style={{ 
        maxWidth: "600px", 
        margin: "0 auto", 
        backgroundColor: "white", 
        padding: "30px", 
        borderRadius: "12px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
      }}>
        <h1 style={{ 
          fontSize: "28px", 
          marginBottom: "8px", 
          color: "#1a73e8" 
        }}>
          로그인 API 테스트
        </h1>
        <p style={{ 
          fontSize: "14px", 
          color: "#666", 
          marginBottom: "30px" 
        }}>
          POST /api/session
        </p>

        <form onSubmit={handleLogin} style={{ marginBottom: "20px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "8px", 
              fontWeight: "500", 
              color: "#333" 
            }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "8px", 
              fontWeight: "500", 
              color: "#333" 
            }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 1,
                padding: "14px",
                fontSize: "16px",
                fontWeight: "bold",
                backgroundColor: loading ? "#ccc" : "#1a73e8",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#1557b0";
              }}
              onMouseOut={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#1a73e8";
              }}
            >
              {loading ? "처리 중..." : "로그인"}
            </button>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              style={{
                flex: 1,
                padding: "14px",
                fontSize: "16px",
                fontWeight: "bold",
                backgroundColor: loading ? "#ccc" : "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseOver={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#c82333";
              }}
              onMouseOut={(e) => {
                if (!loading) e.currentTarget.style.backgroundColor = "#dc3545";
              }}
            >
              로그아웃
            </button>
          </div>
        </form>

        {response && (
          <div style={{ 
            marginTop: "30px", 
            padding: "20px", 
            backgroundColor: "#f8f9fa", 
            borderRadius: "8px",
            borderLeft: response.error ? "4px solid #dc3545" : "4px solid #28a745"
          }}>
            <h3 style={{ 
              fontSize: "18px", 
              marginBottom: "12px", 
              color: "#333" 
            }}>
              응답 결과
            </h3>
            <pre style={{ 
              backgroundColor: "#fff", 
              padding: "15px", 
              borderRadius: "6px", 
              overflow: "auto",
              fontSize: "14px",
              lineHeight: "1.6",
              margin: 0
            }}>
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}

        <div style={{ 
          marginTop: "30px", 
          padding: "20px", 
          backgroundColor: "#fff3cd", 
          borderRadius: "8px",
          borderLeft: "4px solid #ffc107"
        }}>
          <h4 style={{ 
            fontSize: "16px", 
            marginBottom: "12px", 
            color: "#856404" 
          }}>
            📌 API 정보
          </h4>
          <div style={{ fontSize: "14px", color: "#856404", lineHeight: "1.8" }}>
            <p style={{ margin: "4px 0" }}><strong>로그인 엔드포인트:</strong> POST /api/session</p>
            <p style={{ margin: "4px 0" }}><strong>요청 본문:</strong> {"{ email: string, password: string }"}</p>
            <p style={{ margin: "4px 0" }}><strong>로그아웃 엔드포인트:</strong> DELETE /api/session</p>
            <p style={{ margin: "4px 0" }}><strong>성공 응답:</strong> {"{ ok: true }"}</p>
            <p style={{ margin: "4px 0" }}><strong>실패 응답:</strong> {"{ error: string }"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
