import { useState, useEffect } from 'react';
import { signIn } from './firebase';
import Lobby from './screens/Lobby';
import StageMap from './screens/StageMap';
import Stage1 from './stages/Stage1';
import Stage2 from './stages/Stage2';
import Stage3 from './stages/Stage3';
import Victory from './screens/Victory';

export default function App() {
  const [uid, setUid] = useState(null);
  const [screen, setScreen] = useState('lobby'); // lobby, map, stage1, stage2, stage3, victory
  const [roomCode, setRoomCode] = useState(null);
  const [playerNumber, setPlayerNumber] = useState(null);

  useEffect(() => {
    signIn().then(setUid);
  }, []);

  if (!uid) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48, animation: 'pulse 1.5s infinite' }}>🏝️</div>
      <div style={{ color: 'var(--text-dim)' }}>접속 중...</div>
    </div>
  );

  const gameProps = { uid, roomCode, playerNumber, onBack: () => setScreen('map'), onClear: () => setScreen('map') };

  switch (screen) {
    case 'lobby':
      return <Lobby uid={uid} onJoin={(code, pNum) => { setRoomCode(code); setPlayerNumber(pNum); setScreen('map'); }} />;
    case 'map':
      return <StageMap roomCode={roomCode} playerNumber={playerNumber} onSelect={(s) => setScreen(s)} onVictory={() => setScreen('victory')} />;
    case 'stage1':
      return <Stage1 {...gameProps} />;
    case 'stage2':
      return <Stage2 {...gameProps} />;
    case 'stage3':
      return <Stage3 {...gameProps} />;
    case 'victory':
      return <Victory onBack={() => setScreen('map')} />;
    default:
      return null;
  }
}
