"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useState, useEffect } from "react";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then(res => res.json())
      .then(data => {
        if (data.email) setUserEmail(data.email);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/session", { method: "DELETE" });
    } finally {
      setUserEmail(null);
      setOpen(false);
      router.push("/login");
    }
  };

  return (
    <>
      {/* 햄버거 버튼 (열기) */}
      <button className={styles.hamburger} onClick={() => setOpen(true)}>
        ☰
      </button>

      {/* 배경 오버레이 */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/30"
          style={{ zIndex: 999 }}
          onClick={() => setOpen(false)}
        />
      )}
      
      {/* 사이드바 - 항상 렌더링하여 transition 작동 */}
      <div className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        {/* 햄버거 버튼 (닫기) */}
        <div style={{display: "flex", position: "relative", zIndex: 1}}>
            <button 
              style={{
                fontSize: "28px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "10px 15px",
                position: "relative",
                marginLeft: "auto"
              }} 
              onClick={() => setOpen(false)}
            >
            ☰
            </button>
        </div>

        {/* 유저 이메일 */}
        {userEmail && (
          <div style={{
            padding: "10px 15px",
            marginBottom: "10px",
            borderBottom: "1px solid #ddd",
            fontSize: "14px",
            color: "#666",
            wordBreak: "break-all",
            position: "relative",
            zIndex: 1
          }}>
            {userEmail}
          </div>
        )}

        <ul style={{position: "relative", zIndex: 1}}>
          <li><Link href="/profile" onClick={() => setOpen(false)}>내 프로필</Link></li>
          <li><Link href="/main" onClick={() => setOpen(false)}>검색</Link></li>
          <li><Link href="/library" onClick={() => setOpen(false)}>내 라이브러리</Link></li>
          <li><Link href="/setting" onClick={() => setOpen(false)}>설정</Link></li>
        </ul>

        <div className={styles.logoutSection} style={{position: "relative", zIndex: 1}}>
          <button className={styles.logoutButton} onClick={handleLogout}>
            로그아웃
          </button>
        </div>
      </div>
    </>
  );
}