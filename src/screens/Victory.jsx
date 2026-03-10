import styles from './Victory.module.css';

export default function Victory({ onBack }) {
  return (
    <div className={styles.container}>
      <div className={`${styles.content} fade-in`}>
        <div className={styles.trophy}>🏆</div>
        <h1 className={styles.title}>모험 완료!</h1>
        <p className={styles.subtitle}>축하해요! 둘이 함께 보물섬의<br/>모든 비밀을 풀었어요! 💕</p>
        <div className={styles.badge}>
          <span className={styles.badgeEmoji}>👑👑</span>
          <span className={styles.badgeText}>최고의 커플 모험가</span>
        </div>
        <div className={styles.stars}>⭐⭐⭐</div>
        <button className={styles.btn} onClick={onBack}>지도로 돌아가기 🗺️</button>
      </div>
    </div>
  );
}
