/* Playbook — job-search command center. Vanilla JS, state saved to the server. */
(function () {
  'use strict';

  // ---------- constants ----------
  const STATUSES = ['Saved', 'Applied', 'Screening', 'Interview', 'Final round', 'Offer', 'Rejected', 'Ghosted'];
  const STATUS_BADGE = { Saved: 'b-gray', Applied: 'b-blue', Screening: 'b-violet', Interview: 'b-violet', 'Final round': 'b-amber', Offer: 'b-green', Rejected: 'b-red', Ghosted: 'b-gray' };
  const FAMILIES = ['Technical Program Management', 'AI programs', 'AI architecture', 'IT portfolio'];
  const OUT_TYPES = ['Hiring manager', 'Referral ask', 'Recruiter', 'Follow-up'];
  const MARKETS = ['Cloud & infrastructure', 'AI platform & MLOps', 'Security & governance', 'Enterprise IT modernization'];
  const DAILY = { apps: 5, hm: 5, referrals: 2, comments: 3 };
  const WEEKLY = { apps: 25, messages: 25, referrals: 10, replyRate: 15, interviews: 2 };

  const ROLE_FAMILIES = [
    { name: 'Technical Program Management', titles: 'Senior TPM, Staff TPM, Principal TPM, TPM – Infrastructure', proof: '$287M portfolio, 68-person SRE org, 99.9% SLA' },
    { name: 'AI programs', titles: 'AI Program Manager, ML Platform TPM, MLOps Program Lead', proof: 'MLOps across 14 regions, 12-person AI team, Model-7 builds' },
    { name: 'AI architecture', titles: 'AI Solutions Architect, AI Architect, GenAI Delivery Lead', proof: 'Private LLM gateway, D.I.A.R.A., S.E.N.T.I.N.E.L S.Y.X' },
    { name: 'IT portfolio', titles: 'Sr. Manager IT Portfolio, PMO Director, Portfolio Manager', proof: 'MBA, PMP, multi-site PMO, P&L ownership' }
  ];
  const SCRIPTS = [
    { name: 'Hiring manager (cold)', text: 'Hi {name} — I saw {company} is hiring a {role}. I\'ve led AI platform and infrastructure programs for 27 years, most recently MLOps adoption across 14 regions with a 68-person SRE org. I\'d love 15 minutes to hear what the program needs to land this year. Portfolio: manwellclark.com' },
    { name: 'Referral ask (network)', text: 'Hi {name} — hope you\'re well. I\'m looking for a remote Senior TPM role and {company} is high on my list. Would you be open to referring me for the {role} opening, or pointing me to the hiring manager? Here\'s my one-page summary: manwellclark.com. Happy to send a tailored résumé.' },
    { name: 'Follow-up (5 business days)', text: 'Hi {name} — following up on my note about the {role} role. Still very interested; here\'s a short case study on how I took MLOps from pilot to 14 regions: manwellclark.com. Would a quick call next week work?' },
    { name: 'Thank-you after interview', text: 'Thank you for the conversation today, {name}. I enjoyed hearing about {topic}. My 30-60-90 for this role would start with {first_step}. Looking forward to next steps.' }
  ];

  function seed() {
    const t = today();
    return {
      version: 1, rev: 0,
      applications: [
        { id: uid(), company: 'Harbor Freight', role: 'Sr. Manager, IT Portfolio (Remote)', family: 'IT portfolio', url: '', status: 'Applied', applied: '', interview: '', next: 'Follow up with recruiter', nextDate: '', contact: '', notes: 'Applied before the Playbook was set up — add the date.' },
        { id: uid(), company: 'Netflix', role: 'Business Security Partner', family: 'Technical Program Management', url: '', status: 'Saved', applied: '', interview: '', next: 'Finish tailored résumé', nextDate: '', contact: '', notes: '' }
      ],
      outreach: [],
      targets: [],
      daily: {},
      weeks: {},
      plan: planSeed(),
      createdAt: t
    };
  }
  function planSeed() {
    const g = (title, items) => ({ id: uid(), title, items: items.map(t => ({ id: uid(), text: t, done: false })) });
    return [
      g('Week 1 — Storefront', [
        'Upload Manwell-Clark-Resume.pdf to the site repo (resume folder)',
        'Finish LinkedIn + GitHub alignment (below)',
        'Pin 6 GitHub repos, each with a README and screenshot',
        'Write 3 case studies: MLOps rollout, SRE org build, $36M modernization',
        'Add 40 target companies across the four markets'
      ]),
      g('LinkedIn alignment', [
        'Headline: Senior Technical Program Manager · AI Platforms & Cloud Infrastructure · PMP, CISM, CISA · Open to remote',
        'Contact info → Website: manwellclark.com',
        'Featured: manwellclark.com, site repo, one build write-up',
        'About: open with the site\'s hero sentence + 30-second facts',
        'Banner in the site\'s style',
        'Open to Work (recruiters only) with the four title families',
        'Claim custom URL /in/manwellclark if free (tell Claude to update the site links)'
      ]),
      g('GitHub alignment', [
        'Bio = LinkedIn headline (160 chars)',
        'Website field: manwellclark.com; LinkedIn under Social accounts',
        'Profile README (repo named modelcseven) with hero, stats and links',
        'Public email: manwell.clark@gmail.com',
        'Grant chv-blackmykael GitHub App access to manwellclark.com (auto-deploy on push)'
      ]),
      g('Fix list — verify before interviews', [
        'HII title matches HR record exactly',
        'Confirm “68 SREs” and location counts for each role',
        'Be ready to walk through Model-7 claims (2012 start, 13B LLM, 12-person team, 2.5TB)',
        'Use one phone number on the site and LinkedIn',
        'Add repo links to each Builds card as projects go public'
      ]),
      g('GitHub → LinkedIn automation', [
        'Deploy n8n in Coolify on BlackMykael',
        'LinkedIn developer app with “Share on LinkedIn” connected in n8n',
        'GitHub webhook (releases) on showcased repos → n8n',
        'LLM endpoint credentials in n8n + approval email step',
        'Target: 1 build post + 1 leadership post per week'
      ])
    ];
  }

  // ---------- utils ----------
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
  function today() { return iso(new Date()); }
  function iso(d) { const z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); }
  function parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function weekStart(s) { const d = parse(s); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return iso(d); }
  function addDays(s, n) { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); }
  function fmt(s) { if (!s) return '—'; const d = parse(s); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function pct(a, b) { return b ? Math.round(a / b * 100) : 0; }
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  function toast(msg) { const t = $('.toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2000); }

  // ---------- state + sync ----------
  let S = null, saveTimer = null, saving = false, dirty = false;
  async function api(path, opts = {}) {
    const r = await fetch(path, Object.assign({ headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' }, opts));
    let data = {}; try { data = await r.json(); } catch (e) {}
    return { ok: r.ok, status: r.status, data };
  }
  function setSave(cls, txt) { const el = $('#saveStatus'); el.className = 'status ' + cls; el.innerHTML = '<span class="dot"></span> ' + txt; }
  function save() { dirty = true; setSave('saving', 'Saving…'); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 600); }
  async function flush() {
    if (saving || !dirty) return; saving = true; dirty = false;
    const r = await api('/api/state', { method: 'PUT', body: JSON.stringify({ baseRev: S.rev, state: S }) });
    saving = false;
    if (r.ok) { S.rev = r.data.rev; setSave('', 'Saved'); if (dirty) flush(); }
    else if (r.status === 409) { S = r.data.state; setSave('error', 'Reloaded newer copy'); toast('Updated from another device'); render(); }
    else if (r.status === 401) { showLogin(); }
    else { dirty = true; setSave('error', 'Not saved — retrying'); saveTimer = setTimeout(flush, 4000); }
  }
  window.addEventListener('beforeunload', e => { if (dirty || saving) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- derived numbers ----------
  function dayLog(d) { S.daily[d] = S.daily[d] || { comments: 0, posts: false }; return S.daily[d]; }
  function countOn(list, field, pred) { return list.filter(x => x[field] && pred(x[field], x)).length; }
  function stats(fromDay, toDay) {
    const inR = s => s >= fromDay && s <= toDay;
    const apps = countOn(S.applications, 'applied', inR);
    const hm = S.outreach.filter(o => inR(o.date) && o.type === 'Hiring manager').length;
    const refs = S.outreach.filter(o => inR(o.date) && o.type === 'Referral ask').length;
    const msgs = S.outreach.filter(o => inR(o.date) && o.type !== 'Follow-up').length;
    const sent = S.outreach.filter(o => inR(o.date));
    const replies = sent.filter(o => o.replied).length;
    const interviews = countOn(S.applications, 'interview', inR);
    let comments = 0; Object.keys(S.daily).forEach(d => { if (inR(d)) comments += S.daily[d].comments || 0; });
    return { apps, hm, refs, msgs, replies, sent: sent.length, rate: pct(replies, sent.length), interviews, comments };
  }

  // ---------- routing ----------
  const VIEWS = { dashboard: viewDashboard, today: viewToday, applications: viewApplications, outreach: viewOutreach, targets: viewTargets, metrics: viewMetrics, plan: viewPlan, roles: viewRoles };
  const TITLES = { dashboard: 'Dashboard', today: 'Today', applications: 'Applications', outreach: 'Outreach', targets: 'Target companies', metrics: 'Weekly metrics', plan: '30-day plan', roles: 'Roles & scripts' };
  function current() { const h = location.hash.slice(1); return VIEWS[h] ? h : 'dashboard'; }
  function render() {
    const v = current();
    $$('.side-nav a').forEach(a => a.classList.toggle('active', a.dataset.view === v));
    $('#crumb').textContent = TITLES[v];
    $('#view').innerHTML = VIEWS[v]();
    bindView(v);
    const d = todayProgress();
    const pill = $('#todayPill'); pill.textContent = d.done + '/' + d.total; pill.classList.toggle('done', d.done === d.total);
  }
  window.addEventListener('hashchange', () => { render(); closeSidebar(); window.scrollTo(0, 0); });

  function todayProgress() {
    const t = today(), s = stats(t, t), log = dayLog(t);
    const items = [s.apps >= DAILY.apps, s.hm >= DAILY.hm, s.refs >= DAILY.referrals, (log.comments || 0) >= DAILY.comments];
    return { done: items.filter(Boolean).length, total: items.length };
  }

  // ---------- views ----------
  function kpi(icon, cls, num, target, lbl) {
    const p = target ? Math.min(100, pct(num, target)) : 0;
    return `<div class="card kpi"><span class="kpi-icon ${cls}"><i class="fa-solid ${icon}"></i></span><div style="flex:1"><div class="num">${num}${target ? ` <small>/ ${target}</small>` : ''}</div><div class="lbl">${lbl}</div>${target ? `<div class="bar ${p >= 100 ? 'good' : ''}"><span style="width:${p}%"></span></div>` : ''}</div></div>`;
  }

  function viewDashboard() {
    const t = today(), ws = weekStart(t), w = stats(ws, addDays(ws, 6));
    const active = S.applications.filter(a => !['Rejected', 'Ghosted', 'Saved'].includes(a.status));
    const counts = STATUSES.map(s => [s, S.applications.filter(a => a.status === s).length]);
    const max = Math.max(1, ...counts.map(c => c[1]));
    const upcoming = S.applications.filter(a => a.nextDate && !['Rejected', 'Ghosted', 'Offer'].includes(a.status)).sort((a, b) => a.nextDate.localeCompare(b.nextDate)).slice(0, 6);
    const tp = todayProgress();
    const planAll = S.plan.flatMap(g => g.items), planDone = planAll.filter(i => i.done).length;
    return `
    <div class="page-head"><div><h1>This week</h1><p>Week of ${fmt(ws)} · targets from the playbook</p></div>
      <a class="btn btn-ghost btn-sm" href="#today"><i class="fa-solid fa-sun"></i> Today: ${tp.done}/${tp.total} done</a></div>
    <div class="grid g4">
      ${kpi('fa-file-signature', '', w.apps, WEEKLY.apps, 'Applications sent')}
      ${kpi('fa-paper-plane', 'green', w.msgs, WEEKLY.messages + WEEKLY.referrals, 'Messages + referral asks')}
      ${kpi('fa-reply', 'amber', w.rate + '%', '', `Reply rate (${w.replies}/${w.sent}) · target ${WEEKLY.replyRate}%`)}
      ${kpi('fa-handshake', 'violet', w.interviews, WEEKLY.interviews, 'Interviews this week')}
    </div>
    <div class="grid g2" style="margin-top:16px">
      <div class="card"><div class="card-head"><div><h2>Pipeline</h2><p>${active.length} active of ${S.applications.length} tracked</p></div><a href="#applications" class="btn btn-ghost btn-sm">Open</a></div>
        <div class="pipe">${counts.map(([s, n]) => `<div class="pipe-row"><span class="badge ${STATUS_BADGE[s]}">${s}</span><div class="bar"><span style="width:${pct(n, max)}%"></span></div><strong>${n}</strong></div>`).join('')}</div></div>
      <div class="card"><div class="card-head"><div><h2>Next steps</h2><p>Dated follow-ups across applications</p></div></div>
        ${upcoming.length ? `<table><tbody>${upcoming.map(a => `<tr data-edit="applications" data-id="${a.id}"><td><strong>${esc(a.company)}</strong><br><small class="muted">${esc(a.next || '')}</small></td><td style="text-align:right"><span class="badge ${a.nextDate < t ? 'b-red' : a.nextDate === t ? 'b-amber' : 'b-blue'}">${fmt(a.nextDate)}</span></td></tr>`).join('')}</tbody></table>` : '<p class="muted">Add a “next step date” to an application to see it here.</p>'}
      </div>
    </div>
    <div class="card" style="margin-top:16px"><div class="card-head"><div><h2>30-day plan</h2><p>${planDone} of ${planAll.length} setup tasks done</p></div><a href="#plan" class="btn btn-ghost btn-sm">Open</a></div>
      <div class="bar ${planDone === planAll.length ? 'good' : ''}"><span style="width:${pct(planDone, planAll.length)}%"></span></div></div>`;
  }

  function counterRow(key, label, sub, value, goal, manual) {
    const done = value >= goal;
    return `<div class="check ${done ? 'done' : ''}"><input type="checkbox" disabled ${done ? 'checked' : ''} aria-label="${esc(label)}">
      <div class="txt"><strong>${label}</strong><small>${sub}</small></div>
      <div class="counter">${manual ? `<button class="icon-btn" data-count="${key}" data-d="-1" aria-label="Less">−</button>` : ''}<b>${value} / ${goal}</b>${manual ? `<button class="icon-btn" data-count="${key}" data-d="1" aria-label="More">+</button>` : `<button class="btn btn-ghost btn-sm" data-add="${key === 'apps' ? 'applications' : 'outreach'}" data-type="${key === 'hm' ? 'Hiring manager' : key === 'refs' ? 'Referral ask' : ''}"><i class="fa-solid fa-plus"></i> Log</button>`}</div></div>`;
  }
  function viewToday() {
    const t = today(), s = stats(t, t), log = dayLog(t);
    const todays = S.outreach.filter(o => o.date === t);
    return `
    <div class="page-head"><div><h1>Today's routine</h1><p>${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} · about 60–90 minutes</p></div></div>
    <div class="card">
      ${counterRow('apps', 'Tailored applications', 'Résumé matched to the posting\'s keywords; manwellclark.com in the header', s.apps, DAILY.apps)}
      ${counterRow('hm', 'Messages to hiring managers / TPM leads', 'Two sentences on the program you\'d own + the site link', s.hm, DAILY.hm)}
      ${counterRow('refs', 'Referral asks to your network', 'Veterans in tech, former Datapath/Envistacom colleagues', s.refs, DAILY.referrals)}
      ${counterRow('comments', 'Comments on target-company leaders\' posts', 'Thoughtful, specific, no pitch', log.comments || 0, DAILY.comments, true)}
      <div class="check ${log.posts ? 'done' : ''}"><input type="checkbox" id="postsChk" ${log.posts ? 'checked' : ''}><div class="txt"><strong>Approve this week's automation posts</strong><small>One build post + one leadership post</small></div></div>
    </div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h2>Logged today</h2></div>
      ${todays.length ? `<table><tbody>${todays.map(o => `<tr data-edit="outreach" data-id="${o.id}"><td><strong>${esc(o.name)}</strong> · ${esc(o.company)}</td><td><span class="badge b-blue">${esc(o.type)}</span></td><td>${o.replied ? '<span class="badge b-green">Replied</span>' : ''}</td></tr>`).join('')}</tbody></table>` : '<p class="muted">Nothing logged yet today.</p>'}
    </div>`;
  }

  function viewApplications() {
    const q = (state_ui.appQ || '').toLowerCase(), f = state_ui.appF || '';
    const rows = S.applications.filter(a => (!f || a.status === f) && (!q || (a.company + ' ' + a.role).toLowerCase().includes(q)))
      .sort((a, b) => (b.applied || '').localeCompare(a.applied || ''));
    return `
    <div class="page-head"><div><h1>Applications</h1><p>${S.applications.length} tracked · click a row to edit</p></div><button class="btn btn-primary" data-add="applications"><i class="fa-solid fa-plus"></i> Add application</button></div>
    <div class="toolbar"><input id="appQ" placeholder="Search company or role" value="${esc(state_ui.appQ || '')}"><select id="appF"><option value="">All statuses</option>${STATUSES.map(s => `<option ${s === f ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
    <div class="table-wrap"><table><thead><tr><th>Company</th><th>Role</th><th>Family</th><th>Status</th><th>Applied</th><th>Next step</th></tr></thead><tbody>
      ${rows.map(a => `<tr data-edit="applications" data-id="${a.id}"><td><strong>${esc(a.company)}</strong></td><td>${esc(a.role)}${a.url ? ` <a href="${esc(a.url)}" target="_blank" rel="noopener" onclick="event.stopPropagation()"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''}</td><td class="muted">${esc(a.family)}</td><td><span class="badge ${STATUS_BADGE[a.status]}">${a.status}</span></td><td>${fmt(a.applied)}</td><td>${esc(a.next || '')}${a.nextDate ? ` <small class="muted">· ${fmt(a.nextDate)}</small>` : ''}</td></tr>`).join('') || `<tr><td colspan="6" class="empty">No applications yet.</td></tr>`}
    </tbody></table></div>`;
  }

  function viewOutreach() {
    const rows = S.outreach.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return `
    <div class="page-head"><div><h1>Outreach</h1><p>${rows.length} messages · ${rows.filter(r => r.replied).length} replies</p></div><button class="btn btn-primary" data-add="outreach"><i class="fa-solid fa-plus"></i> Log message</button></div>
    <div class="table-wrap"><table><thead><tr><th>Date</th><th>Person</th><th>Company</th><th>Type</th><th>Channel</th><th>Reply</th></tr></thead><tbody>
      ${rows.map(o => `<tr data-edit="outreach" data-id="${o.id}"><td>${fmt(o.date)}</td><td><strong>${esc(o.name)}</strong><br><small class="muted">${esc(o.title || '')}</small></td><td>${esc(o.company)}</td><td><span class="badge b-blue">${esc(o.type)}</span></td><td class="muted">${esc(o.channel)}</td><td>${o.replied ? '<span class="badge b-green">Replied</span>' : '<span class="badge b-gray">Waiting</span>'}</td></tr>`).join('') || `<tr><td colspan="6" class="empty">Log every message here — the reply rate drives your weekly review.</td></tr>`}
    </tbody></table></div>`;
  }

  function viewTargets() {
    const by = m => S.targets.filter(t => t.market === m);
    const touch = name => {
      const n = name.toLowerCase();
      return { a: S.applications.filter(x => x.company.toLowerCase() === n).length, o: S.outreach.filter(x => (x.company || '').toLowerCase() === n).length };
    };
    return `
    <div class="page-head"><div><h1>Target companies</h1><p>${S.targets.length} of 40 · spread across four markets</p></div><button class="btn btn-primary" data-add="targets"><i class="fa-solid fa-plus"></i> Add company</button></div>
    <div class="grid g2">${MARKETS.map(m => `<div class="card"><div class="card-head"><div><h2>${m}</h2><p>${by(m).length} companies</p></div></div>
      ${by(m).length ? `<table><tbody>${by(m).map(c => { const x = touch(c.name); return `<tr data-edit="targets" data-id="${c.id}"><td><strong>${esc(c.name)}</strong><br><small class="muted">${esc(c.notes || '')}</small></td><td><span class="badge ${c.priority === 'High' ? 'b-amber' : 'b-gray'}">${esc(c.priority || 'Normal')}</span></td><td style="text-align:right"><small class="muted">${x.a} apps · ${x.o} msgs</small></td></tr>`; }).join('')}</tbody></table>` : '<p class="muted">None yet.</p>'}
    </div>`).join('')}</div>`;
  }

  function viewMetrics() {
    const ws0 = weekStart(today());
    const weeks = Array.from({ length: 8 }, (_, i) => addDays(ws0, -7 * i));
    const cell = (v, goal, suffix = '') => `<span class="${v >= goal ? 'hit' : 'miss'}">${v}${suffix}</span>`;
    return `
    <div class="page-head"><div><h1>Weekly metrics</h1><p>Every Friday: review, then drop what isn't producing replies. If a number stalls two weeks, fix the stage before it.</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Week of</th><th>Apps (${WEEKLY.apps})</th><th>Messages (${WEEKLY.messages})</th><th>Referral asks (${WEEKLY.referrals})</th><th>Reply rate (${WEEKLY.replyRate}%)</th><th>Interviews (${WEEKLY.interviews})</th><th>LinkedIn search appearances</th><th>InMails</th><th>Site visits</th></tr></thead><tbody>
      ${weeks.map(w => { const s = stats(w, addDays(w, 6)), m = S.weeks[w] || {}; return `<tr><td><strong>${fmt(w)}</strong></td><td>${cell(s.apps, WEEKLY.apps)}</td><td>${cell(s.hm + S.outreach.filter(o => o.type === 'Recruiter' && o.date >= w && o.date <= addDays(w, 6)).length, WEEKLY.messages)}</td><td>${cell(s.refs, WEEKLY.referrals)}</td><td>${cell(s.rate, WEEKLY.replyRate, '%')}</td><td>${cell(s.interviews, WEEKLY.interviews)}</td>
        ${['search', 'inmails', 'visits'].map(k => `<td><input class="inline" type="number" min="0" data-week="${w}" data-k="${k}" value="${m[k] == null ? '' : m[k]}"></td>`).join('')}</tr>`; }).join('')}
    </tbody></table></div>
    <div class="card" style="margin-top:16px"><div class="card-head"><h2>If it's low, fix…</h2></div>
      <table><tbody>
        <tr><td><strong>Search appearances / InMails</strong></td><td>LinkedIn headline, skills keywords, Open to Work titles</td></tr>
        <tr><td><strong>Site visits</strong></td><td>Put manwellclark.com in every post and message</td></tr>
        <tr><td><strong>Reply rate</strong></td><td>Shorter, more specific messages; lead with the program you'd own</td></tr>
        <tr><td><strong>Interviews</strong></td><td>Résumé tailoring and a bigger share of referrals</td></tr>
        <tr><td><strong>Final rounds</strong></td><td>Case studies and interview stories</td></tr>
      </tbody></table></div>`;
  }

  function viewPlan() {
    return `
    <div class="page-head"><div><h1>30-day plan</h1><p>Week 1 builds the storefront; weeks 2–4 run the daily routine on the Today page.</p></div></div>
    <div class="grid g2">${S.plan.map(g => { const d = g.items.filter(i => i.done).length; return `<div class="card"><div class="card-head"><div><h2>${esc(g.title)}</h2><p>${d} of ${g.items.length} done</p></div></div>
      <div class="bar ${d === g.items.length ? 'good' : ''}" style="margin-bottom:6px"><span style="width:${pct(d, g.items.length)}%"></span></div>
      ${g.items.map(i => `<label class="check ${i.done ? 'done' : ''}" style="text-transform:none;letter-spacing:0;font-size:inherit;font-weight:inherit;margin:0;cursor:pointer"><input type="checkbox" data-plan="${g.id}" data-item="${i.id}" ${i.done ? 'checked' : ''}><span class="txt"><strong>${esc(i.text)}</strong></span></label>`).join('')}
    </div>`; }).join('')}</div>`;
  }

  function viewRoles() {
    return `
    <div class="page-head"><div><h1>Roles &amp; scripts</h1><p>Search with these exact titles. Private sector, remote US.</p></div></div>
    <div class="table-wrap"><table><thead><tr><th>Role family</th><th>Titles to search</th><th>Your strongest proof</th></tr></thead><tbody>
      ${ROLE_FAMILIES.map(r => `<tr style="cursor:default"><td><strong>${r.name}</strong></td><td>${r.titles}</td><td class="muted">${r.proof}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="grid g2" style="margin-top:16px">${SCRIPTS.map((s, i) => `<div class="card"><div class="card-head"><h2>${s.name}</h2><button class="btn btn-ghost btn-sm" data-copy="${i}"><i class="fa-solid fa-copy"></i> Copy</button></div><div class="script">${esc(s.text)}</div></div>`).join('')}</div>`;
  }

  // ---------- view bindings ----------
  const state_ui = {};
  function bindView(v) {
    $$('#view [data-edit]').forEach(r => r.addEventListener('click', () => openForm(r.dataset.edit, r.dataset.id)));
    $$('#view [data-add]').forEach(b => b.addEventListener('click', () => openForm(b.dataset.add, null, b.dataset.type)));
    $$('#view [data-count]').forEach(b => b.addEventListener('click', () => {
      const log = dayLog(today()); log[b.dataset.count] = Math.max(0, (log[b.dataset.count] || 0) + Number(b.dataset.d)); save(); render();
    }));
    const pc = $('#postsChk'); if (pc) pc.addEventListener('change', () => { dayLog(today()).posts = pc.checked; save(); render(); });
    $$('#view [data-plan]').forEach(c => c.addEventListener('change', () => {
      const g = S.plan.find(x => x.id === c.dataset.plan); const it = g.items.find(x => x.id === c.dataset.item); it.done = c.checked; save(); render();
    }));
    $$('#view [data-week]').forEach(inp => inp.addEventListener('change', () => {
      const w = S.weeks[inp.dataset.week] = S.weeks[inp.dataset.week] || {}; w[inp.dataset.k] = inp.value === '' ? null : Number(inp.value); save();
    }));
    $$('#view [data-copy]').forEach(b => b.addEventListener('click', () => { navigator.clipboard && navigator.clipboard.writeText(SCRIPTS[b.dataset.copy].text); toast('Copied — fill in the {braces}'); }));
    const q = $('#appQ'); if (q) q.addEventListener('input', () => { state_ui.appQ = q.value; const pos = q.selectionStart; render(); const nq = $('#appQ'); nq.focus(); nq.setSelectionRange(pos, pos); });
    const f = $('#appF'); if (f) f.addEventListener('change', () => { state_ui.appF = f.value; render(); });
  }

  // ---------- forms ----------
  const FORMS = {
    applications: { title: 'application', fields: [
      ['company', 'Company', 'text', true], ['role', 'Role title', 'text', true],
      ['family', 'Role family', FAMILIES], ['status', 'Status', STATUSES],
      ['applied', 'Date applied', 'date'], ['interview', 'First interview date', 'date'],
      ['next', 'Next step', 'text'], ['nextDate', 'Next step date', 'date'],
      ['url', 'Posting URL', 'url', false, true], ['contact', 'Contact (recruiter / HM)', 'text', false, true],
      ['notes', 'Notes', 'textarea', false, true]] },
    outreach: { title: 'message', fields: [
      ['name', 'Person', 'text', true], ['title', 'Their title', 'text'],
      ['company', 'Company', 'text', true], ['type', 'Type', OUT_TYPES],
      ['channel', 'Channel', ['LinkedIn', 'Email', 'Phone', 'In person']], ['date', 'Date sent', 'date', true],
      ['replied', 'They replied', 'checkbox'], ['notes', 'Notes', 'textarea', false, true]] },
    targets: { title: 'company', fields: [
      ['name', 'Company', 'text', true], ['market', 'Market', MARKETS],
      ['priority', 'Priority', ['High', 'Normal']], ['careers', 'Careers page URL', 'url'],
      ['notes', 'Notes (why them, who you know)', 'textarea', false, true]] }
  };
  let editing = null;
  function openForm(kind, id, presetType) {
    const def = FORMS[kind], list = S[kind];
    const item = id ? list.find(x => x.id === id) : null;
    const v = item ? Object.assign({}, item) : { status: 'Applied', applied: today(), date: today(), family: FAMILIES[0], type: presetType || OUT_TYPES[0], channel: 'LinkedIn', market: MARKETS[0], priority: 'Normal' };
    editing = { kind, id };
    $('#modalTitle').textContent = (item ? 'Edit ' : 'Add ') + def.title;
    $('#modalDelete').hidden = !item;
    $('#modalBody').innerHTML = def.fields.map(([k, label, type, req, full]) => {
      const val = v[k] == null ? '' : v[k];
      let input;
      if (Array.isArray(type)) input = `<select name="${k}">${type.map(o => `<option ${o === val ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
      else if (type === 'textarea') input = `<textarea name="${k}">${esc(val)}</textarea>`;
      else if (type === 'checkbox') return `<div class="${full ? 'full' : ''}" style="display:flex;align-items:center;gap:10px;padding-top:22px"><input type="checkbox" name="${k}" id="f_${k}" ${val ? 'checked' : ''}><label for="f_${k}" style="margin:0">${label}</label></div>`;
      else input = `<input name="${k}" type="${type}" value="${esc(val)}" ${req ? 'required' : ''}>`;
      return `<div class="${full || type === 'textarea' ? 'full' : ''}"><label>${label}</label>${input}</div>`;
    }).join('');
    $('#modal').showModal();
    const first = $('#modalBody input, #modalBody select'); if (first) first.focus();
  }
  function closeForm() { $('#modal').close(); editing = null; }
  $('#modalForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!$('#modalForm').reportValidity()) return;
    const def = FORMS[editing.kind], list = S[editing.kind];
    const out = {};
    def.fields.forEach(([k, , type]) => { const el = $(`#modalBody [name="${k}"]`); out[k] = type === 'checkbox' ? el.checked : el.value.trim(); });
    if (editing.id) Object.assign(list.find(x => x.id === editing.id), out);
    else list.push(Object.assign({ id: uid() }, out));
    // keep target list in sync: auto-add a company the first time you apply/message
    if (editing.kind !== 'targets' && out.company && !S.targets.some(t => t.name.toLowerCase() === out.company.toLowerCase())) {
      S.targets.push({ id: uid(), name: out.company, market: MARKETS[0], priority: 'Normal', careers: '', notes: 'Auto-added — set the market' });
    }
    closeForm(); save(); render(); toast('Saved');
  });
  $('#modalDelete').addEventListener('click', () => {
    if (!editing || !editing.id) return;
    if (!confirm('Delete this entry? This cannot be undone.')) return;
    S[editing.kind] = S[editing.kind].filter(x => x.id !== editing.id);
    closeForm(); save(); render(); toast('Deleted');
  });
  $('#modalCancel').addEventListener('click', closeForm);
  $('#modalClose').addEventListener('click', closeForm);
  document.addEventListener('click', e => { const b = e.target.closest('.top-actions [data-add]'); if (b) openForm(b.dataset.add); });

  // ---------- sidebar ----------
  function closeSidebar() { $('#sidebar').classList.remove('open'); $('.scrim').hidden = true; }
  $('.nav-toggle').addEventListener('click', () => { const o = $('#sidebar').classList.toggle('open'); $('.scrim').hidden = !o; });
  $('.scrim').addEventListener('click', closeSidebar);

  // ---------- export / logout ----------
  $('#exportBtn').addEventListener('click', e => {
    e.preventDefault();
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `playbook-${today()}.json`; a.click();
  });
  $('#logoutBtn').addEventListener('click', async e => { e.preventDefault(); await flush(); await api('/api/logout', { method: 'POST' }); location.reload(); });

  // ---------- boot ----------
  function showLogin() { $('#app').hidden = true; $('#login').hidden = false; $('#pw').focus(); }
  async function boot() {
    const s = await api('/api/session');
    if (!s.data.authed) return showLogin();
    const r = await api('/api/state');
    if (!r.ok) return showLogin();
    S = r.data.state || seed();
    ['applications', 'outreach', 'targets', 'plan'].forEach(k => { S[k] = S[k] || (k === 'plan' ? planSeed() : []); });
    S.daily = S.daily || {}; S.weeks = S.weeks || {};
    if (!r.data.state) save();
    $('#login').hidden = true; $('#app').hidden = false;
    render();
  }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const r = await api('/api/login', { method: 'POST', body: JSON.stringify({ password: $('#pw').value }) });
    if (r.ok) { $('#loginErr').textContent = ''; boot(); }
    else $('#loginErr').textContent = r.data.error || 'Sign-in failed';
  });
  boot();
})();
