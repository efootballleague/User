// ============================================================
// PAGES.JS — Home, Standings, Fixtures, Match Prep
// ============================================================

// ── STANDINGS COMPUTE ─────────────────────────────────────────
function computeStd(lid) {
  var t = {};
  Object.values(allPlayers)
    .filter(function (p) { return p.league === lid; })
    .forEach(function (p) {
      t[p.uid] = { uid:p.uid, name:p.username, club:p.club, league:lid,
        country:p.country||'', lastSeen:p.lastSeen||0, p:0,w:0,d:0,l:0,gf:0,ga:0, form:[] };
    });
  Object.values(allMatches)
    .filter(function (m) { return m.league === lid && m.played && !m.pendingResult; })
    .forEach(function (m) {
      var h = t[m.homeId], a = t[m.awayId];
      if (!h || !a) return;
      h.p++; a.p++; h.gf += m.hg; h.ga += m.ag; a.gf += m.ag; a.ga += m.hg;
      if      (m.hg > m.ag) { h.w++; h.form.push('w'); a.l++; a.form.push('l'); }
      else if (m.hg < m.ag) { a.w++; a.form.push('w'); h.l++; h.form.push('l'); }
      else                  { h.d++; h.form.push('d'); a.d++; a.form.push('d'); }
    });
  return Object.values(t).map(function (r) {
    var pen = allPenalties[r.uid]
      ? Object.values(allPenalties[r.uid]).reduce(function (s, x) { return s + (x.pts || 0); }, 0) : 0;
    r.rawPts = r.w * 3 + r.d; r.penPts = pen; r.pts = Math.max(0, r.rawPts - pen);
    return r;
  }).sort(function (a, b) {
    if (b.pts !== a.pts) return b.pts - a.pts;
    return (b.gf - b.ga) - (a.gf - a.ga);
  });
}

// ── STANDINGS RENDER ──────────────────────────────────────────
function renderStd(lid) {
  curLg = lid;
  var rows  = computeStd(lid);
  var total = rows.length;
  var html  = '';
  if (!rows.length) {
    html = '<tr><td colspan="12" style="padding:1.6rem;color:var(--dim);text-align:center">No players in this league yet.</td></tr>';
  } else {
    rows.forEach(function (r, i) {
      var pos = i + 1;
      var pc  = pos === 1 ? '#FFE600' : pos <= 4 ? '#00d4ff' : pos > total - 3 ? '#FF2882' : 'var(--dim)';
      var gd  = r.gf - r.ga;
      var gdc = gd > 0 ? '#00ff88' : gd < 0 ? '#FF2882' : 'var(--dim)';
      var form = r.form.slice(-5).map(function (f) { return '<span class="fd ' + f + '"></span>'; }).join('');
      var penBadge = r.penPts > 0 ? '<span class="deduct-badge">-' + r.penPts + '</span>' : '';
      var dot = '<span data-lastseen="' + r.lastSeen + '" style="width:7px;height:7px;border-radius:50%;'
        + 'background:' + lsColor(r.lastSeen) + ';display:inline-block;margin-right:3px" title="' + fmtAgo(r.lastSeen) + '"></span>';
      html += '<tr onclick="openUserModal(\'' + r.uid + '\')" style="cursor:pointer">'
        + '<td><span style="font-family:Orbitron,sans-serif;font-weight:700;font-size:.72rem;color:' + pc + '">' + pos + '</span></td>'
        + '<td>' + dot + '<strong>' + esc(r.name) + '</strong> <span style="font-size:.58rem;color:var(--dim)">' + esc(r.country) + '</span></td>'
        + '<td><div style="display:flex;align-items:center;gap:5px">' + clubBadge(r.club, lid, 20) + '<span style="font-size:.73rem;color:#aaa">' + esc(r.club) + '</span></div></td>'
        + '<td>' + r.p + '</td><td>' + r.w + '</td><td>' + r.d + '</td><td>' + r.l + '</td>'
        + '<td>' + r.gf + '</td><td>' + r.ga + '</td>'
        + '<td style="color:' + gdc + '">' + (gd > 0 ? '+' : '') + gd + '</td>'
        + '<td>' + form + '</td>'
        + '<td><span style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.82rem;color:' + (r.penPts > 0 ? '#FF2882' : '#fff') + '">' + r.pts + '</span>' + penBadge + '</td>'
        + '</tr>';
    });
  }
  var body = $('std-body');
  if (body) body.innerHTML = html;
  // Update active tab styling
  // FIX: was using .tab class — now uses .lgtab
  document.querySelectorAll('#lg-tabs .lgtab').forEach(function (b) {
    var isActive = b.getAttribute('data-lid') === lid;
    b.classList.toggle('active', isActive);
    if (isActive) {
      var lg = LGS[lid] || {};
      b.style.borderColor = lg.c; b.style.color = lg.c;
    } else {
      b.style.borderColor = ''; b.style.color = '';
    }
  });
}

function switchLg(lid, btn) {
  renderStd(lid);
}

// ── HOME STATS ────────────────────────────────────────────────
function renderHomeStats() {
  var ps = Object.keys(allPlayers).length;
  var ms = Object.values(allMatches);
  var played = ms.filter(function (m) { return m.played; }).length;
  var sp = $('st-p'), sm = $('st-m'), sf = $('st-f');
  if (sp) sp.textContent = ps;
  if (sm) sm.textContent = played;
  if (sf) sf.textContent = ms.length;
}

// ── RECENT RESULTS ────────────────────────────────────────────
function renderRecentRes() {
  var el = $('recent-res'); if (!el) return;
  var played = Object.values(allMatches)
    .filter(function (m) { return m.played; })
    .sort(function (a, b) { return (b.playedAt || 0) - (a.playedAt || 0); })
    .slice(0, 6);
  if (!played.length) {
    el.innerHTML = '<div class="card empty">No results yet!</div>'; return;
  }
  el.innerHTML = played.map(function (m) {
    var hp = allPlayers[m.homeId], ap = allPlayers[m.awayId];
    if (!hp || !ap) return '';
    var lg = LGS[m.league] || {};
    return '<div class="card" style="padding:.85rem;cursor:pointer" onclick="openUserModal(\'' + hp.uid + '\')">'
      + '<div style="display:flex;justify-content:space-between;margin-bottom:.5rem">'
      + '<span style="font-size:.56rem;font-weight:700;padding:2px 6px;border-radius:4px;background:' + (lg.bg||'') + ';color:' + (lg.c||'#aaa') + '">' + esc(lg.short||'') + '</span>'
      + '<span style="font-size:.6rem;color:var(--dim)">' + fmtDate(m.playedAt) + '</span></div>'
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:.38rem">'
      + '<div style="flex:1;text-align:center">' + clubBadge(hp.club, m.league, 24) + '<div style="font-size:.7rem;font-weight:700;margin-top:2px">' + esc(hp.username) + '</div></div>'
      + '<div style="background:rgba(0,0,0,0.4);border-radius:7px;padding:5px 10px;text-align:center">'
      + '<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.92rem;color:#00FF85;letter-spacing:2px">' + m.hg + '-' + m.ag + '</div>'
      + '<div style="font-size:.52rem;color:var(--dim)">FT</div></div>'
      + '<div style="flex:1;text-align:center">' + clubBadge(ap.club, m.league, 24) + '<div style="font-size:.7rem;font-weight:700;margin-top:2px">' + esc(ap.username) + '</div></div>'
      + '</div></div>';
  }).join('');
}

// ── TOP PLAYERS ───────────────────────────────────────────────
function renderTopPlayers() {
  var el = $('top-players'); if (!el) return;
  var ps = Object.values(allPlayers);
  if (!ps.length) { el.innerHTML = '<div class="card empty">No players yet.</div>'; return; }
  var scored = ps.map(function (p) {
    var raw = Object.values(allMatches)
      .filter(function (m) { return m.played && (m.homeId === p.uid || m.awayId === p.uid); })
      .reduce(function (acc, m) {
        return acc + (m.homeId === p.uid ? (m.hg > m.ag ? 3 : m.hg === m.ag ? 1 : 0) : (m.ag > m.hg ? 3 : m.ag === m.hg ? 1 : 0));
      }, 0);
    var pen = allPenalties[p.uid]
      ? Object.values(allPenalties[p.uid]).reduce(function (s, x) { return s + (x.pts || 0); }, 0) : 0;
    return { p: p, pts: Math.max(0, raw - pen) };
  }).sort(function (a, b) { return b.pts - a.pts; }).slice(0, 6);
  el.innerHTML = scored.map(function (x, i) {
    var p = x.p, lg = LGS[p.league] || {};
    return '<div class="card" style="padding:.82rem;display:flex;align-items:center;gap:.65rem;cursor:pointer" onclick="openUserModal(\'' + p.uid + '\')">'
      + '<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.85rem;color:#FFE600;min-width:18px">#' + (i + 1) + '</div>'
      + clubBadge(p.club, p.league, 32)
      + '<div style="flex:1"><div style="font-weight:700;font-size:.82rem">' + esc(p.username) + '</div>'
      + '<div style="font-size:.6rem;color:var(--dim)">' + esc(p.club) + '</div>'
      + '<div style="font-size:.6rem;color:' + lg.c + '">' + esc(lg.n || '') + '</div></div>'
      + '<div style="text-align:center"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.95rem;color:#FFE600">' + x.pts + '</div>'
      + '<div style="font-size:.55rem;color:var(--dim)">PTS</div></div>'
      + '</div>';
  }).join('');
}

// ── FIXTURES ─────────────────────────────────────────────────
function renderFx() {
  var el = $('fix-list'); if (!el) return;
  var list = Object.values(allMatches);
  if (curFxFilter !== 'all') list = list.filter(function (m) { return m.league === curFxFilter; });
  list.sort(function (a, b) {
    if (!a.played && !b.played) return (a.matchTime || a.createdAt || 0) - (b.matchTime || b.createdAt || 0);
    if (!a.played) return -1;
    if (!b.played) return 1;
    return (b.playedAt || 0) - (a.playedAt || 0);
  });
  if (!list.length) { el.innerHTML = '<div class="card empty">No fixtures yet.</div>'; return; }

  // Group by date
  var groups = {}, order = [];
  list.forEach(function (m) {
    var key = m.played ? 'Results'
      : m.matchTime ? new Date(m.matchTime).toLocaleDateString('en-GB', { weekday:'long', day:'2-digit', month:'short' })
      : 'Unscheduled';
    if (!groups[key]) { groups[key] = []; order.push(key); }
    groups[key].push(m);
  });

  var html = '';
  order.forEach(function (dk, gi) {
    html += '<div class="fx-date-label">' + dk.toUpperCase() + '</div>';
    groups[dk].forEach(function (m) {
      var hp = allPlayers[m.homeId], ap = allPlayers[m.awayId];
      if (!hp || !ap) return;
      var lg     = LGS[m.league] || {};
      var isMine = myProfile && (m.homeId === myProfile.uid || m.awayId === myProfile.uid);
      var isPost = !!m.postponed;
      var isPend = m.pendingResult && !m.played;
      var timeStr  = m.matchTime ? fmtTime(m.matchTime) : 'TBD';
      var statusT  = m.played ? 'FT' : isPend ? '⏳ Ref Review' : isPost ? 'POSTPONED' : timeStr;
      var statusC  = m.played ? '#00ff88' : isPend ? '#00d4ff' : isPost ? '#ff6b00' : 'var(--dim)';
      var score    = m.played
        ? '<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.92rem;color:#00FF85;letter-spacing:2px">' + m.hg + '-' + m.ag + '</div><div style="font-size:.52rem;color:var(--dim)">FT</div>'
        : '<div style="font-size:.62rem;color:' + (isPost ? '#ff6b00' : 'var(--dim)') + ';font-weight:700">' + (isPost ? 'PST' : 'vs') + '</div>';

      html += '<div class="fx-card' + (isMine ? ' fx-mine' : '') + (isPost ? ' fx-post' : '') + '">'
        + '<div class="fx-top">'
        + '<div style="display:flex;align-items:center;gap:.35rem;flex-wrap:wrap">'
        + '<span class="lg-badge" style="background:' + lg.bg + ';color:' + lg.c + ';border:1px solid ' + lg.c + '44">' + esc(lg.short || '') + '</span>'
        + (isMine ? '<span class="fx-badge mine">YOUR MATCH</span>' : '')
        + (m.awayVerifying && myProfile && m.awayId === myProfile.uid && !m.awayDispute ? '<span class="fx-badge warn">⚠ VERIFY</span>' : '')
        + (isPend ? '<span class="fx-badge info">🟢 REF REVIEW</span>' : '')
        + (m.refStatus === 'rejected' ? '<span class="fx-badge danger">❌ REJECTED</span>' : '')
        + (m.refereeName ? '<span class="fx-badge ref">Ref: ' + esc(m.refereeName) + '</span>' : '')
        + '</div>'
        + '<span style="font-size:.6rem;color:' + statusC + ';font-weight:600">' + statusT + '</span>'
        + '</div>'
        + '<div class="fx-teams">'
        + '<div class="fx-team" onclick="openUserModal(\'' + hp.uid + '\')">' + clubBadge(hp.club, m.league, 24) + '<div class="fx-name">' + esc(hp.username) + '</div></div>'
        + '<div class="fx-score">' + score + '</div>'
        + '<div class="fx-team" onclick="openUserModal(\'' + ap.uid + '\')">' + clubBadge(ap.club, m.league, 24) + '<div class="fx-name">' + esc(ap.username) + '</div></div>'
        + '</div>'
        + (isMine && !m.played && !isPost
          ? '<div class="fx-actions"><button class="btn-xs" onclick="requestPostpone(\'' + m.id + '\')">Postpone</button></div>' : '')
        + ((!myProfile || (myProfile.uid !== m.homeId && myProfile.uid !== m.awayId)) && !m.played
          ? '<div class="fx-actions"><button class="btn-xs gold" onclick="openPredictModal(\'' + m.homeId + '\',\'' + m.awayId + '\',\'' + m.league + '\',\'' + m.id + '\')">🎯 Predict</button></div>' : '')
        + '</div>';
    });
  });
  el.innerHTML = html;
}

function filterFx(f, btn) {
  curFxFilter = f;
  // FIX: was using .tab — now uses .ftab
  document.querySelectorAll('#fix-filters .ftab').forEach(function (b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderFx();
}

function loadFxPlayers() {
  var lg = $('fix-lg').value;
  $('fix-home').innerHTML = '<option value="">—</option>';
  $('fix-away').innerHTML = '<option value="">—</option>';
  if (!lg) return;
  Object.values(allPlayers).filter(function (p) { return p.league === lg; }).forEach(function (p) {
    var o = '<option value="' + p.uid + '">' + esc(p.username) + ' (' + esc(p.club) + ')</option>';
    $('fix-home').innerHTML += o;
    $('fix-away').innerHTML += o;
  });
}

function addFixture() {
  if (!myProfile) { toast('Login first', 'error'); return; }
  if (!me || me.email !== ADMIN_EMAIL) { toast('Admin only.', 'error'); return; }
  var lg = $('fix-lg').value, hi = $('fix-home').value, ai = $('fix-away').value;
  if (!lg || !hi || !ai) { toast('Fill all fields', 'error'); return; }
  if (hi === ai) { toast("Can't play yourself", 'error'); return; }
  var dup = Object.values(allMatches).find(function (m) {
    return m.league === lg && !m.played && ((m.homeId === hi && m.awayId === ai) || (m.homeId === ai && m.awayId === hi));
  });
  if (dup) { toast('Fixture already exists', 'error'); return; }
  var ref = db.ref(DB.matches).push();
  ref.set({ id:ref.key, league:lg, homeId:hi, awayId:ai, hg:0, ag:0, played:false, createdAt:Date.now() })
    .then(function () {
      toast('Fixture added!');
      toggleAddFixture();
      scheduleMatch(ref.key, lg, hi, ai);
    })
    .catch(function () { toast('Failed', 'error'); });
}

function toggleAddFixture() {
  var e = $('add-fix-panel'); if (!e) return;
  e.classList.toggle('hidden');
}

// ── SCHEDULING ────────────────────────────────────────────────
var SLOT_MS = 15 * 60 * 1000;

function pickRef(lid, excl) {
  var pool = Object.values(allPlayers).filter(function (p) { return p.league === lid && !excl.includes(p.uid); });
  if (!pool.length) return { uid:'', name:'TBD' };
  var r = pool[Math.floor(Math.random() * pool.length)];
  return { uid:r.uid, name:r.username };
}

function hasOverlap(start, excl, hid, aid) {
  var end = start + SLOT_MS;
  return Object.values(allMatches)
    .filter(function (m) { return !m.played && m.matchTime && (!excl || !excl.includes(m.id)); })
    .some(function (m) {
      return start < m.matchTime + SLOT_MS && end > m.matchTime
        && (m.homeId === hid || m.awayId === hid || m.homeId === aid || m.awayId === aid);
    });
}

function findSlot(from, hid, aid, excl) {
  var s = from, max = 200;
  while (max-- > 0) { if (!hasOverlap(s, excl, hid, aid)) return s; s += SLOT_MS; }
  return s;
}

function scheduleMatch(mid, lid, hid, aid) {
  if (!db) return;
  var base = Math.ceil((Date.now() + 3600000) / SLOT_MS) * SLOT_MS + Math.floor(Math.random() * 8) * SLOT_MS;
  var slot = findSlot(base, hid, aid, [mid]);
  var ref  = pickRef(lid, [hid, aid]);
  db.ref(DB.matches + '/' + mid).update({ matchTime:slot, scheduledAt:Date.now(), refereeUID:ref.uid, refereeName:ref.name });
}

function autoScheduleLeague() {
  if (!myProfile) { toast('Login first', 'error'); return; }
  var lid     = myProfile.league;
  var pending = Object.values(allMatches).filter(function (m) { return !m.played && m.league === lid; });
  if (!pending.length) { toast('No pending matches', 'error'); return; }
  var base    = Math.ceil((Date.now() + 3600000) / SLOT_MS) * SLOT_MS;
  var updates = {};
  pending.sort(function () { return Math.random() - .5; }).forEach(function (m) {
    var slot = findSlot(base, m.homeId, m.awayId, [m.id]);
    var ref  = pickRef(lid, [m.homeId, m.awayId]);
    updates[DB.matches + '/' + m.id + '/matchTime']    = slot;
    updates[DB.matches + '/' + m.id + '/scheduledAt']  = Date.now();
    updates[DB.matches + '/' + m.id + '/refereeUID']   = ref.uid;
    updates[DB.matches + '/' + m.id + '/refereeName']  = ref.name;
    allMatches[m.id] = Object.assign({}, allMatches[m.id], { matchTime:slot });
  });
  db.ref().update(updates)
    .then(function () { toast(pending.length + ' matches scheduled!'); renderMatchPrep(); renderSchedTimeline(); })
    .catch(function () { toast('Failed', 'error'); });
}

// ── SCHEDULED TIMELINE ────────────────────────────────────────
function renderSchedTimeline() {
  var el = $('sched-timeline'); if (!el) return;
  var all = Object.values(allMatches)
    .filter(function (m) { return !m.played && m.matchTime; })
    .sort(function (a, b) { return a.matchTime - b.matchTime; });
  if (!all.length) { el.innerHTML = '<div class="card empty">No scheduled matches yet.</div>'; return; }
  var html = '', lastD = '';
  all.forEach(function (m, i) {
    var hp = allPlayers[m.homeId], ap = allPlayers[m.awayId]; if (!hp || !ap) return;
    var lg  = LGS[m.league] || {};
    var d   = new Date(m.matchTime).toLocaleDateString('en-GB', { weekday:'short', day:'2-digit', month:'short' });
    var t   = fmtTime(m.matchTime);
    if (d !== lastD) { lastD = d; html += '<div class="fx-date-label">' + d.toUpperCase() + '</div>'; }
    var isMine = myProfile && (m.homeId === myProfile.uid || m.awayId === myProfile.uid);
    html += '<div class="fx-card' + (isMine ? ' fx-mine' : '') + '" style="margin-bottom:.45rem">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.35rem">'
      + '<div style="display:flex;align-items:center;gap:.55rem">'
      + '<div style="font-family:Orbitron,sans-serif;font-size:.82rem;font-weight:900;color:#FFE600;min-width:44px">' + t + '</div>'
      + clubBadge(hp.club, m.league, 22) + '<span style="font-size:.78rem;font-weight:700">' + esc(hp.username) + '</span>'
      + '<span style="font-size:.68rem;color:var(--dim)">vs</span>'
      + clubBadge(ap.club, m.league, 22) + '<span style="font-size:.78rem;font-weight:700">' + esc(ap.username) + '</span>'
      + '</div>'
      + '<div style="display:flex;gap:.4rem;flex-wrap:wrap">'
      + '<span class="lg-badge" style="background:' + lg.bg + ';color:' + lg.c + ';border:1px solid ' + lg.c + '44">' + esc(lg.short || '') + '</span>'
      + (m.refereeName ? '<span class="fx-badge ref">Ref: ' + esc(m.refereeName) + '</span>' : '')
      + (isMine ? '<span class="fx-badge mine">YOUR MATCH</span>' : '')
      + '</div></div>'
      + (m.roomCode ? '<div style="margin-top:.45rem;font-size:.68rem;color:var(--dim)">Code: <span class="mcode" onclick="copyCode(\'' + esc(m.roomCode) + '\')">' + esc(m.roomCode) + '</span></div>' : '')
      + '</div>';
  });
  el.innerHTML = html;
}

// ── MATCH PREP ────────────────────────────────────────────────
function renderMatchPrep() {
  renderMySwapSection();
  if (!myProfile) {
    var h = $('prep-home-list'); if (h) h.innerHTML = '<div class="card empty">Login to view your matches.</div>'; return;
  }
  var uid    = myProfile.uid;
  var homeMs = Object.values(allMatches).filter(function (m) { return !m.played && m.homeId === uid; });
  var awayMs = Object.values(allMatches).filter(function (m) { return !m.played && m.awayId === uid; });
  var hl = $('prep-home-list'), al = $('prep-away-list');
  if (hl) {
    if (!homeMs.length) {
      hl.innerHTML = '<div class="card empty">No pending home matches.</div>';
    } else {
      hl.innerHTML = homeMs.map(function (m) {
        var ap = allPlayers[m.awayId]; if (!ap) return '';
        var lg = LGS[m.league] || {};
        return '<div class="mcard">'
          + '<div class="mcard-top">'
          + '<div style="display:flex;align-items:center;gap:.65rem">' + clubBadge(myProfile.club, myProfile.league, 28)
          + '<div><div style="font-weight:700;font-size:.85rem">vs ' + esc(ap.username) + ' <span style="font-size:.6rem;color:var(--dim)">(Away)</span></div>'
          + '<div style="font-size:.63rem;color:' + lg.c + '">' + esc(lg.n || '') + '</div></div></div>'
          + '<span class="mstatus ' + (m.roomCode ? 'ms-rdy' : 'ms-pend') + '">' + (m.roomCode ? 'Ready' : 'Pending') + '</span>'
          + '</div>'
          + (m.roomCode ? '<div style="margin-bottom:.55rem"><div style="font-size:.63rem;color:var(--dim);margin-bottom:2px">Room Code</div><span class="mcode" onclick="copyCode(\'' + esc(m.roomCode) + '\')">' + esc(m.roomCode) + '</span></div>' : '')
          + '<div style="font-size:.7rem;color:var(--dim)">' + fmtFull(m.matchTime) + (m.prepNote ? ' · ' + esc(m.prepNote) : '') + '</div>'
          + '<div class="mcard-btns">'
          + '<button class="btn-sm btn-accent" onclick="openPrepModal(\'' + m.id + '\')">' + (m.roomCode ? 'Update Code' : 'Drop Code') + '</button>'
          + (m.roomCode ? '<button class="btn-sm btn-outline" onclick="openDMWith(\'' + ap.uid + '\',\'' + esc(ap.username) + '\')">DM Away</button>' : '')
          + '</div></div>';
      }).join('');
    }
  }
  if (al) {
    if (!awayMs.length) {
      al.innerHTML = '<div class="card empty">No pending away matches.</div>';
    } else {
      al.innerHTML = awayMs.map(function (m) {
        var hp = allPlayers[m.homeId]; if (!hp) return '';
        var lg = LGS[m.league] || {};
        return '<div class="mcard" style="border-color:rgba(0,212,255,0.18)">'
          + '<div class="mcard-top">'
          + '<div style="display:flex;align-items:center;gap:.65rem">' + clubBadge(hp.club, m.league, 28)
          + '<div><div style="font-weight:700;font-size:.85rem">vs ' + esc(hp.username) + ' <span style="font-size:.6rem;color:var(--dim)">(Home)</span></div>'
          + '<div style="font-size:.63rem;color:' + lg.c + '">' + esc(lg.n || '') + '</div></div></div>'
          + '<span class="mstatus ' + (m.roomCode ? 'ms-rdy' : 'ms-pend') + '">' + (m.roomCode ? 'Code Ready' : 'Waiting') + '</span>'
          + '</div>'
          + (m.roomCode
            ? '<div style="margin-bottom:.55rem"><span class="mcode" onclick="copyCode(\'' + esc(m.roomCode) + '\')">' + esc(m.roomCode) + '</span></div>'
              + '<div style="font-size:.7rem;color:var(--dim)">' + fmtFull(m.matchTime) + (m.prepNote ? ' · ' + esc(m.prepNote) : '') + '</div>'
            : '<div style="font-size:.76rem;color:var(--dim);font-style:italic">Home team hasn\'t set the code yet.</div>')
          + '<div class="mcard-btns">'
          + (m.roomCode ? '<button class="btn-sm btn-accent" onclick="copyCode(\'' + esc(m.roomCode || '') + '\')">Copy Code</button>' : '')
          + '<button class="btn-sm btn-outline" onclick="openDMWith(\'' + hp.uid + '\',\'' + esc(hp.username) + '\')">DM Home</button>'
          + '</div></div>';
      }).join('');
    }
  }
}

function renderMySwapSection() {
  var el = $('my-swap-section'); if (!el) return;
  if (!myProfile) { el.innerHTML = ''; return; }
  var incoming = Object.values(_swapRequests || {});
  if (!incoming.length) { el.innerHTML = ''; return; }
  el.innerHTML = '<div class="card" style="padding:.9rem;margin-bottom:.8rem;border-color:rgba(255,230,0,0.2)">'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:#FFE600;letter-spacing:1.5px;margin-bottom:.6rem">🔄 SWAP REQUESTS</div>'
    + incoming.map(function (r) {
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem 0;border-bottom:1px solid var(--border)">'
        + '<div style="font-size:.78rem"><strong>' + esc(r.fromName) + '</strong> wants to swap <span style="color:#FFE600">' + esc(r.fromClub) + '</span> ↔ <span style="color:#00D4FF">' + esc(r.toClub) + '</span></div>'
        + '<div style="display:flex;gap:.35rem">'
        + '<button class="btn-sm btn-accent" style="font-size:.62rem" onclick="acceptSwap(\'' + r.key + '\')">✓</button>'
        + '<button class="btn-sm btn-outline" style="font-size:.62rem" onclick="declineSwap(\'' + r.key + '\')">✗</button>'
        + '</div></div>';
    }).join('')
    + '</div>';
}

// ── PREP MODAL ────────────────────────────────────────────────
function openPrepModal(mid) {
  if (!myProfile) { showLanding(); return; }
  $('prep-mid').value  = mid;
  var m = allMatches[mid];
  $('prep-code').value = m && m.roomCode ? m.roomCode : '';
  $('prep-note').value = m && m.prepNote ? m.prepNote : '';
  $('prep-time').value = '';
  $('prep-err').textContent = '';
  openMo('prep-mo');
}

function submitPrep() {
  var mid  = $('prep-mid').value;
  var code = $('prep-code').value.trim().toUpperCase();
  var time = $('prep-time').value;
  var note = $('prep-note').value.trim();
  var err  = $('prep-err');
  err.textContent = '';
  if (!code) { err.textContent = 'Enter a room code.'; return; }
  if (!time) { err.textContent = 'Set a match time.'; return; }
  var m  = allMatches[mid];
  var ap = m && allPlayers[m.awayId];
  db.ref(DB.matches + '/' + mid).update({ roomCode:code, matchTime:new Date(time).getTime(), prepNote:note, prepSetAt:Date.now() })
    .then(function () {
      closeMo('prep-mo');
      toast('Code sent to away team!');
      if (ap && myProfile) {
        var dk = dmKey(myProfile.uid, ap.uid);
        db.ref(DB.dm + '/' + dk).push({ from:myProfile.uid, fromName:myProfile.username, text:'Match code: ' + code + ' | Time: ' + fmtFull(new Date(time).getTime()) + (note ? ' | ' + note : ''), ts:Date.now(), system:true });
        db.ref(DB.dmMeta + '/' + dk).update({ lastMsg:'Code: ' + code, lastTs:Date.now(), ['participants/' + myProfile.uid]:true, ['participants/' + ap.uid]:true });
        db.ref(DB.dmUnread + '/' + ap.uid + '/' + dk).transaction(function (v) { return (v || 0) + 1; });
      }
    })
    .catch(function () { err.textContent = 'Failed. Try again.'; });
}

function requestPostpone(mid) {
  if (typeof openPostponeRequest === 'function') openPostponeRequest(mid);
  else toast('Postpone system loading...', 'error');
}

function undoPostpone(mid) {
  if (!db || !myProfile) return;
  db.ref(DB.matches + '/' + mid).update({ postponed:false }).then(function () { toast('Postpone removed.'); });
}

// ── PREDICT MODAL STUB ────────────────────────────────────────
// Full implementation in features.js
function openPredictModal(hid, aid, lid, mid) {
  if (typeof _openPredictModal === 'function') _openPredictModal(hid, aid, lid, mid);
  else toast('Predictions loading...', 'error');
}

// ── OPEN DM WITH ──────────────────────────────────────────────
function openDMWith(uid, uname) {
  goPage('pm');
  setTimeout(function () {
    if (typeof startDMWith === 'function') startDMWith(uid, uname);
  }, 300);
}

// ============================================================
// PREDICTIONS PAGE
// ============================================================
function renderPredictions() {
  var pg = $('page-predict'); if (!pg) return;
  var upcoming = Object.values(allMatches)
    .filter(function(m) { return !m.played && m.homeId && m.awayId; })
    .sort(function(a,b) { return (a.matchTime||9e12)-(b.matchTime||9e12); });

  if (!upcoming.length) {
    pg.innerHTML = '<div class="section-header"><div class="section-title c-gold">🎯 Predictions</div><div class="section-line gold"></div></div>'
      + '<div class="card empty">No upcoming fixtures to predict.</div>'; return;
  }

  var html = '<div class="section-header"><div class="section-title c-gold">🎯 Predictions</div><div class="section-line gold"></div></div>'
    + '<div style="font-size:.72rem;color:var(--dim);margin-bottom:.8rem">Predict scores. Exact = 3pts, correct outcome = 1pt.</div>';

  upcoming.forEach(function(m) {
    var hp = allPlayers[m.homeId], ap = allPlayers[m.awayId]; if (!hp||!ap) return;
    var lg = LGS[m.league]||{};
    var isMine = myProfile && (m.homeId===myProfile.uid||m.awayId===myProfile.uid);
    if (isMine) return; // can't predict your own match

    // Big match detection
    var table = computeStd(m.league);
    var total = table.length;
    var hPos  = table.findIndex(function(r){return r.uid===m.homeId;})+1;
    var aPos  = table.findIndex(function(r){return r.uid===m.awayId;})+1;
    var isBig = false, bigReason = '';
    if (hPos<=2 && aPos<=2) { isBig=true; bigReason='Top of the Table Clash'; }
    else if ((hPos<=4&&aPos<=4)&&Math.abs(hPos-aPos)<=1) { isBig=true; bigReason='Title Race Decider'; }
    else if (hPos>total-3||aPos>total-3) { isBig=true; bigReason='Relegation Battle'; }
    else if ((hPos<=3&&aPos>total-3)||(aPos<=3&&hPos>total-3)) { isBig=true; bigReason='Giant Killer Potential'; }

    // Check existing prediction
    var predKey  = me ? 'pred_' + me.uid + '_' + m.id : null;
    var hasPred  = false;

    html += '<div class="pred-card' + (isBig?' big-match':'') + '">'
      + (isBig ? '<div class="big-match-banner"><div class="big-match-pulse"></div><span>' + bigReason + '</span></div>' : '')
      + '<div class="pred-top">'
      + '<span class="lg-badge" style="background:'+lg.bg+';color:'+lg.c+';border:1px solid '+lg.c+'44">'+esc(lg.short||'')+'</span>'
      + (m.matchTime ? '<span style="font-size:.6rem;color:var(--dim)">'+fmtFull(m.matchTime)+'</span>' : '')
      + '</div>'
      + '<div class="pred-teams">'
      + '<div class="pred-team">'+clubBadge(hp.club,m.league,30)+'<div class="pred-name">'+esc(hp.username)+'</div><div style="font-size:.6rem;color:var(--dim)">#'+hPos+'</div></div>'
      + '<div class="pred-vs">vs</div>'
      + '<div class="pred-team">'+clubBadge(ap.club,m.league,30)+'<div class="pred-name">'+esc(ap.username)+'</div><div style="font-size:.6rem;color:var(--dim)">#'+aPos+'</div></div>'
      + '</div>'
      + (myProfile
        ? '<button class="btn-xs gold" style="width:100%;padding:.45rem;margin-top:.5rem" onclick="_openPredictModal(\''+m.homeId+'\',\''+m.awayId+'\',\''+m.league+'\',\''+m.id+'\')">🎯 Predict Score</button>'
        : '<div style="font-size:.7rem;color:var(--dim);text-align:center;margin-top:.5rem">Login to predict</div>')
      + '</div>';
  });

  pg.innerHTML = html;
}

function renderMyPredictions() {} // stub — full version in features.js
function renderPredLeaderboard() {} // stub
