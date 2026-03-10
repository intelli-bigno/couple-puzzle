import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, getDoc, setDoc } from 'firebase/firestore';
import styles from './Stage2.module.css';

const PUZZLES = [
  {
    answer: ['🌙', '🌟', '💎'],
    hints: ['"첫 번째는 밤하늘에 떠있어 🌙"', '"두 번째는 반짝반짝 빛나 ✨"', '"세 번째는 보석이야 💍"'],
    options: ['🌙', '🌟', '💎', '🔴', '🌈', '🍀'],
  },
  {
    answer: ['🔴', '🟡', '🟢'],
    hints: ['"신호등 순서대로! 🚦"', '"첫 번째는 멈춤 🛑"', '"마지막은 출발 🏃"'],
    options: ['🟡', '🔴', '🔵', '🟢', '🟣', '⚫'],
  },
  {
    answer: ['🌊', '⛵', '🏝️'],
    hints: ['"바다 위를 건너는 여행 🗺️"', '"첫 번째는 파도 🌊"', '"배를 타고 섬으로! 🧭"'],
    options: ['🏝️', '🌊', '🏔️', '⛵', '🌲', '🔥'],
  },
];

export default function Stage2({ uid, roomCode, playerNumber, onBack, onClear }) {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [cleared, setCleared] = useState(false);
  const [failed, setFailed] = useState(false);
  const [story, setStory] = useState(true);
  const [roundResult, setRoundResult] = useState(null); // 'correct' | 'wrong'
  const [mistakes, setMistakes] = useState(0);

  const roomRef = doc(db, 'puzzle-rooms', roomCode);
  const gameRef = doc(db, 'puzzle-rooms', roomCode, 'games', 'stage2');

  // Role: who gives hints, who inputs
  // Round 0: P1 hints, P2 inputs. Round 1: P2 hints, P1 inputs. Round 2: P1 hints, P2 inputs
  const hintGiver = round % 2 === 0 ? 1 : 2;
  const inputter = round % 2 === 0 ? 2 : 1;
  const isHintGiver = playerNumber === hintGiver;
  const isInputter = playerNumber === inputter;
  const puzzle = PUZZLES[round];

  useEffect(() => {
    const init = async () => {
      const snap = await getDoc(gameRef);
      if (!snap.exists()) {
        await setDoc(gameRef, { round: 0, selected: [], cleared: false, mistakes: 0, timeLeft: 60 });
      }
    };
    init();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(gameRef, (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      setRound(d.round);
      setSelected(d.selected || []);
      setCleared(d.cleared);
      setMistakes(d.mistakes || 0);
      setTimeLeft(d.timeLeft ?? 60);
    });
    return unsub;
  }, []);

  // Timer (only inputter runs it)
  useEffect(() => {
    if (story || cleared || failed || roundResult) return;
    const iv = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { setFailed(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [story, cleared, failed, roundResult, round]);

  const handleSelect = async (emoji) => {
    if (!isInputter || cleared) return;
    const newSelected = [...selected, emoji];
    
    if (newSelected.length === 3) {
      const correct = newSelected.every((e, i) => e === puzzle.answer[i]);
      if (correct) {
        setRoundResult('correct');
        const nextRound = round + 1;
        if (nextRound >= PUZZLES.length) {
          await updateDoc(gameRef, { selected: [], cleared: true, round });
          await updateDoc(roomRef, { stagesCleared: arrayUnion('stage2') });
          setCleared(true);
        } else {
          setTimeout(async () => {
            await updateDoc(gameRef, { round: nextRound, selected: [], timeLeft: 60, mistakes });
            setRoundResult(null);
          }, 1500);
        }
      } else {
        setRoundResult('wrong');
        setTimeout(async () => {
          await updateDoc(gameRef, { selected: [], mistakes: mistakes + 1 });
          setRoundResult(null);
        }, 1200);
      }
    } else {
      await updateDoc(gameRef, { selected: newSelected });
    }
  };

  const removeSelected = async (idx) => {
    if (!isInputter) return;
    const newSelected = selected.filter((_, i) => i !== idx);
    await updateDoc(gameRef, { selected: newSelected });
  };

  if (story) {
    return (
      <div className={styles.story}>
        <div className={styles.storyEmoji}>🏔️</div>
        <h2>수정 산</h2>
        <p>신비로운 수정 산에 도착했어!<br/>암호를 해독해서 길을 열자 🔮</p>
        <p className={styles.storyHint}>한 명은 힌트를 보고, 한 명은 답을 입력!<br/>서로 소통해야 해요 📱</p>
        <button className={styles.storyBtn} onClick={() => setStory(false)}>시작하기 ✨</button>
      </div>
    );
  }

  if (cleared) {
    const stars = mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1;
    return (
      <div className={styles.story}>
        <div className={styles.storyEmoji}>🎉</div>
        <h2>스테이지 클리어!</h2>
        <div className={styles.stars}>{'⭐'.repeat(stars)}</div>
        <p>실수: {mistakes}회</p>
        <button className={styles.storyBtn} onClick={onClear}>다음으로 →</button>
      </div>
    );
  }

  if (failed) {
    return (
      <div className={styles.story}>
        <div className={styles.storyEmoji}>⏰</div>
        <h2>시간 초과!</h2>
        <p>다시 도전해보자!</p>
        <button className={styles.storyBtn} onClick={onBack}>지도로 돌아가기</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onBack}>← 지도</button>
        <h2 className={styles.title}>🏔️ 수정 산</h2>
        <div className={styles.meta}>
          <span>라운드 {round + 1}/3</span>
          <span className={timeLeft <= 10 ? styles.urgent : ''}>⏱️ {timeLeft}초</span>
        </div>
      </div>

      <div className={styles.roleTag}>
        {isHintGiver ? '👀 힌트를 읽어주세요!' : '🎯 답을 입력하세요!'}
      </div>

      {isHintGiver && (
        <div className={`${styles.hintsBox} fade-in`}>
          <h3>🔮 암호 힌트</h3>
          {puzzle.hints.map((h, i) => (
            <div key={i} className={styles.hint}>{h}</div>
          ))}
          <p className={styles.hintNote}>상대방에게 힌트를 알려주세요!</p>
        </div>
      )}

      {isInputter && (
        <div className={`${styles.inputBox} fade-in`}>
          <div className={styles.selectedRow}>
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`${styles.slot} ${selected[i] ? styles.filled : ''} ${roundResult === 'wrong' ? styles.shake : ''} ${roundResult === 'correct' ? styles.correct : ''}`}
                onClick={() => selected[i] && removeSelected(i)}
              >
                {selected[i] || '?'}
              </div>
            ))}
          </div>

          <div className={styles.options}>
            {puzzle.options.map((e, i) => (
              <button
                key={i}
                className={styles.optionBtn}
                onClick={() => handleSelect(e)}
                disabled={selected.length >= 3}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isHintGiver && !isInputter && (
        <p>관전 중...</p>
      )}
    </div>
  );
}
