// ============================================================
// REFEREE.JS — Score Submission, Disputes, Auto-Approval
// ============================================================

// ── OPEN SCORE MODAL ─────────────────────────────────────────
function openScoreModal() {
  if (!myProfile) { showLanding(); return; }
  if (isRestricted(myProfile.uid, 'no_submit')) {
    toast('You are restricted from submitting results.', 'error'); return;
  }
  var uid     = myProfile.uid;
  var pending = Object.values(allMatches).filter(function(m) {
    return !m.played && !m.pendingResult && !m.awayVerifying && (m.homeId===uid || m.awayId===uid);
  });
  if (!pending.length) { toast('No pending matches to submit.', 'error'); return; }
  var opts = pending.map(function(m) {
    var hp = allPlayers[m.homeId], ap = allPlayers[m.awayId]; if (!hp||!ap) return '';
    return '<option value="' + m.id + '">' + esc(hp.username) + ' vs ' + esc(ap.username) + '</option>';
  }).join('');
  $('sm-match-sel').innerHTML = '<option value="">— Choose match —</option>' + opts;
  $('sm-hg').textContent = '0'; $('sm-ag').textContent = '0';
  $('sm-hg-val').value = '0'; $('sm-ag-val').value = '0';
  $('sm-screenshot').value = '';
  var prev = $('sm-ss-preview'); if (prev) prev.classList.add('hidden');
  $('sm-ss-label').textContent = 'Tap to upload screenshot';
  $('sm-honest').checked = false;
  $('sm-err').textContent = '';
  $('sm-home-name').textContent = 'Home';
  $('sm-away-name').textContent = 'Away';
  openMo('score-mo');
}

function smSelectMatch() {
  var mid = $('sm-match-sel').value; if (!mid) return;
  var m   = allMatches[mid]; if (!m) return;
  var hp  = allPlayers[m.homeId], ap = allPlayers[m.awayId]; if (!hp||!ap) return;
  $('sm-home-name').textContent = hp.username + ' (' + hp.club + ')';
  $('sm-away-name').textContent = ap.username + ' (' + ap.club + ')';
}

function stepGoal(side, dir) {
  var id  = 'sm-' + side;
  var vid = id + '-val';
  var v   = parseInt($(vid).value || 0) + dir;
  if (v < 0) v = 0; if (v > 20) v = 20;
  $(id).textContent = v; $(vid).value = v;
}

function smPreviewScreenshot(input) {
  var f = input.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function(e) {
    var p = $('sm-ss-preview');
    p.src = e.target.result; p.classList.remove('hidden');
    $('sm-ss-label').textContent = f.name;
  };
  r.readAsDataURL(f);
}

function submitScoreModal() {
  if (!myProfile) { showLanding(); return; }
  var mid  = $('sm-match-sel').value;
  var hg   = parseInt($('sm-hg-val').value);
  var ag   = parseInt($('sm-ag-val').value);
  var file = $('sm-screenshot').files[0];
  var hon  = $('sm-honest').checked;
  var err  = $('sm-err');
  err.textContent = '';
  if (!mid)  { err.textContent = 'Select a match.'; return; }
  if (isNaN(hg)||isNaN(ag)) { err.textContent = 'Enter both scores.'; return; }
  if (!file) { err.textContent = 'Screenshot is required.'; return; }
  if (!hon)  { err.textContent = 'Please confirm the result is honest.'; return; }

  var btn = $('sm-submit-btn');
  btn.textContent = 'Uploading...'; btn.disabled = true;

  uploadToCloudinary(file, 'results', null, function(url) {
    saveResultLive(mid, hg, ag, url, btn, err);
  }, function() {
    err.textContent = 'Screenshot upload failed. Try again.';
    btn.textContent = '📨 Submit to Referee'; btn.disabled = false;
  });
}

function saveResultLive(mid, hg, ag, ssUrl, btn, err) {
  var m   = allMatches[mid]; if (!m) return;
  var uid = myProfile.uid;
  var isHome = m.homeId === uid;

  db.ref(DB.matches + '/' + mid).update({
    pendingResult: true,
    pendingHg:     hg,
    pendingAg:     ag,
    pendingSS:     ssUrl,
    pendingBy:     uid,
    pendingAt:     Date.now(),
    awayVerifying: !isHome, // if home submitted, away must verify
    refStatus:     'pending'
  }).then(function() {
    btn.textContent = '📨 Submit to Referee'; btn.disabled = false;
    closeMo('score-mo');
    toast('Result submitted! Awaiting ' + (isHome ? 'away verification' : 'referee review') + '.');

    // Notify away team to verify
    if (isHome) {
      notifyAwayTeam(m.awayId, allPlayers[m.awayId], mid, m, hg, ag, ssUrl);
    }
    // Notify referee
    if (m.refereeUID) {
      notifyReferee(m.refereeUID, m.refereeName, mid, m, hg, ag, ssUrl);
    }
    // Schedule auto-close (24h)
    scheduleAutoClose(mid, Date.now() + 24*60*60*1000);
  }).catch(function(e) {
    err.textContent = 'Failed to save. Try again.';
    btn.textContent = '📨 Submit to Referee'; btn.disabled = false;
  });
}

function notifyAwayTeam(awayUID, awayPlayer, mid, m, hg, ag, ssUrl) {
  if (!awayUID || !db) return;
  var hp = allPlayers[m.homeId];
  sendNotif(awayUID, {
    title: 'Result submitted',
    body:  (hp?hp.username:'Home') + ' submitted ' + hg + '-' + ag + '. Verify or dispute.',
    icon:  'result'
  });
}

function notifyReferee(refUID, refName, mid, m, hg, ag, ssUrl) {
  if (!refUID || !db) return;
  var hp = allPlayers[m.homeId], ap = allPlayers[m.awayId];
  sendNotif(refUID, {
    title: 'Match result to review',
    body:  (hp?hp.username:'?') + ' vs ' + (ap?ap.username:'?') + ' — ' + hg + '-' + ag,
    icon:  'referee'
  });
}

// ── DISPUTE ───────────────────────────────────────────────────
function openDisputeModal(mid) {
  if (!myProfile) { showLanding(); return; }
  var m = allMatches[mid]; if (!m) return;
  $('disp-mid').value = mid;
  $('disp-score').textContent = (m.pendingHg||0) + ' – ' + (m.pendingAg||0);
  $('disp-screenshot').value = '';
  var prev = $('disp-ss-preview'); if (prev) prev.classList.add('hidden');
  $('disp-ss-label').textContent = 'Upload your screenshot';
  $('disp-err').textContent = '';
  openMo('dispute-mo');
}

function dispPreviewScreenshot(input) {
  var f = input.files[0]; if (!f) return;
  var r = new FileReader();
  r.onload = function(e) {
    var p = $('disp-ss-preview');
    p.src = e.target.result; p.classList.remove('hidden');
    $('disp-ss-label').textContent = f.name;
  };
  r.readAsDataURL(f);
}

function submitDispute() {
  var mid  = $('disp-mid').value;
  var file = $('disp-screenshot').files[0];
  var err  = $('disp-err');
  err.textContent = '';
  if (!mid)  { err.textContent = 'No match selected.'; return; }
  if (!file) { err.textContent = 'Screenshot is required for a dispute.'; return; }
  if (!myProfile) { err.textContent = 'You must be logged in.'; return; }
  var btn = $('disp-submit-btn');
  btn.textContent = 'Uploading...'; btn.disabled = true;

  uploadToCloudinary(file, 'disputes', null, function(url) {
    db.ref(DB.matches + '/' + mid).update({
      awayDispute:   true,
      disputeSS:     url,
      disputeBy:     myProfile.uid,
      disputeAt:     Date.now(),
      awayVerifying: false,
      refStatus:     'disputed'
    }).then(function() {
      closeMo('dispute-mo');
      toast('Dispute submitted. Referee will decide.');
      btn.textContent = '❌ Submit Dispute'; btn.disabled = false;
      // Notify referee
      var m = allMatches[mid];
      if (m && m.refereeUID) {
        sendNotif(m.refereeUID, { title:'Match disputed', body:'Away team disputed the result. Your review needed.', icon:'alert' });
      }
    }).catch(function() {
      err.textContent = 'Failed. Try again.';
      btn.textContent = '❌ Submit Dispute'; btn.disabled = false;
    });
  }, function() {
    err.textContent = 'Upload failed. Try again.';
    btn.textContent = '❌ Submit Dispute'; btn.disabled = false;
  });
}

// ── REFEREE PANEL ─────────────────────────────────────────────
function renderRefPanel() {
  var pg = $('page-referee'); if (!pg) return;
  if (!myProfile) {
    pg.innerHTML = '<div style="text-align:center;padding:2.5rem;color:var(--dim)">Login to view referee duties.</div>'; return;
  }
  var uid      = myProfile.uid;
  var duties   = Object.values(allMatches).filter(function(m) { return m.refereeUID === uid && m.pendingResult && !m.played; });
  var pending  = Object.values(allMatches).filter(function(m) { return (m.homeId===uid||m.awayId===uid) && m.awayVerifying && !m.played; });

  var html = '<div class="section-header"><div class="section-title c-cyan">🟢 Referee Panel</div><div class="section-line"></div></div>';

  // Away verification first
  if (pending.length) {
    html += '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--gold);letter-spacing:1.5px;margin:.7rem 0 .45rem">⚠ VERIFY RESULT</div>';
    pending.forEach(function(m) {
      var hp = allPlayers[m.homeId], ap = allPlayers[m.awayId]; if (!hp||!ap) return;
      html += '<div class="fx-card fx-mine" style="margin-bottom:.6rem">'
        + '<div style="font-weight:700;font-size:.82rem;margin-bottom:.45rem">' + esc(hp.username) + ' vs ' + esc(ap.username) + '</div>'
        + '<div style="font-family:Orbitron,sans-serif;font-size:1.2rem;font-weight:900;color:var(--green);text-align:center;margin:.5rem 0">' + (m.pendingHg||0) + ' – ' + (m.pendingAg||0) + '</div>'
        + (m.pendingSS ? '<div style="text-align:center;margin-bottom:.5rem"><a href="' + m.pendingSS + '" target="_blank" style="font-size:.7rem;color:var(--cyan)">View Screenshot</a></div>' : '')
        + '<div style="display:flex;gap:.4rem">'
        + '<button class="btn-primary" style="font-size:.72rem;padding:.5rem" onclick="awayConfirm(\'' + m.id + '\')">✓ Confirm</button>'
        + '<button class="btn-danger" style="font-size:.72rem;padding:.5rem;flex:1" onclick="openDisputeModal(\'' + m.id + '\')">✗ Dispute</button>'
        + '</div></div>';
    });
  }

  // Referee duties
  if (duties.length) {
    html += '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--cyan);letter-spacing:1.5px;margin:.7rem 0 .45rem">YOUR DUTIES</div>';
    duties.forEach(function(m) {
      var hp = allPlayers[m.homeId], ap = allPlayers[m.awayId]; if (!hp||!ap) return;
      var isDisputed = m.awayDispute;
      html += '<div class="fx-card" style="margin-bottom:.6rem;border-color:' + (isDisputed?'rgba(255,40,130,0.3)':'rgba(0,212,255,0.2)') + '">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.45rem">'
        + '<div style="font-weight:700;font-size:.82rem">' + esc(hp.username) + ' vs ' + esc(ap.username) + '</div>'
        + (isDisputed ? '<span class="fx-badge danger">DISPUTED</span>' : '<span class="fx-badge info">REVIEW</span>')
        + '</div>'
        + '<div style="font-family:Orbitron,sans-serif;font-size:1.1rem;font-weight:900;color:var(--green);text-align:center;margin:.4rem 0">' + (m.pendingHg||0) + ' – ' + (m.pendingAg||0) + '</div>'
        + '<div style="display:flex;gap:.35rem;margin-bottom:.5rem;justify-content:center">'
        + (m.pendingSS ? '<a href="' + m.pendingSS + '" target="_blank" style="font-size:.68rem;color:var(--cyan)">Home SS</a>' : '')
        + (m.disputeSS ? '<a href="' + m.disputeSS + '" target="_blank" style="font-size:.68rem;color:var(--pink);margin-left:.5rem">Away SS</a>' : '')
        + '</div>'
        + '<div style="display:flex;gap:.4rem">'
        + '<button class="btn-primary" style="font-size:.7rem;padding:.5rem" onclick="refereeConfirm(\'' + m.id + '\')">✓ Approve</button>'
        + '<button class="btn-danger" style="font-size:.7rem;padding:.5rem;flex:1" onclick="refereeReverse(\'' + m.id + '\')">✗ Reject</button>'
        + '</div></div>';
    });
  }

  if (!duties.length && !pending.length) {
    html += '<div class="card empty">No pending duties. You\'re all caught up!</div>';
  }

  pg.innerHTML = html;
  setBadge('ref-badge', duties.length + pending.length);
}

// ── AWAY CONFIRM ──────────────────────────────────────────────
function awayConfirm(mid) {
  if (!myProfile || !db) return;
  var m = allMatches[mid]; if (!m) return;
  db.ref(DB.matches + '/' + mid).update({ awayVerifying:false, refStatus:'away_confirmed' })
    .then(function() { toast('Result confirmed. Referee will finalise.'); renderRefPanel(); });
}

// ── REFEREE ACTIONS ───────────────────────────────────────────
function refereeConfirm(mid) {
  if (!myProfile || !db) return;
  var m = allMatches[mid]; if (!m) return;
  var hg = m.pendingHg || 0, ag = m.pendingAg || 0;
  db.ref(DB.matches + '/' + mid).update({
    played:        true,
    hg:            hg,
    ag:            ag,
    playedAt:      Date.now(),
    pendingResult: false,
    awayVerifying: false,
    awayDispute:   false,
    refStatus:     'approved',
    approvedBy:    myProfile.uid
  }).then(function() {
    toast('Result approved!');
    renderRefPanel();
    notifyBothPlayers(mid, 'Result approved: ' + hg + '-' + ag);
    showResultCelebration(mid, hg, ag, m);
    // Auto-delete match room
    db.ref(DB.matchRooms + '/match_' + mid).remove();
  });
}

function refereeReverse(mid) {
  if (!myProfile || !db) return;
  if (!confirm('Reject this result? Both teams will need to resubmit.')) return;
  db.ref(DB.matches + '/' + mid).update({
    pendingResult: false,
    pendingHg:     null,
    pendingAg:     null,
    pendingSS:     null,
    awayVerifying: false,
    awayDispute:   false,
    refStatus:     'rejected',
    rejectedBy:    myProfile.uid,
    rejectedAt:    Date.now()
  }).then(function() {
    toast('Result rejected. Teams notified.');
    renderRefPanel();
    notifyBothPlayers(mid, 'Result was rejected by referee. Please resubmit.');
  });
}

function notifyBothPlayers(mid, msg) {
  var m = allMatches[mid]; if (!m || !db) return;
  sendNotif(m.homeId, { title:'Match Update', body:msg, icon:'result' });
  sendNotif(m.awayId, { title:'Match Update', body:msg, icon:'result' });
}

// ── AUTO APPROVE ──────────────────────────────────────────────
function scheduleAutoClose(mid, deadline) {
  var delay = deadline - Date.now();
  if (delay < 0) { runAutoClose(mid); return; }
  setTimeout(function() { runAutoClose(mid); }, Math.min(delay, 2147483647));
}

function runAutoClose(mid) {
  var m = allMatches[mid]; if (!m) return;
  if (m.played || !m.pendingResult) return;
  // Auto-approve if no dispute
  if (!m.awayDispute) {
    db.ref(DB.matches + '/' + mid).update({
      played:        true,
      hg:            m.pendingHg || 0,
      ag:            m.pendingAg || 0,
      playedAt:      Date.now(),
      pendingResult: false,
      awayVerifying: false,
      refStatus:     'auto_approved'
    }).then(function() {
      notifyBothPlayers(mid, 'Result auto-approved after 24h: ' + (m.pendingHg||0) + '-' + (m.pendingAg||0));
    });
  }
}

function checkPendingAutoApprovals() {
  if (!db || !myProfile) return;
  Object.values(allMatches).forEach(function(m) {
    if (m.pendingResult && !m.played && m.pendingAt) {
      var deadline = m.pendingAt + 24*60*60*1000;
      if (Date.now() >= deadline) { runAutoClose(m.id); }
      else { scheduleAutoClose(m.id, deadline); }
    }
  });
}

function listenRefDuties() {
  if (!myProfile || !db) return;
  db.ref(DB.matches).orderByChild('refereeUID').equalTo(myProfile.uid).on('value', function() {
    if (activePage() === 'referee') renderRefPanel();
    var count = Object.values(allMatches).filter(function(m) {
      return (m.refereeUID===myProfile.uid || m.homeId===myProfile.uid || m.awayId===myProfile.uid)
        && m.pendingResult && !m.played;
    }).length;
    setBadge('ref-badge', count);
  });
}

// ── RESTRICTIONS ─────────────────────────────────────────────
function isRestricted(uid, type) {
  var r = allPlayers[uid] && allPlayers[uid].restrictions && allPlayers[uid].restrictions[type];
  if (!r) return false;
  if (r.until && Date.now() > r.until) { db.ref(DB.players + '/' + uid + '/restrictions/' + type).remove(); return false; }
  return true;
}

function applyRestriction(uid, type, days) {
  if (!db) return;
  db.ref(DB.players + '/' + uid + '/restrictions/' + type).set({ since:Date.now(), until:Date.now()+days*86400000 });
}

function removeRestriction(uid, type) {
  if (!db) return;
  db.ref(DB.players + '/' + uid + '/restrictions/' + type).remove();
}

// ── CLOUDINARY UPLOAD ─────────────────────────────────────────
function compressImage(file, maxW, quality, cb) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var ratio  = Math.min(maxW / img.width, 1);
      canvas.width  = img.width  * ratio;
      canvas.height = img.height * ratio;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function(blob) { cb(blob || file); }, 'image/jpeg', quality);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function uploadToCloudinary(file, folder, publicId, onSuccess, onFail) {
  compressImage(file, 1280, 0.82, function(blob) {
    var fd = new FormData();
    fd.append('file',   blob);
    fd.append('upload_preset', CLOUDINARY_PRESET);
    fd.append('folder', folder || 'general');
    if (publicId) fd.append('public_id', publicId);
    fetch('https://api.cloudinary.com/v1_1/' + CLOUDINARY_CLOUD + '/image/upload', { method:'POST', body:fd })
      .then(function(r) { return r.json(); })
      .then(function(d) { if (d.secure_url) onSuccess(d.secure_url); else onFail(d); })
      .catch(onFail);
  });
}

// ── RESULT CELEBRATION ────────────────────────────────────────
function showResultCelebration(mid, hg, ag, m) {
  var el = $('result-celebration'); if (!el) return;
  var hp = allPlayers[m.homeId], ap = allPlayers[m.awayId]; if (!hp||!ap) return;
  var winner = hg > ag ? hp.username : ag > hg ? ap.username : null;
  el.innerHTML = '<div class="celeb-inner">'
    + '<div class="celeb-score">' + hg + ' – ' + ag + '</div>'
    + '<div class="celeb-teams">' + esc(hp.username) + ' vs ' + esc(ap.username) + '</div>'
    + (winner ? '<div class="celeb-winner">🏆 ' + esc(winner) + ' wins!</div>' : '<div class="celeb-winner">Draw!</div>')
    + '<button onclick="this.parentNode.parentNode.classList.add(\'hidden\')" style="margin-top:1rem;padding:.5rem 1.5rem;border-radius:8px;border:none;background:var(--cyan);color:#000;font-weight:700;cursor:pointer">Close</button>'
    + '</div>';
  el.classList.remove('hidden');
  setTimeout(function() { el.classList.add('hidden'); }, 8000);
}
