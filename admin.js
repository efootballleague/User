// ============================================================
// ADMIN PANEL
// ============================================================
function loadAdmin(){
  if(!me||me.email!==ADMIN_EMAIL){$('page-admin').innerHTML='<div style="text-align:center;padding:2.5rem;color:var(--dim)">Admin access only.</div>';return;}
  loadAdminReports();loadAdminUsers();loadAdminMatches();renderPenaltyLog();renderAdminSeason();
}
function aTab(name,btn){
  document.querySelectorAll('.atab').forEach(function(b){b.classList.remove('on');});
  document.querySelectorAll('.apanel').forEach(function(p){p.classList.remove('on');});
  if(btn)btn.classList.add('on');
  var panel=$('ap-'+name);if(panel)panel.classList.add('on');
  if(name==='season')renderAdminSeason();
}
function renderAdminSeason(){
  var el=$('ap-season');if(!el)return;
  el.innerHTML=adminSeasonControls()
    +'<div style="margin-top:1rem;padding:1rem;background:rgba(255,40,130,0.05);border:1px solid rgba(255,40,130,0.15);border-radius:12px">'
    +'<div style="font-family:Orbitron,sans-serif;font-size:.65rem;color:#FF2882;letter-spacing:1.5px;margin-bottom:.7rem">DANGER ZONE</div>'
    +'<button class="bd" style="font-size:.74rem;padding:7px 14px;background:rgba(139,0,0,0.25)" onclick="seasonReset()">&#9888; Reset All Match Data</button>'
    +'<div style="font-size:.63rem;color:var(--dim);margin-top:.4rem">Clears all results. Player accounts stay.</div>'
    +'</div>';
}
function loadAdminReports(){
  if(!db)return;
  db.ref('ef_reports').orderByChild('ts').limitToLast(50).on('value',function(s){
    var reps=Object.entries(s.val()||{}).sort(function(a,b){return(b[1].ts||0)-(a[1].ts||0);});
    var rc=$('rep-count');if(rc)rc.textContent=reps.length+' reports';
    var rl=$('rep-list');if(!rl)return;
    if(!reps.length){rl.innerHTML='<div style="color:var(--dim);padding:.9rem;text-align:center">No reports yet.</div>';return;}
    rl.innerHTML=reps.map(function(kv){
      var key=kv[0],r=kv[1];
      var done=r.status==='resolved';
      var isFraud=r.reason==='Match result fraud';
      return'<div class="rep-card'+(done?' done':'')+'" style="'+(isFraud&&!done?'border-left-color:#ff6600;':'')+'">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.45rem;margin-bottom:.45rem">'
        +(isFraud?'<span style="background:rgba(255,102,0,0.14);color:#ff6600;font-size:.58rem;font-weight:700;padding:2px 6px;border-radius:9px;border:1px solid rgba(255,102,0,0.28);margin-right:5px">FRAUD</span>':'')
        +'<span style="font-weight:700;color:#00D4FF">'+esc(r.reportedName)+'</span> reported by <span style="font-weight:700">'+esc(r.reporterName)+'</span>'
        +'<span style="font-size:.6rem;color:var(--dim)">'+fmtFull(r.ts)+'</span></div>'
        +'<div style="font-size:.78rem;margin-bottom:.38rem"><strong>Reason:</strong> '+esc(r.reason)+'</div>'
        +(r.details?'<div style="font-size:.73rem;color:var(--dim);margin-bottom:.45rem">'+esc(r.details)+'</div>':'')
        +(done?'<span style="font-size:.63rem;color:#00ff88">Resolved</span>'
          +(r.type==='result_review'||r.type==='result_rejected'?'<div style="margin-top:.45rem"><div style="font-size:.68rem;color:#ffe600;margin-bottom:.35rem">Score: '+esc(r.hg||'?')+' – '+esc(r.ag||'?')+'</div>'+(r.screenshot?'<div class="ss-reveal-btn" data-src="'+esc(r.screenshot)+'" onclick="revealScreenshot(this)" style="display:flex;align-items:center;gap:.5rem;background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.2);border-radius:8px;padding:.55rem .8rem;cursor:pointer;margin-top:.35rem;transition:all .2s"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00D4FF" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg><span style="font-size:.7rem;color:#00D4FF;font-weight:700">Tap to view screenshot</span></div>':'')+'</div>':'')
          :'<div style="display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.45rem">'
          +'<button class="bg" style="font-size:.65rem;padding:4px 9px" onclick="resolveReport(\''+key+'\')">Resolve</button>'
          +(isFraud?'<button class="bp" style="font-size:.65rem;padding:4px 9px;background:linear-gradient(135deg,#FF2882,#cc0044)" onclick="openDeductModal(\''+key+'\',\''+esc(r.reportedUID)+'\',\''+esc(r.reportedName)+'\')">Deduct Points</button>':'')
          +'<button class="bd" style="font-size:.65rem;padding:4px 9px" onclick="banUser(\''+esc(r.reportedUID)+'\',\''+esc(r.reportedName)+'\')">Ban</button>'
          +'<button class="bs" style="font-size:.65rem;padding:4px 9px" onclick="deleteReport(\''+key+'\')">Delete</button></div>')
        +'</div>';
    }).join('');
  });
}
function loadAdminUsers(){
  var list=$('admin-users-list');if(!list)return;
  var ps=Object.values(allPlayers);
  if(!ps.length){list.innerHTML='<div style="color:var(--dim);padding:.9rem;text-align:center">No users.</div>';return;}
  list.innerHTML=ps.sort(function(a,b){return(b.joinedAt||0)-(a.joinedAt||0);}).map(function(p){
    var lg=LGS[p.league]||{};
    return'<div class="urow">'
      +clubBadge(p.club,28)
      +'<div style="flex:1"><div style="font-weight:700;font-size:.82rem">'+esc(p.username)+(p.banned?'<span style="color:#FF2882;font-size:.58rem;margin-left:4px">BANNED</span>':'')+'</div>'
      +'<div style="font-size:.63rem;color:var(--dim)">'+esc(p.club)+' - '+esc(lg.n||'')+' - <span style="color:'+lsColor(p.lastSeen||0)+'">'+fmtAgo(p.lastSeen||0)+'</span></div></div>'
      +'<div style="display:flex;gap:.35rem">'
      +'<button class="bs" style="font-size:.63rem;padding:3px 8px" onclick="openDMWith(\''+p.uid+'\',\''+esc(p.username)+'\')">DM</button>'
      +(p.banned?'<button class="bg" style="font-size:.63rem;padding:3px 8px" onclick="unbanUser(\''+p.uid+'\',\''+esc(p.username)+'\')">Unban</button>':'<button class="bd" style="font-size:.63rem;padding:3px 8px" onclick="banUser(\''+p.uid+'\',\''+esc(p.username)+'\')">Ban</button>')
      +'<button class="bd" style="font-size:.63rem;padding:3px 8px;background:rgba(139,0,0,0.2);color:#ff4444" onclick="removeUser(\''+p.uid+'\',\''+esc(p.username)+'\')">Remove</button>'
      +'</div></div>';
  }).join('');
}
function loadAdminMatches(){
  var list=$('admin-matches-list');if(!list)return;
  var ms=Object.values(allMatches).sort(function(a,b){return(b.createdAt||0)-(a.createdAt||0);}).slice(0,30);
  if(!ms.length){list.innerHTML='<div style="color:var(--dim);padding:.9rem;text-align:center">No matches.</div>';return;}
  list.innerHTML=ms.map(function(m){
    var hp=allPlayers[m.homeId],ap=allPlayers[m.awayId];if(!hp||!ap)return'';
    var lg=LGS[m.league]||{};
    return'<div class="urow" style="flex-wrap:wrap;gap:.45rem">'
      +'<span style="font-size:.58rem;font-weight:700;padding:2px 6px;border-radius:4px;background:'+(lg.bg||'')+';color:'+(lg.c||'#aaa')+'">'+esc(lg.n||'')+'</span>'
      +'<div style="flex:1;min-width:160px"><strong>'+esc(hp.username)+'</strong> vs <strong>'+esc(ap.username)+'</strong></div>'
      +'<div>'+(m.played?'<span style="color:#00ff88;font-weight:700;font-family:Orbitron,sans-serif">'+m.hg+' - '+m.ag+'</span>':'<span style="color:var(--dim)">Pending</span>')+'</div>'
      +'<button class="bd" style="font-size:.63rem;padding:3px 8px" onclick="if(confirm(\'Delete this match?\'))db.ref(\'ef_matches/'+m.id+'\').remove()">Delete</button>'
      +'</div>';
  }).join('');
}
function resolveReport(key){db.ref('ef_reports/'+key).update({status:'resolved',resolvedAt:Date.now()}).then(function(){toast('Report resolved.');}).catch(function(){toast('Failed','error');});}
function deleteReport(key){if(!confirm('Delete this report?'))return;db.ref('ef_reports/'+key).remove().then(function(){toast('Report deleted.');}).catch(function(){toast('Failed','error');});}
function banUser(uid,name){if(!confirm('Ban '+name+'?'))return;db.ref('ef_players/'+uid).update({banned:true}).then(function(){toast(name+' banned.');}).catch(function(){toast('Failed','error');});}
function unbanUser(uid,name){db.ref('ef_players/'+uid).update({banned:false}).then(function(){toast(name+' unbanned.');}).catch(function(){toast('Failed','error');});}
function removeUser(uid,name){
  if(!me||me.email!==ADMIN_EMAIL){toast('Admin only','error');return;}
  if(!confirm('PERMANENTLY remove '+name+'? Cannot be undone!'))return;
  var updates={};
  updates['ef_players/'+uid]=null;updates['ef_penalties/'+uid]=null;updates['ef_ucl_payments/'+uid]=null;
  Object.keys(allMatches).forEach(function(mid){var m=allMatches[mid];if(m.homeId===uid||m.awayId===uid)updates['ef_matches/'+mid]=null;});
  db.ref().update(updates).then(function(){toast('User removed.');}).catch(function(){toast('Failed','error');});
}

// ============================================================
// POINT DEDUCTIONS
// ============================================================
function openDeductModal(repKey,uid,name){
  $('ded-rep-key').value=repKey;$('ded-uid').value=uid;$('ded-name').value=name;
  $('ded-player').textContent=name;$('ded-pts').value='3';$('ded-note').value='';$('ded-err').textContent='';
  openMo('deduct-mo');
}
function applyDeduction(){
  var repKey=$('ded-rep-key').value,uid=$('ded-uid').value,name=$('ded-name').value;
  var pts=parseInt($('ded-pts').value),note=$('ded-note').value.trim();
  var err=$('ded-err');err.textContent='';
  if(!uid){err.textContent='No player.';return;}
  if(isNaN(pts)||pts<1){err.textContent='Enter valid points.';return;}
  if(!note){err.textContent='Add a reason.';return;}
  var btn=$('ded-btn');btn.textContent='Applying...';btn.disabled=true;
  var penKey=db.ref('ef_penalties/'+uid).push().key;
  var updates={};
  updates['ef_penalties/'+uid+'/'+penKey]={pts:pts,reason:'Match result fraud',note:note,reportKey:repKey,appliedAt:Date.now(),playerName:name};
  updates['ef_reports/'+repKey+'/status']='resolved';
  updates['ef_reports/'+repKey+'/resolvedBy']='deduction';
  updates['ef_reports/'+repKey+'/deductedPts']=pts;
  db.ref().update(updates)
    .then(function(){
      if(allPlayers[uid]&&myProfile){
        var dk=dmKey(myProfile.uid,uid);
        db.ref('ef_dm/'+dk).push({from:myProfile.uid,fromName:'Admin',text:'PENALTY: '+pts+' point(s) deducted. Reason: '+note+'. Reply to appeal.',ts:Date.now(),system:true});
        db.ref('ef_dm_meta/'+dk).update({lastMsg:'Penalty: -'+pts+' pts',lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+uid]:true});
        db.ref('ef_dm_unread/'+uid+'/'+dk).transaction(function(v){return(v||0)+1;});
      }
      btn.textContent='Apply Deduction';btn.disabled=false;
      closeMo('deduct-mo');toast('-'+pts+' pts deducted from '+name);
    })
    .catch(function(e){err.textContent='Failed: '+e.message;btn.textContent='Apply Deduction';btn.disabled=false;});
}
function renderPenaltyLog(){
  var el=$('pen-list');if(!el)return;
  var all=[];
  Object.entries(allPenalties).forEach(function(kv){
    var uid=kv[0];
    Object.entries(kv[1]||{}).forEach(function(pk){all.push(Object.assign({},pk[1],{uid:uid,penKey:pk[0]}));});
  });
  all.sort(function(a,b){return(b.appliedAt||0)-(a.appliedAt||0);});
  var pc=$('pen-count');if(pc)pc.textContent=all.length+' record(s)';
  if(!all.length){el.innerHTML='<div style="color:var(--dim);padding:.9rem;text-align:center">No penalties yet.</div>';return;}
  el.innerHTML=all.map(function(p){
    return'<div class="pen-row">'
      +'<div style="flex:1"><div style="font-weight:700;font-size:.82rem">'+esc(p.playerName||'Unknown')+'</div>'
      +'<div style="font-size:.68rem;color:var(--dim)">'+esc(p.reason)+' - '+fmtFull(p.appliedAt)+'</div>'
      +'<div style="font-size:.65rem;color:#aaa;margin-top:1px">'+esc(p.note||'')+'</div></div>'
      +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.95rem;color:#FF2882">-'+p.pts+'pts</div>'
      +'<button class="bs" style="font-size:.63rem;padding:3px 8px" onclick="revokePenalty(\''+p.uid+'\',\''+p.penKey+'\')">Revoke</button>'
      +'</div>';
  }).join('');
}
function revokePenalty(uid,penKey){
  if(!confirm('Revoke this penalty?'))return;
  db.ref('ef_penalties/'+uid+'/'+penKey).remove().then(function(){toast('Penalty revoked.');}).catch(function(){toast('Failed','error');});
}
function revealScreenshot(el){
  var src=el.getAttribute('data-src');if(!src)return;
  var wrap=document.createElement('div');
  wrap.style.cssText='margin-top:.35rem;animation:fadein .3s ease';
  wrap.innerHTML='<a href="'+src+'" target="_blank" style="display:block"><img src="'+src+'" loading="lazy" style="width:100%;max-height:200px;object-fit:contain;border-radius:9px;border:1px solid rgba(0,212,255,0.2);cursor:zoom-in"></a><div style="font-size:.58rem;color:var(--dim);text-align:center;margin-top:3px">Tap to open full size</div>';
  el.parentNode.replaceChild(wrap,el);
}
