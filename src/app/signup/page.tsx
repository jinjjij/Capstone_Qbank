import Image from "next/image";
import Link from "next/link"
import Form from "next/form"

export default function Signup() {
  return (
    <div>
      <h1 className="title">Q Bank</h1>
      <div className="card">
        <h3>회원가입 /api/users</h3>
        <Form action="/api/users">
          <div className="control">
            <label>이메일</label>
            <input id="su-email" type="email" required placeholder="you@example.com" />
          </div>
          <div className="control">
            <label>비밀번호</label>
            <input id="su-pass" type="password" required placeholder="8~72자" />
          </div>
          <button type="submit">POST 회원가입</button>
        </Form>
      </div>
    </div>
  );
}
