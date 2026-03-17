// ============================================================
// SWAP.JS — Team Swap Request System
// A user can request to swap their club with another user.
// Both must agree. Admin approves/rejects.
// Rules: same league only. One pending request at a time.
// ============================================================

var _swapRequests = {};
var _swapListening = false;

function initSwap(){
  if(_swapListening || !myProfile || !db) return;
  _swapListening = true;
  // Listen to incoming swap requests for me
  db.ref('ef_swaps').orderByChild('toUID').equalTo(myProfile.uid).on('value', function(s){
    var incoming = {};
    Object.entries(s.val()||{}).forEach(function(kv){
      if(kv[1].status==='pending') incoming[kv[0]] = kv[1];
    });
    _swapRequests = incoming;
    var count = Object.keys(incoming).length;
    updateBadge('swap-badge', count);
    if(activePage()==='profile') renderMySwapRequests();
  });
}

// ── OPEN SWAP REQUEST MODAL ──────────────────────────────────
function openSwapModal(){
  if(!myProfile){ showLanding(); return; }
  // Populate players in same league
  var lid = myProfile.league;
  var others = Object.values(allPlayers).filter(function(p){
    return p.uid !== myProfile.uid && p.league === lid && !p.banned;
  }).sort(function(a,b){ return a.club.localeCompare(b.club); });

  var el = $('swap-player-list');
  if(!el) return;

  if(!others.length){
    el.innerHTML = '<div style="color:var(--dim);text-align:center;padding:1rem;font-size:.78rem">No other players in your league yet.</div>';
  } else {
    el.innerHTML = others.map(function(p){
      var club = getClub(lid, p.club);
      return '<div onclick="selectSwapTarget(\''+p.uid+'\',\''+esc(p.username)+'\',\''+esc(p.club)+'\')" '
        +'class="swap-player-opt" style="display:flex;align-items:center;gap:.7rem;padding:.65rem .8rem;background:var(--card);border:1.5px solid var(--border);border-radius:10px;cursor:pointer;transition:all .2s;margin-bottom:.4rem">'
        +'<div style="width:36px;height:36px;border-radius:50%;background:#fff;border:1.5px solid '+club.color+'55;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0">'
        +'<img src="'+club.logo+'" loading="lazy" style="width:28px;height:28px;object-fit:contain" onerror="this.parentNode.innerHTML=\''+p.club.slice(0,2).toUpperCase()+'\'">'
        +'</div>'
        +'<div style="flex:1;min-width:0">'
        +'<div style="font-weight:700;font-size:.84rem">'+esc(p.username)+'</div>'
        +'<div style="font-size:.65rem;color:var(--dim)">'+esc(p.club)+'</div>'
        +'</div>'
        +'<div style="font-size:.6rem;color:var(--cyan);font-weight:700">Request swap →</div>'
        +'</div>';
    }).join('');
  }

  // Show my current club
  var myCl = $('swap-my-club');
  if(myCl){
    var mc = getClub(lid, myProfile.club);
    myCl.innerHTML = '<div style="display:flex;align-items:center;gap:.6rem;background:rgba(0,212,255,0.06);border:1px solid rgba(0,212,255,0.2);border-radius:10px;padding:.65rem .8rem">'
      +'<div style="width:36px;height:36px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;border:1.5px solid '+mc.color+'55">'
      +'<img src="'+mc.logo+'" loading="lazy" style="width:28px;height:28px;object-fit:contain">'
      +'</div>'
      +'<div><div style="font-weight:700;font-size:.84rem">'+esc(myProfile.club)+'</div>'
      +'<div style="font-size:.62rem;color:var(--dim)">Your current club</div></div>'
      +'</div>';
  }

  $('swap-msg').value = '';
  $('swap-err').textContent = '';
  $('swap-target-info').style.display = 'none';
  $('swap-send-btn').disabled = true;
  $('swap-send-btn').setAttribute('data-target', '');
  openMo('swap-mo');
}

function selectSwapTarget(uid, username, club){
  // Highlight selected
  document.querySelectorAll('.swap-player-opt').forEach(function(el){
    el.style.borderColor = 'var(--border)';
    el.style.background = 'var(--card)';
  });
  event.currentTarget.style.borderColor = '#00D4FF';
  event.currentTarget.style.background = 'rgba(0,212,255,0.08)';

  var btn = $('swap-send-btn');
  btn.setAttribute('data-target-uid', uid);
  btn.setAttribute('data-target-name', username);
  btn.setAttribute('data-target-club', club);
  btn.disabled = false;

  var info = $('swap-target-info');
  if(info){
    info.style.display = 'block';
    info.innerHTML = '<div style="font-size:.72rem;color:#00D4FF;font-style:italic">You will request to swap your <strong style="color:#fff">'+esc(myProfile.club)+'</strong> for <strong style="color:#fff">'+esc(club)+'</strong> ('+esc(username)+'\'s team)</div>';
  }
}

function sendSwapRequest(){
  if(!myProfile){ toast('Login first','error'); return; }
  var btn = $('swap-send-btn');
  var toUID = btn.getAttribute('data-target-uid');
  var toName = btn.getAttribute('data-target-name');
  var toClub = btn.getAttribute('data-target-club');
  var msg = $('swap-msg') ? $('swap-msg').value.trim() : '';
  var err = $('swap-err'); err.textContent = '';

  if(!toUID){ err.textContent = 'Please select a player.'; return; }
  if(toUID === myProfile.uid){ err.textContent = 'You cannot swap with yourself.'; return; }
  if(myProfile.club === toClub){ err.textContent = 'You already have the same club.'; return; }

  // Check no existing pending request from me to this person
  db.ref('ef_swaps').orderByChild('fromUID').equalTo(myProfile.uid).once('value', function(s){
    var existing = Object.values(s.val()||{}).find(function(r){
      return r.status === 'pending' && r.toUID === toUID;
    });
    if(existing){ err.textContent = 'You already have a pending swap request with this player.'; return; }

    btn.textContent = 'Sending...'; btn.disabled = true;
    db.ref('ef_swaps').push({
      fromUID: myProfile.uid,
      fromName: myProfile.username,
      fromClub: myProfile.club,
      fromLeague: myProfile.league,
      toUID: toUID,
      toName: toName,
      toClub: toClub,
      message: msg,
      status: 'pending',
      ts: Date.now()
    }).then(function(){
      btn.textContent = 'Send Swap Request';
      closeMo('swap-mo');
      toast('⇄ Swap request sent to '+toName+'!');
      // DM notification
      var key = dmKey(myProfile.uid, toUID);
      db.ref('ef_dm/'+key).push({
        from: 'system', fromName: 'eFootball Universe',
        text: '⇄ TEAM SWAP REQUEST\n\n'+myProfile.username+' wants to swap teams with you!\n\n'
          +'Their club: '+myProfile.club+'\nYour club: '+toClub
          +'\n\n'+(msg?'Message: "'+msg+'"\n\n':'')
          +'Go to Profile → Swap Requests to accept or decline.',
        ts: Date.now(), system: true
      });
      db.ref('ef_dm_meta/'+key).update({lastMsg:'Team swap request received!',lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+toUID]:true});
      db.ref('ef_dm_unread/'+toUID+'/'+key).transaction(function(v){return(v||0)+1;});
    }).catch(function(e){
      err.textContent = 'Failed: '+e.message;
      btn.textContent = 'Send Swap Request'; btn.disabled = false;
    });
  });
}

// ── RESPOND TO SWAP REQUEST ──────────────────────────────────
function acceptSwap(swapKey){
  if(!myProfile){ showLanding(); return; }
  db.ref('ef_swaps/'+swapKey).once('value', function(s){
    var req = s.val(); if(!req) return;
    if(req.status !== 'pending'){ toast('This request is no longer active.','error'); return; }
    // Confirm
    if(!confirm('Accept swap?\n\nYou will give up: '+req.toClub+'\nYou will receive: '+req.fromClub+'\n\nThis cannot be undone without admin help.')){ return; }

    // Execute the swap
    var updates = {};
    // Swap clubs
    updates['ef_players/'+req.fromUID+'/club'] = req.toClub;
    updates['ef_players/'+req.toUID+'/club'] = req.fromClub;
    // Mark request as accepted
    updates['ef_swaps/'+swapKey+'/status'] = 'accepted';
    updates['ef_swaps/'+swapKey+'/acceptedAt'] = Date.now();

    db.ref().update(updates).then(function(){
      toast('✅ Clubs swapped! You now manage '+req.fromClub+'.');
      // Notify the requester
      var key = dmKey(myProfile.uid, req.fromUID);
      db.ref('ef_dm/'+key).push({
        from:'system', fromName:'eFootball Universe',
        text:'✅ SWAP ACCEPTED!\n\n'+myProfile.username+' accepted your team swap request.\n\nYou now manage: '+req.toClub+'\n'+myProfile.username+' now manages: '+req.fromClub,
        ts:Date.now(), system:true
      });
      db.ref('ef_dm_meta/'+key).update({lastMsg:'Swap accepted!',lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+req.fromUID]:true});
      db.ref('ef_dm_unread/'+req.fromUID+'/'+key).transaction(function(v){return(v||0)+1;});
      // Admin log
      db.ref('ef_reports').push({type:'team_swap',fromUID:req.fromUID,fromName:req.fromName,toUID:req.toUID,toName:req.toName,fromClub:req.fromClub,toClub:req.toClub,ts:Date.now(),status:'completed'});
      renderMySwapRequests();
    }).catch(function(e){ toast('Failed: '+e.message,'error'); });
  });
}

function declineSwap(swapKey){
  if(!myProfile) return;
  db.ref('ef_swaps/'+swapKey).once('value', function(s){
    var req = s.val(); if(!req) return;
    db.ref('ef_swaps/'+swapKey+'/status').set('declined').then(function(){
      toast('Swap request declined.');
      // Notify requester
      var key = dmKey(myProfile.uid, req.fromUID);
      db.ref('ef_dm/'+key).push({
        from:'system',fromName:'eFootball Universe',
        text:'❌ '+myProfile.username+' declined your team swap request for '+req.fromClub+' ↔ '+req.toClub+'.',
        ts:Date.now(),system:true
      });
      db.ref('ef_dm_meta/'+key).update({lastMsg:'Swap declined',lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+req.fromUID]:true});
      db.ref('ef_dm_unread/'+req.fromUID+'/'+key).transaction(function(v){return(v||0)+1;});
      renderMySwapRequests();
    });
  });
}

function cancelSwap(swapKey){
  db.ref('ef_swaps/'+swapKey+'/status').set('cancelled').then(function(){
    toast('Swap request cancelled.');
    renderMySwapRequests();
  });
}

// ── RENDER SWAP SECTION (on profile page) ────────────────────
function renderMySwapRequests(){
  var el = $('my-swap-section'); if(!el||!myProfile) return;
  var lid = myProfile.league;
  var html = '';

  // Check for incoming requests
  db.ref('ef_swaps').orderByChild('toUID').equalTo(myProfile.uid).limitToLast(10).once('value', function(s){
    var incoming = Object.entries(s.val()||{}).filter(function(kv){return kv[1].status==='pending';});
    var outgoing = [];
    db.ref('ef_swaps').orderByChild('fromUID').equalTo(myProfile.uid).limitToLast(10).once('value', function(s2){
      var out = Object.entries(s2.val()||{}).filter(function(kv){return kv[1].status==='pending';});
      var recent = Object.entries(s2.val()||{}).filter(function(kv){return kv[1].status==='accepted'||kv[1].status==='declined';}).sort(function(a,b){return(b[1].ts||0)-(a[1].ts||0);}).slice(0,3);

      html = '<div style="margin-bottom:1rem">'
        +'<div class="sh" style="margin-bottom:.6rem">'
        +'<div style="font-family:Orbitron,sans-serif;font-size:.72rem;color:#00D4FF;letter-spacing:1.5px">⇄ TEAM SWAP</div>'
        +'<div class="sl" style="background:linear-gradient(90deg,rgba(0,212,255,0.4),transparent)"></div>'
        +'<button onclick="openSwapModal()" class="bp" style="font-size:.68rem;padding:5px 12px;flex-shrink:0">+ Request Swap</button>'
        +'</div>';

      // Current club display
      html += '<div style="background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.15);border-radius:11px;padding:.75rem .9rem;margin-bottom:.8rem;display:flex;align-items:center;gap:.7rem">'
        +clubBadge(myProfile.club, lid, 36)
        +'<div><div style="font-size:.7rem;color:var(--dim)">Current Club</div>'
        +'<div style="font-weight:700;font-size:.9rem;color:#fff">'+esc(myProfile.club)+'</div></div>'
        +'<div style="margin-left:auto;font-size:.62rem;color:var(--dim);text-align:right">'+esc((LGS[lid]||{}).n||'')+'</div>'
        +'</div>';

      // Incoming requests
      if(incoming.length){
        html += '<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:#00FF85;letter-spacing:1.5px;margin-bottom:.5rem">INCOMING REQUESTS ('+incoming.length+')</div>';
        incoming.forEach(function(kv){
          var key=kv[0],r=kv[1];
          html += '<div style="background:rgba(0,255,133,0.06);border:1.5px solid rgba(0,255,133,0.22);border-radius:12px;padding:.85rem;margin-bottom:.5rem">'
            +'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.6rem">'
            +clubBadge(r.fromClub, lid, 32)
            +'<div style="flex:1"><div style="font-weight:700;font-size:.84rem">'+esc(r.fromName)+' wants to swap</div>'
            +'<div style="font-size:.65rem;color:var(--dim)">Their club: <strong style="color:#fff">'+esc(r.fromClub)+'</strong> ↔ Your club: <strong style="color:#fff">'+esc(r.toClub)+'</strong></div>'
            +(r.message?'<div style="font-size:.67rem;color:#aaa;font-style:italic;margin-top:2px">"'+esc(r.message)+'"</div>':'')
            +'</div>'
            +'<div style="font-size:.6rem;color:var(--dim);flex-shrink:0">'+fmtAgo(r.ts)+'</div>'
            +'</div>'
            +'<div style="display:flex;gap:.45rem">'
            +'<button class="bg" style="flex:1;font-size:.75rem;padding:8px" onclick="acceptSwap(\''+key+'\')">✅ Accept Swap</button>'
            +'<button class="bd" style="flex:1;font-size:.75rem;padding:8px" onclick="declineSwap(\''+key+'\')">❌ Decline</button>'
            +'</div></div>';
        });
      }

      // Outgoing
      if(out.length){
        html += '<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--dim);letter-spacing:1.5px;margin:.65rem 0 .4rem">SENT REQUESTS</div>';
        out.forEach(function(kv){
          var key=kv[0],r=kv[1];
          html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:10px;padding:.7rem;margin-bottom:.4rem;display:flex;align-items:center;gap:.6rem">'
            +clubBadge(r.toClub, lid, 28)
            +'<div style="flex:1;min-width:0"><div style="font-size:.8rem;font-weight:700">To '+esc(r.toName)+'</div>'
            +'<div style="font-size:.62rem;color:var(--dim)">'+esc(r.fromClub)+' ↔ '+esc(r.toClub)+'</div>'
            +'<div style="font-size:.58rem;color:#FFE600">⏳ Waiting for response</div>'
            +'</div>'
            +'<button class="bd" style="font-size:.6rem;padding:3px 8px" onclick="cancelSwap(\''+key+'\')">Cancel</button>'
            +'</div>';
        });
      }

      // Recent history
      if(recent.length){
        html += '<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--dim);letter-spacing:1.5px;margin:.65rem 0 .4rem">RECENT</div>';
        recent.forEach(function(kv){
          var r=kv[1];
          var accepted=r.status==='accepted';
          html += '<div style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:9px;padding:.6rem;margin-bottom:.3rem;display:flex;align-items:center;gap:.5rem">'
            +'<div style="font-size:.9rem">'+(accepted?'✅':'❌')+'</div>'
            +'<div style="flex:1;font-size:.75rem;color:'+(accepted?'#00FF85':'var(--dim)')+'">'+(accepted?'Swap completed: ':'Declined: ')+esc(r.fromClub)+' ↔ '+esc(r.toClub)+'</div>'
            +'</div>';
        });
      }

      if(!incoming.length&&!out.length){
        html += '<div style="text-align:center;padding:1rem;color:var(--dim);font-size:.78rem">No active swap requests. Tap "Request Swap" to offer a trade with another player.</div>';
      }
      html += '</div>';
      el.innerHTML = html;
    });
  });
}
