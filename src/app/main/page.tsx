import Sidebar from "@/components/Sidebar";
import Link from "next/link";

type BookItem = {
  id: number;
  title: string;
};

async function fetchRecentBooks(limit = 8) {
  const res = await fetch(`/api/books?limit=${limit}&sort=updatedAt&order=desc`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  if (!json || !json.ok) return null;
  return json.data.items as BookItem[];
}

export default async function Main() {
  const recent = (await fetchRecentBooks(8)) || [];

  return (
    <div>
      <Sidebar />

      <div className="search">
        <form method="GET" action="/search">
          <input type="text" name="q" placeholder="문제집 검색" />
          <button>검색</button>
        </form>
      </div>

      <div className="box">
        <h1 className="listname">최근 문제집</h1>
        <div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {recent.length === 0 ? (
              <div>최근 문제집이 없습니다.</div>
            ) : (
              recent.map((b) => {
                const letter = (b.title || "").trim().charAt(0).toUpperCase() || "#";
                return (
                  <Link
                    key={b.id}
                    href={`/book/${b.id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div
                        aria-hidden
                        style={{
                          width: 72,
                          height: 72,
                          borderRadius: 8,
                          backgroundColor: "#1976d2",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 28,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {letter}
                      </div>
                      <div style={{ marginTop: 6, maxWidth: 96, textAlign: "center", fontSize: 12, color: "#222" }}>
                        {b.title}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
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