"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Question {
	id: number;
	orderIndex?: number;
	question: string;
	choices?: { id: string; text: string }[];
	type: "MCQ" | "SHORT";
}

interface Book {
	id: number;
	title: string;
	description?: string | null;
	questionCount?: number;
}

export default function BookPage() {
	const params = useParams();
	const bookId = (params as any).id as string;

	const [book, setBook] = useState<Book | null>(null);
	const [questions, setQuestions] = useState<Question[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!bookId) return;

		const fetchData = async () => {
			setLoading(true);
			setError(null);

			try {
				const [bookRes, questionsRes] = await Promise.all([
					fetch(`/api/books/${bookId}`),
					fetch(`/api/books/${bookId}/questions`),
				]);

				const bookJson = await bookRes.json().catch(() => null);
				const qJson = await questionsRes.json().catch(() => null);

				if (bookRes.ok && bookJson && bookJson.ok) {
					setBook(bookJson.data);
				} else if (bookJson && bookJson.error) {
					setError(bookJson.error ?? "책을 불러오지 못했습니다.");
				}

				if (questionsRes.ok && qJson && qJson.ok) {
					setQuestions(qJson.data.items ?? []);
				}
			} catch (e) {
				console.error(e);
				setError("데이터를 불러오는 중 오류가 발생했습니다.");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [bookId]);

	if (loading) {
		return (
			<div style={{ padding: 24 }}>
				<p>로딩 중...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div style={{ padding: 24 }}>
				<p>오류: {error}</p>
			</div>
		);
	}

	if (!book) {
		return (
			<div style={{ padding: 24 }}>
				<p>문제집을 찾을 수 없습니다.</p>
			</div>
		);
	}

	return (
		<div style={{ padding: 24 }}>
			<header style={{ marginBottom: 18 }}>
				<h1 style={{ margin: 0 }}>{book.title}</h1>
				{book.description ? (
					<p style={{ color: "#666", marginTop: 8 }}>{book.description}</p>
				) : null}
				<div style={{ marginTop: 8, color: "#444" }}>문제 수: {book.questionCount ?? questions.length}</div>
			</header>

			<section>
				<h2 style={{ fontSize: 18, marginBottom: 8 }}>문제 목록</h2>
				{questions.length === 0 ? (
					<p>문제가 없습니다.</p>
				) : (
					<ul style={{ paddingLeft: 16 }}>
						{questions.map((q) => (
							<li key={q.id} style={{ marginBottom: 12 }}>
								<div style={{ fontWeight: 600 }}>{q.orderIndex ?? "#"} {q.question}</div>
								{q.type === "MCQ" && q.choices ? (
									<div style={{ marginTop: 6, color: "#444" }}>
										선택지: {q.choices.map((c) => c.text).join(" | ")}
									</div>
								) : null}
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}

