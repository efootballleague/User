
// ============================================================
// MATCHROOM.JS
// Temporary pre-match chat rooms + improved postpone system
// ============================================================

// ── MATCH ROOM MANAGEMENT ──────────────────────────────────
// Room key format: "match_{matchId}"
// Participants: homeId, awayId, refereeUID
// Auto-created when match is scheduled
// Auto-deleted when result approved/confirmed

function getMatchRoomKey(mid){
  return 'match_'+mid;
}

function createMatchRoom(mid){
  if(!db)return;
  var m=allMatches[mid];if(!m)return;
  var hp=allPlayers[m.homeId],ap=allPlayers[m.awayId];
  if(!hp||!ap)return;
  var roomKey=getMatchRoomKey(mid);
  var participants={};
  participants[m.homeId]=true;
  participants[m.awayId]=true;
  if(m.refereeUID)participants[m.refereeUID]=true;

  db.ref('ef_match_rooms/'+roomKey).set({
    matchId:mid,
    homeId:m.homeId,homeName:hp.username,homeClub:hp.club,
    awayId:m.awayId,awayName:ap.username,awayClub:ap.club,
    refereeUID:m.refereeUID||'',refereeName:m.refereeName||'',
    league:m.league,
    matchTime:m.matchTime||0,
    participants:participants,
    createdAt:Date.now(),
    active:true
  });
  // Welcome system message
  db.ref('ef_match_chat/'+roomKey).push({
    from:'system',fromName:'eFootball Universe',
    text:'🏟️ Match room created for '+hp.username+' vs '+ap.username+'!\n\nUse this room to agree on match time and room code. This room will be deleted after the result is confirmed.',
    ts:Date.now(),system:true
  });
  // DM notification to all participants
  [m.homeId,m.awayId,m.refereeUID].forEach(function(uid){
    if(!uid||!allPlayers[uid])return;
    if(uid===myProfile.uid)return;
    var key=dmKey(myProfile.uid,uid);
    db.ref('ef_dm/'+key).push({from:'system',fromName:'eFootball Universe',text:'🏟️ A match room has been created for your upcoming match: '+hp.username+' vs '+ap.username+'. Tap "Match" tab → open room.',ts:Date.now(),system:true});
    db.ref('ef_dm_meta/'+key).update({lastMsg:'Match room created',lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+uid]:true});
    db.ref('ef_dm_unread/'+uid+'/'+key).transaction(function(v){return(v||0)+1;});
  });
}

function deleteMatchRoom(mid){
  if(!db)return;
  var roomKey=getMatchRoomKey(mid);
  // Post farewell message first
  db.ref('ef_match_chat/'+roomKey).push({
    from:'system',fromName:'eFootball Universe',
    text:'✅ Match result has been confirmed. This room is now closed and will be deleted.',
    ts:Date.now(),system:true
  });
  // Delete after 5 seconds
  setTimeout(function(){
    db.ref('ef_match_rooms/'+roomKey).remove();
    db.ref('ef_match_chat/'+roomKey).remove();
  },5000);
}

// ── MATCH ROOM LIST ────────────────────────────────────────
var matchRoomOff=null, activeRoomKey=null, matchRoomChatOff=null;

function renderMatchRooms(){
  var el=$('match-rooms-list');if(!el)return;
  if(!myProfile){el.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--dim)">Login to see match rooms.</div>';return;}
  var uid=myProfile.uid;
  // Listen to rooms I'm in
  if(matchRoomOff){matchRoomOff();matchRoomOff=null;}
  var ref=db.ref('ef_match_rooms').orderByChild('participants/'+uid).equalTo(true);
  var handler=ref.on('value',function(s){
    var rooms=Object.values(s.val()||{}).filter(function(r){return r.active;}).sort(function(a,b){return(a.matchTime||0)-(b.matchTime||0);});
    if(!rooms.length){el.innerHTML='<div class="card" style="padding:1.2rem;text-align:center;color:var(--dim)">No match rooms yet.<br><span style="font-size:.68rem">Rooms are created when your match is scheduled.</span></div>';return;}
    el.innerHTML=rooms.map(function(r){
      var lg=LGS[r.league]||{};
      var isActive=activeRoomKey===getMatchRoomKey(r.matchId);
      var timeStr=r.matchTime?fmtFull(r.matchTime):'Time TBD';
      // Postpone request badge
      var m=allMatches[r.matchId]||{};
      var hasPending=m.postponeRequest&&m.postponeRequest.status==='pending';
      return'<div onclick="openMatchRoom(\''+r.matchId+'\')" style="display:flex;align-items:center;gap:.75rem;padding:.8rem .95rem;background:'+(isActive?'rgba(255,230,0,0.07)':'var(--card)')+';border:1.5px solid '+(isActive?'#ffe600':hasPending?'rgba(255,107,0,0.35)':'var(--border)')+';border-radius:11px;margin-bottom:.45rem;cursor:pointer;transition:all .18s">'
        +'<div style="position:relative">'
        +clubBadge(r.homeClub,r.league,32)
        +'<div style="position:absolute;bottom:-3px;right:-3px;width:14px;height:14px;border-radius:50%;background:#00ff88;border:2px solid var(--dark);font-size:.45rem;display:flex;align-items:center;justify-content:center">⚽</div>'
        +'</div>'
        +'<div style="flex:1;min-width:0">'
        +'<div style="font-weight:700;font-size:.82rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(r.homeName)+' vs '+esc(r.awayName)+'</div>'
        +'<div style="font-size:.6rem;color:var(--dim)">'+lgBadge(r.league)+' &middot; '+timeStr+'</div>'
        +(r.refereeName?'<div style="font-size:.58rem;color:#00ff88;margin-top:1px">🟢 Ref: '+esc(r.refereeName)+'</div>':'')
        +(hasPending?'<div style="font-size:.6rem;color:#ff6b00;font-weight:700;margin-top:1px">⏸ Postpone request pending</div>':'')
        +'</div>'
        +clubBadge(r.awayClub,r.league,28)
        +'</div>';
    }).join('');
  });
  matchRoomOff=function(){ref.off('value',handler);};
}

function openMatchRoom(mid){
  var roomKey=getMatchRoomKey(mid);
  activeRoomKey=roomKey;
  var m=allMatches[mid]||{};
  var r=null;
  db.ref('ef_match_rooms/'+roomKey).once('value',function(s){
    r=s.val();if(!r)return;
    // Show chat panel
    var panel=$('match-room-panel');
    if(!panel)return;
    var lg=LGS[r.league]||{};
    var isAdmin=me&&me.email===ADMIN_EMAIL;
    var isRef=myProfile&&r.refereeUID===myProfile.uid;
    var isPlayer=myProfile&&(r.homeId===myProfile.uid||r.awayId===myProfile.uid);
    var postponeReq=m.postponeRequest;
    panel.innerHTML=
      // Header
      '<div style="border-bottom:1px solid var(--border);padding:.8rem .9rem;display:flex;align-items:center;gap:.65rem;flex-wrap:wrap">'
      +clubBadge(r.homeClub,r.league,30)
      +'<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.85rem">'+esc(r.homeName)+' vs '+esc(r.awayName)+'</div>'
      +'<div style="font-size:.63rem;color:var(--dim)">'+lgBadge(r.league)+' &middot; '+(m.matchTime?fmtFull(m.matchTime):'Time TBD')+'</div></div>'
      +clubBadge(r.awayClub,r.league,28)
      // Action buttons
      +'<div style="display:flex;gap:.35rem;flex-wrap:wrap;width:100%;padding-top:.55rem;border-top:1px solid rgba(255,255,255,0.04)">'
      // Admin: set time button
      +(isAdmin?'<button class="bp" style="font-size:.66rem;padding:4px 10px" onclick="openSetTimeModal(\''+mid+'\')">⏰ Set Time</button>':'')
      // Players: request postpone
      +(isPlayer&&!postponeReq?'<button class="bs" style="font-size:.66rem;padding:4px 10px" onclick="openPostponeRequest(\''+mid+'\')">⏸ Request Postpone</button>':'')
      // Referee/Admin: approve/reject postpone
      +(postponeReq&&postponeReq.status==='pending'&&(isRef||isAdmin)?
        '<button class="bg" style="font-size:.66rem;padding:4px 10px" onclick="approvePostpone(\''+mid+'\')" >✅ Approve Postpone</button>'
        +'<button class="bd" style="font-size:.66rem;padding:4px 10px" onclick="rejectPostpone(\''+mid+'\')" >❌ Reject Postpone</button>':'')
      // Pending postpone info
      +(postponeReq&&postponeReq.status==='pending'&&!isRef&&!isAdmin?
        '<div style="font-size:.68rem;color:#ff6b00;font-style:italic">⏸ Postpone request pending referee/admin approval...</div>':'')
      +'</div></div>'
      // Postpone request card
      +(postponeReq&&postponeReq.status==='pending'?
        '<div style="margin:.65rem .9rem;padding:.7rem .85rem;background:rgba(255,107,0,0.08);border:1px solid rgba(255,107,0,0.28);border-radius:10px">'
        +'<div style="font-size:.65rem;color:#ff6b00;font-weight:700;margin-bottom:3px">⏸ POSTPONE REQUESTED</div>'
        +'<div style="font-size:.75rem;color:#ccc">Requested by: <strong>'+esc(postponeReq.requestedByName||'?')+'</strong></div>'
        +'<div style="font-size:.75rem;color:#ccc">Reason: '+esc(postponeReq.reason||'')+'</div>'
        +'<div style="font-size:.75rem;color:#ffe600">Proposed date: '+fmtFull(postponeReq.proposedDate||0)+'</div>'
        +'</div>':'')
      // Messages area
      +'<div id="room-msgs" style="flex:1;overflow-y:auto;padding:.65rem;display:flex;flex-direction:column;gap:3px;scroll-behavior:smooth;height:300px;min-height:200px"></div>'
      // Input
      +'<div style="display:flex;gap:.45rem;padding:.55rem .75rem;border-top:1px solid var(--border);align-items:center">'
      +'<input id="room-inp" type="text" maxlength="400" placeholder="Message the group..." style="flex:1;background:#1e1e1e;border:1.5px solid rgba(255,255,255,0.08);border-radius:22px;color:#fff;padding:9px 14px;font-family:Exo 2,sans-serif;font-size:.84rem;outline:none" onkeydown="if(event.key===\'Enter\')sendRoomMsg(\''+roomKey+'\')">'
      +'<button onclick="sendRoomMsg(\''+roomKey+'\')" style="background:linear-gradient(135deg,#00D4FF,#00FF85);border:none;border-radius:50%;width:38px;height:38px;cursor:pointer;font-size:1rem;flex-shrink:0">&#10148;</button>'
      +'</div>';

    panel.style.display='flex';
    panel.style.flexDirection='column';
    loadRoomChat(roomKey);
    renderMatchRooms(); // refresh list to show active state
  });
}

function loadRoomChat(roomKey){
  if(matchRoomChatOff){matchRoomChatOff();matchRoomChatOff=null;}
  var ref=db.ref('ef_match_chat/'+roomKey).limitToLast(60);
  var handler=ref.on('value',function(s){
    var arr=Object.values(s.val()||{}).sort(function(a,b){return a.ts-b.ts;});
    var box=$('room-msgs');if(!box)return;
    var atBot=box.scrollHeight-box.scrollTop-box.clientHeight<80;
    var parts=[];
    arr.forEach(function(msg){
      if(msg.system){parts.push('<div style="text-align:center;font-size:.62rem;color:var(--dim);padding:4px 0;font-style:italic;border-bottom:1px solid rgba(255,255,255,0.04);margin-bottom:2px">'+esc(msg.text)+'</div>');return;}
      var mine=myProfile&&msg.from===myProfile.uid;
      var c=clubColor(msg.club||'?');
      parts.push('<div style="display:flex;flex-direction:'+(mine?'row-reverse':'row')+';gap:.5rem;align-items:flex-end;margin-bottom:4px">'
        +'<div style="width:24px;height:24px;border-radius:50%;background:'+c+'22;border:1.5px solid '+c+'55;color:'+c+';display:flex;align-items:center;justify-content:center;font-size:.52rem;font-weight:800;flex-shrink:0">'+esc(msg.fromName||'?').slice(0,2).toUpperCase()+'</div>'
        +'<div style="max-width:72%">'
        +(!mine?'<div style="font-size:.58rem;font-weight:700;color:'+c+';margin-bottom:1px">'+esc(msg.fromName||'')+'</div>':'')
        +'<div style="padding:7px 11px;border-radius:'+(mine?'14px 14px 4px 14px':'14px 14px 14px 4px')+';background:'+(mine?'linear-gradient(135deg,#00D4FF,rgba(0,212,255,0.5))':'#2a2a2a')+';color:#fff;font-size:.82rem;line-height:1.42;word-break:break-word">'+esc(msg.text)+'</div>'
        +'<div style="font-size:.54rem;color:var(--dim);margin-top:1px;'+(mine?'text-align:right':'')+'">'+fmtTime(msg.ts)+'</div>'
        +'</div></div>');
    });
    box.innerHTML=parts.join('');
    if(atBot)box.scrollTop=box.scrollHeight;
  });
  matchRoomChatOff=function(){ref.off('value',handler);};
}

function sendRoomMsg(roomKey){
  if(!myProfile){showLanding();return;}
  var inp=$('room-inp');if(!inp)return;
  var text=inp.value.trim();if(!text)return;
  inp.value='';
  db.ref('ef_match_chat/'+roomKey).push({
    from:myProfile.uid,fromName:myProfile.username,
    club:myProfile.club,league:myProfile.league,
    text:text,ts:Date.now()
  });
}

// ── SET MATCH TIME (Admin) ─────────────────────────────────
function openSetTimeModal(mid){
  $('set-time-mid').value=mid;
  var m=allMatches[mid]||{};
  if(m.matchTime){
    var d=new Date(m.matchTime);
    var pad=function(n){return String(n).padStart(2,'0');};
    $('set-time-inp').value=d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes());
  } else {
    $('set-time-inp').value='';
  }
  $('set-time-err').textContent='';
  openMo('set-time-mo');
}

function saveMatchTime(){
  var mid=$('set-time-mid').value;
  var val=$('set-time-inp').value;
  var err=$('set-time-err');err.textContent='';
  if(!mid||!val){err.textContent='Select a date and time.';return;}
  var ts=new Date(val).getTime();
  if(isNaN(ts)||ts<Date.now()){err.textContent='Choose a future date and time.';return;}
  db.ref('ef_matches/'+mid).update({matchTime:ts,timeSetBy:'admin',timeSetAt:Date.now()})
    .then(function(){
      // Update room
      var roomKey=getMatchRoomKey(mid);
      db.ref('ef_match_rooms/'+roomKey+'/matchTime').set(ts);
      // Notify players in room
      db.ref('ef_match_chat/'+roomKey).push({
        from:'system',fromName:'Admin',
        text:'⏰ Match time has been set: '+fmtFull(ts)+'. Get ready!',
        ts:Date.now(),system:true
      });
      // DM both players
      var m=allMatches[mid]||{};
      [m.homeId,m.awayId].forEach(function(uid){
        if(!uid||!allPlayers[uid])return;
        var key=dmKey(myProfile.uid,uid);
        db.ref('ef_dm/'+key).push({from:'system',fromName:'Admin',text:'⏰ Your match time has been set: '+fmtFull(ts)+'\n\n'+esc((allPlayers[m.homeId]||{}).username||'?')+' vs '+esc((allPlayers[m.awayId]||{}).username||'?'),ts:Date.now(),system:true});
        db.ref('ef_dm_meta/'+key).update({lastMsg:'Match time set: '+fmtFull(ts),lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+uid]:true});
        db.ref('ef_dm_unread/'+uid+'/'+key).transaction(function(v){return(v||0)+1;});
      });
      closeMo('set-time-mo');
      toast('✅ Match time set!');
      openMatchRoom(mid); // refresh room view
    }).catch(function(){err.textContent='Failed. Try again.';});
}

// ── POSTPONE REQUEST SYSTEM ────────────────────────────────
function openPostponeRequest(mid){
  $('ppr-mid').value=mid;
  $('ppr-date').value='';
  $('ppr-reason').value='';
  $('ppr-err').textContent='';
  openMo('postpone-req-mo');
}

function submitPostponeRequest(){
  if(!myProfile)return;
  var mid=$('ppr-mid').value;
  var date=$('ppr-date').value;
  var reason=$('ppr-reason').value.trim();
  var err=$('ppr-err');err.textContent='';
  if(!date){err.textContent='Choose your preferred date.';return;}
  if(!reason){err.textContent='Give a reason.';return;}
  var proposedTS=new Date(date).getTime();
  if(isNaN(proposedTS)||proposedTS<Date.now()){err.textContent='Choose a future date.';return;}
  var m=allMatches[mid];if(!m)return;
  db.ref('ef_matches/'+mid+'/postponeRequest').set({
    requestedBy:myProfile.uid,
    requestedByName:myProfile.username,
    proposedDate:proposedTS,
    reason:reason,
    status:'pending',
    ts:Date.now()
  }).then(function(){
    closeMo('postpone-req-mo');
    toast('⏸ Postpone request submitted!');
    // Notify in match room
    var roomKey=getMatchRoomKey(mid);
    db.ref('ef_match_chat/'+roomKey).push({
      from:'system',fromName:'eFootball Universe',
      text:'⏸ '+myProfile.username+' has requested a postpone.\nProposed date: '+fmtFull(proposedTS)+'\nReason: '+reason+'\n\nReferee or Admin must approve.',
      ts:Date.now(),system:true
    });
    // Notify referee and admin
    [m.refereeUID].forEach(function(uid){
      if(!uid||!allPlayers[uid])return;
      var key=dmKey(myProfile.uid,uid);
      db.ref('ef_dm/'+key).push({from:'system',fromName:'eFootball Universe',text:'⏸ POSTPONE REQUEST\n\n'+myProfile.username+' wants to postpone their match.\nProposed: '+fmtFull(proposedTS)+'\nReason: '+reason+'\n\nGo to match room to approve or reject.',ts:Date.now(),system:true});
      db.ref('ef_dm_meta/'+key).update({lastMsg:'Postpone request',lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+uid]:true});
      db.ref('ef_dm_unread/'+uid+'/'+key).transaction(function(v){return(v||0)+1;});
    });
    if(me)db.ref('ef_reports').push({type:'postpone_request',matchId:mid,requestedBy:myProfile.uid,requestedByName:myProfile.username,proposedDate:proposedTS,reason:reason,ts:Date.now(),status:'pending'});
    openMatchRoom(mid);
  }).catch(function(){err.textContent='Failed. Try again.';});
}

function approvePostpone(mid){
  if(!myProfile)return;
  var m=allMatches[mid];if(!m||!m.postponeRequest)return;
  var newDate=m.postponeRequest.proposedDate;
  db.ref('ef_matches/'+mid).update({
    matchTime:newDate,
    postponed:true,
    postponeRequest:Object.assign({},m.postponeRequest,{status:'approved',approvedBy:myProfile.uid,approvedByName:myProfile.username,approvedAt:Date.now()})
  }).then(function(){
    toast('✅ Postpone approved! New date: '+fmtFull(newDate));
    var roomKey=getMatchRoomKey(mid);
    db.ref('ef_match_rooms/'+roomKey+'/matchTime').set(newDate);
    db.ref('ef_match_chat/'+roomKey).push({
      from:'system',fromName:myProfile.username,
      text:'✅ Postpone APPROVED by '+myProfile.username+'.\nNew match date: '+fmtFull(newDate),
      ts:Date.now(),system:true
    });
    // DM both players
    [m.homeId,m.awayId].forEach(function(uid){
      if(!uid||!allPlayers[uid])return;
      var key=dmKey(myProfile.uid,uid);
      db.ref('ef_dm/'+key).push({from:'system',fromName:myProfile.username,text:'✅ Your postpone request was APPROVED.\nNew match date: '+fmtFull(newDate),ts:Date.now(),system:true});
      db.ref('ef_dm_meta/'+key).update({lastMsg:'Postpone approved',lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+uid]:true});
      db.ref('ef_dm_unread/'+uid+'/'+key).transaction(function(v){return(v||0)+1;});
    });
    openMatchRoom(mid);
  }).catch(function(){toast('Failed','error');});
}

function rejectPostpone(mid){
  if(!myProfile)return;
  var reason=prompt('Reason for rejecting the postpone?');
  if(!reason||!reason.trim())return;
  var m=allMatches[mid];if(!m)return;
  db.ref('ef_matches/'+mid+'/postponeRequest').update({status:'rejected',rejectedBy:myProfile.uid,rejectedByName:myProfile.username,rejectReason:reason.trim(),rejectedAt:Date.now()})
    .then(function(){
      toast('❌ Postpone rejected.');
      var roomKey=getMatchRoomKey(mid);
      db.ref('ef_match_chat/'+roomKey).push({
        from:'system',fromName:myProfile.username,
        text:'❌ Postpone REJECTED by '+myProfile.username+'.\nReason: '+reason+'\nOriginal match time stands: '+(m.matchTime?fmtFull(m.matchTime):'TBD'),
        ts:Date.now(),system:true
      });
      [m.homeId,m.awayId].forEach(function(uid){
        if(!uid||!allPlayers[uid])return;
        var key=dmKey(myProfile.uid,uid);
        db.ref('ef_dm/'+key).push({from:'system',fromName:myProfile.username,text:'❌ Your postpone request was REJECTED.\nReason: '+reason,ts:Date.now(),system:true});
        db.ref('ef_dm_meta/'+key).update({lastMsg:'Postpone rejected',lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+uid]:true});
        db.ref('ef_dm_unread/'+uid+'/'+key).transaction(function(v){return(v||0)+1;});
      });
      openMatchRoom(mid);
    }).catch(function(){toast('Failed','error');});
}

// ── WIRE INTO EXISTING SYSTEMS ────────────────────────────
// Called from pages.js when match is scheduled
var _origScheduleMatch=null;
(function(){
  if(typeof scheduleMatch==='function'){
    _origScheduleMatch=scheduleMatch;
    scheduleMatch=function(mid,lid,hid,aid){
      _origScheduleMatch(mid,lid,hid,aid);
      // Create match room after short delay (let Firebase settle)
      setTimeout(function(){
        db.ref('ef_matches/'+mid).once('value',function(s){
          allMatches[mid]=s.val();
          createMatchRoom(mid);
        });
      },2000);
    };
  }
})();

// Called from referee.js after result confirmed — delete room
function onResultConfirmed(mid){
  deleteMatchRoom(mid);
}

// Listen to rooms for badge on match prep tab
function listenMatchRooms(){
  if(!myProfile||!db)return;
  db.ref('ef_match_rooms').orderByChild('participants/'+myProfile.uid).equalTo(true).on('value',function(s){
    var rooms=Object.values(s.val()||{}).filter(function(r){return r.active;});
    updateBadge('matchroom-badge',rooms.length);
  });
}
