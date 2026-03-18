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

  auth.createUserWithEmailAndPassword(em, pw)
    .then(function (cred) {
      var uid = cred.user.uid;
      return db.ref(DB.players + '/' + uid).set({
        uid:      uid,
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
      });
    })
    .then(function () {
      btn.textContent = '✓ Confirm'; btn.disabled = false;
      toast('Welcome to eFootball Universe! 🎉');
      // Reset form
      $('ru-name').value = ''; $('ru-em').value = ''; $('ru-pw').value = '';
      $('ru-country').value = ''; $('ru-league').value = '';
      $('reg-step3').classList.add('hidden');
      $('reg-step1').style.display = '';
      drawnClub = null;
    })
    .catch(function (e) {
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

// ── USER MODAL — full bottom sheet ───────────────────────────
function openUserModal(uid) {
  var p = allPlayers[uid]; if (!p) return;
  var club  = getClub(p.league, p.club);
  var lg    = LGS[p.league] || {};
  var isMine = myProfile && myProfile.uid === uid;

  // Stats
  var ms     = Object.values(allMatches).filter(function(m){ return m.played&&(m.homeId===uid||m.awayId===uid); });
  var wins   = ms.filter(function(m){ return (m.homeId===uid&&m.hg>m.ag)||(m.awayId===uid&&m.ag>m.hg); }).length;
  var draws  = ms.filter(function(m){ return m.hg===m.ag; }).length;
  var losses = ms.length - wins - draws;
  var pen    = allPenalties[uid] ? Object.values(allPenalties[uid]).reduce(function(s,x){ return s+(x.pts||0); },0) : 0;
  var pts    = Math.max(0, wins*3+draws-pen);
  var table  = computeStd(p.league);
  var rank   = table.findIndex(function(r){ return r.uid===uid; })+1;
  var last5  = ms.slice(-5).map(function(m){
    var r=(m.homeId===uid&&m.hg>m.ag)||(m.awayId===uid&&m.ag>m.hg)?'w':m.hg===m.ag?'d':'l';
    return '<span class="fd '+r+'"></span>';
  }).join('');

  // H2H
  var h2hHtml = '';
  if (myProfile && myProfile.uid !== uid) {
    var h2h = ms.filter(function(m){
      return (m.homeId===uid&&m.awayId===myProfile.uid)||(m.awayId===uid&&m.homeId===myProfile.uid);
    });
    if (h2h.length) {
      var hw=0,aw=0,hd=0;
      h2h.forEach(function(m){
        if(m.hg>m.ag){if(m.homeId===uid)hw++;else aw++;}
        else if(m.hg<m.ag){if(m.awayId===uid)hw++;else aw++;}
        else hd++;
      });
      h2hHtml = '<div style="background:rgba(255,255,255,0.04);border-radius:10px;padding:.6rem;margin:.5rem 0;text-align:center">'
        +'<div style="font-size:.6rem;color:var(--dim);margin-bottom:.4rem">HEAD TO HEAD</div>'
        +'<div style="display:flex;justify-content:space-around">'
        +'<div><div style="font-family:Orbitron,sans-serif;font-size:1.1rem;font-weight:900;color:var(--cyan)">'+hw+'</div><div style="font-size:.6rem;color:var(--dim)">'+esc(p.username)+'</div></div>'
        +'<div><div style="font-family:Orbitron,sans-serif;font-size:1.1rem;font-weight:900;color:var(--dim)">'+hd+'</div><div style="font-size:.6rem;color:var(--dim)">Draws</div></div>'
        +'<div><div style="font-family:Orbitron,sans-serif;font-size:1.1rem;font-weight:900;color:var(--pink)">'+aw+'</div><div style="font-size:.6rem;color:var(--dim)">'+esc(myProfile.username)+'</div></div>'
        +'</div></div>';
    }
  }

  // Match history
  var histHtml = ms.length ? '<div style="margin-top:.2rem">'
    +'<div style="font-family:Orbitron,sans-serif;font-size:.58rem;color:var(--dim);letter-spacing:1.5px;margin-bottom:.5rem">RECENT MATCHES</div>'
    +ms.slice(-5).reverse().map(function(m){
      var opp  = allPlayers[m.homeId===uid?m.awayId:m.homeId];
      var myG  = m.homeId===uid?m.hg:m.ag;
      var oppG = m.homeId===uid?m.ag:m.hg;
      var res  = myG>oppG?'W':myG===oppG?'D':'L';
      var rc   = res==='W'?'var(--green)':res==='D'?'var(--gold)':'var(--pink)';
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.38rem 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:.76rem">'
        +'<span style="color:var(--dim);font-size:.65rem">vs</span>'
        +'<span style="font-weight:600;flex:1;padding:0 .4rem">'+esc(opp?opp.username:'?')+'</span>'
        +'<span style="font-family:Orbitron,sans-serif;font-size:.78rem;color:var(--green);margin-right:.5rem">'+myG+'-'+oppG+'</span>'
        +'<span style="font-weight:700;color:'+rc+';min-width:14px;text-align:center">'+res+'</span>'
        +'</div>';
    }).join('')+'</div>' : '';

  var el = $('user-mo-content'); if (!el) return;
  el.innerHTML =
    '<div style="background:linear-gradient(135deg,rgba(0,212,255,0.1),rgba(0,255,133,0.06));padding:1.4rem 1rem 1rem;text-align:center">'
    +'<div style="width:72px;height:72px;border-radius:50%;border:3px solid '+(club.color||'var(--cyan)')+';background:rgba(0,0,0,0.3);margin:0 auto .7rem;overflow:hidden;display:flex;align-items:center;justify-content:center">'
    +(p.avatar&&p.avatar.startsWith('http')
      ?'<img src="'+p.avatar+'" style="width:100%;height:100%;object-fit:cover">'
      :(p.avatar&&p.avatar.length<10?'<span style="font-size:2rem">'+p.avatar+'</span>'
        :'<span style="font-family:Orbitron,sans-serif;font-size:1.6rem;font-weight:900;color:var(--cyan)">'+(p.username||'?').charAt(0).toUpperCase()+'</span>'))
    +'</div>'
    +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1rem;margin-bottom:.25rem">'+esc(p.username||'')+'</div>'
    +(rank>0?'<div style="font-size:.65rem;color:var(--gold);margin-bottom:.3rem">#'+rank+' in '+esc(lg.short||'')+'</div>':'')
    +'<div style="display:flex;align-items:center;justify-content:center;gap:.4rem;flex-wrap:wrap;margin-bottom:.3rem">'
    +clubBadge(p.club,p.league,18)
    +'<span style="font-size:.7rem;color:'+(club.color||'#aaa')+'">'+esc(p.club)+'</span>'
    +'<span style="font-size:.65rem;color:var(--dim)">'+esc(p.country||'')+'</span>'
    +'</div>'
    +(p.bio?'<div style="font-size:.72rem;color:var(--dim);font-style:italic">"'+esc(p.bio)+'"</div>':'')
    +'<div style="font-size:.6rem;color:var(--dim);margin-top:.3rem">'+fmtAgo(p.lastSeen)+'</div>'
    +'</div>'
    +'<div style="display:grid;grid-template-columns:repeat(5,1fr);padding:.7rem .8rem;border-bottom:1px solid var(--border)">'
    +[{v:pts,l:'PTS'},{v:ms.length,l:'P'},{v:wins,l:'W'},{v:draws,l:'D'},{v:losses,l:'L'}].map(function(s){
      return '<div style="text-align:center"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.88rem;color:var(--cyan)">'+s.v+'</div><div style="font-size:.55rem;color:var(--dim)">'+s.l+'</div></div>';
    }).join('')+'</div>'
    +(last5?'<div style="display:flex;align-items:center;gap:.4rem;padding:.5rem .8rem;border-bottom:1px solid var(--border)"><span style="font-size:.62rem;color:var(--dim)">Form</span>'+last5+'</div>':'')
    +'<div style="padding:.6rem .8rem;border-bottom:1px solid var(--border)">'
    +'<div style="font-family:Orbitron,sans-serif;font-size:.58rem;color:var(--dim);letter-spacing:1.5px;margin-bottom:.4rem">BADGES</div>'
    +(typeof renderBadges==='function'?renderBadges(uid,30):'<span style="font-size:.7rem;color:var(--dim)">No badges yet</span>')
    +'</div>'
    +(h2hHtml?'<div style="padding:.5rem .8rem;border-bottom:1px solid var(--border)">'+h2hHtml+'</div>':'')
    +(histHtml?'<div style="padding:.6rem .8rem;border-bottom:1px solid var(--border)">'+histHtml+'</div>':'')
    +'<div style="display:flex;gap:.5rem;padding:.8rem;flex-wrap:wrap">'
    +(myProfile&&myProfile.uid!==uid
      ?'<button class="btn-primary" style="flex:1" onclick="closeMo('user-mo');openDMWith(''+uid+'',''+esc(p.username)+'')">Message</button>'
       +'<button class="btn-secondary" style="flex:1" onclick="closeMo('user-mo');openReport(''+uid+'',''+esc(p.username)+'')">Report</button>'
      :(isMine?'<button class="btn-primary" style="flex:1" onclick="closeMo('user-mo');goPage('profile')">My Profile</button>':''))
    +'</div>';

  openMo('user-mo');
}
