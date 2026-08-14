// services/mixer.js
// Usage: node services/mixer.js <QUEST_ID> [minSize] [maxSize]
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_KEY in .env or env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

async function fetchRegistrations(questId) {
  const { data, error } = await supabase
    .from('registrations')
    .select('user_student_id')
    .eq('quest_id', questId);

  if (error) throw error;
  return (data || []).map(r => r.user_student_id);
}

async function fetchUsersByIds(studentIds) {
  if (!studentIds || studentIds.length === 0) return [];
  const { data, error } = await supabase
    .from('users')
    .select('student_id,full_name,section')
    .in('student_id', studentIds);

  if (error) throw error;
  return data || [];
}

async function createTeam(questId, memberIds) {
  const { data, error } = await supabase
    .from('teams')
    .insert([{ quest_id: questId, member_student_ids: memberIds }])
    .select();
  if (error) throw error;
  return data;
}

async function mixer(questId, minSize = 3, maxSize = 5) {
  console.log('Mixer start for quest', questId);
  const regIds = await fetchRegistrations(questId);
  if (!regIds.length) {
    console.log('No registrations for quest', questId);
    return;
  }

  const users = await fetchUsersByIds(regIds);

  // Group by section (fallback to A)
  const groups = {};
  users.forEach(u => {
    const s = (u.section || 'A').toUpperCase();
    if (!groups[s]) groups[s] = [];
    groups[s].push(u.student_id);
  });

  // Ensure all registered ids are included even if user record missing
  regIds.forEach(id => {
    const found = users.find(u => u.student_id === id);
    if (!found) {
      if (!groups['A']) groups['A'] = [];
      groups['A'].push(id);
    }
  });

  Object.keys(groups).forEach(k => shuffle(groups[k]));

  const remaining = {};
  Object.keys(groups).forEach(k => remaining[k] = groups[k].slice());

  const remainingCount = () => Object.values(remaining).reduce((a,b)=>a+(b?b.length:0),0);

  const teams = [];

  while (remainingCount() > 0) {
    const team = new Set();
    // pick from the largest group first
    const largest = Object.keys(remaining).sort((a,b)=> (remaining[b]||[]).length - (remaining[a]||[]).length)[0];
    if (remaining[largest] && remaining[largest].length) {
      team.add(remaining[largest].shift());
    }

    const sectionOrder = Object.keys(remaining);
    let idx = 0;
    while (team.size < minSize && remainingCount() > 0) {
      const sec = sectionOrder[idx % sectionOrder.length];
      if (remaining[sec] && remaining[sec].length) {
        team.add(remaining[sec].shift());
      }
      idx++;
      if (idx > 1000) break;
    }

    teams.push(Array.from(team));
  }

  // Merge small teams into others respecting maxSize
  const finalTeams = [];
  for (const t of teams) {
    if (t.length >= minSize) {
      finalTeams.push(t);
    } else {
      let placed = false;
      for (const ft of finalTeams) {
        if (ft.length + t.length <= maxSize) {
          ft.push(...t);
          placed = true;
          break;
        }
      }
      if (!placed) finalTeams.push(t);
    }
  }

  // Insert teams
  for (const members of finalTeams) {
    try {
      await createTeam(questId, members);
      console.log('Created team with', members.length, 'members:', members.join(', '));
    } catch (err) {
      console.error('Failed to create team:', err);
    }
  }

  console.log('Mixer finished. Created', finalTeams.length, 'teams.');
}

if (require.main === module) {
  const questId = process.argv[2];
  const minSize = parseInt(process.argv[3] || '3', 10);
  const maxSize = parseInt(process.argv[4] || '5', 10);

  if (!questId) {
    console.error('Usage: node services/mixer.js <QUEST_ID> [minSize] [maxSize]');
    process.exit(1);
  }

  mixer(questId, minSize, maxSize)
    .then(()=>process.exit(0))
    .catch(err=>{
      console.error('Mixer error:', err);
      process.exit(1);
    });
}