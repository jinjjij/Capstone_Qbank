export default function Home() {
  // This page is handled by middleware
  // Users will be redirected to /main or /login
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <p>Redirecting...</p>
    </div>
  );
}
