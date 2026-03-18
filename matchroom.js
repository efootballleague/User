// ============================================================
// MATCHROOM.JS — Match Prep Rooms + Postpone + Result Review
// ============================================================
// RULES:
// - Match rooms show ONLY matches where user = home, away, or referee
// - Show: up to 3 upcoming (next scheduled), plus any pending/unsettled
// - Settled/approved matches disappear from rooms, stay in fixtures
// - Rooms are openable cards that expand inline
// - Auto-approve result after 48h if no dispute
// - User B (away) can see screenshot, accept OR dispute with own screenshot
// - Referee can see both screenshots, approve or reject
// - Admin can see everything and override any result
// ============================================================

// ── INIT ─────────────────────────────────────────────────────
function listenMatchRooms() {
  if (!myProfile || !db) return;
  var uid = myProfile.uid;
  db.ref(DB.matches).on('value', function(s) {
    var count = Object.values(s.val() || {}).filter(function(m) {
      return (m.homeId===uid || m.awayId===uid || m.refereeUID===uid)
        && !_isMatchSettled(m);
    }).length;
    setBadge('matchroom-badge', count);
    if (activePage() === 'matchprep') renderMatchRooms();
  });
}

// A match is "settled" = played AND no pending dispute/review
function _isMatchSettled(m) {
  if (!m.played) return false;
  if (m.pendingResult || m.awayVerifying || m.awayDispute) return false;
  return true;
}

// ── RENDER MATCH ROOMS ───────────────────────────────────────
var _openRoomId = null; // currently expanded room

function renderMatchRooms() {
  var el = $('match-rooms-list'); if (!el) return;
  if (!myProfile) {
    el.innerHTML = '<div class="card empty">Login to view your match rooms.</div>'; return;
  }
  var uid     = myProfile.uid;
  var isAdmin = me && me.email === ADMIN_EMAIL;
  var now     = Date.now();

  // Get all matches involving this user (as player or referee) that are NOT settled
  var myMatches = Object.values(allMatches).filter(function(m) {
    return (m.homeId===uid || m.awayId===uid || m.refereeUID===uid) && !_isMatchSettled(m);
  });

  // Separate: pending/unsettled results vs upcoming unplayed
  var unsettled = myMatches.filter(function(m) {
    return m.played || m.pendingResult || m.awayVerifying || m.awayDispute;
  });
  var upcoming = myMatches.filter(function(m) {
    return !m.played && !m.pendingResult && !m.awayVerifying;
  }).sort(function(a, b) { return (a.matchTime||9e12) - (b.matchTime||9e12); });

  // Show: all unsettled + up to 3 upcoming
  var toShow = unsettled.concat(upcoming.slice(0, 3));

  if (!toShow.length) {
    el.innerHTML = '<div class="card empty" style="padding:1.5rem;text-align:center">'
      + '<div style="font-size:1.5rem;margin-bottom:.5rem">🏟️</div>'
      + '<div style="font-size:.82rem;font-weight:700">No active match rooms</div>'
      + '<div style="font-size:.7rem;color:var(--dim);margin-top:.3rem">Your upcoming fixtures will appear here</div>'
      + '</div>';
    return;
  }

  el.innerHTML = toShow.map(function(m) {
    return buildRoomCard(m, uid, isAdmin);
  }).join('');

  // Re-open any expanded room
  if (_openRoomId) {
    var expanded = el.querySelector('[data-mid="' + _openRoomId + '"] .room-body');
    if (expanded) expanded.style.display = 'block';
  }
}

function buildRoomCard(m, uid, isAdmin) {
  var hp  = allPlayers[m.homeId], ap = allPlayers[m.awayId];
  if (!hp || !ap) return '';
  var lg    = LGS[m.league] || {};
  var isHome = m.homeId === uid;
  var isAway = m.awayId === uid;
  var isRef  = m.refereeUID === uid;
  var role   = isRef ? 'Referee' : isHome ? 'Home' : 'Away';
  var roleC  = isRef ? 'var(--cyan)' : isHome ? 'var(--green)' : 'var(--gold)';

  // Status
  var hasDispute   = !!m.awayDispute;
  var hasVerify    = m.awayVerifying && !hasDispute;
  var hasPending   = m.pendingResult && !m.played;
  var isPostponed  = !!m.postponed;
  var isPlayed     = !!m.played;
  var hasPPReq     = m.postponeReq && !m.postponed;

  var statusLabel = isPlayed ? '✅ Result Logged'
    : hasDispute   ? '⚠️ DISPUTED'
    : hasVerify    ? '⏳ Awaiting Verification'
    : hasPending   ? '🟢 Ref Review'
    : isPostponed  ? '📅 POSTPONED'
    : hasPPReq     ? '📋 PP Request'
    : '⚽ Upcoming';
  var statusColor = isPlayed ? '#00ff88'
    : hasDispute   ? 'var(--pink)'
    : hasVerify    ? 'var(--gold)'
    : hasPending   ? 'var(--cyan)'
    : isPostponed  ? '#ff6b00'
    : 'var(--dim)';

  var borderColor = hasDispute ? 'rgba(255,40,130,0.4)'
    : hasVerify    ? 'rgba(255,230,0,0.3)'
    : isPlayed     ? 'rgba(0,255,133,0.2)'
    : m.roomCode   ? 'rgba(0,255,133,0.15)'
    : 'var(--border)';

  var midVal = m.id || m.key || '';
  var isOpen = _openRoomId === midVal;

  // ── HEADER (always visible, click to expand) ──
  var html = '<div class="mcard" data-mid="' + midVal + '" style="border-color:' + borderColor + ';margin-bottom:.5rem">'
    + '<div style="cursor:pointer" onclick="toggleRoom(\'' + midVal + '\')">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.4rem">'
    + '<div style="display:flex;align-items:center;gap:.5rem">'
    + clubBadge(hp.club, m.league, 24) + clubBadge(ap.club, m.league, 24)
    + '<div>'
    + '<div style="font-weight:700;font-size:.82rem">' + esc(hp.username) + ' vs ' + esc(ap.username) + '</div>'
    + '<div style="font-size:.6rem;color:' + lg.c + '">' + esc(lg.n||'') + (m.matchDay?' · MD'+m.matchDay:'') + '</div>'
    + '</div></div>'
    + '<div style="display:flex;align-items:center;gap:.4rem">'
    + '<span style="font-size:.58rem;font-weight:700;color:' + roleC + ';background:rgba(0,0,0,0.3);padding:2px 7px;border-radius:7px">' + role + '</span>'
    + '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--dim)" stroke-width="2.5" style="transition:.2s;transform:rotate(' + (isOpen?'180':'0') + 'deg)"><polyline points="6 9 12 15 18 9"/></svg>'
    + '</div></div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:.3rem">'
    + '<span style="font-size:.66rem;color:var(--dim)">' + (m.matchTime ? fmtFull(m.matchTime) : 'Time TBD') + '</span>'
    + '<span style="font-size:.62rem;font-weight:700;color:' + statusColor + '">' + statusLabel + '</span>'
    + '</div>'
    + '</div>';

  // ── BODY (expandable) ──
  html += '<div class="room-body" style="display:' + (isOpen?'block':'none') + ';margin-top:.6rem;padding-top:.6rem;border-top:1px solid rgba(255,255,255,0.07)">';

  // Room code section (home team sets, away team copies)
  if (!isPlayed && !hasPending) {
    if (m.roomCode) {
      html += '<div style="background:rgba(0,255,133,0.06);border:1px solid rgba(0,255,133,0.2);border-radius:10px;padding:.6rem .8rem;margin-bottom:.5rem">'
        + '<div style="font-size:.6rem;color:var(--dim);margin-bottom:.3rem">ROOM CODE</div>'
        + '<div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem">'
        + '<span style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1rem;color:var(--green);letter-spacing:3px">' + esc(m.roomCode) + '</span>'
        + '<button class="btn-xs" style="color:var(--green);border-color:rgba(0,255,133,0.3)" onclick="copyCode(\'' + esc(m.roomCode) + '\')">Copy</button>'
        + '</div>'
        + (m.note ? '<div style="font-size:.65rem;color:var(--dim);margin-top:.3rem">' + esc(m.note) + '</div>' : '')
        + '</div>';
    } else if (isHome) {
      html += '<div style="background:rgba(255,230,0,0.05);border:1px solid rgba(255,230,0,0.2);border-radius:10px;padding:.6rem .8rem;margin-bottom:.5rem;font-size:.72rem;color:var(--gold)">⚠️ Drop your room code so the away team can join.</div>';
    } else {
      html += '<div style="background:rgba(0,0,0,0.2);border-radius:10px;padding:.6rem .8rem;margin-bottom:.5rem;font-size:.7rem;color:var(--dim)">Waiting for home team to drop the room code...</div>';
    }
  }

  // Referee name
  if (m.refereeName) {
    html += '<div style="font-size:.64rem;color:var(--dim);margin-bottom:.4rem">🟢 Referee: <span style="color:var(--green)">' + esc(m.refereeName) + '</span></div>';
  }

  // ── RESULT REVIEW SECTION ──
  if (isPlayed || hasPending || hasVerify || hasDispute) {
    html += buildResultReviewSection(m, uid, isAdmin, isHome, isAway, isRef);
  }

  // ── ACTION BUTTONS ──
  html += '<div style="display:flex;gap:.35rem;flex-wrap:wrap;margin-top:.5rem">';

  if (isHome && !isPlayed && !hasPending) {
    html += '<button class="btn-sm btn-accent" onclick="openPrepModal(\'' + midVal + '\')">' + (m.roomCode ? '🔄 Update Code' : '🏟️ Set Code') + '</button>';
  }
  if (!isPlayed && !hasPending) {
    html += '<button class="btn-sm btn-outline" onclick="openRoomChat(\'' + midVal + '\')">💬 Room Chat</button>';
  }
  if (isHome && !isPlayed && !hasPending) {
    html += '<button class="btn-xs" onclick="openUserPostpone(\'' + midVal + '\')">⏰ Reschedule</button>';
  }
  if (hasPPReq && isAdmin) {
    html += '<button class="btn-xs gold" onclick="approvePostpone(\'' + midVal + '\')">✓ Approve Postpone</button>';
  }

  html += '</div>';
  html += '</div>'; // close room-body
  html += '</div>'; // close mcard
  return html;
}

// ── RESULT REVIEW SECTION ─────────────────────────────────────
// Visible to: home player, away player, referee, admin
function buildResultReviewSection(m, uid, isAdmin, isHome, isAway, isRef) {
  var hg = m.played ? m.hg : (m.pendingHg || 0);
  var ag = m.played ? m.ag : (m.pendingAg || 0);
  var hasDispute  = !!m.awayDispute;
  var hasVerify   = m.awayVerifying && !hasDispute;
  var isPlayed    = !!m.played;
  var hasPending  = m.pendingResult && !isPlayed;

  var html = '<div style="background:rgba(0,0,0,0.25);border-radius:10px;padding:.65rem .75rem;margin-bottom:.5rem">';

  // Score display
  html += '<div style="text-align:center;margin-bottom:.5rem">'
    + '<div style="font-family:Orbitron,sans-serif;font-size:1.35rem;font-weight:900;color:' + (isPlayed?'var(--green)':'var(--gold)') + ';letter-spacing:3px">'
    + hg + ' – ' + ag + '</div>'
    + '<div style="font-size:.6rem;color:var(--dim);margin-top:2px">'
    + (isPlayed ? '✅ Final Result' : hasPending ? '⏳ Pending Approval' : hasVerify ? '⌛ Awaiting Away Confirm' : hasDispute ? '⚠️ Disputed' : '')
    + '</div></div>';

  // Screenshots — visible to all involved parties
  var ssLinks = '';
  if (m.screenshot || m.pendingSS) {
    ssLinks += '<a href="' + (m.screenshot || m.pendingSS) + '" target="_blank" '
      + 'style="display:inline-flex;align-items:center;gap:.3rem;font-size:.68rem;color:var(--cyan);background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:7px;padding:4px 9px;text-decoration:none;margin-right:.3rem">📸 Home Screenshot</a>';
  }
  if (m.disputeSS) {
    ssLinks += '<a href="' + m.disputeSS + '" target="_blank" '
      + 'style="display:inline-flex;align-items:center;gap:.3rem;font-size:.68rem;color:var(--pink);background:rgba(255,40,130,0.08);border:1px solid rgba(255,40,130,0.2);border-radius:7px;padding:4px 9px;text-decoration:none">📸 Away Screenshot</a>';
  }
  if (ssLinks) html += '<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:.5rem">' + ssLinks + '</div>';

  // Auto-approve countdown (if verifying)
  if ((hasVerify || hasPending) && m.submittedAt) {
    var deadline = m.submittedAt + 48*60*60*1000;
    var remaining = deadline - Date.now();
    if (remaining > 0) {
      var hrs = Math.floor(remaining / 3600000);
      var mins = Math.floor((remaining % 3600000) / 60000);
      html += '<div style="font-size:.62rem;color:var(--dim);margin-bottom:.45rem">⏱ Auto-approves in ' + hrs + 'h ' + mins + 'm if no dispute</div>';
    }
  }

  // ── AWAY PLAYER ACTIONS: confirm or dispute ──
  if (isAway && hasVerify && !isPlayed) {
    html += '<div style="display:flex;gap:.4rem;margin-top:.4rem">'
      + '<button class="btn-sm btn-accent" onclick="awayConfirm(\'' + m.id + '\')">✓ Confirm Result</button>'
      + '<button class="btn-sm btn-danger" onclick="openDisputeModal(\'' + m.id + '\')">✗ Dispute</button>'
      + '</div>';
  }

  // ── REFEREE ACTIONS: approve or reject ──
  if ((isRef || isAdmin) && (hasPending || hasDispute) && !isPlayed) {
    if (hasDispute) {
      html += '<div style="font-size:.7rem;color:var(--pink);margin-bottom:.4rem">Away team has disputed this result. Review both screenshots before deciding.</div>';
    }
    html += '<div style="display:flex;gap:.4rem;margin-top:.4rem">'
      + '<button class="btn-sm btn-accent" onclick="refereeConfirm(\'' + m.id + '\')">✓ Approve Result</button>'
      + '<button class="btn-sm btn-danger" onclick="refereeReverse(\'' + m.id + '\')">✗ Reject — Resubmit</button>'
      + '</div>';
  }

  // ── ADMIN OVERRIDE: force any result ──
  if (isAdmin && !isPlayed) {
    html += '<button class="btn-xs" style="margin-top:.4rem;color:#ff6b00;border-color:rgba(255,107,0,0.3)" onclick="adminForceResult(\'' + m.id + '\')">⚡ Admin Force Result</button>';
  }

  html += '</div>';
  return html;
}

// ── TOGGLE ROOM OPEN/CLOSED ───────────────────────────────────
function toggleRoom(mid) {
  var card = document.querySelector('[data-mid="' + mid + '"]');
  if (!card) return;
  var body = card.querySelector('.room-body');
  var arrow = card.querySelector('svg');
  if (!body) return;
  var isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'block';
  if (arrow) arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
  _openRoomId = isOpen ? null : mid;
}

function openRoomChat(matchId) {
  openMessenger('rooms');
  setTimeout(function() {
    if (typeof openRoomThread === 'function') openRoomThread(matchId);
  }, 350);
}

// ── POSTPONE SYSTEM ───────────────────────────────────────────
function openPostponeRequest(mid) {
  if (!myProfile) { showLanding(); return; }
  // Users use the reschedule modal (±24h). Admin can use full postpone.
  if (me && me.email === ADMIN_EMAIL) {
    if (typeof adminPostponeMatch === 'function') adminPostponeMatch(mid);
  } else {
    if (typeof openUserPostpone === 'function') openUserPostpone(mid);
    else {
      // Fallback to the postpone request modal
      var inp = $('ppr-mid'); if (inp) inp.value = mid;
      var err = $('ppr-err'); if (err) err.textContent = '';
      var dateInp = $('ppr-date'); if (dateInp) dateInp.value = '';
      var reason = $('ppr-reason'); if (reason) reason.value = '';
      openMo('postpone-req-mo');
    }
  }
}

// ── SUBMIT POSTPONE REQUEST — saves a request for admin to approve ──
function submitPostponeRequest() {
  var mid    = $('ppr-mid') ? $('ppr-mid').value : '';
  var date   = $('ppr-date') ? $('ppr-date').value : '';
  var reason = $('ppr-reason') ? $('ppr-reason').value.trim() : '';
  var err    = $('ppr-err');
  if (err) err.textContent = '';

  if (!mid)    { if (err) err.textContent = 'No match selected.'; return; }
  if (!reason) { if (err) err.textContent = 'Please give a reason.'; return; }
  if (!myProfile || !db) { if (err) err.textContent = 'You must be logged in.'; return; }

  var btn = document.querySelector('#postpone-req-mo .btn-primary');
  if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }

  var updates = {
    postponeReq:     true,
    postponeReqBy:   myProfile.uid,
    postponeReqAt:   Date.now(),
    postponeReqNote: reason
  };
  if (date) updates.postponeReqDate = new Date(date).getTime();

  db.ref(DB.matches + '/' + mid).update(updates).then(function() {
    closeMo('postpone-req-mo');
    toast('Postpone request sent to admin.');
    if (btn) { btn.textContent = 'Submit Request'; btn.disabled = false; }
    renderMatchRooms();
  }).catch(function() {
    if (err) err.textContent = 'Failed. Try again.';
    if (btn) { btn.textContent = 'Submit Request'; btn.disabled = false; }
  });
}

function approvePostpone(mid) {
  if (!db) return;
  var m = allMatches[mid]; if (!m) return;
  db.ref(DB.matches + '/' + mid).update({
    postponed:   true,
    postponeReq: false,
    matchTime:   m.postponeReqDate || m.matchTime || null,
    postponedAt: Date.now(),
    postponedBy: myProfile.uid
  }).then(function() {
    toast('Postpone approved.');
    sendNotif(m.homeId, { title:'Match Postponed', body:'Your match has been postponed.', icon:'calendar' });
    sendNotif(m.awayId, { title:'Match Postponed', body:'Your match has been postponed.', icon:'calendar' });
    renderMatchRooms();
  });
}

// ── MATCH PREP (home/away lists) ──────────────────────────────
// Shows: up to 3 upcoming + any with pending results or verification
function renderMatchPrep() {
  renderMySwapSection();
  render15MinNotice();
  if (!myProfile) {
    var h = $('prep-home-list'); if (h) h.innerHTML = '<div class="card empty">Login to view your matches.</div>';
    return;
  }
  var uid = myProfile.uid;

  // HOME MATCHES: next 3 upcoming + any pending/unsettled
  var homeUpcoming = Object.values(allMatches).filter(function(m) {
    return m.homeId === uid && !m.played && !m.pendingResult && !m.awayVerifying;
  }).sort(function(a,b){ return (a.matchTime||9e12)-(b.matchTime||9e12); }).slice(0, 3);

  var homePending = Object.values(allMatches).filter(function(m) {
    return m.homeId === uid && !_isMatchSettled(m) && (m.pendingResult || m.awayVerifying || m.awayDispute);
  });

  var homeList = homePending.concat(homeUpcoming.filter(function(m) {
    return !homePending.some(function(p){ return p.id===m.id; });
  }));

  // AWAY MATCHES: same logic
  var awayUpcoming = Object.values(allMatches).filter(function(m) {
    return m.awayId === uid && !m.played && !m.pendingResult && !m.awayVerifying;
  }).sort(function(a,b){ return (a.matchTime||9e12)-(b.matchTime||9e12); }).slice(0, 3);

  var awayPending = Object.values(allMatches).filter(function(m) {
    return m.awayId === uid && !_isMatchSettled(m) && (m.pendingResult || m.awayVerifying || m.awayDispute);
  });

  var awayList = awayPending.concat(awayUpcoming.filter(function(m) {
    return !awayPending.some(function(p){ return p.id===m.id; });
  }));

  var hl = $('prep-home-list'), al = $('prep-away-list');

  if (hl) {
    if (!homeList.length) {
      hl.innerHTML = '<div class="card empty">No upcoming home matches.</div>';
    } else {
      hl.innerHTML = homeList.map(function(m) {
        var ap = allPlayers[m.awayId]; if (!ap) return '';
        var lg = LGS[m.league]||{};
        var isPending = m.pendingResult || m.awayVerifying || m.awayDispute;
        return '<div class="mcard"' + (isPending?' style="border-color:rgba(255,230,0,0.3)"':'') + '>'
          + '<div class="mcard-top">'
          + '<div style="display:flex;align-items:center;gap:.65rem">' + clubBadge(myProfile.club,myProfile.league,28)
          + '<div><div style="font-weight:700;font-size:.85rem">vs ' + esc(ap.username) + '</div>'
          + '<div style="font-size:.63rem;color:'+lg.c+'">'+esc(lg.n||'')+(m.matchDay?' · MD'+m.matchDay:'')+'</div>'
          + '<div style="font-size:.6rem;color:var(--dim)">' + (m.matchTime?fmtFull(m.matchTime):'TBD') + '</div>'
          + '</div></div>'
          + '<span class="mstatus ' + (isPending?'ms-warn':m.roomCode?'ms-rdy':'ms-pend') + '">'
          + (isPending?'Pending':m.roomCode?'Ready':'Set Code') + '</span>'
          + '</div>'
          + (m.roomCode?'<div style="margin:.3rem 0 .5rem"><span class="mcode" onclick="copyCode(\''+esc(m.roomCode)+'\')">'+esc(m.roomCode)+'</span></div>':'')
          + '<div class="mcard-btns">'
          + (!isPending?'<button class="btn-sm btn-accent" onclick="openPrepModal(\''+m.id+'\')">'+(!m.roomCode?'🏟️ Set Code':'🔄 Update Code')+'</button>':'')
          + (isPending?'<button class="btn-sm btn-outline" onclick="toggleRoom(\''+m.id+'\');goPage(\'matchprep\')">View Result</button>':'')
          + '<button class="btn-xs" onclick="openUserPostpone(\''+m.id+'\')">⏰</button>'
          + '</div></div>';
      }).join('');
    }
  }

  if (al) {
    if (!awayList.length) {
      al.innerHTML = '<div class="card empty">No upcoming away matches.</div>';
    } else {
      al.innerHTML = awayList.map(function(m) {
        var hp = allPlayers[m.homeId]; if (!hp) return '';
        var lg = LGS[m.league]||{};
        var isPending = m.pendingResult || m.awayVerifying || m.awayDispute;
        var needsAction = m.awayVerifying && !m.awayDispute;
        return '<div class="mcard" style="border-color:'+(needsAction?'rgba(255,230,0,0.4)':isPending?'rgba(0,212,255,0.2)':'rgba(0,212,255,0.12)')+'">'
          + '<div class="mcard-top">'
          + '<div style="display:flex;align-items:center;gap:.65rem">' + clubBadge(hp.club,m.league,28)
          + '<div><div style="font-weight:700;font-size:.85rem">vs ' + esc(hp.username) + '</div>'
          + '<div style="font-size:.63rem;color:'+lg.c+'">'+esc(lg.n||'')+(m.matchDay?' · MD'+m.matchDay:'')+'</div>'
          + '<div style="font-size:.6rem;color:var(--dim)">' + (m.matchTime?fmtFull(m.matchTime):'TBD') + '</div>'
          + '</div></div>'
          + '<span class="mstatus '+(needsAction?'ms-warn':m.roomCode?'ms-rdy':'ms-pend')+'">'+(needsAction?'⚠️ Verify':m.roomCode?'Code Ready':'Waiting')+'</span>'
          + '</div>'
          + (m.roomCode&&!isPending?'<div style="margin:.3rem 0 .5rem"><span class="mcode" onclick="copyCode(\''+esc(m.roomCode)+'\')">'+esc(m.roomCode)+'</span></div>':'')
          + (!m.roomCode&&!isPending?'<div style="font-size:.72rem;color:var(--dim);font-style:italic;margin-bottom:.4rem">Home team hasn\'t set the code yet.</div>':'')
          + '<div class="mcard-btns">'
          + (m.roomCode&&!isPending?'<button class="btn-sm btn-accent" onclick="copyCode(\''+esc(m.roomCode)+'\')">Copy Code</button>':'')
          + (needsAction?'<button class="btn-sm btn-accent" style="background:linear-gradient(135deg,#ffe600,#ff8800);color:#000" onclick="_openRoomAndVerify(\''+m.id+'\')">⚠️ Verify Result</button>':'')
          + '<button class="btn-sm btn-outline" onclick="openDMWith(\''+hp.uid+'\',\''+esc(hp.username)+'\')">DM Home</button>'
          + '</div></div>';
      }).join('');
    }
  }
}

// Quick-open the room and scroll to verify section
function _openRoomAndVerify(mid) {
  _openRoomId = mid;
  renderMatchRooms();
  var el = $('match-rooms-list');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── SET TIME MODAL ────────────────────────────────────────────
function openSetTimeModal(mid) {
  $('set-time-mid').value = mid;
  var m = allMatches[mid];
  if (m && m.matchTime) {
    var d = new Date(m.matchTime);
    var pad = function(n){ return n<10?'0'+n:''+n; };
    $('set-time-inp').value = d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
  }
  $('set-time-err').textContent = '';
  openMo('set-time-mo');
}

function saveMatchTime() {
  var mid = $('set-time-mid').value;
  var val = $('set-time-inp').value;
  var err = $('set-time-err'); err.textContent = '';
  if (!val) { err.textContent = 'Select a date and time.'; return; }
  var m = allMatches[mid]; if (!m) return;
  var newTime = new Date(val).getTime();
  if (m.autoScheduledTime && me && me.email !== ADMIN_EMAIL) {
    var diff = Math.abs(newTime - m.autoScheduledTime);
    if (diff > 24*60*60*1000) { err.textContent = 'Max ±24h from scheduled time.'; return; }
  }
  if (!db) return;
  db.ref(DB.matches+'/'+mid).update({ matchTime:newTime, timeSetBy:myProfile?myProfile.uid:null, timeSetAt:Date.now() })
    .then(function() {
      closeMo('set-time-mo'); toast('Match time updated!');
      renderMatchPrep(); renderSchedTimeline();
      if (m && myProfile) {
        var otherId = m.homeId===myProfile.uid ? m.awayId : m.homeId;
        sendNotif(otherId, { title:'Match Time Set', body:myProfile.username+' updated the match time.', type:'match' });
      }
    }).catch(function(){ err.textContent='Failed. Try again.'; });
}

function openPrepModal(mid) {
  var m = allMatches[mid]; if (!m||!myProfile) return;
  if (m.homeId !== myProfile.uid) return;
  if (!m.matchTime) { openSetTimeModal(mid); return; }
  $('prep-mid').value  = mid;
  $('prep-code').value = m.roomCode || '';
  $('prep-note').value = m.note || '';
  $('prep-err').textContent = '';
  openMo('prep-mo');
}

var submitPrep = function() {
  var mid  = $('prep-mid').value;
  var code = $('prep-code').value.trim().toUpperCase();
  var note = $('prep-note').value.trim();
  var err  = $('prep-err'); err.textContent = '';
  if (!code) { err.textContent = 'Enter the room code.'; return; }
  if (!myProfile||!db) return;
  var m = allMatches[mid]; if (!m) return;
  var btn = document.querySelector('#prep-mo .btn-primary');
  if (btn) { btn.textContent='Sending...'; btn.disabled=true; }
  db.ref(DB.matches+'/'+mid).update({ roomCode:code, note:note, codeDroppedBy:myProfile.uid, codeDroppedAt:Date.now(), _codeNotified:false })
    .then(function() {
      closeMo('prep-mo'); toast('Room code sent!');
      if (btn) { btn.textContent='Send to Away Team'; btn.disabled=false; }
      renderMatchRooms(); renderMatchPrep();
      sendNotif(m.awayId, { title:'🏟️ Room Code Ready!', body:myProfile.username+' dropped the code: '+code, type:'room_code', code:code });
      if (typeof showAttentionDot==='function') showAttentionDot();
    }).catch(function(){ err.textContent='Failed.'; if(btn){btn.textContent='Send to Away Team';btn.disabled=false;} });
};

// ── AUTO-APPROVE AFTER 48H ────────────────────────────────────
function scheduleAutoClose(mid, deadline) {
  var delay = deadline - Date.now();
  if (delay < 0) { runAutoClose(mid); return; }
  setTimeout(function(){ runAutoClose(mid); }, Math.min(delay, 2147483647));
}

function runAutoClose(mid) {
  if (!db) return;
  // Re-fetch fresh data before acting
  db.ref(DB.matches+'/'+mid).once('value', function(s) {
    var m = s.val(); if (!m) return;
    if (m.played && !m.pendingResult) return; // already done
    if (m.awayDispute) return; // disputed — ref/admin must decide
    db.ref(DB.matches+'/'+mid).update({
      played:true, hg:m.hg||m.pendingHg||0, ag:m.ag||m.pendingAg||0,
      playedAt:Date.now(), pendingResult:false, awayVerifying:false, refStatus:'auto_approved'
    }).then(function() {
      notifyBothPlayers(mid, 'Result auto-approved after 48h: '+(m.hg||m.pendingHg||0)+'-'+(m.ag||m.pendingAg||0));
      if (typeof checkSeasonEnd==='function') checkSeasonEnd();
    });
  });
}

function checkPendingAutoApprovals() {
  if (!db||!myProfile) return;
  Object.values(allMatches).forEach(function(m) {
    if ((m.pendingResult||m.awayVerifying) && !m.played && !m.awayDispute && m.submittedAt) {
      var deadline = m.submittedAt + 48*60*60*1000;
      if (Date.now() >= deadline) runAutoClose(m.id||m.key||'');
      else scheduleAutoClose(m.id||m.key||'', deadline);
    }
  });
}

function scheduleAllMatches() { if(typeof autoScheduleLeague==='function') autoScheduleLeague(); }
