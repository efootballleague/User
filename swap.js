// ============================================================
// SWAP.JS — Club Swap Request System
// Same league only. Both users agree. Admin approves.
// ============================================================

var _swapRequests  = {};
var _swapListening = false;

function initSwap() {
  if (_swapListening || !myProfile || !db) return;
  _swapListening = true;
  db.ref(DB.swaps).orderByChild('toUID').equalTo(myProfile.uid).on('value', function (s) {
    var incoming = {};
    Object.entries(s.val() || {}).forEach(function (kv) {
      if (kv[1].status === 'pending') incoming[kv[0]] = Object.assign({ key: kv[0] }, kv[1]);
    });
    _swapRequests = incoming;
    var count = Object.keys(incoming).length;
    setBadge('swap-badge', count);
    if (activePage() === 'matchprep') renderMySwapSection();
  });
}

// ── OPEN SWAP MODAL ───────────────────────────────────────────
function openSwapModal() {
  if (!myProfile) { showLanding(); return; }
  var lid    = myProfile.league;
  var others = Object.values(allPlayers).filter(function (p) {
    return p.uid !== myProfile.uid && p.league === lid && !p.banned;
  }).sort(function (a, b) { return a.club.localeCompare(b.club); });

  var el = $('swap-player-list'); if (!el) return;
  $('swap-my-club').innerHTML = '<div style="text-align:center;padding:.5rem 0">'
    + '<div style="font-size:.7rem;color:var(--dim);margin-bottom:.4rem">Your current club</div>'
    + clubBadge(myProfile.club, lid, 44)
    + '<div style="font-weight:700;margin-top:.4rem">' + esc(myProfile.club) + '</div>'
    + '</div>';

  if (!others.length) {
    el.innerHTML = '<div style="color:var(--dim);text-align:center;padding:1rem;font-size:.78rem">No other players in your league yet.</div>';
  } else {
    el.innerHTML = others.map(function (p) {
      return '<div class="swap-row" onclick="selectSwapTarget(\'' + p.uid + '\',\'' + esc(p.username) + '\',\'' + esc(p.club) + '\')">'
        + clubBadge(p.club, lid, 30)
        + '<div style="flex:1"><div style="font-weight:700;font-size:.82rem">' + esc(p.username) + '</div>'
        + '<div style="font-size:.65rem;color:var(--dim)">' + esc(p.club) + '</div></div>'
        + '<div style="font-size:.7rem;color:var(--dim)">Select</div>'
        + '</div>';
    }).join('');
  }

  $('swap-target-info').classList.add('hidden');
  $('swap-send-btn').classList.add('hidden');
  $('swap-err').textContent = '';
  $('swap-msg').classList.add('hidden');
  openMo('swap-mo');
}

var _swapTargetUID = null;

function selectSwapTarget(uid, uname, club) {
  _swapTargetUID = uid;
  var el = $('swap-target-info'); if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:.5rem">'
    + '<div style="font-size:.7rem;color:var(--dim);margin-bottom:.4rem">Swap with</div>'
    + clubBadge(club, myProfile.league, 40)
    + '<div style="font-weight:700;margin-top:.3rem">' + esc(uname) + '</div>'
    + '<div style="font-size:.7rem;color:var(--dim)">' + esc(club) + '</div>'
    + '</div>';
  el.classList.remove('hidden');
  $('swap-send-btn').classList.remove('hidden');
  $('swap-err').textContent = '';

  // Highlight selected
  document.querySelectorAll('.swap-row').forEach(function (r) {
    r.style.borderColor = r.getAttribute('onclick') && r.getAttribute('onclick').includes(uid)
      ? 'var(--cyan)' : '';
  });
}

function sendSwapRequest() {
  if (!myProfile || !_swapTargetUID || !db) return;
  var err = $('swap-err'); err.textContent = '';
  var target = allPlayers[_swapTargetUID];
  if (!target) { err.textContent = 'Player not found.'; return; }

  // Check no existing pending swap
  var hasPending = Object.values(allPlayers[myProfile.uid] && {} || {}).some(function () { return false; });
  var btn = $('swap-send-btn');
  btn.textContent = 'Sending...'; btn.disabled = true;

  db.ref(DB.swaps).push({
    fromUID:   myProfile.uid,
    fromName:  myProfile.username,
    fromClub:  myProfile.club,
    toUID:     _swapTargetUID,
    toName:    target.username,
    toClub:    target.club,
    league:    myProfile.league,
    status:    'pending',
    createdAt: Date.now()
  }).then(function () {
    btn.textContent = 'Send Swap Request'; btn.disabled = false;
    var msg = $('swap-msg');
    msg.textContent = 'Swap request sent to ' + target.username + '!';
    msg.classList.remove('hidden');
    $('swap-send-btn').classList.add('hidden');
    sendNotif(_swapTargetUID, {
      title: 'Club Swap Request',
      body:  myProfile.username + ' wants to swap ' + myProfile.club + ' for your ' + target.club,
      icon:  'swap'
    });
  }).catch(function () {
    err.textContent = 'Failed to send. Try again.';
    btn.textContent = 'Send Swap Request'; btn.disabled = false;
  });
}

function acceptSwap(key) {
  if (!myProfile || !db) return;
  var req = _swapRequests[key]; if (!req) return;
  if (!confirm('Accept swap? Your club will change to ' + req.fromClub + '.')) return;

  // Swap clubs in database
  var updates = {};
  updates[DB.players + '/' + myProfile.uid + '/club'] = req.fromClub;
  updates[DB.players + '/' + req.fromUID + '/club']    = req.toClub;
  updates[DB.swaps + '/' + key + '/status']            = 'accepted';
  updates[DB.swaps + '/' + key + '/acceptedAt']        = Date.now();

  db.ref().update(updates).then(function () {
    toast('Swap accepted! Your club is now ' + req.fromClub);
    sendNotif(req.fromUID, {
      title: 'Swap Accepted!',
      body:  myProfile.username + ' accepted. You now have ' + req.toClub,
      icon:  'swap'
    });
    delete _swapRequests[key];
    renderMySwapSection();
  }).catch(function () { toast('Failed. Try again.', 'error'); });
}

function declineSwap(key) {
  if (!db) return;
  db.ref(DB.swaps + '/' + key + '/status').set('declined').then(function () {
    toast('Swap declined.');
    delete _swapRequests[key];
    renderMySwapSection();
  });
}
