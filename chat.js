// ============================================================
// CHAT & DM
// ============================================================
function loadChat(){
  if(chatOff){chatOff();chatOff=null;}
  var ref=db.ref('ef_chat/'+chatRoom).limitToLast(80);
  var handler=ref.on('value',function(s){
    var arr=Object.values(s.val()||{}).sort(function(a,b){return a.ts-b.ts;});
    var box=$('chat-msgs');if(!box)return;
    var atBot=box.scrollHeight-box.scrollTop-box.clientHeight<100;
    var parts=[];
    var ld='',lastUID='',lastTS=0;
    var GROUP_GAP=5*60*1000; // 5 min gap = new group

    arr.forEach(function(m,idx){
      // Date divider
      var d=new Date(m.ts).toDateString(),today=new Date().toDateString();
      if(d!==ld){
        ld=d;lastUID='';
        var lbl=d===today?'Today':new Date(m.ts).toLocaleDateString('en-GB',{weekday:'long',day:'2-digit',month:'long'});
        parts.push('<div class="csys">'+lbl+'</div>');
      }
      if(m.system){
        lastUID='';
        parts.push('<div class="csys">'+esc(m.text)+'</div>');
        return;
      }
      var mine=myProfile&&m.uid===myProfile.uid;
      var side=mine?'mine':'other';

      // Determine if this starts a new group
      var newGroup=m.uid!==lastUID||(m.ts-lastTS)>GROUP_GAP;
      lastUID=m.uid;lastTS=m.ts;

      // Look ahead to check if next msg is same sender
      var nextMsg=arr[idx+1];
      var isLast=!nextMsg||nextMsg.uid!==m.uid||(nextMsg.ts-m.ts)>GROUP_GAP||nextMsg.system;

      // Bubble shape class
      var shapeClass='';
      if(newGroup&&isLast) shapeClass=''; // single bubble — default radius
      else if(newGroup) shapeClass='first';
      else if(isLast) shapeClass='last';
      else shapeClass='mid';

      var club=getClub(m.league||'epl',m.club||'');
      var c=club.color||'#888';

      var html='';
      if(newGroup){
        // Open group div
        html+='<div class="cmsg-group '+side+'">';
        // Header with avatar + name (other only, mine shows nothing)
        html+='<div class="cmsg-header">';
        if(!mine){
          html+='<div class="cav" style="background:'+c+'22;border:1.5px solid '+c+'44;color:'+c+'" onclick="openReport(\''+m.uid+'\',\''+esc(m.username||'?')+'\')">';
          if(club.logo){
            html+='<img src="'+club.logo+'" style="width:18px;height:18px;object-fit:contain;border-radius:50%" onerror="this.outerHTML=\''+esc(m.username||'?').slice(0,2).toUpperCase()+'\'">';
          }else{
            html+=esc(m.username||'?').slice(0,2).toUpperCase();
          }
          html+='</div>';
          html+='<span class="cav-name">'+esc(m.username||'')+'</span>';
        }
        html+='</div>';
        html+='<div class="cbub-wrap">';
      }

      // The bubble itself
      html+='<div class="cbub '+side+' '+shapeClass+'">'+esc(m.text)+'</div>';

      // Time shown only on last bubble of group
      if(isLast){
        html+='<span class="cbub-time">'+fmtTime(m.ts)+'</span>';
        html+='</div>'; // close cbub-wrap
        html+='</div>'; // close cmsg-group
      }
      parts.push(html);
    });

    box.innerHTML=parts.join('');
    if(atBot)box.scrollTop=box.scrollHeight;
  });
  chatOff=function(){ref.off('value',handler);};
}
function switchRoom(room,btn){
  chatRoom=room;
  document.querySelectorAll('.crb').forEach(function(b){b.classList.remove('on');});
  if(btn)btn.classList.add('on');
  if(chatOff){chatOff();chatOff=null;}if(typingOff){typingOff();typingOff=null;}
  loadChat();listenTyping();
}
function sendChat(){
  if(!myProfile){showLanding();return;}
  var inp=$('cinp'),text=inp.value.trim();if(!text)return;
  inp.value='';
  db.ref('ef_chat/'+chatRoom).push({uid:myProfile.uid,username:myProfile.username,club:myProfile.club,country:myProfile.country||'',text:text,ts:Date.now()});
  db.ref('ef_typing/'+chatRoom+'/'+me.uid).remove();
}
var EMOJIS=['😀','😂','🤣','😍','😎','🥳','😭','😤','🔥','💯','👍','👎','❤️','💀','😱','🤝','👊','🎉','⚽','🏆','💪','😏','🤔','👀','🙏','😬','🥹','😮','💥','🎯','⚡','😤','🤯','🥶','😴','🤦','🤷'];
var emojiOpen=false;
function toggleEmojiPicker(){
  var ep=$('emoji-popup');if(!ep)return;
  emojiOpen=!emojiOpen;
  if(emojiOpen){
    ep.innerHTML=EMOJIS.map(function(e){return'<button class="ep-btn" onclick="insertEmoji(''+e+'')">'+e+'</button>';}).join('');
    ep.classList.add('open');
  }else{ep.classList.remove('open');}
}
function insertEmoji(e){
  var inp=$('cinp');if(!inp)return;
  var pos=inp.selectionStart;
  inp.value=inp.value.slice(0,pos)+e+inp.value.slice(pos);
  inp.focus();inp.selectionStart=inp.selectionEnd=pos+e.length;
  var ep=$('emoji-popup');if(ep){ep.classList.remove('open');emojiOpen=false;}
}
document.addEventListener('click',function(ev){
  if(emojiOpen&&!ev.target.closest('#emoji-popup')&&ev.target.id!=='cinp-emoji'){
    var ep=$('emoji-popup');if(ep){ep.classList.remove('open');emojiOpen=false;}
  }
});
function onTyping(){
  if(!myProfile||!db)return;
  db.ref('ef_typing/'+chatRoom+'/'+me.uid).set({name:myProfile.username,ts:Date.now()});
  clearTimeout(typingTO);typingTO=setTimeout(function(){db.ref('ef_typing/'+chatRoom+'/'+me.uid).remove();},2500);
}
function listenTyping(){
  if(!db)return;
  var ref=db.ref('ef_typing/'+chatRoom);
  var handler=ref.on('value',function(s){
    var now=Date.now();
    var names=Object.values(s.val()||{}).filter(function(t){return t.ts>now-3500&&(!myProfile||t.name!==myProfile.username);}).map(function(t){return t.name;});
    var e=$('chat-typing');if(!e)return;
    if(!names.length){e.innerHTML='';}
    else{
      var who=names.length===1?names[0]:names.slice(0,-1).join(', ')+' & '+names[names.length-1];
      e.innerHTML='<div class="ctyping-wrap"><div style="font-size:.62rem;color:var(--dim);margin-right:2px">'+esc(who)+'</div>'
        +'<div class="ctyping-dots"><span></span><span></span><span></span></div></div>';
    }
  });
  typingOff=function(){ref.off('value',handler);};
}
var _unreadListening=false;
function listenUnread(){
  if(!myProfile||!db)return;
  if(_unreadListening)return;  // already attached
  _unreadListening=true;
  db.ref('ef_dm_unread/'+myProfile.uid).on('value',function(s){
    var total=0;Object.values(s.val()||{}).forEach(function(v){total+=v||0;});
    unreadPM=total;updateBadge('pm-badge',total);
  });
}
function loadPMList(){
  if(!myProfile||!db)return;
  db.ref('ef_dm_meta').orderByChild('participants/'+myProfile.uid).equalTo(true).on('value',function(s){
    var convs=s.val()||{};
    var list=$('pm-list');if(!list)return;
    var arr=Object.entries(convs).sort(function(a,b){return(b[1].lastTs||0)-(a[1].lastTs||0);});
    if(!arr.length){list.innerHTML='<div style="font-size:.68rem;color:var(--dim);text-align:center;padding:.9rem">No conversations yet</div>';return;}
    list.innerHTML=arr.map(function(kv){
      var key=kv[0],cv=kv[1];
      var otherUID=key.split('_').find(function(u){return u!==myProfile.uid;});
      var op=allPlayers[otherUID];if(!op)return'';
      var c=clubColor(op.club||'?');
      return'<div class="pli'+(pmUID===otherUID?' on':'')+'" onclick="openDMWith(\''+otherUID+'\',\''+esc(op.username)+'\')">'
        +'<div class="cbadge" style="width:26px;height:26px;background:'+c+'22;border:1.5px solid '+c+'55;font-size:.52rem;color:'+c+'">'+esc(op.username).slice(0,2).toUpperCase()+'</div>'
        +'<div style="flex:1;min-width:0"><div class="pli-name">'+esc(op.username)+'</div><div class="pli-last">'+esc(cv.lastMsg||'')+'</div></div>'
        +'<span data-lastseen="'+(op.lastSeen||0)+'" style="width:7px;height:7px;border-radius:50%;background:'+lsColor(op.lastSeen||0)+';display:inline-block;flex-shrink:0"></span>'
        +'</div>';
    }).join('');
  });
}
function openDMWith(uid,name){
  if(!myProfile){showLanding();return;}
  pmUID=uid;closeMo('new-dm-mo');go('pm');
  document.querySelectorAll('.pli').forEach(function(el){el.classList.remove('on');if((el.getAttribute('onclick')||'').includes("'"+uid+"'"))el.classList.add('on');});
  var op=allPlayers[uid];var c=op?clubColor(op.club||'?'):'#888';
  var ph=$('pm-header');
  if(ph)ph.innerHTML='<div class="cbadge" style="width:28px;height:28px;background:'+c+'22;border:1.5px solid '+c+'55;font-size:.58rem;color:'+c+'">'+name.slice(0,2).toUpperCase()+'</div>'
    +'<div style="flex:1"><div style="font-weight:700;font-size:.85rem">'+esc(name)+'</div>'
    +(op?'<div style="font-size:.63rem;color:var(--dim)"><span data-lastseen="'+(op.lastSeen||0)+'" data-agospan="'+(op.lastSeen||0)+'" style="color:'+lsColor(op.lastSeen||0)+'">'+fmtAgo(op.lastSeen||0)+'</span></div>':'')+'</div>'
    +'<button class="bd" style="font-size:.65rem;padding:4px 9px" onclick="openReport(\''+uid+'\',\''+esc(name)+'\')">Report</button>';
  var ir=$('pm-inp-row');if(ir)ir.style.display='flex';
  if(pmOff){pmOff();pmOff=null;}
  var key=dmKey(myProfile.uid,uid);
  db.ref('ef_dm_unread/'+myProfile.uid+'/'+key).set(0);
  // Mark last message as seen by recipient
  db.ref('ef_dm/'+key).limitToLast(1).once('value').then(function(s){
    var vals=Object.entries(s.val()||{});
    if(!vals.length)return;
    var msgKey=vals[0][0], msg=vals[0][1];
    if(msg.from!==myProfile.uid){
      db.ref('ef_dm/'+key+'/'+msgKey+'/seenBy/'+myProfile.uid).set(Date.now());
    }
  });
  var ref=db.ref('ef_dm/'+key).limitToLast(100);
  var msgs=$('pm-msgs');
  var handler=ref.on('value',function(s){
    var raw=s.val()||{};
    var arr=Object.values(raw).sort(function(a,b){return a.ts-b.ts;});
    if(!msgs)return;
    var pmParts=[];
    // Auto-mark latest incoming message as seen
    var keys=Object.keys(raw);
    if(keys.length){
      var lastKey=keys[keys.length-1];
      var lastMsg=raw[lastKey];
      if(lastMsg.from!==myProfile.uid&&!(lastMsg.seenBy&&lastMsg.seenBy[myProfile.uid])){
        db.ref('ef_dm/'+key+'/'+lastKey+'/seenBy/'+myProfile.uid).set(Date.now());
      }
    }
    var lastUID2='',lastTS2=0,GROUP_GAP2=5*60*1000;
    arr.forEach(function(m,idx){
      var mine=m.from===myProfile.uid;
      var side=mine?'mine':'other';
      var seen=m.seenBy&&Object.keys(m.seenBy).some(function(uid){return uid!==myProfile.uid;});
      var newGroup2=m.from!==lastUID2||(m.ts-lastTS2)>GROUP_GAP2;
      lastUID2=m.from;lastTS2=m.ts;
      var nextMsg2=arr[idx+1];
      var isLast2=!nextMsg2||nextMsg2.from!==m.from||(nextMsg2.ts-m.ts)>GROUP_GAP2;
      var shapeClass2=newGroup2&&isLast2?'':newGroup2?'first':isLast2?'last':'mid';
      var ticks='';
      if(mine&&!m.system&&isLast2){
        if(seen) ticks='<span class="cbub-ticks" style="color:#00D4FF">&#10003;&#10003;</span>';
        else if(m.sent) ticks='<span class="cbub-ticks" style="color:var(--dim)">&#10003;</span>';
      }
      var html2='';
      if(newGroup2&&!mine){html2+='<div class="cmsg-group other"><div class="cmsg-header"><div class="cav" style="background:rgba(100,100,100,0.2);color:#aaa">'+esc(m.fromName||'?').slice(0,2).toUpperCase()+'</div><span class="cav-name">'+esc(m.fromName||'')+'</span></div><div class="cbub-wrap">';}
      else if(newGroup2&&mine){html2+='<div class="cmsg-group mine"><div class="cbub-wrap">';}
      html2+='<div class="cbub '+side+' '+shapeClass2+'">'+(m.system?'<em style="font-size:.76rem">'+esc(m.text)+'</em>':esc(m.text))+'</div>';
      if(isLast2){html2+='<span class="cbub-time">'+fmtTime(m.ts)+ticks+'</span></div></div>';}
      pmParts.push(html2);
    });
    msgs.innerHTML=pmParts.join('');msgs.scrollTop=msgs.scrollHeight;
  });
  pmOff=function(){ref.off('value',handler);};
}
function sendPM(){
  if(!myProfile||!pmUID)return;
  var inp=$('pm-inp'),text=inp.value.trim();if(!text)return;inp.value='';
  var key=dmKey(myProfile.uid,pmUID);
  db.ref('ef_dm/'+key).push({from:myProfile.uid,fromName:myProfile.username,text:text,ts:Date.now(),sent:true});
  db.ref('ef_dm_meta/'+key).update({lastMsg:text,lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+pmUID]:true});
  db.ref('ef_dm_unread/'+pmUID+'/'+key).transaction(function(v){return(v||0)+1;});
}
function searchDmPlayer(){
  var q=$('dm-search').value.trim().toLowerCase();
  var res=$('dm-results');if(!res)return;
  if(!q||!myProfile){res.innerHTML='';return;}
  var matches=Object.values(allPlayers).filter(function(p){return p.uid!==myProfile.uid&&p.username.toLowerCase().includes(q);}).slice(0,8);
  if(!matches.length){res.innerHTML='<div style="color:var(--dim);font-size:.76rem;padding:.45rem">No players found</div>';return;}
  res.innerHTML=matches.map(function(p){
    var c=clubColor(p.club||'?');
    return'<div style="display:flex;align-items:center;gap:.65rem;padding:.55rem;background:var(--card);border-radius:9px;cursor:pointer;border:1px solid var(--border)" onclick="openDMWith(\''+p.uid+'\',\''+esc(p.username)+'\')">'
      +'<div class="cbadge" style="width:26px;height:26px;background:'+c+'22;border:1.5px solid '+c+'55;font-size:.52rem;color:'+c+'">'+esc(p.username).slice(0,2).toUpperCase()+'</div>'
      +'<div style="flex:1"><div style="font-weight:700;font-size:.8rem">'+esc(p.username)+'</div><div style="font-size:.6rem;color:var(--dim)">'+esc(p.club)+'</div></div>'
      +'<span style="width:7px;height:7px;border-radius:50%;background:'+lsColor(p.lastSeen||0)+';display:inline-block"></span>'
      +'</div>';
  }).join('');
}
var _globalDMsListening=false;
var _lastNotifMsg={};  // track last shown message per conversation key
function listenGlobalDMs(){
  if(!myProfile||!db)return;
  if(_globalDMsListening)return;  // already attached — never attach twice
  _globalDMsListening=true;
  db.ref('ef_dm_unread/'+myProfile.uid).on('child_changed',function(s){
    var key=s.key,val=s.val()||0;if(val===0)return;
    db.ref('ef_dm/'+key).limitToLast(1).once('value').then(function(ms){
      var arr=Object.values(ms.val()||{});if(!arr.length)return;
      var msg=arr[arr.length-1];
      if(msg.from===myProfile.uid)return;  // don't notify own messages
      // Deduplicate: don't show same message twice
      if(_lastNotifMsg[key]===msg.ts)return;
      _lastNotifMsg[key]=msg.ts;
      var sender=allPlayers[msg.from]||{username:msg.fromName||'Unknown',club:'?'};
      showNotif(sender.username,sender.club,msg.text,function(){
        go('pm');setTimeout(function(){openDMWith(msg.from,sender.username);},200);
      });
    });
  });
}
function showNotif(senderName,senderClub,msgText,onClick){
  var wrap=$('notif-wrap');if(!wrap)return;
  var c=clubColor(senderClub||'?');
  var card=document.createElement('div');card.className='notif-card';
  card.innerHTML='<div class="cbadge" style="width:32px;height:32px;background:'+c+'22;border:1.5px solid '+c+'55;font-size:.62rem;color:'+c+'">'+esc(senderName||'?').slice(0,2).toUpperCase()+'</div>'
    +'<div style="flex:1;min-width:0"><div style="font-size:.7rem;font-weight:700;color:#fff;margin-bottom:1px">'+esc(senderName)+'</div>'
    +'<div style="font-size:.7rem;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(msgText.slice(0,55))+(msgText.length>55?'...':'')+'</div></div>'
    +'<button style="background:none;border:none;color:var(--dim);cursor:pointer;font-size:.88rem;line-height:1;flex-shrink:0" onclick="event.stopPropagation();this.parentNode.remove()">x</button>';
  card.onclick=function(e){if(e.target.tagName==='BUTTON')return;onClick&&onClick();card.classList.add('out');setTimeout(function(){card.remove();},300);};
  wrap.appendChild(card);
  setTimeout(function(){if(card.parentNode){card.classList.add('out');setTimeout(function(){card.remove();},300);}},5000);
}

// ============================================================
// PROFILE & USER MODAL
// ============================================================
function renderProfile(){
  var el=$('profile-content');if(!el)return;
  if(!myProfile){el.innerHTML='<div style="text-align:center;padding:2.5rem;color:var(--dim)">Please login to view your profile.</div>';return;}
  var p=myProfile,lg=LGS[p.league]||{};
  var ms=Object.values(allMatches).filter(function(m){return m.played&&(m.homeId===p.uid||m.awayId===p.uid);});
  var w=ms.filter(function(m){return(m.homeId===p.uid&&m.hg>m.ag)||(m.awayId===p.uid&&m.ag>m.hg);}).length;
  var d=ms.filter(function(m){return m.hg===m.ag;}).length,l=ms.length-w-d;
  var pen=allPenalties[p.uid]?Object.values(allPenalties[p.uid]).reduce(function(s,x){return s+(x.pts||0);},0):0;
  var pts=Math.max(0,w*3+d-pen);
  var tbl=computeStd(p.league),rank=tbl.findIndex(function(r){return r.uid===p.uid;})+1;
  // Cover photo
  var cover=p.coverPhoto?'<div style="height:110px;border-radius:12px 12px 0 0;background:url('+p.coverPhoto+') center/cover no-repeat;margin:-1.3rem -1.3rem .7rem;position:relative"><div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 40%,rgba(0,0,0,0.7));border-radius:12px 12px 0 0"></div></div>':'<div style="height:70px;border-radius:12px 12px 0 0;background:linear-gradient(135deg,'+lg.c+'22,transparent);margin:-1.3rem -1.3rem .7rem"></div>';
  var html='<div class="card" style="padding:1.3rem;margin-bottom:.9rem;overflow:hidden">'+cover
    +'<div style="display:flex;align-items:center;gap:1.1rem;flex-wrap:wrap">'
    +clubBadge(p.club,p.league,52)
    +'<div style="flex:1"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1.2rem">'+esc(p.username)+'</div>'
    +'<div style="color:#00D4FF;font-weight:700;margin-top:1px">'+esc(p.club)+'</div>'
    +'<div style="font-size:.7rem;color:'+lg.c+';margin-top:1px">'+esc(lg.n||'')+'</div>'
    +'<div style="font-size:.63rem;color:var(--dim);margin-top:1px">'+esc(p.country||'')+'</div>'
    +'<div style="font-size:.63rem;color:var(--dim);margin-top:1px">Last seen: '+fmtAgo(p.lastSeen||0)+'</div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:.55rem">'
    +'<div style="text-align:center;background:rgba(0,0,0,0.35);border-radius:8px;padding:7px 11px"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.95rem;color:#FFE600">'+pts+'</div><div style="font-size:.55rem;color:var(--dim)">POINTS</div></div>'
    +'<div style="text-align:center;background:rgba(0,0,0,0.35);border-radius:8px;padding:7px 11px"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.95rem;color:#00D4FF">#'+(rank||'--')+'</div><div style="font-size:.55rem;color:var(--dim)">RANK</div></div>'
    +'<div style="text-align:center;background:rgba(0,0,0,0.35);border-radius:8px;padding:7px 11px"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.95rem;color:#00FF85">'+w+'</div><div style="font-size:.55rem;color:var(--dim)">WON</div></div>'
    +'<div style="text-align:center;background:rgba(0,0,0,0.35);border-radius:8px;padding:7px 11px"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.95rem;color:#FF2882">'+l+'</div><div style="font-size:.55rem;color:var(--dim)">LOST</div></div>'
    +'</div></div>'
    +'<div style="display:flex;gap:.45rem;margin-bottom:1rem;flex-wrap:wrap">'
    +'<button class="bs" style="font-size:.72rem;padding:5px 11px" onclick="openMo(\'avatar-mo\')">Edit Avatar</button>'
    +'</div>'
    +'<div style="font-family:Orbitron,sans-serif;font-size:.68rem;color:#00D4FF;letter-spacing:2px;margin-bottom:.65rem">MATCH HISTORY</div>';
  if(!ms.length)html+='<div class="card" style="padding:1.1rem;text-align:center;color:var(--dim)">No matches played yet.</div>';
  else ms.slice().sort(function(a,b){return(b.playedAt||0)-(a.playedAt||0);}).forEach(function(m){
    var ih=m.homeId===p.uid,opp=allPlayers[ih?m.awayId:m.homeId];
    var mg=ih?m.hg:m.ag,og=ih?m.ag:m.hg;
    var res=mg>og?'W':mg===og?'D':'L',rc=res==='W'?'#00FF85':res==='D'?'#FFE600':'#FF2882';
    html+='<div class="card" style="padding:.75rem .9rem;margin-bottom:.45rem;display:flex;align-items:center;gap:.75rem">'
      +'<div style="background:'+rc+'22;color:'+rc+';font-family:Orbitron,sans-serif;font-weight:900;width:26px;height:26px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:.78rem">'+res+'</div>'
      +'<div style="flex:1"><div style="font-size:.8rem;font-weight:600">'+esc(p.club)+' vs '+esc(opp?opp.club:'?')+'</div>'
      +'<div style="font-size:.63rem;color:var(--dim)">'+(opp?esc(opp.username):'?')+' - '+fmtDate(m.playedAt)+'</div></div>'
      +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.88rem;color:#fff;letter-spacing:2px">'+mg+' - '+og+'</div>'
      +'</div>';
  });
  el.innerHTML=html;
}
function openEditBio(){
  if(!myProfile)return;
  var inp=$('bio-inp');if(inp)inp.value=myProfile.bio||'';
  openMo('edit-bio-mo');
}
function openUserModal(uid){
  var p=allPlayers[uid];if(!p)return;
  var lg=LGS[p.league]||{};
  var ms=Object.values(allMatches).filter(function(m){return m.played&&(m.homeId===uid||m.awayId===uid);});
  var w=ms.filter(function(m){return(m.homeId===uid&&m.hg>m.ag)||(m.awayId===uid&&m.ag>m.hg);}).length;
  var d=ms.filter(function(m){return m.hg===m.ag;}).length,l=ms.length-w-d;
  var pen=allPenalties[uid]?Object.values(allPenalties[uid]).reduce(function(s,x){return s+(x.pts||0);},0):0;
  var pts=Math.max(0,w*3+d-pen);
  var tbl=computeStd(p.league),rank=tbl.findIndex(function(r){return r.uid===uid;})+1;
  var last=ms.sort(function(a,b){return(b.playedAt||0)-(a.playedAt||0);}).slice(0,5);
  var html='<div style="display:flex;align-items:center;gap:.9rem;margin-bottom:1.1rem;flex-wrap:wrap">'
    +clubBadge(p.club,p.league,52)
    +'<div style="flex:1"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1.1rem">'+esc(p.username)+'</div>'
    +'<div style="color:#00D4FF;font-weight:700;font-size:.82rem;margin-top:1px">'+esc(p.club)+'</div>'
    +'<div style="font-size:.68rem;color:'+lg.c+';margin-top:1px">'+esc(lg.n||'')+'</div>'
    +'<div style="font-size:.63rem;color:var(--dim);margin-top:1px">'+esc(p.country||'')+' - <span style="color:'+lsColor(p.lastSeen||0)+'">'+fmtAgo(p.lastSeen||0)+'</span></div></div></div>'
    +'<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:.45rem;margin-bottom:.9rem">'
    +[['#'+rank,'Rank','#00d4ff'],[pts+'pts','Points','#FFE600'],[w+'-'+d+'-'+l,'W-D-L','#00FF85'],[pen>0?'-'+pen+'pts':'Clean','Discipline',pen>0?'#FF2882':'#00FF85']].map(function(s){
      return'<div style="text-align:center;background:rgba(0,0,0,0.35);border-radius:8px;padding:6px 4px"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.82rem;color:'+s[2]+'">'+s[0]+'</div><div style="font-size:.52rem;color:var(--dim);text-transform:uppercase;letter-spacing:.5px">'+s[1]+'</div></div>';
    }).join('')+'</div>';
  if(last.length){
    html+='<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:#00FF85;letter-spacing:1.5px;margin-bottom:.45rem">LAST RESULTS</div>';
    html+=last.map(function(m){
      var isH=m.homeId===uid,opp=allPlayers[isH?m.awayId:m.homeId];
      var mg=isH?m.hg:m.ag,og=isH?m.ag:m.hg;
      var res=mg>og?'W':mg===og?'D':'L',rc=res==='W'?'#00FF85':res==='D'?'#FFE600':'#FF2882';
      return'<div style="display:flex;align-items:center;gap:.55rem;padding:.32rem .55rem;background:rgba(0,0,0,0.35);border-radius:7px;margin-bottom:2px">'
        +'<div style="background:'+rc+'22;color:'+rc+';font-family:Orbitron,sans-serif;font-weight:900;width:20px;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:.7rem">'+res+'</div>'
        +'<div style="flex:1;font-size:.7rem">vs '+esc(opp?opp.username:'?')+'</div>'
        +'<div style="font-family:Orbitron,sans-serif;font-size:.72rem;color:#fff;letter-spacing:1px">'+mg+'-'+og+'</div></div>';
    }).join('');
  }
  html+='<div style="display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.8rem">'
    +(myProfile&&uid!==myProfile.uid?'<button class="bs" style="font-size:.72rem;padding:5px 10px" onclick="closeMo(\'user-mo\');openDMWith(\''+uid+'\',\''+esc(p.username)+'\')">Message</button>':'')
    +(myProfile&&uid!==myProfile.uid?'<button class="bd" style="font-size:.72rem;padding:5px 10px" onclick="closeMo(\'user-mo\');openReport(\''+uid+'\',\''+esc(p.username)+'\')">Report</button>':'')
    +'</div>';
  var el=$('user-mo-content');if(el)el.innerHTML=html;
  openMo('user-mo');
}

// ============================================================
// REPORTS
// ============================================================
function openReport(uid,name){
  $('rep-uid').value=uid;$('rep-uname').value=name;
  $('rep-who').textContent=name;$('rep-reason').value='';$('rep-details').value='';$('rep-err').textContent='';
  openMo('report-mo');
}
function submitReport(){
  if(!myProfile){closeMo('report-mo');showLanding();return;}
  var uid=$('rep-uid').value,name=$('rep-uname').value;
  var reason=$('rep-reason').value,details=$('rep-details').value.trim();
  var err=$('rep-err');err.textContent='';
  if(!reason){err.textContent='Select a reason.';return;}
  var btn=$('rep-submit-btn');btn.textContent='Submitting...';btn.disabled=true;
  db.ref('ef_reports').push({reportedUID:uid,reportedName:name,reporterUID:myProfile.uid,reporterName:myProfile.username,reason:reason,details:details,ts:Date.now(),status:'pending'})
    .then(function(){btn.textContent='Submit Report';btn.disabled=false;closeMo('report-mo');toast('Report submitted. Admin will review.');})
    .catch(function(){err.textContent='Failed. Try again.';btn.textContent='Submit Report';btn.disabled=false;});
}

// ============================================================
// AVATAR
// ============================================================
var newAvatarData=null;
window.addEventListener('DOMContentLoaded',function(){
  var ep=$('emoji-picker');if(!ep)return;
  var emojis=['⚽','🏆','🔥','⚡','💥','🎮','🕹️','👑','🦅','🐉','🦁','🐺','🌟','💎','🛡️','🗡️','🚀','🎯','🤖','🦊','🐯','🦈','🏅','⭐','🌙','☄️'];
  ep.innerHTML=emojis.map(function(e){return'<button onclick="selectEmoji(\''+e+'\')" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:8px;width:36px;height:36px;font-size:1.1rem;cursor:pointer">'+e+'</button>';}).join('');
});
function selectEmoji(e){newAvatarData=e;toast('Selected: '+e);}
function previewAvatar(input){
  var file=input.files[0];if(!file)return;
  if(file.size>300000){$('avatar-err').textContent='Image too large (max 300KB).';return;}
  var reader=new FileReader();
  reader.onload=function(ev){
    newAvatarData=ev.target.result;
    var prev=$('avatar-prev');prev.src=newAvatarData;prev.style.display='block';
    var ph=$('avatar-ph');if(ph)ph.style.display='none';
  };
  reader.readAsDataURL(file);
}
function saveAvatar(){
  if(!myProfile){toast('Login first','error');return;}
  if(!newAvatarData){$('avatar-err').textContent='Select an emoji or upload an image.';return;}
  var btn=$('avatar-save-btn');btn.textContent='Saving...';btn.disabled=true;
  db.ref('ef_players/'+me.uid+'/avatar').set(newAvatarData)
    .then(function(){btn.textContent='Save Avatar';btn.disabled=false;closeMo('avatar-mo');toast('Avatar updated!');newAvatarData=null;})
    .catch(function(){btn.textContent='Save Avatar';btn.disabled=false;$('avatar-err').textContent='Failed. Try again.';});
}