"use client";
import Image from "next/image";
import Link from "next/link"
import Form from "next/form"
import { useRouter } from "next/navigation";

export default function Signup() {
  const router = useRouter();

  async function handleSign(formData: FormData) {
    const data = {
      email: formData.get("email"),
      password: formData.get("password"),
    };

    const res = await fetch("/api/users", {
      method: "POST",
      //headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const resData = await res.json();

    if (res.ok == true) {
      alert("가입되었습니다.");
      router.push("/login");
    } else {
      alert(resData.error);
    }
  }
  
  return (
    <div>
      <h1 className="title">Q Bank</h1>
      <div className="card">
        <h3>회원가입 /api/users</h3>
        <Form action={handleSign}>
          <div className="control">
            <label>이메일</label>
            <input id="su-email" name="email" type="email" required placeholder="you@example.com" />
          </div>
          <div className="control">
            <label>비밀번호</label>
            <input id="su-pass" name="password" type="password" required placeholder="8~72자" />
          </div>
          <button type="submit">POST 회원가입</button>
        </Form>
      </div>
    </div>
  );
}
