// ============================================================
// FEATURES.JS — Badges, Polls, Predictions, Profile,
//               Leaderboard, News, Season, Notifications
// ============================================================

// ── ACHIEVEMENT BADGES ────────────────────────────────────────
function computeBadges(uid) {
  var earned = [];
  var ms = Object.values(allMatches).filter(function (m) {
    return m.played && !m.pendingResult && (m.homeId === uid || m.awayId === uid);
  }).sort(function (a, b) { return (a.playedAt || 0) - (b.playedAt || 0); });
  if (!ms.length) return earned;

  function res(m) { return m.homeId === uid ? (m.hg > m.ag ? 'W' : m.hg === m.ag ? 'D' : 'L') : (m.ag > m.hg ? 'W' : m.ag === m.hg ? 'D' : 'L'); }
  function ga(m)  { return m.homeId === uid ? m.ag : m.hg; }

  var results = ms.map(res);
  var last3   = results.slice(-3);
  var last5   = results.slice(-5);

  if (ms.length >= 10)                                        earned.push('veteran');
  if (last3.length === 3 && last3.every(function(r){return r==='W';})) earned.push('top_form');
  if (last5.length === 5 && last5.every(function(r){return r!=='L';})) earned.push('unbeaten');
  if (last5.length >= 3  && last5.every(function(r){return r!=='L';})) earned.push('consistent');

  var cs = ms.slice(-10).filter(function (m) { return ga(m) === 0; }).length;
  if (cs >= 3) earned.push('clean_sheet');

  var p = allPlayers[uid];
  if (p) {
    var table  = computeStd(p.league);
    var top3   = table.slice(0, 3).map(function (r) { return r.uid; });
    var killed = ms.some(function (m) {
      var opp = m.homeId === uid ? m.awayId : m.homeId;
      return top3.includes(opp) && res(m) === 'W';
    });
    if (killed) earned.push('giant_killer');
  }
  return earned;
}

function renderBadges(uid, size) {
  var earned = computeBadges(uid);
  if (!earned.length) return '<span style="font-size:.7rem;color:var(--dim)">No badges yet</span>';
  return earned.map(function (key) {
    var b = BADGES[key]; if (!b) return '';
    var s = size || 32;
    return '<div title="' + esc(b.label) + ': ' + esc(b.desc) + '" style="width:' + s + 'px;height:' + s + 'px;border-radius:50%;'
      + 'background:' + RARITY_GLOW[b.rarity] + ';border:1.5px solid ' + b.color + ';'
      + 'display:inline-flex;align-items:center;justify-content:center;font-size:' + (s * 0.5) + 'px;margin:2px;cursor:help">'
      + b.icon + '</div>';
  }).join('');
}

// ── PROFILE PAGE ──────────────────────────────────────────────
function renderProfile() {
  var el = $('profile-content'); if (!el) return;
  var uid = myProfile ? myProfile.uid : null;
  if (!uid) { el.innerHTML = '<div class="card empty">Login to view your profile.</div>'; return; }
  var p   = allPlayers[uid] || myProfile;
  var lg  = LGS[p.league] || {};
  var club = getClub(p.league, p.club);

  // Stats
  var ms      = Object.values(allMatches).filter(function (m) { return m.played && (m.homeId === uid || m.awayId === uid); });
  var wins    = ms.filter(function (m) { return (m.homeId === uid && m.hg > m.ag) || (m.awayId === uid && m.ag > m.hg); }).length;
  var draws   = ms.filter(function (m) { return m.hg === m.ag; }).length;
  var losses  = ms.length - wins - draws;
  var gf      = ms.reduce(function (a, m) { return a + (m.homeId === uid ? m.hg : m.ag); }, 0);
  var ga      = ms.reduce(function (a, m) { return a + (m.homeId === uid ? m.ag : m.hg); }, 0);
  var pen     = allPenalties[uid] ? Object.values(allPenalties[uid]).reduce(function (s, x) { return s + (x.pts || 0); }, 0) : 0;
  var rawPts  = wins * 3 + draws;
  var pts     = Math.max(0, rawPts - pen);
  var table   = computeStd(p.league);
  var rank    = table.findIndex(function (r) { return r.uid === uid; }) + 1;

  el.innerHTML =
    // Cover + avatar
    '<div class="prof-cover" style="' + (p.cover ? 'background-image:url(' + p.cover + ')' : 'background:linear-gradient(135deg,rgba(0,212,255,0.12),rgba(0,255,133,0.06))') + '">'
    + '<div class="prof-avatar-wrap">'
    + '<div class="prof-avatar" onclick="openMo(\'avatar-mo\')" style="border-color:' + (club.color || 'var(--cyan)') + '">'
    + (p.avatar && p.avatar.startsWith('http')
      ? '<img src="' + p.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
      : (p.avatar && p.avatar.length < 10 ? '<span style="font-size:2rem">' + p.avatar + '</span>'
        : '<span style="font-size:1.4rem;font-weight:700;color:var(--cyan)">' + (p.username || '?').charAt(0).toUpperCase() + '</span>'))
    + '</div>'
    + '</div>'
    + '</div>'
    // Info
    + '<div class="prof-info">'
    + '<div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap">'
    + '<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1.1rem">' + esc(p.username || '') + '</div>'
    + (rank > 0 ? '<span style="font-size:.65rem;font-weight:700;color:var(--gold);background:rgba(255,230,0,0.1);border:1px solid rgba(255,230,0,0.25);border-radius:8px;padding:2px 8px">#' + rank + ' ' + esc(lg.short || '') + '</span>' : '')
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:.5rem;margin-top:.3rem">'
    + clubBadge(p.club, p.league, 22)
    + '<span style="font-size:.76rem;color:' + (club.color || '#aaa') + '">' + esc(p.club) + '</span>'
    + '<span style="font-size:.7rem;color:var(--dim)">· ' + esc(p.country || '') + '</span>'
    + '</div>'
    + (p.bio ? '<div style="font-size:.76rem;color:var(--dim);margin-top:.35rem;font-style:italic">"' + esc(p.bio) + '"</div>' : '')
    + '<div style="display:flex;gap:.4rem;margin-top:.7rem;flex-wrap:wrap">'
    + '<button class="btn-xs" onclick="openMo(\'edit-bio-mo\')">Edit Profile</button>'
    + '<button class="btn-xs" onclick="openSwapModal()">Club Swap</button>'
    + '</div>'
    + '</div>'
    // Stats grid
    + '<div class="prof-stats">'
    + profStat(pts, 'Points') + profStat(ms.length, 'Played') + profStat(wins, 'Wins')
    + profStat(draws, 'Draws') + profStat(losses, 'Losses') + profStat(gf + '-' + ga, 'Goals')
    + '</div>'
    // Badges
    + '<div style="padding:.9rem">'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--dim);letter-spacing:1.5px;margin-bottom:.6rem">BADGES</div>'
    + renderBadges(uid, 34)
    + '</div>'
    // Match history
    + '<div style="padding:.9rem;border-top:1px solid var(--border)">'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--dim);letter-spacing:1.5px;margin-bottom:.6rem">RECENT MATCHES</div>'
    + (ms.length ? ms.slice(-6).reverse().map(function (m) {
      var opp    = allPlayers[m.homeId === uid ? m.awayId : m.homeId];
      var myG    = m.homeId === uid ? m.hg : m.ag;
      var oppG   = m.homeId === uid ? m.ag : m.hg;
      var result = myG > oppG ? 'W' : myG === oppG ? 'D' : 'L';
      var rc     = result === 'W' ? 'var(--green)' : result === 'D' ? 'var(--gold)' : 'var(--pink)';
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04)">'
        + '<span style="font-size:.8rem">' + esc(opp ? opp.username : '?') + '</span>'
        + '<span style="font-family:Orbitron,sans-serif;font-size:.82rem;font-weight:900;color:var(--green)">' + myG + '-' + oppG + '</span>'
        + '<span style="font-size:.72rem;font-weight:700;color:' + rc + ';width:16px;text-align:center">' + result + '</span>'
        + '</div>';
    }).join('') : '<div style="font-size:.76rem;color:var(--dim)">No matches yet.</div>')
    + '</div>';
}

function profStat(val, lbl) {
  return '<div class="prof-stat-box"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.95rem;color:var(--cyan)">' + val + '</div><div style="font-size:.58rem;color:var(--dim);margin-top:2px">' + lbl + '</div></div>';
}

// ── AVATAR / BIO EDIT ─────────────────────────────────────────
function previewAvatar(input) {
  var f = input.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function (e) {
    var p = $('avatar-prev'); if (!p) return;
    p.src = e.target.result; p.classList.remove('hidden');
  };
  r.readAsDataURL(f);
}

function saveAvatar() {
  if (!myProfile || !db) return;
  var inp    = $('avatar-upload');
  var emojis = document.querySelectorAll('#emoji-picker .ep-emoji.selected');
  var btn    = $('avatar-save-btn');
  btn.textContent = 'Saving...'; btn.disabled = true;

  if (emojis.length) {
    var emoji = emojis[0].textContent;
    db.ref(DB.players + '/' + me.uid + '/avatar').set(emoji).then(function () {
      closeMo('avatar-mo'); toast('Avatar updated!');
      btn.textContent = 'Save Avatar'; btn.disabled = false;
      renderProfile();
    });
  } else if (inp && inp.files[0]) {
    uploadToCloudinary(inp.files[0], 'avatars', 'avatar_' + me.uid, function (url) {
      db.ref(DB.players + '/' + me.uid + '/avatar').set(url).then(function () {
        closeMo('avatar-mo'); toast('Avatar updated!');
        btn.textContent = 'Save Avatar'; btn.disabled = false;
        renderProfile();
      });
    }, function () {
      $('avatar-err').textContent = 'Upload failed. Try again.';
      btn.textContent = 'Save Avatar'; btn.disabled = false;
    });
  } else {
    $('avatar-err').textContent = 'Pick an emoji or upload a photo.';
    btn.textContent = 'Save Avatar'; btn.disabled = false;
  }
}

function saveBio() {
  if (!myProfile || !db) return;
  var bio = $('bio-inp').value.trim();
  var btn = $('cover-save-btn');
  btn.textContent = 'Saving...'; btn.disabled = true;
  db.ref(DB.players + '/' + me.uid + '/bio').set(bio).then(function () {
    closeMo('edit-bio-mo'); toast('Profile updated!');
    btn.textContent = 'Save'; btn.disabled = false;
    renderProfile();
  }).catch(function () {
    $('bio-err').textContent = 'Failed. Try again.';
    btn.textContent = 'Save'; btn.disabled = false;
  });
}

function uploadCover(inputEl) {
  var f = inputEl.files[0]; if (!f || !myProfile) return;
  uploadToCloudinary(f, 'covers', 'cover_' + me.uid, function (url) {
    db.ref(DB.players + '/' + me.uid + '/cover').set(url).then(function () {
      toast('Cover updated!'); renderProfile();
    });
  }, function () { toast('Upload failed.', 'error'); });
}

// ── POLLS ─────────────────────────────────────────────────────
function renderPolls() {
  var pg = $('page-polls'); if (!pg) return;
  var polls = Object.entries(allPolls || {}).sort(function (a, b) { return (b[1].ts || 0) - (a[1].ts || 0); });

  var html = '<div class="section-header"><div class="section-title c-cyan">Polls</div><div class="section-line"></div>'
    + (myProfile ? '<button class="btn-xs" onclick="window._adminPollMode=false;var ind=$(\'admin-poll-indicator\');if(ind)ind.style.display=\'none\';var lw=$(\'poll-league-wrap\');if(lw)lw.style.display=\'\';openMo(\'create-poll-mo\')">+ Create</button>' : '')
    + '</div>';

  if (!polls.length) {
    html += '<div class="card empty">No polls yet.</div>';
  } else {
    polls.forEach(function (kv) {
      var key = kv[0], poll = kv[1];
      var total   = Object.values(poll.votes || {}).length;
      var myVote  = myProfile && poll.votes && poll.votes[myProfile.uid];
      var isAdmin = me && me.email === ADMIN_EMAIL;
      html += '<div class="card" style="padding:.9rem;margin-bottom:.6rem">'
        + '<div style="font-weight:700;font-size:.86rem;margin-bottom:.6rem">' + esc(poll.question || '') + '</div>'
        + '<div style="font-size:.65rem;color:var(--dim);margin-bottom:.7rem">' + total + ' vote' + (total !== 1 ? 's' : '') + ' · ' + (poll.active ? 'Open' : 'Closed') + '</div>'
        + (poll.options || []).map(function (opt, i) {
          var count = Object.values(poll.votes || {}).filter(function (v) { return v === i; }).length;
          var pct   = total > 0 ? Math.round(count / total * 100) : 0;
          var isMine = myVote === i;
          return '<div style="margin-bottom:.5rem">'
            + '<div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:3px">'
            + '<span' + (isMine ? ' style="color:var(--cyan);font-weight:700"' : '') + '>' + esc(opt) + (isMine ? ' ✓' : '') + '</span>'
            + '<span style="color:var(--dim)">' + pct + '%</span>'
            + '</div>'
            + '<div style="height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden">'
            + '<div style="height:100%;width:' + pct + '%;background:' + (isMine ? 'var(--cyan)' : 'rgba(0,212,255,0.35)') + ';border-radius:3px;transition:width .4s"></div>'
            + '</div>'
            + (poll.active && myProfile && !myVote ? '<button class="btn-xs" style="margin-top:3px" onclick="castVote(\'' + key + '\',' + i + ')">Vote</button>' : '')
            + '</div>';
        }).join('')
        + (isAdmin ? '<div style="display:flex;gap:.4rem;margin-top:.6rem;border-top:1px solid var(--border);padding-top:.5rem">'
          + '<button class="btn-xs" onclick="' + (poll.active ? 'closePoll' : 'reopenPoll') + '(\'' + key + '\')">' + (poll.active ? 'Close' : 'Reopen') + '</button>'
          + '<button class="btn-xs" style="color:var(--pink);border-color:rgba(255,40,130,0.3)" onclick="deletePoll(\'' + key + '\')">Delete</button>'
          + '</div>' : '')
        + '</div>';
    });
  }
  pg.innerHTML = html;
}

function castVote(key, optIndex) {
  if (!myProfile || !db) { showLanding(); return; }
  db.ref(DB.polls + '/' + key + '/votes/' + myProfile.uid).set(optIndex)
    .then(function () { toast('Vote cast!'); renderPolls(); });
}

function closePoll(key) {
  if (!db) return;
  db.ref(DB.polls + '/' + key + '/active').set(false)
    .then(function () { toast('Poll closed.'); renderPolls(); });
}

function reopenPoll(key) {
  if (!db) return;
  db.ref(DB.polls + '/' + key + '/active').set(true)
    .then(function () { toast('Poll reopened.'); renderPolls(); });
}

function deletePoll(key) {
  if (!confirm('Delete this poll?')) return;
  if (!db) return;
  db.ref(DB.polls + '/' + key).remove()
    .then(function () { toast('Poll deleted.'); renderPolls(); });
}

function createPoll() {
  if (!myProfile || !db) return;
  var q    = $('poll-question').value.trim();
  var opts = [$('poll-opt1').value.trim(), $('poll-opt2').value.trim(), $('poll-opt3').value.trim(), $('poll-opt4').value.trim()].filter(Boolean);
  var err  = $('poll-err'); err.textContent = '';
  if (!q)         { err.textContent = 'Enter a question.'; return; }
  if (opts.length < 2) { err.textContent = 'Need at least 2 options.'; return; }
  db.ref(DB.polls).push({ question:q, options:opts, votes:{}, active:true, ts:Date.now(), createdBy:myProfile.uid })
    .then(function () { closeMo('create-poll-mo'); toast('Poll created!'); renderPolls(); });
}

function closePoll(key)  { db.ref(DB.polls + '/' + key + '/active').set(false).then(function () { toast('Poll closed.'); renderPolls(); }); }
function reopenPoll(key) { db.ref(DB.polls + '/' + key + '/active').set(true).then(function ()  { toast('Poll reopened.'); renderPolls(); }); }
function deletePoll(key) { if (!confirm('Delete this poll?')) return; db.ref(DB.polls + '/' + key).remove().then(function () { toast('Deleted.'); renderPolls(); }); }

function renderPollBadge() {
  var unseen = Object.values(allPolls || {}).filter(function (p) { return p.active && (!myProfile || !p.votes || !p.votes[myProfile.uid]); }).length;
  setBadge('polls-badge', unseen);
}

// ── PREDICTIONS ───────────────────────────────────────────────
var _predMid = null, _predHid = null, _predAid = null, _predLid = null;

function _openPredictModal(hid, aid, lid, mid) {
  if (!myProfile) { showLanding(); return; }
  _predMid = mid; _predHid = hid; _predAid = aid; _predLid = lid;
  var hp = allPlayers[hid], ap = allPlayers[aid]; if (!hp || !ap) return;

  $('predict-mid').value = mid;
  $('pred-hg').textContent = '0'; $('pred-ag').textContent = '0';
  $('pred-hg-val').value = '0'; $('pred-ag-val').value = '0';
  $('predict-home-name').textContent = hp.username;
  $('predict-away-name').textContent = ap.username;
  $('predict-home-badge').innerHTML  = clubBadge(hp.club, lid, 36);
  $('predict-away-badge').innerHTML  = clubBadge(ap.club, lid, 36);
  $('predict-err').textContent = '';
  $('predict-submit-btn').disabled = false;

  // Check if already predicted
  db.ref('ef_predictions/' + me.uid + '/' + mid).once('value', function (s) {
    var existing = s.val();
    var already  = $('predict-already');
    if (existing) {
      already.textContent = 'Your prediction: ' + existing.hg + '-' + existing.ag;
      already.classList.remove('hidden');
      $('predict-submit-btn').textContent = 'Update Prediction';
    } else {
      already.classList.add('hidden');
      $('predict-submit-btn').textContent = 'Submit Prediction';
    }
  });
  openMo('predict-mo');
}

function predStep(side, dir) {
  var id  = 'pred-' + side + 'g';
  var vid = id + '-val';
  var v   = parseInt($(vid).value || 0) + dir;
  if (v < 0) v = 0; if (v > 15) v = 15;
  $(id).textContent = v; $(vid).value = v;
}

function submitPrediction() {
  if (!myProfile || !db) return;
  var mid = $('predict-mid').value;
  var hg  = parseInt($('pred-hg-val').value);
  var ag  = parseInt($('pred-ag-val').value);
  var err = $('predict-err'); err.textContent = '';
  if (!mid) { err.textContent = 'No match selected.'; return; }

  var btn = $('predict-submit-btn');
  btn.textContent = 'Saving...'; btn.disabled = true;

  db.ref('ef_predictions/' + me.uid + '/' + mid).set({
    hg: hg, ag: ag, uid: myProfile.uid, username: myProfile.username,
    mid: mid, homeId: _predHid, awayId: _predAid, league: _predLid, ts: Date.now()
  }).then(function () {
    closeMo('predict-mo');
    toast('Prediction saved!');
    btn.textContent = 'Submit Prediction'; btn.disabled = false;
  }).catch(function () {
    err.textContent = 'Failed. Try again.';
    btn.textContent = 'Submit Prediction'; btn.disabled = false;
  });
}

// ── LEADERBOARD ───────────────────────────────────────────────
function renderLeaderboard() {
  var pg = $('page-leaderboard'); if (!pg) return;
  var isAdmin = me && me.email === ADMIN_EMAIL;

  // Build overall leaderboard across all leagues
  var scored = Object.values(allPlayers).map(function(p) {
    var ms    = Object.values(allMatches).filter(function(m){ return m.played&&(m.homeId===p.uid||m.awayId===p.uid); });
    var wins  = ms.filter(function(m){ return (m.homeId===p.uid&&m.hg>m.ag)||(m.awayId===p.uid&&m.ag>m.hg); }).length;
    var draws = ms.filter(function(m){ return m.hg===m.ag; }).length;
    var pen   = allPenalties[p.uid]?Object.values(allPenalties[p.uid]).reduce(function(s,x){return s+(x.pts||0);},0):0;
    var pts   = Math.max(0,wins*3+draws-pen);
    var gf    = ms.reduce(function(a,m){return a+(m.homeId===p.uid?m.hg:m.ag);},0);
    var ga    = ms.reduce(function(a,m){return a+(m.homeId===p.uid?m.ag:m.hg);},0);
    return {p:p,pts:pts,played:ms.length,wins:wins,draws:draws,losses:ms.length-wins-draws,gf:gf,ga:ga};
  }).sort(function(a,b){
    if(b.pts!==a.pts) return b.pts-a.pts;
    return (b.gf-b.ga)-(a.gf-a.ga);
  });

  var medals = ['🥇','🥈','🥉'];
  var html = '<div class="section-header"><div class="section-title c-gold">🏆 Leaderboard</div><div class="section-line gold"></div></div>';
  html += '<div style="font-size:.68rem;color:var(--dim);margin-bottom:.7rem">Overall rankings across all leagues</div>';

  if (!scored.length) {
    html += '<div class="card empty">No players yet.</div>';
  } else {
    html += scored.map(function(x,i) {
      var p=x.p, lg=LGS[p.league]||{};
      var isSelf = myProfile && p.uid===myProfile.uid;
      return '<div style="display:flex;align-items:center;gap:.6rem;padding:.7rem .85rem;background:var(--card);'
        +'border:1px solid '+(isSelf?'rgba(0,212,255,0.35)':i<3?'rgba(255,230,0,0.15)':'var(--border)')+';'
        +'border-radius:11px;margin-bottom:.38rem;cursor:pointer" onclick="openUserModal(''+p.uid+'')">'
        +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:'+(i<3?'1.1rem':'.8rem')+';min-width:28px;text-align:center;color:'+(i===0?'#FFE600':i===1?'#C0C0C0':i===2?'#CD7F32':'var(--dim)')+'">'
        +(i<3?medals[i]:'#'+(i+1))+'</div>'
        +clubBadge(p.club,p.league,30)
        +'<div style="flex:1;min-width:0">'
        +'<div style="font-weight:700;font-size:.84rem;'+(isSelf?'color:var(--cyan)':'')+'">'
        +esc(p.username)+(isSelf?' ← You':'')+'</div>'
        +'<div style="font-size:.6rem;color:'+lg.c+';margin-top:1px">'+esc(lg.short||'')+'</div>'
        +'</div>'
        +'<div style="text-align:right">'
        +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.95rem;color:#FFE600">'+x.pts+'</div>'
        +'<div style="font-size:.54rem;color:var(--dim)">'+x.played+'G '+x.wins+'W '+x.draws+'D '+x.losses+'L</div>'
        +'</div></div>';
    }).join('');
  }

  // My predictions section
  html += '<div id="my-predictions"></div>';
  html += '<div id="pred-leaderboard"></div>';

  pg.innerHTML = html;
  if (typeof renderMyPredictions==='function') renderMyPredictions();
  if (typeof renderPredLeaderboard==='function') renderPredLeaderboard();
}

function renderFormChart(uid) {
  var ms = Object.values(allMatches)
    .filter(function (m) { return m.played && (m.homeId === uid || m.awayId === uid); })
    .sort(function (a, b) { return (a.playedAt || 0) - (b.playedAt || 0); })
    .slice(-10);
  if (!ms.length) return '<div style="font-size:.76rem;color:var(--dim);padding:.5rem">No matches yet.</div>';

  var bars = ms.map(function (m) {
    var myG  = m.homeId === uid ? m.hg : m.ag;
    var oppG = m.homeId === uid ? m.ag : m.hg;
    var r    = myG > oppG ? 'W' : myG === oppG ? 'D' : 'L';
    var c    = r === 'W' ? 'var(--green)' : r === 'D' ? 'var(--gold)' : 'var(--pink)';
    var opp  = allPlayers[m.homeId === uid ? m.awayId : m.homeId];
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:3px" title="' + (opp ? opp.username : '?') + ' ' + myG + '-' + oppG + '">'
      + '<div style="font-size:.6rem;color:' + c + ';font-weight:700">' + r + '</div>'
      + '<div style="width:24px;background:' + c + ';border-radius:3px;opacity:.85" style="height:' + (Math.max(myG, oppG) * 8 + 12) + 'px"></div>'
      + '<div style="font-family:Orbitron,sans-serif;font-size:.58rem;color:var(--dim)">' + myG + '-' + oppG + '</div>'
      + '</div>';
  }).join('');
  return '<div style="display:flex;align-items:flex-end;gap:.35rem;padding:.5rem 0;overflow-x:auto">' + bars + '</div>';
}

function renderMyPredictions() {
  var el = $('my-predictions'); if (!el || !myProfile || !db) return;
  db.ref('ef_predictions/' + me.uid).limitToLast(5).once('value', function (s) {
    var preds = Object.values(s.val() || {}).sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    if (!preds.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="section-header"><div class="section-title c-cyan" style="font-size:.68rem">YOUR PREDICTIONS</div><div class="section-line"></div></div>'
      + preds.map(function (pred) {
        var m  = allMatches[pred.mid];
        var hp = allPlayers[pred.homeId], ap = allPlayers[pred.awayId]; if (!hp || !ap) return '';
        var correct = m && m.played ? (m.hg === pred.hg && m.ag === pred.ag ? '🎯 Exact' : ((m.hg > m.ag) === (pred.hg > pred.ag) && (m.hg === m.ag) === (pred.hg === pred.ag)) ? '✓ Correct' : '✗ Wrong') : 'Pending';
        var cc = correct.includes('Exact') ? 'var(--green)' : correct.includes('Correct') ? 'var(--cyan)' : correct === 'Pending' ? 'var(--dim)' : 'var(--pink)';
        return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.45rem 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:.76rem">'
          + '<span>' + esc(hp.username) + ' vs ' + esc(ap.username) + '</span>'
          + '<span style="font-family:Orbitron,sans-serif;color:var(--gold)">' + pred.hg + '-' + pred.ag + '</span>'
          + '<span style="color:' + cc + ';font-size:.68rem">' + correct + '</span>'
          + '</div>';
      }).join('');
  });
}

function renderPredLeaderboard() {
  var el = $('pred-leaderboard'); if (!el || !db) return;
  // Simple version — show top predictors from Firebase
  el.innerHTML = '';
}

// ── SEASON BANNER ─────────────────────────────────────────────
function renderSeasonBanner() {
  var el = $('season-banner'); if (!el) return;
  if (!db) return;
  db.ref(DB.season).once('value', function (s) {
    var data = s.val(); if (!data || !data.message) { el.style.display = 'none'; return; }
    el.innerHTML = '<div style="background:linear-gradient(135deg,rgba(0,212,255,0.12),rgba(0,255,133,0.08));border:1px solid rgba(0,212,255,0.2);border-radius:10px;padding:.7rem 1rem;font-size:.78rem;text-align:center;margin:.5rem .9rem">'
      + esc(data.message) + '</div>';
    el.style.display = 'block';
  });
}

// ── ADMIN SEASON CONTROLS (used in admin.js) ──────────────────
function adminSeasonControls() {
  return '<div style="padding:.9rem">'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.65rem;color:var(--cyan);letter-spacing:1.5px;margin-bottom:.7rem">SEASON CONTROLS</div>'
    + '<div class="form-group"><label class="lbl">Season Message (shown on home)</label>'
    + '<input class="inp" id="season-msg-inp" placeholder="e.g. Season 3 is live!" maxlength="100"></div>'
    + '<button class="btn-primary" style="margin-bottom:.5rem" onclick="saveSeasonMsg()">Save Message</button>'
    + '</div>';
}

function saveSeasonMsg() {
  var msg = $('season-msg-inp') && $('season-msg-inp').value.trim();
  if (!msg || !db) return;
  db.ref(DB.season + '/message').set(msg).then(function () { toast('Season message saved!'); });
}

function seasonReset() {
  if (!confirm('Reset ALL match data? Player accounts stay. This cannot be undone.')) return;
  if (!confirm('Are you absolutely sure?')) return;
  db.ref(DB.matches).remove().then(function () { toast('All match data cleared.'); });
}

// ── NOTIFICATIONS LISTENER ───────────────────────────────────
function listenNotifs() {
  if (!myProfile || !db) return;
  var ref     = db.ref(DB.notifs + '/' + me.uid).orderByChild('ts').limitToLast(10);
  var handler = ref.on('child_added', function (s) {
    var n = s.val(); if (!n || n.read) return;
    s.ref.update({ read: true });
    showNotifBanner(n);
  });
}

function showNotifBanner(n) {
  var wrap = $('notif-wrap'); if (!wrap) return;
  var div  = document.createElement('div');
  div.className = 'notif-banner';
  div.innerHTML = '<div class="notif-icon" style="color:var(--cyan)">&#128276;</div>'
    + '<div class="notif-body"><div class="notif-title">' + esc(n.title || '') + '</div>'
    + '<div class="notif-msg">' + esc(n.body || '') + '</div></div>'
    + '<button class="notif-close" onclick="this.parentNode.remove()">&#10005;</button>';
  wrap.appendChild(div);
  setTimeout(function () { if (div.parentNode) div.remove(); }, 5000);
}

// ── BROADCAST ─────────────────────────────────────────────────
function sendBroadcast() {
  if (!myProfile || me.email !== ADMIN_EMAIL || !db) return;
  var type = $('broadcast-type').value;
  var msg  = $('broadcast-msg').value.trim();
  if (!msg) { toast('Enter a message.', 'error'); return; }
  db.ref('ef_broadcast').push({ type:type, message:msg, ts:Date.now(), by:myProfile.username })
    .then(function () { closeMo('broadcast-mo'); toast('Broadcast sent!'); });
}

function listenBroadcast() {
  if (!db) return;
  db.ref('ef_broadcast').limitToLast(1).on('child_added', function (s) {
    var b = s.val(); if (!b) return;
    if (Date.now() - (b.ts || 0) > 60000) return; // ignore old ones
    var dismissed = localStorage.getItem('dismissed_broadcast_' + b.ts);
    if (dismissed) return;
    showNotifBanner({ title: b.type === 'warning' ? 'Warning' : 'Announcement', body: b.message });
  });
}

// ── H2H (Head to Head) ────────────────────────────────────────
function renderH2H(uid1, uid2) {
  var ms = Object.values(allMatches).filter(function (m) {
    return m.played && ((m.homeId === uid1 && m.awayId === uid2) || (m.homeId === uid2 && m.awayId === uid1));
  });
  if (!ms.length) return '<div style="font-size:.74rem;color:var(--dim)">No previous meetings.</div>';
  var w1 = 0, w2 = 0, d = 0;
  ms.forEach(function (m) {
    if (m.hg > m.ag) { if (m.homeId === uid1) w1++; else w2++; }
    else if (m.hg < m.ag) { if (m.awayId === uid1) w1++; else w2++; }
    else d++;
  });
  var p1 = allPlayers[uid1], p2 = allPlayers[uid2];
  return '<div style="display:flex;justify-content:space-around;align-items:center;padding:.5rem;background:rgba(0,0,0,0.2);border-radius:10px">'
    + '<div style="text-align:center"><div style="font-family:Orbitron,sans-serif;font-size:1.2rem;font-weight:900;color:var(--cyan)">' + w1 + '</div><div style="font-size:.65rem;color:var(--dim)">' + esc((p1 || {}).username || '') + '</div></div>'
    + '<div style="text-align:center"><div style="font-size:.72rem;color:var(--dim)">Draws</div><div style="font-family:Orbitron,sans-serif;font-size:1rem;font-weight:700;color:var(--gold)">' + d + '</div></div>'
    + '<div style="text-align:center"><div style="font-family:Orbitron,sans-serif;font-size:1.2rem;font-weight:900;color:var(--pink)">' + w2 + '</div><div style="font-size:.65rem;color:var(--dim)">' + esc((p2 || {}).username || '') + '</div></div>'
    + '</div>';
}

// ============================================================
// POLLS — Admin on top (blue), Player polls for league mates
// ============================================================

// Override renderPolls with full version
renderPolls = function() {
  var pg = $('page-polls'); if (!pg) return;
  var isAdmin = me && me.email === ADMIN_EMAIL;
  var uid = myProfile ? myProfile.uid : null;
  var myLeague = myProfile ? myProfile.league : null;

  // Separate admin polls and player polls
  var adminPolls  = [];
  var playerPolls = [];
  Object.entries(allPolls || {}).forEach(function(kv) {
    var key = kv[0], poll = kv[1];
    // Show poll if: admin poll (everyone sees) OR same league OR I created it
    var canSee = (poll.isAdminPoll) ||
                 (uid && poll.createdBy === uid) ||
                 (myLeague && poll.league === myLeague) ||
                 isAdmin;
    if (!canSee) return;
    if (poll.isAdminPoll) adminPolls.push([key, poll]);
    else playerPolls.push([key, poll]);
  });

  adminPolls.sort(function(a,b) { return (b[1].ts||0)-(a[1].ts||0); });
  playerPolls.sort(function(a,b) { return (b[1].ts||0)-(a[1].ts||0); });

  var html = '<div class="section-header"><div class="section-title c-cyan">Polls</div><div class="section-line"></div>'
    + (myProfile ? '<button class="btn-xs" onclick="window._adminPollMode=false;var ind=$(\'admin-poll-indicator\');if(ind)ind.style.display=\'none\';var lw=$(\'poll-league-wrap\');if(lw)lw.style.display=\'\';openMo(\'create-poll-mo\')">+ Create</button>' : '')
    + '</div>';

  function renderPoll(key, poll, isAdminPoll) {
    var total   = Object.values(poll.votes || {}).length;
    var myVote  = uid && poll.votes ? poll.votes[uid] : null;
    var isOwner = uid && poll.createdBy === uid;
    var isVet   = uid && computeBadges(uid).includes('veteran');
    var canDelete = isAdmin || isOwner;
    var canRequestRemove = isVet && !isOwner && !isAdmin;

    var cardStyle = isAdminPoll
      ? 'border:1.5px solid rgba(0,212,255,0.5);background:rgba(0,212,255,0.06);'
      : 'border:1px solid var(--border);';

    var out = '<div class="card" style="padding:.9rem;margin-bottom:.6rem;' + cardStyle + '">';

    if (isAdminPoll) {
      out += '<div style="display:flex;align-items:center;gap:.4rem;margin-bottom:.5rem">'
        + '<span style="font-size:.58rem;font-weight:700;background:rgba(0,212,255,0.15);border:1px solid rgba(0,212,255,0.4);color:var(--cyan);border-radius:6px;padding:2px 7px">ADMIN POLL</span>'
        + '</div>';
    }

    out += '<div style="font-weight:700;font-size:.88rem;margin-bottom:.4rem">' + esc(poll.question || '') + '</div>';
    out += '<div style="font-size:.63rem;color:var(--dim);margin-bottom:.7rem">'
      + total + ' vote' + (total !== 1 ? 's' : '') + ' · '
      + (poll.active ? '<span style="color:var(--green)">Open</span>' : '<span style="color:var(--dim)">Closed</span>')
      + (poll.creatorName ? ' · by ' + esc(poll.creatorName) : '')
      + '</div>';

    (poll.options || []).forEach(function(opt, i) {
      var count  = Object.values(poll.votes || {}).filter(function(v){return v===i;}).length;
      var pct    = total > 0 ? Math.round(count/total*100) : 0;
      var isMine = myVote !== null && myVote === i;
      var canVote = poll.active && uid && myVote === null;
      var barColor = isMine ? 'var(--cyan)' : 'rgba(0,212,255,0.3)';

      out += '<div style="margin-bottom:.55rem">'
        + '<div style="display:flex;justify-content:space-between;font-size:.78rem;margin-bottom:3px">'
        + '<span' + (isMine ? ' style="color:var(--cyan);font-weight:700"' : '') + '>' + esc(opt) + (isMine ? ' ✓' : '') + '</span>'
        + '<span style="color:var(--dim)">' + count + ' (' + pct + '%)</span>'
        + '</div>'
        + '<div style="height:8px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;cursor:' + (canVote?'pointer':'default') + '"'
        + (canVote ? ' onclick="castVote(\'' + key + '\',' + i + ')"' : '') + '>'
        + '<div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:4px;transition:width .4s"></div>'
        + '</div>'
        + (canVote ? '<div style="font-size:.58rem;color:var(--dim);margin-top:2px">Tap bar to vote</div>' : '')
        + '</div>';
    });

    if (!uid) {
      out += '<div style="font-size:.72rem;color:var(--dim);margin-top:.4rem">Login to vote</div>';
    } else if (myVote !== null) {
      out += '<div style="font-size:.68rem;color:var(--green);margin-top:.4rem">✓ You voted: ' + esc((poll.options||[])[myVote]||'') + '</div>';
    }

    // Action buttons
    var btns = '';
    if (isAdmin) {
      btns += '<button class="btn-xs" onclick="' + (poll.active ? 'closePoll' : 'reopenPoll') + '(\'' + key + '\')">' + (poll.active ? 'Close' : 'Reopen') + '</button>';
      btns += '<button class="btn-xs" style="color:var(--pink);border-color:rgba(255,40,130,0.3)" onclick="deletePoll(\'' + key + '\')">Delete</button>';
    } else if (canDelete) {
      btns += '<button class="btn-xs" style="color:var(--pink);border-color:rgba(255,40,130,0.3)" onclick="deletePoll(\'' + key + '\')">Delete</button>';
    } else if (canRequestRemove) {
      btns += '<button class="btn-xs" onclick="requestPollRemoval(\'' + key + '\')">Request Removal</button>';
    }
    if (btns) out += '<div style="display:flex;gap:.4rem;margin-top:.6rem;border-top:1px solid var(--border);padding-top:.5rem">' + btns + '</div>';

    out += '</div>';
    return out;
  }

  if (!adminPolls.length && !playerPolls.length) {
    html += '<div class="card empty">No polls yet.</div>';
  } else {
    adminPolls.forEach(function(kv) { html += renderPoll(kv[0], kv[1], true); });
    if (playerPolls.length) {
      if (adminPolls.length) html += '<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--dim);letter-spacing:1.5px;margin:.8rem 0 .5rem">COMMUNITY POLLS</div>';
      playerPolls.forEach(function(kv) { html += renderPoll(kv[0], kv[1], false); });
    }
  }
  pg.innerHTML = html;
};

// Override createPoll with league + admin support
createPoll = function() {
  if (!myProfile || !db) return;
  var q    = $('poll-question').value.trim();
  var opts = [$('poll-opt1').value.trim(),$('poll-opt2').value.trim(),$('poll-opt3').value.trim(),$('poll-opt4').value.trim()].filter(Boolean);
  var err  = $('poll-err'); err.textContent = '';
  if (!q)           { err.textContent = 'Enter a question.'; return; }
  if (opts.length < 2){ err.textContent = 'Need at least 2 options.'; return; }
  var isAdmin = me && me.email === ADMIN_EMAIL;
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
  }).then(function() {
    closeMo('create-poll-mo');
    toast('Poll created!');
    renderPolls();
    // Reset form
    ['poll-question','poll-opt1','poll-opt2','poll-opt3','poll-opt4'].forEach(function(id){ var e=$(id); if(e)e.value=''; });
  });
};

function requestPollRemoval(key) {
  if (!myProfile || !db) return;
  var poll = allPolls[key]; if (!poll) return;
  db.ref(DB.reports).push({
    type: 'poll_removal',
    pollKey: key,
    pollQuestion: poll.question,
    requestedBy: myProfile.uid,
    requestedByName: myProfile.username,
    ts: Date.now(),
    status: 'open'
  }).then(function() { toast('Removal request sent to admin.'); });
}

// ============================================================
// NOTIFICATIONS PAGE
// ============================================================

function renderNotifications() {
  var pg = $('page-notifications'); if (!pg) return;
  if (!myProfile || !db) {
    pg.innerHTML = '<div class="card empty">Login to view notifications.</div>';
    return;
  }
  var showAll = pg.getAttribute('data-show-all') === 'true';
  pg.innerHTML = '<div class="section-header">'
    + '<div class="section-title c-cyan">🔔 Notifications</div>'
    + '<div class="section-line"></div>'
    + '<button class="btn-xs" onclick="toggleNotifFilter()">'
    + (showAll ? 'Unread Only' : 'Show All') + '</button>'
    + '</div>'
    + '<div id="notif-list"><div style="text-align:center;padding:1.5rem;color:var(--dim)">Loading...</div></div>';

  var ref = db.ref(DB.notifs + '/' + me.uid).orderByChild('ts').limitToLast(60);
  ref.once('value', function(s) {
    var all = [];
    s.forEach(function(child) {
      var d = child.val();
      // Exclude chat/DM notifications — those live in the Messages tab
      if (d.type === 'dm' || d.type === 'chat' || d.icon === '💬') return;
      all.unshift({ key: child.key, data: d });
    });
    var list = showAll ? all : all.filter(function(n){ return !n.data.read; });
    var el = $('notif-list'); if (!el) return;
    if (!list.length) {
      el.innerHTML = '<div class="card empty">' + (showAll ? 'No notifications yet.' : 'All caught up! 🎉') + '</div>';
      return;
    }
    // Match code notifications always surface at the top
    list.sort(function(a, b) {
      var aCode = (a.data.type === 'room_code' || a.data.type === 'match_code') ? 1 : 0;
      var bCode = (b.data.type === 'room_code' || b.data.type === 'match_code') ? 1 : 0;
      if (bCode !== aCode) return bCode - aCode;
      return (b.data.ts||0) - (a.data.ts||0);
    });
    el.innerHTML = list.map(function(n) {
      var d = n.data;
      var isCode = (d.type === 'room_code' || d.type === 'match_code');
      var iconMap = { match:'⚽', result:'📊', referee:'🟢', dispute:'⚠️',
                      ucl:'🏆', poll:'📊', system:'📢', warning:'⚠️',
                      room_code:'🏟️', match_code:'🏟️', deduction:'📉' };
      var icon = isCode ? '🏟️' : (iconMap[d.type] || d.icon || '🔔');
      var borderColor = isCode ? 'rgba(0,255,133,0.45)' : (d.read ? 'var(--border)' : 'rgba(0,212,255,0.25)');
      var bg = isCode ? 'rgba(0,255,133,0.05)' : 'var(--card)';
      var titleColor = isCode ? 'var(--green)' : (d.read ? 'var(--text)' : 'var(--cyan)');
      var codeBlock = '';
      if (isCode && d.code) {
        codeBlock = '<div style="margin-top:.5rem;background:rgba(0,0,0,0.35);border-radius:8px;padding:.45rem .75rem;display:flex;align-items:center;justify-content:space-between;gap:.5rem">'
          + '<span style="font-family:Orbitron,sans-serif;font-size:.95rem;font-weight:900;color:var(--green);letter-spacing:3px">' + esc(d.code) + '</span>'
          + '<button onclick="copyCode('' + esc(d.code) + '')" class="btn-xs" style="color:var(--green);border-color:rgba(0,255,133,0.3);font-size:.6rem">Copy</button>'
          + '</div>';
      }
      return '<div style="display:flex;align-items:flex-start;gap:.7rem;padding:.75rem .9rem;background:' + bg + ';'
        + 'border:1px solid ' + borderColor + ';border-radius:11px;margin-bottom:.45rem;' + (d.read && !isCode ? 'opacity:.65' : '') + '">'
        + '<div style="font-size:1.25rem;flex-shrink:0;margin-top:2px">' + icon + '</div>'
        + '<div style="flex:1;min-width:0">'
        + '<div style="font-weight:700;font-size:.82rem;color:' + titleColor + '">' + esc(d.title||'') + '</div>'
        + '<div style="font-size:.74rem;color:var(--dim);margin-top:2px">' + esc(d.body||'') + '</div>'
        + codeBlock
        + '<div style="font-size:.6rem;color:var(--dim);margin-top:4px">' + fmtAgo(d.ts) + '</div>'
        + '</div>'
        + (!d.read ? '<div style="width:9px;height:9px;border-radius:50%;background:' + (isCode ? 'var(--green)' : 'var(--cyan)') + ';flex-shrink:0;margin-top:4px;box-shadow:0 0 6px ' + (isCode ? 'rgba(0,255,133,.5)' : 'rgba(0,212,255,.4)') + '"></div>' : '')
        + '</div>';
    }).join('');
    // Mark all displayed as read
    list.forEach(function(n) {
      if (!n.data.read) db.ref(DB.notifs + '/' + me.uid + '/' + n.key + '/read').set(true);
    });
    setBadge('notif-badge', 0);
    clearAttentionDot();
  });
}

function toggleNotifFilter() {
  var pg = $('page-notifications'); if (!pg) return;
  var current = pg.getAttribute('data-show-all') === 'true';
  pg.setAttribute('data-show-all', !current);
  renderNotifications();
}

// ── ATTENTION DOT — glowing green dot on drawer notif button ──
function showAttentionDot() {
  var btn = document.getElementById('drawer-notif-btn');
  if (!btn) return;
  var dot = btn.querySelector('.attention-dot');
  if (!dot) {
    dot = document.createElement('span');
    dot.className = 'attention-dot';
    dot.style.cssText = 'position:absolute;top:6px;right:6px;width:10px;height:10px;border-radius:50%;'
      + 'background:var(--green);box-shadow:0 0 8px rgba(0,255,133,.8);animation:attPulse 1.2s ease-in-out infinite;';
    btn.style.position = 'relative';
    btn.appendChild(dot);
  }
  dot.style.display = 'block';
}
function clearAttentionDot() {
  var dot = document.querySelector('#drawer-notif-btn .attention-dot');
  if (dot) dot.style.display = 'none';
}

function listenNotifBadge() {
  if (!myProfile || !db) return;
  db.ref(DB.notifs + '/' + me.uid).orderByChild('read').equalTo(false).on('value', function(s) {
    var items = s.val() || {};
    // Count only non-chat notifications
    var count = Object.values(items).filter(function(d) {
      return d.type !== 'dm' && d.type !== 'chat' && d.icon !== '💬';
    }).length;
    // Check if any are match codes
    var hasCode = Object.values(items).some(function(d) {
      return !d.read && (d.type === 'room_code' || d.type === 'match_code');
    });
    setBadge('notif-badge', count);
    // Drawer badge
    var db2 = document.getElementById('drawer-notif-badge');
    if (db2) {
      if (count > 0) { db2.textContent = count > 9 ? '9+' : count; db2.classList.remove('hidden'); }
      else { db2.classList.add('hidden'); }
    }
    // Attention dot for match codes
    if (hasCode) showAttentionDot();
    else clearAttentionDot();
  });
}

// ============================================================
// SEASON AUTO-END + UCL AUTO-QUALIFY
// ============================================================

function checkSeasonEnd() {
  if (!db || !allMatches) return;
  // Get all leagues
  var leagues = ['epl','laliga','seriea','ligue1'];
  leagues.forEach(function(lid) {
    var leaguePlayers = Object.values(allPlayers).filter(function(p){ return p.league === lid; });
    if (!leaguePlayers.length) return;
    var totalPossible = leaguePlayers.length * (leaguePlayers.length - 1); // each plays each other home+away
    var played = Object.values(allMatches).filter(function(m){ return m.league === lid && m.played; }).length;
    if (played >= totalPossible && totalPossible > 0) {
      // All matches played — season done for this league
      db.ref('ef_season_status/' + lid + '/ended').once('value', function(s) {
        if (!s.val()) {
          db.ref('ef_season_status/' + lid).set({ ended: true, endedAt: Date.now() });
          autoQualifyUCL(lid);
        }
      });
    }
  });
}

function autoQualifyUCL(lid) {
  var table = computeStd(lid);
  var top4  = table.slice(0, 4);
  var updates = {};
  top4.forEach(function(r, i) {
    updates['ef_ucl_qualifiers/' + r.uid] = {
      uid:      r.uid,
      username: r.name,
      club:     r.club,
      league:   lid,
      position: i + 1,
      pts:      r.pts,
      qualifiedAt: Date.now()
    };
    // Notify player
    sendNotif(r.uid, {
      title: '🏆 UCL Qualification!',
      body:  'You finished #' + (i+1) + ' in ' + (LGS[lid]||{}).n + ' and qualified for the Champions League!',
      type:  'ucl'
    });
  });
  db.ref().update(updates).then(function() {
    // Set 1-week deadline for admin to set entry fee
    db.ref('ef_ucl_settings/qualifyDeadline').set(Date.now() + (7 * 24 * 60 * 60 * 1000));
    toast('🏆 ' + (LGS[lid]||{}).n + ' season ended! Top 4 qualified for UCL.');
  });
}

function adminEndSeason(lid) {
  if (!me || me.email !== ADMIN_EMAIL) return;
  if (!confirm('End the ' + (LGS[lid]||{n:lid}).n + ' season? Top 4 will qualify for UCL.')) return;
  db.ref('ef_season_status/' + lid).set({ ended: true, endedAt: Date.now(), endedBy: 'admin' });
  autoQualifyUCL(lid);
}

// ============================================================
// ROOM CODE BANNER — instant notification when home drops code
// ============================================================

function listenRoomCodes() {
  if (!myProfile || !db) return;
  var uid = myProfile.uid;
  // Listen for matches where I'm away team and roomCode changes
  db.ref(DB.matches).orderByChild('awayId').equalTo(uid).on('child_changed', function(s) {
    var m = s.val(); if (!m) return;
    if (m.roomCode && !m._codeNotified) {
      var hp = allPlayers[m.homeId];
      showRoomCodeBanner(m, hp);
      // Save to notifications DB so it shows in the Notifications page
      db.ref(DB.notifs + '/' + uid).push({
        title:  '🏟️ Room Code Dropped!',
        body:   (hp ? hp.username : 'Home team') + ' has dropped the match code. Tap to copy.',
        type:   'room_code',
        code:   m.roomCode,
        matchId: m.id,
        ts:     Date.now(),
        read:   false
      });
      // Mark as notified on match
      db.ref(DB.matches + '/' + m.id + '/_codeNotified').set(true);
      // Show attention dot on drawer
      if (typeof showAttentionDot === 'function') showAttentionDot();
    }
  });
}

var _roomCodeBannerTimer = null;
function showRoomCodeBanner(match, homePlayer) {
  var wrap = $('notif-wrap'); if (!wrap) return;
  var hp   = homePlayer || {};
  var div  = document.createElement('div');
  div.className = 'notif-banner';
  div.style.cssText = 'border-color:rgba(0,255,133,0.4);background:rgba(0,255,133,0.08)';
  div.innerHTML = '<div class="notif-icon">🏟️</div>'
    + '<div class="notif-body">'
    + '<div class="notif-title">Room Code Ready!</div>'
    + '<div class="notif-msg">' + esc(hp.username||'Home team') + ' dropped the code: <strong style="color:var(--green);font-family:Orbitron,sans-serif;font-size:.9rem;letter-spacing:2px">' + esc(match.roomCode) + '</strong></div>'
    + '<div style="margin-top:.35rem"><button class="btn-xs" style="color:var(--green);border-color:rgba(0,255,133,0.3)" onclick="copyCode(\'' + esc(match.roomCode) + '\')">Copy Code</button></div>'
    + '</div>'
    + '<button class="notif-close" onclick="this.parentNode.remove()">✕</button>';
  wrap.appendChild(div);
  // Auto-dismiss after 2 minutes
  setTimeout(function() { if (div.parentNode) div.remove(); }, 120000);
}

// ============================================================
// RED DOT SYSTEM
// ============================================================

function listenRedDots() {
  if (!myProfile || !db) return;
  var uid = myProfile.uid;
  var isAdmin = me && me.email === ADMIN_EMAIL;

  // Admin red dot — unresolved reports
  if (isAdmin) {
    db.ref(DB.reports).orderByChild('status').equalTo('open').on('value', function(s) {
      var count = Object.keys(s.val() || {}).length;
      setBadge('admin-red-dot', count);
      // Update drawer admin button dot
      var btn = $('drawer-admin-btn');
      if (btn) {
        var dot = btn.querySelector('.admin-dot') || document.createElement('span');
        dot.className = 'admin-dot drawer-badge';
        if (count > 0) { dot.textContent = count; dot.classList.remove('hidden'); if (!btn.querySelector('.admin-dot')) btn.appendChild(dot); }
        else { dot.classList.add('hidden'); }
      }
    });
  }

  // Referee duties red dot
  db.ref(DB.matches).orderByChild('refereeUID').equalTo(uid).on('value', function(s) {
    var duties = Object.values(s.val() || {}).filter(function(m) {
      return m.awayVerifying && (m.refStatus === 'live' || m.refStatus === 'disputed');
    }).length;
    setBadge('ref-badge', duties);
  });

  // DM unread
  db.ref(DB.dmUnread + '/' + uid).on('value', function(s) {
    var total = 0;
    Object.values(s.val() || {}).forEach(function(v) { total += (v || 0); });
    setBadge('pm-badge', total);
    var fab = $('fab-badge');
    if (fab) { fab.style.display = total > 0 ? 'flex' : 'none'; fab.textContent = total > 9 ? '9+' : total; }
  });

  // Notification unread
  listenNotifBadge();
}

// ============================================================
// MATCH PREP — Time first, code after
// ============================================================

// Show 15-min notice in match prep
function render15MinNotice() {
  var el = $('prep-15min-notice');
  if (!el) return;
  el.innerHTML = '<div style="background:rgba(255,230,0,0.08);border:1px solid rgba(255,230,0,0.25);border-radius:10px;padding:.7rem .9rem;display:flex;align-items:center;gap:.6rem;margin-bottom:.8rem">'
    + '<span style="font-size:1.1rem">⏱️</span>'
    + '<div style="font-size:.76rem;color:var(--gold)"><strong>Minimum match duration: 15 minutes.</strong> Both players must play the full game. Early exits = automatic forfeit.</div>'
    + '</div>';
}

