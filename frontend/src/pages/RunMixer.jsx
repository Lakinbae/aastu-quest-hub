import React, { useState } from 'react';
import { runMixer } from '../api';

export default function RunMixer(){
  const [questId, setQuestId] = useState('bb16825d-9e54-4332-8d3d-bb34d86946e7');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRun(){
    setLoading(true);
    const res = await runMixer(questId, 3, 5);
    setOutput(res.output || JSON.stringify(res));
    setLoading(false);
  }

  return (
    <div>
      <h2>Run Mixer</h2>
      <label>Quest ID</label>
      <input value={questId} onChange={e=>setQuestId(e.target.value)} />
      <button onClick={handleRun} disabled={loading}>{loading ? 'Running...' : 'Run Mixer'}</button>
      <pre style={{whiteSpace:'pre-wrap'}}>{output}</pre>
    </div>
  );
}