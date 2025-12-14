"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import styles from "../../main/main.module.css";

interface Question {
	id: number;
	orderIndex?: number;
	question: string;
	type: "MCQ" | "SHORT";
}

interface Book {
	id: number;
	title: string;
	description?: string | null;
	questionCount?: number;
	visibility?: "PUBLIC" | "PRIVATE";
	authorEmail?: string | null;
	authorId?: number | null;
}

interface Me {
	id: number;
	email: string;
	isAdmin: boolean;
}

export default function BookPage() {
	const params = useParams();
	const router = useRouter();
	const bookId = (params as { id?: string }).id as string;

	const [book, setBook] = useState<Book | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [me, setMe] = useState<Me | null>(null);

	const [editMode, setEditMode] = useState(false);
	const [editTitle, setEditTitle] = useState("");
	const [editDescription, setEditDescription] = useState("");
	const [editVisibility, setEditVisibility] = useState<"PUBLIC" | "PRIVATE">("PRIVATE");
	const [savingBook, setSavingBook] = useState(false);

	const [deletingQuestionIds, setDeletingQuestionIds] = useState<Set<number>>(new Set());

	const [deleteOpen, setDeleteOpen] = useState(false);
	const [deletingBook, setDeletingBook] = useState(false);

	const [addOpen, setAddOpen] = useState(false);
	const [addQuestionCount, setAddQuestionCount] = useState(10);
	const [addMessage, setAddMessage] = useState("");
	const [addFile, setAddFile] = useState<File | null>(null);
	const [addingQuestions, setAddingQuestions] = useState(false);

	const fetchData = async () => {
		if (!bookId) return;
		setLoading(true);
		setError(null);

		try {
			const [bookRes, questionsRes, meRes] = await Promise.all([
				fetch(`/api/books/${bookId}`),
				fetch(`/api/books/${bookId}/questions`),
				fetch(`/api/users/me`).catch(() => null as any),
			]);

			const bookJson = await bookRes.json().catch(() => null);
			const qJson = await questionsRes.json().catch(() => null);
			const meJson = meRes ? await meRes.json().catch(() => null) : null;

			if (bookRes.ok && bookJson?.ok) {
				setBook(bookJson.data);
			} else {
				setError(bookJson?.error ?? "문제집을 불러오지 못했습니다.");
				setBook(null);
			}

			if (questionsRes.ok && qJson?.ok) {
				setQuestions(qJson.data.items ?? []);
			} else {
				setQuestions([]);
			}

			if (meRes && meRes.ok && meJson && typeof meJson.id === "number") {
				setMe({ id: meJson.id, email: String(meJson.email ?? ""), isAdmin: Boolean(meJson.isAdmin) });
			} else {
				setMe(null);
			}
		} catch (e) {
			console.error(e);
			setError("데이터를 불러오는 중 오류가 발생했습니다.");
			setBook(null);
			setQuestions([]);
			setMe(null);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (!bookId) return;
		fetchData();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [bookId]);

	const canEditBook = Boolean(me && book && (me.isAdmin || (book.authorId != null && me.id === book.authorId)));
	const canDeleteBook = canEditBook;

	const handleSaveBook = async () => {
		if (!book) return;
		if (!editTitle.trim()) {
			alert("제목을 입력해주세요.");
			return;
		}

		setSavingBook(true);
		try {
			const res = await fetch(`/api/books/${bookId}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					title: editTitle,
					description: editDescription,
					visibility: editVisibility,
				}),
			});
			const data = await res.json().catch(() => null);

			if (!res.ok || !data?.ok) {
				alert("수정에 실패했습니다.");
				return;
			}

			setBook(data.data);
			setEditMode(false);
		} catch (e) {
			console.error(e);
			alert("수정에 실패했습니다.");
		} finally {
			setSavingBook(false);
		}
	};

	const handleDeleteQuestion = async (questionId: number) => {
		if (deletingQuestionIds.has(questionId)) return;

		setDeletingQuestionIds((prev) => {
			const next = new Set(prev);
			next.add(questionId);
			return next;
		});

		try {
			const res = await fetch(`/api/questions/${questionId}`, { method: "DELETE" });
			const data = await res.json().catch(() => null);

			if (!res.ok || !data?.ok) {
				alert("삭제에 실패했습니다.");
				return;
			}

			setQuestions((prev) => prev.filter((q) => q.id !== questionId));
			setBook((prev) => {
				if (!prev) return prev;
				const nextCount = data?.data?.questionCount;
				if (typeof nextCount === "number") return { ...prev, questionCount: nextCount };
				return prev;
			});
		} catch (e) {
			console.error(e);
			alert("삭제에 실패했습니다.");
		} finally {
			setDeletingQuestionIds((prev) => {
				const next = new Set(prev);
				next.delete(questionId);
				return next;
			});
		}
	};

	const handleAddQuestions = async () => {
		if (!addFile && !addMessage.trim()) {
			alert("파일을 추가하거나, 프롬프트(메세지)를 입력해주세요.");
			return;
		}
		if (!Number.isInteger(addQuestionCount) || addQuestionCount <= 0) {
			alert("문제 개수를 확인해주세요.");
			return;
		}

		setAddingQuestions(true);
		try {
			const form = new FormData();
			if (addFile) form.append("file", addFile);
			form.append("questionCount", String(addQuestionCount));
			form.append("message", addMessage);

			const queryRes = await fetch("/api/ai/query", { method: "POST", body: form });
			const queryJson = await queryRes.json().catch(() => null);
			if (!queryRes.ok || !queryJson?.ok) {
				alert("문제 생성에 실패했습니다.");
				return;
			}

			const items = queryJson?.data?.items;
			if (!Array.isArray(items) || items.length === 0) {
				alert("생성된 문제가 없습니다.");
				return;
			}

			const addRes = await fetch(`/api/books/${bookId}/questions`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ items }),
			});
			const addJson = await addRes.json().catch(() => null);
			if (!addRes.ok || !addJson?.ok) {
				alert("문제 추가에 실패했습니다.");
				return;
			}

			setAddOpen(false);
			setAddFile(null);
			setAddMessage("");
			await fetchData();
		} catch (e) {
			console.error(e);
			alert("문제 추가에 실패했습니다.");
		} finally {
			setAddingQuestions(false);
		}
	};

	const handleDeleteBook = async () => {
		if (deletingBook) return;
		setDeletingBook(true);
		try {
			const res = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
			const data = await res.json().catch(() => null);
			if (!res.ok || !data?.ok) {
				// 402 FORBIDDEN, 401 UNAUTHORIZED, etc.
				const msg = data?.error ? String(data.error) : "문제집 삭제에 실패했습니다.";
				alert(msg);
				return;
			}
			setDeleteOpen(false);
			router.push("/library");
		} catch (e) {
			console.error(e);
			alert("문제집 삭제에 실패했습니다.");
		} finally {
			setDeletingBook(false);
		}
	};

	return (
		<div className={styles.container}>
			<Sidebar />
			<div className={styles.content}>
				{loading ? (
					<div className={styles.emptyState}>
						<p className={styles.emptyStateText}>로딩 중...</p>
					</div>
				) : error ? (
					<div className={styles.emptyState}>
						<p className={styles.emptyStateText}>오류: {error}</p>
					</div>
				) : !book ? (
					<div className={styles.emptyState}>
						<p className={styles.emptyStateText}>문제집을 찾을 수 없습니다.</p>
					</div>
				) : (
					<>
						<div className={styles.section}>
							<div
								style={{
									display: "flex",
									gap: "var(--space-xl)",
									justifyContent: "space-between",
									alignItems: "flex-start",
									flexWrap: "wrap",
								}}
							>
								<div style={{ minWidth: 280, flex: 1 }}>
									{editMode ? (
										<>
											<input
												className={styles.searchInput}
												value={editTitle}
												onChange={(e) => setEditTitle(e.target.value)}
												placeholder="문제집 제목"
												style={{
													fontSize: 28,
													fontWeight: 700,
													padding: "var(--space-md)",
													marginBottom: "var(--space-sm)",
													width: "100%",
												}}
											/>
											<textarea
												className={styles.searchInput}
												value={editDescription}
												onChange={(e) => setEditDescription(e.target.value)}
												placeholder="설명"
												rows={3}
												style={{ padding: "var(--space-md)", width: "100%", resize: "vertical" }}
											/>
											<div style={{ marginTop: "var(--space-md)" }}>
												<div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 6 }}>
													공개 설정
												</div>
												<select
													className={styles.searchInput}
													value={editVisibility}
													onChange={(e) => setEditVisibility(e.target.value as "PUBLIC" | "PRIVATE")}
													disabled={savingBook}
													style={{ padding: "var(--space-md)", width: "100%" }}
												>
													<option value="PRIVATE">비공개</option>
													<option value="PUBLIC">공개</option>
												</select>
											</div>
										</>
									) : (
										<>
											<h1 className={styles.sectionTitle} style={{ marginBottom: "var(--space-sm)" }}>
												{book.title}
											</h1>
											<p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>
												{book.description || "설명이 없습니다"}
											</p>
										</>
									)}
									<div style={{ marginTop: "var(--space-md)", color: "var(--text-muted)", fontSize: 14, display: "flex", flexDirection: "column", gap: 4 }}>
										<div>작성자 이메일: {book.authorEmail ?? "-"}</div>
										<div>공개 설정: {book.visibility === "PUBLIC" ? "공개" : "비공개"}</div>
										<div>문제 수: {book.questionCount ?? questions.length}</div>
									</div>
								</div>

									<div style={{ display: "flex", gap: "var(--space-sm)", flexWrap: "wrap", alignItems: "center" }}>
										<button className={styles.searchButton} onClick={() => router.push(`/solve/${bookId}`)}>
											문제풀이
										</button>
										<button type="button" className={styles.clearButton} onClick={() => setAddOpen(true)}>
											문제 추가
										</button>
										{canDeleteBook ? (
											<button
												type="button"
												className={styles.clearButton}
												disabled={deletingBook}
												onClick={() => setDeleteOpen(true)}
											>
												{deletingBook ? "삭제 중..." : "문제집 삭제"}
											</button>
										) : null}
									</div>
							</div>
						</div>

						<div className={styles.section}>
							<h2 className={styles.sectionTitle} style={{ fontSize: 20 }}>
								문제 목록 ({questions.length})
							</h2>
							{canEditBook ? (
								<div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "var(--space-md)" }}>
									<button
										type="button"
										className={styles.clearButton}
										aria-pressed={editMode}
										disabled={savingBook}
										onClick={() => {
											if (!editMode) {
												setEditTitle(book.title ?? "");
												setEditDescription(book.description ?? "");
												setEditVisibility(book.visibility ?? "PRIVATE");
												setEditMode(true);
												return;
											}
											handleSaveBook();
										}}
									>
										{editMode ? "저장" : "수정"}
									</button>
								</div>
							) : null}

							{questions.length === 0 ? (
								<div className={styles.emptyState}>
									<p className={styles.emptyStateText}>문제가 없습니다</p>
								</div>
							) : (
								<div style={{ display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
									{questions.map((q, index) => (
										<div
											key={q.id}
											style={{
												padding: "var(--space-lg)",
												backgroundColor: "var(--bg-card)",
												borderRadius: "var(--radius-lg)",
												border: "1px solid var(--border-light)",
												boxShadow: "var(--shadow-sm)",
											}}
										>
											<div style={{ display: "flex", justifyContent: "space-between", gap: "var(--space-md)" }}>
												<div style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: 6, flex: 1 }}>
													{q.orderIndex ?? index + 1}. {q.question}
												</div>
												{editMode ? (
													<button
														type="button"
														className={styles.clearButton}
														disabled={deletingQuestionIds.has(q.id)}
														onClick={() => handleDeleteQuestion(q.id)}
													>
														{deletingQuestionIds.has(q.id) ? "삭제 중..." : "삭제"}
													</button>
												) : null}
											</div>
											<div style={{ fontSize: 13, color: "var(--text-muted)" }}>
												유형: {q.type === "MCQ" ? "객관식" : "주관식"}
											</div>
										</div>
									))}
								</div>
							)}
						</div>
					</>
				)}
			</div>

			{addOpen ? (
				<div
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.35)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 2000,
						padding: "var(--space-xl)",
					}}
					onClick={() => {
						if (!addingQuestions) setAddOpen(false);
					}}
				>
					<div
						style={{
							width: "min(720px, 100%)",
							backgroundColor: "var(--bg-card)",
							borderRadius: "var(--radius-lg)",
							border: "1px solid var(--border-light)",
							boxShadow: "var(--shadow-md)",
							padding: "var(--space-xl)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--space-md)" }}>
							<div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>문제 추가</div>
							<button
								type="button"
								className={styles.clearButton}
								disabled={addingQuestions}
								onClick={() => setAddOpen(false)}
								style={{ padding: "10px 14px" }}
							>
								닫기
							</button>
						</div>

						<div style={{ marginTop: "var(--space-lg)", display: "flex", flexDirection: "column", gap: "var(--space-md)" }}>
							<div>
								<div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 6 }}>문제 개수</div>
								<input
									type="number"
									min={1}
									className={styles.searchInput}
									value={addQuestionCount}
									onChange={(e) => setAddQuestionCount(Number(e.target.value))}
									disabled={addingQuestions}
								/>
							</div>

							<div>
								<div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 6 }}>짧은 메세지</div>
								<textarea
									className={styles.searchInput}
									rows={3}
									placeholder="예) 중요한 개념 위주로, 난이도는 중간"
									value={addMessage}
									onChange={(e) => setAddMessage(e.target.value)}
									disabled={addingQuestions}
									style={{ resize: "vertical" }}
								/>
							</div>

							<div>
								<div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 6 }}>추가할 파일 (선택)</div>
								<input
									type="file"
									accept=".pdf,.txt"
									onChange={(e) => setAddFile(e.target.files?.[0] || null)}
									disabled={addingQuestions}
								/>
							</div>

							<div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)", marginTop: "var(--space-sm)" }}>
								<button
									type="button"
									className={styles.searchButton}
									disabled={addingQuestions}
									onClick={handleAddQuestions}
								>
									{addingQuestions ? "추가 중..." : "추가"}
								</button>
							</div>
						</div>
					</div>
				</div>
			) : null}

			{deleteOpen ? (
				<div
					style={{
						position: "fixed",
						inset: 0,
						background: "rgba(0,0,0,0.35)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						zIndex: 2100,
						padding: "var(--space-xl)",
					}}
					onClick={() => {
						if (!deletingBook) setDeleteOpen(false);
					}}
				>
					<div
						style={{
							width: "min(560px, 100%)",
							backgroundColor: "var(--bg-card)",
							borderRadius: "var(--radius-lg)",
							border: "1px solid var(--border-light)",
							boxShadow: "var(--shadow-md)",
							padding: "var(--space-xl)",
						}}
						onClick={(e) => e.stopPropagation()}
					>
						<div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>문제집 삭제</div>
						<p style={{ marginTop: "var(--space-md)", marginBottom: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>
							이 작업은 되돌릴 수 없습니다. 정말로 이 문제집을 삭제할까요?
						</p>

						<div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-sm)", marginTop: "var(--space-lg)" }}>
							<button
								type="button"
								className={styles.clearButton}
								disabled={deletingBook}
								onClick={() => setDeleteOpen(false)}
							>
								취소
							</button>
							<button
								type="button"
								className={styles.searchButton}
								disabled={deletingBook}
								onClick={handleDeleteBook}
							>
								{deletingBook ? "삭제 중..." : "삭제"}
							</button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

