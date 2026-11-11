# Playbook (playbook.manwellclark.com)

Private, password-protected job-search command center: applications, outreach log, target companies,
daily routine, weekly metrics, 30-day plan, role families and message scripts. Same Alpino look as the site.

Zero-dependency Node server (`server.js`) + vanilla JS front end (`public/`). Data is one JSON file
in `/data/playbook.json` with a daily backup next to it.

## Coolify
- New resource → same GitHub repo, **Base directory `/playbook`**, build pack **Dockerfile**, port **3000**
- Domain: `https://playbook.manwellclark.com`
- Environment variables: `PLAYBOOK_PASSWORD` (your login), `SESSION_SECRET` (any long random string)
- Persistent storage: mount a volume at **`/data`** (otherwise data is lost on redeploy)
- DNS: A record `playbook` → 209.126.9.103

## Local
```bash
PLAYBOOK_PASSWORD=test DATA_DIR=./data node server.js   # http://localhost:3000
```
