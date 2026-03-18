// ============================================================
// CHAT.JS — Full Messenger: DMs + League Chat + Match Rooms
// ============================================================

var chatTab          = 'dms';
var activeDMUID      = null;
var activeDMKey      = null;
var dmListOff        = null;
var leagueChatOff    = null;
var roomChatOff      = null;
var activeRoomId     = null;
var _dmUnreadGroups  = {};

// ── OPEN MESSENGER ────────────────────────────────────────────
function openMessenger(tab) {
  chatTab = tab || 'dms';
  goPage('chat');
}

// ── RENDER MESSENGER (called by goPage) ───────────────────────
function renderMessenger() {
  var pg = $('page-chat');
  if (!pg) return;
  hideFab();
  pg.innerHTML =
    '<div class="msng-wrap">'
    + '<div class="msng-header">'
    + '<button class="msng-back" onclick="msngBack()">&#8592;</button>'
    + '<div class="msng-title">Messages</div>'
    + '<button class="msng-new" onclick="openMo(\'new-dm-mo\')">&#43;</button>'
    + '</div>'
    + '<div class="msng-tabs">'
    + '<button class="msng-tab' + (chatTab==='dms'?' active':'') + '" onclick="switchMsngTab(\'dms\')">DMs</button>'
    + '<button class="msng-tab' + (chatTab==='league'?' active':'') + '" onclick="switchMsngTab(\'league\')">League</button>'
    + '<button class="msng-tab' + (chatTab==='rooms'?' active':'') + '" onclick="switchMsngTab(\'rooms\')">Match Rooms</button>'
    + '</div>'
    + '<div id="msng-content" class="msng-content"></div>'
    + '</div>';
  renderMsngTab(chatTab);
}

function switchMsngTab(tab) {
  chatTab = tab;
  document.querySelectorAll('.msng-tab').forEach(function(b, i) {
    b.classList.toggle('active', (tab==='dms'&&i===0)||(tab==='league'&&i===1)||(tab==='rooms'&&i===2));
  });
  if (leagueChatOff) { leagueChatOff(); leagueChatOff = null; }
  if (roomChatOff)   { roomChatOff();   roomChatOff   = null; }
  if (dmListOff)     { dmListOff();     dmListOff     = null; }
  activeDMUID = null; activeRoomId = null;
  renderMsngTab(tab);
}

function renderMsngTab(tab) {
  if (tab === 'dms')    renderDMList();
  if (tab === 'league') renderLeagueChat();
  if (tab === 'rooms')  renderRoomsList();
}

function msngBack() {
  if (activeDMUID || activeRoomId) {
    if (dmListOff)   { dmListOff();   dmListOff   = null; }
    if (roomChatOff) { roomChatOff(); roomChatOff = null; }
    activeDMUID = null; activeRoomId = null;
    renderMsngTab(chatTab);
  } else {
    showFab();
    goPage('home');
  }
}

// ── DM LIST ───────────────────────────────────────────────────
function renderDMList() {
  var el = $('msng-content'); if (!el) return;
  if (!myProfile) {
    el.innerHTML = '<div class="msng-empty">Login to view messages</div>'; return;
  }
  el.innerHTML = '<div class="msng-list-wrap"><div id="dm-conv-list"><div class="msng-loading">Loading...</div></div></div>';
  loadDMConvList();
}

function loadDMConvList() {
  var el = $('dm-conv-list'); if (!el || !db) return;
  db.ref(DB.dmMeta).orderByChild('participants/' + me.uid).equalTo(true).once('value', function(s) {
    var convs = [];
    Object.entries(s.val() || {}).forEach(function(kv) {
      var key = kv[0], data = kv[1];
      var parts    = Object.keys(data.participants || {});
      var otherUID = parts.find(function(u) { return u !== me.uid; });
      if (!otherUID) return;
      convs.push({ key:key, other:allPlayers[otherUID], otherUID:otherUID, lastMsg:data.lastMsg||'', lastTs:data.lastTs||0 });
    });
    convs.sort(function(a,b) { return b.lastTs - a.lastTs; });
    if (!convs.length) {
      el.innerHTML = '<div class="msng-empty">No conversations yet.<br><button class="btn-xs" style="margin-top:.8rem" onclick="openMo(\'new-dm-mo\')">Start a conversation</button></div>'; return;
    }
    el.innerHTML = convs.map(function(c) {
      var name     = c.other ? c.other.username : 'Unknown';
      var club     = c.other ? getClub(c.other.league, c.other.club) : {};
      var hasUnread = _dmUnreadGroups[c.key];
      return '<div class="msng-conv-row" onclick="openDMThread(\'' + c.otherUID + '\',\'' + esc(name) + '\')">'
        + '<div class="msng-av" style="background:' + (club.color||'#333') + '18;border:1.5px solid ' + (club.color||'#444') + '44">'
        + (c.other && c.other.avatar && c.other.avatar.startsWith('http')
          ? '<img src="' + c.other.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
          : esc(name.charAt(0).toUpperCase()))
        + (hasUnread ? '<span class="msng-av-dot"></span>' : '')
        + '</div>'
        + '<div class="msng-conv-info">'
        + '<div class="msng-conv-name">' + esc(name) + '</div>'
        + '<div class="msng-conv-last' + (hasUnread?' unread':'') + '">' + esc((c.lastMsg||'').slice(0,50)) + '</div>'
        + '</div>'
        + '<div class="msng-conv-meta">'
        + '<div class="msng-conv-time">' + (c.lastTs ? fmtAgo(c.lastTs) : '') + '</div>'
        + (hasUnread ? '<div class="msng-unread-dot"></div>' : '')
        + '</div>'
        + '</div>';
    }).join('');
  });
}

// ── DM THREAD ─────────────────────────────────────────────────
function openDMThread(uid, uname) {
  activeDMUID = uid;
  var dk = dmKey(me.uid, uid);
  activeDMKey = dk;
  var el = $('msng-content'); if (!el) return;
  delete _dmUnreadGroups[dk];
  updateFabBadge();
  if (db) db.ref(DB.dmUnread + '/' + me.uid + '/' + dk).set(0);

  el.innerHTML =
    '<div class="msng-thread-wrap">'
    + '<div class="msng-thread-header">'
    + '<button class="msng-back-sm" onclick="activeDMUID=null;if(dmListOff){dmListOff();dmListOff=null;}renderDMList()">&#8592;</button>'
    + '<div class="msng-thread-name">' + esc(uname) + '</div>'
    + '<button class="msng-view-btn" onclick="openUserModal(\'' + uid + '\')">&#128100;</button>'
    + '</div>'
    + '<div id="msng-msgs" class="msng-msgs"></div>'
    + '<div class="msng-inp-row">'
    + '<input id="msng-inp" type="text" maxlength="400" placeholder="Message..." onkeydown="if(event.key===\'Enter\')sendDM()">'
    + '<button class="msng-send" onclick="sendDM()">&#10148;</button>'
    + '</div>'
    + '</div>';

  var meta = { lastTs: Date.now() };
  meta['participants/' + me.uid] = true;
  meta['participants/' + uid]    = true;
  if (db) db.ref(DB.dmMeta + '/' + dk).update(meta);

  if (dmListOff) { dmListOff(); dmListOff = null; }
  if (!db) return;
  var ref     = db.ref(DB.dm + '/' + dk).limitToLast(60);
  var handler = ref.on('value', function(s) {
    var arr = Object.values(s.val() || {}).sort(function(a,b) { return a.ts - b.ts; });
    var box = $('msng-msgs'); if (!box) return;
    var atBot = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.innerHTML = arr.map(function(m) {
      if (m.system) return '<div class="msng-sys">' + esc(m.text) + '</div>';
      var mine = m.from === me.uid;
      return '<div class="msng-msg ' + (mine?'mine':'other') + '">'
        + '<div class="msng-bubble">' + esc(m.text) + '</div>'
        + '<div class="msng-time">' + fmtTime(m.ts) + '</div>'
        + '</div>';
    }).join('');
    if (atBot) box.scrollTop = box.scrollHeight;
  });
  dmListOff = function() { ref.off('value', handler); };
  setTimeout(function() { var i = $('msng-inp'); if (i) i.focus(); }, 300);
}

function sendDM() {
  if (!myProfile || !activeDMUID || !db) return;
  var inp = $('msng-inp'); if (!inp) return;
  var text = inp.value.trim(); if (!text) return;
  inp.value = '';
  var dk = dmKey(me.uid, activeDMUID);
  db.ref(DB.dm + '/' + dk).push({ from:me.uid, fromName:myProfile.username, text:text, ts:Date.now() });
  db.ref(DB.dmMeta + '/' + dk).update({ lastMsg:text, lastTs:Date.now(), ['participants/'+me.uid]:true, ['participants/'+activeDMUID]:true });
  db.ref(DB.dmUnread + '/' + activeDMUID + '/' + dk).transaction(function(v) { return (v||0)+1; });
  sendNotif(activeDMUID, { title:myProfile.username, body:text, icon:'msg' });
}

// ── LEAGUE CHAT ───────────────────────────────────────────────
function renderLeagueChat() {
  var el = $('msng-content'); if (!el) return;
  if (!myProfile) { el.innerHTML = '<div class="msng-empty">Login to join league chat</div>'; return; }
  var lg = LGS[myProfile.league] || {};
  el.innerHTML =
    '<div class="msng-thread-wrap">'
    + '<div class="msng-thread-header">'
    + '<div class="msng-thread-name">' + lg.f + ' ' + esc(lg.n||'League') + '</div>'
    + '<div class="msng-online-pill"><span class="online-dot-sm"></span><span id="online-count2">-</span></div>'
    + '</div>'
    + '<div id="msng-msgs" class="msng-msgs"></div>'
    + '<div class="msng-inp-row">'
    + '<input id="msng-inp" type="text" maxlength="400" placeholder="Message league..." onkeydown="if(event.key===\'Enter\')sendLeagueMsg()">'
    + '<button class="msng-send" onclick="sendLeagueMsg()">&#10148;</button>'
    + '</div>'
    + '</div>';

  if (leagueChatOff) { leagueChatOff(); leagueChatOff = null; }
  var room    = 'league_' + myProfile.league;
  var ref     = db.ref(DB.chat + '/' + room).limitToLast(80);
  var handler = ref.on('value', function(s) {
    var arr  = Object.values(s.val() || {}).sort(function(a,b) { return a.ts - b.ts; });
    var box  = $('msng-msgs'); if (!box) return;
    var atBot = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    var lastUID = '', lastTS = 0, GROUP_GAP = 5*60*1000, html = '';
    arr.forEach(function(m) {
      if (m.system) { html += '<div class="msng-sys">' + esc(m.text||'') + '</div>'; lastUID=''; return; }
      var mine     = myProfile && m.uid === myProfile.uid;
      var newGroup = m.uid !== lastUID || (m.ts - lastTS) > GROUP_GAP;
      lastUID = m.uid; lastTS = m.ts;
      var club = getClub(m.league||myProfile.league, m.club||'');
      if (newGroup && !mine) {
        html += '<div class="msng-sender">'
          + '<div class="msng-av-sm" style="background:' + (club.color||'#333') + '18;border:1px solid ' + (club.color||'#444') + '44">'
          + esc((m.username||'?').charAt(0).toUpperCase()) + '</div>'
          + '<span>' + esc(m.username||'') + '</span></div>';
      }
      html += '<div class="msng-msg ' + (mine?'mine':'other') + '">'
        + '<div class="msng-bubble">' + esc(m.text||'') + '</div>'
        + '<div class="msng-time">' + fmtTime(m.ts) + '</div>'
        + '</div>';
    });
    box.innerHTML = html;
    if (atBot) box.scrollTop = box.scrollHeight;
  });
  leagueChatOff = function() { ref.off('value', handler); };
  setTimeout(function() { var i = $('msng-inp'); if (i) i.focus(); }, 300);
}

function sendLeagueMsg() {
  if (!myProfile || !db) return;
  var inp = $('msng-inp'); if (!inp) return;
  var text = inp.value.trim(); if (!text) return;
  inp.value = '';
  db.ref(DB.chat + '/league_' + myProfile.league).push({
    uid:me.uid, username:myProfile.username, club:myProfile.club,
    league:myProfile.league, text:text, ts:Date.now()
  });
}

// ── MATCH ROOMS LIST ──────────────────────────────────────────
function renderRoomsList() {
  var el = $('msng-content'); if (!el) return;
  if (!myProfile) { el.innerHTML = '<div class="msng-empty">Login to view match rooms</div>'; return; }
  var uid   = myProfile.uid;
  var rooms = Object.values(allMatches).filter(function(m) {
    return !m.played && (m.homeId===uid || m.awayId===uid || m.refereeUID===uid);
  });
  if (!rooms.length) {
    el.innerHTML = '<div class="msng-empty">No active match rooms.<br><span style="font-size:.7rem;color:var(--dim)">Rooms appear when fixtures are scheduled.</span></div>'; return;
  }
  el.innerHTML = '<div class="msng-list-wrap">' + rooms.map(function(m) {
    var hp = allPlayers[m.homeId], ap = allPlayers[m.awayId]; if (!hp||!ap) return '';
    var lg    = LGS[m.league]||{};
    var isRef = m.refereeUID === uid;
    var role  = isRef ? 'Referee' : m.homeId===uid ? 'Home' : 'Away';
    var roleC = isRef ? 'var(--cyan)' : m.homeId===uid ? 'var(--green)' : 'var(--gold)';
    return '<div class="msng-room-row" onclick="openRoomChat(\'' + m.id + '\')">'
      + clubBadge(hp.club, m.league, 22)
      + '<div class="msng-room-info">'
      + '<div class="msng-room-name">' + esc(hp.username) + ' vs ' + esc(ap.username) + '</div>'
      + '<div class="msng-room-meta">'
      + '<span class="lg-badge" style="background:'+lg.bg+';color:'+lg.c+';border:1px solid '+lg.c+'44">'+esc(lg.short||'')+'</span>'
      + '<span style="font-size:.6rem;color:'+roleC+';font-weight:700">'+role+'</span>'
      + (m.matchTime ? '<span style="font-size:.6rem;color:var(--dim)">'+fmtFull(m.matchTime)+'</span>' : '')
      + '</div>'
      + (m.roomCode ? '<div style="font-size:.62rem;color:var(--dim);margin-top:2px">Code: <span style="color:var(--cyan);font-family:Orbitron,sans-serif">'+esc(m.roomCode)+'</span></div>' : '')
      + '</div>'
      + clubBadge(ap.club, m.league, 22)
      + '</div>';
  }).join('') + '</div>';
}

function openRoomChat(matchId) {
  activeRoomId = matchId;
  var m = allMatches[matchId]; if (!m) return;
  var hp = allPlayers[m.homeId], ap = allPlayers[m.awayId]; if (!hp||!ap) return;
  var el = $('msng-content'); if (!el) return;
  el.innerHTML =
    '<div class="msng-thread-wrap">'
    + '<div class="msng-thread-header">'
    + '<button class="msng-back-sm" onclick="activeRoomId=null;if(roomChatOff){roomChatOff();roomChatOff=null;}renderRoomsList()">&#8592;</button>'
    + '<div style="flex:1">'
    + '<div class="msng-thread-name" style="font-size:.78rem">' + esc(hp.username) + ' vs ' + esc(ap.username) + '</div>'
    + (m.matchTime ? '<div style="font-size:.58rem;color:var(--dim)">' + fmtFull(m.matchTime) + '</div>' : '')
    + '</div>'
    + (m.roomCode ? '<div class="mcode" style="font-size:.6rem;padding:2px 6px;cursor:pointer" onclick="copyCode(\''+esc(m.roomCode)+'\')">'+esc(m.roomCode)+'</div>' : '')
    + '</div>'
    + '<div id="msng-msgs" class="msng-msgs"></div>'
    + '<div class="msng-inp-row">'
    + '<input id="msng-inp" type="text" maxlength="400" placeholder="Message room..." onkeydown="if(event.key===\'Enter\')sendRoomMsg()">'
    + '<button class="msng-send" onclick="sendRoomMsg()">&#10148;</button>'
    + '</div>'
    + '</div>';

  if (roomChatOff) { roomChatOff(); roomChatOff = null; }
  var rk      = 'match_' + matchId;
  var ref     = db.ref(DB.matchChat + '/' + rk).limitToLast(60);
  var handler = ref.on('value', function(s) {
    var arr  = Object.values(s.val() || {}).sort(function(a,b) { return a.ts - b.ts; });
    var box  = $('msng-msgs'); if (!box) return;
    var atBot = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    box.innerHTML = arr.map(function(msg) {
      if (msg.system) return '<div class="msng-sys">' + esc(msg.text||'') + '</div>';
      var mine = myProfile && msg.uid === myProfile.uid;
      return '<div class="msng-msg ' + (mine?'mine':'other') + '">'
        + (!mine ? '<div style="font-size:.58rem;color:var(--dim);margin-bottom:2px">' + esc(msg.username||'') + '</div>' : '')
        + '<div class="msng-bubble">' + esc(msg.text||'') + '</div>'
        + '<div class="msng-time">' + fmtTime(msg.ts) + '</div>'
        + '</div>';
    }).join('');
    if (atBot) box.scrollTop = box.scrollHeight;
  });
  roomChatOff = function() { ref.off('value', handler); };
  setTimeout(function() { var i = $('msng-inp'); if (i) i.focus(); }, 300);
}

function sendRoomMsg() {
  if (!myProfile || !activeRoomId || !db) return;
  var inp = $('msng-inp'); if (!inp) return;
  var text = inp.value.trim(); if (!text) return;
  inp.value = '';
  db.ref(DB.matchChat + '/match_' + activeRoomId).push({
    uid:me.uid, username:myProfile.username, club:myProfile.club, text:text, ts:Date.now()
  });
}

// ── UNREAD TRACKING ───────────────────────────────────────────
function listenUnread() {
  if (_unreadListening || !myProfile || !db) return;
  _unreadListening = true;
  db.ref(DB.dmUnread + '/' + me.uid).on('value', function(s) {
    var data = s.val() || {};
    _dmUnreadGroups = {};
    Object.entries(data).forEach(function(kv) { if ((kv[1]||0) > 0) _dmUnreadGroups[kv[0]] = true; });
    unreadPM = Object.keys(_dmUnreadGroups).length;
    setBadge('pm-badge', unreadPM);
    updateFabBadge();
  });
  // League unread
  db.ref(DB.chat + '/league_' + myProfile.league).limitToLast(1).on('child_added', function(s) {
    var m = s.val();
    if (!m || !myProfile || m.uid === myProfile.uid) return;
    if (activePage()==='chat' && chatTab==='league') return;
    _dmUnreadGroups['_league'] = true;
    updateFabBadge();
  });
}

function listenGlobalDMs() {
  if (_globalDMsListening || !myProfile || !db) return;
  _globalDMsListening = true;
  db.ref(DB.dmMeta).orderByChild('participants/' + me.uid).equalTo(true).on('child_changed', function() {
    if (activePage()==='chat' && chatTab==='dms' && !activeDMUID) loadDMConvList();
  });
}

// ── FAB (floating chat icon) ──────────────────────────────────
function showFab() {
  if (!myProfile) return; // only show when logged in
  var f = $('chat-fab');
  if (f) f.style.display = 'flex';
  updateFabBadge();
}
function hideFab() { var f=$('chat-fab'); if(f) f.style.display='none'; }

function updateFabBadge() {
  var b = $('fab-badge'); if (!b) return;
  var n = Object.keys(_dmUnreadGroups).length;
  if (n > 0) {
    b.textContent = n > 9 ? '9+' : n;
    b.style.display = 'flex';
  } else {
    b.style.display = 'none';
  }
}

function initFab() {
  var fab = $('chat-fab'); if (!fab) return;
  var dragging = false, startX, startY, origX, origY;

  fab.addEventListener('touchstart', function(e) {
    var t = e.touches[0];
    startX=t.clientX; startY=t.clientY;
    origX=fab.getBoundingClientRect().left; origY=fab.getBoundingClientRect().top;
    dragging=false;
  }, {passive:true});

  fab.addEventListener('touchmove', function(e) {
    var t=e.touches[0], dx=t.clientX-startX, dy=t.clientY-startY;
    if (Math.abs(dx)>5||Math.abs(dy)>5) dragging=true;
    if (!dragging) return;
    var nx=Math.max(4,Math.min(window.innerWidth-fab.offsetWidth-4, origX+dx));
    var ny=Math.max(60,Math.min(window.innerHeight-fab.offsetHeight-70, origY+dy));
    fab.style.right='auto'; fab.style.left=nx+'px'; fab.style.top=ny+'px';
    e.preventDefault();
  }, {passive:false});

  fab.addEventListener('touchend', function() {
    if (!dragging) openMessenger('dms');
    dragging=false;
  });

  // Desktop
  fab.addEventListener('mousedown', function(e) {
    startX=e.clientX; startY=e.clientY;
    origX=fab.getBoundingClientRect().left; origY=fab.getBoundingClientRect().top;
    dragging=false;
    function mv(e2) {
      var dx=e2.clientX-startX, dy=e2.clientY-startY;
      if (Math.abs(dx)>5||Math.abs(dy)>5) dragging=true;
      if (!dragging) return;
      fab.style.right='auto';
      fab.style.left=Math.max(4,Math.min(window.innerWidth-fab.offsetWidth-4,origX+dx))+'px';
      fab.style.top=Math.max(60,Math.min(window.innerHeight-fab.offsetHeight-70,origY+dy))+'px';
    }
    function up() {
      document.removeEventListener('mousemove',mv);
      document.removeEventListener('mouseup',up);
      if (!dragging) openMessenger('dms');
      dragging=false;
    }
    document.addEventListener('mousemove',mv);
    document.addEventListener('mouseup',up);
    e.preventDefault();
  });
}

// ── COMPAT ────────────────────────────────────────────────────
function openDMWith(uid, uname) { openMessenger('dms'); setTimeout(function(){ openDMThread(uid,uname); },350); }
function startDMWith(uid, uname){ openDMWith(uid,uname); }
function sendPM()  { sendDM(); }
function loadPMList(){ if(activePage()==='chat'&&chatTab==='dms') renderDMList(); }
function loadChat(){ renderMessenger(); }
function listenTyping(){}
function onTyping(){}
function sendChat(){}
function switchRoom(){}
function searchDmPlayer(){
  var q=($('dm-search')&&$('dm-search').value||'').trim().toLowerCase();
  var el=$('dm-results'); if(!el)return;
  if(!q){el.innerHTML='';return;}
  var res=Object.values(allPlayers).filter(function(p){return p.username&&p.username.toLowerCase().includes(q)&&p.uid!==(myProfile&&myProfile.uid);}).slice(0,8);
  if(!res.length){el.innerHTML='<div style="padding:.7rem;color:var(--dim);font-size:.78rem">No players found.</div>';return;}
  el.innerHTML=res.map(function(p){
    return '<div class="dm-result-row" onclick="closeMo(\'new-dm-mo\');openDMThread(\''+p.uid+'\',\''+esc(p.username)+'\')">'
      +clubBadge(p.club,p.league,28)
      +'<div style="flex:1"><div style="font-weight:700;font-size:.84rem">'+esc(p.username)+'</div>'
      +'<div style="font-size:.65rem;color:var(--dim)">'+esc(p.club)+' · '+esc((LGS[p.league]||{}).short||'')+'</div></div>'
      +'</div>';
  }).join('');
}

document.addEventListener('DOMContentLoaded', function(){
  initFab();
  // Refresh badge every time page becomes visible
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'visible') updateFabBadge();
  });
});
