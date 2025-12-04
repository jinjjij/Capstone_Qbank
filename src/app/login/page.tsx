import Image from "next/image";
import Link from "next/link"
import Form from "next/form"

export default function Login() {
  return (
    <div>
      <h1 className="title">Q Bank</h1>
      <div className="card">
        <h3>로그인 /api/session</h3>
        <Form action="/api/session">
          <div className="control">
            <label>이메일</label>
            <input id="li-email" type="email" required />
          </div>
          <div className="control">
            <label>비밀번호</label>
            <input id="li-pass" type="password" required />
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
