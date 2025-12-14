"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface Question {
  id: number;
  question: string;
  choices?: { id: string; text: string; isCorrect?: boolean }[];
  answer: any;
  type: "MCQ" | "SHORT";
}

interface Book {
  id: number;
  title: string;
  description: string;
}

export default function SolvePage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;

  const [book, setBook] = useState<Book | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  const [wrongQuestionIndexes, setWrongQuestionIndexes] = useState<Set<number>>(new Set());
  const [finished, setFinished] = useState(false);

  const [showWrongNoteModal, setShowWrongNoteModal] = useState(false);
  const [wrongNoteTitle, setWrongNoteTitle] = useState("");
  const [wrongNoteCount, setWrongNoteCount] = useState<number>(0);
  const [creatingWrongNote, setCreatingWrongNote] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 문제집 정보 가져오기
        const bookRes = await fetch(`/api/books/${bookId}`);
        const bookData = await bookRes.json();
        if (bookData.ok) {
          setBook(bookData.data);
        }

        // 문제 목록 가져오기
        const questionsRes = await fetch(`/api/books/${bookId}/questions`);
        const questionsData = await questionsRes.json();
        if (questionsData.ok) {
          setQuestions(questionsData.data.items);
        }

        // 접근 기록 업데이트
        fetch(`/api/user/me/activity/${bookId}`, {
          method: "POST",
        }).catch(() => {});
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bookId]);

  useEffect(() => {
    if (!book) return;
    setWrongNoteTitle(`${book.title}의 오답노트`);
  }, [book]);

  useEffect(() => {
    // keep wrongNoteCount in sync with available wrong questions
    const max = wrongQuestionIndexes.size;
    setWrongNoteCount((prev) => {
      if (max === 0) return 0;
      if (!prev || prev < 1) return max;
      if (prev > max) return max;
      return prev;
    });
  }, [wrongQuestionIndexes]);

  const handleNext = () => {
    // Answer 화면에서 다음 문제로
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setSelectedAnswer(null);
    }
  };

  const handleFinish = () => {
    setFinished(true);
    setShowAnswer(false);
    setCreateError(null);
    setShowWrongNoteModal(false);
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    
    // 정답 체크 (처음 답변하는 경우만)
    if (!answeredQuestions.has(currentIndex)) {
      const currentQuestion = questions[currentIndex];
      const correctId = currentQuestion?.answer?.id;
      const isCorrect = selectedAnswer !== null && selectedAnswer === correctId;

      if (isCorrect) setCorrectCount((v) => v + 1);
      else {
        setWrongCount((v) => v + 1);
        setWrongQuestionIndexes((prev) => {
          const next = new Set(prev);
          next.add(currentIndex);
          return next;
        });
      }

      setAnsweredQuestions((prev) => {
        const next = new Set(prev);
        next.add(currentIndex);
        return next;
      });
    }
  };

  const createWrongNote = async () => {
    if (!book) return;
    if (wrongQuestionIndexes.size === 0) return;
    if (!wrongNoteTitle.trim()) {
      setCreateError("제목을 입력해주세요.");
      return;
    }

    const wrongQuestions = Array.from(wrongQuestionIndexes)
      .sort((a, b) => a - b)
      .map((idx) => questions[idx])
      .filter(Boolean);

    const take = Math.max(1, Math.min(wrongNoteCount || wrongQuestions.length, wrongQuestions.length));
    const selected = wrongQuestions.slice(0, take);

    const items = selected.map((q) => ({
      type: q.type,
      question: q.question,
      choices: q.type === "MCQ" ? (q.choices ?? []) : undefined,
      answer: q.answer,
    }));

    setCreatingWrongNote(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: wrongNoteTitle.trim(),
          description: null,
          visibility: "PRIVATE",
        }),
      });

      const data = await res.json().catch(() => null);
      const newId = data?.newBook?.id;
      if (!res.ok || !newId) {
        throw new Error(data?.error || "오답노트 생성에 실패했습니다.");
      }

      const qRes = await fetch(`/api/books/${newId}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, insert: { position: "end" } }),
      });
      const qData = await qRes.json().catch(() => null);
      if (!qRes.ok || !qData?.ok) {
        throw new Error(qData?.error || "오답 문제 추가에 실패했습니다.");
      }

      setShowWrongNoteModal(false);
      router.push(`/book/${newId}`);
    } catch (e: any) {
      setCreateError(e?.message || "오답노트 생성 중 오류가 발생했습니다.");
    } finally {
      setCreatingWrongNote(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!book || questions.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <p>문제집을 찾을 수 없습니다.</p>
      </div>
    );
  }

  if (finished) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "24px",
          backgroundColor: "#f5f5f5",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "560px",
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <h2 style={{ margin: "0 0 8px 0", fontSize: "20px" }}>풀이 완료</h2>
          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>{book.title}</p>

          <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
            <div style={{ flex: 1, textAlign: "center", border: "1px solid #eee", borderRadius: "10px", padding: "12px" }}>
              <div style={{ fontSize: "12px", color: "#666" }}>정답</div>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>{correctCount}</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", border: "1px solid #eee", borderRadius: "10px", padding: "12px" }}>
              <div style={{ fontSize: "12px", color: "#666" }}>오답</div>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>{wrongCount}</div>
            </div>
            <div style={{ flex: 1, textAlign: "center", border: "1px solid #eee", borderRadius: "10px", padding: "12px" }}>
              <div style={{ fontSize: "12px", color: "#666" }}>정답률</div>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                {correctCount + wrongCount > 0
                  ? `${Math.round((correctCount / (correctCount + wrongCount)) * 100)}%`
                  : "0%"}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "18px" }}>
            <button
              type="button"
              onClick={() => router.push(`/book/${bookId}`)}
              style={{
                flex: 1,
                padding: "12px 14px",
                border: "1px solid #ddd",
                borderRadius: "10px",
                backgroundColor: "#fff",
                cursor: "pointer",
              }}
            >
              문제집 상세로 돌아가기
            </button>
            <button
              type="button"
              onClick={() => {
                if (wrongQuestionIndexes.size > 0) {
                  setCreateError(null);
                  setShowWrongNoteModal(true);
                }
              }}
              disabled={wrongQuestionIndexes.size === 0}
              style={{
                flex: 1,
                padding: "12px 14px",
                border: "none",
                borderRadius: "10px",
                backgroundColor: wrongQuestionIndexes.size === 0 ? "#ccc" : "#2196F3",
                color: "white",
                cursor: wrongQuestionIndexes.size === 0 ? "not-allowed" : "pointer",
              }}
            >
              오답노트 만들기
            </button>
          </div>

          {wrongQuestionIndexes.size === 0 && (
            <p style={{ margin: "12px 0 0 0", color: "#666", fontSize: "13px" }}>
              오답이 없어 오답노트를 만들 수 없습니다.
            </p>
          )}
        </div>

        {showWrongNoteModal && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              zIndex: 50,
            }}
            onClick={() => {
              if (!creatingWrongNote) setShowWrongNoteModal(false);
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "560px",
                backgroundColor: "#fff",
                borderRadius: "12px",
                border: "1px solid #ddd",
                padding: "18px",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: "0 0 12px 0", fontSize: "18px" }}>오답노트 생성</h3>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#666", marginBottom: "6px" }}>
                    제목
                  </label>
                  <input
                    value={wrongNoteTitle}
                    onChange={(e) => setWrongNoteTitle(e.target.value)}
                    disabled={creatingWrongNote}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "10px",
                      fontSize: "14px",
                    }}
                    placeholder={`${book.title}의 오답노트`}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#666", marginBottom: "6px" }}>
                    포함할 문제 개수 (최대 {wrongQuestionIndexes.size})
                  </label>
                  <input
                    type="number"
                    min={wrongQuestionIndexes.size === 0 ? 0 : 1}
                    max={wrongQuestionIndexes.size}
                    value={wrongNoteCount}
                    onChange={(e) => setWrongNoteCount(Number(e.target.value))}
                    disabled={creatingWrongNote || wrongQuestionIndexes.size === 0}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "10px",
                      fontSize: "14px",
                    }}
                  />
                </div>
              </div>

              {createError && (
                <p style={{ margin: "10px 0 0 0", color: "#c62828", fontSize: "13px" }}>{createError}</p>
              )}

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  type="button"
                  onClick={() => setShowWrongNoteModal(false)}
                  disabled={creatingWrongNote}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    border: "1px solid #ddd",
                    borderRadius: "10px",
                    backgroundColor: "#fff",
                    cursor: creatingWrongNote ? "not-allowed" : "pointer",
                  }}
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={createWrongNote}
                  disabled={creatingWrongNote || wrongQuestionIndexes.size === 0}
                  style={{
                    flex: 1,
                    padding: "12px 14px",
                    border: "none",
                    borderRadius: "10px",
                    backgroundColor: creatingWrongNote || wrongQuestionIndexes.size === 0 ? "#ccc" : "#2196F3",
                    color: "white",
                    cursor: creatingWrongNote || wrongQuestionIndexes.size === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  {creatingWrongNote ? "생성 중..." : "생성"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      backgroundColor: "#f5f5f5",
      overflow: "hidden"
    }}>
      {/* 헤더 */}
      <div style={{
        padding: "16px",
        backgroundColor: "#fff",
        borderBottom: "1px solid #ddd",
        position: "relative"
      }}>
        <button
          type="button"
          onClick={() => router.push(`/book/${bookId}`)}
          style={{
            position: "absolute",
            left: "16px",
            top: "16px",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            color: "#333",
            padding: "6px 8px",
          }}
          aria-label="문제집 상세로 돌아가기"
        >
          ← 돌아가기
        </button>
        <h2 style={{ margin: 0, fontSize: "18px", textAlign: "center" }}>{book.title}</h2>
        <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#666", textAlign: "center" }}>
          {currentIndex + 1} / {questions.length}
        </p>
        
        {/* 통계 정보 */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "24px",
          marginTop: "12px",
          paddingTop: "12px",
          borderTop: "1px solid #eee"
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>정답</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#2e7d32" }}>{correctCount}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>오답</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#c62828" }}>{wrongCount}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "4px" }}>정답률</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1976d2" }}>
              {correctCount + wrongCount > 0 
                ? `${Math.round((correctCount / (correctCount + wrongCount)) * 100)}%` 
                : "0%"}
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div 
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "24px",
          backgroundColor: showAnswer ? "#e8f5e9" : "#fff3e0"
        }}
      >
        {!showAnswer ? (
          // Question 화면
          <div style={{ maxWidth: "600px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: "100%" }}>
              <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#333" }}>
                문제
              </h3>
              <p style={{ fontSize: "16px", lineHeight: "1.6", marginBottom: "24px" }}>
                {currentQuestion.question}
              </p>

              {currentQuestion.type === "MCQ" && currentQuestion.choices && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {currentQuestion.choices.map((choice) => (
                    <div
                      key={choice.id}
                      onClick={() => setSelectedAnswer(choice.id)}
                      style={{
                        padding: "12px",
                        border: selectedAnswer === choice.id ? "2px solid #007bff" : "2px solid #ddd",
                        borderRadius: "8px",
                        backgroundColor: selectedAnswer === choice.id ? "#e3f2fd" : "#fff",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                    >
                      {choice.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* 답 확인 버튼 */}
            <button
              onClick={handleShowAnswer}
              disabled={currentQuestion.type === "MCQ" && !selectedAnswer}
              style={{
                marginTop: "40px",
                padding: "15px 40px",
                fontSize: "18px",
                fontWeight: "bold",
                backgroundColor: currentQuestion.type === "MCQ" && !selectedAnswer ? "#ccc" : "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: currentQuestion.type === "MCQ" && !selectedAnswer ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#45a049")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#4CAF50")}
            >
              답 확인하기
            </button>
          </div>
        ) : (
          // Answer 화면
          <div style={{ maxWidth: "600px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>
            {currentQuestion.type === "MCQ" ? (
              <>
                <div style={{ width: "100%" }}>
                  {/* 맞았는지 틀렸는지 표시 */}
                  <div style={{ 
                    padding: "16px", 
                    borderRadius: "8px", 
                    marginBottom: "24px",
                    backgroundColor: selectedAnswer === currentQuestion.answer.id ? "#c8e6c9" : "#ffcdd2",
                    textAlign: "center"
                  }}>
                    <h3 style={{ 
                      fontSize: "24px", 
                      fontWeight: "bold", 
                      margin: 0,
                      color: selectedAnswer === currentQuestion.answer.id ? "#2e7d32" : "#c62828"
                    }}>
                      {selectedAnswer === currentQuestion.answer.id ? "정답입니다! ✓" : "틀렸습니다 ✗"}
                    </h3>
                  </div>

                  {/* 선지 목록 (정답/오답 표시) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {currentQuestion.choices?.map((choice) => {
                    const isCorrect = choice.id === currentQuestion.answer.id;
                    const isSelected = choice.id === selectedAnswer;
                    
                    let backgroundColor = "#fff";
                    let borderColor = "#ddd";
                    let textColor = "#333";
                    
                    if (isCorrect) {
                      backgroundColor = "#c8e6c9";
                      borderColor = "#2e7d32";
                      textColor = "#2e7d32";
                    } else if (isSelected) {
                      backgroundColor = "#ffcdd2";
                      borderColor = "#c62828";
                      textColor = "#c62828";
                    }
                    
                    return (
                      <div
                        key={choice.id}
                        style={{
                          padding: "12px",
                          border: `2px solid ${borderColor}`,
                          borderRadius: "8px",
                          backgroundColor,
                          color: textColor,
                          fontWeight: isCorrect || isSelected ? "bold" : "normal"
                        }}
                      >
                        {choice.text}
                        {isCorrect && " ✓ (정답)"}
                        {isSelected && !isCorrect && " ✗ (선택)"}
                      </div>
                    );
                  })}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ width: "100%" }}>
                <h3 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "16px", color: "#2e7d32" }}>
                  정답
                </h3>
                <p style={{ fontSize: "16px", lineHeight: "1.6" }}>
                  {JSON.stringify(currentQuestion.answer)}
                </p>
              </div>
            )}
            
            {/* 다음 문제 버튼 */}
            <button
              onClick={currentIndex === questions.length - 1 ? handleFinish : handleNext}
              style={{
                marginTop: "40px",
                padding: "15px 40px",
                fontSize: "18px",
                fontWeight: "bold",
                backgroundColor: "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "#1976D2";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = "#2196F3";
              }}
            >
              {currentIndex === questions.length - 1 ? "완료" : "다음 문제"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
