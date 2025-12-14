"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

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

  const handleNext = () => {
    // Answer 화면에서 다음 문제로
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowAnswer(false);
      setSelectedAnswer(null);
    }
  };

  const handleShowAnswer = () => {
    setShowAnswer(true);
    
    // 정답 체크 (처음 답변하는 경우만)
    if (!answeredQuestions.has(currentIndex)) {
      const currentQuestion = questions[currentIndex];
      const isCorrect = selectedAnswer === currentQuestion.answer.id;
      
      if (isCorrect) {
        setCorrectCount(correctCount + 1);
      } else {
        setWrongCount(wrongCount + 1);
      }
      
      setAnsweredQuestions(new Set(answeredQuestions).add(currentIndex));
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
        borderBottom: "1px solid #ddd"
      }}>
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
              style={{
                marginTop: "40px",
                padding: "15px 40px",
                fontSize: "18px",
                fontWeight: "bold",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
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
              onClick={handleNext}
              disabled={currentIndex === questions.length - 1}
              style={{
                marginTop: "40px",
                padding: "15px 40px",
                fontSize: "18px",
                fontWeight: "bold",
                backgroundColor: currentIndex === questions.length - 1 ? "#ccc" : "#2196F3",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: currentIndex === questions.length - 1 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                if (currentIndex !== questions.length - 1) {
                  e.currentTarget.style.backgroundColor = "#1976D2";
                }
              }}
              onMouseOut={(e) => {
                if (currentIndex !== questions.length - 1) {
                  e.currentTarget.style.backgroundColor = "#2196F3";
                }
              }}
            >
              {currentIndex === questions.length - 1 ? "마지막 문제" : "다음 문제"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
