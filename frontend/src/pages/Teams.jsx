import React, { useState } from 'react';
import { fetchTeams } from '../api';

export default function Teams(){
  const [questId, setQuestId] = useState('bb16825d-9e54-4332-8d3d-bb34d86946e7');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);

  async function load(){
    setLoading(true);
    const res = await fetchTeams(questId);
    setTeams(res.teams || res || []);
    setLoading(false);
  }

  return (
    <div>
      <h2>Teams</h2>
      <div>
        <input value={questId} onChange={e=>setQuestId(e.target.value)} />
        <button onClick={load} disabled={loading}>{loading ? 'Loading...' : 'Load Teams'}</button>
      </div>
      <div>
        {teams.length === 0 && <p>No teams yet.</p>}
        {teams.map(t => (
          <div key={t.id} className="team">
            <strong>Team {t.id.slice(0,8)}</strong>
            <div>Members: {Array.isArray(t.member_student_ids) ? t.member_student_ids.join(', ') : t.member_student_ids}</div>
          </div>
        ))}
      </div>
    </div>
  );
}