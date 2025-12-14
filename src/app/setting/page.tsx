import Sidebar from "@/components/Sidebar";
import styles from "../main/main.module.css";

export default function Setting() {
  return (
    <div className={styles.container}>
      <Sidebar />

      <div className={styles.content}>
        <div className={styles.section}>
          <h1 className={styles.sectionTitle}>설정</h1>

          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>준비 중입니다.</p>
            <p className={styles.emptyStateSubtext}>추후 계정/알림 설정을 추가할 예정입니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
