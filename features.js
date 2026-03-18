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
    + (myProfile ? '<button class="btn-xs" onclick="openMo(\'create-poll-mo\')">+ Create</button>' : '')
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

function createPoll() {
  if (!myProfile || !db) return;
  if (!me || me.email !== ADMIN_EMAIL) { toast('Admin only.', 'error'); return; }
  var q    = $('poll-question').value.trim();
  var opts = [$('poll-opt1').value.trim(), $('poll-opt2').value.trim(), $('poll-opt3').value.trim(), $('poll-opt4').value.trim()].filter(Boolean);
  var err  = $('poll-err'); err.textContent = '';
  if (!q)              { err.textContent = 'Enter a question.'; return; }
  if (opts.length < 2) { err.textContent = 'Need at least 2 options.'; return; }
  // Admin polls are auto-pinned
  db.ref(DB.polls).push({ question:q, options:opts, votes:{}, active:true, pinned:true, ts:Date.now(), createdBy:myProfile.uid })
    .then(function () {
      closeMo('create-poll-mo');
      $('poll-question').value=''; $('poll-opt1').value=''; $('poll-opt2').value=''; $('poll-opt3').value=''; $('poll-opt4').value='';
      toast('Poll created and pinned!'); renderPolls();
    });
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
  var html = '<div class="section-header"><div class="section-title c-gold">Leaderboard</div><div class="section-line gold"></div></div>';

  // Overall points table
  var allP = Object.values(allPlayers);
  if (!allP.length) { pg.innerHTML = html + '<div class="card empty">No players yet.</div>'; return; }

  var scored = allP.map(function (p) {
    var ms  = Object.values(allMatches).filter(function (m) { return m.played && (m.homeId === p.uid || m.awayId === p.uid); });
    var raw = ms.reduce(function (acc, m) {
      return acc + (m.homeId === p.uid ? (m.hg > m.ag ? 3 : m.hg === m.ag ? 1 : 0) : (m.ag > m.hg ? 3 : m.ag === m.hg ? 1 : 0));
    }, 0);
    var pen = allPenalties[p.uid] ? Object.values(allPenalties[p.uid]).reduce(function (s, x) { return s + (x.pts || 0); }, 0) : 0;
    var gf  = ms.reduce(function (a, m) { return a + (m.homeId === p.uid ? m.hg : m.ag); }, 0);
    return { p:p, pts:Math.max(0,raw-pen), played:ms.length, gf:gf };
  }).sort(function (a, b) { return b.pts - a.pts || b.gf - a.gf; });

  html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:1rem">';
  scored.forEach(function (x, i) {
    var isMine = myProfile && x.p.uid === myProfile.uid;
    var medal  = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
    html += '<div style="display:flex;align-items:center;gap:.6rem;padding:.65rem .9rem;border-bottom:1px solid rgba(255,255,255,0.04);' + (isMine ? 'background:rgba(0,212,255,0.05)' : '') + '">'
      + '<div style="font-family:Orbitron,sans-serif;font-size:.72rem;min-width:22px;text-align:center">' + medal + '</div>'
      + clubBadge(x.p.club, x.p.league, 26)
      + '<div style="flex:1"><div style="font-weight:700;font-size:.82rem">' + esc(x.p.username) + '</div>'
      + '<div style="font-size:.6rem;color:var(--dim)">' + x.played + ' played · ' + x.gf + ' goals</div></div>'
      + '<div style="text-align:center"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.9rem;color:var(--gold)">' + x.pts + '</div>'
      + '<div style="font-size:.52rem;color:var(--dim)">PTS</div></div>'
      + '</div>';
  });
  html += '</div>';

  // Form chart for current user
  if (myProfile) {
    html += '<div class="section-header" style="margin-top:1.2rem"><div class="section-title c-cyan" style="font-size:.68rem">YOUR FORM</div><div class="section-line"></div></div>';
    html += renderFormChart(myProfile.uid);
  }

  pg.innerHTML = html;
  renderMyPredictions();
  renderPredLeaderboard();
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
  var ref     = db.ref(DB.notifs + '/' + me.uid).orderByChild('ts').limitToLast(20);
  var handler = ref.on('child_added', function (s) {
    var n = s.val(); if (!n || n.read) return;
    s.ref.update({ read: true });
    showNotifBanner(n);
    updateNotifBadge();
  });
}

function updateNotifBadge() {
  if (!myProfile || !db) return;
  db.ref(DB.notifs + '/' + me.uid).orderByChild('read').equalTo(false).once('value', function(s) {
    var count = Object.keys(s.val() || {}).length;
    var bell = $('notif-bell-badge');
    if (bell) { bell.textContent = count > 9 ? '9+' : count; bell.style.display = count > 0 ? 'flex' : 'none'; }
  });
}

function openNotifPanel() {
  if (!myProfile || !db) return;
  db.ref(DB.notifs + '/' + me.uid).orderByChild('ts').limitToLast(20).once('value', function(s) {
    var notifs = Object.values(s.val() || {}).sort(function(a,b){ return (b.ts||0)-(a.ts||0); });
    var el = $('notif-panel-list'); if (!el) return;
    if (!notifs.length) { el.innerHTML = '<div style="color:var(--dim);font-size:.78rem;text-align:center;padding:1rem">No notifications yet.</div>'; return; }
    el.innerHTML = notifs.map(function(n) {
      return '<div style="display:flex;align-items:flex-start;gap:.6rem;padding:.65rem 0;border-bottom:1px solid var(--border)">'
        + '<div style="font-size:1rem;flex-shrink:0">&#128276;</div>'
        + '<div style="flex:1"><div style="font-weight:700;font-size:.78rem">'+esc(n.title||'')+'</div>'
        + '<div style="font-size:.7rem;color:var(--dim)">'+esc(n.body||'')+'</div>'
        + '<div style="font-size:.6rem;color:var(--dim);margin-top:2px">'+fmtAgo(n.ts)+'</div></div>'
        + '</div>';
    }).join('');
    // Mark all read
    db.ref(DB.notifs + '/' + me.uid).once('value', function(s2) {
      var updates = {};
      Object.keys(s2.val()||{}).forEach(function(k){ updates[k+'/read'] = true; });
      db.ref(DB.notifs + '/' + me.uid).update(updates);
    });
    var bell = $('notif-bell-badge'); if (bell) bell.style.display = 'none';
  });
  openMo('notif-panel-mo');
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
