# Quick Start - CirrusLabs Outbound Engine

**⏱️ 15-minute setup** | **Status:** ✅ Ready to Configure

---

## Step 1: Create Supabase Account (2 min)
```
1. Go to https://supabase.com
2. Sign up / log in
3. Click "New Project"
4. Name: "career-source-group"
5. Choose region closest to you
6. Password: random (save it)
7. Click "Create new project" (wait 1-2 min)
```

## Step 2: Copy Credentials (1 min)
```
1. Click "Settings" → "API"
2. Copy: Project URL (https://xxx.supabase.co)
3. Copy: Anon Key (public key, starts with eyJ...)
4. Save both somewhere
```

## Step 3: Create Database Tables (2 min)
```
1. In Supabase, go to "SQL Editor"
2. Click "New Query"
3. PASTE ENTIRE CONTENTS OF: supabase_schema.sql
4. Click "Run"
5. You should see: "Successfully executed"
```

## Step 4: Update .env File (3 min)
```
Open .env and fill in:

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_key_here

THEIRSTACK_API_KEY=
PARALLEL_API_KEY=
OPENAI_API_KEY=
```

## Step 5: Get API Keys (5 min)
Sign up for (use free tiers):
- **TheirStack**: https://theirstack.com → copy API key
- **Parallel**: https://parallelhq.com → copy API key
- **OpenAI**: https://platform.openai.com → create API key

Add to .env:
```
THEIRSTACK_API_KEY=your_theirstack_key
PARALLEL_API_KEY=your_parallel_key
OPENAI_API_KEY=your_openai_key
```

## Step 6: Start App (2 min)
```bash
npm run dev
```

Open: http://localhost:3000

---

## Test the Pipeline

### Click "Run Research" (30 sec)
- Should find 10-25 companies
- Check Supabase: "companies" table should have rows
- Check "evidence" table for job posts

### Click "Run Buyer Discovery" (30 sec)
- Should find decision-makers
- Check "buyers" table for contacts with emails

### Click "Generate Drafts" (30 sec)
- Should create email drafts
- Check "drafts" table for pending drafts

### Go to /drafts
- See all pending drafts
- Click to preview email
- Click "Approve" on good ones
- Click "Export CSV"

### Upload to Instantly
- Download the CSV file
- Go to Instantly
- Bulk upload > select CSV
- Create campaign & send

---

## What to Expect

### First Run
- ~10-15 companies found
- ~5-10 buyers/contacts
- ~5-10 email drafts
- Costs: ~$2-3 total

### Typical Quality
- Email subjects reference the job posting
- Email bodies are short (100-150 words)
- No generic filler ("hope this finds you well")
- Evidence-focused ("I saw you're hiring for...")

### What NOT to Expect Yet
- Multi-variant copy (coming soon)
- ICP scoring (coming soon)
- Reply tracking (needs Instantly integration)

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Missing SUPABASE_URL" | Check .env has SUPABASE_URL= (no spaces) |
| "API error 401" | API key is wrong/expired, get new one |
| "Database error" | You skipped Step 3, run supabase_schema.sql |
| "No drafts generated" | Check buyers/evidence exist, check OpenAI key |
| CSV is blank | No approved drafts yet, approve some first |

---

## Next Steps

1. ✅ Complete setup above
2. Run pipeline 3-5 times to gather data
3. Review results in Supabase tables
4. Check costs in api_logs table
5. Read `README.md` for more details

---

## Documentation

- **README.md** - Full overview + architecture
- **SETUP_AND_STATUS.md** - Detailed setup guide
- **IMPLEMENTATION_SUMMARY.md** - What was built
- **supabase_schema.sql** - Database schema

---

**Ready? Start with Step 1 above!** ⬆️

Questions? Check SETUP_AND_STATUS.md for detailed answers.
