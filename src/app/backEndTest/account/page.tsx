"use client";

import React, { useState, useEffect } from "react";

export default function CreateAccountTestPage() {
  const [user, setUser] = useState<{id: number, email: string} | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/users/me")
      .then(res => res.json())
      .then(data => {
        if (data.id && data.email) setUser(data);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResponse(null);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          isAdmin,
        }),
      });

      const data = await res.json();
      setResponse({
        status: res.status,
        statusText: res.statusText,
        data: data,
      });

      // 성공 시 폼 초기화
      if (res.ok) {
        setEmail("");
        setPassword("");
        setIsAdmin(false);
      }
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
          계정 생성 API 테스트
        </h1>
        <p style={{ 
          fontSize: "14px", 
          color: "#666", 
          marginBottom: "30px" 
        }}>
          POST /api/users
        </p>

        <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "8px", 
              fontWeight: "500", 
              color: "#333" 
            }}>
              이메일 *
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

          <div style={{ marginBottom: "16px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "8px", 
              fontWeight: "500", 
              color: "#333" 
            }}>
              비밀번호 * (8~72자)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              maxLength={72}
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
              display: "flex", 
              alignItems: "center",
              cursor: "pointer",
              padding: "12px",
              backgroundColor: "#f8f9fa",
              borderRadius: "6px",
              border: "1px solid #ddd"
            }}>
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                style={{ 
                  marginRight: "10px",
                  width: "18px",
                  height: "18px",
                  cursor: "pointer"
                }}
              />
              <span style={{ fontWeight: "500", color: "#333" }}>
                관리자 권한 부여
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
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
            {loading ? "처리 중..." : "계정 생성"}
          </button>
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
            {response.note && (
              <div style={{
                padding: "10px",
                backgroundColor: "#fff3cd",
                border: "1px solid #ffc107",
                borderRadius: "4px",
                marginBottom: "12px",
                fontSize: "14px",
                color: "#856404"
              }}>
                {response.note}
              </div>
            )}
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
            <p style={{ margin: "4px 0" }}><strong>엔드포인트:</strong> POST /api/users</p>
            <p style={{ margin: "4px 0" }}><strong>요청 본문:</strong> {`{ email: string, password: string }`}</p>
            <p style={{ margin: "4px 0" }}><strong>비밀번호 요구사항:</strong> 8~72자</p>
            <p style={{ margin: "4px 0" }}><strong>성공 응답:</strong> {`{ user: { id, email } }`}</p>
            <p style={{ margin: "4px 0" }}><strong>실패 응답:</strong> {`{ error: string }`}</p>
            <p style={{ margin: "4px 0" }}><strong>중복 이메일:</strong> 409 Conflict</p>
          </div>
        </div>

        <div style={{ 
          marginTop: "20px", 
          padding: "20px", 
          backgroundColor: "#e7f3ff", 
          borderRadius: "8px",
          borderLeft: "4px solid #2196F3"
        }}>
          <h4 style={{ 
            fontSize: "16px", 
            marginBottom: "12px", 
            color: "#0c5393" 
          }}>
            💡 관리자 권한 필드 추가 방법
          </h4>
          <div style={{ fontSize: "13px", color: "#0c5393", lineHeight: "1.8" }}>
            <p style={{ margin: "4px 0" }}>1. <code>prisma/schema.prisma</code>의 User 모델에 추가:</p>
            <pre style={{ 
              backgroundColor: "#fff", 
              padding: "10px", 
              borderRadius: "4px",
              fontSize: "12px",
              margin: "8px 0"
            }}>
{`model User {
  ...
  isAdmin  Boolean  @default(false)
  ...
}`}
            </pre>
            <p style={{ margin: "4px 0" }}>2. 마이그레이션 실행: <code>npx prisma migrate dev</code></p>
            <p style={{ margin: "4px 0" }}>3. API 코드에서 isAdmin 필드 처리 추가</p>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
