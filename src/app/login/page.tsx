"use client";
import Image from "next/image";
import Link from "next/link"
import Form from "next/form"
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const resData = await res.json();

    // 로그인 성공 여부에 따라 프론트에서 라우팅
    if (resData.ok) {
      router.push("/main");
    } else {
      alert(resData.error);
    }
  }
  
  return (
    <div>
      <h1 className="title">Q Bank</h1>
      <div className="card">
        <h3>로그인 /api/session</h3>
        <Form action={handleSubmit}>
          <div className="control">
            <label>이메일</label>
            <input id="li-email" name="email" type="email" required />
          </div>
          <div className="control">
            <label>비밀번호</label>
            <input id="li-pass" name="password" type="password" required />
          </div>
          <button type="submit">POST 로그인</button>
        </Form>
        <Link href="/signup">
          <button>회원가입</button>
        </Link>
        <div className="muted" style={{marginTop:'6px'}}>성공 시 브라우저가 <code>Set-Cookie: session=...</code>을 저장합니다.</div>
      </div>
    </div>
  );
}
