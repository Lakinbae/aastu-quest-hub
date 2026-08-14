# AASTU Quest Backend (minimal)

## Setup (Termux)
1. Copy `.env.example` to `.env` and fill `SUPABASE_URL` and `SUPABASE_KEY`.
2. Install dependencies:
npm install
3. 3. Ensure your Supabase DB has the tables (run `db/schema.sql` in Supabase SQL Editor if needed).
4. (Optional) Add registrations in Supabase so the mixer has data.

## Run mixer from Termux

run directlynode services/mixer.js <QUEST_ID> 3 5or via HTTPnode server/index.jsthen POST to /run-mixer with JSON { "questId": "<QUEST_ID>" }