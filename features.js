
// ============================================================
// FEATURES.JS
// ============================================================
var CLOUDINARY_CLOUD = 'dbgxllxdb';
var CLOUDINARY_PRESET = 'efootball_screenshots';

// ============================================================
// ACHIEVEMENT BADGES
// ============================================================
var BADGES = {
  // ── MATCH PERFORMANCE ─────────────────────────────
  league_winner:{ icon:'🏆', label:'League Winner',      color:'#FFE600', desc:'Finished 1st in their league',            rarity:'legendary' },
  comeback:     { icon:'💪', label:'Comeback King',       color:'#bf00ff', desc:'Was bottom half early, finished top 4',   rarity:'epic'      },
  unbeaten:     { icon:'🛡',  label:'Unbeaten Run',        color:'#00FF85', desc:'5+ games without a loss',                 rarity:'rare'      },
  top_form:     { icon:'🔥', label:'On Fire',             color:'#ff6b00', desc:'Won last 3 matches in a row',              rarity:'rare'      },
  clean_sheet:  { icon:'🧤', label:'Clean Sheet King',    color:'#00D4FF', desc:'3+ clean sheets in last 10 games',         rarity:'rare'      },
  giant_killer: { icon:'⚡', label:'Giant Killer',        color:'#FF2882', desc:'Beat a top-3 ranked player',              rarity:'epic'      },
  veteran:      { icon:'⭐', label:'Veteran',             color:'#aaa',    desc:'Played 10+ matches',                      rarity:'common'    },
  consistent:   { icon:'📈', label:'Mr Consistent',       color:'#FFE600', desc:'Unbeaten in last 5 matches',              rarity:'rare'      },
  // ── PREDICTION BADGES ─────────────────────────────
  oracle:       { icon:'🔮', label:'The Oracle',          color:'#a855f7', desc:'10+ exact score predictions correct',     rarity:'legendary' },
  sharp:        { icon:'🎯', label:'Sharp Shooter',       color:'#00D4FF', desc:'5+ exact score predictions correct',      rarity:'epic'      },
  predictor:    { icon:'🧠', label:'Predictor',           color:'#00FF85', desc:'10+ correct match outcome predictions',    rarity:'rare'      },
  prophet:      { icon:'👁',  label:'The Prophet',        color:'#FFE600', desc:'3 exact score predictions in a row',      rarity:'epic'      },
  analyst:      { icon:'📊', label:'Analyst',             color:'#00D4FF', desc:'Predicted 20+ matches total',             rarity:'rare'      },
};

// Rarity glow map
var RARITY_GLOW = {
  legendary: 'rgba(255,230,0,0.6)',
  epic:      'rgba(168,85,247,0.5)',
  rare:      'rgba(0,212,255,0.5)',
  common:    'rgba(255,255,255,0.2)'
};

function computeBadges(uid){
  var earned=[];
  var ms=Object.values(allMatches).filter(function(m){
    return m.played&&!m.pendingResult&&(m.homeId===uid||m.awayId===uid);
  }).sort(function(a,b){return(a.playedAt||0)-(b.playedAt||0);});

  if(!ms.length) return earned;

  function res(m){return m.homeId===uid?(m.hg>m.ag?'W':m.hg===m.ag?'D':'L'):(m.ag>m.hg?'W':m.ag===m.hg?'D':'L');}
  function ga(m){return m.homeId===uid?m.ag:m.hg;}

  var results=ms.map(res);
  var last3=results.slice(-3), last5=results.slice(-5);

  // Veteran
  if(ms.length>=10) earned.push('veteran');
  // On Fire
  if(last3.length===3&&last3.every(function(r){return r==='W';})) earned.push('top_form');
  // Unbeaten run
  if(last5.length===5&&last5.every(function(r){return r!=='L';})) earned.push('unbeaten');
  // Consistent
  if(last5.length>=3&&last5.every(function(r){return r!=='L';})) earned.push('consistent');
  // Clean sheet king
  var cs=ms.slice(-10).filter(function(m){return ga(m)===0;}).length;
  if(cs>=3) earned.push('clean_sheet');
  // Giant killer — beat someone currently in top 3
  var lgPlayers=allPlayers[uid]?computeStd(allPlayers[uid].league):[];
  var top3UIDs=lgPlayers.slice(0,3).map(function(r){return r.uid;});
  var killedTop3=ms.some(function(m){
    var opp=m.homeId===uid?m.awayId:m.homeId;
    return top3UIDs.includes(opp)&&res(m)==='W';
  });
  if(killedTop3) earned.push('giant_killer');
  // League winner — manual badge set by admin
  var p=allPlayers[uid];
  if(p&&p.badges&&p.badges.league_winner) earned.push('league_winner');

  // ── COMEBACK KING ──────────────────────────────────────────
  // Was position 5 or below after matchday 2 (first 2 matches)
  // AND currently in top 4
  if(ms.length>=3){
    var first2=ms.slice(0,2);
    // Compute mini-table after first 2 matches of this league
    var lid=p?p.league:'epl';
    var miniTable={};
    Object.values(allPlayers).filter(function(pl){return pl.league===lid;}).forEach(function(pl){
      miniTable[pl.uid]={pts:0,gd:0};
    });
    Object.values(allMatches).filter(function(m){
      return m.played&&!m.pendingResult&&m.league===lid;
    }).sort(function(a,b){return(a.playedAt||0)-(b.playedAt||0);})
    .slice(0,Math.ceil(Object.keys(miniTable).length)) // rough matchday 2 window
    .forEach(function(m){
      if(!miniTable[m.homeId]||!miniTable[m.awayId])return;
      var hg=m.hg,ag=m.ag;
      miniTable[m.homeId].gd+=hg-ag; miniTable[m.awayId].gd+=ag-hg;
      if(hg>ag){miniTable[m.homeId].pts+=3;}
      else if(hg<ag){miniTable[m.awayId].pts+=3;}
      else{miniTable[m.homeId].pts+=1;miniTable[m.awayId].pts+=1;}
    });
    var sorted=Object.entries(miniTable).sort(function(a,b){
      return b[1].pts!==a[1].pts?b[1].pts-a[1].pts:b[1].gd-a[1].gd;
    });
    var earlyPos=sorted.findIndex(function(e){return e[0]===uid;})+1;
    // Current position
    var curTable=computeStd(lid);
    var curPos=curTable.findIndex(function(r){return r.uid===uid;})+1;
    if(earlyPos>=5&&curPos>=1&&curPos<=4) earned.push('comeback');
  }

  // ── PREDICTION BADGES ─────────────────────────────────────
  var pd=allPlayers[uid];
  if(pd&&pd.predStats){
    var ps=pd.predStats;
    if((ps.exact||0)>=10)       earned.push('oracle');
    else if((ps.exact||0)>=5)   earned.push('sharp');
    if((ps.correct||0)>=10)     earned.push('predictor');
    if((ps.streak||0)>=3)       earned.push('prophet');
    if((ps.total||0)>=20)       earned.push('analyst');
  }

  return earned.filter(function(v,i,a){return a.indexOf(v)===i;}); // dedupe
}

function renderBadges(uid,size){
  var earned=computeBadges(uid); if(!earned.length)return'';
  size=size||22;
  return earned.map(function(key){
    var b=BADGES[key]; if(!b)return'';
    var glow=RARITY_GLOW[b.rarity]||'rgba(255,255,255,0.2)';
    var legendary=b.rarity==='legendary', epic=b.rarity==='epic';
    var shadow=legendary?'box-shadow:0 0 8px '+glow+',0 0 18px '+glow+';':epic?'box-shadow:0 0 6px '+glow+';':'';
    var border=legendary?'2px':'1.5px';
    return'<span title="'+b.label+(b.rarity?' ('+b.rarity.charAt(0).toUpperCase()+b.rarity.slice(1)+')':'')+': '+b.desc+'" '
      +'style="display:inline-flex;align-items:center;justify-content:center;'
      +'width:'+size+'px;height:'+size+'px;border-radius:50%;'
      +'background:'+b.color+'1a;border:'+border+' solid '+b.color+';'
      +'font-size:'+(size*.55)+'px;cursor:default;flex-shrink:0;transition:transform .15s;'+shadow+'"'
      +' onmouseover="this.style.transform='scale(1.25)'"'
      +' onmouseout="this.style.transform='scale(1)'">'+b.icon+'</span>';
  }).join('');
}

function renderBadgeList(uid){
  var earned=computeBadges(uid);
  var allKeys=Object.keys(BADGES);
  var locked=allKeys.filter(function(k){return earned.indexOf(k)===-1;});
  var rarityColor={legendary:'#FFE600',epic:'#a855f7',rare:'#00D4FF',common:'#888'};
  var html='';

  if(earned.length){
    html+='<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:#00FF85;letter-spacing:1.5px;margin-bottom:.6rem">EARNED ('+earned.length+')</div>';
    html+=earned.map(function(key){
      var b=BADGES[key];if(!b)return'';
      var glow=RARITY_GLOW[b.rarity]||'transparent';
      var rc=rarityColor[b.rarity]||'#888';
      return'<div style="display:flex;align-items:center;gap:.65rem;padding:.7rem .85rem;'
        +'background:'+b.color+'0d;border:1.5px solid '+b.color+'33;border-radius:13px;margin-bottom:.45rem;'
        +'box-shadow:0 2px 14px '+glow.replace('0.6','0.12').replace('0.5','0.1')+(b.rarity==='legendary'?',0 0 22px '+glow.replace('0.6','0.2'):'')+';">'
        +'<div style="width:40px;height:40px;border-radius:50%;background:'+b.color+'18;border:2px solid '+b.color+';'
        +'display:flex;align-items:center;justify-content:center;font-size:1.35rem;flex-shrink:0">'+b.icon+'</div>'
        +'<div style="flex:1;min-width:0">'
        +'<div style="font-weight:700;font-size:.86rem;color:'+b.color+'">'+b.label+'</div>'
        +'<div style="font-size:.64rem;color:#bbb;margin-top:2px">'+b.desc+'</div>'
        +'</div>'
        +'<span style="font-size:.5rem;font-weight:700;padding:2px 7px;border-radius:9px;'
        +'background:'+rc+'18;color:'+rc+';border:1px solid '+rc+'33;white-space:nowrap;flex-shrink:0">'
        +(b.rarity||'common').toUpperCase()+'</span>'
        +'</div>';
    }).join('');
  }

  if(locked.length){
    html+='<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--dim);letter-spacing:1.5px;margin:.8rem 0 .5rem">LOCKED ('+locked.length+')</div>';
    html+=locked.map(function(key){
      var b=BADGES[key];if(!b)return'';
      return'<div style="display:flex;align-items:center;gap:.65rem;padding:.65rem .85rem;'
        +'background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.06);border-radius:13px;margin-bottom:.35rem;opacity:0.4">'
        +'<div style="width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.05);'
        +'display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;filter:grayscale(1)">'+b.icon+'</div>'
        +'<div style="flex:1;min-width:0">'
        +'<div style="font-size:.84rem;font-weight:700;color:var(--dim)">'+b.label+'</div>'
        +'<div style="font-size:.62rem;color:var(--dim);margin-top:2px">'+b.desc+'</div>'
        +'</div>'
        +'<span style="font-size:.56rem;color:var(--dim);flex-shrink:0">🔒 Locked</span>'
        +'</div>';
    }).join('');
  }

  if(!earned.length&&!locked.length) return'<div style="color:var(--dim);font-size:.75rem">No badges defined.</div>';
  return html||'<div style="color:var(--dim);font-size:.75rem;text-align:center;padding:1rem">No badges yet — keep playing and predicting!</div>';
}

// ============================================================
// BROADCAST MESSAGE
// ============================================================
function sendBroadcast(){
  if(!me||me.email!==ADMIN_EMAIL){toast('Admin only','error');return;}
  var msg=$('broadcast-msg')?$('broadcast-msg').value.trim():'';
  var type=$('broadcast-type')?$('broadcast-type').value:'info';
  if(!msg){toast('Enter a message','error');return;}
  var btn=$('broadcast-btn');btn.textContent='Sending...';btn.disabled=true;
  db.ref('ef_broadcast').push({msg:msg,type:type,sentBy:myProfile.username,ts:Date.now(),active:true})
    .then(function(){btn.textContent='Send to All';btn.disabled=false;$('broadcast-msg').value='';closeMo('broadcast-mo');toast('Broadcast sent!');})
    .catch(function(){btn.textContent='Send to All';btn.disabled=false;toast('Failed','error');});
}

function listenBroadcast(){
  if(!db)return;
  db.ref('ef_broadcast').limitToLast(1).on('value',function(s){
    var msgs=Object.values(s.val()||{});if(!msgs.length)return;
    var latest=msgs[msgs.length-1];if(!latest.active)return;
    var dismissed=localStorage.getItem('dismissed_broadcast_'+latest.ts);
    if(dismissed)return;
    if(Date.now()-latest.ts>86400000)return;
    showBroadcastBanner(latest);
  });
}

function showBroadcastBanner(b){
  var colors={info:{bg:'rgba(0,212,255,0.1)',border:'#00d4ff',icon:'📢'},warning:{bg:'rgba(255,107,0,0.1)',border:'#ff6b00',icon:'⚠️'},celebration:{bg:'rgba(255,230,0,0.1)',border:'#ffe600',icon:'🎉'}};
  var c=colors[b.type]||colors.info;
  var banner=document.createElement('div');banner.id='broadcast-banner';
  banner.style.cssText='position:fixed;top:58px;left:0;right:0;z-index:8000;background:'+c.bg+';border-bottom:2px solid '+c.border+';padding:.7rem 1rem;display:flex;align-items:center;gap:.75rem;animation:fadein .3s ease';
  banner.innerHTML='<span style="font-size:1.2rem;flex-shrink:0">'+c.icon+'</span>'
    +'<div style="flex:1;font-size:.8rem;color:#fff">'+esc(b.msg)+'<span style="font-size:.6rem;color:var(--dim);margin-left:.5rem">— '+esc(b.sentBy)+'</span></div>'
    +'<button onclick="dismissBroadcast(\''+b.ts+'\')" style="background:none;border:none;color:var(--dim);font-size:1.1rem;cursor:pointer;flex-shrink:0">✕</button>';
  var old=$('broadcast-banner');if(old)old.remove();
  document.body.appendChild(banner);
}

function dismissBroadcast(ts){localStorage.setItem('dismissed_broadcast_'+ts,'1');var b=$('broadcast-banner');if(b)b.remove();}

// ============================================================
// CLOUDINARY IMAGE UPLOAD & COMPRESS
// ============================================================
function compressImage(file,maxW,quality,cb){
  var img=new Image(),reader=new FileReader();
  reader.onload=function(e){
    img.onload=function(){
      var w=img.width,h=img.height;
      if(w>maxW){h=Math.round(h*maxW/w);w=maxW;}
      var canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      canvas.getContext('2d').drawImage(img,0,0,w,h);
      canvas.toBlob(cb,'image/jpeg',quality);
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}

function uploadToCloudinary(file,folder,publicId,onSuccess,onFail){
  compressImage(file,1200,0.82,function(blob){
    var fd=new FormData();
    fd.append('file',blob);
    fd.append('upload_preset',CLOUDINARY_PRESET);
    fd.append('folder',folder);
    if(publicId)fd.append('public_id',publicId);
    fetch('https://api.cloudinary.com/v1_1/'+CLOUDINARY_CLOUD+'/image/upload',{method:'POST',body:fd})
      .then(function(r){return r.json();})
      .then(function(data){
        if(data.error){onFail&&onFail(data.error.message);}
        else{onSuccess&&onSuccess(data.secure_url);}
      }).catch(function(e){onFail&&onFail(e.message);});
  });
}

// ============================================================
// HEAD TO HEAD
// ============================================================
function renderH2H(uid1,uid2){
  var p1=allPlayers[uid1],p2=allPlayers[uid2];if(!p1||!p2)return'';
  var meetings=Object.values(allMatches).filter(function(m){
    return m.played&&!m.pendingResult&&((m.homeId===uid1&&m.awayId===uid2)||(m.homeId===uid2&&m.awayId===uid1));
  }).sort(function(a,b){return(b.playedAt||0)-(a.playedAt||0);});
  if(!meetings.length)return'<div style="color:var(--dim);font-size:.76rem;text-align:center;padding:.8rem">No meetings yet</div>';
  var w1=0,w2=0,draws=0,gf1=0,gf2=0;
  meetings.forEach(function(m){var isH=m.homeId===uid1,g1=isH?m.hg:m.ag,g2=isH?m.ag:m.hg;gf1+=g1;gf2+=g2;if(g1>g2)w1++;else if(g1<g2)w2++;else draws++;});
  var html='<div style="background:var(--card2);border-radius:12px;padding:.9rem;margin-bottom:.7rem">'
    +'<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--dim);letter-spacing:2px;text-align:center;margin-bottom:.75rem">HEAD TO HEAD</div>'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-bottom:.75rem">'
    +'<div style="text-align:center;flex:1"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1.6rem;color:#00ff88">'+w1+'</div><div style="font-size:.6rem;color:var(--dim)">'+esc(p1.username)+' Wins</div></div>'
    +'<div style="text-align:center;flex:1"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1.6rem;color:#ffe600">'+draws+'</div><div style="font-size:.6rem;color:var(--dim)">Draws</div></div>'
    +'<div style="text-align:center;flex:1"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1.6rem;color:#FF2882">'+w2+'</div><div style="font-size:.6rem;color:var(--dim)">'+esc(p2.username)+' Wins</div></div>'
    +'</div>'
    +'<div style="display:flex;height:6px;border-radius:4px;overflow:hidden;margin-bottom:.6rem">'
    +(w1+draws+w2>0?'<div style="flex:'+w1+';background:#00ff88"></div><div style="flex:'+draws+';background:#ffe600"></div><div style="flex:'+w2+';background:#FF2882"></div>':'<div style="flex:1;background:rgba(255,255,255,0.06)"></div>')
    +'</div>'
    +'<div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--dim)">'
    +'<span>'+esc(p1.username)+': '+gf1+' goals</span><span>'+gf2+' goals: '+esc(p2.username)+'</span>'
    +'</div></div>'
    +'<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--dim);letter-spacing:1.5px;margin-bottom:.45rem">LAST MEETINGS</div>';
  meetings.slice(0,5).forEach(function(m){
    var isH=m.homeId===uid1,g1=isH?m.hg:m.ag,g2=isH?m.ag:m.hg;
    var r=g1>g2?'W':g1<g2?'L':'D',rc=r==='W'?'#00ff88':r==='L'?'#FF2882':'#ffe600';
    html+='<div style="display:flex;align-items:center;gap:.55rem;padding:.4rem .55rem;background:#0a0a0a;border-radius:8px;margin-bottom:3px">'
      +'<span style="font-size:.65rem;font-weight:700;color:'+rc+';width:14px">'+r+'</span>'
      +'<span style="font-size:.73rem;font-family:Orbitron,sans-serif;font-weight:900;color:#fff;letter-spacing:2px">'+g1+' – '+g2+'</span>'
      +'<span style="font-size:.6rem;color:var(--dim);flex:1;text-align:right">'+fmtDate(m.playedAt)+'</span></div>';
  });
  return html;
}

// ============================================================
// FORM CHART
// ============================================================
function renderFormChart(uid){
  var ms=Object.values(allMatches).filter(function(m){
    return m.played&&!m.pendingResult&&(m.homeId===uid||m.awayId===uid);
  }).sort(function(a,b){return(a.playedAt||0)-(b.playedAt||0);}).slice(-10);
  if(!ms.length)return'<div style="color:var(--dim);font-size:.72rem">No matches yet</div>';
  var results=ms.map(function(m){
    var isH=m.homeId===uid,g1=isH?m.hg:m.ag,g2=isH?m.ag:m.hg;
    return{r:g1>g2?'W':g1===g2?'D':'L',g1:g1,g2:g2,ts:m.playedAt};
  });
  var bars=results.map(function(r){
    var c=r.r==='W'?'#00ff88':r.r==='D'?'#ffe600':'#FF2882';
    var h=r.r==='W'?100:r.r==='D'?50:20;
    return'<div title="'+r.r+' '+r.g1+'-'+r.g2+' on '+fmtDate(r.ts)+'" style="display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:50px;flex:1;gap:2px">'
      +'<div style="width:100%;max-width:18px;height:'+h+'%;background:'+c+';border-radius:3px 3px 0 0;transition:height .3s ease"></div>'
      +'<div style="font-size:.52rem;color:'+c+';font-weight:700">'+r.r+'</div></div>';
  }).join('');
  var empty=10-results.length;
  for(var i=0;i<empty;i++) bars='<div style="flex:1;height:50px;display:flex;align-items:flex-end;justify-content:center"><div style="width:100%;max-width:18px;height:15%;background:rgba(255,255,255,0.06);border-radius:3px 3px 0 0"></div></div>'+bars;
  return'<div><div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--dim);letter-spacing:1.5px;margin-bottom:.5rem">LAST 10 RESULTS</div>'
    +'<div style="display:flex;gap:2px;align-items:flex-end;height:60px;border-bottom:1px solid rgba(255,255,255,0.06);padding:0 2px">'+bars+'</div>'
    +'<div style="display:flex;justify-content:space-between;font-size:.55rem;color:var(--dim);margin-top:2px"><span>Oldest</span><span>Latest</span></div></div>';
}

// ============================================================
// LEADERBOARD
// ============================================================
function renderLeaderboard(){
  var el=$('page-leaderboard');if(!el)return;
  var ps=Object.values(allPlayers);
  if(!ps.length){el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--dim)">No players yet.</div>';return;}
  function getStats(uid){
    var ms=Object.values(allMatches).filter(function(m){return m.played&&!m.pendingResult&&(m.homeId===uid||m.awayId===uid);}).sort(function(a,b){return(a.playedAt||0)-(b.playedAt||0);});
    var w=0,d=0,l=0,gf=0,ga=0,curStreak=0,maxStreak=0;
    ms.forEach(function(m){var isH=m.homeId===uid,g1=isH?m.hg:m.ag,g2=isH?m.ag:m.hg;gf+=g1;ga+=g2;if(g1>g2){w++;curStreak++;maxStreak=Math.max(maxStreak,curStreak);}else{if(g1<g2)l++;else d++;curStreak=0;}});
    var pen=allPenalties[uid]?Object.values(allPenalties[uid]).reduce(function(s,x){return s+(x.pts||0);},0):0;
    return{w:w,d:d,l:l,gf:gf,ga:ga,gd:gf-ga,pts:Math.max(0,w*3+d-pen),streak:maxStreak,played:ms.length};
  }
  var stats=ps.map(function(p){return{p:p,s:getStats(p.uid)};});
  function makeTable(title,color,sorted,valueKey,valueSuffix){
    return'<div style="margin-bottom:1.2rem">'
      +'<div style="font-family:Orbitron,sans-serif;font-size:.65rem;color:'+color+';letter-spacing:2px;margin-bottom:.55rem">'+title+'</div>'
      +sorted.slice(0,5).map(function(x,i){
        return'<div style="display:flex;align-items:center;gap:.6rem;padding:.55rem .8rem;background:'+(i===0?color+'11':'var(--card)')+';border-radius:9px;margin-bottom:3px;border:1px solid '+(i===0?color+'33':'var(--border)')+'\">'
          +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.8rem;color:'+(i===0?color:'var(--dim)')+';min-width:20px">#'+(i+1)+'</div>'
          +clubBadge(x.p.club,x.p.league,24)
          +'<div style="flex:1"><div style="font-weight:700;font-size:.8rem">'+esc(x.p.username)+'</div><div style="font-size:.6rem;color:var(--dim)">'+esc(x.p.club)+'</div></div>'
          +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.9rem;color:'+color+'">'+x.s[valueKey]+esc(valueSuffix||'')+'</div></div>';
      }).join('')+'</div>';
  }
  var byPts=stats.filter(function(x){return x.s.played>0;}).sort(function(a,b){return b.s.pts-a.s.pts;});
  var byWins=stats.filter(function(x){return x.s.played>0;}).sort(function(a,b){return b.s.w-a.s.w;});
  var byStreak=stats.filter(function(x){return x.s.played>0;}).sort(function(a,b){return b.s.streak-a.s.streak;});
  var byGD=stats.filter(function(x){return x.s.played>0;}).sort(function(a,b){return b.s.gd-a.s.gd;});
  el.innerHTML='<div class="sh"><div class="st" style="color:#ffe600">🏅 Leaderboard</div><div class="sl" style="background:linear-gradient(90deg,#ffe600,transparent)"></div></div>'
    +makeTable('⭐ MOST POINTS','#ffe600',byPts,'pts',' pts')
    +makeTable('🏆 MOST WINS','#00ff88',byWins,'w',' wins')
    +makeTable('🔥 LONGEST STREAK','#ff6b00',byStreak,'streak',' in a row')
    +makeTable('⚽ BEST GOAL DIFF','#00d4ff',byGD,'gd','');
}

// ============================================================
// SEASON SYSTEM
// ============================================================
function renderSeasonBanner(){
  var el=$('season-banner');if(!el)return;
  if(!db)return;
  db.ref('ef_season').once('value',function(s){
    var season=s.val();
    if(!season||!season.active){el.style.display='none';return;}
    var diff=season.endDate-Date.now();
    if(diff<0){el.innerHTML='<div style="text-align:center;padding:.5rem;font-size:.75rem;color:#ffe600">⏰ Season ended! Admin will post final standings.</div>';el.style.display='block';return;}
    var days=Math.floor(diff/86400000),hrs=Math.floor((diff%86400000)/3600000);
    el.innerHTML='<div style="display:flex;align-items:center;justify-content:center;gap:.75rem;padding:.45rem 1rem;font-size:.72rem">'
      +'<span style="color:var(--dim)">Season '+esc(season.name||'1')+'</span>'
      +'<span style="color:#ffe600;font-weight:700">⏳ '+days+'d '+hrs+'h remaining</span>'
      +'<span style="color:var(--dim)">'+fmtDate(season.endDate)+'</span></div>';
    el.style.display='block';
  });
}
function adminSeasonControls(){
  if(!me||me.email!==ADMIN_EMAIL)return'';
  return'<div style="margin-bottom:1.2rem"><div style="font-family:Orbitron,sans-serif;font-size:.65rem;color:#ffe600;letter-spacing:1.5px;margin-bottom:.8rem">SEASON CONTROLS</div>'
    +'<div class="row" style="margin-bottom:.55rem">'
    +'<div style="flex:1;min-width:120px"><label class="lbl">Season Name</label><input class="inp" id="season-name" placeholder="2024/25"></div>'
    +'<div style="flex:1;min-width:140px"><label class="lbl">End Date</label><input class="inp" id="season-end" type="date"></div>'
    +'<button class="bp" style="font-size:.74rem;padding:5px 12px" onclick="startSeason()">Start Season</button></div></div>';
}
function startSeason(){
  if(!me||me.email!==ADMIN_EMAIL)return;
  var name=$('season-name').value.trim(),endDate=$('season-end').value;
  if(!name||!endDate){toast('Fill in season name and end date','error');return;}
  db.ref('ef_season').set({name:name,startDate:Date.now(),endDate:new Date(endDate).getTime(),active:true})
    .then(function(){toast('Season '+name+' started!');renderSeasonBanner();});
}
function endSeason(){
  if(!me||me.email!==ADMIN_EMAIL)return;
  if(!confirm('End the current season? Standings will be archived.'))return;
  var archive={};
  ['epl','laliga','seriea','ligue1'].forEach(function(lid){
    archive[lid]=computeStd(lid).map(function(r,i){return{rank:i+1,uid:r.uid,name:r.name,club:r.club,pts:r.pts,w:r.w,d:r.d,l:r.l};});
  });
  db.ref('ef_season/active').set(false);
  db.ref('ef_season_archives/'+Date.now()).set({standings:archive,archivedAt:Date.now()});
  toast('Season ended and archived!');
}
function seasonReset(){
  if(!me||me.email!==ADMIN_EMAIL){toast('Admin only','error');return;}
  if(!confirm('RESET ALL MATCH DATA?\n\nPlayer accounts stay. Match results cleared.'))return;
  if(!confirm('Last chance — are you 100% sure?'))return;
  db.ref('ef_matches').remove().then(function(){
    db.ref('ef_penalties').remove();
    db.ref('ef_season/active').set(false);
    toast('Season reset! All matches cleared.');
  }).catch(function(){toast('Failed','error');});
}

// ============================================================
// DISPUTE
// ============================================================
function flagDispute(matchId){
  if(!myProfile){toast('Login first','error');return;}
  var m=allMatches[matchId];if(!m)return;
  var reason=prompt('Describe the dispute:');
  if(!reason||!reason.trim())return;
  db.ref('ef_matches/'+matchId+'/dispute').set({flaggedBy:myProfile.uid,flaggedName:myProfile.username,reason:reason.trim(),ts:Date.now(),status:'pending'})
    .then(function(){toast('⚠️ Dispute flagged. Admin will review.');
      db.ref('ef_reports').push({type:'dispute',matchId:matchId,reportedUID:m.homeId===myProfile.uid?m.awayId:m.homeId,reportedName:allPlayers[m.homeId===myProfile.uid?m.awayId:m.homeId]?allPlayers[m.homeId===myProfile.uid?m.awayId:m.homeId].username:'Unknown',reporterUID:myProfile.uid,reporterName:myProfile.username,reason:'Match dispute: '+reason.trim(),details:'Match ID: '+matchId+' | Score: '+m.hg+'-'+m.ag,ts:Date.now(),status:'pending'});
    }).catch(function(){toast('Failed','error');});
}

// ============================================================
// PROFILE BIO & COVER
// ============================================================
function saveBio(){
  if(!myProfile)return;
  var bio=$('bio-inp')?$('bio-inp').value.trim():'';
  if(bio.length>100){toast('Bio max 100 chars','error');return;}
  db.ref('ef_players/'+me.uid+'/bio').set(bio)
    .then(function(){toast('Bio saved!');closeMo('edit-bio-mo');})
    .catch(function(){toast('Failed','error');});
}
function uploadCover(inputEl){
  var file=inputEl.files[0];if(!file)return;
  if(!file.type.startsWith('image/')){toast('Select an image','error');return;}
  var btn=$('cover-save-btn');if(btn){btn.textContent='Uploading...';btn.disabled=true;}
  uploadToCloudinary(file,'efootball_covers','cover_'+me.uid+'_'+Date.now(),
    function(url){
      db.ref('ef_players/'+me.uid+'/coverPhoto').set(url)
        .then(function(){toast('Cover updated!');if(btn){btn.textContent='Save Bio';btn.disabled=false;}closeMo('edit-bio-mo');});
    },
    function(err){toast('Upload failed','error');if(btn){btn.textContent='Save Bio';btn.disabled=false;}}
  );
}

// ============================================================
// ADMIN RESTRICTIONS — ban from specific features
// ============================================================
var RESTRICTION_TYPES={
  no_submit:  {label:'Cannot submit results', icon:'🚫', color:'#FF2882'},
  no_chat:    {label:'Cannot use chat',        icon:'💬', color:'#ff6b00'},
  no_referee: {label:'Cannot be referee',      icon:'🟢', color:'#ff4466'},
  no_ucl:     {label:'Cannot join UCL',        icon:'🏆', color:'#ffe600'},
};

function isRestricted(uid,type){
  var p=allPlayers[uid];if(!p||!p.restrictions)return false;
  var r=p.restrictions[type];if(!r)return false;
  if(r.until&&Date.now()>r.until){
    // Expired — clean up
    db.ref('ef_players/'+uid+'/restrictions/'+type).remove();
    return false;
  }
  return true;
}

function applyRestriction(uid,type,days){
  if(!me||me.email!==ADMIN_EMAIL){toast('Admin only','error');return;}
  var until=days?Date.now()+(days*86400000):null;
  db.ref('ef_players/'+uid+'/restrictions/'+type).set({appliedAt:Date.now(),until:until,days:days||0})
    .then(function(){toast('Restriction applied: '+RESTRICTION_TYPES[type].label);})
    .catch(function(){toast('Failed','error');});
}

function removeRestriction(uid,type){
  db.ref('ef_players/'+uid+'/restrictions/'+type).remove()
    .then(function(){toast('Restriction removed.');});
}

function openRestrictModal(uid,name){
  if(!me||me.email!==ADMIN_EMAIL)return;
  var p=allPlayers[uid];
  var html='<div style="margin-bottom:.7rem"><div style="font-weight:700;color:#ff4466;font-size:.9rem;margin-bottom:.4rem">'+esc(name)+'</div>'
    +'<div style="font-size:.7rem;color:var(--dim)">Restrict this player from specific features</div></div>';
  Object.entries(RESTRICTION_TYPES).forEach(function(kv){
    var type=kv[0],info=kv[1];
    var active=isRestricted(uid,type);
    html+='<div style="display:flex;align-items:center;gap:.65rem;padding:.65rem .8rem;background:var(--card);border-radius:10px;margin-bottom:.4rem;border:1px solid '+(active?info.color+'44':'var(--border)')+'">'
      +'<span>'+info.icon+'</span>'
      +'<div style="flex:1"><div style="font-size:.8rem;font-weight:700;color:'+(active?info.color:'#ccc')+'">'+info.label+'</div>'
      +(active?'<div style="font-size:.62rem;color:#FF2882">Currently restricted</div>':'')
      +'</div>'
      +(active
        ?'<button class="bg" style="font-size:.65rem;padding:3px 9px" onclick="removeRestriction(\''+uid+'\',\''+type+'\')">Remove</button>'
        :'<button class="bd" style="font-size:.65rem;padding:3px 9px" onclick="applyRestriction(\''+uid+'\',\''+type+'\',7)">7 days</button>'
         +'<button class="bd" style="font-size:.65rem;padding:3px 9px;margin-left:3px" onclick="applyRestriction(\''+uid+'\',\''+type+'\',30)">30 days</button>')
      +'</div>';
  });
  var el=$('restrict-modal-content');if(el)el.innerHTML=html;
  openMo('restrict-mo');
}

// Init
document.addEventListener('DOMContentLoaded',function(){
  var checkDB=setInterval(function(){
    if(db){clearInterval(checkDB);listenBroadcast();}
  },500);
});
