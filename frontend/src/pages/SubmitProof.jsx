import React, { useState } from 'react';
import { submitProof } from '../api';

export default function SubmitProof(){
  const [teamId, setTeamId] = useState('');
  const [filesJson, setFilesJson] = useState('[]');
  const [result, setResult] = useState(null);

  async function handleSubmit(){
    try{
      const files = JSON.parse(filesJson);
      const res = await submitProof(teamId, files);
      setResult(res);
    }catch(e){
      setResult({ error: 'Invalid JSON for files' });
    }
  }

  return (
    <div>
      <h2>Submit Proof</h2>
      <label>Team ID</label>
      <input value={teamId} onChange={e=>setTeamId(e.target.value)} />
      <label>Files JSON</label>
      <textarea value={filesJson} onChange={e=>setFilesJson(e.target.value)} rows={6} />
      <button onClick={handleSubmit}>Submit</button>
      <pre>{result ? JSON.stringify(result, null, 2) : 'No submission yet'}</pre>
    </div>
  );
}