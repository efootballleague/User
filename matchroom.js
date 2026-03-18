// ============================================================
// MATCHROOM.JS — Pre-Match Rooms, Postpone System
// ============================================================

// ── INIT MATCH ROOMS LISTENER ────────────────────────────────
function listenMatchRooms() {
  if (!myProfile || !db) return;
  var uid = myProfile.uid;
  // Listen for matches where user is involved
  db.ref(DB.matches).on('value', function (s) {
    var count = Object.values(s.val() || {}).filter(function (m) {
      return !m.played && (m.homeId === uid || m.awayId === uid || m.refereeUID === uid)
        && m.matchTime && !m.postponed;
    }).length;
    setBadge('matchroom-badge', count);
    if (activePage() === 'matchprep') renderMatchRooms();
  });
}

// ── RENDER MATCH ROOMS (in matchprep page) ───────────────────
function renderMatchRooms() {
  var el = $('match-rooms-list'); if (!el) return;
  if (!myProfile) {
    el.innerHTML = '<div class="card empty">Login to view match rooms.</div>'; return;
  }
  var uid   = myProfile.uid;
  var rooms = Object.values(allMatches).filter(function (m) {
    return !m.played && (m.homeId === uid || m.awayId === uid || m.refereeUID === uid);
  }).sort(function (a, b) { return (a.matchTime || 0) - (b.matchTime || 0); });

  if (!rooms.length) {
    el.innerHTML = '<div class="card empty">No active match rooms.<br><span style="font-size:.7rem;color:var(--dim)">Rooms appear once fixtures are added.</span></div>'; return;
  }

  el.innerHTML = rooms.map(function (m) {
    var hp  = allPlayers[m.homeId], ap = allPlayers[m.awayId]; if (!hp || !ap) return '';
    var lg  = LGS[m.league] || {};
    var isRef = m.refereeUID === uid;
    var role  = isRef ? 'Referee' : m.homeId === uid ? 'Home' : 'Away';
    var roleC = isRef ? 'var(--cyan)' : m.homeId === uid ? 'var(--green)' : 'var(--gold)';
    var hasRoom = !!m.roomCode;
    var isPP    = !!m.postponed;
    var hasPPReq = m.postponeReq && !m.postponed;

    return '<div class="mcard" style="border-color:' + (isPP ? 'rgba(255,107,0,0.3)' : hasRoom ? 'rgba(0,255,133,0.2)' : 'var(--border)') + '">'
      + '<div class="mcard-top">'
      + '<div style="display:flex;align-items:center;gap:.55rem">'
      + clubBadge(hp.club, m.league, 26) + clubBadge(ap.club, m.league, 26)
      + '<div>'
      + '<div style="font-weight:700;font-size:.82rem">' + esc(hp.username) + ' vs ' + esc(ap.username) + '</div>'
      + '<div style="font-size:.62rem;color:' + lg.c + '">' + esc(lg.n || '') + '</div>'
      + '</div></div>'
      + '<span style="font-size:.62rem;font-weight:700;color:' + roleC + ';background:rgba(0,0,0,0.3);padding:3px 8px;border-radius:8px">' + role + '</span>'
      + '</div>'
      + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;flex-wrap:wrap;gap:.3rem">'
      + '<span style="font-size:.7rem;color:var(--dim)">' + (m.matchTime ? fmtFull(m.matchTime) : 'Time TBD') + '</span>'
      + (isPP ? '<span class="fx-badge warn">POSTPONED</span>' : '')
      + (hasPPReq ? '<span class="fx-badge info">PP REQUEST</span>' : '')
      + (m.pendingResult ? '<span class="fx-badge info">RESULT PENDING</span>' : '')
      + '</div>'
      + (m.roomCode ? '<div style="margin-bottom:.55rem"><div style="font-size:.62rem;color:var(--dim);margin-bottom:3px">Room Code</div><span class="mcode" onclick="copyCode(\'' + esc(m.roomCode) + '\')">' + esc(m.roomCode) + '</span></div>' : '')
      + (m.refereeName ? '<div style="font-size:.65rem;color:var(--dim);margin-bottom:.5rem">Ref: <span style="color:var(--green)">' + esc(m.refereeName) + '</span></div>' : '')
      + '<div class="mcard-btns">'
      // Home team — can set room code
      + (m.homeId === uid && !m.played ? '<button class="btn-sm btn-accent" onclick="openPrepModal(\'' + m.id + '\')">' + (m.roomCode ? 'Update Code' : 'Set Code') + '</button>' : '')
      // Away team — copy code or DM home
      + (m.awayId === uid && m.roomCode ? '<button class="btn-sm btn-outline" onclick="copyCode(\'' + esc(m.roomCode) + '\')">Copy Code</button>' : '')
      // Open room chat
      + '<button class="btn-sm btn-outline" onclick="openRoomChat(\'' + m.id + '\')">Room Chat</button>'
      // Postpone request
      + (!m.played && !isPP && (m.homeId === uid || m.awayId === uid) ? '<button class="btn-xs" onclick="openPostponeRequest(\'' + m.id + '\')">Postpone</button>' : '')
      // Admin approve postpone
      + (hasPPReq && me && me.email === ADMIN_EMAIL ? '<button class="btn-xs gold" onclick="approvePostpone(\'' + m.id + '\')">Approve PP</button>' : '')
      + '</div>'
      + '</div>';
  }).join('');
}

function openRoomChat(matchId) {
  // Open messenger on match rooms tab then open the room
  openMessenger('rooms');
  setTimeout(function () {
    if (typeof openRoomChat === 'function') {
      // Find and click the room in the list
      var el = $('msng-content');
      if (el) {
        // renderRoomsList will be shown, then we open specific room
        setTimeout(function () {
          var btn = el.querySelector('[onclick*="' + matchId + '"]');
          if (btn) btn.click();
        }, 300);
      }
    }
  }, 400);
}

// ── POSTPONE REQUEST ──────────────────────────────────────────
function openPostponeRequest(mid) {
  if (!myProfile) { showLanding(); return; }
  $('ppr-mid').value    = mid;
  $('ppr-date').value   = '';
  $('ppr-reason').value = '';
  $('ppr-err').textContent = '';
  openMo('postpone-req-mo');
}

function submitPostponeRequest() {
  var mid    = $('ppr-mid').value;
  var date   = $('ppr-date').value;
  var reason = $('ppr-reason').value.trim();
  var err    = $('ppr-err');
  err.textContent = '';
  if (!date)   { err.textContent = 'Select a preferred date.'; return; }
  if (!reason) { err.textContent = 'Give a reason.'; return; }
  if (!myProfile || !db) return;

  var btn = document.querySelector('#postpone-req-mo .btn-primary');
  if (btn) { btn.textContent = 'Submitting...'; btn.disabled = true; }

  db.ref(DB.matches + '/' + mid).update({
    postponeReq:      true,
    postponeReqBy:    myProfile.uid,
    postponeReqName:  myProfile.username,
    postponeReqDate:  new Date(date).getTime(),
    postponeReason:   reason,
    postponeReqAt:    Date.now()
  }).then(function () {
    closeMo('postpone-req-mo');
    toast('Postpone request submitted. Admin will decide.');
    if (btn) { btn.textContent = 'Submit Request'; btn.disabled = false; }
    // Notify admin
    if (db) {
      db.ref(DB.players).orderByChild('email').equalTo(ADMIN_EMAIL).once('value', function (s) {
        var adminData = s.val();
        if (!adminData) return;
        var adminUID = Object.keys(adminData)[0];
        sendNotif(adminUID, {
          title: 'Postpone Request',
          body:  myProfile.username + ' requested a postpone: ' + reason,
          icon:  'calendar'
        });
      });
    }
  }).catch(function () {
    err.textContent = 'Failed. Try again.';
    if (btn) { btn.textContent = 'Submit Request'; btn.disabled = false; }
  });
}

function approvePostpone(mid) {
  if (!db) return;
  var m = allMatches[mid]; if (!m) return;
  db.ref(DB.matches + '/' + mid).update({
    postponed:    true,
    postponeReq:  false,
    matchTime:    m.postponeReqDate || null,
    postponedAt:  Date.now(),
    postponedBy:  myProfile.uid
  }).then(function () {
    toast('Postpone approved.');
    // Notify both players
    sendNotif(m.homeId, { title: 'Match Postponed', body: 'Your match has been postponed.', icon: 'calendar' });
    sendNotif(m.awayId, { title: 'Match Postponed', body: 'Your match has been postponed.', icon: 'calendar' });
  });
}

function undoPostpone(mid) {
  if (!db || !myProfile) return;
  db.ref(DB.matches + '/' + mid).update({
    postponed:   false,
    postponedAt: null
  }).then(function () { toast('Postpone removed.'); });
}

// ── SET MATCH TIME ────────────────────────────────────────────
function openSetTimeModal(mid) {
  $('set-time-mid').value = mid;
  var m = allMatches[mid];
  if (m && m.matchTime) {
    var d = new Date(m.matchTime);
    $('set-time-inp').value = d.toISOString().slice(0, 16);
  }
  $('set-time-err').textContent = '';
  openMo('set-time-mo');
}

function saveMatchTime() {
  var mid = $('set-time-mid').value;
  var val = $('set-time-inp').value;
  var err = $('set-time-err');
  err.textContent = '';
  if (!val) { err.textContent = 'Select a date and time.'; return; }
  if (!db) return;
  db.ref(DB.matches + '/' + mid).update({ matchTime: new Date(val).getTime() })
    .then(function () {
      closeMo('set-time-mo');
      toast('Match time updated!');
      renderSchedTimeline();
    })
    .catch(function () { err.textContent = 'Failed. Try again.'; });
}

// ── AUTO SCHEDULE ─────────────────────────────────────────────
// Already in pages.js — this just re-exports for cross-file safety
function scheduleAllMatches() { autoScheduleLeague(); }
