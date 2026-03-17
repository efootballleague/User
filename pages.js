// ============================================================
// STANDINGS & HOME
// ============================================================
function computeStd(lid){
  var t={};
  Object.values(allPlayers).filter(function(p){return p.league===lid;}).forEach(function(p){
    t[p.uid]={uid:p.uid,name:p.username,club:p.club,country:p.country||'',lastSeen:p.lastSeen||0,p:0,w:0,d:0,l:0,gf:0,ga:0,form:[]};
  });
  Object.values(allMatches).filter(function(m){return m.league===lid&&m.played&&!m.pendingResult;}).forEach(function(m){
    var h=t[m.homeId],a=t[m.awayId];if(!h||!a)return;
    h.p++;a.p++;h.gf+=m.hg;h.ga+=m.ag;a.gf+=m.ag;a.ga+=m.hg;
    if(m.hg>m.ag){h.w++;h.form.push('w');a.l++;a.form.push('l');}
    else if(m.hg<m.ag){a.w++;a.form.push('w');h.l++;h.form.push('l');}
    else{h.d++;h.form.push('d');a.d++;a.form.push('d');}
  });
  return Object.values(t).map(function(r){
    var pen=allPenalties[r.uid]?Object.values(allPenalties[r.uid]).reduce(function(s,x){return s+(x.pts||0);},0):0;
    r.rawPts=r.w*3+r.d;r.penPts=pen;r.pts=Math.max(0,r.rawPts-pen);return r;
  }).sort(function(a,b){return b.pts!==a.pts?b.pts-a.pts:(b.gf-b.ga)-(a.gf-a.ga);});
}
function renderStd(lid){
  curLg=lid;
  var rows=computeStd(lid),total=rows.length,html='';
  if(!rows.length){html='<tr><td colspan="12" style="padding:1.6rem;color:var(--dim);text-align:center">No players in this league.</td></tr>';}
  else rows.forEach(function(r,i){
    var pos=i+1,pc=pos===1?'#FFE600':pos<=4?'#00D4FF':pos>total-3?'#FF2882':'var(--dim)';
    var gd=r.gf-r.ga,gdc=gd>0?'#00FF85':gd<0?'#FF2882':'var(--dim)';
    var form=r.form.slice(-5).map(function(f){return'<span class="fd '+f+'"></span>';}).join('');
    var penBadge=r.penPts>0?'<span class="deduct-badge">-'+r.penPts+'</span>':'';
    var dot='<span data-lastseen="'+r.lastSeen+'" style="width:7px;height:7px;border-radius:50%;background:'+lsColor(r.lastSeen)+';display:inline-block;margin-right:3px" title="'+fmtAgo(r.lastSeen)+'"></span>';
    html+='<tr onclick="openUserModal(\''+r.uid+'\')">'
      +'<td><span style="font-family:Orbitron,sans-serif;font-weight:700;font-size:.72rem;color:'+pc+'">'+pos+'</span></td>'
      +'<td>'+dot+'<strong>'+esc(r.name)+'</strong> <span style="font-size:.58rem;color:var(--dim)">'+esc(r.country)+'</span></td>'
      +'<td><div style="display:flex;align-items:center;gap:5px">'+clubBadge(r.club,r.league||curLg,20)+'<span style="font-size:.73rem;color:#aaa">'+esc(r.club)+'</span></div></td>'
      +'<td>'+r.p+'</td><td>'+r.w+'</td><td>'+r.d+'</td><td>'+r.l+'</td>'
      +'<td>'+r.gf+'</td><td>'+r.ga+'</td>'
      +'<td style="color:'+gdc+'">'+(gd>0?'+':'')+gd+'</td>'
      +'<td>'+form+'</td>'
      +'<td><span style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.82rem;color:'+(r.penPts>0?'#FF2882':'#fff')+'">'+r.pts+'</span>'+penBadge+'</td>'
      +'</tr>';
  });
  var body=$('std-body');if(body)body.innerHTML=html;
}
function switchLg(lid,btn){
  document.querySelectorAll('#lg-tabs .tab').forEach(function(b){b.classList.remove('on');});
  var lg=LGS[lid];if(btn){btn.classList.add('on');btn.style.borderColor=lg.c;btn.style.color=lg.c;btn.style.background=lg.bg;}
  renderStd(lid);
}
function renderHomeStats(){
  var ps=Object.keys(allPlayers).length,ms=Object.values(allMatches);
  var played=ms.filter(function(m){return m.played;}).length;
  var sp=$('st-p'),sm=$('st-m'),sf=$('st-f');
  if(sp)sp.textContent=ps;if(sm)sm.textContent=played;if(sf)sf.textContent=ms.length;
}
function renderRecentRes(){
  var el=$('recent-res');if(!el)return;
  var played=Object.values(allMatches).filter(function(m){return m.played;})
    .sort(function(a,b){return(b.playedAt||0)-(a.playedAt||0);}).slice(0,4);
  if(!played.length){el.innerHTML='<div class="card" style="padding:1.2rem;text-align:center;color:var(--dim)">No results yet!</div>';return;}
  el.innerHTML=played.map(function(m){
    var hp=allPlayers[m.homeId],ap=allPlayers[m.awayId];if(!hp||!ap)return'';
    var lg=LGS[m.league]||{};
    return'<div class="card" style="padding:.85rem;cursor:pointer" onclick="openUserModal(\''+hp.uid+'\')">'
      +'<div style="display:flex;justify-content:space-between;margin-bottom:.5rem">'
      +'<span style="font-size:.56rem;font-weight:700;padding:2px 6px;border-radius:4px;background:'+(lg.bg||'')+';color:'+(lg.c||'#aaa')+'">'+esc(lg.n||'')+'</span>'
      +'<span style="font-size:.6rem;color:var(--dim)">'+fmtDate(m.playedAt)+'</span></div>'
      +'<div style="display:flex;align-items:center;justify-content:space-between;gap:.38rem">'
      +'<div style="flex:1;text-align:center">'+clubBadge(hp.club,m.league,24)+'<div style="font-size:.73rem;font-weight:700;margin-top:2px">'+esc(hp.username)+'</div></div>'
      +'<div style="background:#0a0a0a;border-radius:7px;padding:5px 10px;text-align:center">'
      +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.92rem;color:#00FF85;letter-spacing:2px">'+m.hg+'-'+m.ag+'</div>'
      +'<div style="font-size:.52rem;color:var(--dim)">FT</div></div>'
      +'<div style="flex:1;text-align:center">'+clubBadge(ap.club,m.league,24)+'<div style="font-size:.73rem;font-weight:700;margin-top:2px">'+esc(ap.username)+'</div></div>'
      +'</div></div>';
  }).join('');
}
function renderTopPlayers(){
  var el=$('top-players');if(!el)return;
  var ps=Object.values(allPlayers);
  if(!ps.length){el.innerHTML='<div class="card" style="padding:1.2rem;text-align:center;color:var(--dim)">No players yet.</div>';return;}
  var scored=ps.map(function(p){
    var raw=Object.values(allMatches).filter(function(m){return m.played&&(m.homeId===p.uid||m.awayId===p.uid);})
      .reduce(function(acc,m){return acc+(m.homeId===p.uid?(m.hg>m.ag?3:m.hg===m.ag?1:0):(m.ag>m.hg?3:m.ag===m.hg?1:0));},0);
    var pen=allPenalties[p.uid]?Object.values(allPenalties[p.uid]).reduce(function(s,x){return s+(x.pts||0);},0):0;
    return{p:p,pts:Math.max(0,raw-pen)};
  }).sort(function(a,b){return b.pts-a.pts;}).slice(0,6);
  el.innerHTML=scored.map(function(x,i){
    var p=x.p,lg=LGS[p.league]||{};
    return'<div class="card" style="padding:.82rem;display:flex;align-items:center;gap:.65rem;cursor:pointer" onclick="openUserModal(\''+p.uid+'\')">'
      +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.85rem;color:#ffe600;min-width:18px">#'+(i+1)+'</div>'
      +clubBadge(p.club,p.league||curLg,32)
      +'<div style="flex:1"><div style="font-weight:700;font-size:.82rem">'+esc(p.username)+'</div>'
      +'<div style="font-size:.6rem;color:var(--dim)">'+esc(p.club)+'</div>'
      +'<div style="font-size:.6rem;color:'+lg.c+'">'+esc(lg.n||'')+'</div></div>'
      +'<div style="text-align:center"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.95rem;color:#ffe600">'+x.pts+'</div><div style="font-size:.55rem;color:var(--dim)">PTS</div></div>'
      +'</div>';
  }).join('');
}

// ============================================================
// FIXTURES
// ============================================================
function renderFx(){
  var el=$('fix-list');if(!el)return;
  var list=Object.values(allMatches);
  if(curFxFilter!=='all')list=list.filter(function(m){return m.league===curFxFilter;});
  list.sort(function(a,b){
    if(!a.played&&!b.played)return(a.matchTime||a.createdAt||0)-(b.matchTime||b.createdAt||0);
    if(!a.played)return-1;if(!b.played)return 1;
    return(b.playedAt||0)-(a.playedAt||0);
  });
  if(!list.length){el.innerHTML='<div class="card" style="padding:1.2rem;text-align:center;color:var(--dim)">No fixtures yet.</div>';return;}
  var groups={},order=[];
  list.forEach(function(m){
    var key=m.played?'Results':m.matchTime?new Date(m.matchTime).toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'short'}):'Unscheduled';
    if(!groups[key]){groups[key]=[];order.push(key);}
    groups[key].push(m);
  });
  var html='';
  order.forEach(function(dk,gi){
    html+='<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--dim);letter-spacing:2px;padding:.38rem 0;margin:'+(gi>0?'.85rem':'0')+' 0 .45rem">'+dk.toUpperCase()+'</div>';
    groups[dk].forEach(function(m){
      var hp=allPlayers[m.homeId],ap=allPlayers[m.awayId];if(!hp||!ap)return;
      var lg=LGS[m.league]||{};
      var isMine=myProfile&&(m.homeId===myProfile.uid||m.awayId===myProfile.uid);
      var isPost=!!m.postponed;
      var timeStr=m.matchTime?fmtTime(m.matchTime):'TBD';
      var statusC=m.played?'#00FF85':isPost?'#ff6b00':'var(--dim)';
      var isPending=m.pendingResult&&!m.played;
    var statusT=m.played?'FT':isPending?('⏳ Ref Review'):(isPost?'POSTPONED':''+timeStr);
    var statusC=m.played?'#00FF85':isPending?'#00D4FF':isPost?'#ff6b00':'var(--dim)';
      var score=m.played
        ?'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.92rem;color:#00FF85;letter-spacing:2px">'+m.hg+'-'+m.ag+'</div><div style="font-size:.52rem;color:var(--dim)">FT</div>'
        :'<div style="font-size:.62rem;color:'+(isPost?'#ff6b00':'var(--dim)')+';font-weight:700">'+(isPost?'PST':'vs')+'</div>';
      html+='<div class="card" style="padding:.85rem;margin-bottom:.45rem;'+(isMine?'border-color:rgba(255,230,0,0.28);':isPost?'border-color:rgba(255,107,0,0.28);opacity:.8;':'')+'">'
        +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;flex-wrap:wrap;gap:.28rem">'
        +'<div style="display:flex;align-items:center;gap:.35rem;flex-wrap:wrap">'
        +'<span style="font-size:.56rem;font-weight:700;padding:2px 6px;border-radius:4px;background:'+lg.bg+';color:'+lg.c+'">'+esc(lg.n||'')+'</span>'
        +(isMine?'<span style="font-size:.54rem;font-weight:700;color:#ffe600;background:rgba(255,230,0,0.08);border:1px solid rgba(255,230,0,0.2);border-radius:8px;padding:1px 5px">YOUR MATCH</span>':'')
        +(m.awayVerifying&&myProfile&&m.awayId===myProfile.uid&&!m.awayDispute?'<span style="font-size:.54rem;font-weight:700;color:#ff6b00;background:rgba(255,107,0,0.08);border:1px solid rgba(255,107,0,0.2);border-radius:8px;padding:1px 5px">&#9888; VERIFY</span>':'')
        +(m.pendingResult?'<span style="font-size:.54rem;font-weight:700;color:#00D4FF;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);border-radius:8px;padding:1px 5px">&#128994; REF REVIEW</span>':'')
        +(m.refStatus==='rejected'?'<span style="font-size:.54rem;font-weight:700;color:#ff006e;background:rgba(255,0,110,0.08);border:1px solid rgba(255,0,110,0.2);border-radius:8px;padding:1px 5px">&#10060; REJECTED</span>':'')
        +(m.refereeName?'<span style="font-size:.56rem;color:#00FF85;background:rgba(0,255,136,0.07);border:1px solid rgba(0,255,136,0.18);border-radius:8px;padding:1px 5px">Ref: '+esc(m.refereeName)+'</span>':'')
        +'</div><span style="font-size:.6rem;color:'+statusC+';font-weight:600">'+statusT+'</span></div>'
        +'<div style="display:flex;align-items:center;justify-content:space-between;gap:.38rem">'
        +'<div style="flex:1;text-align:center;cursor:pointer" onclick="openUserModal(\''+hp.uid+'\')">'+clubBadge(hp.club,m.league,24)+'<div style="font-size:.73rem;font-weight:700;margin-top:2px">'+esc(hp.username)+'</div></div>'
        +'<div style="background:#0a0a0a;border-radius:7px;padding:5px 9px;text-align:center;min-width:50px">'+score+'</div>'
        +'<div style="flex:1;text-align:center;cursor:pointer" onclick="openUserModal(\''+ap.uid+'\')">'+clubBadge(ap.club,m.league,24)+'<div style="font-size:.73rem;font-weight:700;margin-top:2px">'+esc(ap.username)+'</div></div>'
        +'</div>'
        +(isMine&&!m.played&&!isPost?'<div style="display:flex;gap:.35rem;margin-top:.5rem;padding-top:.5rem;border-top:1px solid rgba(255,255,255,0.04)"><button class="bs" style="font-size:.62rem;padding:4px 9px" onclick="requestPostpone(\''+m.id+'\')">Postpone</button></div>':'')
        +(m.postponed&&myProfile&&(m.homeId===myProfile.uid||m.awayId===myProfile.uid)?'<div style="display:flex;gap:.35rem;margin-top:.5rem;padding-top:.5rem;border-top:1px solid rgba(255,255,255,0.04)"><button class="bg" style="font-size:.62rem;padding:4px 9px" onclick="undoPostpone(\''+m.id+'\')">Unpostpone</button></div>':'')
        +'</div>';
    });
  });
  el.innerHTML=html;
}
function filterFx(f,btn){curFxFilter=f;document.querySelectorAll('#fix-filters .tab').forEach(function(b){b.classList.remove('on');});if(btn)btn.classList.add('on');renderFx();}
function loadFxPlayers(){
  var lg=$('fix-lg').value;$('fix-home').innerHTML='<option value="">-</option>';$('fix-away').innerHTML='<option value="">-</option>';
  if(!lg)return;
  Object.values(allPlayers).filter(function(p){return p.league===lg;}).forEach(function(p){
    var o='<option value="'+p.uid+'">'+esc(p.username)+' ('+esc(p.club)+')</option>';
    $('fix-home').innerHTML+=o;$('fix-away').innerHTML+=o;
  });
}
function addFixture(){
  if(!myProfile){toast('Login first','error');return;}
  var lg=$('fix-lg').value,hi=$('fix-home').value,ai=$('fix-away').value;
  if(!lg||!hi||!ai){toast('Fill all fields','error');return;}
  if(hi===ai){toast("Can't play yourself",'error');return;}
  var dup=Object.values(allMatches).find(function(m){return m.league===lg&&!m.played&&((m.homeId===hi&&m.awayId===ai)||(m.homeId===ai&&m.awayId===hi));});
  if(dup){toast('Fixture already exists','error');return;}
  var r2=pickRef(lg,[hi,ai]);
  var ref=db.ref('ef_matches').push();
  ref.set({id:ref.key,league:lg,homeId:hi,awayId:ai,hg:0,ag:0,played:false,createdAt:Date.now(),refereeUID:r2.uid,refereeName:r2.name})
    .then(function(){toast('Fixture added!');toggleEl('add-fix-panel');scheduleMatch(ref.key,lg,hi,ai);})
    .catch(function(){toast('Failed','error');});
}
function loadScoreSel(){
  var sel=$('score-sel');if(!sel||!myProfile)return;
  var uid=myProfile.uid;
  sel.innerHTML='<option value="">- Choose match -</option>';
  Object.values(allMatches).filter(function(m){return!m.played&&(m.homeId===uid||m.awayId===uid);}).forEach(function(m){
    var hp=allPlayers[m.homeId],ap=allPlayers[m.awayId];if(!hp||!ap)return;
    sel.innerHTML+='<option value="'+m.id+'">'+esc(hp.username)+' vs '+esc(ap.username)+'</option>';
  });
}
function submitScore(){
  if(!myProfile){toast('Login first','error');return;}
  var mid=$('score-sel').value,hg=parseInt($('score-hg').value),ag=parseInt($('score-ag').value);
  if(!mid){toast('Select a match','error');return;}
  if(isNaN(hg)||isNaN(ag)){toast('Enter both scores','error');return;}
  db.ref('ef_matches/'+mid).update({hg:hg,ag:ag,played:true,playedAt:Date.now(),submittedBy:myProfile.uid})
    .then(function(){toast('Result saved!');$('score-sel').value='';$('score-hg').value='';$('score-ag').value='';})
    .catch(function(){toast('Failed','error');});
}
// Postpone is now handled via match room system in matchroom.js
function requestPostpone(mid){
  if(typeof openPostponeRequest==='function')openPostponeRequest(mid);
}

// ============================================================
// SCHEDULING
// ============================================================
var SLOT_MS=15*60*1000;
function pickRef(lid,excl){
  var pool=Object.values(allPlayers).filter(function(p){return p.league===lid&&excl.indexOf(p.uid)===-1;});
  if(!pool.length)return{uid:'',name:'TBD'};
  var r=pool[Math.floor(Math.random()*pool.length)];return{uid:r.uid,name:r.username};
}
function hasOverlap(start,excl,hid,aid){
  var end=start+SLOT_MS;
  return Object.values(allMatches).filter(function(m){return!m.played&&m.matchTime&&(!excl||excl.indexOf(m.id)===-1);})
    .some(function(m){return start<m.matchTime+SLOT_MS&&end>m.matchTime&&(m.homeId===hid||m.awayId===hid||m.homeId===aid||m.awayId===aid);});
}
function findSlot(from,hid,aid,excl){var s=from,max=200;while(max-->0){if(!hasOverlap(s,excl,hid,aid))return s;s+=SLOT_MS;}return s;}
function scheduleMatch(mid,lid,hid,aid){
  if(!db)return;
  var base=Math.ceil((Date.now()+3600000)/SLOT_MS)*SLOT_MS+Math.floor(Math.random()*8)*SLOT_MS;
  var slot=findSlot(base,hid,aid,[mid]);
  var ref=pickRef(lid,[hid,aid]);
  db.ref('ef_matches/'+mid).update({matchTime:slot,scheduledAt:Date.now(),refereeUID:ref.uid,refereeName:ref.name});
}
function autoScheduleLeague(){
  if(!myProfile){toast('Login first','error');return;}
  var lid=myProfile.league;
  var pending=Object.values(allMatches).filter(function(m){return!m.played&&m.league===lid;});
  if(!pending.length){toast('No pending matches','error');return;}
  var base=Math.ceil((Date.now()+3600000)/SLOT_MS)*SLOT_MS;
  var updates={};
  pending.sort(function(){return Math.random()-.5;}).forEach(function(m){
    var slot=findSlot(base,m.homeId,m.awayId,[m.id]);
    var ref=pickRef(lid,[m.homeId,m.awayId]);
    updates['ef_matches/'+m.id+'/matchTime']=slot;
    updates['ef_matches/'+m.id+'/scheduledAt']=Date.now();
    updates['ef_matches/'+m.id+'/refereeUID']=ref.uid;
    updates['ef_matches/'+m.id+'/refereeName']=ref.name;
    allMatches[m.id]=Object.assign({},allMatches[m.id],{matchTime:slot,homeId:m.homeId,awayId:m.awayId});
  });
  db.ref().update(updates).then(function(){toast(pending.length+' matches scheduled!');renderMatchPrep();renderSchedTimeline();}).catch(function(){toast('Failed','error');});
}
function renderSchedTimeline(){
  var el=$('sched-timeline');if(!el)return;
  var all=Object.values(allMatches).filter(function(m){return!m.played&&m.matchTime;}).sort(function(a,b){return a.matchTime-b.matchTime;});
  if(!all.length){el.innerHTML='<div class="card" style="padding:1.1rem;text-align:center;color:var(--dim)">No scheduled matches yet.</div>';return;}
  var html='',lastD='';
  all.forEach(function(m,i){
    var hp=allPlayers[m.homeId],ap=allPlayers[m.awayId];if(!hp||!ap)return;
    var lg=LGS[m.league]||{};
    var d=new Date(m.matchTime).toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'});
    var t=fmtTime(m.matchTime);
    if(d!==lastD){lastD=d;html+='<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--dim);letter-spacing:2px;padding:.35rem 0;margin-top:'+(i>0?'.7rem':'0')+'">'+d.toUpperCase()+'</div>';}
    var isMine=myProfile&&(m.homeId===myProfile.uid||m.awayId===myProfile.uid);
    html+='<div class="mcard" style="margin-bottom:.45rem;'+(isMine?'border-color:rgba(255,230,0,0.38);':'')+'padding:.8rem">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.35rem">'
      +'<div style="display:flex;align-items:center;gap:.55rem">'
      +'<div style="font-family:Orbitron,sans-serif;font-size:.82rem;font-weight:900;color:#ffe600;min-width:44px">'+t+'</div>'
      +clubBadge(hp.club,m.league,22)+'<span style="font-size:.78rem;font-weight:700">'+esc(hp.username)+'</span>'
      +'<span style="font-size:.68rem;color:var(--dim)">vs</span>'
      +clubBadge(ap.club,m.league,22)+'<span style="font-size:.78rem;font-weight:700">'+esc(ap.username)+'</span>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:.4rem;flex-wrap:wrap">'
      +'<span style="font-size:.56rem;font-weight:700;padding:2px 6px;border-radius:4px;background:'+lg.bg+';color:'+lg.c+'">'+esc(lg.n||'')+'</span>'
      +(m.refereeName?'<span style="font-size:.6rem;color:#00FF85;background:rgba(0,255,136,0.07);border:1px solid rgba(0,255,136,0.18);border-radius:9px;padding:2px 6px">Ref: '+esc(m.refereeName)+'</span>':'')
      +(isMine?'<span style="font-size:.58rem;color:#ffe600;background:rgba(255,230,0,0.09);border:1px solid rgba(255,230,0,0.28);border-radius:9px;padding:2px 6px">YOUR MATCH</span>':'')
      +'</div></div>'
      +(m.roomCode?'<div style="margin-top:.45rem;font-size:.68rem;color:var(--dim)">Code: <span class="mcode" style="font-size:.72rem;padding:3px 7px;letter-spacing:2px" onclick="copyCode(\''+esc(m.roomCode)+'\')">'+esc(m.roomCode)+'</span></div>':'')
      +'</div>';
  });
  el.innerHTML=html;
}
function renderMatchPrep(){
  if(!myProfile){var h=$('prep-home-list');if(h)h.innerHTML='<div class="card" style="padding:1.1rem;text-align:center;color:var(--dim)">Login to view your matches.</div>';return;}
  var uid=myProfile.uid;
  var homeMs=Object.values(allMatches).filter(function(m){return!m.played&&m.homeId===uid;});
  var awayMs=Object.values(allMatches).filter(function(m){return!m.played&&m.awayId===uid;});
  var hl=$('prep-home-list'),al=$('prep-away-list');
  if(hl){
    if(!homeMs.length)hl.innerHTML='<div class="card" style="padding:1.1rem;text-align:center;color:var(--dim)">No pending home matches.</div>';
    else hl.innerHTML=homeMs.map(function(m){
      var ap=allPlayers[m.awayId];if(!ap)return'';
      var lg=LGS[m.league]||{};
      return'<div class="mcard" style="margin-bottom:.65rem">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.45rem;margin-bottom:.65rem">'
        +'<div style="display:flex;align-items:center;gap:.65rem">'+clubBadge(myProfile.club,myProfile.league,28)
        +'<div><div style="font-weight:700;font-size:.85rem">vs '+esc(ap.username)+' <span style="font-size:.6rem;color:var(--dim)">(Away)</span></div>'
        +'<div style="font-size:.63rem;color:'+lg.c+'">'+esc(lg.n||'')+'</div></div></div>'
        +'<span class="mstatus '+(m.roomCode?'ms-rdy':'ms-pend')+'">'+(m.roomCode?'Ready':'Pending')+'</span></div>'
        +(m.roomCode?'<div style="margin-bottom:.55rem"><div style="font-size:.63rem;color:var(--dim);margin-bottom:2px">Room Code</div><span class="mcode" onclick="copyCode(\''+esc(m.roomCode)+'\')">'+esc(m.roomCode)+'</span></div>':'')
        +'<div style="font-size:.7rem;color:var(--dim)">'+fmtFull(m.matchTime)+(m.prepNote?' - '+esc(m.prepNote):'')+'</div>'
        +'<div style="display:flex;gap:.45rem;margin-top:.65rem;flex-wrap:wrap">'
        +'<button class="bp" style="font-size:.7rem;padding:5px 11px" onclick="openPrepModal(\''+m.id+'\')">'+(m.roomCode?'Update Code':'Drop Code')+'</button>'
        +(m.roomCode?'<button class="bs" style="font-size:.7rem;padding:5px 11px" onclick="openDMWith(\''+ap.uid+'\',\''+esc(ap.username)+'\')">DM Away</button>':'')
        +'</div></div>';
    }).join('');
  }
  if(al){
    if(!awayMs.length)al.innerHTML='<div class="card" style="padding:1.1rem;text-align:center;color:var(--dim)">No pending away matches.</div>';
    else al.innerHTML=awayMs.map(function(m){
      var hp=allPlayers[m.homeId];if(!hp)return'';
      var lg=LGS[m.league]||{};
      return'<div class="mcard" style="margin-bottom:.65rem;border-color:rgba(0,212,255,0.18)">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.45rem;margin-bottom:.65rem">'
        +'<div style="display:flex;align-items:center;gap:.65rem">'+clubBadge(hp.club,m.league,28)
        +'<div><div style="font-weight:700;font-size:.85rem">vs '+esc(hp.username)+' <span style="font-size:.6rem;color:var(--dim)">(Home)</span></div>'
        +'<div style="font-size:.63rem;color:'+lg.c+'">'+esc(lg.n||'')+'</div></div></div>'
        +'<span class="mstatus '+(m.roomCode?'ms-rdy':'ms-pend')+'">'+(m.roomCode?'Code Ready':'Waiting')+'</span></div>'
        +(m.roomCode?'<div style="margin-bottom:.55rem"><span class="mcode" onclick="copyCode(\''+esc(m.roomCode)+'\')">'+esc(m.roomCode)+'</span></div>'
          +'<div style="font-size:.7rem;color:var(--dim)">'+fmtFull(m.matchTime)+(m.prepNote?' - '+esc(m.prepNote):'')+'</div>'
          :'<div style="font-size:.76rem;color:var(--dim);font-style:italic">Home team hasn\'t set the code yet.</div>')
        +'<div style="display:flex;gap:.45rem;margin-top:.65rem;flex-wrap:wrap">'
        +(m.roomCode?'<button class="bg" style="font-size:.7rem;padding:5px 11px" onclick="copyCode(\''+esc(m.roomCode||'')+'\')">Copy Code</button>':'')
        +'<button class="bs" style="font-size:.7rem;padding:5px 11px" onclick="openDMWith(\''+hp.uid+'\',\''+esc(hp.username)+'\')">DM Home</button>'
        +'</div></div>';
    }).join('');
  }
}
function openPrepModal(mid){
  if(!myProfile){showLanding();return;}
  $('prep-mid').value=mid;
  var m=allMatches[mid];
  $('prep-code').value=m&&m.roomCode?m.roomCode:'';
  $('prep-note').value=m&&m.prepNote?m.prepNote:'';
  $('prep-time').value='';$('prep-err').textContent='';
  openMo('prep-mo');
}
function submitPrep(){
  var mid=$('prep-mid').value,code=$('prep-code').value.trim().toUpperCase();
  var time=$('prep-time').value,note=$('prep-note').value.trim();
  var err=$('prep-err');err.textContent='';
  if(!code){err.textContent='Enter a room code.';return;}
  if(!time){err.textContent='Set a match time.';return;}
  var m=allMatches[mid],ap=m&&allPlayers[m.awayId];
  db.ref('ef_matches/'+mid).update({roomCode:code,matchTime:new Date(time).getTime(),prepNote:note,prepSetAt:Date.now()})
    .then(function(){
      closeMo('prep-mo');toast('Code sent to away team!');
      if(ap&&myProfile){
        var dk=dmKey(myProfile.uid,ap.uid);
        db.ref('ef_dm/'+dk).push({from:myProfile.uid,fromName:myProfile.username,text:'Match code: '+code+' | Time: '+fmtFull(new Date(time).getTime())+(note?' | '+note:''),ts:Date.now(),system:true});
        db.ref('ef_dm_meta/'+dk).update({lastMsg:'Code: '+code,lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+ap.uid]:true});
        db.ref('ef_dm_unread/'+ap.uid+'/'+dk).transaction(function(v){return(v||0)+1;});
      }
    }).catch(function(){err.textContent='Failed. Try again.';});
}
function copyCode(code){if(navigator.clipboard)navigator.clipboard.writeText(code).then(function(){toast('Copied: '+code);});else toast('Code: '+code);}