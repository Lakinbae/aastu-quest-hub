// services/submit-proof.js
// Usage: node services/submit-proof.js <TEAM_ID> '<FILES_JSON>'
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_KEY in .env or env vars.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function submit(teamId, filesJson) {
  let files = [];
  try {
    files = JSON.parse(filesJson);
  } catch (e) {
    console.error('FILES_JSON must be valid JSON. Example: \'[{"name":"img1.jpg","url":"..."}]\'');
    process.exit(1);
  }

  const { data, error } = await supabase
    .from('submissions')
    .insert([{ team_id: teamId, files: files, verification_status: 'pending' }])
    .select();

  if (error) {
    console.error('Submit error', error);
    process.exit(1);
  }
  console.log('Submission created', data);
}

if (require.main === module) {
  const teamId = process.argv[2];
  const filesJson = process.argv[3] || '[]';
  if (!teamId) {
    console.error('Usage: node services/submit-proof.js <TEAM_ID> <FILES_JSON>');
    process.exit(1);
  }
  submit(teamId, filesJson).then(()=>process.exit(0));
}