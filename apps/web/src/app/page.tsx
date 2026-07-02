import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <h1 className={styles.title}>AI Finance Manager</h1>
      <p className={styles.lead}>
        Foundation scaffold. Business features are not implemented yet.
      </p>
      <p className={styles.meta}>
        Health check: <code>/api/health</code>
      </p>
    </main>
  );
}
