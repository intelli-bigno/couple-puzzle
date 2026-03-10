import { useState } from 'react';
import { db } from '../firebase';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import styles from './Lobby.module.css';

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function Lobby({ uid, onJoin }) {
  const [mode, setMode] = useState(null); // null, create, join
  const [code, setCode] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState('');
  const [createdCode, setCreatedCode] = useState('');

  const createRoom = async () => {
    const roomCode = generateCode();
    setCreatedCode(roomCode);
    setWaiting(true);
    await setDoc(doc(db, 'puzzle-rooms', roomCode), {
      players: { p1: uid, p2: null },
      stage: 1,
      stagesCleared: [],
      createdAt: Date.now(),
    });

    // Poll for player 2
    const poll = setInterval(async () => {
      const snap = await getDoc(doc(db, 'puzzle-rooms', roomCode));
      if (snap.exists() && snap.data().players.p2) {
        clearInterval(poll);
        onJoin(roomCode, 1);
      }
    }, 1500);
  };

  const joinRoom = async () => {
    setError('');
    const roomCode = code.toUpperCase().trim();
    if (roomCode.length < 4) { setError('코드를 입력해주세요'); return; }
    
    const snap = await getDoc(doc(db, 'puzzle-rooms', roomCode));
    if (!snap.exists()) { setError('방을 찾을 수 없어요 😢'); return; }
    
    const data = snap.data();
    if (data.players.p2) { setError('이미 가득 찬 방이에요'); return; }

    await updateDoc(doc(db, 'puzzle-rooms', roomCode), {
      'players.p2': uid,
    });
    onJoin(roomCode, 2);
  };

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.island}>🏝️</div>
        <h1 className={styles.title}>커플 퍼즐<br/>어드벤처</h1>
        <p className={styles.subtitle}>둘이 함께 보물섬을 탐험하자! 💕</p>
      </div>

      {!mode && (
        <div className={`${styles.buttons} fade-in`}>
          <button className={styles.btn} onClick={() => setMode('create')}>
            🗺️ 방 만들기
          </button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => setMode('join')}>
            🚪 참가하기
          </button>
          <button className={`${styles.btn} ${styles.btnTest || ''}`} onClick={() => setMode('test')} style={{ background: 'linear-gradient(135deg, #ff9800, #ff5722)', marginTop: 8 }}>
            🧪 혼자 테스트하기
          </button>
        </div>
      )}

      {mode === 'create' && !waiting && (
        <div className={`${styles.card} fade-in`}>
          <p>방을 만들어서 상대방에게 코드를 알려주세요!</p>
          <button className={styles.btn} onClick={createRoom}>방 만들기 ✨</button>
          <button className={styles.link} onClick={() => setMode(null)}>← 뒤로</button>
        </div>
      )}

      {mode === 'create' && waiting && (
        <div className={`${styles.card} fade-in`}>
          <p>방 코드를 상대방에게 알려주세요!</p>
          <div className={styles.code}>{createdCode}</div>
          <p className={styles.waiting}>상대방 기다리는 중... 💫</p>
        </div>
      )}

      {mode === 'test' && (
        <div className={`${styles.card} fade-in`}>
          <p>🧪 테스트 모드</p>
          <p style={{ fontSize: 14, opacity: 0.8 }}>혼자서 P1/P2를 전환하며 플레이!</p>
          <button className={styles.btn} onClick={async () => {
            const roomCode = 'TEST' + Math.random().toString(36).substring(2, 4).toUpperCase();
            await setDoc(doc(db, 'puzzle-rooms', roomCode), {
              players: { p1: uid, p2: uid + '_p2' },
              stage: 1,
              stagesCleared: [],
              createdAt: Date.now(),
              testMode: true,
            });
            onJoin(roomCode, 1);
          }}>P1로 시작 🎮</button>
          <button className={`${styles.btn} ${styles.btnSecondary}`} style={{ marginTop: 8 }} onClick={async () => {
            const roomCode = 'TEST' + Math.random().toString(36).substring(2, 4).toUpperCase();
            await setDoc(doc(db, 'puzzle-rooms', roomCode), {
              players: { p1: uid + '_p1', p2: uid },
              stage: 1,
              stagesCleared: [],
              createdAt: Date.now(),
              testMode: true,
            });
            onJoin(roomCode, 2);
          }}>P2로 시작 🎮</button>
          <button className={styles.link} onClick={() => setMode(null)}>← 뒤로</button>
        </div>
      )}

      {mode === 'join' && (
        <div className={`${styles.card} fade-in`}>
          <p>상대방에게 받은 코드를 입력하세요</p>
          <input
            className={styles.input}
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="방 코드"
            maxLength={6}
            autoFocus
          />
          {error && <p className={styles.error}>{error}</p>}
          <button className={styles.btn} onClick={joinRoom}>참가하기 🚀</button>
          <button className={styles.link} onClick={() => setMode(null)}>← 뒤로</button>
        </div>
      )}
    </div>
  );
}
