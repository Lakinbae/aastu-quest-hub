// backend/services/mixer.js
// Simple mixer: forms cross-section teams for a quest.
// Usage (Termux): set SUPABASE_URL and SUPABASE_KEY, then:
//   node mixer.js <QUEST_ID>

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || "https://njldbryvwtfawzvklhcn.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_KEY (or SUPABASE_ANON_KEY) in env.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// helper: shuffle array in place
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// derive section from user record (we already seeded section)
async function fetchRegistrations(questId) {
  const { data, error } = await supabase
    .from('registrations')
    .select('user_student_id')
    .eq('quest_id', questId);

  if (error) throw error;
  return data.map(r => r.user_student_id);
}

// fetch user records by student_id
async function fetchUsersByIds(studentIds) {
  if (!studentIds.length) return [];
  const { data, error } = await supabase
    .from('users')
    .select('student_id,full_name,section')
    .in('student_id', studentIds);

  if (error) throw error;
  return data;
}

// create team record
async function createTeam(questId, memberIds) {
  const { data, error } = await supabase
    .from('teams')
    .insert([{ quest_id: questId, member_student_ids: memberIds }]);

  if (error) throw error;
  return data;
}

// main mixer algorithm
async function mixer(questId, minSize = 3, maxSize = 5) {
  const regIds = await fetchRegistrations(questId);
  if (regIds.length === 0) {
    console.log('No registrations for quest', questId);
    return;
  }

  const users = await fetchUsersByIds(regIds);

  // group by section
  const groups = { A: [], B: [], C: [], D: [] };
  users.forEach(u => {
    const s = (u.section || 'A').toUpperCase();
    if (!groups[s]) groups[s] = [];
    groups[s].push(u.student_id);
  });

  // shuffle each group
  Object.keys(groups).forEach(k => shuffle(groups[k]));

  // flatten with round-robin picking to maximize cross-section
  const teams = [];
  const remaining = { ...groups };

  // helper to count remaining
  const remainingCount = () => Object.values(remaining).reduce((a,b)=>a+b.length,0);

  while (remainingCount() > 0) {
    // start new team
    const team = new Set();

    // pick first from the largest group
    const largest = Object.keys(remaining).sort((a,b)=>remaining[b].length - remaining[a].length)[0];
    if (remaining[largest] && remaining[largest].length) {
      team.add(remaining[largest].shift());
    }

    // fill team preferring different sections
    const sectionOrder = Object.keys(remaining);
    let idx = 0;
    while (team.size < minSize && remainingCount() > 0) {
      const sec = sectionOrder[idx % sectionOrder.length];
      if (remaining[sec] && remaining[sec].length) {
        // prefer adding from a section not yet in team
        if (![...team].some(id => {
          const u = users.find(x => x.student_id === id);
          return u && u.section === sec;
        })) {
          team.add(remaining[sec].shift());
        } else {
          // if all sections already present or no choice, still add
          team.add(remaining[sec].shift());
        }
      }
      idx++;
      // safety: break if infinite loop
      if (idx > 1000) break;
    }

    // if team smaller than minSize and no more users, try to merge later
    teams.push(Array.from(team));
  }

  // Merge leftover tiny teams into earlier teams if needed
  const finalTeams = [];
  for (const t of teams) {
    if (t.length >= minSize) {
      finalTeams.push(t);
    } else {
      // try to add to an existing team with space
      let placed = false;
      for (const ft of finalTeams) {
        if (ft.length + t.length <= maxSize) {
          ft.push(...t);
          placed = true;
          break;
        }
      }
      if (!placed) {
        // if no space, create a new team anyway
        finalTeams.push(t);
      }
    }
  }

  // persist teams to DB
  for (const members of finalTeams) {
    await createTeam(questId, members);
    console.log('Created team with', members.length, 'members');
  }

  console.log('Mixer finished. Created', finalTeams.length, 'teams.');
}

// run from CLI
if (require.main === module) {
  const questId = process.argv[2];
  const minSize = parseInt(process.argv[3] || '3', 10);
  const maxSize = parseInt(process.argv[4] || '5', 10);

  if (!questId) {
    console.error('Usage: node mixer.js <QUEST_ID> [minSize] [maxSize]');
    process.exit(1);
  }

  mixer(questId, minSize, maxSize)
    .then(()=>process.exit(0))
    .catch(err=>{
      console.error('Mixer error:', err);
      process.exit(1);
    });
}