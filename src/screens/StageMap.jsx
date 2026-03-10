import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import styles from './StageMap.module.css';

const STAGES = [
  { id: 'stage1', name: '마법의 숲', emoji: '🌲', desc: '숨겨진 카드를 찾아보자!' },
  { id: 'stage2', name: '수정 산', emoji: '🏔️', desc: '암호를 해독하라!' },
  { id: 'stage3', name: '비밀의 바다', emoji: '🌊', desc: '퍼즐 조각을 맞춰라!' },
];

export default function StageMap({ roomCode, playerNumber, onSelect, onVictory }) {
  const [cleared, setCleared] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'puzzle-rooms', roomCode), (snap) => {
      if (snap.exists()) {
        setCleared(snap.data().stagesCleared || []);
      }
    });
    return unsub;
  }, [roomCode]);

  const isUnlocked = (idx) => idx === 0 || cleared.includes(STAGES[idx - 1].id);
  const isCleared = (id) => cleared.includes(id);
  const allCleared = STAGES.every(s => cleared.includes(s.id));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>🏝️ 보물섬 지도</h1>
        <p className={styles.roomInfo}>방 코드: <span className={styles.code}>{roomCode}</span></p>
        <p className={styles.playerInfo}>Player {playerNumber}</p>
      </div>

      <div className={styles.map}>
        <div className={styles.path}></div>
        {STAGES.map((stage, idx) => (
          <button
            key={stage.id}
            className={`${styles.stage} ${isCleared(stage.id) ? styles.cleared : ''} ${!isUnlocked(idx) ? styles.locked : ''}`}
            onClick={() => isUnlocked(idx) && onSelect(stage.id)}
            disabled={!isUnlocked(idx)}
          >
            <div className={styles.stageEmoji}>
              {!isUnlocked(idx) ? '🔒' : stage.emoji}
            </div>
            <div className={styles.stageName}>{stage.name}</div>
            {isCleared(stage.id) && <div className={styles.star}>⭐</div>}
          </button>
        ))}
      </div>

      {allCleared && (
        <button className={`${styles.victoryBtn} fade-in`} onClick={onVictory}>
          🏆 모험 완료! 축하 보기
        </button>
      )}
    </div>
  );
}
