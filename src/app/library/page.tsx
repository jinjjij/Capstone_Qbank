"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import styles from "../main/main.module.css";

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

export default function LibraryPage() {
  const router = useRouter();
  const [libraryBooks, setLibraryBooks] = useState<Book[]>([]);
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchNextCursor, setSearchNextCursor] = useState<string | null>(null);
  const [searchHasNext, setSearchHasNext] = useState(false);
  const [loadingMoreSearch, setLoadingMoreSearch] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // 라이브러리 문제집 불러오기
  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const res = await fetch("/api/user/me/library?limit=100");
        const data = await res.json();
        
        if (data.ok && data.data.items) {
          setLibraryBooks(data.data.items);
        }
      } catch (error) {
        console.error("Failed to fetch library:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLibrary();
  }, []);

  // 새 문제집 만들기
  const createNewBook = async () => {
    if (creating) return;
    
    setCreating(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "새 문제집",
          description: "",
          visibility: "PRIVATE"
        })
      });

      const data = await res.json();
      if (data.newBook && data.newBook.id) {
        router.push(`/book/${data.newBook.id}`);
      }
    } catch (error) {
      console.error("Failed to create book:", error);
      alert("문제집 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  };

  // 검색 처리 (라이브러리 내에서만 검색)
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchNextCursor(null);
      setSearchHasNext(false);
      return;
    }

    setIsSearching(true);
    try {
      const res = await fetch(`/api/user/me/library?q=${encodeURIComponent(searchQuery)}&limit=20`);
      if (!res.ok) {
        setSearchResults([]);
        setSearchNextCursor(null);
        setSearchHasNext(false);
        return;
      }
      const data = await res.json().catch(() => null);
      if (data?.ok && Array.isArray(data.data?.items)) {
        setSearchResults(data.data.items);
        setSearchNextCursor(data.data.pageInfo?.nextCursor ?? null);
        setSearchHasNext(Boolean(data.data.pageInfo?.hasNext));
      } else {
        setSearchResults([]);
        setSearchNextCursor(null);
        setSearchHasNext(false);
      }
    } catch {
      setSearchResults([]);
      setSearchNextCursor(null);
      setSearchHasNext(false);
    }
  };

  const loadMoreSearch = async () => {
    if (!isSearching) return;
    if (!searchHasNext || !searchNextCursor) return;
    if (!searchQuery.trim()) return;
    if (loadingMoreSearch) return;

    setLoadingMoreSearch(true);
    try {
      const res = await fetch(
        `/api/user/me/library?q=${encodeURIComponent(searchQuery)}&limit=20&cursor=${encodeURIComponent(searchNextCursor)}`
      );
      if (!res.ok) return;
      const data = await res.json().catch(() => null);
      if (!data?.ok) return;

      const nextItems: Book[] = Array.isArray(data.data?.items) ? data.data.items : [];
      setSearchResults((prev) => {
        const seen = new Set(prev.map((b) => b.id));
        const merged = [...prev];
        for (const b of nextItems) {
          if (!seen.has(b.id)) merged.push(b);
        }
        return merged;
      });

      setSearchNextCursor(data.data?.pageInfo?.nextCursor ?? null);
      setSearchHasNext(Boolean(data.data?.pageInfo?.hasNext));
    } finally {
      setLoadingMoreSearch(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsSearching(false);
    setSearchNextCursor(null);
    setSearchHasNext(false);
  };

  const BookCard = ({ book }: { book: Book }) => (
    <div className={styles.bookCard} onClick={() => router.push(`/book/${book.id}`)}>
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
              placeholder="내 라이브러리에서 검색..."
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
          <button 
            onClick={createNewBook} 
            disabled={creating}
            className={styles.searchButton}
            style={{ marginLeft: "auto" }}
          >
            {creating ? "생성 중..." : "+ 새 문제집"}
          </button>
        </div>

        {/* 검색 결과 */}
        {isSearching && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              검색 결과 ({searchResults.length})
            </h2>
            {searchResults.length > 0 ? (
              <>
                <div className={styles.bookGrid}>
                  {searchResults.map((book) => (
                    <BookCard key={book.id} book={book} />
                  ))}
                </div>
                {searchHasNext && (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: "var(--space-lg)" }}>
                    <button
                      type="button"
                      className={styles.searchButton}
                      onClick={loadMoreSearch}
                      disabled={loadingMoreSearch}
                    >
                      {loadingMoreSearch ? "불러오는 중..." : "더 보기"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>검색 결과가 없습니다</p>
              </div>
            )}
          </div>
        )}

        {/* 내 라이브러리 */}
        {!isSearching && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              내 라이브러리 ({libraryBooks.length})
            </h2>
            {loading ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>로딩 중...</p>
              </div>
            ) : libraryBooks.length > 0 ? (
              <div className={styles.bookGrid}>
                {libraryBooks.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>
                  라이브러리가 비어있습니다
                </p>
                <p className={styles.emptyStateSubtext}>
                  다른 사람의 문제집을 라이브러리에 추가해보세요
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
