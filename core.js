// ============================================================
// CORE.JS — State, Helpers, Navigation, Firebase Boot
// ============================================================

// ── GLOBAL STATE ─────────────────────────────────────────────
var auth = null, db = null;
var me = null, myProfile = null;
var allPlayers  = {};
var allMatches  = {};
var allPenalties = {};
var allPolls    = {};
var uclSettings = {};
var uclPayments = {};

// UI state
var curLg        = 'epl';
var curFxFilter  = 'all';
var chatRoom     = 'global';
var chatOff      = null;
var typingOff    = null;
var typingTO     = null;
var pmOff        = null;
var pmUID        = null;
var unreadChat   = 0;
var unreadPM     = 0;
var onlineInterval = null;
var _globalDMsListening  = false;
var _unreadListening     = false;
var _lastNotifMsg        = {};
var matchRoomOff         = null;
var activeRoomKey        = null;
var matchRoomChatOff     = null;
var drawnClub            = null;
var _swapListening       = false;
var _swapRequests        = {};
var _refreshTimer        = null;
var _navLock             = false;

// ── SHORTHAND HELPERS ─────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function shuffle(a) {
  var b = a.slice();
  for (var i = b.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = b[i]; b[i] = b[j]; b[j] = t;
  }
  return b;
}

// ── DATE / TIME HELPERS ───────────────────────────────────────
function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
}
function fmtTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
}
function fmtFull(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}
function fmtAgo(ts) {
  if (!ts) return 'Never';
  var d = Date.now() - ts, m = Math.floor(d / 60000);
  if (m < 2)  return 'Online now';
  if (m < 60) return m + 'm ago';
  var h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  var dy = Math.floor(h / 24);
  if (dy === 1) return 'Yesterday';
  if (dy < 7)  return dy + 'd ago';
  return fmtDate(ts);
}
function lsColor(ts) {
  if (!ts) return '#555';
  var d = Date.now() - ts;
  if (d < 300000)   return '#00ff88';   // < 5 min  → green
  if (d < 3600000)  return '#ffe600';   // < 1 hour → yellow
  return '#555';
}
function dmKey(a, b) { return [a, b].sort().join('_'); }

// ── TOAST ─────────────────────────────────────────────────────
function toast(msg, type) {
  var e = $('toast');
  if (!e) return;
  e.textContent = msg;
  var isErr = (type === 'error');
  e.style.background = isErr ? 'rgba(255,40,130,0.18)' : 'rgba(0,212,255,0.12)';
  e.style.border      = '1.5px solid ' + (isErr ? '#FF2882' : '#00D4FF');
  e.style.color       = isErr ? '#FF2882' : '#00D4FF';
  e.style.opacity     = '1';
  e.style.transform   = 'translateY(0)';
  e.style.display     = 'block';
  clearTimeout(e._t);
  e._t = setTimeout(function () {
    e.style.opacity   = '0';
    e.style.transform = 'translateY(8px)';
    setTimeout(function () { e.style.display = 'none'; }, 300);
  }, 2800);
}

// ── MODALS ────────────────────────────────────────────────────
function openMo(id)  { var e = $(id); if (e) e.classList.add('active'); }
function closeMo(id) { var e = $(id); if (e) e.classList.remove('active'); }

// ── CLUB BADGE HELPERS ────────────────────────────────────────
function getClub(lid, name) {
  return (ALL_CLUBS[lid] || []).find(function (c) { return c.name === name; }) || { name: name, color: '#888', logo: '' };
}

function clubColor(name) {
  var lids = ['epl', 'laliga', 'seriea', 'ligue1'];
  for (var i = 0; i < lids.length; i++) {
    var c = getClub(lids[i], name);
    if (c && c.color && c.color !== '#888') return c.color;
  }
  // Fallback: deterministic color from name
  var h = 0;
  for (var j = 0; j < (name || '').length; j++) h = (h * 31 + name.charCodeAt(j)) & 0xFFFFFF;
  return '#' + h.toString(16).padStart(6, '0');
}

function clubBadge(name, lid, sz) {
  var club  = getClub(lid, name);
  var c     = club.color || '#888';
  var init  = (name || '?').split(' ').map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase();
  var s     = sz || 28;
  var style = 'width:' + s + 'px;height:' + s + 'px;border-radius:50%;background:' + c + '18;border:1.5px solid ' + c + '44;'
    + 'display:inline-flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;'
    + 'position:relative;font-size:' + (s * 0.3) + 'px;font-weight:800;color:' + c + ';vertical-align:middle';
  if (club.logo) {
    return '<div style="' + style + '" title="' + esc(name) + '">' + init
      + '<img src="' + club.logo + '" loading="lazy" decoding="async" '
      + 'style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:' + (s * 0.1) + 'px;background:#fff;opacity:0;transition:opacity .2s" '
      + 'onload="this.style.opacity=1" onerror="this.remove()">'
      + '</div>';
  }
  return '<div style="' + style + '" title="' + esc(name) + '">' + init + '</div>';
}

function lgBadge(lid) {
  var lg = LGS[lid] || {};
  return '<span class="lg-badge" style="background:' + lg.bg + ';color:' + lg.c + ';border:1px solid ' + lg.c + '44">' + lg.f + ' ' + lg.short + '</span>';
}

// ── LOADING SCREEN ────────────────────────────────────────────
// FIX: Show a loading screen immediately on page load.
// The app becomes visible the moment Firebase resolves (or times out).
// No more stuck blank/landing screen.
function showLoader() {
  var l = $('loader');
  if (l) l.style.display = 'flex';
}
function hideLoader() {
  var l = $('loader');
  if (!l) return;
  l.style.opacity = '0';
  setTimeout(function () { l.style.display = 'none'; }, 400);
}

// ── LANDING ───────────────────────────────────────────────────
function lTab(t) {
  document.querySelectorAll('.ltab').forEach(function (b, i) {
    b.classList.toggle('active', (t === 'in' && i === 0) || (t !== 'in' && i === 1));
  });
  var pin = $('l-in'), pup = $('l-up');
  if (pin) pin.classList.toggle('active', t === 'in');
  if (pup) pup.classList.toggle('active', t !== 'in');
}

function showLanding() {
  hideLoader();
  var l = $('landing');
  if (l) { l.classList.remove('landing-hidden'); l.classList.add('landing-visible'); }
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
}

function hideLanding() {
  var l = $('landing');
  if (l) { l.classList.add('landing-hidden'); l.classList.remove('landing-visible'); }
}

// ── ENTER APP ─────────────────────────────────────────────────
// FIX: Always show home page when entering app — no race condition
function enterApp() {
  hideLoader();
  hideLanding();
  // Always activate home page
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  var home = $('page-home');
  if (home) home.classList.add('active');
  // Sync bottom nav
  document.querySelectorAll('.nb').forEach(function (b) { b.classList.remove('active'); });
  var homeBtn = document.querySelector('.nb[data-page="home"]');
  if (homeBtn) homeBtn.classList.add('active');
  updateNav();
  updateDrawer();
  renderHomeStats();
  renderRecentRes();
  renderTopPlayers();
}

// ── NAVIGATION ────────────────────────────────────────────────
function goPage(name) {
  if (_navLock) return;
  _navLock = true;
  setTimeout(function () { _navLock = false; }, 250);

  hideLanding();
  document.querySelectorAll('.page').forEach(function (p) { p.classList.remove('active'); });
  document.querySelectorAll('.nb').forEach(function (b) { b.classList.remove('active'); });
  window.scrollTo(0, 0);

  var pg = $('page-' + name);
  if (pg) pg.classList.add('active');

  // Highlight matching nav button
  var nb = document.querySelector('.nb[data-page="' + name + '"]');
  if (nb) nb.classList.add('active');

  // Page-specific actions
  if (name === 'leagues')    { renderStd(curLg); }
  if (name === 'fixtures')   { renderFx(); }
  if (name === 'matchprep')  { renderMatchPrep(); renderMatchRooms(); renderSchedTimeline(); }
  if (name === 'ucl')        { renderUCL(); }
  if (name === 'polls')      { renderPolls(); setBadge('polls-badge', 0); }
  if (name === 'leaderboard'){ renderLeaderboard(); renderMyPredictions(); renderPredLeaderboard(); }
  if (name === 'referee')    { renderRefPanel(); setBadge('ref-badge', 0); }
  if (name === 'profile')    { renderProfile(); }
  if (name === 'admin')      { loadAdmin(); }
  if (name === 'pm') {
    var pw = $('pm-wrap'), pl = $('pm-locked');
    if (!myProfile) {
      if (pw) pw.style.display = 'none';
      if (pl) pl.classList.remove('hidden');
    } else {
      if (pw) pw.style.display = '';
      if (pl) pl.classList.add('hidden');
      unreadPM = 0; setBadge('pm-badge', 0); loadPMList();
    }
  }
  if (name === 'chat') {
    if (chatOff)   { chatOff();   chatOff   = null; }
    if (typingOff) { typingOff(); typingOff = null; }
    loadChat(); listenTyping();
    unreadChat = 0; setBadge('chat-badge', 0);
    var cr = $('cinp-row'), cl = $('chat-locked');
    if (myProfile) {
      if (cr) cr.classList.remove('hidden');
      if (cl) cl.classList.add('hidden');
    } else {
      if (cr) cr.classList.add('hidden');
      if (cl) cl.classList.remove('hidden');
    }
    setTimeout(function () { var b = $('chat-msgs'); if (b) b.scrollTop = b.scrollHeight; }, 200);
  }
}

// ── BADGE HELPER ─────────────────────────────────────────────
function setBadge(id, n) {
  var e = $(id); if (!e) return;
  if (n > 0) { e.textContent = n > 9 ? '9+' : n; e.classList.remove('hidden'); }
  else { e.classList.add('hidden'); }
}

// ── TOP NAV UPDATE ────────────────────────────────────────────
function updateNav() {
  var e = $('nav-right'); if (!e) return;
  var isAdmin = me && me.email === ADMIN_EMAIL;
  if (myProfile && myProfile.username) {
    e.innerHTML = '<span class="uchip" onclick="goPage(\'profile\')">' + esc(myProfile.username) + '</span>'
      + (isAdmin ? '<button class="btn-sm btn-outline" onclick="goPage(\'admin\')">Admin</button>' : '')
      + '<button class="btn-sm btn-outline" onclick="doLogout()">Out</button>';
    var h = $('home-cta');
    if (h) h.innerHTML = '<button class="btn-sm btn-accent" onclick="goPage(\'fixtures\')">Result</button>'
      + '<button class="btn-sm btn-outline" onclick="goPage(\'profile\')">Profile</button>';
    var af = $('add-fix-btn');   if (af) af.style.display = 'inline-flex';
    var sp = $('score-panel');   if (sp) sp.classList.remove('hidden');
    var da = $('drawer-admin-btn'); if (da) da.style.display = isAdmin ? 'flex' : 'none';
    var ds = $('drawer-signout-btn'); if (ds) ds.style.display = 'flex';
    var dl = $('drawer-login-btn');  if (dl) dl.style.display = 'none';
  } else {
    e.innerHTML = '<button class="btn-sm btn-outline" onclick="lTab(\'in\');showLanding()">Login</button>'
      + '<button class="btn-sm btn-accent" onclick="lTab(\'up\');showLanding()">Join</button>';
    var h = $('home-cta');
    if (h) h.innerHTML = '<button class="btn-sm btn-accent" onclick="lTab(\'up\');showLanding()">Join</button>';
    var af = $('add-fix-btn');   if (af) af.style.display = 'none';
    var sp = $('score-panel');   if (sp) sp.classList.add('hidden');
    var da = $('drawer-admin-btn'); if (da) da.style.display = 'none';
    var ds = $('drawer-signout-btn'); if (ds) ds.style.display = 'none';
    var dl = $('drawer-login-btn');  if (dl) dl.style.display = 'flex';
  }
}

// ── DRAWER ────────────────────────────────────────────────────
function openDrawer() {
  var d = $('drawer'), o = $('drawer-overlay'), h = $('hamburger');
  if (d) d.classList.add('open');
  if (o) o.classList.add('active');
  if (h) h.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  var d = $('drawer'), o = $('drawer-overlay'), h = $('hamburger');
  if (d) d.classList.remove('open');
  if (o) o.classList.remove('active');
  if (h) h.classList.remove('open');
  document.body.style.overflow = '';
}
function updateDrawer() {
  var dn  = $('drawer-name');
  var dcl = $('drawer-club-lg');
  var dav = $('drawer-avatar');
  if (myProfile && myProfile.username) {
    if (dn)  dn.textContent  = myProfile.username;
    if (dcl) dcl.textContent = myProfile.club + ' · ' + ((LGS[myProfile.league] || {}).short || '');
    if (dav) {
      if (myProfile.avatar && myProfile.avatar.length < 10) {
        dav.textContent  = myProfile.avatar;
        dav.style.fontSize = '1.4rem';
      } else if (myProfile.avatar && myProfile.avatar.startsWith('http')) {
        dav.innerHTML = '<img src="' + myProfile.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
      } else {
        dav.textContent = (myProfile.username || '?').charAt(0).toUpperCase();
      }
    }
  } else {
    if (dn)  dn.textContent  = 'Guest';
    if (dcl) dcl.textContent = '';
    if (dav) dav.textContent = '?';
  }
}

// ── ACTIVE PAGE ───────────────────────────────────────────────
function activePage() {
  var pages = ['home','leagues','fixtures','matchprep','ucl','polls','leaderboard','referee','chat','pm','profile','admin'];
  for (var i = 0; i < pages.length; i++) {
    var p = $('page-' + pages[i]);
    if (p && p.classList.contains('active')) return pages[i];
  }
  return 'home';
}

// ── REFRESH ───────────────────────────────────────────────────
function debouncedRefresh() {
  clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(refreshAll, 150);
}
function refreshAll() {
  renderHomeStats();
  var pg = activePage();
  if (pg === 'home')     { renderRecentRes(); renderTopPlayers(); }
  else if (pg === 'leagues')  renderStd(curLg);
  else if (pg === 'fixtures') renderFx();
  else if (pg === 'matchprep') { renderMatchPrep(); renderSchedTimeline(); }
  else if (pg === 'ucl')   renderUCL();
  else if (pg === 'polls') renderPolls();
}

// ── ONLINE PRESENCE ───────────────────────────────────────────
function setOnline() {
  if (!myProfile || !db) return;
  var ref = db.ref(DB.online + '/' + me.uid);
  ref.set({ name: myProfile.username, ts: Date.now() });
  ref.onDisconnect().remove();
  db.ref(DB.players + '/' + me.uid + '/lastSeen').set(Date.now());
  if (!onlineInterval) {
    onlineInterval = setInterval(function () {
      if (!myProfile || !db) return;
      db.ref(DB.online + '/' + me.uid).set({ name: myProfile.username, ts: Date.now() });
      db.ref(DB.players + '/' + me.uid + '/lastSeen').set(Date.now());
    }, 30000);
    setInterval(refreshAgoLabels, 30000);
  }
}

function refreshAgoLabels() {
  document.querySelectorAll('[data-lastseen]').forEach(function (el) {
    var ts = parseInt(el.getAttribute('data-lastseen') || '0');
    el.style.background = lsColor(ts);
    el.title = fmtAgo(ts);
  });
  document.querySelectorAll('[data-agospan]').forEach(function (el) {
    var ts = parseInt(el.getAttribute('data-agospan') || '0');
    el.textContent = fmtAgo(ts);
    el.style.color  = lsColor(ts);
  });
}

// ── SCROLL SHADOW ─────────────────────────────────────────────
window.addEventListener('scroll', function () {
  var tb = $('topbar');
  if (tb) tb.classList.toggle('scrolled', window.scrollY > 8);
}, { passive: true });

// ── VISIBILITY REFRESH ────────────────────────────────────────
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState === 'visible' && db) {
    setTimeout(debouncedRefresh, 300);
  }
});

// ── COPY CODE ─────────────────────────────────────────────────
function copyCode(code) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(function () { toast('Copied: ' + code); });
  } else {
    toast('Code: ' + code);
  }
}

// ── COMPATIBILITY ALIASES ─────────────────────────────────────
// Keep these so any old references in other files still work
function go(name) { goPage(name); }
function updateBadge(id, n) { setBadge(id, n); }
function hideLoadingScreen() { hideLoader(); }

// ── SAFE STUBS ────────────────────────────────────────────────
// These are defined in their own files. Stubbed here so core
// doesn't throw if a file loads out of order.
function renderStd(l)            { /* pages.js */ }
function renderFx()              { /* pages.js */ }
function renderHomeStats()       { /* pages.js */ }
function renderRecentRes()       { /* pages.js */ }
function renderTopPlayers()      { /* pages.js */ }
function renderMatchPrep()       { /* pages.js */ }
function renderSchedTimeline()   { /* pages.js */ }
function renderUCL()             { /* ucl.js    */ }
function renderPolls()           { /* features.js */ }
function renderLeaderboard()     { /* features.js */ }
function renderMyPredictions()   { /* features.js */ }
function renderPredLeaderboard() { /* features.js */ }
function renderRefPanel()        { /* referee.js */ }
function renderProfile()         { /* features.js */ }
function renderMatchRooms()      { /* matchroom.js */ }
function loadAdmin()             { /* admin.js  */ }
function loadPMList()            { /* chat.js   */ }
function loadChat()              { /* chat.js   */ }
function listenTyping()          { /* chat.js   */ }
function listenUnread()          { /* chat.js   */ }
function listenGlobalDMs()       { /* chat.js   */ }
function initRefereeSystem()     { /* referee.js */ }
function listenMatchRooms()      { /* matchroom.js */ }
function initSwap()              { /* swap.js   */ }
function checkPendingAutoApprovals() { /* referee.js */ }
function listenRefDuties()       { /* referee.js */ }
function openGoogleSetup(user)   { /* auth.js   */ }
function doLogout()              { /* auth.js   */ }
function renderPollBadge()       { /* features.js */ }

// ── FIREBASE INIT ─────────────────────────────────────────────
function initApp() {
  // Show loader immediately — user sees something right away
  showLoader();

  // Load Paystack script in background
  (function () {
    var s = document.createElement('script');
    s.src = 'https://js.paystack.co/v2/inline.js';
    s.async = true;
    document.head.appendChild(s);
  })();

  // Init Firebase
  if (!firebase.apps.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
  }
  auth = firebase.auth();
  db   = firebase.database();

  // FIX: Set a hard timeout — if Firebase doesn't respond in 6s,
  // show the app anyway so the user is never stuck
  var authResolved = false;
  var authTimeout = setTimeout(function () {
    if (!authResolved) {
      console.warn('Auth timeout — entering app as guest');
      authResolved = true;
      enterApp();
    }
  }, 6000);

  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .catch(function () {}) // ignore persistence errors
    .then(function () { startListeners(authTimeout, function () { authResolved = true; }); });
}

// ── FIREBASE LISTENERS ────────────────────────────────────────
function startListeners(authTimeout, onResolved) {
  // Live data
  db.ref(DB.players).on('value', function (s) {
    allPlayers = s.val() || {};
    debouncedRefresh();
  });
  db.ref(DB.matches).on('value', function (s) {
    allMatches = s.val() || {};
    debouncedRefresh();
    var pg = activePage();
    if (pg === 'fixtures') renderFx();
    if (pg === 'matchprep') { renderMatchPrep(); renderSchedTimeline(); }
  });

  // Non-critical data — deferred 2s so initial load is fast
  setTimeout(function () {
    db.ref(DB.online).on('value', function (s) {
      var e = $('online-count');
      if (e) e.textContent = Object.keys(s.val() || {}).length;
    });
    db.ref(DB.penalties).on('value', function (s) {
      allPenalties = s.val() || {};
      if (activePage() === 'leagues') renderStd(curLg);
    });
    db.ref(DB.polls).on('value', function (s) {
      allPolls = s.val() || {};
      if (activePage() === 'polls') renderPolls();
      renderPollBadge();
    });
    db.ref(DB.uclSet).on('value', function (s) {
      uclSettings = s.val() || {};
      if (activePage() === 'ucl') renderUCL();
    });
    db.ref(DB.uclPay).on('value', function (s) {
      uclPayments = s.val() || {};
      if (activePage() === 'ucl') renderUCL();
    });
  }, 2000);

  // Auth state — the ONE place that controls guest vs logged-in
  auth.onAuthStateChanged(function (user) {
    // Cancel the safety timeout — auth responded
    if (authTimeout) clearTimeout(authTimeout);
    if (onResolved)  onResolved();

    me = user;

    if (user) {
      // Check if this user has a profile in the database
      db.ref(DB.players + '/' + user.uid).once('value', function (s) {
        var data = s.val();

        if (!data || !data.username) {
          // New Google user who needs to complete profile
          if (user.providerData && user.providerData[0] && user.providerData[0].providerId === 'google.com') {
            hideLoader();
            if (typeof openGoogleSetup === 'function') openGoogleSetup(user);
            else showLanding();
          } else {
            // Email user with no profile — show landing
            hideLoader();
            showLanding();
          }
          return;
        }

        // Existing user — enter app
        myProfile = data;
        enterApp();

        // Live profile updates
        db.ref(DB.players + '/' + user.uid).on('value', function (s2) {
          var d2 = s2.val();
          if (d2 && d2.username) myProfile = d2;
          updateNav();
          updateDrawer();
        });

        // Boot user-specific features
        setOnline();
        listenUnread();
        listenGlobalDMs();
        initRefereeSystem();
        listenMatchRooms();
        initSwap();
        initPushNotifications();
        // New listeners
        if (typeof listenRedDots === 'function')  listenRedDots();
        if (typeof listenRoomCodes === 'function') listenRoomCodes();
        if (typeof listenNotifBadge === 'function') listenNotifBadge();
        if (typeof listenBroadcast === 'function') listenBroadcast();
        // Show referee drawer btn only when needed
        checkRefereeDuties();

      }, function () {
        // DB read error — still enter app as guest
        hideLoader();
        enterApp();
      });

    } else {
      // Logged out / no session
      myProfile = null;
      me = null;
      enterApp();
    }

  }, function (err) {
    // Auth error — still enter app
    console.error('Auth error:', err);
    if (authTimeout) clearTimeout(authTimeout);
    enterApp();
  });
}

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
function initPushNotifications() {
  if (!myProfile || !db) return;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
  if (Notification.permission === 'denied') return;

  Notification.requestPermission().then(function (permission) {
    if (permission !== 'granted') return;
    // FCM token registration happens in firebase-messaging-sw.js
    // For now we just store the permission state
    db.ref(DB.players + '/' + me.uid + '/notifPermission').set(true);
  });
}

// Send an in-app notification to a specific user via Firebase
function sendNotif(toUID, payload) {
  if (!db || !toUID) return;
  db.ref(DB.notifs + '/' + toUID).push({
    title:   payload.title   || 'eFootball Universe',
    body:    payload.body    || '',
    icon:    payload.icon    || '⚽',
    link:    payload.link    || '',
    ts:      Date.now(),
    read:    false
  });
}

// Listen for incoming notifications for current user
var _notifOff = null;
function listenNotifs() {
  if (!myProfile || !db || _notifOff) return;
  var ref = db.ref(DB.notifs + '/' + me.uid).orderByChild('ts').limitToLast(20);
  var handler = ref.on('child_added', function (s) {
    var n = s.val();
    if (!n || n.read) return;
    // Mark as read
    s.ref.update({ read: true });
    // Show in-app banner
    showNotifBanner(n);
  });
  _notifOff = function () { ref.off('child_added', handler); };
}

function showNotifBanner(n) {
  var wrap = $('notif-wrap');
  if (!wrap) return;
  var div = document.createElement('div');
  div.className = 'notif-banner';
  div.innerHTML = '<span class="notif-icon">' + esc(n.icon || '⚽') + '</span>'
    + '<div class="notif-body"><div class="notif-title">' + esc(n.title) + '</div>'
    + '<div class="notif-msg">' + esc(n.body) + '</div></div>'
    + '<button class="notif-close" onclick="this.parentNode.remove()">✕</button>';
  wrap.appendChild(div);
  // Auto-dismiss after 5s
  setTimeout(function () { if (div.parentNode) div.remove(); }, 5000);
}

// ── eFootball DEEP LINK ───────────────────────────────────────
function launchEfootball() {
  var ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/.test(ua)) {
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = 'efootball://';
    document.body.appendChild(iframe);
    setTimeout(function () {
      document.body.removeChild(iframe);
      window.location.href = 'https://apps.apple.com/app/efootball-2024/id1448787484';
    }, 2500);
  } else if (/Android/.test(ua)) {
    window.open('https://play.google.com/store/apps/details?id=com.konami.efootball.android', '_blank');
  } else {
    openMo('efootball-links-mo');
  }
}

// ── REFEREE DRAWER VISIBILITY ────────────────────────────────
function checkRefereeDuties() {
  if (!myProfile || !db) return;
  db.ref(DB.matches).orderByChild('refereeUID').equalTo(myProfile.uid).on('value', function(s) {
    var duties = Object.values(s.val() || {}).filter(function(m) {
      return !m.played || m.awayVerifying;
    }).length;
    var btn = document.getElementById('drawer-ref-btn');
    if (btn) btn.style.display = duties > 0 ? 'flex' : 'none';
    setBadge('ref-badge', duties);
  });
}

// ── NOTIFICATIONS PAGE STUB (defined in features.js) ─────────
function renderNotifications() {
  var pg = document.getElementById('page-notifications');
  if (!pg) return;
  pg.innerHTML = '<div class="card empty" style="margin-top:1rem">Loading...</div>';
}
