// ============================================================
// AUTH.JS — Login, Register, Google Sign-In, Logout
// ============================================================

// ── SIGN IN ──────────────────────────────────────────────────
function doSignIn() {
  var em  = $('li-em').value.trim();
  var pw  = $('li-pw').value;
  var err = $('li-err');
  err.textContent = '';
  if (!em || !pw) { err.textContent = 'Please fill in both fields.'; return; }
  if (!auth)      { err.textContent = 'Connecting... please wait.';  return; }
  var btn = $('li-btn');
  btn.textContent = 'Signing in...'; btn.disabled = true;
  auth.signInWithEmailAndPassword(em, pw)
    .then(function () {
      btn.textContent = '⚡ Sign In'; btn.disabled = false;
      $('li-em').value = ''; $('li-pw').value = '';
    })
    .catch(function (e) {
      var msg = 'Wrong email or password.';
      if (e.code === 'auth/too-many-requests')    msg = 'Too many attempts. Try again later.';
      if (e.code === 'auth/network-request-failed') msg = 'No internet connection.';
      if (e.code === 'auth/invalid-email')         msg = 'Invalid email address.';
      if (e.code === 'auth/user-not-found')        msg = 'No account found with this email.';
      err.textContent = msg;
      btn.textContent = '⚡ Sign In'; btn.disabled = false;
    });
}

// ── REGISTER STEP 1 — Collect details ────────────────────────
function doRegStep1() {
  var u   = $('ru-name').value.trim();
  var em  = $('ru-em').value.trim();
  var pw  = $('ru-pw').value;
  var c   = $('ru-country').value;
  var l   = $('ru-league').value;
  var err = $('ru-err');
  err.textContent = '';

  if (!u || !em || !pw || !c || !l) { err.textContent = 'Please fill in all fields.'; return; }
  if (pw.length < 8) { err.textContent = 'Password must be at least 8 characters.'; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { err.textContent = 'Invalid email address.'; return; }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(u)) { err.textContent = 'Username: 3-20 chars, letters/numbers/underscore only.'; return; }

  // Check username not taken
  var taken = Object.values(allPlayers).some(function (p) {
    return p.username && p.username.toLowerCase() === u.toLowerCase();
  });
  if (taken) { err.textContent = 'Username already taken.'; return; }

  // Check clubs available
  var takenClubs = Object.values(allPlayers)
    .filter(function (p) { return p.league === l; })
    .map(function (p) { return p.club; });
  var avail = (ALL_CLUBS[l] || [])
    .map(function (c) { return c.name; })
    .filter(function (cn) { return !takenClubs.includes(cn); });
  if (!avail.length) { err.textContent = 'This league is full. Please choose another.'; return; }

  showClubPickerReg(l, avail);
}

// ── REGISTER STEP 2 — Club picker ────────────────────────────
function showClubPickerReg(lid, avail) {
  var grid = $('club-grid');
  if (!grid) return;
  grid.innerHTML = avail.map(function (cn) {
    var club = getClub(lid, cn);
    return '<div class="club-opt" onclick="selectClubReg(\'' + cn + '\')">'
      + '<div class="club-opt-badge">'
      + (club.logo ? '<img src="' + club.logo + '" loading="lazy" onerror="this.style.display=\'none\'">' : '')
      + '</div>'
      + '<div class="club-opt-name">' + esc(cn) + '</div>'
      + '<div class="club-opt-status">✓ Free</div>'
      + '</div>';
  }).join('');
  $('reg-step1').style.display = 'none';
  $('reg-step2').classList.remove('hidden');
}

function selectClubReg(name) {
  drawnClub = name;
  var lid  = $('ru-league').value;
  var club = getClub(lid, name);
  var lg   = LGS[lid] || {};
  var box  = $('club-confirm-box');
  if (!box) return;
  box.innerHTML = '<div class="club-confirm-inner">'
    + '<div style="font-size:.7rem;color:var(--dim);margin-bottom:.8rem">Your club has been selected</div>'
    + '<div style="display:flex;justify-content:center;margin-bottom:.8rem">' + clubBadge(name, lid, 64) + '</div>'
    + '<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1.1rem;color:' + club.color + '">' + esc(name) + '</div>'
    + '<div style="font-size:.72rem;color:var(--dim);margin-top:4px">' + lg.f + ' ' + lg.n + '</div>'
    + '</div>';
  $('reg-step2').classList.add('hidden');
  $('reg-step3').classList.remove('hidden');
}

function regBack()       { $('reg-step2').classList.add('hidden');    $('reg-step1').style.display = ''; }
function regBackToGrid() { $('reg-step3').classList.add('hidden');    $('reg-step2').classList.remove('hidden'); }

// ── REGISTER STEP 3 — Confirm & create account ───────────────
function doRegConfirm() {
  var u   = $('ru-name').value.trim();
  var em  = $('ru-em').value.trim();
  var pw  = $('ru-pw').value;
  var c   = $('ru-country').value;
  var l   = $('ru-league').value;
  var err = $('ru-err3');
  err.textContent = '';

  if (!drawnClub) { err.textContent = 'No club selected.'; return; }

  var btn = $('ru-confirm');
  btn.textContent = 'Creating...'; btn.disabled = true;

  // Double-check club still available
  var stillTaken = Object.values(allPlayers).some(function (p) {
    return p.league === l && p.club === drawnClub;
  });
  if (stillTaken) {
    err.textContent = 'This club was just taken! Please pick another.';
    regBackToGrid(); btn.textContent = '✓ Confirm'; btn.disabled = false;
    return;
  }

  var profileData = {
    uid:      '',  // filled in below
    username: u,
    email:    em,
    country:  c,
    league:   l,
    club:     drawnClub,
    avatar:   '',
    bio:      '',
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    banned:   false
  };

  auth.createUserWithEmailAndPassword(em, pw)
    .then(function (cred) {
      var uid = cred.user.uid;
      profileData.uid = uid;
      // ── KEY FIX ──────────────────────────────────────────────
      // Set myProfile and me BEFORE the DB write so that when
      // onAuthStateChanged fires during createUser it finds a valid
      // profile and does not redirect back to the landing page.
      me        = cred.user;
      myProfile = profileData;
      // ─────────────────────────────────────────────────────────
      return db.ref(DB.players + '/' + uid).set(profileData);
    })
    .then(function () {
      var joinedLeague = l;
      btn.textContent = '✓ Confirm'; btn.disabled = false;
      // Reset form
      $('ru-name').value = ''; $('ru-em').value = ''; $('ru-pw').value = '';
      $('ru-country').value = ''; $('ru-league').value = '';
      $('reg-step3').classList.add('hidden');
      $('reg-step1').style.display = '';
      drawnClub = null;
      // Enter app immediately — profile already set above
      enterApp();
      setOnline();
      listenUnread();
      listenGlobalDMs();
      initRefereeSystem();
      listenMatchRooms();
      initSwap();
      toast('Welcome to eFootball Universe! 🎉');
      // Auto-start league if now full
      checkLeagueAutoStart(joinedLeague);
    })
    .catch(function (e) {
      myProfile = null; me = null;
      var msg = 'Registration failed. Try again.';
      if (e.code === 'auth/email-already-in-use') msg = 'Email already registered. Try signing in.';
      if (e.code === 'auth/invalid-email')        msg = 'Invalid email address.';
      if (e.code === 'auth/weak-password')        msg = 'Password too weak. Use at least 8 characters.';
      err.textContent = msg;
      btn.textContent = '✓ Confirm'; btn.disabled = false;
    });
}

// ── GOOGLE SIGN-IN ────────────────────────────────────────────
function doGoogleSignIn() {
  if (!auth) { toast('Connecting... please wait.', 'error'); return; }
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('email');
  provider.addScope('profile');
  auth.signInWithPopup(provider)
    .then(function (result) {
      if (!result || !result.user) return;
      var user = result.user;
      db.ref(DB.players + '/' + user.uid).once('value', function (s) {
        if (!s.val() || !s.val().username) {
          openGoogleSetup(user);
        }
      });
    })
    .catch(function (e) {
      console.error('Google sign-in error:', e);
      if (e.code === 'auth/popup-blocked') {
        toast('Popup blocked. Please allow popups for this site.', 'error');
      } else if (e.code === 'auth/popup-closed-by-user') {
        // user closed it, no error needed
      } else if (e.code === 'auth/network-request-failed') {
        toast('No internet connection.', 'error');
      } else {
        toast('Google sign-in failed. Try again.', 'error');
      }
    });
}

// Stub — redirect no longer used
function handleGoogleRedirect() {}

// ── GOOGLE NEW USER SETUP ─────────────────────────────────────
var _gsUser = null;
var _gsLeague = '';
var _gsClub = '';

function openGoogleSetup(user) {
  _gsUser = user;
  _gsLeague = ''; _gsClub = '';
  $('gs-step1').style.display = '';
  $('gs-step2').classList.add('hidden');
  $('gs-step3').classList.add('hidden');
  $('gs-err1').textContent = '';
  // Pre-fill name if available
  if (user.displayName) {
    var clean = user.displayName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    if ($('gs-name')) $('gs-name').value = clean;
  }
  openMo('google-setup-mo');
}

function gsNext1() {
  var u   = $('gs-name').value.trim();
  var c   = $('gs-country').value;
  var err = $('gs-err1');
  err.textContent = '';
  if (!u) { err.textContent = 'Enter a username.'; return; }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(u)) { err.textContent = '3-20 chars, letters/numbers/underscore only.'; return; }
  if (!c) { err.textContent = 'Select your country.'; return; }
  var taken = Object.values(allPlayers).some(function (p) {
    return p.username && p.username.toLowerCase() === u.toLowerCase();
  });
  if (taken) { err.textContent = 'Username already taken.'; return; }
  $('gs-step1').style.display = 'none';
  $('gs-step2').classList.remove('hidden');
}

function gsBack1() {
  $('gs-step2').classList.add('hidden');
  $('gs-step1').style.display = '';
}

function gsSelectLeague(el) {
  document.querySelectorAll('.league-pick-opt').forEach(function (o) { o.classList.remove('selected'); });
  el.classList.add('selected');
  _gsLeague = el.getAttribute('data-lid');
  $('gs-league-val').value = _gsLeague;
}

function gsNext2() {
  var err = $('gs-err2');
  err.textContent = '';
  if (!_gsLeague) { err.textContent = 'Please select a league.'; return; }
  // Build club grid
  var takenClubs = Object.values(allPlayers)
    .filter(function (p) { return p.league === _gsLeague; })
    .map(function (p) { return p.club; });
  var clubs = ALL_CLUBS[_gsLeague] || [];
  var grid  = $('gs-club-grid');
  if (!grid) return;
  grid.innerHTML = clubs.map(function (club) {
    var isTaken = takenClubs.includes(club.name);
    return '<div class="club-opt' + (isTaken ? ' taken' : '') + '" '
      + (isTaken ? '' : 'onclick="gsPickClub(this,\'' + club.name + '\')"') + '>'
      + '<div class="club-opt-badge">'
      + (club.logo ? '<img src="' + club.logo + '" loading="lazy" onerror="this.style.display=\'none\'">' : '')
      + '</div>'
      + '<div class="club-opt-name">' + esc(club.name) + '</div>'
      + '<div class="club-opt-status">' + (isTaken ? '✗ Taken' : '✓ Free') + '</div>'
      + '</div>';
  }).join('');
  $('gs-step2').classList.add('hidden');
  $('gs-step3').classList.remove('hidden');
}

function gsBack2() {
  $('gs-step3').classList.add('hidden');
  $('gs-step2').classList.remove('hidden');
}

function gsPickClub(el, name) {
  document.querySelectorAll('#gs-club-grid .club-opt').forEach(function (o) { o.classList.remove('selected'); });
  el.classList.add('selected');
  _gsClub = name;
}

function gsConfirm() {
  var u   = $('gs-name').value.trim();
  var c   = $('gs-country').value;
  var err = $('gs-err3');
  err.textContent = '';
  if (!_gsClub)  { err.textContent = 'Please pick a club.'; return; }
  if (!_gsUser)  { err.textContent = 'Session expired. Please try again.'; return; }

  var btn = $('gs-confirm-btn');
  btn.textContent = 'Joining...'; btn.disabled = true;

  db.ref(DB.players + '/' + _gsUser.uid).set({
    uid:      _gsUser.uid,
    username: u,
    email:    _gsUser.email || '',
    country:  c,
    league:   _gsLeague,
    club:     _gsClub,
    avatar:   _gsUser.photoURL || '',
    bio:      '',
    joinedAt: Date.now(),
    lastSeen: Date.now(),
    banned:   false
  })
  .then(function () {
    btn.textContent = '✓ Join!'; btn.disabled = false;
    closeMo('google-setup-mo');
    toast('Welcome to eFootball Universe! 🎉');
    myProfile = {
      uid: _gsUser.uid,
      username: $('gs-name').value.trim(),
      email: _gsUser.email || '',
      country: $('gs-country').value,
      league: _gsLeague,
      club: _gsClub,
      avatar: _gsUser.photoURL || '',
      bio: '', joinedAt: Date.now(), lastSeen: Date.now(), banned: false
    };
    enterApp();
    setOnline();
    listenUnread();
    listenGlobalDMs();
    initRefereeSystem();
    listenMatchRooms();
    initSwap();
    // Auto-start league if now full (10 players)
    checkLeagueAutoStart(_gsLeague);
  })
  .catch(function (e) {
    err.textContent = 'Failed to save profile. Try again.';
    btn.textContent = '✓ Join!'; btn.disabled = false;
  });
}

// ── LOGOUT ────────────────────────────────────────────────────
function doLogout() {
  if (!auth) return;
  if (!confirm('Sign out?')) return;
  // Clear online presence
  if (me && db) {
    db.ref(DB.online + '/' + me.uid).remove();
    db.ref(DB.players + '/' + me.uid + '/lastSeen').set(Date.now());
  }
  auth.signOut().then(function () {
    myProfile = null; me = null;
    toast('Signed out.');
    goPage('home');
  });
}

// ── OPEN REPORT MODAL ─────────────────────────────────────────
function openReport(uid, uname) {
  if (!myProfile) { showLanding(); return; }
  if (uid === myProfile.uid) { toast("You can't report yourself.", 'error'); return; }
  $('rep-uid').value   = uid;
  $('rep-uname').value = uname;
  $('rep-who').textContent  = uname;
  $('rep-reason').value     = '';
  $('rep-details').value    = '';
  $('rep-err').textContent  = '';
  openMo('report-mo');
}

function submitReport() {
  var uid    = $('rep-uid').value;
  var uname  = $('rep-uname').value;
  var reason = $('rep-reason').value;
  var detail = $('rep-details').value.trim();
  var err    = $('rep-err');
  err.textContent = '';
  if (!reason) { err.textContent = 'Please select a reason.'; return; }
  if (!myProfile || !db) { err.textContent = 'You must be logged in.'; return; }
  var btn = $('rep-submit-btn');
  btn.textContent = 'Submitting...'; btn.disabled = true;
  db.ref(DB.reports).push({
    reportedUID:  uid,
    reportedName: uname,
    reporterUID:  myProfile.uid,
    reporterName: myProfile.username,
    reason:       reason,
    details:      detail,
    status:       'open',
    ts:           Date.now()
  })
  .then(function () {
    closeMo('report-mo');
    toast('Report submitted.');
    btn.textContent = 'Submit Report'; btn.disabled = false;
  })
  .catch(function () {
    err.textContent = 'Failed. Try again.';
    btn.textContent = 'Submit Report'; btn.disabled = false;
  });
}

// ── USER MODAL ────────────────────────────────────────────────
// ── USER MODAL — full profile view, clickable from anywhere ──
function openUserModal(uid) {
  var p = allPlayers[uid]; if (!p) return;
  var lg   = LGS[p.league] || {};
  var club = getClub(p.league, p.club);
  var content = $('user-mo-content'); if (!content) return;
  var isAdmin = me && me.email === ADMIN_EMAIL;
  var isSelf  = myProfile && myProfile.uid === uid;

  // Compute stats
  var ms    = Object.values(allMatches).filter(function(m){ return m.played&&(m.homeId===uid||m.awayId===uid); });
  var wins  = ms.filter(function(m){ return (m.homeId===uid&&m.hg>m.ag)||(m.awayId===uid&&m.ag>m.hg); }).length;
  var draws = ms.filter(function(m){ return m.hg===m.ag; }).length;
  var losses= ms.length-wins-draws;
  var gf    = ms.reduce(function(a,m){ return a+(m.homeId===uid?m.hg:m.ag); },0);
  var ga    = ms.reduce(function(a,m){ return a+(m.homeId===uid?m.ag:m.hg); },0);
  var pen   = allPenalties[uid]?Object.values(allPenalties[uid]).reduce(function(s,x){ return s+(x.pts||0); },0):0;
  var pts   = Math.max(0,wins*3+draws-pen);
  var table = computeStd(p.league);
  var rank  = table.findIndex(function(r){ return r.uid===uid; })+1;
  var form  = ms.slice(-5).map(function(m){
    var r=(m.homeId===uid&&m.hg>m.ag)||(m.awayId===uid&&m.ag>m.hg)?'W':m.hg===m.ag?'D':'L';
    var c=r==='W'?'#00ff88':r==='D'?'#ffe600':'#FF2882';
    return '<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:'+c+';color:#000;font-size:.56rem;font-weight:900;text-align:center;line-height:18px;margin:1px">'+r+'</span>';
  }).join('');

  content.innerHTML =
    '<div style="text-align:center;padding:.5rem 0 .7rem">'
    +'<div style="display:flex;justify-content:center;margin-bottom:.5rem">'+clubBadge(p.club,p.league,64)+'</div>'
    +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1.05rem">'+esc(p.username)+'</div>'
    +(rank>0?'<div style="display:inline-block;margin-top:.3rem;font-size:.62rem;font-weight:700;color:var(--gold);background:rgba(255,230,0,0.1);border:1px solid rgba(255,230,0,0.25);border-radius:8px;padding:2px 9px">#'+rank+' '+esc(lg.short||'')+'</div>':'')+'<br>'
    +'<div style="display:inline-block;margin-top:.25rem">'+lgBadge(p.league)+'</div>'
    +'<div style="font-size:.74rem;color:'+(club.color||'#888')+';margin-top:.2rem">'+esc(p.club)+'</div>'
    +'<div style="font-size:.62rem;color:var(--dim);margin-top:2px">'+esc(p.country||'')+' · '+fmtAgo(p.lastSeen)+'</div>'
    +(p.bio?'<div style="font-size:.72rem;color:var(--dim);margin-top:.4rem;font-style:italic;padding:0 .3rem">&ldquo;'+esc(p.bio)+'&rdquo;</div>':'')
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:.35rem;margin:.2rem 0 .5rem">'
    +[[pts,'PTS'],[ms.length,'PLAYED'],[wins,'WINS'],[draws,'DRAWS'],[losses,'LOSSES'],[gf+'-'+ga,'GOALS']].map(function(x){
        return '<div style="text-align:center;background:var(--card);border:1px solid var(--border);border-radius:8px;padding:.4rem .2rem">'
          +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.9rem;color:var(--cyan)">'+x[0]+'</div>'
          +'<div style="font-size:.52rem;color:var(--dim);margin-top:1px">'+x[1]+'</div></div>';
      }).join('')
    +'</div>'
    +(form?'<div style="text-align:center;margin-bottom:.5rem"><div style="font-size:.55rem;color:var(--dim);margin-bottom:.25rem">FORM</div>'+form+'</div>':'')
    +(typeof renderBadges==='function'?'<div style="text-align:center;margin-bottom:.5rem">'+renderBadges(uid,26)+'</div>':'')
    +'<div style="display:flex;gap:.38rem;justify-content:center;flex-wrap:wrap;padding-top:.5rem;border-top:1px solid var(--border)">'
    +(myProfile&&!isSelf
      ?'<button class="btn-sm btn-outline" onclick="closeMo(\'user-mo\');openDMWith(\''+uid+'\',\''+esc(p.username)+'\')">💬 DM</button>'
       +'<button class="btn-sm" style="background:rgba(255,40,130,0.12);border:1px solid rgba(255,40,130,0.3);color:var(--pink)" onclick="closeMo(\'user-mo\');openReport(\''+uid+'\',\''+esc(p.username)+'\')">🚩 Report</button>'
      :'')
    +(isSelf?'<button class="btn-sm btn-outline" onclick="closeMo(\'user-mo\');goPage(\'profile\')">Edit Profile</button>':'')
    +(isAdmin&&!isSelf
      ?'<button class="btn-sm" style="background:rgba(255,40,130,0.1);border:1px solid rgba(255,40,130,0.3);color:var(--pink)" onclick="closeMo(\'user-mo\');if(typeof openDeductModal===\'function\')openDeductModal(\'\',\''+uid+'\',\''+esc(p.username)+'\')">📉 Deduct</button>'
       +'<button class="btn-sm" style="background:rgba(255,107,0,0.1);border:1px solid rgba(255,107,0,0.3);color:#ff6b00" onclick="closeMo(\'user-mo\');banUser(\''+uid+'\',\''+esc(p.username)+'\')">Ban</button>'
      :'')
    +'</div>';
  openMo('user-mo');
}

// Called after new player joins — auto-start league if now full
function checkLeagueAutoStart(lid) {
  if (!db||!lid) return;
  setTimeout(function() {
    var leaguePlayers = Object.values(allPlayers).filter(function(p){ return p.league===lid; });
    var maxPlayers = (ALL_CLUBS[lid]||[]).length;
    if (leaguePlayers.length >= maxPlayers) {
      var hasFixtures = Object.values(allMatches).some(function(m){ return m.league===lid; });
      if (!hasFixtures && typeof autoScheduleForLeague==='function') {
        toast('League full! Auto-scheduling ' + (LGS[lid]||{n:lid}).n + '...');
        setTimeout(function(){ autoScheduleForLeague(lid); }, 1500);
      }
    }
  }, 2000);
}
