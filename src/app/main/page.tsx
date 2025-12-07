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
        <h1 className="listname">최근 문제집</h1>
        <div>
            <div>
                <button>문제집</button>
                <button>문제집</button>
                <button>문제집</button>
            </div>
        </div>
      </div>
      <div className="box">
        <h1 className="listname">내 문제집</h1>
        <div>
            <div>
                <button>문제집</button>
                <button>문제집</button>
                <button>문제집</button>
            </div>
        </div>
      </div>
    </div>
  );
}
