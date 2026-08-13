// backend/scripts/import-seed.js
// Simple CSV importer for Supabase (Termux friendly).
// Usage: place seed.csv in same folder and run: node import-seed.js seed.csv

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const parse = require('csv-parse/lib/sync');

// --- Supabase credentials (embedded for direct use) ---
const SUPABASE_URL = "https://njldbryvwtfawzvklhcn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qbGRicnl2d3RmYXd6dmtsaGNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0ODk2NjMsImV4cCI6MjEwMjA2NTY2M30.1QOcknzZCRBg-sYc9mbH95zCsB3CfIPFwkqPXJTh-MY";
// -----------------------------------------------------

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('ERROR: Supabase credentials are missing.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: File not found: ${filePath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const records = parse(raw, { columns: true, skip_empty_lines: true });
  console.log(`Parsed ${records.length} rows. Inserting in batches...`);

  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100).map(r => ({
      student_id: (r.student_id || '').trim(),
      full_name: (r.full_name || '').trim(),
      section: (r.section || '').trim(),
      email: (r.email && r.email.trim()) ? r.email.trim() : null,
      phone: (r.phone && r.phone.trim()) ? r.phone.trim() : null,
      consent_publish: (String(r.consent_publish || '').toLowerCase() === 'yes') ? true : false,
      points: 0
    }));

    const { data, error } = await supabase.from('users').insert(batch);
    if (error) {
      console.error('Insert error:', error);
      console.error(error);
      process.exit(1);
    }
    console.log(`Inserted ${Math.min(i + batch.length, records.length)}/${records.length}`);
  }

  console.log('Import finished.');
}

const file = process.argv[2] || 'seed.csv';
run(file).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});