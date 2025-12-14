
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import styles from "./main.module.css";

interface Book {
  id: number;
  bookCode: string;
  title: string;
  description: string;
  visibility: "PUBLIC" | "PRIVATE";
  authorId: number;
  questionCount: number;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function Main() {
  const router = useRouter();
  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  // 최근에 풀 문제집 불러오기
  useEffect(() => {
    const fetchRecentBooks = async () => {
      try {
        const res = await fetch("/api/user/me/recent-books?limit=20");
        const data = await res.json();
        
        if (data.ok && data.data.items) {
          setMyBooks(data.data.items);
        }
      } catch (error) {
        console.error("Failed to fetch recent books:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentBooks();
  }, []);

  // 검색 처리
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/books?q=${encodeURIComponent(searchQuery)}&limit=20`);
      
      if (!res.ok) {
        console.error("Search failed with status:", res.status);
        setSearchResults([]);
        return;
      }
      
      const data = await res.json();
      
      if (data.ok && data.data.items) {
        setSearchResults(data.data.items);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults([]);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
  };

  const BookCard = ({ book }: { book: Book }) => (
    <div className={styles.bookCard} onClick={() => router.push(`/solve/${book.id}`)}>
      <div className={styles.bookCardHeader}>
        <h3 className={styles.bookTitle}>{book.title}</h3>
        <span className={`${styles.visibilityBadge} ${book.visibility === "PUBLIC" ? styles.visibilityPublic : styles.visibilityPrivate}`}>
          {book.visibility === "PUBLIC" ? "공개" : "비공개"}
        </span>
      </div>
      
      <p className={styles.bookDescription}>
        {book.description || "설명이 없습니다"}
      </p>
      
      <div className={styles.bookMeta}>
        <span>📝 {book.questionCount}문제</span>
        <span>⭐ {book.ratingAvg.toFixed(1)} ({book.ratingCount})</span>
        <span className={styles.bookCode}>코드: {book.bookCode}</span>
      </div>
    </div>
  );

  return (
    <div className={styles.container}>
      <Sidebar />
      
      <div className={styles.content}>
        {/* 검색 바 */}
        <div className={styles.searchSection}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="문제집 제목, 설명, 코드로 검색..."
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>
              검색
            </button>
            {isSearching && (
              <button type="button" onClick={clearSearch} className={styles.clearButton}>
                초기화
              </button>
            )}
          </form>
        </div>

        {/* 검색 결과 */}
        {isSearching && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              검색 결과 ({searchResults.length})
            </h2>
            {searchResults.length > 0 ? (
              <div className={styles.bookGrid}>
                {searchResults.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>검색 결과가 없습니다</p>
              </div>
            )}
          </div>
        )}

        {/* 최근에 풀 문제집 */}
        {!isSearching && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              최근에 푼 문제집 ({myBooks.length})
            </h2>
            {loading ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>로딩 중...</p>
              </div>
            ) : myBooks.length > 0 ? (
              <div className={styles.bookGrid}>
                {myBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>
                  아직 풀 문제집이 없습니다
                </p>
                <p className={styles.emptyStateSubtext}>
                  문제집을 풀면 여기에 표시됩니다
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}