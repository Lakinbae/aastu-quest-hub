// server/index.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const { exec } = require('child_process');

const app = express();
app.use(bodyParser.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const PORT = process.env.PORT || 3000;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_KEY in .env or env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Health
app.get('/health', (req, res) => res.json({ ok: true }));

// Run mixer (calls the local mixer script)
app.post('/run-mixer', async (req, res) => {
  const { questId, minSize = 3, maxSize = 5 } = req.body;
  if (!questId) return res.status(400).json({ error: 'questId required' });

  // Run mixer as a child process to keep server simple
  const cmd = `node services/mixer.js ${questId} ${minSize} ${maxSize}`;
  exec(cmd, { env: process.env }, (err, stdout, stderr) => {
    if (err) {
      console.error('Mixer exec error', err, stderr);
      return res.status(500).json({ error: stderr || err.message });
    }
    res.json({ output: stdout });
  });
});

// Submit proof via API (inserts a submission row)
app.post('/submit', async (req, res) => {
  const { teamId, files } = req.body;
  if (!teamId) return res.status(400).json({ error: 'teamId required' });
  const { data, error } = await supabase
    .from('submissions')
    .insert([{ team_id: teamId, files: files || [], verification_status: 'pending' }])
    .select();
  if (error) return res.status(500).json({ error });
  res.json({ submission: data[0] });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// add near other routes
app.get('/teams', async (req, res) => {
  const questId = req.query.questId;
  if (!questId) return res.status(400).json({ error: 'questId required' });
  const { data, error } = await supabase
    .from('teams')
    .select('id,quest_id,member_student_ids')
    .eq('quest_id', questId);
  if (error) return res.status(500).json({ error });
  res.json({ teams: data });
});