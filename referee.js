// ============================================================
// REFEREE.JS — Score Submit, Dispute, Referee Panel
// Result review is visible to: home, away, referee, admin
// Auto-approve after 48h if no dispute
// ============================================================

// ── OPEN SCORE MODAL ─────────────────────────────────────────
function openScoreModal() {
  if (!myProfile) { showLanding(); return; }
  if (isRestricted(myProfile.uid, 'no_submit')) {
    toast('You are restricted from submitting results.', 'error'); return;
  }
  var uid     = myProfile.uid;
  var pending = Object.values(allMatches).filter(function(m) {
    return !m.played && !m.pendingResult && !m.awayVerifying
      && (m.homeId===uid || m.awayId===uid);
  });
  if (!pending.length) { toast('No pending matches to submit.', 'error'); return; }
  var opts = pending.map(function(m) {
    var hp=allPlayers[m.homeId], ap=allPlayers[m.awayId]; if(!hp||!ap) return '';
    return '<option value="'+m.id+'">'+esc(hp.username)+' vs '+esc(ap.username)+'</option>';
  }).join('');
  $('sm-match-sel').innerHTML = '<option value="">— Choose match —</option>'+opts;
  $('sm-hg').textContent='0'; $('sm-ag').textContent='0';
  $('sm-hg-val').value='0'; $('sm-ag-val').value='0';
  $('sm-screenshot').value='';
  var prev=$('sm-ss-preview'); if(prev) prev.classList.add('hidden');
  $('sm-ss-label').textContent='Tap to upload screenshot';
  $('sm-honest').checked=false;
  $('sm-err').textContent='';
  $('sm-home-name').textContent='Home';
  $('sm-away-name').textContent='Away';
  openMo('score-mo');
}

function smSelectMatch() {
  var mid=$('sm-match-sel').value; if(!mid) return;
  var m=allMatches[mid]; if(!m) return;
  var hp=allPlayers[m.homeId], ap=allPlayers[m.awayId]; if(!hp||!ap) return;
  $('sm-home-name').textContent=hp.username+' ('+hp.club+')';
  $('sm-away-name').textContent=ap.username+' ('+ap.club+')';
}

function stepGoal(side, dir) {
  var id='sm-'+side, vid=id+'-val';
  var v=parseInt($(vid).value||0)+dir;
  if(v<0)v=0; if(v>20)v=20;
  $(id).textContent=v; $(vid).value=v;
}

function smPreviewScreenshot(input) {
  var f=input.files[0]; if(!f) return;
  var r=new FileReader();
  r.onload=function(e){ var p=$('sm-ss-preview'); p.src=e.target.result; p.classList.remove('hidden'); $('sm-ss-label').textContent=f.name; };
  r.readAsDataURL(f);
}

function submitScoreModal() {
  if (!myProfile) { showLanding(); return; }
  var mid  = $('sm-match-sel').value;
  var hg   = parseInt($('sm-hg-val').value);
  var ag   = parseInt($('sm-ag-val').value);
  var file = $('sm-screenshot').files[0];
  var hon  = $('sm-honest').checked;
  var err  = $('sm-err'); err.textContent='';
  if (!mid)           { err.textContent='Select a match.'; return; }
  if (isNaN(hg)||isNaN(ag)) { err.textContent='Enter both scores.'; return; }
  if (!file)          { err.textContent='Screenshot is required.'; return; }
  if (!hon)           { err.textContent='Please confirm the result is honest.'; return; }
  var btn=$('sm-submit-btn'); btn.textContent='Uploading...'; btn.disabled=true;
  uploadToCloudinary(file,'results',null,function(url){
    saveResultLive(mid,hg,ag,url,btn,err);
  },function(){
    err.textContent='Screenshot upload failed.';
    btn.textContent='📨 Submit to Referee'; btn.disabled=false;
  });
}

function saveResultLive(mid, hg, ag, ssUrl, btn, err) {
  var m=allMatches[mid]; if(!m) return;
  var uid=myProfile.uid;
  var now=Date.now();
  db.ref(DB.matches+'/'+mid).update({
    played:         true,
    hg:             hg,
    ag:             ag,
    playedAt:       now,
    pendingResult:  false,
    awayVerifying:  true,
    awayVerifyDeadline: now + 48*60*60*1000,
    screenshot:     ssUrl,
    pendingSS:      ssUrl,
    pendingHg:      hg,
    pendingAg:      ag,
    submittedBy:    uid,
    submittedAt:    now,
    refStatus:      'live'
  }).then(function() {
    btn.textContent='📨 Submit to Referee'; btn.disabled=false;
    closeMo('score-mo');
    toast('Result submitted! Away team has 48h to verify or dispute.');
    notifyAwayTeam(m.awayId, allPlayers[m.awayId], mid, m, hg, ag, ssUrl);
    if (m.refereeUID) notifyReferee(m.refereeUID, m.refereeName, mid, m, hg, ag, ssUrl);
    // Schedule auto-approve after 48h
    scheduleAutoClose(mid, now + 48*60*60*1000);
    if (typeof checkSeasonEnd==='function') checkSeasonEnd();
  }).catch(function(e){ err.textContent='Failed: '+e.message; btn.textContent='📨 Submit to Referee'; btn.disabled=false; });
}

function notifyAwayTeam(awayUID, awayPlayer, mid, m, hg, ag, ssUrl) {
  if (!awayUID||!db) return;
  var hp=allPlayers[m.homeId];
  sendNotif(awayUID, {
    title:'⚠️ Verify Match Result',
    body: (hp?hp.username:'Home')+' submitted '+hg+'-'+ag+'. You have 48h to verify or dispute.',
    type:'result', icon:'result'
  });
}

function notifyReferee(refUID, refName, mid, m, hg, ag, ssUrl) {
  if (!refUID||!db) return;
  var hp=allPlayers[m.homeId], ap=allPlayers[m.awayId];
  sendNotif(refUID, {
    title:'Match result to review',
    body:(hp?hp.username:'?')+' vs '+(ap?ap.username:'?')+' — '+hg+'-'+ag,
    type:'referee', icon:'referee'
  });
}

// ── DISPUTE MODAL ────────────────────────────────────────────
function openDisputeModal(mid) {
  if (!myProfile) { showLanding(); return; }
  var m=allMatches[mid]; if(!m) return;
  $('disp-mid').value=mid;
  $('disp-score').textContent=(m.pendingHg||m.hg||0)+' – '+(m.pendingAg||m.ag||0);
  $('disp-screenshot').value='';
  var prev=$('disp-ss-preview'); if(prev) prev.classList.add('hidden');
  $('disp-ss-label').textContent='Upload your screenshot';
  $('disp-err').textContent='';
  openMo('dispute-mo');
}

function dispPreviewScreenshot(input) {
  var f=input.files[0]; if(!f) return;
  var r=new FileReader();
  r.onload=function(e){ var p=$('disp-ss-preview'); p.src=e.target.result; p.classList.remove('hidden'); $('disp-ss-label').textContent=f.name; };
  r.readAsDataURL(f);
}

function submitDispute() {
  var mid  = $('disp-mid').value;
  var file = $('disp-screenshot').files[0];
  var err  = $('disp-err'); err.textContent='';
  if (!mid)  { err.textContent='No match.'; return; }
  if (!file) { err.textContent='Screenshot required.'; return; }
  if (!myProfile) { err.textContent='Login first.'; return; }
  var btn=$('disp-submit-btn'); btn.textContent='Uploading...'; btn.disabled=true;
  uploadToCloudinary(file,'disputes',null,function(url){
    db.ref(DB.matches+'/'+mid).update({
      awayDispute:   true,
      disputeSS:     url,
      disputeBy:     myProfile.uid,
      disputeAt:     Date.now(),
      awayVerifying: false,
      refStatus:     'disputed'
    }).then(function(){
      closeMo('dispute-mo');
      toast('Dispute submitted. Referee will decide.');
      btn.textContent='❌ Submit Dispute'; btn.disabled=false;
      var m=allMatches[mid];
      if (m&&m.refereeUID) sendNotif(m.refereeUID,{title:'⚠️ Match Disputed',body:'Away team disputed. Your review needed.',type:'dispute',icon:'alert'});
      renderRefPanel();
      renderMatchRooms();
    }).catch(function(){ err.textContent='Failed.'; btn.textContent='❌ Submit Dispute'; btn.disabled=false; });
  },function(){ err.textContent='Upload failed.'; btn.textContent='❌ Submit Dispute'; btn.disabled=false; });
}

// ── REFEREE PANEL ────────────────────────────────────────────
// Shows results to review for: referee + away player + admin
function renderRefPanel() {
  var pg=$('page-referee'); if(!pg) return;
  if (!myProfile) { pg.innerHTML='<div style="text-align:center;padding:2.5rem;color:var(--dim)">Login to view.</div>'; return; }
  var uid=myProfile.uid;
  var isAdmin=me&&me.email===ADMIN_EMAIL;

  // Away matches needing verification by this user
  var awayVerify = Object.values(allMatches).filter(function(m){
    return m.awayId===uid && m.awayVerifying && !m.awayDispute && !m.played;
  });

  // Matches where I'm referee with pending/disputed results
  var refDuties = Object.values(allMatches).filter(function(m){
    return m.refereeUID===uid && (m.pendingResult||m.awayDispute) && !m.played;
  });

  // Admin: ALL disputed + pending across all leagues
  var adminQueue = isAdmin ? Object.values(allMatches).filter(function(m){
    return !m.played && (m.awayDispute || m.pendingResult || m.awayVerifying);
  }).filter(function(m){ return m.refereeUID!==uid && m.awayId!==uid; }) : [];

  var html = '<div class="section-header"><div class="section-title c-cyan">🟢 Referee Panel</div><div class="section-line"></div></div>';

  // ── AWAY VERIFICATION ──
  if (awayVerify.length) {
    html += _refSectionLabel('⚠️ VERIFY RESULTS', 'var(--gold)');
    awayVerify.forEach(function(m){
      html += buildResultCard(m, uid, false, true, false, isAdmin);
    });
  }

  // ── REFEREE DUTIES ──
  if (refDuties.length) {
    html += _refSectionLabel('YOUR REF DUTIES', 'var(--cyan)');
    refDuties.forEach(function(m){
      html += buildResultCard(m, uid, false, false, true, isAdmin);
    });
  }

  // ── ADMIN QUEUE ──
  if (isAdmin && adminQueue.length) {
    html += _refSectionLabel('ADMIN QUEUE — ALL LEAGUES', 'var(--pink)');
    adminQueue.forEach(function(m){
      html += buildResultCard(m, uid, false, false, false, true);
    });
  }

  if (!awayVerify.length && !refDuties.length && (!isAdmin||!adminQueue.length)) {
    html += '<div class="card empty">No pending duties. You\'re all caught up! 🎉</div>';
  }

  pg.innerHTML=html;
  setBadge('ref-badge', awayVerify.length+refDuties.length+(isAdmin?adminQueue.length:0));
}

function _refSectionLabel(text, color) {
  return '<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:'+color+';letter-spacing:1.5px;margin:.8rem 0 .45rem">'+text+'</div>';
}

// ── SHARED RESULT CARD (used in ref panel & match rooms) ──────
function buildResultCard(m, uid, isHome, isAway, isRef, isAdmin) {
  var hp=allPlayers[m.homeId], ap=allPlayers[m.awayId]; if(!hp||!ap) return '';
  var lg=LGS[m.league]||{};
  var hasDispute = !!m.awayDispute;
  var hg = m.hg||m.pendingHg||0;
  var ag = m.ag||m.pendingAg||0;

  var html = '<div class="fx-card" style="margin-bottom:.6rem;border-color:'+(hasDispute?'rgba(255,40,130,0.35)':'rgba(0,212,255,0.2)')+'">'
    // Header
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.4rem;flex-wrap:wrap;gap:.3rem">'
    +'<div style="font-weight:700;font-size:.82rem">'+esc(hp.username)+' vs '+esc(ap.username)+'</div>'
    +'<div style="display:flex;gap:.35rem;align-items:center">'
    +'<span class="lg-badge" style="background:'+lg.bg+';color:'+lg.c+';border:1px solid '+lg.c+'44">'+esc(lg.short||'')+'</span>'
    +(hasDispute?'<span class="fx-badge danger">DISPUTED</span>':'<span class="fx-badge info">REVIEW</span>')
    +'</div></div>'
    // Score
    +'<div style="font-family:Orbitron,sans-serif;font-size:1.25rem;font-weight:900;color:var(--green);text-align:center;margin:.4rem 0">'+hg+' – '+ag+'</div>'
    // Submitted by
    +(m.submittedAt?'<div style="font-size:.6rem;color:var(--dim);text-align:center;margin-bottom:.4rem">Submitted '+fmtAgo(m.submittedAt)+'</div>':'')
    // Screenshots — everyone can see
    +'<div style="display:flex;gap:.4rem;justify-content:center;flex-wrap:wrap;margin-bottom:.5rem">'
    +(m.screenshot||m.pendingSS?'<a href="'+(m.screenshot||m.pendingSS)+'" target="_blank" style="display:inline-flex;align-items:center;gap:.3rem;font-size:.68rem;color:var(--cyan);background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:7px;padding:4px 10px;text-decoration:none">📸 Home Screenshot</a>':'')
    +(m.disputeSS?'<a href="'+m.disputeSS+'" target="_blank" style="display:inline-flex;align-items:center;gap:.3rem;font-size:.68rem;color:var(--pink);background:rgba(255,40,130,0.08);border:1px solid rgba(255,40,130,0.2);border-radius:7px;padding:4px 10px;text-decoration:none">📸 Away Screenshot</a>':'')
    +'</div>';

  // Auto-approve timer
  if (m.submittedAt && !m.awayDispute) {
    var dl=m.submittedAt+48*60*60*1000, rem=dl-Date.now();
    if(rem>0){ var h=Math.floor(rem/3600000),mn=Math.floor((rem%3600000)/60000);
      html+='<div style="font-size:.6rem;color:var(--dim);text-align:center;margin-bottom:.4rem">⏱ Auto-approves in '+h+'h '+mn+'m</div>';
    }
  }

  // Dispute note
  if (hasDispute) {
    html+='<div style="font-size:.7rem;color:var(--pink);background:rgba(255,40,130,0.06);border-radius:8px;padding:.4rem .6rem;margin-bottom:.4rem">Away team disputes this score. Review both screenshots to decide.</div>';
  }

  // Action buttons
  html+='<div style="display:flex;gap:.4rem;flex-wrap:wrap">';
  if (isAway && m.awayVerifying && !m.awayDispute) {
    html+='<button class="btn-primary" style="font-size:.72rem;padding:.5rem;flex:1" onclick="awayConfirm(\''+m.id+'\')">✓ Confirm</button>';
    html+='<button class="btn-danger" style="font-size:.72rem;padding:.5rem;flex:1" onclick="openDisputeModal(\''+m.id+'\')">✗ Dispute</button>';
  }
  if (isRef || isAdmin) {
    html+='<button class="btn-primary" style="font-size:.72rem;padding:.5rem;flex:1" onclick="refereeConfirm(\''+m.id+'\')">✓ Approve</button>';
    html+='<button class="btn-danger" style="font-size:.72rem;padding:.5rem;flex:1" onclick="refereeReverse(\''+m.id+'\')">✗ Reject</button>';
  }
  if (isAdmin) {
    html+='<button class="btn-xs" style="color:#ff6b00;border-color:rgba(255,107,0,0.3);width:100%;margin-top:.3rem" onclick="adminForceResult(\''+m.id+'\')">⚡ Force Result</button>';
  }
  html+='</div></div>';
  return html;
}

// ── AWAY CONFIRM ─────────────────────────────────────────────
function awayConfirm(mid) {
  if (!myProfile||!db) return;
  db.ref(DB.matches+'/'+mid).update({ awayVerifying:false, refStatus:'away_confirmed' })
    .then(function(){ toast('Result confirmed!'); renderRefPanel(); renderMatchRooms();
      var m=allMatches[mid]; if(m&&m.refereeUID) sendNotif(m.refereeUID,{title:'Result confirmed',body:'Away team confirmed the result.',type:'referee'});
    });
}

// ── REFEREE CONFIRM ──────────────────────────────────────────
function refereeConfirm(mid) {
  if (!myProfile||!db) return;
  var m=allMatches[mid]; if(!m) return;
  var hg=m.pendingHg||m.hg||0, ag=m.pendingAg||m.ag||0;
  db.ref(DB.matches+'/'+mid).update({
    played:true, hg:hg, ag:ag, playedAt:Date.now(),
    pendingResult:false, awayVerifying:false, awayDispute:false,
    refStatus:'approved', approvedBy:myProfile.uid
  }).then(function(){
    toast('Result approved!');
    renderRefPanel(); renderMatchRooms();
    notifyBothPlayers(mid,'Result approved: '+hg+'-'+ag);
    showResultCelebration(mid,hg,ag,m);
    db.ref(DB.matchRooms+'/match_'+mid).remove();
    if(typeof checkSeasonEnd==='function') checkSeasonEnd();
  });
}

// ── REFEREE REJECT ───────────────────────────────────────────
function refereeReverse(mid) {
  if (!myProfile||!db) return;
  if (!confirm('Reject result? Both teams must resubmit.')) return;
  db.ref(DB.matches+'/'+mid).update({
    pendingResult:false, pendingHg:null, pendingAg:null, pendingSS:null,
    awayVerifying:false, awayDispute:false,
    refStatus:'rejected', rejectedBy:myProfile.uid, rejectedAt:Date.now()
  }).then(function(){
    toast('Result rejected. Teams notified.');
    renderRefPanel(); renderMatchRooms();
    notifyBothPlayers(mid,'Result rejected by referee. Please replay and resubmit.');
  });
}

function notifyBothPlayers(mid, msg) {
  var m=allMatches[mid]; if(!m||!db) return;
  sendNotif(m.homeId,{title:'Match Update',body:msg,icon:'result',type:'result'});
  sendNotif(m.awayId,{title:'Match Update',body:msg,icon:'result',type:'result'});
}

// ── AUTO-APPROVE CHECKER — called on matches load ────────────
// checkPendingAutoApprovals is defined in matchroom.js — single source of truth

// ── LISTEN REF DUTIES — keeps badge updated live ─────────────
function listenRefDuties() {
  if (!myProfile || !db) return;
  db.ref(DB.matches).orderByChild('refereeUID').equalTo(myProfile.uid).on('value', function() {
    if (activePage() === 'referee') renderRefPanel();
    var uid = myProfile.uid;
    var count = Object.values(allMatches).filter(function(m) {
      return (m.refereeUID===uid || m.homeId===uid || m.awayId===uid)
        && (m.awayVerifying || m.awayDispute || m.pendingResult)
        && !_isSettled(m);
    }).length;
    setBadge('ref-badge', count);
  });
}

function _isSettled(m) {
  return m.played && !m.pendingResult && !m.awayVerifying && !m.awayDispute;
}

// ── ADMIN FORCE RESULT ───────────────────────────────────────
function adminForceResult(mid) {
  if (!me || me.email !== ADMIN_EMAIL) return;
  var m = allMatches[mid]; if (!m) return;
  var hgStr = prompt('Home goals:', m.hg || m.pendingHg || 0);
  if (hgStr === null) return;
  var agStr = prompt('Away goals:', m.ag || m.pendingAg || 0);
  if (agStr === null) return;
  var hg = parseInt(hgStr), ag = parseInt(agStr);
  if (isNaN(hg) || isNaN(ag)) { toast('Invalid scores.', 'error'); return; }
  db.ref(DB.matches + '/' + mid).update({
    played:        true,
    hg:            hg,
    ag:            ag,
    playedAt:      Date.now(),
    pendingResult: false,
    awayVerifying: false,
    awayDispute:   false,
    refStatus:     'admin_forced',
    forcedBy:      me.uid,
    forcedAt:      Date.now()
  }).then(function() {
    toast('Result forced: ' + hg + '-' + ag);
    renderRefPanel();
    renderMatchRooms();
    notifyBothPlayers(mid, 'Admin set result: ' + hg + '-' + ag + '.');
    if (typeof checkSeasonEnd === 'function') checkSeasonEnd();
  }).catch(function() { toast('Failed. Try again.', 'error'); });
}


if (typeof scheduleAutoClose === 'undefined') {
  function scheduleAutoClose(mid,deadline){ var d=deadline-Date.now(); if(d<0){runAutoClose(mid);return;} setTimeout(function(){runAutoClose(mid);},Math.min(d,2147483647)); }
  function runAutoClose(mid){ if(!db)return; db.ref(DB.matches+'/'+mid).once('value',function(s){ var m=s.val();if(!m||m.awayDispute)return; if(m.played&&!m.pendingResult)return; db.ref(DB.matches+'/'+mid).update({played:true,hg:m.hg||m.pendingHg||0,ag:m.ag||m.pendingAg||0,playedAt:Date.now(),pendingResult:false,awayVerifying:false,refStatus:'auto_approved'}).then(function(){ notifyBothPlayers(mid,'Result auto-approved after 48h.'); if(typeof checkSeasonEnd==='function')checkSeasonEnd(); }); }); }
}

// ── RESTRICTIONS ─────────────────────────────────────────────
function isRestricted(uid, type) {
  var r=allPlayers[uid]&&allPlayers[uid].restrictions&&allPlayers[uid].restrictions[type];
  if(!r) return false;
  if(r.until&&Date.now()>r.until){ db.ref(DB.players+'/'+uid+'/restrictions/'+type).remove(); return false; }
  return true;
}
function applyRestriction(uid,type,days){ if(!db)return; db.ref(DB.players+'/'+uid+'/restrictions/'+type).set({since:Date.now(),until:Date.now()+days*86400000}); }
function removeRestriction(uid,type){ if(!db)return; db.ref(DB.players+'/'+uid+'/restrictions/'+type).remove(); }

// ── CLOUDINARY ───────────────────────────────────────────────
function compressImage(file,maxW,quality,cb){
  var reader=new FileReader(); reader.onload=function(e){ var img=new Image(); img.onload=function(){ var canvas=document.createElement('canvas'); var ratio=Math.min(maxW/img.width,1); canvas.width=img.width*ratio; canvas.height=img.height*ratio; canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height); canvas.toBlob(function(blob){cb(blob||file);},'image/jpeg',quality); }; img.src=e.target.result; }; reader.readAsDataURL(file);
}
function uploadToCloudinary(file,folder,publicId,onSuccess,onFail){
  compressImage(file,1280,0.82,function(blob){ var fd=new FormData(); fd.append('file',blob); fd.append('upload_preset',CLOUDINARY_PRESET); fd.append('folder',folder||'general'); if(publicId)fd.append('public_id',publicId); fetch('https://api.cloudinary.com/v1_1/'+CLOUDINARY_CLOUD+'/image/upload',{method:'POST',body:fd}).then(function(r){return r.json();}).then(function(d){if(d.secure_url)onSuccess(d.secure_url);else onFail(d);}).catch(onFail); });
}

// ── RESULT CELEBRATION ───────────────────────────────────────
function showResultCelebration(mid,hg,ag,m){
  var el=$('result-celebration'); if(!el) return;
  var hp=allPlayers[m.homeId],ap=allPlayers[m.awayId]; if(!hp||!ap) return;
  var winner=hg>ag?hp.username:ag>hg?ap.username:null;
  el.innerHTML='<div class="celeb-inner"><div class="celeb-score">'+hg+' – '+ag+'</div><div class="celeb-teams">'+esc(hp.username)+' vs '+esc(ap.username)+'</div>'+(winner?'<div class="celeb-winner">🏆 '+esc(winner)+' wins!</div>':'<div class="celeb-winner">Draw!</div>')+'<button onclick="this.parentNode.parentNode.classList.add(\'hidden\')" style="margin-top:1rem;padding:.5rem 1.5rem;border-radius:8px;border:none;background:var(--cyan);color:#000;font-weight:700;cursor:pointer">Close</button></div>';
  el.classList.remove('hidden');
  setTimeout(function(){el.classList.add('hidden');},8000);
}
