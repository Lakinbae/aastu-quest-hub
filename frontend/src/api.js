const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function runMixer(questId, minSize=3, maxSize=5){
  const res = await fetch(`${API}/run-mixer`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ questId, minSize, maxSize })
  });
  return res.json();
}

export async function fetchTeams(questId){
  const res = await fetch(`${API}/teams?questId=${encodeURIComponent(questId)}`);
  return res.json();
}

export async function submitProof(teamId, files=[]){
  const res = await fetch(`${API}/submit`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ teamId, files })
  });
  return res.json();
}