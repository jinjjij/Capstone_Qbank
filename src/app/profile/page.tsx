import Sidebar from "@/components/Sidebar";
import styles from "../main/main.module.css";

export default function Profile() {
  return (
    <div className={styles.container}>
      <Sidebar />

      <div className={styles.content}>
        <div className={styles.section}>
          <h1 className={styles.sectionTitle}>내 프로필</h1>

          <div
            style={{
              padding: "var(--space-xl)",
              backgroundColor: "var(--bg-card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-light)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-sm)",
              maxWidth: 720,
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>홍길동</div>
            <div style={{ color: "var(--text-secondary)" }}>hong@gmail.com</div>
            <div style={{ color: "var(--text-muted)", fontSize: 14 }}>가입 일자: 2025.10.17</div>

            <div style={{ marginTop: "var(--space-md)" }}>
              <button type="button" className={styles.clearButton}>
                회원 탈퇴
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
