// ============================================================
// ADMIN.JS — Reports, Users, Matches, Penalties, Season
// ============================================================

function loadAdmin() {
  var pg = $('page-admin'); if (!pg) return;
  if (!me || me.email !== ADMIN_EMAIL) {
    pg.innerHTML = '<div class="card empty" style="margin-top:1rem">Admin access only.</div>'; return;
  }
  pg.innerHTML =
    '<div class="section-header"><div class="section-title c-cyan">Admin Panel</div><div class="section-line"></div></div>'
    + '<div class="admin-tabs">'
    + '<button class="atab active" onclick="aTab(\'reports\',this)">Reports</button>'
    + '<button class="atab" onclick="aTab(\'users\',this)">Users</button>'
    + '<button class="atab" onclick="aTab(\'matches\',this)">Matches</button>'
    + '<button class="atab" onclick="aTab(\'penalties\',this)">Penalties</button>'
    + '<button class="atab" onclick="aTab(\'season\',this)">Season</button>'
    + '</div>'
    + '<div class="apanel active" id="ap-reports"><div id="rep-list"><div class="msng-loading">Loading...</div></div></div>'
    + '<div class="apanel" id="ap-users"><div id="admin-users-list"></div></div>'
    + '<div class="apanel" id="ap-matches"><div id="admin-matches-list"></div></div>'
    + '<div class="apanel" id="ap-penalties"><div id="pen-list"></div></div>'
    + '<div class="apanel" id="ap-season"></div>';

  loadAdminReports();
}

function aTab(name, btn) {
  document.querySelectorAll('.atab').forEach(function (b) { b.classList.remove('active'); });
  document.querySelectorAll('.apanel').forEach(function (p) { p.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var panel = $('ap-' + name); if (panel) panel.classList.add('active');
  if (name === 'reports')   loadAdminReports();
  if (name === 'users')     loadAdminUsers();
  if (name === 'matches')   loadAdminMatches();
  if (name === 'penalties') renderPenaltyLog();
  if (name === 'season')    renderAdminSeason();
}

// ── REPORTS ───────────────────────────────────────────────────
function loadAdminReports() {
  var el = $('rep-list'); if (!el || !db) return;
  db.ref(DB.reports).orderByChild('ts').limitToLast(50).once('value', function (s) {
    var reps = Object.entries(s.val() || {}).sort(function (a, b) { return (b[1].ts || 0) - (a[1].ts || 0); });
    if (!reps.length) { el.innerHTML = '<div class="card empty">No reports yet.</div>'; return; }
    el.innerHTML = reps.map(function (kv) {
      var key = kv[0], r = kv[1];
      var done    = r.status === 'resolved';
      var isFraud = r.reason === 'Match result fraud';
      return '<div class="admin-card' + (done ? ' done' : '') + '" style="' + (isFraud && !done ? 'border-left:3px solid #ff6600;' : '') + '">'
        + '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.35rem;margin-bottom:.35rem">'
        + (isFraud ? '<span class="fx-badge warn">FRAUD</span>' : '')
        + '<span style="font-weight:700;color:var(--cyan)">' + esc(r.reportedName || '') + '</span>'
        + '<span style="font-size:.65rem;color:var(--dim)">reported by ' + esc(r.reporterName || '') + '</span>'
        + '<span style="font-size:.6rem;color:var(--dim)">' + fmtFull(r.ts) + '</span>'
        + '</div>'
        + '<div style="font-size:.76rem;margin-bottom:.35rem"><strong>Reason:</strong> ' + esc(r.reason || '') + '</div>'
        + (r.details ? '<div style="font-size:.72rem;color:var(--dim);margin-bottom:.4rem">' + esc(r.details) + '</div>' : '')
        + (!done ? '<div style="display:flex;gap:.4rem;flex-wrap:wrap">'
          + '<button class="btn-xs" onclick="resolveReport(\'' + key + '\')">Resolve</button>'
          + '<button class="btn-xs gold" onclick="openDeductModal(\'' + key + '\',\'' + r.reportedUID + '\',\'' + esc(r.reportedName || '') + '\')">Deduct Pts</button>'
          + '<button class="btn-xs" style="color:var(--pink);border-color:rgba(255,40,130,0.3)" onclick="banUser(\'' + r.reportedUID + '\',\'' + esc(r.reportedName || '') + '\')">Ban</button>'
          + '<button class="btn-xs" style="color:var(--dim)" onclick="deleteReport(\'' + key + '\')">Delete</button>'
          + '</div>' : '<div style="font-size:.68rem;color:var(--green)">Resolved</div>')
        + '</div>';
    }).join('');
  });
}

function resolveReport(key) { db.ref(DB.reports + '/' + key).update({ status:'resolved', resolvedAt:Date.now() }).then(function () { toast('Resolved.'); loadAdminReports(); }); }
function deleteReport(key)  { if (!confirm('Delete report?')) return; db.ref(DB.reports + '/' + key).remove().then(function () { toast('Deleted.'); loadAdminReports(); }); }
function banUser(uid, name) {
  if (!confirm('Ban ' + name + '? They will not be able to play.')) return;
  db.ref(DB.players + '/' + uid).update({ banned:true }).then(function () { toast(name + ' banned.'); loadAdminUsers(); });
}
function unbanUser(uid, name) {
  db.ref(DB.players + '/' + uid).update({ banned:false }).then(function () { toast(name + ' unbanned.'); loadAdminUsers(); });
}

// ── USERS ─────────────────────────────────────────────────────
function loadAdminUsers() {
  var el = $('admin-users-list'); if (!el) return;
  var players = Object.values(allPlayers).sort(function (a, b) { return (a.username || '').localeCompare(b.username || ''); });
  if (!players.length) { el.innerHTML = '<div class="card empty">No players yet.</div>'; return; }
  el.innerHTML = players.map(function (p) {
    var lg = LGS[p.league] || {};
    return '<div class="admin-card' + (p.banned ? ' banned' : '') + '">'
      + '<div style="display:flex;align-items:center;gap:.55rem;margin-bottom:.4rem">'
      + clubBadge(p.club, p.league, 28)
      + '<div style="flex:1"><div style="font-weight:700;font-size:.82rem">' + esc(p.username || '') + (p.banned ? ' <span style="color:var(--pink);font-size:.65rem">[BANNED]</span>' : '') + '</div>'
      + '<div style="font-size:.62rem;color:' + lg.c + '">' + esc(lg.short || '') + ' · ' + esc(p.club || '') + '</div>'
      + '<div style="font-size:.6rem;color:var(--dim)">' + esc(p.email || '') + ' · ' + esc(p.country || '') + '</div>'
      + '</div></div>'
      + '<div style="display:flex;gap:.35rem;flex-wrap:wrap">'
      + (p.banned
        ? '<button class="btn-xs" onclick="unbanUser(\'' + p.uid + '\',\'' + esc(p.username) + '\')">Unban</button>'
        : '<button class="btn-xs" style="color:var(--pink);border-color:rgba(255,40,130,0.3)" onclick="banUser(\'' + p.uid + '\',\'' + esc(p.username) + '\')">Ban</button>')
      + '<button class="btn-xs gold" onclick="openDeductModal(\'\',\'' + p.uid + '\',\'' + esc(p.username) + '\')">Deduct Pts</button>'
      + '<button class="btn-xs" onclick="openRestrictModal(\'' + p.uid + '\',\'' + esc(p.username) + '\')">Restrict</button>'
      + '<button class="btn-xs" style="color:var(--pink);border-color:rgba(255,40,130,0.3)" onclick="removeUser(\'' + p.uid + '\',\'' + esc(p.username) + '\')">Remove</button>'
      + '</div></div>';
  }).join('');
}

function removeUser(uid, name) {
  if (!confirm('Permanently remove ' + name + '? This cannot be undone.')) return;
  db.ref(DB.players + '/' + uid).remove().then(function () { toast(name + ' removed.'); });
}

// ── MATCHES ───────────────────────────────────────────────────
function loadAdminMatches() {
  var el = $('admin-matches-list'); if (!el) return;
  var ms = Object.values(allMatches).sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); }).slice(0, 30);
  if (!ms.length) { el.innerHTML = '<div class="card empty">No matches yet.</div>'; return; }
  el.innerHTML = ms.map(function (m) {
    var hp = allPlayers[m.homeId], ap = allPlayers[m.awayId]; if (!hp || !ap) return '';
    var lg = LGS[m.league] || {};
    return '<div class="admin-card">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.35rem">'
      + '<div style="font-size:.78rem;font-weight:700">' + esc(hp.username) + ' vs ' + esc(ap.username) + '</div>'
      + '<span class="lg-badge" style="background:' + lg.bg + ';color:' + lg.c + ';border:1px solid ' + lg.c + '44">' + esc(lg.short || '') + '</span>'
      + '</div>'
      + (m.played ? '<div style="font-family:Orbitron,sans-serif;font-size:.88rem;font-weight:900;color:var(--green)">' + m.hg + '-' + m.ag + ' FT</div>' : '<div style="font-size:.7rem;color:var(--dim)">' + (m.matchTime ? fmtFull(m.matchTime) : 'Unscheduled') + '</div>')
      + (m.pendingResult && !m.played ? '<div style="font-size:.7rem;color:var(--gold);margin-top:.25rem">Pending referee review</div>' : '')
      + (m.played ? '' : '<div style="display:flex;gap:.35rem;margin-top:.4rem">'
        + '<button class="btn-xs" onclick="adminApproveResult(\'' + m.id + '\')">Approve</button>'
        + '<button class="btn-xs" style="color:var(--pink);border-color:rgba(255,40,130,0.3)" onclick="adminDeleteMatch(\'' + m.id + '\')">Delete</button>'
        + '</div>')
      + '</div>';
  }).join('');
}

function adminApproveResult(mid) {
  var m = allMatches[mid]; if (!m || !db) return;
  if (!m.pendingResult) { toast('No pending result to approve.', 'error'); return; }
  db.ref(DB.matches + '/' + mid).update({
    played:true, hg:m.pendingHg||0, ag:m.pendingAg||0,
    playedAt:Date.now(), pendingResult:false, refStatus:'admin_approved'
  }).then(function () { toast('Result approved!'); loadAdminMatches(); });
}

function adminDeleteMatch(mid) {
  if (!confirm('Delete this fixture?')) return;
  db.ref(DB.matches + '/' + mid).remove().then(function () { toast('Match deleted.'); loadAdminMatches(); });
}

// ── POINT DEDUCTIONS ──────────────────────────────────────────
function openDeductModal(repKey, uid, name) {
  $('ded-rep-key').value = repKey || '';
  $('ded-uid').value     = uid;
  $('ded-name').value    = name;
  $('ded-player').textContent = name;
  $('ded-pts').value     = '3';
  $('ded-note').value    = '';
  $('ded-err').textContent = '';
  openMo('deduct-mo');
}

function applyDeduction() {
  var uid  = $('ded-uid').value;
  var name = $('ded-name').value;
  var pts  = parseInt($('ded-pts').value);
  var note = $('ded-note').value.trim();
  var err  = $('ded-err'); err.textContent = '';
  if (!uid)    { err.textContent = 'No player selected.'; return; }
  if (isNaN(pts) || pts < 1) { err.textContent = 'Enter a valid number.'; return; }
  if (!note)   { err.textContent = 'Give a reason.'; return; }
  if (!db)     return;

  var btn = $('ded-btn'); btn.textContent = 'Applying...'; btn.disabled = true;
  db.ref(DB.penalties + '/' + uid).push({ pts:pts, reason:note, by:myProfile.uid, at:Date.now() })
    .then(function () {
      // Resolve linked report if any
      var repKey = $('ded-rep-key').value;
      if (repKey) db.ref(DB.reports + '/' + repKey).update({ status:'resolved' });
      closeMo('deduct-mo');
      toast(pts + ' points deducted from ' + name);
      sendNotif(uid, { title:'Point Deduction', body:pts + ' points deducted: ' + note, icon:'warning' });
      btn.textContent = 'Apply Deduction'; btn.disabled = false;
      renderPenaltyLog();
    }).catch(function () {
      err.textContent = 'Failed. Try again.';
      btn.textContent = 'Apply Deduction'; btn.disabled = false;
    });
}

function renderPenaltyLog() {
  var el = $('pen-list'); if (!el) return;
  var all = [];
  Object.entries(allPenalties || {}).forEach(function (kv) {
    var uid = kv[0];
    var p   = allPlayers[uid];
    Object.entries(kv[1] || {}).forEach(function (pv) {
      all.push(Object.assign({ uid:uid, pname:(p?p.username:uid), key:pv[0] }, pv[1]));
    });
  });
  all.sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
  if (!all.length) { el.innerHTML = '<div class="card empty">No penalties issued yet.</div>'; return; }
  el.innerHTML = all.map(function (pen) {
    return '<div class="admin-card">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem">'
      + '<span style="font-weight:700;color:var(--pink)">' + esc(pen.pname) + '</span>'
      + '<span style="font-family:Orbitron,sans-serif;font-size:.82rem;color:var(--pink)">-' + pen.pts + ' pts</span>'
      + '</div>'
      + '<div style="font-size:.72rem;color:var(--dim);margin-bottom:.3rem">' + esc(pen.reason || '') + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center">'
      + '<span style="font-size:.62rem;color:var(--dim)">' + fmtFull(pen.at) + '</span>'
      + '<button class="btn-xs" onclick="revokePenalty(\'' + pen.uid + '\',\'' + pen.key + '\')">Revoke</button>'
      + '</div></div>';
  }).join('');
}

function revokePenalty(uid, key) {
  if (!confirm('Revoke this penalty?')) return;
  db.ref(DB.penalties + '/' + uid + '/' + key).remove()
    .then(function () { toast('Penalty revoked.'); renderPenaltyLog(); });
}

// ── SEASON ────────────────────────────────────────────────────
function renderAdminSeason() {
  var el = $('ap-season'); if (!el) return;
  el.innerHTML = adminSeasonControls()
    + '<div style="background:rgba(255,0,110,0.05);border:1px solid rgba(255,0,110,0.15);border-radius:12px;padding:.9rem;margin-top:.8rem">'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--pink);letter-spacing:1.5px;margin-bottom:.6rem">DANGER ZONE</div>'
    + '<button class="btn-danger" style="font-size:.74rem;padding:7px 14px" onclick="seasonReset()">Reset All Match Data</button>'
    + '<div style="font-size:.63rem;color:var(--dim);margin-top:.4rem">Clears all results. Player accounts stay.</div>'
    + '</div>'
    + '<div style="margin-top:.9rem"><button class="btn-primary" onclick="openMo(\'broadcast-mo\')">Send Broadcast</button></div>';
}

// ── RESTRICT PLAYER ───────────────────────────────────────────
function openRestrictModal(uid, name) {
  var el = $('restrict-modal-content'); if (!el) return;
  var p  = allPlayers[uid] || {};
  var rs = p.restrictions || {};
  el.innerHTML = '<div style="font-weight:700;color:var(--cyan);margin-bottom:.7rem">' + esc(name) + '</div>'
    + ['no_submit', 'no_dispute', 'no_chat'].map(function (type) {
      var active = rs[type] && (!rs[type].until || Date.now() < rs[type].until);
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid var(--border)">'
        + '<div><div style="font-size:.78rem;font-weight:600">' + esc(type.replace('_', ' ')) + '</div>'
        + '<div style="font-size:.62rem;color:var(--dim)">' + (active ? 'Active' : 'Not restricted') + '</div></div>'
        + (active
          ? '<button class="btn-xs" onclick="removeRestriction(\'' + uid + '\',\'' + type + '\');openRestrictModal(\'' + uid + '\',\'' + esc(name) + '\')">Remove</button>'
          : '<button class="btn-xs gold" onclick="applyRestriction(\'' + uid + '\',\'' + type + '\',7);toast(\'' + type + ' restricted for 7 days\');openRestrictModal(\'' + uid + '\',\'' + esc(name) + '\')">7 days</button>')
        + '</div>';
    }).join('');
  openMo('restrict-mo');
}
