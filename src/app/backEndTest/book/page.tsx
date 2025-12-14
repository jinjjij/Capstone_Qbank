"use client";

import React, { useState, useEffect } from "react";

export default function CreateBookTestPage() {
  const [user, setUser] = useState<{id: number, email: string} | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
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
      const res = await fetch("/api/books", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description: description || undefined,
          visibility,
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

  return (
    <div style={{ 
      minHeight: "100vh", 
      padding: "40px", 
      backgroundColor: "#f0f2f5" 
    }}>
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
          문제집 생성 API 테스트
        </h1>
        <p style={{ 
          fontSize: "14px", 
          color: "#666", 
          marginBottom: "30px" 
        }}>
          POST /api/books
        </p>

        <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ 
              display: "block", 
              marginBottom: "8px", 
              fontWeight: "500", 
              color: "#333" 
            }}>
              문제집 제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="문제집 제목을 입력하세요"
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
              설명 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="문제집 설명을 입력하세요"
              rows={4}
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "16px",
                border: "1px solid #ddd",
                borderRadius: "6px",
                boxSizing: "border-box",
                resize: "vertical",
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
              공개 여부
            </label>
            <div style={{ display: "flex", gap: "20px" }}>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  value="PRIVATE"
                  checked={visibility === "PRIVATE"}
                  onChange={(e) => setVisibility(e.target.value as "PRIVATE")}
                  style={{ marginRight: "8px" }}
                />
                비공개
              </label>
              <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  value="PUBLIC"
                  checked={visibility === "PUBLIC"}
                  onChange={(e) => setVisibility(e.target.value as "PUBLIC")}
                  style={{ marginRight: "8px" }}
                />
                공개
              </label>
            </div>
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
            {loading ? "처리 중..." : "문제집 생성"}
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
            <p style={{ margin: "4px 0" }}><strong>엔드포인트:</strong> POST /api/books</p>
            <p style={{ margin: "4px 0" }}><strong>요청 본문:</strong> {`{ title: string, description?: string, visibility?: "PUBLIC" | "PRIVATE" }`}</p>
            <p style={{ margin: "4px 0" }}><strong>성공 응답:</strong> {`{ newBook: { authorId, bookCode } }`}</p>
            <p style={{ margin: "4px 0" }}><strong>실패 응답:</strong> {`{ error: string }`}</p>
            <p style={{ margin: "4px 0" }}><strong>비고:</strong> bookCode는 자동 생성됩니다 (nanoid 10자)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
