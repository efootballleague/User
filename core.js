
// ============================================================
// HELPERS
// ============================================================
function $(id){return document.getElementById(id);}
function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function shuffle(a){var b=a.slice();for(var i=b.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=b[i];b[i]=b[j];b[j]=t;}return b;}
function fmtDate(ts){if(!ts)return'';return new Date(ts).toLocaleDateString('en-GB',{day:'2-digit',month:'short'});}
function fmtTime(ts){if(!ts)return'';return new Date(ts).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});}
function fmtFull(ts){if(!ts)return'';return new Date(ts).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}
function fmtAgo(ts){
  if(!ts)return'Never';
  var d=Date.now()-ts,m=Math.floor(d/60000);
  if(m<2)return'Online now';if(m<60)return m+'m ago';
  var h=Math.floor(m/60);if(h<24)return h+'h ago';
  var dy=Math.floor(h/24);if(dy===1)return'Yesterday';if(dy<7)return dy+'d ago';
  return fmtDate(ts);
}
function lsColor(ts){if(!ts)return'#555';var d=Date.now()-ts;if(d<300000)return'#00ff88';if(d<3600000)return'#ffe600';return'#555';}
function dmKey(a,b){return[a,b].sort().join('_');}
function toggleEl(id){var e=$(id);e.style.display=e.style.display==='none'||!e.style.display?'block':'none';}
function openMo(id){var e=$(id);if(e)e.classList.add('on');}
function closeMo(id){var e=$(id);if(e)e.classList.remove('on');}
function toast(msg,type){
  var e=$('toast');if(!e)return;
  e.textContent=msg;
  e.style.background=type==='error'?'rgba(255,40,130,0.18)':'rgba(0,212,255,0.12)';
  e.style.border='1.5px solid '+(type==='error'?'#FF2882':'#00D4FF');
  e.style.color=type==='error'?'#FF2882':'#00D4FF';
  e.style.backdropFilter='blur(10px)';e.style.boxShadow='0 4px 20px rgba(0,0,0,0.5)';
  e.style.display='block';clearTimeout(e._t);
  e._t=setTimeout(function(){e.style.display='none';},2800);
}

// ============================================================
// REAL LEAGUE & TEAM DATA
// ============================================================
var ADMIN_EMAIL='admin@efootballuniverse.com';
var PAYSTACK_PK='pk_live_46d79b8be095322027cec63e4b69a5e48e32a3a4';

var LGS={
  epl:{
    n:'Premier League',
    short:'EPL',
    f:'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    c:'#37003C',        // PL purple
    accent:'#00ff85',   // PL green
    bg:'rgba(61,25,91,0.18)',
    logo:'https://upload.wikimedia.org/wikipedia/en/f/f2/Premier_League_Logo.svg'
  },
  laliga:{
    n:'La Liga',
    short:'LaLiga',
    f:'🇪🇸',
    c:'#ff4b00',        // La Liga orange
    accent:'#ff4b00',
    bg:'rgba(255,75,0,0.15)',
    logo:'https://upload.wikimedia.org/wikipedia/commons/1/13/LaLiga_logo_2023.svg'
  },
  seriea:{
    n:'Serie A',
    short:'Serie A',
    f:'🇮🇹',
    c:'#1a56db',        // Serie A blue
    accent:'#1a56db',
    bg:'rgba(26,86,219,0.15)',
    logo:'https://upload.wikimedia.org/wikipedia/en/e/e1/Serie_A_logo_%282019%29.svg'
  },
  ligue1:{
    n:'Ligue 1',
    short:'Ligue 1',
    f:'🇫🇷',
    c:'#0055A5',        // Ligue 1 blue
    accent:'#daa520',
    bg:'rgba(0,85,165,0.15)',
    logo:'https://upload.wikimedia.org/wikipedia/commons/9/9f/Ligue1_logo_2024.svg'
  }
};

// Real top 10 clubs per league with official colors and badge URLs
var ALL_CLUBS={
  epl:[
    {name:'Liverpool',         color:'#C8102E', logo:'https://upload.wikimedia.org/wikipedia/en/0/0c/Liverpool_FC.svg'},
    {name:'Arsenal',           color:'#EF0107', logo:'https://upload.wikimedia.org/wikipedia/en/5/53/Arsenal_FC.svg'},
    {name:'Manchester City',   color:'#6CABDD', logo:'https://upload.wikimedia.org/wikipedia/en/e/eb/Manchester_City_FC_badge.svg'},
    {name:'Chelsea',           color:'#034694', logo:'https://upload.wikimedia.org/wikipedia/en/c/cc/Chelsea_FC.svg'},
    {name:'Newcastle United',  color:'#241F20', logo:'https://upload.wikimedia.org/wikipedia/en/5/56/Newcastle_United_Logo.svg'},
    {name:'Tottenham Hotspur', color:'#132257', logo:'https://upload.wikimedia.org/wikipedia/en/b/b4/Tottenham_Hotspur.svg'},
    {name:'Aston Villa',       color:'#95BFE5', logo:'https://upload.wikimedia.org/wikipedia/en/9/9f/Aston_Villa_FC_crest_%282016%29.svg'},
    {name:'Manchester United', color:'#DA291C', logo:'https://upload.wikimedia.org/wikipedia/en/7/7a/Manchester_United_FC_crest.svg'},
    {name:'Nottingham Forest', color:'#DD0000', logo:'https://upload.wikimedia.org/wikipedia/en/e/e5/Nottingham_Forest_F.C._logo.svg'},
    {name:'Brighton',          color:'#0057B8', logo:'https://upload.wikimedia.org/wikipedia/en/f/fd/Brighton_%26_Hove_Albion_logo.svg'}
  ],
  laliga:[
    {name:'Barcelona',         color:'#A50044', logo:'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg'},
    {name:'Real Madrid',       color:'#FEBE10', logo:'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg'},
    {name:'Atletico Madrid',   color:'#CB3524', logo:'https://upload.wikimedia.org/wikipedia/en/f/f4/Atletico_Madrid_2017_logo.svg'},
    {name:'Athletic Bilbao',   color:'#EE2523', logo:'https://upload.wikimedia.org/wikipedia/en/9/98/Club_Athletic_de_Bilbao_logo.svg'},
    {name:'Villarreal',        color:'#FFD700', logo:'https://upload.wikimedia.org/wikipedia/en/b/b9/Villarreal_CF_logo-en.svg'},
    {name:'Real Sociedad',     color:'#0067B1', logo:'https://upload.wikimedia.org/wikipedia/en/f/f1/Real_Sociedad_logo.svg'},
    {name:'Real Betis',        color:'#00954C', logo:'https://upload.wikimedia.org/wikipedia/en/1/13/Real_betis_logo.svg'},
    {name:'Sevilla',           color:'#C41E3A', logo:'https://upload.wikimedia.org/wikipedia/en/3/3b/Sevilla_FC_logo.svg'},
    {name:'Osasuna',           color:'#D2001F', logo:'https://upload.wikimedia.org/wikipedia/en/5/50/CA_Osasuna_logo.svg'},
    {name:'Valencia',          color:'#FF7F00', logo:'https://upload.wikimedia.org/wikipedia/en/c/ce/Valenciacf.svg'}
  ],
  seriea:[
    {name:'Napoli',            color:'#087CC4', logo:'https://upload.wikimedia.org/wikipedia/commons/2/2d/SSC_Napoli_badge.svg'},
    {name:'Inter Milan',       color:'#0068A8', logo:'https://upload.wikimedia.org/wikipedia/commons/0/05/FC_Internazionale_Milano_2021.svg'},
    {name:'AC Milan',          color:'#FB090B', logo:'https://upload.wikimedia.org/wikipedia/commons/d/d0/Logo_of_AC_Milan.svg'},
    {name:'Juventus',          color:'#000000', logo:'https://upload.wikimedia.org/wikipedia/commons/1/15/Juventus_FC_2017_logo.svg'},
    {name:'Atalanta',          color:'#1E73BE', logo:'https://upload.wikimedia.org/wikipedia/en/6/66/AtalantaBC_logo.svg'},
    {name:'Roma',              color:'#8B0000', logo:'https://upload.wikimedia.org/wikipedia/en/f/f7/AS_Roma_logo_%282017%29.svg'},
    {name:'Lazio',             color:'#87CEEB', logo:'https://upload.wikimedia.org/wikipedia/en/7/71/SS_Lazio_Badge.svg'},
    {name:'Fiorentina',        color:'#6A0DAD', logo:'https://upload.wikimedia.org/wikipedia/commons/7/7e/ACF_Fiorentina_-_2022.svg'},
    {name:'Bologna',           color:'#D40000', logo:'https://upload.wikimedia.org/wikipedia/commons/5/5b/Bologna_F.C._1909_logo.svg'},
    {name:'Torino',            color:'#8B0000', logo:'https://upload.wikimedia.org/wikipedia/commons/4/4c/Torino_FC_Logo.svg'}
  ],
  ligue1:[
    {name:'PSG',               color:'#004170', logo:'https://upload.wikimedia.org/wikipedia/en/a/a7/Paris_Saint-Germain_F.C..svg'},
    {name:'Marseille',         color:'#009EDD', logo:'https://upload.wikimedia.org/wikipedia/commons/d/d8/Olympique_Marseille_logo.svg'},
    {name:'Monaco',            color:'#D4021D', logo:'https://upload.wikimedia.org/wikipedia/en/6/63/AS_Monaco_FC.svg'},
    {name:'Nice',              color:'#C8102E', logo:'https://upload.wikimedia.org/wikipedia/en/4/42/OGC_Nice_logo.svg'},
    {name:'Lille',             color:'#C41E3A', logo:'https://upload.wikimedia.org/wikipedia/en/e/e2/Lille_OSC_2011.svg'},
    {name:'Lyon',              color:'#003DA5', logo:'https://upload.wikimedia.org/wikipedia/en/b/b3/Olympique_Lyonnais_logo_2022.svg'},
    {name:'Lens',              color:'#FFD700', logo:'https://upload.wikimedia.org/wikipedia/en/4/42/RC_Lens_logo.svg'},
    {name:'Rennes',            color:'#D40000', logo:'https://upload.wikimedia.org/wikipedia/en/e/e4/Stade_Rennais_FC.svg'},
    {name:'Strasbourg',        color:'#1E3F8B', logo:'https://upload.wikimedia.org/wikipedia/en/9/99/RC_Strasbourg_logo.svg'},
    {name:'Brest',             color:'#E30613', logo:'https://upload.wikimedia.org/wikipedia/en/5/5b/Stade_Brestois_29_logo.svg'}
  ]
};

// Helper: get club object by name and league
function getClub(lid,name){
  return (ALL_CLUBS[lid]||[]).find(function(c){return c.name===name;})||{name:name,color:'#888',logo:''};
}

// Legacy color helper — still used in DM list and notifications
function clubColor(name){
  // Try to find in any league
  var all=['epl','laliga','seriea','ligue1'];
  for(var i=0;i<all.length;i++){
    var club=getClub(all[i],name);
    if(club&&club.color&&club.color!=='#888') return club.color;
  }
  // Fallback: generate from name
  var h=0;for(var j=0;j<(name||'').length;j++)h=(h*31+name.charCodeAt(j))&0xFFFFFF;
  return'#'+h.toString(16).padStart(6,'0');
}

// Club badge using real logo image
function clubBadge(name,lid,sz){
  var club=getClub(lid,name);
  var c=club.color;
  if(club.logo){
    return'<div style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:#fff;border:1.5px solid '+c+'55;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">'
      +'<img src="'+club.logo+'" loading="lazy" style="width:'+(sz*.8)+'px;height:'+(sz*.8)+'px;object-fit:contain" onerror="this.parentNode.innerHTML=\''+name.slice(0,2).toUpperCase()+'\'"></div>';
  }
  var init=name.split(' ').map(function(w){return w[0]||'';}).join('').slice(0,2).toUpperCase();
  return'<div style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;background:'+c+'22;border:1.5px solid '+c+'55;display:flex;align-items:center;justify-content:center;font-size:'+(sz*.28)+'px;font-weight:800;color:'+c+';flex-shrink:0">'+init+'</div>';
}

// League badge pill
function lgBadge(lid){
  var lg=LGS[lid]||{};
  return'<span style="display:inline-flex;align-items:center;gap:4px;font-size:.58rem;font-weight:700;padding:2px 7px;border-radius:4px;background:'+lg.bg+';color:'+lg.c+';border:1px solid '+lg.c+'44">'+lg.f+' '+lg.short+'</span>';
}

// ============================================================
// STATE
// ============================================================
var me=null,myProfile=null;
var allPlayers={},allMatches={},allPenalties={},uclSettings={},uclPayments={},allPolls={};
var curLg='epl',curFxFilter='all',chatRoom='global';
var chatOff=null,typingOff=null,typingTO=null,pmOff=null,pmUID=null;
var unreadChat=0,unreadPM=0,drawnClub=null,onlineIntervalSet=false;
var auth=null,db=null;
var _globalDMsListening=false,_unreadListening=false,_lastNotifMsg={};

// ============================================================
// LANDING
// ============================================================
function lTab(t){
  var pin=$('l-in'),pup=$('l-up');
  var tabs=document.querySelectorAll('.l-tab');
  if(pin)pin.classList.toggle('on',t==='in');
  if(pup)pup.classList.toggle('on',t!=='in');
  if(tabs[0])tabs[0].classList.toggle('on',t==='in');
  if(tabs[1])tabs[1].classList.toggle('on',t!=='in');
}
function showLanding(){
  var l=$('landing');
  if(l){l.classList.remove('gone');l.classList.add('visible');}
  var ls=$('loading-screen');if(ls)ls.classList.add('gone');
}
function enterApp(){
  var ls=$('loading-screen');if(ls)ls.classList.add('gone');
  var l=$('landing');if(l){l.classList.remove('visible');l.classList.add('gone');}
  updateNav();
}

// ============================================================
// FIREBASE LOADER
// ============================================================
function loadScript(url,cb){
  var s=document.createElement('script');
  s.src=url;s.onload=cb;s.onerror=function(){console.warn('Failed:',url);cb();};
  document.head.appendChild(s);
}
function loadScripts(urls,cb){
  var n=urls.length;if(!n){cb();return;}
  var done=0;
  urls.forEach(function(u){loadScript(u,function(){if(++done===n)cb();});});
}

loadScripts([
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js'
],function(){
  try{
    firebase.initializeApp({
      apiKey:"AIzaSyDbhuP9fhjI_0cxiUSTYi6dw4xqM0QI8wg",
      authDomain:"videocall-ada87.firebaseapp.com",
      databaseURL:"https://videocall-ada87-default-rtdb.firebaseio.com",
      projectId:"videocall-ada87",
      storageBucket:"videocall-ada87.firebasestorage.app",
      messagingSenderId:"1048410446932",
      appId:"1:1048410446932:web:0f3e3d8538e466202061c1"
    });
    auth=firebase.auth();
    db=firebase.database();
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
      .then(function(){startApp();})
      .catch(function(){startApp();});
  }catch(e){console.error('Firebase init error:',e);}
});
loadScript('https://js.paystack.co/v2/inline.js',function(){});

function startApp(){
  db.ref('ef_players').on('value',function(s){
    var newData=s.val()||{};
    var oldCount=Object.keys(allPlayers).length;
    var newCount=Object.keys(newData).length;
    allPlayers=newData;
    if(newCount!==oldCount)debouncedRefresh();
    else refreshAgoLabels();
  });
  db.ref('ef_matches').on('value',function(s){
    allMatches=s.val()||{};
    debouncedRefresh();
    var pg=activePage();
    if(pg==='fixtures')loadScoreSel();
    if(pg==='matchprep'){renderMatchPrep();renderSchedTimeline();}
  });
  db.ref('ef_online').on('value',function(s){var e=$('online-count');if(e)e.textContent=Object.keys(s.val()||{}).length;});
  db.ref('ef_ucl_settings').on('value',function(s){uclSettings=s.val()||{};if($('page-ucl').classList.contains('on'))renderUCL();});
  db.ref('ef_ucl_payments').on('value',function(s){uclPayments=s.val()||{};if($('page-ucl').classList.contains('on'))renderUCL();});
  db.ref('ef_penalties').on('value',function(s){
    allPenalties=s.val()||{};
    if(activePage()==='leagues')renderStd(curLg);
    if(activePage()==='admin')renderPenaltyLog();
  });
  db.ref('ef_polls').on('value',function(s){
    allPolls=s.val()||{};
    if(activePage()==='polls')renderPolls();
    renderPollBadge();
  });
  // Season banner
  setTimeout(function(){renderSeasonBanner();},1000);
  setTimeout(function(){if(typeof initNews==='function')initNews();},2000);
  auth.onAuthStateChanged(function(user){
    me=user;
    if(user){
      db.ref('ef_players/'+user.uid).once('value',function(s){
        myProfile=s.val();
        enterApp();
        updateNav();
        debouncedRefresh();
        db.ref('ef_players/'+user.uid).on('value',function(s){
          myProfile=s.val();
          updateNav();
          if(myProfile){setOnline();listenUnread();listenGlobalDMs();initRefereeSystem();listenMatchRooms();if(typeof initSwap==='function')initSwap();}
        });
        if(myProfile){setOnline();listenUnread();listenGlobalDMs();initRefereeSystem();listenMatchRooms();if(typeof initSwap==='function')initSwap();}
      });
    }else{
      myProfile=null;
      showLanding();
      updateNav();
    }
  },function(err){console.error('Auth error:',err);showLanding();});
}

// ============================================================
// AUTH ACTIONS
// ============================================================
function doSignIn(){
  var em=$('li-em').value.trim(),pw=$('li-pw').value;
  var err=$('li-err');err.textContent='';
  if(!em||!pw){err.textContent='Fill in both fields.';return;}
  if(!auth){err.textContent='Still loading, please wait...';setTimeout(doSignIn,1000);return;}
  var btn=$('li-btn');btn.textContent='Signing in...';btn.disabled=true;
  auth.signInWithEmailAndPassword(em,pw)
    .then(function(){btn.textContent='Sign In';btn.disabled=false;$('li-em').value='';$('li-pw').value='';})
    .catch(function(e){
      var msg='Wrong email or password.';
      if(e.code==='auth/too-many-requests')msg='Too many attempts. Try later.';
      if(e.code==='auth/network-request-failed')msg='Network error. Check your connection.';
      err.textContent=msg;btn.textContent='Sign In';btn.disabled=false;
    });
}
function doRegStep1(){
  var u=$('ru-name').value.trim(),em=$('ru-em').value.trim();
  var pw=$('ru-pw').value,c=$('ru-country').value,l=$('ru-league').value;
  var err=$('ru-err');err.textContent='';
  if(!u||!em||!pw||!c||!l){err.textContent='Please fill in all fields.';return;}
  if(pw.length<8){err.textContent='Password must be at least 8 characters.';return;}
  if(Object.values(allPlayers).some(function(p){return p.username.toLowerCase()===u.toLowerCase();})){err.textContent='Username taken.';return;}
  var taken=Object.values(allPlayers).filter(function(p){return p.league===l;}).map(function(p){return p.club;});
  var avail=(ALL_CLUBS[l]||[]).map(function(c){return c.name;}).filter(function(cn){return!taken.includes(cn);});
  if(!avail.length){err.textContent='League is full. Choose another.';return;}
  // Show club picker instead of random draw
  showClubPicker(l,avail);
}

function showClubPicker(lid,avail){
  var lg=LGS[lid]||{};
  var html='<div style="margin-bottom:.8rem"><div style="font-family:Orbitron,sans-serif;font-size:.7rem;color:'+lg.c+';letter-spacing:1.5px;margin-bottom:.6rem">CHOOSE YOUR CLUB</div>'
    +'<p style="font-size:.72rem;color:var(--dim);margin-bottom:.75rem">Pick any available club. This is your team for the season.</p>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.45rem;max-height:280px;overflow-y:auto">';
  avail.forEach(function(cn){
    var club=getClub(lid,cn);
    html+='<div onclick="selectClub(\''+cn+'\')" style="display:flex;align-items:center;gap:.55rem;padding:.6rem;background:#111;border:1.5px solid rgba(255,255,255,0.07);border-radius:10px;cursor:pointer;transition:all .18s" onmouseover="this.style.borderColor=\''+club.color+'\'" onmouseout="this.style.borderColor=\'rgba(255,255,255,0.07)\'">'
      +clubBadge(cn,lid,30)
      +'<span style="font-size:.76rem;font-weight:700">'+esc(cn)+'</span>'
      +'</div>';
  });
  html+='</div></div>';
  $('l-club-picker').innerHTML=html;
  $('l-s1').style.display='none';
  $('l-s-picker').style.display='';
}

function selectClub(name){
  drawnClub=name;
  var lid=$('ru-league').value;
  var club=getClub(lid,name);
  var lg=LGS[lid]||{};
  $('l-club-badge').innerHTML=clubBadge(name,lid,60);
  $('l-club-name').textContent=name;
  $('l-club-name').style.color=club.color;
  $('l-club-lg').textContent=lg.f+' '+lg.n;
  $('l-club-lg').style.color=lg.c;
  $('l-s-picker').style.display='none';
  $('l-s2').style.display='';
}

function regBack(){
  if($('l-s2').style.display!=='none'){$('l-s2').style.display='none';$('l-s-picker').style.display='';}
  else{$('l-s-picker').style.display='none';$('l-s1').style.display='';}
  drawnClub=null;
}

function doRegConfirm(){
  var u=$('ru-name').value.trim(),em=$('ru-em').value.trim();
  var pw=$('ru-pw').value,c=$('ru-country').value,l=$('ru-league').value;
  var err=$('ru-err2');err.textContent='';
  if(!drawnClub){err.textContent='No club selected. Go back.';return;}
  if(!auth){err.textContent='Connecting... please wait.';return;}
  var btn=$('ru-confirm');btn.textContent='Registering...';btn.disabled=true;
  auth.createUserWithEmailAndPassword(em,pw)
    .then(function(cr){
      return db.ref('ef_players/'+cr.user.uid).set({uid:cr.user.uid,username:u,email:em,country:c,league:l,club:drawnClub,joinedAt:Date.now(),lastSeen:Date.now()});
    })
    .then(function(){btn.textContent='Confirm';btn.disabled=false;drawnClub=null;toast('Welcome to eFootball Universe!');})
    .catch(function(e){
      var msg='Registration failed.';
      if(e.code==='auth/email-already-in-use')msg='Email already registered. Sign in instead.';
      if(e.code==='auth/invalid-email')msg='Invalid email address.';
      if(e.code==='auth/weak-password')msg='Password too weak (min 8 chars).';
      if(e.code==='auth/network-request-failed')msg='Network error. Check connection.';
      if(e.code==='auth/operation-not-allowed')msg='Registration disabled. Contact admin.';
      console.error('Reg error:',e.code,e.message);
      err.textContent=msg;btn.textContent='Confirm';btn.disabled=false;
    });
}
function doLogout(){
  if(!auth)return;
  auth.signOut().then(function(){
    myProfile=null;me=null;
    _globalDMsListening=false;_unreadListening=false;_lastNotifMsg={};
    if(matchRoomOff){matchRoomOff();matchRoomOff=null;}if(matchRoomChatOff){matchRoomChatOff();matchRoomChatOff=null;}
    updateNav();go('home');showLanding();toast('See you on the pitch!');
  });
}

// ============================================================
// NAVIGATION
// ============================================================
function go(name,btn){
  if(go._lock)return;go._lock=true;setTimeout(function(){go._lock=false;},300);
  document.querySelectorAll('.page').forEach(function(p){p.classList.remove('on');});
  window.scrollTo({top:0,behavior:'smooth'});
  document.querySelectorAll('.nb').forEach(function(b){b.classList.remove('on');});
  var pg=$('page-'+name);if(pg)pg.classList.add('on');
  if(btn)btn.classList.add('on');
  else document.querySelectorAll('.nb').forEach(function(b){if((b.getAttribute('onclick')||'').includes("'"+name+"'"))b.classList.add('on');});
  if(name==='leagues')renderStd(curLg);
  if(name==='fixtures'){renderFx();loadScoreSel();}
  if(name==='matchprep'){renderMatchPrep();renderMatchRooms();}
  if(name==='ucl')renderUCL();
  if(name==='polls'){renderPolls();updateBadge('polls-badge',0);}
  if(name==='leaderboard')renderLeaderboard();
  if(name==='referee'){renderRefPanel();updateBadge('ref-badge',0);}
  if(name==='chat'){
    if(chatOff){chatOff();chatOff=null;}if(typingOff){typingOff();typingOff=null;}
    loadChat();listenTyping();unreadChat=0;updateBadge('chat-badge',0);
    if(myProfile){$('cinp-row').style.display='flex';$('chat-locked').style.display='none';}
    else{$('cinp-row').style.display='none';$('chat-locked').style.display='block';}
    setTimeout(function(){var b=$('chat-msgs');if(b)b.scrollTop=b.scrollHeight;},200);
  }
  if(name==='pm'){
    if(!myProfile){$('pm-wrap').style.display='none';$('pm-locked').style.display='block';}
    else{$('pm-wrap').style.display='flex';$('pm-locked').style.display='none';unreadPM=0;updateBadge('pm-badge',0);loadPMList();}
  }
  if(name==='profile')renderProfile();
  if(name==='admin')loadAdmin();
}
function updateBadge(id,n){var e=$(id);if(!e)return;e.style.display=n>0?'inline':'none';e.textContent=n>9?'9+':n;}
function updateNav(){
  var e=$('nav-right');if(!e)return;
  if(myProfile){
    var isAdmin=me&&me.email===ADMIN_EMAIL;
    e.innerHTML='<span class="uchip" onclick="go(\'profile\')" title="Profile">'+esc(myProfile.username)+'</span>'
      +(isAdmin?'<button class="bsm bsm-d" onclick="go(\'admin\')">Admin</button>':'')
      +'<button class="bsm bsm-d" onclick="doLogout()">Out</button>';
    var h=$('home-cta');
    if(h)h.innerHTML='<button class="bp" style="font-size:.88rem;padding:10px 20px" onclick="go(\'fixtures\')">Enter Result</button><button class="bs" style="font-size:.88rem;padding:10px 20px" onclick="go(\'profile\')">My Profile</button>';
    var ab=$('add-fix-btn');if(ab)ab.style.display='inline-flex';
    var sp=$('score-panel');if(sp)sp.style.display='block';
    var cr=$('cinp-row');if(cr)cr.style.display='flex';
    var cl=$('chat-locked');if(cl)cl.style.display='none';
  }else{
    e.innerHTML='<button class="bsm bsm-s" onclick="lTab(\'in\');showLanding()">Login</button><button class="bsm bsm-p" onclick="lTab(\'up\');showLanding()">Join</button>';
    var h=$('home-cta');
    if(h)h.innerHTML='<button class="bp" style="font-size:.88rem;padding:10px 20px" onclick="lTab(\'up\');showLanding()">Join Now</button><button class="bs" style="font-size:.88rem;padding:10px 20px" onclick="lTab(\'in\');showLanding()">Login</button>';
    var ab=$('add-fix-btn');if(ab)ab.style.display='none';
    var sp=$('score-panel');if(sp)sp.style.display='none';
    var cr=$('cinp-row');if(cr)cr.style.display='none';
    var cl=$('chat-locked');if(cl)cl.style.display='block';
  }
}
var _refreshTimer=null;
function debouncedRefresh(){clearTimeout(_refreshTimer);_refreshTimer=setTimeout(refreshAll,120);}
function activePage(){
  var pages=['home','leagues','fixtures','matchprep','ucl','polls','leaderboard','referee','chat','pm','profile','admin'];
  for(var i=0;i<pages.length;i++){var p=$('page-'+pages[i]);if(p&&p.classList.contains('on'))return pages[i];}
  return'home';
}
function refreshAll(){
  renderHomeStats();
  var pg=activePage();
  if(pg==='home'){renderRecentRes();renderTopPlayers();}
  else if(pg==='leagues')renderStd(curLg);
  else if(pg==='fixtures'){renderFx();loadScoreSel();}
  else if(pg==='matchprep'){renderMatchPrep();renderSchedTimeline();}
  else if(pg==='ucl')renderUCL();
  else if(pg==='polls')renderPolls();
}
function initRefereeSystem(){
  if(!myProfile||!db)return;
  checkPendingAutoApprovals();
  listenRefDuties();
}
function setOnline(){
  if(!myProfile||!db)return;
  var ref=db.ref('ef_online/'+me.uid);
  ref.set({name:myProfile.username,ts:Date.now()});ref.onDisconnect().remove();
  db.ref('ef_players/'+me.uid+'/lastSeen').set(Date.now());
  if(!onlineIntervalSet){
    onlineIntervalSet=true;
    setInterval(function(){
      if(!myProfile||!db)return;
      db.ref('ef_online/'+me.uid).set({name:myProfile.username,ts:Date.now()});
      db.ref('ef_players/'+me.uid+'/lastSeen').set(Date.now());
    },30000);
    setInterval(function(){refreshAgoLabels();},30000);
  }
}
function refreshAgoLabels(){
  document.querySelectorAll('[data-lastseen]').forEach(function(el){
    var ts=parseInt(el.getAttribute('data-lastseen')||'0');
    el.style.background=lsColor(ts);el.setAttribute('title',fmtAgo(ts));
  });
  document.querySelectorAll('[data-agospan]').forEach(function(el){
    var ts=parseInt(el.getAttribute('data-agospan')||'0');
    el.textContent=fmtAgo(ts);el.style.color=lsColor(ts);
  });
}

// ============================================================
// VOTE POLLS
// ============================================================
function renderPollBadge(){
  if(!myProfile)return;
  var unvoted=Object.values(allPolls).filter(function(p){
    return p.active&&!(p.votes&&p.votes[myProfile.uid]);
  }).length;
  updateBadge('polls-badge',unvoted);
}

function renderPolls(){
  var el=$('page-polls');if(!el)return;
  var isAdmin=me&&me.email===ADMIN_EMAIL;
  var polls=Object.entries(allPolls).sort(function(a,b){return(b[1].createdAt||0)-(a[1].createdAt||0);});

  var html='<div class="sh"><div class="st" style="color:#ffe600">&#128202; Community Polls</div><div class="sl" style="background:linear-gradient(90deg,#ffe600,transparent)"></div>'
    +(isAdmin?'<button class="bp" style="font-size:.7rem;padding:5px 12px" onclick="openMo(\'create-poll-mo\')">+ New Poll</button>':'')
    +'</div>';

  if(!polls.length){
    html+='<div class="card" style="padding:1.6rem;text-align:center;color:var(--dim)">No polls yet. Admin will post one soon!</div>';
  } else {
    polls.forEach(function(kv){
      var key=kv[0],p=kv[1];
      var total=p.votes?Object.values(p.votes).length:0;
      var myVote=myProfile&&p.votes?p.votes[myProfile.uid]:null;
      var closed=!p.active;

      html+='<div class="card" style="padding:1.1rem;margin-bottom:.75rem;border-color:'+(closed?'rgba(255,255,255,0.08)':'rgba(255,230,0,0.22)')+'">';
      // Header
      html+='<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:.5rem;margin-bottom:.8rem">'
        +'<div><div style="font-weight:700;font-size:.92rem;margin-bottom:3px">'+esc(p.question)+'</div>'
        +'<div style="font-size:.62rem;color:var(--dim)">'+fmtDate(p.createdAt)+' &middot; '+total+' vote'+(total!==1?'s':'')+'</div></div>'
        +'<span style="font-size:.6rem;font-weight:700;padding:2px 8px;border-radius:20px;flex-shrink:0;'+(closed?'background:rgba(255,255,255,0.07);color:var(--dim)':'background:rgba(255,230,0,0.12);color:#ffe600;border:1px solid rgba(255,230,0,0.3)')+'">'+( closed?'Closed':'Live')+'</span>'
        +'</div>';

      // Options
      (p.options||[]).forEach(function(opt,i){
        var count=p.votes?Object.values(p.votes).filter(function(v){return v===i;}).length:0;
        var pct=total>0?Math.round(count/total*100):0;
        var isMyVote=myVote===i;
        var canVote=!closed&&myProfile&&myVote===null;
        html+='<div style="margin-bottom:.45rem">'
          +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'
          +'<span style="font-size:.8rem;font-weight:'+(isMyVote?'700':'400')+';color:'+(isMyVote?'#ffe600':'#ccc')+'">'+esc(opt)+(isMyVote?' &#10003;':'')+'</span>'
          +'<span style="font-size:.72rem;color:var(--dim)">'+count+' ('+pct+'%)</span>'
          +'</div>'
          +'<div style="height:6px;background:rgba(255,255,255,0.06);border-radius:4px;overflow:hidden;cursor:'+(canVote?'pointer':'default')+'" '+(canVote?'onclick="castVote(\''+key+'\','+i+')"':'')+'>'
          +'<div style="height:100%;width:'+pct+'%;background:'+(isMyVote?'linear-gradient(90deg,#ffe600,#ff6b00)':'rgba(255,255,255,0.18)')+';border-radius:4px;transition:width .4s ease"></div>'
          +'</div>'
          +(canVote?'<div style="font-size:.6rem;color:var(--dim);margin-top:1px">Tap bar to vote</div>':'')
          +'</div>';
      });

      if(!myProfile){
        html+='<div style="font-size:.73rem;color:var(--dim);margin-top:.55rem;text-align:center">Login to vote</div>';
      } else if(myVote===null&&!closed){
        html+='<div style="font-size:.68rem;color:#ffe600;margin-top:.35rem">Your vote counts! Tap an option above.</div>';
      } else if(myVote!==null){
        html+='<div style="font-size:.68rem;color:#00ff88;margin-top:.35rem">&#10003; You voted: '+esc((p.options||[])[myVote]||'')+'</div>';
      }

      if(isAdmin){
        html+='<div style="display:flex;gap:.35rem;margin-top:.65rem;padding-top:.55rem;border-top:1px solid rgba(255,255,255,0.05)">'
          +(p.active?'<button class="bd" style="font-size:.63rem;padding:3px 9px" onclick="closePoll(\''+key+'\')">Close Poll</button>':'<button class="bg" style="font-size:.63rem;padding:3px 9px" onclick="reopenPoll(\''+key+'\')">Reopen</button>')
          +'<button class="bd" style="font-size:.63rem;padding:3px 9px;background:rgba(139,0,0,0.2);color:#ff4444" onclick="deletePoll(\''+key+'\')">Delete</button>'
          +'</div>';
      }
      html+='</div>';
    });
  }
  el.innerHTML=html;
}

function castVote(pollKey,optIndex){
  if(!myProfile){showLanding();return;}
  var poll=allPolls[pollKey];
  if(!poll||!poll.active){toast('This poll is closed.','error');return;}
  if(poll.votes&&poll.votes[myProfile.uid]!==undefined){toast('You already voted.','error');return;}
  db.ref('ef_polls/'+pollKey+'/votes/'+myProfile.uid).set(optIndex)
    .then(function(){toast('Vote cast!');})
    .catch(function(){toast('Failed. Try again.','error');});
}

function createPoll(){
  if(!me||me.email!==ADMIN_EMAIL){toast('Admin only','error');return;}
  var q=$('poll-question').value.trim();
  var opts=[$('poll-opt1').value.trim(),$('poll-opt2').value.trim(),$('poll-opt3').value.trim(),$('poll-opt4').value.trim()].filter(Boolean);
  var err=$('poll-err');err.textContent='';
  if(!q){err.textContent='Enter a question.';return;}
  if(opts.length<2){err.textContent='Add at least 2 options.';return;}
  db.ref('ef_polls').push({question:q,options:opts,votes:{},active:true,createdAt:Date.now(),createdBy:myProfile.username})
    .then(function(){
      closeMo('create-poll-mo');
      $('poll-question').value='';$('poll-opt1').value='';$('poll-opt2').value='';$('poll-opt3').value='';$('poll-opt4').value='';
      toast('Poll created!');
    }).catch(function(){err.textContent='Failed. Try again.';});
}
function closePoll(key){db.ref('ef_polls/'+key+'/active').set(false).then(function(){toast('Poll closed.');});}
function reopenPoll(key){db.ref('ef_polls/'+key+'/active').set(true).then(function(){toast('Poll reopened.');});}
function deletePoll(key){if(!confirm('Delete this poll?'))return;db.ref('ef_polls/'+key).remove().then(function(){toast('Poll deleted.');});}


// ============================================================
// GOOGLE SIGN-IN
// ============================================================
function doGoogleSignIn(){
  if(!auth){toast('Still loading...','error');return;}
  var provider=new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(function(result){
      var user=result.user;
      return db.ref('ef_players/'+user.uid).once('value').then(function(s){
        if(s.val()){enterApp();}
        else{openGoogleSetup(user);}
      });
    })
    .catch(function(e){
      if(e.code==='auth/popup-closed-by-user')return;
      toast('Google sign-in failed. Try again.','error');
      console.error('Google auth:',e);
    });
}

var _gsUser=null;
function openGoogleSetup(user){
  _gsUser=user;
  var displayName=(user.displayName||'').replace(/\s+/g,'').slice(0,20);
  var nameEl=$('gs-name');if(nameEl&&displayName)nameEl.value=displayName;
  ['gs-step1','gs-step2','gs-step3'].forEach(function(id){var el=$(id);if(el)el.style.display='none';});
  var s1=$('gs-step1');if(s1)s1.style.display='block';
  ['sdot-1','sdot-2','sdot-3'].forEach(function(id,i){var el=$(id);if(el)el.style.background=i===0?'linear-gradient(90deg,#00D4FF,#00FF85)':'rgba(255,255,255,0.1)';});
  var glv=$('gs-league');if(glv)glv.value='';
  document.querySelectorAll('.league-opt').forEach(function(o){o.style.borderColor='';o.style.background='';o.classList&&o.classList.remove&&o.classList.remove('selected');});
  window._gsPickedClub=null;
  openMo('google-setup-mo');
}
function gsNext1(){
  var u=$('gs-name').value.trim(),c=$('gs-country').value;
  var err=$('gs-err1');err.textContent='';
  if(!u){err.textContent='Enter a username.';return;}
  if(u.length<3){err.textContent='Min 3 characters.';return;}
  if(!c){err.textContent='Select your country.';return;}
  if(Object.values(allPlayers).some(function(p){return p.username&&p.username.toLowerCase()===u.toLowerCase();})){err.textContent='Username taken.';return;}
  var s1=$('gs-step1'),s2=$('gs-step2');
  if(s1)s1.style.display='none';if(s2)s2.style.display='block';
  var d2=$('sdot-2');if(d2)d2.style.background='linear-gradient(90deg,#00D4FF,#00FF85)';
}
function gsBack1(){var s2=$('gs-step2'),s1=$('gs-step1');if(s2)s2.style.display='none';if(s1)s1.style.display='block';}
function gsSelectLeague(el){
  document.querySelectorAll('#gs-league-picker .league-opt, #google-setup-mo .league-opt').forEach(function(o){o.style.borderColor='';});
  el.style.borderColor='#00FF85';
  var lv=$('gs-league');if(lv)lv.value=el.getAttribute('data-val');
}
function gsNext2(){
  var l=$('gs-league')?$('gs-league').value:'';
  var err=$('gs-err2');err.textContent='';
  if(!l){err.textContent='Please select a league.';return;}
  var taken=Object.values(allPlayers).filter(function(p){return p.league===l;}).map(function(p){return p.club;});
  var clubs=ALL_CLUBS[l]||[];
  var html='';
  clubs.forEach(function(club){
    var isTaken=taken.includes(club.name);
    if(!isTaken){
      html+='<div style="display:flex;align-items:center;gap:.55rem;padding:.6rem;background:rgba(0,0,0,0.35);border:1.5px solid rgba(0,212,255,0.1);border-radius:10px;cursor:pointer;transition:all .18s" onclick="gsPickClub(this,''+club.name.replace(/'/g,"\'")+'',''+club.color+'')">'
        +'<div style="width:30px;height:30px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0"><img src="'+club.logo+'" loading="lazy" style="width:24px;height:24px;object-fit:contain" onerror="this.parentNode.innerHTML=''+club.name.slice(0,2).toUpperCase()+''"></div>'
        +'<div style="flex:1;min-width:0"><div style="font-size:.74rem;font-weight:700">'+esc(club.name)+'</div><div style="font-size:.55rem;color:#00FF85;font-weight:700">&#9679; Available</div></div>'
        +'</div>';
    } else {
      html+='<div style="display:flex;align-items:center;gap:.55rem;padding:.6rem;background:rgba(255,255,255,0.02);border:1.5px solid rgba(255,255,255,0.04);border-radius:10px;opacity:.3;cursor:not-allowed;">'
        +'<div style="width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,0.05);display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0"><img src="'+club.logo+'" loading="lazy" style="width:24px;height:24px;object-fit:contain;filter:grayscale(1)"></div>'
        +'<div style="flex:1;min-width:0"><div style="font-size:.74rem;font-weight:700">'+esc(club.name)+'</div><div style="font-size:.55rem;color:#FF2882;font-weight:700">&#9679; Taken</div></div>'
        +'<span style="font-size:.46rem;font-weight:900;color:#FF2882;background:rgba(255,40,130,0.15);border:1px solid rgba(255,40,130,0.3);border-radius:4px;padding:1px 4px">TAKEN</span>'
        +'</div>';
    }
  });
  var grid=$('gs-club-grid');if(grid)grid.innerHTML=html;
  window._gsPickedClub=null;
  var s2=$('gs-step2'),s3=$('gs-step3');if(s2)s2.style.display='none';if(s3)s3.style.display='block';
  var d3=$('sdot-3');if(d3)d3.style.background='linear-gradient(90deg,#00D4FF,#00FF85)';
}
function gsBack2(){var s3=$('gs-step3'),s2=$('gs-step2');if(s3)s3.style.display='none';if(s2)s2.style.display='block';var d3=$('sdot-3');if(d3)d3.style.background='rgba(255,255,255,0.1)';}
function gsPickClub(el,name,color){
  document.querySelectorAll('#gs-club-grid div[onclick]').forEach(function(c){c.style.borderColor='rgba(0,212,255,0.1)';c.style.background='rgba(0,0,0,0.35)';});
  el.style.borderColor=color||'#00FF85';el.style.background='rgba(0,255,133,0.08)';
  window._gsPickedClub=name;
}
function gsConfirm(){
  var u=$('gs-name').value.trim(),c=$('gs-country').value,l=$('gs-league').value;
  var err=$('gs-err3');err.textContent='';
  if(!_gsUser){err.textContent='Session error. Please try again.';return;}
  if(!window._gsPickedClub){err.textContent='Please pick an available club.';return;}
  var btn=$('gs-confirm-btn');btn.textContent='Setting up...';btn.disabled=true;
  db.ref('ef_players/'+_gsUser.uid).set({
    uid:_gsUser.uid,username:u,email:_gsUser.email||'',
    country:c,league:l,club:window._gsPickedClub,
    joinedAt:Date.now(),lastSeen:Date.now(),avatar:_gsUser.photoURL||''
  }).then(function(){
    btn.textContent='Join the League!';btn.disabled=false;
    closeMo('google-setup-mo');
    toast('Welcome to eFootball Universe!');
    enterApp();
  }).catch(function(e){
    err.textContent='Setup failed: '+e.message;
    btn.textContent='Join the League!';btn.disabled=false;
  });
}

// ── LEAGUE PICKER (email reg) ──────────────────────────────
function selectLeague(el){
  document.querySelectorAll('.league-opt').forEach(function(o){
    o.style.borderColor='';o.style.boxShadow='';
    if(o.getAttribute('data-val')==='epl')o.style.background='rgba(55,0,60,0.35)';
    else if(o.getAttribute('data-val')==='laliga')o.style.background='rgba(238,50,36,0.1)';
    else if(o.getAttribute('data-val')==='seriea')o.style.background='rgba(27,126,194,0.12)';
    else if(o.getAttribute('data-val')==='ligue1')o.style.background='rgba(0,85,165,0.15)';
  });
  var val=el.getAttribute('data-val');
  el.style.borderColor='#00FF85';el.style.boxShadow='0 0 16px rgba(0,255,133,0.2)';
  var rl=$('ru-league');if(rl)rl.value=val;
}

// ── SIDE DRAWER ────────────────────────────────────────────
function openDrawer(){
  var d=$('side-drawer'),o=$('drawer-overlay'),h=$('hamburger');
  if(d)d.classList.add('open');if(o)o.style.display='block';if(h)h.classList.add('open');
  document.body.style.overflow='hidden';
}
function closeDrawer(){
  var d=$('side-drawer'),o=$('drawer-overlay'),h=$('hamburger');
  if(d)d.classList.remove('open');if(o)o.style.display='none';if(h)h.classList.remove('open');
  document.body.style.overflow='';
}

// ── MATCH LAUNCH ───────────────────────────────────────────
function launchEfootball(){
  var ua=navigator.userAgent||'';
  var isIOS=/iPad|iPhone|iPod/.test(ua);
  var isAndroid=/Android/.test(ua);
  if(isIOS){
    var iframe=document.createElement('iframe');
    iframe.style.display='none';iframe.src='efootball://';
    document.body.appendChild(iframe);
    setTimeout(function(){
      document.body.removeChild(iframe);
      window.location.href='https://apps.apple.com/app/efootball-2024/id1448787484';
    },2500);
  } else if(isAndroid){
    var intentUrl='intent://efootball/#Intent;scheme=efootball;package=com.konami.efootball.android;end';
    var hidden=false;
    document.addEventListener('visibilitychange',function(){if(document.hidden)hidden=true;});
    try{window.location.href=intentUrl;}catch(e){}
    setTimeout(function(){if(!hidden)window.open('https://play.google.com/store/apps/details?id=com.konami.efootball.android','_blank');},2500);
  } else {
    openMo('efootball-links-mo');
  }
}

// ── RESULT CELEBRATION ─────────────────────────────────────
function showResultCelebration(mid,hg,ag,m){
  var hp=allPlayers[m.homeId]||{username:'?',club:'?'},ap=allPlayers[m.awayId]||{username:'?',club:'?'};
  var isHome=myProfile&&myProfile.uid===m.homeId;
  var myG=isHome?hg:ag,oppG=isHome?ag:hg;
  var result=myG>oppG?'WIN':myG===oppG?'DRAW':'LOSS';
  var rc={WIN:{c:'#00FF85',label:'VICTORY!'},DRAW:{c:'#FFE600',label:'DRAW'},LOSS:{c:'#FF2882',label:'MATCH LOST'}}[result];
  var cel=$('result-celebration');if(!cel)return;
  cel.innerHTML='<div style="text-align:center;padding:2.5rem 1.5rem;animation:celIn .5s cubic-bezier(.34,1.56,.64,1)">'
    +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:2.2rem;color:'+rc.c+';text-shadow:0 0 40px '+rc.c+';letter-spacing:3px;margin-bottom:1rem">'+rc.label+'</div>'
    +'<div style="background:rgba(255,255,255,0.05);border:2px solid '+rc.c+'44;border-radius:20px;padding:1.5rem 2rem;margin-bottom:1.5rem;display:inline-block">'
    +'<div style="display:flex;align-items:center;gap:1.5rem">'
    +'<div style="text-align:center">'+clubBadge(hp.club,m.league,48)+'<div style="font-size:.75rem;font-weight:700;margin-top:.4rem">'+esc(hp.username)+'</div></div>'
    +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:3rem;color:'+rc.c+';text-shadow:0 0 30px '+rc.c+';letter-spacing:4px">'+hg+' &#8211; '+ag+'</div>'
    +'<div style="text-align:center">'+clubBadge(ap.club,m.league,48)+'<div style="font-size:.75rem;font-weight:700;margin-top:.4rem">'+esc(ap.username)+'</div></div>'
    +'</div></div>'
    +'<div style="font-size:.78rem;color:#ccc;line-height:1.7;margin-bottom:1.5rem">&#9889; Result submitted — opponent has <strong style="color:#FFE600">48 hours</strong> to dispute.</div>'
    +'<div style="display:flex;gap:.75rem;justify-content:center"><button class="bp" onclick="closeCelebration()" style="padding:12px 28px;font-size:.9rem">Back to Match Room</button><button class="bs" onclick="closeCelebration();go('leagues')" style="padding:12px 24px;font-size:.9rem">View Standings</button></div>'
    +'</div>';
  cel.style.display='flex';
  if(result==='WIN')spawnConfetti();
}
function closeCelebration(){var c=$('result-celebration');if(c){c.style.display='none';c.innerHTML='';}}
function spawnConfetti(){
  var cols=['#00D4FF','#00FF85','#FFE600','#FF2882','#fff'];
  var c=$('result-celebration');if(!c)return;
  for(var i=0;i<50;i++){(function(i){setTimeout(function(){
    var p=document.createElement('div');
    p.style.cssText='position:absolute;width:'+(Math.random()*8+4)+'px;height:'+(Math.random()*8+4)+'px;background:'+cols[Math.floor(Math.random()*cols.length)]+';left:'+Math.random()*100+'%;top:10%;border-radius:'+(Math.random()>.5?'50%':'2px')+';animation:confettiFall '+(Math.random()*2+1.5)+'s ease-in forwards;pointer-events:none;z-index:1';
    c.appendChild(p);setTimeout(function(){if(p.parentNode)p.parentNode.removeChild(p);},3500);
  },i*40);})(i);}
}

// ── POST-MATCH RESULT (from match room) ────────────────────
function openPostMatchSubmit(mid){
  if(!myProfile){showLanding();return;}
  var m=allMatches[mid]||{};
  var hp=allPlayers[m.homeId]||{username:'?',club:'?'},ap=allPlayers[m.awayId]||{username:'?',club:'?'};
  var isHome=myProfile.uid===m.homeId;
  $('pm-mid').value=mid;
  $('pm-home-label').textContent=hp.username+' ('+hp.club+')';
  $('pm-away-label').textContent=ap.username+' ('+ap.club+')';
  $('pm-hg-display').textContent='0';$('pm-ag-display').textContent='0';
  $('pm-hg-val').value='0';$('pm-ag-val').value='0';
  $('pm-honest').checked=false;$('pm-err').textContent='';
  $('pm-screenshot').value='';$('pm-ss-preview').style.display='none';
  $('pm-ss-label').textContent='Tap to upload screenshot';
  $('pm-submit-btn').textContent='Submit Result';$('pm-submit-btn').disabled=false;
  $('pm-match-label').textContent=hp.username+' vs '+ap.username+(isHome?' (You: Home)':' (You: Away)');
  openMo('post-match-mo');
}
function pmStepGoal(side,dir){
  var disp=$(side==='hg'?'pm-hg-display':'pm-ag-display'),val=$(side==='hg'?'pm-hg-val':'pm-ag-val');
  var n=Math.max(0,Math.min(20,(parseInt(disp.textContent)||0)+dir));
  disp.textContent=n;val.value=n;
}
function pmPreviewScreenshot(input){
  var file=input.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){var prev=$('pm-ss-preview');prev.src=e.target.result;prev.style.display='block';$('pm-ss-label').textContent='Screenshot ready ✓';};
  reader.readAsDataURL(file);
}
function submitPostMatchResult(){
  if(!myProfile)return;
  var mid=$('pm-mid').value,hg=parseInt($('pm-hg-val').value),ag=parseInt($('pm-ag-val').value);
  var honest=$('pm-honest').checked,file=$('pm-screenshot').files[0];
  var err=$('pm-err');err.textContent='';
  if(!mid){err.textContent='Match error.';return;}
  if(!honest){err.textContent='Please confirm the honesty declaration.';return;}
  if(!file){err.textContent='Screenshot is required as proof.';return;}
  var m=allMatches[mid];if(!m)return;
  var btn=$('pm-submit-btn');btn.textContent='Uploading...';btn.disabled=true;
  uploadToCloudinary(file,'efootball_results','result_'+mid+'_'+myProfile.uid+'_'+Date.now(),
    function(ssUrl){
      var now=Date.now();
      var awayUID=m.homeId===myProfile.uid?m.awayId:m.homeId;
      var refee=typeof pickReferee==='function'?pickReferee(mid,m.homeId,m.awayId,m.matchTime):null;
      db.ref('ef_matches/'+mid).update({
        hg:hg,ag:ag,played:true,resultSubmitted:true,
        pendingResult:false,awayVerifying:true,
        submittedAt:now,submittedBy:myProfile.uid,submittedByName:myProfile.username,
        screenshot:ssUrl,
        refereeUID:refee?refee.uid:'',refereeName:refee?refee.name:'Auto',
        refStatus:'pre-approved',awayVerifyDeadline:now+(48*60*60*1000),playedAt:now
      }).then(function(){
        closeMo('post-match-mo');
        if(typeof notifyAwayTeam==='function'&&awayUID&&allPlayers[awayUID])notifyAwayTeam(awayUID,allPlayers[awayUID],mid,m,hg,ag,ssUrl);
        if(refee&&refee.uid&&typeof notifyReferee==='function')notifyReferee(refee.uid,refee.name,mid,m,hg,ag,ssUrl);
        if(typeof scheduleAutoClose==='function')scheduleAutoClose(mid,now+(48*60*60*1000));
        db.ref('ef_reports').push({type:'result_submitted',matchId:mid,submittedBy:myProfile.uid,submittedByName:myProfile.username,hg:hg,ag:ag,screenshot:ssUrl,ts:now,status:'monitoring',reason:'Result submitted'});
        var roomKey='match_'+mid;
        db.ref('ef_match_chat/'+roomKey).push({from:'system',fromName:'eFootball Universe',text:'&#128202; RESULT SUBMITTED by '+myProfile.username+':

'+( allPlayers[m.homeId]||{}).username+' '+hg+' – '+ag+' '+(allPlayers[m.awayId]||{}).username+'

Opponent has 48 hours to dispute.',ts:Date.now(),system:true});
        showResultCelebration(mid,hg,ag,m);
        btn.textContent='Submit Result';btn.disabled=false;
      }).catch(function(e){err.textContent='Failed: '+e.message;btn.textContent='Submit Result';btn.disabled=false;});
    },
    function(){err.textContent='Upload failed. Check connection.';btn.textContent='Submit Result';btn.disabled=false;}
  );
}

// ── TICKER UPDATE ──────────────────────────────────────────
function updateNewsTicker(){
  var bar=$('news-ticker-bar'),track=$('news-ticker-track');
  if(!bar||!track)return;
  if(typeof _newsCache==='undefined'||!_newsCache.length){setTimeout(updateNewsTicker,3000);return;}
  var html=_newsCache.slice(0,14).map(function(n){return'<span style="font-size:.64rem;color:#ccc;display:inline-flex;align-items:center;gap:.5rem"><span style="width:4px;height:4px;border-radius:50%;background:#00D4FF;flex-shrink:0"></span>'+n.headline+'</span>';}).join('');
  track.innerHTML=html+html;
  bar.style.display='flex';
}

// ── TOPBAR SCROLL SHADOW ───────────────────────────────────
window.addEventListener('scroll',function(){
  var tb=$('topbar');if(!tb)return;
  tb.style.boxShadow=window.scrollY>8?'0 4px 30px rgba(0,0,0,0.6)':'none';
},{passive:true});

// ── CONFETTI ANIMATION ─────────────────────────────────────
(function(){
  var style=document.createElement('style');
  style.textContent='@keyframes confettiFall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}@keyframes celIn{from{opacity:0;transform:scale(.88) translateY(24px)}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes tickerScroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}';
  document.head.appendChild(style);
})();
