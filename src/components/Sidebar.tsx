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

      {open && (
        <div 
          className="fixed inset-0 bg-black/30"
          onClick={() => setOpen(false)}
        ></div>
      )}
      
      {/* 사이드바 */}
      <div className={`${styles.sidebar} ${open ? styles.open : ""}`}>
        {/* 햄버거 버튼 (닫기) */}
        <div style={{display: "flex"}}>
            <button className={styles.hamburger} style={{marginLeft: "auto"}} onClick={() => setOpen(false)}>
            ☰
            </button>
        </div>

        <ul>
          <li><Link href="/profile">내 프로필</Link></li>
          <li><Link href="/main">검색</Link></li>
          <li><Link href="/bank">내 문제집</Link></li>
          <li><Link href="/setting">설정</Link></li>
        </ul>
      </div>
    </>
  );
}