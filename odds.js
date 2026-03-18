// ============================================================
// ODDS.JS — Match Odds Engine + Free Score Predictions
// No real money. Users predict scores for fun and earn
// Prediction Points (PP) on the leaderboard.
// ============================================================

// ── ODDS CALCULATION ────────────────────────────────────────
// Factors used:
//  1. League position (rank difference)
//  2. Recent form (last 5 results)
//  3. Goals scored (attacking strength)
//  4. Goals conceded (defensive weakness)
//  5. Head-to-head record
//  6. Home vs away advantage (slight)
//  7. Point deductions (form disruption)

function calcMatchOdds(homeId, awayId, lid) {
  var table = computeStd(lid);
  var played = Object.values(allMatches).filter(function(m){ return m.league===lid&&m.played; });

  function getStats(uid) {
    var pos = table.findIndex(function(r){ return r.uid===uid; });
    var row = table[pos] || {w:0,d:0,l:0,p:0,gf:0,ga:0,form:[],pts:0,penPts:0};
    var ms = played.filter(function(m){ return m.homeId===uid||m.awayId===uid; });
    // Goal averages
    var gfAvg = row.p > 0 ? row.gf / row.p : 1;
    var gaAvg = row.p > 0 ? row.ga / row.p : 1;
    // Form score (last 5): W=3, D=1, L=0
    var last5 = row.form.slice(-5);
    var formScore = last5.reduce(function(s,f){ return s+(f==='w'?3:f==='d'?1:0); }, 0);
    var formMax = last5.length * 3 || 1;
    var formPct = formScore / formMax; // 0–1
    // Win rate
    var winRate = row.p > 0 ? row.w / row.p : 0.33;
    return { pos: pos+1, pts: row.pts, gfAvg: gfAvg, gaAvg: gaAvg, formPct: formPct, winRate: winRate, p: row.p, penPts: row.penPts||0 };
  }

  var H = getStats(homeId);
  var A = getStats(awayId);

  // Head-to-head
  var h2h = played.filter(function(m){ return (m.homeId===homeId&&m.awayId===awayId)||(m.homeId===awayId&&m.awayId===homeId); });
  var h2hHome = 0, h2hAway = 0;
  h2h.forEach(function(m){
    if(m.homeId===homeId){ if(m.hg>m.ag)h2hHome+=2; else if(m.hg===m.ag){h2hHome++;h2hAway++;} else h2hAway+=2; }
    else { if(m.ag>m.hg)h2hHome+=2; else if(m.hg===m.ag){h2hHome++;h2hAway++;} else h2hAway+=2; }
  });
  var h2hTotal = h2hHome + h2hAway || 1;
  var h2hHomePct = h2hHome / h2hTotal;

  // Build raw strength scores
  var homePosScore   = A.pos > 0 && H.pos > 0 ? Math.max(0, (A.pos - H.pos) / Math.max(A.pos, H.pos)) : 0;
  var awayPosScore   = A.pos > 0 && H.pos > 0 ? Math.max(0, (H.pos - A.pos) / Math.max(A.pos, H.pos)) : 0;

  var homeStrength = (
    H.formPct * 3.5 +
    H.winRate * 2.5 +
    H.gfAvg  * 1.2 +
    (1 / (H.gaAvg + 0.5)) * 1.2 +
    homePosScore * 1.5 +
    h2hHomePct * 1.0 +
    0.15 +  // small home advantage
    (H.penPts > 0 ? -0.5 : 0)  // penalised teams slightly weaker
  );

  var awayStrength = (
    A.formPct * 3.5 +
    A.winRate * 2.5 +
    A.gfAvg  * 1.2 +
    (1 / (A.gaAvg + 0.5)) * 1.2 +
    awayPosScore * 1.5 +
    (1 - h2hHomePct) * 1.0 +
    (A.penPts > 0 ? -0.5 : 0)
  );

  // If no data yet, use balanced defaults
  if(H.p === 0 && A.p === 0){ homeStrength = 1.15; awayStrength = 1.0; }

  var total = homeStrength + awayStrength;
  var drawFactor = 0.28; // draws happen ~28% of the time in football

  // Raw probabilities
  var pHome = (homeStrength / total) * (1 - drawFactor);
  var pAway = (awayStrength / total) * (1 - drawFactor);
  var pDraw = drawFactor;

  // Normalize to 1
  var pSum = pHome + pDraw + pAway;
  pHome /= pSum; pDraw /= pSum; pAway /= pSum;

  // Convert to decimal odds (add bookmaker margin ~12%)
  var margin = 1.12;
  var oddHome = Math.round(margin / pHome * 100) / 100;
  var oddDraw = Math.round(margin / pDraw * 100) / 100;
  var oddAway = Math.round(margin / pAway * 100) / 100;

  // Clamp to realistic range
  oddHome = Math.max(1.15, Math.min(9.0, oddHome));
  oddDraw = Math.max(2.4,  Math.min(5.5, oddDraw));
  oddAway = Math.max(1.15, Math.min(9.0, oddAway));

  return {
    home:  oddHome.toFixed(2),
    draw:  oddDraw.toFixed(2),
    away:  oddAway.toFixed(2),
    pHome: (pHome*100).toFixed(0),
    pDraw: (pDraw*100).toFixed(0),
    pAway: (pAway*100).toFixed(0),
    // Favourite label
    fav: pHome > pAway ? 'home' : pAway > pHome ? 'away' : 'draw'
  };
}

// ── ODDS BADGE HTML ─────────────────────────────────────────
function oddsHtml(homeId, awayId, lid) {
  var odds = calcMatchOdds(homeId, awayId, lid);
  var hp = allPlayers[homeId], ap = allPlayers[awayId];
  if(!hp||!ap) return '';
  var favStyle = 'background:rgba(0,212,255,0.18);border-color:#00D4FF;color:#00D4FF;font-weight:900';
  var normStyle = 'background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.12);color:#ccc';
  return '<div style="display:flex;gap:.35rem;align-items:center;margin-top:.5rem;flex-wrap:wrap">'
    + '<span style="font-size:.56rem;color:var(--dim);font-weight:700;letter-spacing:.5px;text-transform:uppercase;flex-shrink:0">Odds</span>'
    + '<div style="display:flex;gap:.3rem;flex:1;min-width:0">'
    + '<div style="flex:1;text-align:center;border:1.5px solid;border-radius:8px;padding:4px 5px;transition:all .18s;cursor:pointer;'+(odds.fav==='home'?favStyle:normStyle)+'" onclick="openPredictModal(\''+homeId+'\',\''+awayId+'\',\''+lid+'\')">'
    + '<div style="font-size:.56rem;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(hp.username.slice(0,8))+'</div>'
    + '<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.82rem">'+odds.home+'</div>'
    + '</div>'
    + '<div style="flex:.8;text-align:center;border:1.5px solid;border-radius:8px;padding:4px 5px;transition:all .18s;cursor:pointer;'+(odds.fav==='draw'?favStyle:normStyle)+'" onclick="openPredictModal(\''+homeId+'\',\''+awayId+'\',\''+lid+'\')">'
    + '<div style="font-size:.56rem;color:var(--dim)">Draw</div>'
    + '<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.82rem">'+odds.draw+'</div>'
    + '</div>'
    + '<div style="flex:1;text-align:center;border:1.5px solid;border-radius:8px;padding:4px 5px;transition:all .18s;cursor:pointer;'+(odds.fav==='away'?favStyle:normStyle)+'" onclick="openPredictModal(\''+homeId+'\',\''+awayId+'\',\''+lid+'\')">'
    + '<div style="font-size:.56rem;color:var(--dim);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(ap.username.slice(0,8))+'</div>'
    + '<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.82rem">'+odds.away+'</div>'
    + '</div>'
    + '</div>'
    + '<button onclick="openPredictModal(\''+homeId+'\',\''+awayId+'\',\''+lid+'\')" style="background:rgba(255,230,0,0.1);border:1px solid rgba(255,230,0,0.28);color:#FFE600;font-size:.62rem;font-weight:700;padding:4px 9px;border-radius:7px;cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all .18s">Predict</button>'
    + '</div>';
}

// ── PREDICTION MODAL ─────────────────────────────────────────
var _predictTarget = {};

// Accepts 3 or 4 args: (homeId, awayId, lid) or (homeId, awayId, lid, mid)
function openPredictModal(homeId, awayId, lid, mid) {
  if(!myProfile){ showLanding(); return; }
  var hp = allPlayers[homeId], ap = allPlayers[awayId];
  if(!hp||!ap) return;
  _predictTarget = { homeId:homeId, awayId:awayId, lid:lid };

  // Use provided mid or find it
  if (!mid) mid = findMatchId(homeId, awayId, lid);
  if(mid) {
    var existing = null;
    db.ref('ef_predictions/'+mid+'/'+myProfile.uid).once('value', function(s){
      existing = s.val();
      showPredictModal(hp, ap, lid, mid, existing);
    });
  } else {
    showPredictModal(hp, ap, lid, null, null);
  }
}

function findMatchId(homeId, awayId, lid) {
  var m = Object.values(allMatches).find(function(m){
    return m.league===lid&&!m.played&&((m.homeId===homeId&&m.awayId===awayId)||(m.homeId===awayId&&m.awayId===homeId));
  });
  return m ? m.id : null;
}

function showPredictModal(hp, ap, lid, mid, existing) {
  var odds = calcMatchOdds(_predictTarget.homeId, _predictTarget.awayId, lid);
  var lg = LGS[lid]||{};
  var mo = $('predict-mo');
  if(!mo) return;

  $('predict-home-name').textContent = hp.username;
  $('predict-away-name').textContent = ap.username;
  $('predict-home-badge').innerHTML = clubBadge(hp.club, lid, 36);
  $('predict-away-badge').innerHTML = clubBadge(ap.club, lid, 36);
  $('predict-league-badge').innerHTML = lgBadge(lid);

  // Odds display
  var favStyle = 'border:2px solid #00D4FF;background:rgba(0,212,255,0.1)';
  var normStyle = 'border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.03)';
  $('predict-odds-row').innerHTML =
    '<div style="flex:1;text-align:center;border-radius:10px;padding:.6rem;'+(odds.fav==='home'?favStyle:normStyle)+'">'
    +'<div style="font-size:.58rem;color:var(--dim)">'+esc(hp.username.slice(0,10))+' Win</div>'
    +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1.1rem;color:#00D4FF">'+odds.home+'</div>'
    +'<div style="font-size:.55rem;color:var(--dim)">'+odds.pHome+'% chance</div></div>'
    +'<div style="flex:.75;text-align:center;border-radius:10px;padding:.6rem;'+(odds.fav==='draw'?favStyle:normStyle)+'">'
    +'<div style="font-size:.58rem;color:var(--dim)">Draw</div>'
    +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1.1rem;color:#00D4FF">'+odds.draw+'</div>'
    +'<div style="font-size:.55rem;color:var(--dim)">'+odds.pDraw+'% chance</div></div>'
    +'<div style="flex:1;text-align:center;border-radius:10px;padding:.6rem;'+(odds.fav==='away'?favStyle:normStyle)+'">'
    +'<div style="font-size:.58rem;color:var(--dim)">'+esc(ap.username.slice(0,10))+' Win</div>'
    +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1.1rem;color:#00D4FF">'+odds.away+'</div>'
    +'<div style="font-size:.55rem;color:var(--dim)">'+odds.pAway+'% chance</div></div>';

  // Pre-fill if existing
  var hg = existing ? existing.hg : 0;
  var ag = existing ? existing.ag : 0;
  $('pred-hg').textContent = hg; $('pred-hg-val').value = hg;
  $('pred-ag').textContent = ag; $('pred-ag-val').value = ag;
  $('predict-err').textContent = '';

  if(existing) {
    $('predict-submit-btn').textContent = 'Update Prediction';
    $('predict-already').style.display = 'block';
    $('predict-already').textContent = 'You predicted '+existing.hg+'-'+existing.ag+' — you can update before the match.';
  } else {
    $('predict-submit-btn').textContent = 'Submit Prediction';
    $('predict-already').style.display = 'none';
  }
  $('predict-mid').value = mid||'';
  openMo('predict-mo');
}

function predStep(side, dir) {
  var disp=$(side==='h'?'pred-hg':'pred-ag'), val=$(side==='h'?'pred-hg-val':'pred-ag-val');
  var n = Math.max(0, Math.min(15, (parseInt(disp.textContent)||0)+dir));
  disp.textContent = n; val.value = n;
}

function submitPrediction() {
  if(!myProfile){ toast('Login first','error'); return; }
  var mid = $('predict-mid').value;
  var hg = parseInt($('pred-hg-val').value);
  var ag = parseInt($('pred-ag-val').value);
  var err = $('predict-err'); err.textContent='';
  if(!mid){ err.textContent='No match found for this fixture yet.'; return; }
  if(isNaN(hg)||isNaN(ag)){ err.textContent='Enter a score prediction.'; return; }

  var m = allMatches[mid];
  if(m&&m.played){ err.textContent='This match has already been played!'; return; }
  // Lock 30 mins before match time
  if(m&&m.matchTime&&Date.now()>m.matchTime-30*60*1000){
    err.textContent='Predictions locked 30 mins before kickoff.'; return;
  }

  var btn = $('predict-submit-btn'); btn.textContent='Saving...'; btn.disabled=true;
  db.ref('ef_predictions/'+mid+'/'+myProfile.uid).set({
    uid: myProfile.uid, username: myProfile.username, club: myProfile.club,
    hg: hg, ag: ag, ts: Date.now(),
    homeId: _predictTarget.homeId, awayId: _predictTarget.awayId, lid: _predictTarget.lid
  }).then(function(){
    btn.textContent='Submit Prediction'; btn.disabled=false;
    closeMo('predict-mo');
    toast('⚽ Prediction locked in — '+hg+'-'+ag+'!');
  }).catch(function(e){
    err.textContent='Failed: '+e.message; btn.textContent='Submit Prediction'; btn.disabled=false;
  });
}

// ── PREDICTION RESULTS (after match played) ──────────────────
function checkPredictions(mid){
  var m=allMatches[mid]; if(!m||!m.played) return;
  db.ref('ef_predictions/'+mid).once('value',function(s){
    var preds=s.val()||{};
    Object.entries(preds).forEach(function(kv){
      var uid=kv[0], pred=kv[1];
      var pts=scorePrediction(pred.hg,pred.ag,m.hg,m.ag);
      var isExact=(pred.hg===m.hg&&pred.ag===m.ag);
      // Save result on prediction record
      db.ref('ef_predictions/'+mid+'/'+uid).update({
        result: pts>0?(isExact?'exact':'correct'):'wrong', pts:pts
      });
      if(pts>0){
        // Award prediction points
        db.ref('ef_players/'+uid+'/predPts').transaction(function(v){return(v||0)+pts;});
        // Update badge-triggering predStats
        db.ref('ef_players/'+uid+'/predStats').transaction(function(cur){
          var c=cur||{total:0,correct:0,exact:0,streak:0,bestStreak:0};
          c.total=(c.total||0)+1;
          c.correct=(c.correct||0)+1;
          if(isExact){c.exact=(c.exact||0)+1;c.streak=(c.streak||0)+1;}
          else{c.streak=0;}
          c.bestStreak=Math.max(c.bestStreak||0,c.streak);
          return c;
        });
        // Notify user
        if(allPlayers[uid]&&myProfile){
          var key=dmKey(myProfile.uid,uid);
          db.ref('ef_dm/'+key).push({from:'system',fromName:'eFootball Universe',
            text:isExact?'🔮 EXACT SCORE! You predicted '+m.hg+'-'+m.ag+' perfectly! +3 Prediction Points!':'🎯 Correct result! You predicted the right outcome. +1 Prediction Point!',
            ts:Date.now(),system:true});
          db.ref('ef_dm_meta/'+key).update({lastMsg:'Prediction result!',lastTs:Date.now(),['participants/'+myProfile.uid]:true,['participants/'+uid]:true});
          db.ref('ef_dm_unread/'+uid+'/'+key).transaction(function(v){return(v||0)+1;});
        }
      } else {
        // Wrong — reset streak, count total
        db.ref('ef_players/'+uid+'/predStats/streak').set(0);
        db.ref('ef_players/'+uid+'/predStats/total').transaction(function(v){return(v||0)+1;});
      }
    });
  });
}

function scorePrediction(predHG, predAG, realHG, realAG) {
  // Exact score = 3 pts
  if(predHG===realHG && predAG===realAG) return 3;
  // Correct result (win/draw/loss) = 1 pt
  var predResult = predHG>predAG?'H':predHG<predAG?'A':'D';
  var realResult = realHG>realAG?'H':realHG<realAG?'A':'D';
  if(predResult===realResult) return 1;
  return 0;
}

// ── PREDICTION LEADERBOARD ────────────────────────────────────
function renderPredLeaderboard() {
  var el = $('pred-leaderboard'); if(!el) return;
  var players = Object.values(allPlayers)
    .filter(function(p){ return p.predPts > 0; })
    .sort(function(a,b){ return (b.predPts||0)-(a.predPts||0); })
    .slice(0,10);

  if(!players.length){
    el.innerHTML='<div style="color:var(--dim);text-align:center;padding:1rem;font-size:.78rem">No predictions yet. Be first to predict!</div>';
    return;
  }

  var medals = ['🥇','🥈','🥉'];
  el.innerHTML = players.map(function(p,i){
    return '<div style="display:flex;align-items:center;gap:.65rem;padding:.6rem .8rem;background:var(--card);border-radius:10px;margin-bottom:.4rem;border:1px solid '+(i===0?'rgba(255,230,0,0.3)':i===1?'rgba(200,200,200,0.2)':i===2?'rgba(205,127,50,0.2)':'var(--border)')+';transition:all .2s">'
      +'<div style="font-size:'+(i<3?'1.2rem':'.85rem')+';min-width:24px;text-align:center;font-family:Orbitron,sans-serif;font-weight:900;color:var(--dim)">'+(i<3?medals[i]:'#'+(i+1))+'</div>'
      +clubBadge(p.club,p.league,28)
      +'<div style="flex:1;min-width:0"><div style="font-weight:700;font-size:.82rem">'+esc(p.username)+'</div>'
      +'<div style="font-size:.6rem;color:var(--dim)">'+esc(p.club)+'</div></div>'
      +'<div style="text-align:right"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.9rem;color:#FFE600">'+p.predPts+'</div>'
      +'<div style="font-size:.54rem;color:var(--dim)">pred pts</div></div>'
      +'</div>';
  }).join('');
}

// ── MY PREDICTIONS ────────────────────────────────────────────
function renderMyPredictions() {
  var el = $('my-predictions'); if(!el||!myProfile) return;
  // Get all predictions for matches I've predicted
  var pending = Object.values(allMatches).filter(function(m){
    return !m.played && m.matchTime && m.matchTime > Date.now();
  });

  if(!pending.length){ el.innerHTML='<div style="color:var(--dim);font-size:.78rem;text-align:center;padding:1rem">No upcoming matches to predict yet.</div>'; return; }

  var html='';
  var checked=0;
  pending.forEach(function(m){
    db.ref('ef_predictions/'+m.id+'/'+myProfile.uid).once('value',function(s){
      checked++;
      var pred=s.val();
      var hp=allPlayers[m.homeId],ap=allPlayers[m.awayId];if(!hp||!ap)return;
      var odds=calcMatchOdds(m.homeId,m.awayId,m.league);
      html+='<div style="background:var(--card);border:1px solid '+(pred?'rgba(0,255,133,0.2)':'var(--border)')+';border-radius:12px;padding:.85rem;margin-bottom:.5rem">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.4rem;margin-bottom:.5rem">'
        +'<div style="display:flex;align-items:center;gap:.5rem">'
        +clubBadge(hp.club,m.league,22)+'<span style="font-size:.78rem;font-weight:700">'+esc(hp.username)+'</span>'
        +'<span style="font-size:.65rem;color:var(--dim)">vs</span>'
        +clubBadge(ap.club,m.league,22)+'<span style="font-size:.78rem;font-weight:700">'+esc(ap.username)+'</span>'
        +'</div>'
        +'<span style="font-size:.58rem;color:var(--dim)">'+fmtFull(m.matchTime)+'</span>'
        +'</div>'
        // Odds
        +oddsHtml(m.homeId,m.awayId,m.league)
        // My prediction
        +(pred
          ?'<div style="margin-top:.5rem;display:flex;align-items:center;gap:.5rem;background:rgba(0,255,133,0.07);border:1px solid rgba(0,255,133,0.2);border-radius:8px;padding:.45rem .7rem">'
            +'<span style="font-size:.7rem;color:#00FF85;font-weight:700">✓ Your prediction:</span>'
            +'<span style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.85rem;color:#fff">'+pred.hg+' – '+pred.ag+'</span>'
            +'<button onclick="openPredictModal(\''+m.homeId+'\',\''+m.awayId+'\',\''+m.league+'\')" style="margin-left:auto;font-size:.6rem;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.2);color:#00D4FF;border-radius:6px;padding:2px 7px;cursor:pointer">Edit</button>'
            +'</div>'
          :'<button onclick="openPredictModal(\''+m.homeId+'\',\''+m.awayId+'\',\''+m.league+'\')" class="bp" style="width:100%;padding:9px;font-size:.78rem;margin-top:.5rem">Predict this match</button>'
        )
        +'</div>';
      if(checked===pending.length) el.innerHTML=html||'<div style="color:var(--dim);font-size:.78rem;text-align:center;padding:1rem">No upcoming matches.</div>';
    });
  });
}// ── SCORE PREDICTIONS AFTER RESULT ─────────────────────────



