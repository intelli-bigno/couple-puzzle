import { useState, useEffect, useCallback } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc, setDoc } from 'firebase/firestore';
import styles from './Stage1.module.css';

const EMOJIS = ['🌸', '🦋', '🍄', '🌺', '🐝', '💎'];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function initCards() {
  const pairs = EMOJIS.flatMap(e => [e, e]);
  return shuffle(pairs).map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

export default function Stage1({ uid, roomCode, playerNumber, onBack, onClear }) {
  const [cards, setCards] = useState([]);
  const [turn, setTurn] = useState(1);
  const [flipped, setFlipped] = useState([]);
  const [mistakes, setMistakes] = useState(0);
  const [startTime] = useState(Date.now());
  const [cleared, setCleared] = useState(false);
  const [story, setStory] = useState(true);

  const roomRef = doc(db, 'puzzle-rooms', roomCode);
  const gameRef = doc(db, 'puzzle-rooms', roomCode, 'games', 'stage1');
  const isMyTurn = turn === playerNumber;

  // Initialize game
  useEffect(() => {
    const init = async () => {
      const snap = await getDoc(gameRef);
      if (!snap.exists()) {
        const newCards = initCards();
        await updateDoc(roomRef, {}).catch(() => {});
        await setDoc(gameRef, {
          cards: newCards,
          turn: 1,
          flippedIndices: [],
          mistakes: 0,
          matched: 0,
          cleared: false,
        });
      }
    };
    init();
  }, []);

  // Listen for changes
  useEffect(() => {
    const unsub = onSnapshot(gameRef, (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setCards(data.cards);
      setTurn(data.turn);
      setFlipped(data.flippedIndices || []);
      setMistakes(data.mistakes);
      if (data.cleared && !cleared) {
        setCleared(true);
      }
    });
    return unsub;
  }, []);

  const handleFlip = useCallback(async (idx) => {
    if (!isMyTurn || cleared) return;
    if (cards[idx].flipped || cards[idx].matched) return;
    if (flipped.length >= 2) return;

    const newFlipped = [...flipped, idx];
    const newCards = cards.map((c, i) => i === idx ? { ...c, flipped: true } : c);

    if (newFlipped.length === 2) {
      const [a, b] = newFlipped;
      const isMatch = newCards[a].emoji === newCards[b].emoji;

      if (isMatch) {
        newCards[a].matched = true;
        newCards[b].matched = true;
        const matchCount = newCards.filter(c => c.matched).length / 2;
        const isCleared = matchCount === EMOJIS.length;

        await updateDoc(gameRef, {
          cards: newCards,
          flippedIndices: [],
          matched: matchCount,
          cleared: isCleared,
        });

        if (isCleared) {
          await updateDoc(roomRef, { stagesCleared: arrayUnion('stage1') });
        }
      } else {
        // Show both cards briefly then flip back
        await updateDoc(gameRef, {
          cards: newCards,
          flippedIndices: newFlipped,
          mistakes: mistakes + 1,
        });

        setTimeout(async () => {
          const resetCards = newCards.map((c, i) =>
            (i === a || i === b) && !c.matched ? { ...c, flipped: false } : c
          );
          await updateDoc(gameRef, {
            cards: resetCards,
            flippedIndices: [],
            turn: turn === 1 ? 2 : 1,
          });
        }, 1200);
      }
    } else {
      await updateDoc(gameRef, {
        cards: newCards,
        flippedIndices: newFlipped,
      });
    }
  }, [isMyTurn, cards, flipped, cleared, turn, mistakes]);

  if (story) {
    return (
      <div className={styles.story}>
        <div className={styles.storyEmoji}>🌲</div>
        <h2>마법의 숲</h2>
        <p>마법의 숲에 도착했어!<br/>숨겨진 카드를 짝꿍과 함께 찾아보자 🌲</p>
        <p className={styles.storyHint}>번갈아가며 카드 2장씩 뒤집어서<br/>짝을 맞춰보세요!</p>
        <button className={styles.storyBtn} onClick={() => setStory(false)}>시작하기 ✨</button>
      </div>
    );
  }

  if (cleared) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const stars = mistakes <= 3 ? 3 : mistakes <= 6 ? 2 : 1;
    return (
      <div className={styles.clear}>
        <div className={styles.clearEmoji}>🎉</div>
        <h2>스테이지 클리어!</h2>
        <div className={styles.stars}>{'⭐'.repeat(stars)}</div>
        <p>실수: {mistakes}회 | 시간: {elapsed}초</p>
        <button className={styles.storyBtn} onClick={onClear}>다음으로 →</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← 지도</button>
        <h2 className={styles.title}>🌲 마법의 숲</h2>
        <div className={styles.turnInfo}>
          {isMyTurn ? (
            <span className={styles.myTurn}>내 턴! 🃏</span>
          ) : (
            <span className={styles.otherTurn}>상대방 턴... ⏳</span>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        {cards.map((card, idx) => (
          <button
            key={idx}
            className={`${styles.card} ${card.flipped || card.matched ? styles.flipped : ''} ${card.matched ? styles.matched : ''}`}
            onClick={() => handleFlip(idx)}
            disabled={!isMyTurn || card.flipped || card.matched}
          >
            <div className={styles.cardInner}>
              <div className={styles.cardFront}>❓</div>
              <div className={styles.cardBack}>{card.emoji}</div>
            </div>
          </button>
        ))}
      </div>

      <div className={styles.info}>
        <span>실수: {mistakes}회</span>
        <span>Player {playerNumber}</span>
      </div>
    </div>
  );
}
