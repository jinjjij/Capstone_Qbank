"use client";
import Link from "next/link";

import { useState } from "react";
import styles from "./Sidebar.module.css";

export default function Sidebar() {
  const [open, setOpen] = useState(false);

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

        <ul style={{position: "relative", zIndex: 1}}>
          <li><Link href="/profile" onClick={() => setOpen(false)}>내 프로필</Link></li>
          <li><Link href="/main" onClick={() => setOpen(false)}>검색</Link></li>
          <li><Link href="/library" onClick={() => setOpen(false)}>내 라이브러리</Link></li>
          <li><Link href="/setting" onClick={() => setOpen(false)}>설정</Link></li>
        </ul>
      </div>
    </>
  );
}