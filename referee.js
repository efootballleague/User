
// ============================================================
// REFEREE.JS — Result submission, away team verification,
// referee review, auto-approve, restrictions
// ============================================================

// ── OPEN SCORE MODAL ───────────────────────────────────────
function openScoreModal(){
  if(!myProfile){showLanding();return;}
  // Check if restricted from submitting
  if(isRestricted(myProfile.uid,'no_submit')){
    toast('You are currently restricted from submitting results.','error');return;
  }
  var uid=myProfile.uid;
  var pending=Object.values(allMatches).filter(function(m){
    return!m.played&&!m.pendingResult&&!m.awayVerifying&&(m.homeId===uid||m.awayId===uid);
  });
  if(!pending.length){toast('No pending matches to submit.','error');return;}
  var opts=pending.map(function(m){
    var hp=allPlayers[m.homeId],ap=allPlayers[m.awayId];if(!hp||!ap)return'';
    return'<option value="'+m.id+'">'+esc(hp.username)+' vs '+esc(ap.username)+'</option>';
  }).join('');
  $('sm-match-sel').innerHTML='<option value="">— Choose match —</option>'+opts;
  $('sm-hg').textContent='0';$('sm-ag').textContent='0';
  $('sm-hg-val').value='0';$('sm-ag-val').value='0';
  $('sm-screenshot').value='';
  $('sm-ss-preview').style.display='none';
  $('sm-ss-label').textContent='Tap to upload screenshot';
  $('sm-honest').checked=false;
  $('sm-err').textContent='';
  $('sm-home-name').textContent='Home';
  $('sm-away-name').textContent='Away';
  openMo('score-mo');
}

function smSelectMatch(){
  var mid=$('sm-match-sel').value;if(!mid)return;
  var m=allMatches[mid];if(!m)return;
  var hp=allPlayers[m.homeId],ap=allPlayers[m.awayId];if(!hp||!ap)return;
  $('sm-home-name').textContent=hp.username+' ('+hp.club+')';
  $('sm-away-name').textContent=ap.username+' ('+ap.club+')';
}

function stepGoal(side,dir){
  var el=$('sm-'+side),val_el=$('sm-'+side+'-val');
  var nv=Math.max(0,Math.min(20,(parseInt(el.textContent)||0)+dir));
  el.textContent=nv;val_el.value=nv;
}

function smPreviewScreenshot(input){
  var file=input.files[0];if(!file)return;
  if(file.size>10*1024*1024){$('sm-err').textContent='Image too large (max 10MB).';return;}
  var reader=new FileReader();
  reader.onload=function(e){
    var prev=$('sm-ss-preview');prev.src=e.target.result;prev.style.display='block';
    $('sm-ss-label').textContent='Screenshot selected ✓';
  };
  reader.readAsDataURL(file);
}

// ── SUBMIT RESULT ──────────────────────────────────────────
function submitScoreModal(){
  if(!myProfile){toast('Login first','error');return;}
  if(isRestricted(myProfile.uid,'no_submit')){toast('You are restricted from submitting results.','error');return;}
  var mid=$('sm-match-sel').value;
  var hg=parseInt($('sm-hg-val').value);
  var ag=parseInt($('sm-ag-val').value);
  var honest=$('sm-honest').checked;
  var file=$('sm-screenshot').files[0];
  var err=$('sm-err');err.textContent='';
  if(!mid){err.textContent='Please select a match.';return;}
  if(isNaN(hg)||isNaN(ag)){err.textContent='Enter both scores.';return;}
  if(!honest){err.textContent='You must agree to the honesty declaration.';return;}
  if(!file){err.textContent='Screenshot is required as proof.';return;}
  var btn=$('sm-submit-btn');btn.textContent='Uploading...';btn.disabled=true;

  uploadToCloudinary(file,'efootball_results','result_'+mid+'_'+myProfile.uid+'_'+Date.now(),
    function(ssUrl){saveResultLive(mid,hg,ag,ssUrl,btn,err);},
    function(){err.textContent='Upload failed. Check connection.';btn.textContent='Submit Result';btn.disabled=false;}
  );
}

// ── SAVE RESULT — points count IMMEDIATELY (pre-approved) ──
function saveResultLive(mid,hg,ag,ssUrl,btn,err){
  var m=allMatches[mid];if(!m)return;
  var now=Date.now();
  var awayUID=m.homeId===myProfile.uid?m.awayId:m.homeId;
  var awayPlayer=allPlayers[awayUID];
  // Pick referee
  var refee=pickReferee(mid,m.homeId,m.awayId,m.matchTime);

  db.ref('ef_matches/'+mid).update({
    hg:hg, ag:ag,
    played:true,          // IMMEDIATELY counted
    pendingResult:false,
    awayVerifying:true,   // away team needs to verify
    submittedAt:now,
    submittedBy:myProfile.uid,
    screenshot:ssUrl,
    refereeUID:refee?refee.uid:'',
    refereeName:refee?refee.name:'Auto',
    refStatus:'pre-approved',
    awayVerifyDeadline:now+(48*60*60*1000), // 48hrs to dispute
    playedAt:now
  }).then(function(){
    btn.textContent='Submit Result';btn.disabled=false;
    closeMo('score-mo');
    toast('✅ Result live! Away team has 48h to verify.');
    // Notify away team
    notifyAwayTeam(awayUID,awayPlayer,mid,m,hg,ag,ssUrl);
    // Notify referee
    if(refee&&refee.uid) notifyReferee(refee.uid,refee.name,mid,m,hg,ag,ssUrl);
    // Schedule auto-close after 48hrs
    scheduleAutoClose(mid,now+(48*60*60*1000));
    // Admin report
    db.ref('ef_reports').push({type:'result_submitted',matchId:mid,submittedBy:myProfile.uid,submittedByName:myProfile.username,hg:hg,ag:ag,screenshot:ssUrl,refereeUID:refee?refee.uid:'',refereeName:refee?refee.name:'None',ts:now,status:'monitoring',reason:'Result submitted — awaiting away team verification'});
  }).catch(function(){err.textContent='Failed to save. Try again.';btn.textContent='Submit Result';btn.disabled=false;});
}

function notifyAwayTeam(awayUID,awayPlayer,mid,m,hg,ag,ssUrl){
  if(!awayUID||!db||!myProfile)return;
  var key=dmKey(myProfile.uid,awayUID);
  var msg='⚽ RESULT SUBMITTED for your match:\n\n'
    +(allPlayers[m.homeId]?allPlayers[m.homeId].username:'?')+' '+hg+' – '+ag+' '+(allPlayers[m.awayId]?allPlayers[m.awayId].username:'?')
    +'\n\nIf you DISAGREE with this result, go to Referee tab → tap "Disagree" and upload your screenshot within 48 hours.\n\nIf no action taken, result stands automatically.';
  db.ref('ef_dm/'+key).push({from:'system',fromName:'eFootball Universe',text:msg,ts:Date.now(),system:true,matchId:mid});
  db.ref('ef_dm_meta/'+key).update({lastMsg:'Result submitted — verify now',lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+awayUID]:true});
  db.ref('ef_dm_unread/'+awayUID+'/'+key).transaction(function(v){return(v||0)+1;});
}

function notifyReferee(refUID,refName,mid,m,hg,ag,ssUrl){
  if(!myProfile||!db)return;
  var key=dmKey(myProfile.uid,refUID);
  var msg='🟢 REFEREE DUTY ASSIGNED\n\n'+(allPlayers[m.homeId]?allPlayers[m.homeId].username:'?')+' '+hg+' – '+ag+' '+(allPlayers[m.awayId]?allPlayers[m.awayId].username:'?')+'\n\nCheck Referee tab. Result is live but can be disputed within 48hrs.';
  db.ref('ef_dm/'+key).push({from:'system',fromName:'eFootball Universe',text:msg,ts:Date.now(),system:true});
  db.ref('ef_dm_meta/'+key).update({lastMsg:'Referee duty assigned',lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+refUID]:true});
  db.ref('ef_dm_unread/'+refUID+'/'+key).transaction(function(v){return(v||0)+1;});
}

// ── PICK REFEREE ───────────────────────────────────────────
function pickReferee(mid,homeId,awayId,matchTime){
  var matchDay=matchTime?new Date(matchTime).toDateString():new Date().toDateString();
  var players=Object.values(allPlayers).filter(function(p){
    if(p.uid===homeId||p.uid===awayId)return false;
    if(p.banned)return false;
    if(isRestricted(p.uid,'no_referee'))return false;
    var busy=Object.values(allMatches).some(function(m){
      if(m.id===mid)return false;
      if(m.homeId!==p.uid&&m.awayId!==p.uid)return false;
      if(!m.matchTime)return false;
      return new Date(m.matchTime).toDateString()===matchDay;
    });
    return!busy;
  });
  if(!players.length)return null;
  return players[Math.floor(Math.random()*players.length)];
}

// ── AWAY TEAM DISPUTES ─────────────────────────────────────
function openDisputeModal(mid){
  if(!myProfile){showLanding();return;}
  $('disp-mid').value=mid;
  var m=allMatches[mid];if(!m)return;
  $('disp-score').textContent=m.hg+' – '+m.ag;
  $('disp-screenshot').value='';
  $('disp-ss-preview').style.display='none';
  $('disp-ss-label').textContent='Upload your screenshot';
  $('disp-err').textContent='';
  openMo('dispute-mo');
}

function dispPreviewScreenshot(input){
  var file=input.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    var prev=$('disp-ss-preview');prev.src=e.target.result;prev.style.display='block';
    $('disp-ss-label').textContent='Screenshot selected ✓';
  };
  reader.readAsDataURL(file);
}

function submitDispute(){
  if(!myProfile){toast('Login first','error');return;}
  var mid=$('disp-mid').value;
  var file=$('disp-screenshot').files[0];
  var err=$('disp-err');err.textContent='';
  if(!mid){err.textContent='No match selected.';return;}
  if(!file){err.textContent='Upload your screenshot as evidence.';return;}
  var btn=$('disp-submit-btn');btn.textContent='Uploading...';btn.disabled=true;
  uploadToCloudinary(file,'efootball_disputes','dispute_'+mid+'_'+myProfile.uid+'_'+Date.now(),
    function(ssUrl){
      var m=allMatches[mid];
      db.ref('ef_matches/'+mid+'/awayDispute').set({
        uid:myProfile.uid,name:myProfile.username,screenshot:ssUrl,ts:Date.now(),status:'pending'
      }).then(function(){
        // Keep result as played but mark disputed
        db.ref('ef_matches/'+mid+'/refStatus').set('disputed');
        btn.textContent='Submit Dispute';btn.disabled=false;
        closeMo('dispute-mo');
        toast('⚠️ Dispute submitted. Referee and admin notified.');
        // Notify referee
        if(m.refereeUID&&allPlayers[m.refereeUID]){
          var rKey=dmKey(myProfile.uid,m.refereeUID);
          db.ref('ef_dm/'+rKey).push({from:'system',fromName:'eFootball Universe',text:'⚠️ DISPUTE RAISED on match you are refereeing!\n\n Away team ('+myProfile.username+') has uploaded counter-evidence. Please review in Referee tab.',ts:Date.now(),system:true});
          db.ref('ef_dm_meta/'+rKey).update({lastMsg:'Dispute raised — review now',lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+m.refereeUID]:true});
          db.ref('ef_dm_unread/'+m.refereeUID+'/'+rKey).transaction(function(v){return(v||0)+1;});
        }
        // Admin report
        db.ref('ef_reports').push({type:'result_disputed',matchId:mid,reporterUID:myProfile.uid,reporterName:myProfile.username,homeScreenshot:m.screenshot||'',awayScreenshot:ssUrl,hg:m.hg,ag:m.ag,homePlayer:allPlayers[m.homeId]?allPlayers[m.homeId].username:'?',awayPlayer:allPlayers[m.awayId]?allPlayers[m.awayId].username:'?',ts:Date.now(),status:'pending',reason:'Away team disputes submitted result'});
      }).catch(function(){err.textContent='Failed. Try again.';btn.textContent='Submit Dispute';btn.disabled=false;});
    },
    function(){err.textContent='Upload failed. Check connection.';btn.textContent='Submit Dispute';btn.disabled=false;}
  );
}

// ── REFEREE PANEL ──────────────────────────────────────────
function renderRefPanel(){
  var el=$('page-referee');if(!el)return;
  if(!myProfile){el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--dim)">Login to view referee duties.</div>';return;}
  var uid=myProfile.uid;
  var myDuties=Object.values(allMatches).filter(function(m){
    return m.refereeUID===uid&&m.played&&(m.refStatus==='pre-approved'||m.refStatus==='disputed')&&m.awayVerifying;
  });
  var mySubmitted=Object.values(allMatches).filter(function(m){
    return m.submittedBy===uid;
  }).slice(-10);

  var html='<div class="sh"><div class="st" style="color:#00d4ff">🟢 Referee Panel</div><div class="sl" style="background:linear-gradient(90deg,#00d4ff,transparent)"></div></div>';

  html+='<div style="font-family:Orbitron,sans-serif;font-size:.65rem;color:#00d4ff;letter-spacing:2px;margin-bottom:.7rem">ASSIGNED DUTIES ('+myDuties.length+')</div>';
  if(!myDuties.length){
    html+='<div class="card" style="padding:1.1rem;text-align:center;color:var(--dim);margin-bottom:1.2rem">No duties. You are free!</div>';
  } else {
    myDuties.forEach(function(m){
      var hp=allPlayers[m.homeId],ap=allPlayers[m.awayId];if(!hp||!ap)return;
      var isDisputed=m.refStatus==='disputed';
      var deadline=m.awayVerifyDeadline||0;
      var timeLeft=Math.max(0,deadline-Date.now());
      var hoursLeft=Math.floor(timeLeft/3600000),minsLeft=Math.floor((timeLeft%3600000)/60000);
      html+='<div class="ref-duty-card" style="border-color:'+(isDisputed?'rgba(255,0,110,0.4)':'rgba(0,212,255,0.25)')+'">'
        +(isDisputed?'<div style="background:rgba(255,0,110,0.12);border-radius:7px;padding:.45rem .7rem;margin-bottom:.65rem;font-size:.74rem;color:#ff006e;font-weight:700">⚠️ DISPUTED — Away team uploaded counter-screenshot</div>':'')
        +'<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.45rem;margin-bottom:.7rem">'
        +'<div style="display:flex;align-items:center;gap:.45rem">'+lgBadge(m.league)
        +'<span style="font-size:.72rem;font-weight:700">'+esc(hp.username)+' vs '+esc(ap.username)+'</span></div>'
        +'<span style="font-size:.6rem;color:'+(hoursLeft<6?'#ff006e':'#ffe600')+';font-weight:700">⏰ '+(timeLeft>0?hoursLeft+'h '+minsLeft+'m left':'Expired')+'</span></div>'
        // Score
        +'<div style="display:flex;align-items:center;justify-content:center;gap:.75rem;margin-bottom:.8rem">'
        +clubBadge(hp.club,m.league,28)
        +'<div style="text-align:center"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1.5rem;color:#fff;letter-spacing:4px">'+m.hg+' – '+m.ag+'</div>'
        +'<div style="font-size:.6rem;color:var(--dim)">Submitted by '+esc(allPlayers[m.submittedBy]?allPlayers[m.submittedBy].username:'?')+'</div></div>'
        +clubBadge(ap.club,m.league,28)
        +'</div>'
        // Screenshots
        +'<div style="display:grid;grid-template-columns:'+(isDisputed&&m.awayDispute?'1fr 1fr':'1fr')+';gap:.55rem;margin-bottom:.75rem">'
        +(m.screenshot?'<div><div style="font-size:.6rem;color:#ffe600;margin-bottom:3px">HOME SCREENSHOT</div><a href="'+m.screenshot+'" target="_blank"><img src="'+m.screenshot+'" style="width:100%;max-height:160px;object-fit:contain;border-radius:8px;border:1px solid rgba(255,255,255,0.1)"></a></div>':'')
        +(isDisputed&&m.awayDispute&&m.awayDispute.screenshot?'<div><div style="font-size:.6rem;color:#ff006e;margin-bottom:3px">AWAY SCREENSHOT</div><a href="'+m.awayDispute.screenshot+'" target="_blank"><img src="'+m.awayDispute.screenshot+'" style="width:100%;max-height:160px;object-fit:contain;border-radius:8px;border:1px solid rgba(255,0,110,0.3)"></a></div>':'')
        +'</div>'
        // Buttons
        +'<div style="display:flex;gap:.5rem;flex-wrap:wrap">'
        +'<button class="bg" style="flex:1;padding:10px;font-size:.8rem;font-weight:700" onclick="refereeConfirm(\''+m.id+'\')">✅ Confirm Result</button>'
        +(isDisputed?'<button class="bd" style="flex:1;padding:10px;font-size:.8rem;font-weight:700" onclick="refereeReverse(\''+m.id+'\')">🔄 Reverse Result</button>':'')
        +'<button class="bs" style="flex:1;padding:10px;font-size:.8rem;font-weight:700" onclick="refereeEscalate(\''+m.id+'\')">⬆️ Escalate to Admin</button>'
        +'</div>'
        +(timeLeft<=0?'<div style="font-size:.62rem;color:#00d4ff;margin-top:.45rem;text-align:center">⏰ Deadline passed — result stands unless you act</div>':'')
        +'</div>';
    });
  }

  // My submitted results
  html+='<div style="font-family:Orbitron,sans-serif;font-size:.65rem;color:#ffe600;letter-spacing:2px;margin-bottom:.65rem;margin-top:1.2rem">MY SUBMITTED RESULTS</div>';
  if(!mySubmitted.length){
    html+='<div class="card" style="padding:1rem;text-align:center;color:var(--dim)">No submitted results yet.</div>';
  } else {
    mySubmitted.sort(function(a,b){return(b.submittedAt||b.playedAt||0)-(a.submittedAt||a.playedAt||0);}).forEach(function(m){
      var hp=allPlayers[m.homeId],ap=allPlayers[m.awayId];if(!hp||!ap)return;
      var status=m.refStatus||'pre-approved';
      var sc={
        'pre-approved': {c:'#00ff88',t:'✅ Live'},
        'confirmed':    {c:'#00ff88',t:'✅ Confirmed by Referee'},
        'disputed':     {c:'#ff006e',t:'⚠️ Under Dispute'},
        'reversed':     {c:'#ff006e',t:'🔄 Result Reversed'},
        'escalated':    {c:'#ff6b00',t:'⬆️ Admin Review'},
      }[status]||{c:'#aaa',t:status};
      // Is away team for this match?
      var isAway=myProfile.uid===m.awayId;
      var canDispute=isAway&&m.awayVerifying&&!m.awayDispute&&m.awayVerifyDeadline&&Date.now()<m.awayVerifyDeadline;
      html+='<div class="card" style="padding:.75rem .9rem;margin-bottom:.45rem">'
        +'<div style="display:flex;align-items:center;gap:.65rem">'
        +'<div style="flex:1"><div style="font-size:.8rem;font-weight:700">'+esc(hp.username)+' '+m.hg+' – '+m.ag+' '+esc(ap.username)+'</div>'
        +'<div style="font-size:.62rem;color:var(--dim)">'+fmtFull(m.submittedAt||m.playedAt||0)+'</div></div>'
        +'<span style="font-size:.65rem;font-weight:700;color:'+sc.c+'">'+sc.t+'</span>'
        +'</div>'
        +(canDispute?'<div style="margin-top:.55rem;padding-top:.45rem;border-top:1px solid rgba(255,255,255,0.05)">'
          +'<button class="bd" style="font-size:.74rem;padding:6px 14px;width:100%" onclick="openDisputeModal(\''+m.id+'\')">❌ I Disagree — Upload My Screenshot</button>'
          +'<div style="font-size:.6rem;color:var(--dim);margin-top:3px;text-align:center">You have until '+fmtFull(m.awayVerifyDeadline)+' to dispute</div>'
          +'</div>':'')
        +'</div>';
    });
  }
  el.innerHTML=html;
}

// ── REFEREE ACTIONS ────────────────────────────────────────
function refereeConfirm(mid){
  if(!myProfile||!db)return;
  if(!confirm('Confirm this result as correct? It will be locked.'))return;
  db.ref('ef_matches/'+mid).update({refStatus:'confirmed',awayVerifying:false,confirmedBy:myProfile.uid,confirmedAt:Date.now()})
    .then(function(){
      toast('✅ Result confirmed and locked.');
      if(typeof onResultConfirmed==='function')onResultConfirmed(mid);
      notifyBothPlayers(mid,'✅ Your match result has been CONFIRMED by referee '+myProfile.username+'. Result is final.');
      renderRefPanel();
    }).catch(function(){toast('Failed','error');});
}

function refereeReverse(mid){
  if(!myProfile||!db)return;
  if(!confirm('REVERSE this result? Points will be recalculated.'))return;
  var m=allMatches[mid];if(!m)return;
  // Swap scores
  var newHG=m.ag,newAG=m.hg;
  db.ref('ef_matches/'+mid).update({hg:newHG,ag:newAG,refStatus:'reversed',awayVerifying:false,reversedBy:myProfile.uid,reversedAt:Date.now()})
    .then(function(){
      toast('🔄 Result reversed!');
      notifyBothPlayers(mid,'🔄 Your match result has been REVERSED by referee '+myProfile.username+'. New score: '+newHG+' – '+newAG);
      renderRefPanel();
    }).catch(function(){toast('Failed','error');});
}

function refereeEscalate(mid){
  if(!myProfile||!db)return;
  db.ref('ef_matches/'+mid).update({refStatus:'escalated',awayVerifying:false,escalatedBy:myProfile.uid,escalatedAt:Date.now()})
    .then(function(){
      toast('⬆️ Escalated to admin.');
      db.ref('ef_reports').push({type:'escalated_dispute',matchId:mid,escalatedBy:myProfile.uid,escalatedByName:myProfile.username,ts:Date.now(),status:'pending',reason:'Referee escalated dispute to admin for resolution'});
      renderRefPanel();
    }).catch(function(){toast('Failed','error');});
}

function notifyBothPlayers(mid,msg){
  var m=allMatches[mid];if(!m||!myProfile)return;
  [m.homeId,m.awayId].forEach(function(uid){
    if(!uid||!allPlayers[uid])return;
    var key=dmKey(myProfile.uid,uid);
    db.ref('ef_dm/'+key).push({from:'system',fromName:'Referee '+myProfile.username,text:msg,ts:Date.now(),system:true});
    db.ref('ef_dm_meta/'+key).update({lastMsg:'Result update',lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+uid]:true});
    db.ref('ef_dm_unread/'+uid+'/'+key).transaction(function(v){return(v||0)+1;});
  });
}

// Admin actions on disputed results
function adminApproveResult(mid){
  if(!me||me.email!==ADMIN_EMAIL)return;
  db.ref('ef_matches/'+mid).update({played:true,pendingResult:false,awayVerifying:false,refStatus:'confirmed',approvedBy:'admin',approvedAt:Date.now()})
    .then(function(){toast('Admin approved result.');});
}
function adminReverseResult(mid){
  if(!me||me.email!==ADMIN_EMAIL)return;
  var m=allMatches[mid];if(!m)return;
  if(!confirm('Reverse result? Score will be swapped.'))return;
  db.ref('ef_matches/'+mid).update({hg:m.ag,ag:m.hg,refStatus:'reversed',awayVerifying:false,reversedBy:'admin',reversedAt:Date.now()})
    .then(function(){toast('Result reversed by admin.');});
}

// ── AUTO-CLOSE after 48hrs ─────────────────────────────────
function scheduleAutoClose(mid,deadline){
  var delay=deadline-Date.now();
  if(delay<=0){runAutoClose(mid);return;}
  setTimeout(function(){runAutoClose(mid);},Math.min(delay,2147483647));
}
function runAutoClose(mid){
  if(!db)return;
  db.ref('ef_matches/'+mid).once('value',function(s){
    var m=s.val();if(!m)return;
    if(!m.awayVerifying||m.refStatus==='confirmed'||m.refStatus==='disputed')return;
    if(Date.now()<(m.awayVerifyDeadline||0))return;
    db.ref('ef_matches/'+mid).update({awayVerifying:false,refStatus:'confirmed',autoClosedAt:Date.now()})
      .then(function(){toast('⏰ Result auto-confirmed (48hr deadline passed).');});
  });
}
function checkPendingAutoApprovals(){
  if(!db)return;
  db.ref('ef_matches').orderByChild('awayVerifying').equalTo(true).once('value',function(s){
    Object.entries(s.val()||{}).forEach(function(kv){
      var mid=kv[0],m=kv[1];
      if(m.awayVerifyDeadline&&Date.now()>=m.awayVerifyDeadline)runAutoClose(mid);
      else if(m.awayVerifyDeadline)scheduleAutoClose(mid,m.awayVerifyDeadline);
    });
  });
}

// Badge + listen
function listenRefDuties(){
  if(!myProfile||!db)return;
  db.ref('ef_matches').orderByChild('refereeUID').equalTo(myProfile.uid).on('value',function(s){
    var duties=Object.values(s.val()||{}).filter(function(m){return m.awayVerifying&&(m.refStatus==='pre-approved'||m.refStatus==='disputed');});
    updateBadge('ref-badge',duties.length);
    if(activePage()==='referee')renderRefPanel();
  });
  // Also watch for matches where I'm the away team needing to verify
  db.ref('ef_matches').orderByChild('awayVerifying').equalTo(true).on('value',function(s){
    var needVerify=Object.values(s.val()||{}).filter(function(m){return m.awayId===myProfile.uid&&!m.awayDispute&&m.awayVerifyDeadline&&Date.now()<m.awayVerifyDeadline;});
    if(needVerify.length>0){
      var cur=parseInt(($('ref-badge')||{}).textContent)||0;
      updateBadge('ref-badge',cur+needVerify.length);
    }
  });
}
