import { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc, setDoc } from 'firebase/firestore';
import styles from './Stage3.module.css';

// 3x2 puzzle: 6 pieces. P1 controls 0,2,4 (odd pieces). P2 controls 1,3,5.
const GRID = { cols: 3, rows: 2 };
const PIECE_EMOJIS = ['🌅', '🌴', '🦜', '🐚', '🌺', '⛵'];

function initPieces() {
  return PIECE_EMOJIS.map((emoji, i) => ({
    id: i,
    emoji,
    correctSlot: i,
    currentSlot: null, // null = in tray
  }));
}

// Shuffle array for tray order
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Stage3({ uid, roomCode, playerNumber, onBack, onClear }) {
  const [pieces, setPieces] = useState([]);
  const [cleared, setCleared] = useState(false);
  const [story, setStory] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [startTime] = useState(Date.now());

  const roomRef = doc(db, 'puzzle-rooms', roomCode);
  const gameRef = doc(db, 'puzzle-rooms', roomCode, 'games', 'stage3');

  const myPieceIds = playerNumber === 1 ? [0, 2, 4] : [1, 3, 5];
  const canControl = (pieceId) => myPieceIds.includes(pieceId);

  useEffect(() => {
    const init = async () => {
      const snap = await getDoc(gameRef);
      if (!snap.exists()) {
        await setDoc(gameRef, {
          pieces: initPieces(),
          cleared: false,
        });
      }
    };
    init();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(gameRef, (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      setPieces(d.pieces);
      if (d.cleared) setCleared(true);
    });
    return unsub;
  }, []);

  const handleDrop = async (slotIdx) => {
    if (dragging === null || cleared) return;
    const piece = pieces[dragging];
    if (!canControl(piece.id)) return;

    // Check if slot is taken by another piece
    const occupant = pieces.find(p => p.currentSlot === slotIdx && p.id !== piece.id);
    if (occupant) return;

    const newPieces = pieces.map(p =>
      p.id === piece.id ? { ...p, currentSlot: slotIdx } : p
    );

    // Check if all pieces are in correct slots
    const allCorrect = newPieces.every(p => p.currentSlot === p.correctSlot);

    await updateDoc(gameRef, { pieces: newPieces, cleared: allCorrect });
    if (allCorrect) {
      await updateDoc(roomRef, { stagesCleared: arrayUnion('stage3') });
    }
    setDragging(null);
  };

  const handleRemove = async (pieceId) => {
    if (!canControl(pieceId) || cleared) return;
    const newPieces = pieces.map(p =>
      p.id === pieceId ? { ...p, currentSlot: null } : p
    );
    await updateDoc(gameRef, { pieces: newPieces });
  };

  if (story) {
    return (
      <div className={styles.story}>
        <div className={styles.storyEmoji}>🌊</div>
        <h2>비밀의 바다</h2>
        <p>비밀의 바다에 도착했어!<br/>흩어진 퍼즐 조각을 맞춰보자 🧩</p>
        <p className={styles.storyHint}>
          Player 1은 🌅🦜🌺 조각을,<br/>
          Player 2는 🌴🐚⛵ 조각을 배치해요!
        </p>
        <button className={styles.storyBtn} onClick={() => setStory(false)}>시작하기 ✨</button>
      </div>
    );
  }

  if (cleared) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const stars = elapsed < 60 ? 3 : elapsed < 120 ? 2 : 1;
    return (
      <div className={styles.story}>
        <div className={styles.storyEmoji}>🎉</div>
        <h2>스테이지 클리어!</h2>
        <div className={styles.stars}>{'⭐'.repeat(stars)}</div>
        <p>시간: {elapsed}초</p>
        <button className={styles.storyBtn} onClick={onClear}>모험 완료! 🏆</button>
      </div>
    );
  }

  const trayPieces = pieces.filter(p => p.currentSlot === null && canControl(p.id));

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← 지도</button>
        <h2 className={styles.title}>🌊 비밀의 바다</h2>
        <p className={styles.playerTag}>Player {playerNumber} — 내 조각: {myPieceIds.map(i => PIECE_EMOJIS[i]).join(' ')}</p>
      </div>

      {/* Puzzle Grid */}
      <div className={styles.grid}>
        {Array.from({ length: 6 }, (_, slotIdx) => {
          const piece = pieces.find(p => p.currentSlot === slotIdx);
          return (
            <div
              key={slotIdx}
              className={`${styles.slot} ${piece ? styles.occupied : ''} ${piece?.correctSlot === slotIdx ? styles.correct : ''} ${dragging !== null ? styles.dropTarget : ''}`}
              onClick={() => {
                if (dragging !== null) {
                  handleDrop(slotIdx);
                } else if (piece && canControl(piece.id)) {
                  handleRemove(piece.id);
                }
              }}
            >
              {piece ? (
                <span className={styles.pieceEmoji}>{piece.emoji}</span>
              ) : (
                <span className={styles.slotNum}>{slotIdx + 1}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Tray */}
      <div className={styles.tray}>
        <p className={styles.trayLabel}>내 조각 (탭해서 선택 → 슬롯 탭해서 배치)</p>
        <div className={styles.trayPieces}>
          {trayPieces.map(p => (
            <button
              key={p.id}
              className={`${styles.trayPiece} ${dragging === p.id ? styles.selected : ''}`}
              onClick={() => setDragging(dragging === p.id ? null : p.id)}
            >
              {p.emoji}
            </button>
          ))}
          {trayPieces.length === 0 && (
            <p className={styles.trayEmpty}>모두 배치 완료! ✅</p>
          )}
        </div>
      </div>
    </div>
  );
}
