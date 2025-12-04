import Form from "next/form"

export default function Main() {
  return (
    <div>
      <div className="search">
        <form method="GET" action="/search">
            <input type="text" name="q" placeholder="문제집 검색" />
            <button >검색</button>
        </form>
      </div>
      <div className="box">
        <h1 className="listname">내 문제집</h1>
        <div style={{display: "flex"}}>
            <button>+</button>
            <h3>정렬 기준: </h3>
            <button>날짜순</button>
        </div>
        <div>
            <div style={{display: "flex"}}>
                <button>문제집</button>
                <h1>문제집 이름</h1>
                <h3>문제집 날짜</h3>
            </div>
            <div style={{display: "flex"}}>
                <button>문제집</button>
                <h1>문제집 이름</h1>
                <h3>문제집 날짜</h3>
            </div>
        </div>
      </div>
    </div>
  );
}
