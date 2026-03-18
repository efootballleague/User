// ============================================================
// ADMIN.JS — Full Admin Control
// Tabs: Reports | Users | Matches | Penalties | Season | Polls
// Season tab: per-league controls + SEASON RESTART (red warning)
// Admin league: admin always sees all 4 leagues
// Admin polls: admin can create polls visible to all users
// ============================================================

function loadAdmin() {
  var pg = $('page-admin'); if (!pg) return;
  if (!me || me.email !== ADMIN_EMAIL) {
    pg.innerHTML = '<div class="card empty" style="margin-top:1rem">Admin access only.</div>'; return;
  }
  pg.innerHTML =
    '<div class="section-header"><div class="section-title c-cyan">🛡 Admin Panel</div><div class="section-line"></div></div>'
    + '<div class="admin-tabs" style="overflow-x:auto;white-space:nowrap;padding-bottom:2px">'
    + '<button class="atab active" onclick="aTab(\'reports\',this)">Reports</button>'
    + '<button class="atab" onclick="aTab(\'users\',this)">Users</button>'
    + '<button class="atab" onclick="aTab(\'matches\',this)">Matches</button>'
    + '<button class="atab" onclick="aTab(\'penalties\',this)">Penalties</button>'
    + '<button class="atab" onclick="aTab(\'season\',this)">Season</button>'
    + '<button class="atab" onclick="aTab(\'polls\',this)">Polls</button>'
    + '</div>'
    + '<div class="apanel active" id="ap-reports"><div id="rep-list"><div class="card empty">Loading...</div></div></div>'
    + '<div class="apanel" id="ap-users"><div id="admin-users-list"></div></div>'
    + '<div class="apanel" id="ap-matches"><div id="admin-matches-list"></div></div>'
    + '<div class="apanel" id="ap-penalties"><div id="pen-list"></div></div>'
    + '<div class="apanel" id="ap-season"></div>'
    + '<div class="apanel" id="ap-polls"><div id="admin-polls-wrap"></div></div>';

  loadAdminReports();
}

function aTab(name, btn) {
  document.querySelectorAll('.atab').forEach(function(b){ b.classList.remove('active'); });
  document.querySelectorAll('.apanel').forEach(function(p){ p.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var panel = $('ap-' + name); if (panel) panel.classList.add('active');
  if (name === 'reports')   loadAdminReports();
  if (name === 'users')     loadAdminUsers();
  if (name === 'matches')   loadAdminMatches();
  if (name === 'penalties') renderPenaltyLog();
  if (name === 'season')    renderAdminSeason();
  if (name === 'polls')     renderAdminPolls();
}

// ── REPORTS ──────────────────────────────────────────────────
function loadAdminReports() {
  var el = $('rep-list'); if (!el || !db) return;
  db.ref(DB.reports).orderByChild('ts').limitToLast(50).once('value', function(s) {
    var reps = Object.entries(s.val() || {}).sort(function(a,b){ return (b[1].ts||0)-(a[1].ts||0); });
    if (!reps.length) { el.innerHTML = '<div class="card empty">No reports yet.</div>'; return; }
    el.innerHTML = reps.map(function(kv) {
      var key = kv[0], r = kv[1];
      var done = r.status === 'resolved';
      var isFraud = r.reason === 'Match result fraud';
      return '<div class="admin-card' + (done?' done':'') + '" style="' + (isFraud&&!done?'border-left:3px solid #ff6600;':'') + '">'
        + '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.35rem;margin-bottom:.35rem">'
        + (isFraud?'<span class="fx-badge warn">FRAUD</span>':'')
        + '<span style="font-weight:700;color:var(--cyan)">' + esc(r.reportedName||'') + '</span>'
        + '<span style="font-size:.65rem;color:var(--dim)">by ' + esc(r.reporterName||'') + '</span>'
        + '<span style="font-size:.6rem;color:var(--dim)">' + fmtFull(r.ts) + '</span>'
        + '</div>'
        + '<div style="font-size:.76rem;margin-bottom:.35rem"><strong>Reason:</strong> ' + esc(r.reason||'') + '</div>'
        + (r.details?'<div style="font-size:.72rem;color:var(--dim);margin-bottom:.4rem">'+esc(r.details)+'</div>':'')
        + (!done
          ? '<div style="display:flex;gap:.4rem;flex-wrap:wrap">'
            + '<button class="btn-xs" onclick="resolveReport(\''+key+'\')">Resolve</button>'
            + '<button class="btn-xs gold" onclick="openDeductModal(\''+key+'\',\''+r.reportedUID+'\',\''+esc(r.reportedName||'')+'\')">Deduct Pts</button>'
            + '<button class="btn-xs" style="color:var(--pink);border-color:rgba(255,40,130,0.3)" onclick="banUser(\''+r.reportedUID+'\',\''+esc(r.reportedName||'')+'\')">Ban</button>'
            + '<button class="btn-xs" style="color:var(--dim)" onclick="deleteReport(\''+key+'\')">Delete</button>'
            + '</div>'
          : '<div style="font-size:.68rem;color:var(--green)">✓ Resolved</div>')
        + '</div>';
    }).join('');
  });
}

function resolveReport(key){ db.ref(DB.reports+'/'+key).update({status:'resolved',resolvedAt:Date.now()}).then(function(){toast('Resolved.');loadAdminReports();}); }
function deleteReport(key){ if(!confirm('Delete report?'))return; db.ref(DB.reports+'/'+key).remove().then(function(){toast('Deleted.');loadAdminReports();}); }
function banUser(uid,name){
  if(!confirm('Ban '+name+'?'))return;
  db.ref(DB.players+'/'+uid).update({banned:true}).then(function(){toast(name+' banned.');loadAdminUsers();});
}
function unbanUser(uid,name){
  db.ref(DB.players+'/'+uid).update({banned:false}).then(function(){toast(name+' unbanned.');loadAdminUsers();});
}

// ── USERS ─────────────────────────────────────────────────────
function loadAdminUsers() {
  var el = $('admin-users-list'); if (!el) return;
  // Group by league
  var leagues = ['epl','laliga','seriea','ligue1'];
  var html = '';
  leagues.forEach(function(lid) {
    var lg = LGS[lid]||{};
    var players = Object.values(allPlayers).filter(function(p){ return p.league===lid; })
      .sort(function(a,b){ return (a.username||'').localeCompare(b.username||''); });
    if (!players.length) return;
    html += '<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:'+lg.c+';letter-spacing:1.5px;margin:.9rem 0 .4rem">'+lg.f+' '+lg.n.toUpperCase()+' ('+players.length+')</div>';
    html += players.map(function(p) {
      return '<div class="admin-card'+(p.banned?' banned':'')+'">'
        + '<div style="display:flex;align-items:center;gap:.55rem;margin-bottom:.45rem">'
        + clubBadge(p.club,p.league,30)
        + '<div style="flex:1">'
        + '<div style="font-weight:700;font-size:.84rem;cursor:pointer" onclick="openUserModal(\''+p.uid+'\')">'
        + esc(p.username||'')+(p.banned?' <span style="color:var(--pink);font-size:.6rem">[BANNED]</span>':'')
        + '</div>'
        + '<div style="font-size:.6rem;color:'+lg.c+'">'+esc(lg.short||'')+' · '+esc(p.club||'')+'</div>'
        + '<div style="font-size:.58rem;color:var(--dim)">'+esc(p.email||'')+' · '+esc(p.country||'')+'</div>'
        + '<div style="font-size:.56rem;color:var(--dim)">Last: '+fmtAgo(p.lastSeen)+'</div>'
        + '</div></div>'
        + '<div style="display:flex;gap:.3rem;flex-wrap:wrap">'
        + (p.banned
          ? '<button class="btn-xs" onclick="unbanUser(\''+p.uid+'\',\''+esc(p.username)+'\')">✓ Unban</button>'
          : '<button class="btn-xs" style="color:var(--pink);border-color:rgba(255,40,130,0.3)" onclick="banUser(\''+p.uid+'\',\''+esc(p.username)+'\')">Ban</button>')
        + '<button class="btn-xs gold" onclick="openDeductModal(\'\',\''+p.uid+'\',\''+esc(p.username)+'\')">Deduct Pts</button>'
        + '<button class="btn-xs" onclick="openRestrictModal(\''+p.uid+'\',\''+esc(p.username)+'\')">Restrict</button>'
        + '<button class="btn-xs" onclick="adminEditUser(\''+p.uid+'\')">Edit</button>'
        + '<button class="btn-xs" style="color:var(--pink);border-color:rgba(255,40,130,0.3)" onclick="removeUser(\''+p.uid+'\',\''+esc(p.username)+'\')">Remove</button>'
        + '</div></div>';
    }).join('');
  });
  if (!html) html = '<div class="card empty">No players yet.</div>';
  el.innerHTML = html;
}

function removeUser(uid,name){
  if(!confirm('Permanently remove '+name+'? This cannot be undone.'))return;
  db.ref(DB.players+'/'+uid).remove().then(function(){toast(name+' removed.');});
}

// Admin can edit username, league, and club for any user
function adminEditUser(uid) {
  var p = allPlayers[uid]; if (!p) return;

  // Build a simple edit UI in the restrict modal (reuse it)
  var el = $('restrict-modal-content'); if (!el) return;

  // Build club options for current league
  var takenClubs = Object.values(allPlayers)
    .filter(function(q){ return q.league===p.league && q.uid!==uid; })
    .map(function(q){ return q.club; });

  var leagueOpts = ['epl','laliga','seriea','ligue1'].map(function(lid){
    var lg=LGS[lid]||{};
    return '<option value="'+lid+'"'+(p.league===lid?' selected':'')+'>'+esc(lg.n||lid)+'</option>';
  }).join('');

  var clubOpts = (ALL_CLUBS[p.league]||[]).map(function(c){
    var isTaken = takenClubs.includes(c.name) && c.name !== p.club;
    return '<option value="'+esc(c.name)+'"'+(c.name===p.club?' selected':'')+(isTaken?' disabled':'')+'>'+esc(c.name)+(isTaken?' (taken)':'')+'</option>';
  }).join('');

  el.innerHTML = '<div style="font-weight:700;color:var(--cyan);margin-bottom:.6rem">Edit: '+esc(p.username)+'</div>'
    +'<div class="form-group"><label class="lbl">Username</label><input class="inp" id="edit-u-name" value="'+esc(p.username)+'" maxlength="20"></div>'
    +'<div class="form-group"><label class="lbl">League</label><select class="inp" id="edit-u-league" onchange="adminEditLeagueChanged(''+uid+'')">'+leagueOpts+'</select></div>'
    +'<div class="form-group"><label class="lbl">Club</label><select class="inp" id="edit-u-club">'+clubOpts+'</select></div>'
    +'<div class="errmsg" id="edit-u-err"></div>'
    +'<div style="display:flex;gap:.4rem;margin-top:.6rem">'
    +'<button class="btn-secondary" onclick="closeMo('restrict-mo')">Cancel</button>'
    +'<button class="btn-primary" style="flex:1" onclick="adminSaveUserEdit(''+uid+'')">Save Changes</button>'
    +'</div>';

  openMo('restrict-mo');
}

function adminEditLeagueChanged(uid) {
  var lid = $('edit-u-league').value;
  var p = allPlayers[uid];
  var takenClubs = Object.values(allPlayers)
    .filter(function(q){ return q.league===lid && q.uid!==uid; })
    .map(function(q){ return q.club; });
  var clubSel = $('edit-u-club');
  if (!clubSel) return;
  clubSel.innerHTML = (ALL_CLUBS[lid]||[]).map(function(c){
    var isTaken = takenClubs.includes(c.name);
    return '<option value="'+esc(c.name)+'"'+(isTaken?' disabled':'')+'>'+esc(c.name)+(isTaken?' (taken)':'')+'</option>';
  }).join('');
}

function adminSaveUserEdit(uid) {
  var p = allPlayers[uid]; if (!p) return;
  var newName  = $('edit-u-name').value.trim();
  var newLeague= $('edit-u-league').value;
  var newClub  = $('edit-u-club').value;
  var err = $('edit-u-err'); err.textContent='';
  if (!newName) { err.textContent='Username required.'; return; }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(newName) && newName !== p.username) { err.textContent='Username: 3-20 chars, letters/numbers/underscore.'; return; }
  // Check username not taken by someone else
  var taken = Object.values(allPlayers).some(function(q){ return q.uid!==uid && q.username && q.username.toLowerCase()===newName.toLowerCase(); });
  if (taken) { err.textContent='Username already taken.'; return; }
  // Check club not taken by someone else in target league
  var clubTaken = Object.values(allPlayers).some(function(q){ return q.uid!==uid && q.league===newLeague && q.club===newClub; });
  if (clubTaken) { err.textContent='That club is already taken in '+( LGS[newLeague]||{}).n+'.'; return; }
  var updates = {};
  updates[DB.players+'/'+uid+'/username'] = newName;
  updates[DB.players+'/'+uid+'/league']   = newLeague;
  updates[DB.players+'/'+uid+'/club']     = newClub;
  db.ref().update(updates).then(function(){
    closeMo('restrict-mo');
    toast('Player updated: '+newName+' · '+newClub+' ('+( LGS[newLeague]||{}).n+')');
    loadAdminUsers();
  }).catch(function(e){ err.textContent='Failed: '+e.message; });
}

// ── MATCHES ──────────────────────────────────────────────────
function loadAdminMatches() {
  var el = $('admin-matches-list'); if (!el) return;
  // Show filter by league
  var lid = el.getAttribute('data-lid') || 'all';
  var ms = Object.values(allMatches)
    .filter(function(m){ return lid==='all'||m.league===lid; })
    .sort(function(a,b){ return (b.createdAt||0)-(a.createdAt||0); })
    .slice(0,60);

  var filterHtml = '<div style="display:flex;gap:.35rem;margin-bottom:.6rem;overflow-x:auto">'
    + ['all','epl','laliga','seriea','ligue1'].map(function(l){
        var lg = LGS[l]||{};
        return '<button class="ftab'+(lid===l?' active':'')+'" onclick="adminMatchFilter(\''+l+'\')">'+(l==='all'?'All':(lg.short||l))+'</button>';
      }).join('')
    + '</div>';

  if (!ms.length) { el.innerHTML = filterHtml+'<div class="card empty">No matches.</div>'; return; }
  el.innerHTML = filterHtml + ms.map(function(m) {
    var hp = allPlayers[m.homeId], ap = allPlayers[m.awayId]; if (!hp||!ap) return '';
    var lg = LGS[m.league]||{};
    var mdLabel = m.matchDay ? 'MD'+m.matchDay+' · ' : '';
    return '<div class="admin-card">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.3rem">'
      + '<div style="font-size:.78rem;font-weight:700">'+esc(hp.username)+' vs '+esc(ap.username)+'</div>'
      + '<span class="lg-badge" style="background:'+lg.bg+';color:'+lg.c+';border:1px solid '+lg.c+'44">'+esc(lg.short||'')+'</span>'
      + '</div>'
      + '<div style="font-size:.62rem;color:var(--dim);margin-bottom:.3rem">'+mdLabel+(m.played?'FT: '+m.hg+'-'+m.ag:(m.matchTime?fmtFull(m.matchTime):'Unscheduled'))+(m.refereeName?' · Ref: '+esc(m.refereeName):'')+(m.postponed?' · <span style="color:#ff6b00">POSTPONED</span>':'')+'</div>'
      + (m.pendingResult&&!m.played?'<div style="font-size:.68rem;color:var(--gold);margin-bottom:.3rem">⏳ Pending review</div>':'')
      + '<div style="display:flex;gap:.3rem;flex-wrap:wrap">'
      + (!m.played?'<button class="btn-xs" onclick="adminApproveResult(\''+m.id+'\')">Approve</button>':'')
      + (!m.played?'<button class="btn-xs" onclick="adminForceResult(\''+m.id+'\')">Force Result</button>':'')
      + '<button class="btn-xs" onclick="adminRescheduleMatch(\''+m.id+'\')">Reschedule</button>'
      + (!m.played&&!m.postponed?'<button class="btn-xs" style="color:#ff6b00;border-color:rgba(255,107,0,0.3)" onclick="adminPostponeMatch(\''+m.id+'\')">Postpone</button>':'')
      + (m.postponed?'<button class="btn-xs" onclick="undoPostpone(\''+m.id+'\')">Undo Postpone</button>':'')
      + '<button class="btn-xs" style="color:var(--pink);border-color:rgba(255,40,130,0.3)" onclick="adminDeleteMatch(\''+m.id+'\')">Delete</button>'
      + '</div></div>';
  }).join('');
}

function adminMatchFilter(lid) {
  var el = $('admin-matches-list'); if (!el) return;
  el.setAttribute('data-lid', lid);
  loadAdminMatches();
}

function adminApproveResult(mid){
  var m=allMatches[mid]; if(!m||!db) return;
  if(!m.pendingResult){ toast('No pending result.','error'); return; }
  db.ref(DB.matches+'/'+mid).update({played:true,hg:m.pendingHg||0,ag:m.pendingAg||0,playedAt:Date.now(),pendingResult:false,refStatus:'admin_approved'})
    .then(function(){ toast('Result approved!'); loadAdminMatches(); if(typeof checkSeasonEnd==='function')checkSeasonEnd(); });
}

function adminDeleteMatch(mid){
  if(!confirm('Delete this fixture?'))return;
  db.ref(DB.matches+'/'+mid).remove().then(function(){ toast('Match deleted.'); loadAdminMatches(); });
}

function adminForceResult(mid) {
  var hg = prompt('Home goals:','0'); if (hg===null) return;
  var ag = prompt('Away goals:','0'); if (ag===null) return;
  hg = parseInt(hg)||0; ag = parseInt(ag)||0;
  db.ref(DB.matches+'/'+mid).update({played:true,hg:hg,ag:ag,playedAt:Date.now(),pendingResult:false,refStatus:'admin_forced'})
    .then(function(){ toast('Result forced: '+hg+'-'+ag); loadAdminMatches(); if(typeof checkSeasonEnd==='function')checkSeasonEnd(); });
}

function adminRescheduleMatch(mid) {
  if (typeof openUserPostpone === 'function') { _postponeIsAdmin=true; openUserPostpone(mid); }
}

// ── POINT DEDUCTIONS ─────────────────────────────────────────
function openDeductModal(repKey, uid, name) {
  $('ded-rep-key').value = repKey||'';
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
  var err  = $('ded-err');
  err.textContent = '';
  if (!uid)           { err.textContent = 'No player.'; return; }
  if (isNaN(pts)||pts<1){ err.textContent = 'Enter valid points.'; return; }
  if (!note)          { err.textContent = 'Reason required.'; return; }
  if (!db)            { err.textContent = 'DB not ready.'; return; }
  var btn = $('ded-btn'); btn.textContent='Applying...'; btn.disabled=true;
  db.ref(DB.penalties+'/'+uid).push({ pts:pts, reason:note, at:Date.now(), by: me.uid })
    .then(function(){
      var repKey = $('ded-rep-key').value;
      if (repKey) db.ref(DB.reports+'/'+repKey).update({status:'resolved',resolvedAt:Date.now()});
      closeMo('deduct-mo');
      toast(pts+' points deducted from '+name);
      sendNotif(uid,{title:'Point Deduction',body:pts+' points deducted: '+note,icon:'warning',type:'deduction'});
      btn.textContent='Apply Deduction'; btn.disabled=false;
      renderPenaltyLog();
    }).catch(function(){
      err.textContent='Failed. Try again.';
      btn.textContent='Apply Deduction'; btn.disabled=false;
    });
}

function renderPenaltyLog() {
  var el = $('pen-list'); if (!el) return;
  var all = [];
  Object.entries(allPenalties||{}).forEach(function(kv){
    var uid=kv[0], p=allPlayers[uid];
    Object.entries(kv[1]||{}).forEach(function(pv){
      all.push(Object.assign({uid:uid,pname:(p?p.username:uid),key:pv[0]},pv[1]));
    });
  });
  all.sort(function(a,b){ return (b.at||0)-(a.at||0); });
  if (!all.length){ el.innerHTML='<div class="card empty">No penalties issued yet.</div>'; return; }
  el.innerHTML = all.map(function(pen){
    return '<div class="admin-card">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.3rem">'
      +'<span style="font-weight:700;color:var(--pink)">'+esc(pen.pname)+'</span>'
      +'<span style="font-family:Orbitron,sans-serif;font-size:.82rem;color:var(--pink)">-'+pen.pts+' pts</span>'
      +'</div>'
      +'<div style="font-size:.72rem;color:var(--dim);margin-bottom:.3rem">'+esc(pen.reason||'')+'</div>'
      +'<div style="display:flex;justify-content:space-between;align-items:center">'
      +'<span style="font-size:.6rem;color:var(--dim)">'+fmtFull(pen.at)+'</span>'
      +'<button class="btn-xs" onclick="revokePenalty(\''+pen.uid+'\',\''+pen.key+'\')">Revoke</button>'
      +'</div></div>';
  }).join('');
}

function revokePenalty(uid,key){
  if(!confirm('Revoke this penalty?'))return;
  db.ref(DB.penalties+'/'+uid+'/'+key).remove().then(function(){ toast('Penalty revoked.'); renderPenaltyLog(); });
}

// ── RESTRICT MODAL ────────────────────────────────────────────
function openRestrictModal(uid, name) {
  var el = $('restrict-modal-content'); if (!el) return;
  var p  = allPlayers[uid]||{};
  var rs = p.restrictions||{};
  el.innerHTML = '<div style="font-weight:700;color:var(--cyan);margin-bottom:.6rem">'+esc(name)+'</div>'
    + '<div style="font-size:.74rem;margin-bottom:.7rem;color:var(--dim)">Active restrictions:</div>'
    + ['no_submit','no_report','no_chat'].map(function(type){
        var label = {no_submit:'Block Score Submit',no_report:'Block Reporting',no_chat:'Mute Chat'}[type];
        var active = rs[type] && (!rs[type].until || Date.now() < rs[type].until);
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid var(--border)">'
          +'<span style="font-size:.78rem">'+label+'</span>'
          +'<div style="display:flex;gap:.35rem">'
          +(!active?'<button class="btn-xs" style="color:var(--pink);border-color:rgba(255,40,130,0.3)" onclick="applyRestriction(\''+uid+'\',\''+type+'\',7)">7d</button>':'')
          +(active?'<button class="btn-xs" onclick="removeRestriction(\''+uid+'\',\''+type+'\')">Remove</button>':'')
          +'</div></div>';
      }).join('')
    + '<button class="btn-secondary" style="margin-top:.8rem;width:100%" onclick="closeMo(\'restrict-mo\')">Close</button>';
  openMo('restrict-mo');
}

// ── SEASON PANEL ─────────────────────────────────────────────
function renderAdminSeason() {
  var el = $('ap-season'); if (!el) return;
  var leagues = ['epl','laliga','seriea','ligue1'];
  var html = '<div style="padding:.4rem 0">';

  // ── Per-league controls ──
  html += '<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--cyan);letter-spacing:1.5px;margin-bottom:.65rem">LEAGUE CONTROLS</div>';
  leagues.forEach(function(lid) {
    var lg = LGS[lid]||{};
    var players = Object.values(allPlayers).filter(function(p){ return p.league===lid; }).length;
    var played  = Object.values(allMatches).filter(function(m){ return m.league===lid&&m.played; }).length;
    var total   = Object.values(allMatches).filter(function(m){ return m.league===lid; }).length;
    html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:11px;padding:.85rem;margin-bottom:.5rem">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.4rem;margin-bottom:.5rem">'
      +'<div style="font-weight:700">'+lg.f+' '+esc(lg.n||'')+'</div>'
      +'<span style="font-size:.62rem;color:var(--dim)">'+players+' players · '+played+'/'+total+' played</span>'
      +'</div>'
      +'<div style="display:flex;gap:.35rem;flex-wrap:wrap">'
      +'<button class="btn-xs" onclick="adminEndSeason(\''+lid+'\')">End Season → UCL</button>'
      +'<button class="btn-xs" onclick="autoScheduleForLeague(\''+lid+'\')">Auto-Schedule</button>'
      +'<button class="btn-xs" onclick="adminLeagueReset(\''+lid+'\')">Reset League Matches</button>'
      +'</div></div>';
  });

  // ── Season Message ──
  html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:11px;padding:.85rem;margin-bottom:.5rem">'
    +'<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--cyan);letter-spacing:1px;margin-bottom:.5rem">SEASON MESSAGE</div>'
    +'<div class="form-group"><label class="lbl">Shown on home page</label>'
    +'<input class="inp" id="season-msg-inp" placeholder="e.g. Season 3 is live!" maxlength="120"></div>'
    +'<button class="btn-primary" style="width:auto;padding:.45rem 1rem" onclick="saveSeasonMsg()">Save</button>'
    +'</div>';

  // ── Broadcast ──
  html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:11px;padding:.85rem;margin-bottom:.5rem">'
    +'<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--cyan);letter-spacing:1px;margin-bottom:.5rem">BROADCAST</div>'
    +'<button class="btn-primary" style="width:auto;padding:.45rem 1rem" id="admin-broadcast-btn">📢 Broadcast Message</button>'
    +'</div>';

  // ── DANGER ZONE: Full Season Restart ──
  html += '<div style="background:rgba(255,40,130,0.06);border:1.5px solid rgba(255,40,130,0.4);border-radius:11px;padding:.9rem;margin-top:.8rem">'
    +'<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.5rem">'
    +'<span style="font-size:1.1rem">⚠️</span>'
    +'<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--pink);letter-spacing:1px">DANGER ZONE</div>'
    +'</div>'
    +'<div style="font-size:.72rem;color:var(--dim);margin-bottom:.7rem">These actions are <strong style="color:var(--pink)">irreversible</strong>. All match and stats data will be permanently deleted. Player accounts and clubs are kept.</div>'
    +'<div style="display:flex;gap:.4rem;flex-wrap:wrap">'
    +'<button onclick="adminFullReset()" style="background:rgba(255,40,130,0.15);border:1.5px solid var(--pink);color:var(--pink);border-radius:8px;padding:.5rem 1rem;font-weight:700;font-size:.75rem;cursor:pointer;font-family:inherit">🗑 FULL SEASON RESTART</button>'
    +'<button onclick="adminResetAllMatches()" style="background:rgba(255,107,0,0.12);border:1.5px solid #ff6b00;color:#ff6b00;border-radius:8px;padding:.5rem 1rem;font-weight:700;font-size:.75rem;cursor:pointer;font-family:inherit">🔄 Reset All Matches Only</button>'
    +'</div></div>';

  html += '</div>';
  el.innerHTML = html;
}

// ── Season restart functions ──
function adminFullReset() {
  if (!confirm('⚠️ FULL SEASON RESTART\n\nThis will DELETE:\n• All matches\n• All penalties\n• All UCL data\n• All predictions\n\nPlayer accounts and clubs are KEPT.\n\nType YES to confirm.')) return;
  var conf = prompt('Type RESTART to confirm:','');
  if (conf !== 'RESTART') { toast('Cancelled.'); return; }
  var updates = {};
  updates[DB.matches]  = null;
  updates[DB.penalties] = null;
  updates['ef_ucl_qualifiers'] = null;
  updates['ef_predictions']    = null;
  updates['ef_season_status']  = null;
  db.ref().update(updates).then(function(){
    toast('Season fully restarted. All match data cleared.');
    renderAdminSeason();
  }).catch(function(e){ toast('Failed: '+e.message,'error'); });
}

function adminResetAllMatches() {
  if (!confirm('Delete ALL matches across all leagues? Cannot be undone.')) return;
  db.ref(DB.matches).remove().then(function(){ toast('All matches cleared.'); renderAdminSeason(); });
}

function adminLeagueReset(lid) {
  var lg = LGS[lid]||{n:lid};
  if (!confirm('Reset all matches for '+lg.n+'? Cannot be undone.')) return;
  var toDelete = Object.entries(allMatches).filter(function(kv){ return kv[1].league===lid; });
  var updates = {};
  toDelete.forEach(function(kv){ updates[DB.matches+'/'+kv[0]] = null; });
  if (!Object.keys(updates).length){ toast('No matches to delete.'); return; }
  db.ref().update(updates).then(function(){ toast(lg.n+' matches cleared.'); renderAdminSeason(); });
}

function adminEndSeason(lid) {
  if (!me||me.email!==ADMIN_EMAIL) return;
  if (!confirm('End the '+(LGS[lid]||{n:lid}).n+' season? Top 4 will qualify for UCL.')) return;
  db.ref('ef_season_status/'+lid).set({ended:true,endedAt:Date.now(),endedBy:'admin'});
  if (typeof autoQualifyUCL==='function') autoQualifyUCL(lid);
}

// ── ADMIN POLLS ──────────────────────────────────────────────
// Admin polls are shown to ALL users regardless of league
function renderAdminPolls() {
  var el = $('admin-polls-wrap'); if (!el) return;
  var adminPolls = Object.entries(allPolls||{})
    .filter(function(kv){ return kv[1].isAdminPoll; })
    .sort(function(a,b){ return (b[1].ts||0)-(a[1].ts||0); });

  var html = '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--cyan);letter-spacing:1.5px;margin-bottom:.7rem">ADMIN POLLS</div>'
    + '<button class="btn-primary" style="width:auto;padding:.45rem 1rem;margin-bottom:.8rem" onclick="openAdminPollCreate()">+ Create Admin Poll</button>';

  if (!adminPolls.length) {
    html += '<div class="card empty">No admin polls yet. Create one above.</div>';
  } else {
    html += adminPolls.map(function(kv) {
      var key=kv[0], poll=kv[1];
      var total = Object.values(poll.votes||{}).length;
      return '<div class="admin-card">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem">'
        +'<div style="font-weight:700;font-size:.84rem">'+esc(poll.question||'')+'</div>'
        +'<span style="font-size:.6rem;color:'+(poll.active?'var(--green)':'var(--dim)')+'">'+((poll.active?'● Open':'○ Closed'))+'</span>'
        +'</div>'
        +'<div style="font-size:.62rem;color:var(--dim);margin-bottom:.5rem">'+total+' votes · Created '+fmtAgo(poll.ts)+'</div>'
        + (poll.options||[]).map(function(opt,i){
            var count = Object.values(poll.votes||{}).filter(function(v){return v===i;}).length;
            var pct   = total>0?Math.round(count/total*100):0;
            return '<div style="margin-bottom:.35rem">'
              +'<div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:2px">'
              +'<span>'+esc(opt)+'</span><span style="color:var(--dim)">'+count+' ('+pct+'%)</span>'
              +'</div>'
              +'<div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden">'
              +'<div style="height:100%;width:'+pct+'%;background:var(--cyan);border-radius:3px"></div>'
              +'</div></div>';
          }).join('')
        +'<div style="display:flex;gap:.35rem;margin-top:.5rem;padding-top:.4rem;border-top:1px solid var(--border)">'
        +(poll.active
          ?'<button class="btn-xs" onclick="adminClosePoll(\''+key+'\')">Close Poll</button>'
          :'<button class="btn-xs" onclick="adminReopenPoll(\''+key+'\')">Reopen</button>')
        +'<button class="btn-xs" style="color:var(--pink);border-color:rgba(255,40,130,0.3)" onclick="adminDeletePoll(\''+key+'\')">Delete</button>'
        +'</div></div>';
    }).join('');
  }
  el.innerHTML = html;
}

function openAdminPollCreate() {
  $('poll-question').value='';
  $('poll-opt1').value=''; $('poll-opt2').value='';
  $('poll-opt3').value=''; $('poll-opt4').value='';
  $('poll-err').textContent='';
  var ind = $('admin-poll-indicator'); if(ind) ind.style.display='block';
  var h = $('poll-league-wrap'); if(h) h.style.display='none';
  openMo('create-poll-mo');
  window._adminPollMode = true;
}

function adminClosePoll(key)  { db.ref(DB.polls+'/'+key+'/active').set(false).then(function(){ toast('Poll closed.'); renderAdminPolls(); }); }
function adminReopenPoll(key) { db.ref(DB.polls+'/'+key+'/active').set(true).then(function(){ toast('Poll reopened.'); renderAdminPolls(); }); }
function adminDeletePoll(key) {
  if (!confirm('Delete this poll?')) return;
  db.ref(DB.polls+'/'+key).remove().then(function(){ toast('Poll deleted.'); renderAdminPolls(); });
}

// Override createPoll to support admin mode
var _origCreatePoll = typeof createPoll !== 'undefined' ? createPoll : null;
createPoll = function() {
  if (!myProfile||!db) return;
  var q    = $('poll-question').value.trim();
  var opts = [$('poll-opt1').value.trim(),$('poll-opt2').value.trim(),$('poll-opt3').value.trim(),$('poll-opt4').value.trim()].filter(Boolean);
  var err  = $('poll-err'); err.textContent='';
  if (!q)            { err.textContent='Enter a question.'; return; }
  if (opts.length<2) { err.textContent='Need at least 2 options.'; return; }
  var isAdmin = (me && me.email===ADMIN_EMAIL) || window._adminPollMode;
  db.ref(DB.polls).push({
    question:    q,
    options:     opts,
    votes:       {},
    active:      true,
    ts:          Date.now(),
    createdBy:   myProfile.uid,
    creatorName: myProfile.username,
    isAdminPoll: isAdmin,
    league:      isAdmin ? 'all' : myProfile.league
  }).then(function(){
    window._adminPollMode = false;
    closeMo('create-poll-mo');
    toast('Poll created!');
    ['poll-question','poll-opt1','poll-opt2','poll-opt3','poll-opt4'].forEach(function(id){ var e=$(id); if(e)e.value=''; });
    if (isAdmin) renderAdminPolls();
    else if (typeof renderPolls==='function') renderPolls();
  });
};

// ── AUTO-SCHEDULE (Berger round-robin) ───────────────────────
function autoScheduleForLeague(lid) {
  if (!me||me.email!==ADMIN_EMAIL||!db) return;
  var players = Object.values(allPlayers).filter(function(p){ return p.league===lid; });
  if (players.length<2){ toast('Need at least 2 players.','error'); return; }

  var ps = players.slice();
  if (ps.length%2!==0) ps.push(null); // bye
  var np = ps.length;
  var fixed = ps[0], rotating = ps.slice(1);
  var rounds = [];
  for (var r=0;r<np-1;r++) {
    var round=[], top=[fixed].concat(rotating);
    for (var i=0;i<np/2;i++) {
      var h=top[i],a=top[np-1-i];
      if(h&&a) round.push({home:h,away:a});
    }
    rounds.push(round);
    rotating.unshift(rotating.pop());
  }
  var allRounds = rounds.concat(rounds.map(function(rnd){ return rnd.map(function(fx){ return {home:fx.away,away:fx.home}; }); }));

  var existingKeys={};
  Object.values(allMatches).forEach(function(m){ if(m.league===lid) existingKeys[m.homeId+'_'+m.awayId]=true; });

  var DAY_MS=24*60*60*1000;
  var startDate=new Date(); startDate.setDate(startDate.getDate()+7); startDate.setHours(18,0,0,0);
  var startMs=startDate.getTime(), SLOT=3*60*60*1000;
  var refByDay={}, totalNew=0, updates={};

  allRounds.forEach(function(round,ri) {
    var matchDay=ri+1, dayMs=startMs+ri*DAY_MS;
    if(!refByDay[ri]) refByDay[ri]=[];
    round.forEach(function(fx,si) {
      if(!fx.home||!fx.away) return;
      if(existingKeys[fx.home.uid+'_'+fx.away.uid]) return;
      var matchTime=dayMs+(si%2)*SLOT;
      var busyToday=round.reduce(function(acc,f){ if(f&&f.home)acc.push(f.home.uid); if(f&&f.away)acc.push(f.away.uid); return acc; },[]);
      var refPool=players.filter(function(p){ return !busyToday.includes(p.uid)&&!refByDay[ri].includes(p.uid); });
      var ref=refPool.length?refPool[Math.floor(Math.random()*refPool.length)]:null;
      if(ref) refByDay[ri].push(ref.uid);
      var key=db.ref(DB.matches).push().key;
      updates[DB.matches+'/'+key]={
        id:key,league:lid,
        homeId:fx.home.uid,homeName:fx.home.username,homeClub:fx.home.club,
        awayId:fx.away.uid,awayName:fx.away.username,awayClub:fx.away.club,
        refereeUID:ref?ref.uid:'',refereeName:ref?ref.username:'TBD',
        matchDay:matchDay,matchTime:matchTime,autoScheduledTime:matchTime,
        played:false,createdAt:Date.now(),createdBy:'admin'
      };
      existingKeys[fx.home.uid+'_'+fx.away.uid]=true;
      totalNew++;
    });
  });
  if(!totalNew){ toast('All fixtures already exist.','error'); return; }
  db.ref().update(updates).then(function(){
    toast(totalNew+' fixtures across '+allRounds.length+' match days for '+(LGS[lid]||{}).n+'!');
    renderAdminSeason();
  }).catch(function(e){ toast('Failed: '+e.message,'error'); });
}

// ── BROADCAST ────────────────────────────────────────────────
document.addEventListener('click', function(e) {
  if (e.target&&e.target.id==='admin-broadcast-btn') openMo('broadcast-mo');
});
