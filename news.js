// ============================================================
// NEWS.JS — Fabrizio Romano AI Anchor
// Stories show as headline cards. Tapping one opens a full
// article view — like a proper news app. Every situation has
// multiple phrase variations so nothing repeats.
// ============================================================
var NEWS_ANCHOR={name:'Fabrizio Romano',role:'eFootball Universe Correspondent',avatar:'https://pbs.twimg.com/profile_images/1592531920777842690/pGMu4FFC_400x400.jpg'};
var _newsCache=[],_newsGenerated=0,_newsInited=false,_openStory=null;

// ── SEED-BASED VARIATION PICKER ─────────────────────────────
// Same data always picks the same variation — but different
// data picks a different one. Prevents random flicker on re-render.
function pick(arr,seed){
  var h=0;for(var i=0;i<seed.length;i++)h=(h*31+seed.charCodeAt(i))%arr.length;
  return arr[Math.abs(h)%arr.length];
}

// ── STORY BUILDER ───────────────────────────────────────────
// Each story has: lid, type, importance, headline, subline, body[]
// subline = the one-liner under headline on the card
// body    = array of paragraphs shown in full article view
function makeStory(lid,type,importance,headline,subline,bodyParagraphs){
  return{lid:lid,type:type,importance:importance,headline:headline,subline:subline,body:bodyParagraphs};
}

// ── PHRASE BANKS ────────────────────────────────────────────
// Each function returns an array of [subline, body[]] arrays.
// We pick one based on seed.
var V={
  titleLevel:function(L,S,n,seed){return pick([
    [L.name+' and '+S.name+' are equal on points — title could go either way.',
     ['The '+n+' title race has arrived at its most dramatic point. '+L.name+' ('+L.club+') and '+S.name+' ('+S.club+') are level at the top — zero points separating them.',
      'Every match from here is a cup final. One slip from either side and the title conversation changes completely.',
      'Neither team will want to go into the final stretch of the season in this position — but both will fancy their chances. Here we go!']],
    ['Deadlock at the summit of '+n+'. Neither team will blink first.',
     ['Breathtaking scenes at the top of '+n+'. '+L.name+' and '+S.name+' have cancelled each other out — they are inseparable on points.',
      'The pressure on both managers is enormous. A single dropped point at this stage could prove catastrophic.',
      'Who wants it more? That question will be answered on the pitch. Here we go!']],
    [L.name+' and '+S.name+' locked together — the best title race in '+n+'.',
     ['You could not write this script. '+L.name+' ('+L.club+') and '+S.name+' ('+S.club+') share the top spot in '+n+' after an extraordinary sequence of results.',
      'Not a single point between them. The kind of title race that football was made for.',
      'Every fixture involving these two teams is now appointment viewing. Here we go!']],
  ],seed)},

  titleClose:function(L,S,gap,n,seed){return pick([
    [gap+' point'+(gap>1?'s':'')+' — '+L.name+' leads but cannot afford to drop points.',
     [L.name+' ('+L.club+') sits at the summit of '+n+' with a '+gap+'-point advantage over '+S.name+' ('+S.club+'). It looks comfortable. It is not.',
      'At this level in '+n+', '+gap+' point'+(gap>1?'s':'')+' is nothing. One bad result and the whole narrative changes.',
      'The pressure is on the leader. They know that every game matters. Here we go!']],
    ['Slim '+gap+'-point lead for '+L.name+' — '+S.name+' right on their heels.',
     ['The '+n+' title picture is becoming clearer — and it is tense. '+L.name+' holds the top spot, just '+gap+' point'+(gap>1?'s':'')+' ahead of '+S.name+'.',
      S.name+' ('+S.club+') is not going anywhere. They are watching, waiting for '+L.name+' to slip.',
      'When two teams are this close in quality and points, anything can happen. Here we go!']],
  ],seed)},

  titleRunaway:function(L,gap,n,seed){return pick([
    [L.name+' is the dominant force in '+n+' — '+gap+' points ahead.',
     [L.name+' ('+L.club+') is turning this '+n+' title race into a procession. A '+gap+'-point lead at the top speaks for itself.',
      'The consistency has been remarkable. Match after match, this team has delivered the result they needed.',
      'Unless something dramatic happens, this title looks like it is heading only one way. Here we go!']],
    [gap+' points clear — '+L.name+' could win '+n+' at a canter.',
     ['Dominant, relentless, and utterly convincing. '+L.name+' has built a '+gap+'-point lead at the top of '+n+'.',
      'The rest of the division are playing for second place right now — that is how far ahead this team is.',
      'Credit where it is due: this is an exceptional performance over the course of the season. Here we go!']],
  ],seed)},

  hotForm:function(r,w,n,seed){return pick([
    [w+' wins in last 5 — do not play '+r.name+' right now.',
     [r.name+' ('+r.club+') is in the form of their lives in '+n+'. '+w+' wins from the last 5 games — that is the kind of form that wins titles.',
      'Their attacking play has been devastating, their defensive structure has been solid. The complete package.',
      'If you are facing '+r.name+' in the next few weeks — good luck. You will need it. Here we go!']],
    [r.name+' on an unstoppable run in '+n+' — '+w+'/5 wins.',
     ['When '+r.name+' gets momentum going, they are almost impossible to stop. '+w+' victories in '+n+' from their last 5 games proves that.',
      'The confidence is sky-high, the performances have been electric. This is a team believing in themselves.',
      'They have gone from contenders to genuine title challengers. Here we go!']],
    ['The form team of '+n+' — '+r.name+' ('+r.club+') cannot stop winning.',
     ['Form table, recent results, goals scored — every metric points to the same conclusion: '+r.name+' is the best team in '+n+' right now.',
      w+' wins in their last 5 matches. Scoring freely, conceding very little. A manager\'s dream.',
      'Other teams in '+n+' must look at the schedule and hope they do not face '+r.name+' any time soon. Here we go!']],
  ],seed)},

  coldForm:function(r,l,n,seed){return pick([
    [l+' losses in last 5 — something has gone very wrong for '+r.name+'.',
     [r.name+' ('+r.club+') is experiencing one of the worst runs in '+n+' this season. '+l+' defeats from their last 5 matches — that is a crisis.',
      'Goals have dried up, the defensive shape has been all wrong, and the confidence in the squad looks shattered.',
      'The manager needs answers urgently. This level of performance cannot continue if they want to stay competitive. Here we go!']],
    [r.name+' in freefall — '+l+' defeats raises serious questions.',
     ['Something is fundamentally broken at '+r.name+' right now. '+l+' consecutive losses in '+n+' — this goes beyond a bad run.',
      'Whether it is tactical, physical, or mental, the problems need to be identified and fixed immediately.',
      'The other teams in '+n+' will be watching this collapse with interest. Every opponent now sees '+r.name+' as winnable. Here we go!']],
  ],seed)},

  unbeaten:function(r,streak,n,seed){return pick([
    [streak+' games without defeat — '+r.name+' is the iron wall of '+n+'.',
     [r.name+' ('+r.club+') has now gone '+streak+' matches without losing in '+n+'. That is not a run — that is a statement.',
      'Opponents have tried everything. Speed, physicality, patience. None of it has worked.',
      'This is what genuine consistency looks like. '+r.name+' is setting the standard in '+n+'. Here we go!']],
    [r.name+' still standing after '+streak+' — one of '+n+'\'s great unbeaten runs.',
     ['The longer the unbeaten run, the bigger the psychological advantage. '+r.name+' now has '+streak+' games in '+n+' without defeat.',
      'Every opponent who has tried and failed to end it has added another chapter to this extraordinary story.',
      'At what point does unbeaten become invincible? We are getting close. Here we go!']],
  ],seed)},

  top4:function(p4,p5,g,n,seed){return pick([
    ['UCL race in '+n+': '+p4.name+' and '+p5.name+' separated by '+g+' point'+(g!==1?'s':'')+'.',
     ['The fight for Champions League qualification in '+n+' has become one of the most compelling storylines of the season.',
      p4.name+' ('+p4.club+') holds 4th place by the narrowest of margins — just '+g+' point'+(g!==1?'s':'')+' above '+p5.name+' ('+p5.club+').',
      'In practical terms, there is almost nothing between them. A win for '+p5.name+' in their next game changes everything. Here we go!']],
    ['Only '+g+' point'+(g!==1?'s':'')+' for the last UCL spot in '+n+'. Heart in mouth.',
     ['If you needed evidence that the '+n+' top-four race is wide open — here it is. '+g+' point'+(g!==1?'s':'')+' between 4th and 5th.',
      p4.name+' and '+p5.name+' are essentially level. The next time these two face each other will be enormous.',
      'Champions League football is the prize. Both teams know exactly what is at stake. Here we go!']],
  ],seed)},

  relegation:function(bot,bot2,n,seed){return pick([
    [bot.name+' bottom of '+n+' — the survival battle has begun.',
     [bot.name+' ('+bot.club+') is in serious danger in '+n+'. Sitting at the bottom of the table on just '+bot.pts+' point'+(bot.pts!==1?'s':'')+', the situation could not be more precarious.',
      bot2.name+' ('+bot2.club+') directly above is not comfortable either — they can see the danger zone clearly.',
      'The matches between the bottom teams in the coming weeks will be absolutely decisive. Here we go!']],
    ['Rock bottom and running out of time — '+bot.name+' in crisis.',
     ['This is not a bad run of form. This is a full-blown '+n+' survival crisis for '+bot.name+' ('+bot.club+').',
      'The points are not coming, the performances have been poor, and the pressure is building every single game.',
      'They need a result — and they need one soon. Here we go!']],
  ],seed)},

  penalty:function(r,pts,ptsNow,n,seed){return pick([
    [r.name+' officially deducted '+pts+' point'+(pts!==1?'s:point')+' in '+n+'. Now on '+ptsNow+'.',
     ['Breaking news from '+n+': '+r.name+' ('+r.club+') has been officially deducted '+pts+' point'+(pts!==1?'s':'')+' for rule violations.',
      'They now sit on '+ptsNow+' points — a number that significantly changes their season outlook.',
      'The league has acted swiftly and decisively. The integrity of '+n+' must be upheld. Here we go!']],
    ['Point deduction confirmed — '+r.name+' punished for misconduct in '+n+'.',
     ['Official confirmation: '+r.name+' has been handed a '+pts+'-point deduction in '+n+'. This is a major moment.',
      'Down to '+ptsNow+' points, their position in the table changes meaningfully. Season-defining consequences.',
      'A reminder to every team: the rules exist for a reason and they will be enforced. Here we go!']],
  ],seed)},

  topGoals:function(p,goals,games,n,seed){return pick([
    [p.club+' have scored '+goals+' goals in '+games+' matches — the most in '+n+'.',
     [p.username+'\'s '+p.club+' are the most prolific attacking side in '+n+' right now.',
      goals+' goals from '+games+' match'+(games!==1?'es':'')+' — an average of '+(goals/Math.max(games,1)).toFixed(1)+' per game. Exceptional.',
      'This is not luck. This is a team set up to score, with a manager who clearly knows how to create chances. Here we go!']],
    ['Goals are flowing for '+p.club+' ('+p.username+') — '+goals+' in '+games+' '+n+' games.',
     ['If you want goals in '+n+', watch '+p.club+'. '+p.username+' has them playing with real attacking intent.',
      goals+' goals from '+games+' appearance'+(games!==1?'s:appearance')+' is the kind of record that demands attention.',
      'Top scoring team. Dangerous to play against. Hard to stop. Here we go!']],
  ],seed)},

  cleansheet:function(p,cs,n,seed){return pick([
    [p.club+' have '+cs+' clean sheets — the meanest defence in '+n+'.',
     [p.club+' (managed by '+p.username+') is the team opponents dread facing in '+n+'.',
      cs+' clean sheets from their matches — a record that reflects an absolutely outstanding defensive organisation.',
      'Scoring against '+p.club+' is one of the hardest tasks in '+n+'. The numbers back that up completely. Here we go!']],
    ['Fortress '+p.club+' — '+cs+' shutouts and the best defensive record in '+n+'.',
     ['The statistics are clear. '+p.username+'\'s '+p.club+' does not concede. '+cs+' clean sheets in '+n+' — by some distance the best defensive record.',
      'Whether it is tactical discipline, individual quality, or sheer determination — the results speak for themselves.',
      'If you want a blueprint for defensive excellence in '+n+', study '+p.club+'. Here we go!']],
  ],seed)},

  bigWin:function(win,los,hg,ag,n,seed){return pick([
    ['DEMOLITION in '+n+' — '+win.username+' '+hg+'-'+ag+' '+los.username+'.',
     ['The '+n+' result of the week — and it was not close. '+win.username+' ('+win.club+') absolutely dismantled '+los.username+' ('+los.club+') with a '+hg+'-'+ag+' victory.',
      'A '+Math.abs(hg-ag)+'-goal winning margin. The performance was complete — defensively solid, attacking was ferocious.',
      'This result sends a message to everyone else in '+n+': this team means business. Here we go!']],
    [win.username+' send a statement — '+hg+'-'+ag+' thrashing of '+los.username+'.',
     ['Emphatic. Dominant. Decisive. '+win.username+' ('+win.club+') left absolutely no doubt in '+n+' today.',
      hg+'-'+ag+' against '+los.username+' ('+los.club+'). A margin that flatters nobody — it was deserved from start to finish.',
      'When a team wins by that scoreline, the rest of the league takes notice. Here we go!']],
    ['A '+(hg-ag)+'-goal thrashing — '+win.username+' at their devastating best.',
     ['This is how good '+win.username+' can be. '+hg+'-'+ag+' against '+los.username+' in '+n+' — a genuine hammering.',
      'The goals came from everywhere, the defensive structure was impeccable, and the confidence grew with every passing minute.',
      'A warning shot to every team left to play '+win.username+' this season. Here we go!']],
  ],seed)},

  goalFest:function(hp,ap,hg,ag,n,seed){return pick([
    [(hg+ag)+' goals shared in '+n+' — the match of the season so far.',
     ['Entertainment of the highest order in '+n+'. '+hp.username+' ('+hp.club+') and '+ap.username+' ('+ap.club+') played out an extraordinary '+(hg+ag)+'-goal game.',
      'The final score of '+hg+'-'+ag+' barely tells the story. It was end-to-end, relentless, and completely unpredictable throughout.',
      'This is the kind of match that reminds you why we love football. Here we go!']],
    ['Incredible '+hg+'-'+ag+' thriller in '+n+' — '+(hg+ag)+' goals, no shortage of drama.',
     ['If you were not watching '+hp.username+' vs '+ap.username+' in '+n+', you missed something special.',
      (hg+ag)+' goals, '+hp.username+' ('+hp.club+') and '+ap.username+' ('+ap.club+') both refusing to give an inch.',
      'A final score of '+hg+'-'+ag+' that does not begin to capture how extraordinary this match was. Here we go!']],
  ],seed)},

  draw:function(hp,ap,hg,ag,n,seed){return pick([
    [hp.username+' '+hg+'-'+ag+' '+ap.username+' — points shared in a competitive '+n+' battle.',
     ['A hard-fought '+hg+'-'+ag+' draw in '+n+'. '+hp.username+' ('+hp.club+') and '+ap.username+' ('+ap.club+') gave everything but could not find a winner.',
      'Both managers will see it differently. One will feel a point was gained; the other will feel two were dropped.',
      'These draws define title races and relegation battles. Both teams must move on quickly. Here we go!']],
    ['No winner in '+n+': '+hp.username+' and '+ap.username+' cancel each other out.',
     ['Stalemate in '+n+'. '+hp.username+' and '+ap.username+' fought to a '+hg+'-'+ag+' draw — a result that will please neither side fully.',
      'Competitive, intense, and ultimately inconclusive. The kind of match that both teams will analyse in detail.',
      'The question now: who benefits most from this point? The table will provide the answer. Here we go!']],
  ],seed)},

  topClash:function(hp,hP,ap,aP,mt,n,seed){return pick([
    ['Top-3 showdown in '+n+' — mark this one in the calendar.',
     ['This is the match '+n+' has been waiting for. '+hp.username+' (#'+hP+', '+hp.club+') against '+ap.username+' (#'+aP+', '+ap.club+').',
      'Two of the top three sides in the division going head-to-head. The title race implications are enormous.',
      'Scheduled for '+mt+'. This is the one. Here we go!']],
    ['The '+n+' fixture of the season — top-of-table clash confirmed.',
     ['If the '+n+' title is decided in one moment, it could be this fixture. '+hp.username+' (P'+hP+') hosting '+ap.username+' (P'+aP+').',
      'Both teams know exactly what is at stake. A win here is potentially season-defining.',
      'Get ready: '+mt+'. Here we go!']],
  ],seed)},

  disputed:function(n,seed){return pick([
    [n+' dispute'+(n>1?'s':'')+' under review — the referee team is on it.',
     ['eFootball Universe currently has '+n+' active match result dispute'+(n>1?'s':'')+' under official investigation.',
      'The referee and admin team are reviewing all available evidence — screenshots, submissions, and testimony.',
      'Every case will be resolved fairly and thoroughly. Fair play is the foundation of this league. Here we go!']],
    ['Integrity matters: '+n+' contested result'+(n>1?'s are':' is')+' being formally reviewed.',
     ['Fair play alert in eFootball Universe. '+n+' match result'+(n>1?'s have':' has')+' been disputed and are currently under investigation.',
      'The process is clear: both sides submit their evidence, the referee reviews, and a decision is reached.',
      'No result will stand if it is dishonest. The league\'s integrity comes first. Here we go!']],
  ],seed)},

  milestone:function(count,seed){var lines={5:['5 matches down — the season has truly begun.',['The eFootball Universe season is underway in earnest. Five matches completed across all four leagues.',
      'Early patterns are forming, early leaders are emerging, and early rivalries are building.',
      'This is just the beginning. The best is ahead of us. Here we go!']],
    10:['10 matches played — the league table is taking shape.',['Double figures. 10 matches completed in eFootball Universe and the competition is getting serious.',
      'The table is starting to mean something. Form is being established. Characters are being revealed.',
      'Who rises? Who struggles? The next set of fixtures will tell us more. Here we go!']],
    25:['25 matches — we are deep into the season now.',['A quarter-century of eFootball Universe matches completed. This season is well and truly alive.',
      'Halfway through the league for many clubs. The title races are clearer, the relegation fights more desperate.',
      'This is the point in the season where everything starts to matter. Here we go!']],
    50:['50 MATCHES in eFootball Universe — a milestone moment.',['Fifty. Five-zero. The eFootball Universe has now hosted fifty competitive matches and every single one has mattered.',
      'Records are being set, reputations are being built or damaged, and the stories of this season are being written.',
      'Here is to the next fifty. Here we go!']],
    100:['100 MATCHES — this community is writing history.',['One hundred matches in eFootball Universe. This is not just a number — it is a monument to every player who has shown up, competed, and made this league what it is.',
      'From the first fixture to the hundredth, the level of competition has been extraordinary.',
      'This community is building something special. Thank you, everyone. Here we go!']],
  };return lines[count]||['Season milestone reached.',['eFootball Universe continues to grow — another landmark in a thriving season. Here we go!']];},

  mostActive:function(p,g,ln,seed){return pick([
    [p.username+' leads all of '+ln+' with '+g+' matches played.',
     [p.username+' ('+p.club+', '+ln+') simply cannot stop playing. '+g+' matches in eFootball Universe — more than any other competitor.',
      'This is what dedication looks like. While others wait, '+p.username+' is on the pitch, gaining experience, competing at every opportunity.',
      'Commitment of this level deserves recognition. The most active player in eFootball Universe. Here we go!']],
    ['No one plays more than '+p.username+' — '+g+' games and counting.',
     ['The stats do not lie. '+p.username+' ('+p.club+') has played '+g+' matches in eFootball Universe — the most dedicated competitor across all four leagues.',
      'Every game played is experience gained, every result shapes the season.',
      'If you want to know who takes this league most seriously — look no further. Here we go!']],
  ],seed)},
};

// ── INIT ─────────────────────────────────────────────────────
function initNews(){
  if(_newsInited)return;_newsInited=true;
  db.ref('ef_matches').on('value',function(){setTimeout(generateAllNews,600);});
  db.ref('ef_penalties').on('value',function(){setTimeout(generateAllNews,600);});
  setTimeout(generateAllNews,2000);
}

function generateAllNews(){
  if(!allPlayers||!Object.keys(allPlayers).length)return;
  var items=[];
  ['epl','laliga','seriea','ligue1'].forEach(function(lid){items=items.concat(genLeague(lid));});
  items=items.concat(genCross());
  items.sort(function(a,b){var d=(b.importance||0)-(a.importance||0);return d||Math.random()-.5;});
  _newsCache=items.slice(0,35);_newsGenerated=Date.now();
  if(activePage()==='home')renderNewsAnchor();
  updateNewsTicker();
}

function genLeague(lid){
  var table=computeStd(lid);if(!table.length)return[];
  var lg=LGS[lid]||{},items=[];
  var played=Object.values(allMatches).filter(function(m){return m.league===lid&&m.played;});

  if(table.length>=2){
    var L=table[0],S=table[1],gap=L.pts-S.pts,seed=lid+'tit'+L.uid+S.uid+gap;
    if(gap===0&&L.p>=2){var v=V.titleLevel(L,S,lg.n,seed);items.push(makeStory(lid,'title',96,'🏆 '+lg.n+' title race: LEVEL at the top',v[0],v[1]));}
    else if(gap<=3&&L.p>=2){var v=V.titleClose(L,S,gap,lg.n,seed);items.push(makeStory(lid,'title',91,'🏆 '+L.name+' leads '+lg.n+' by '+gap+' point'+(gap>1?'s':''),v[0],v[1]));}
    else if(gap>=9&&L.p>=4){var v=V.titleRunaway(L,gap,lg.n,seed);items.push(makeStory(lid,'title',78,'🏆 '+L.name+' running away with '+lg.n,v[0],v[1]));}
  }

  table.forEach(function(r){
    if(r.p<3)return;
    var last5=r.form.slice(-5);
    var w=last5.filter(function(f){return f==='w';}).length;
    var l=last5.filter(function(f){return f==='l';}).length;
    if(w>=4){var v=V.hotForm(r,w,lg.n,lid+'hot'+r.uid+w);items.push(makeStory(lid,'form',86,'🔥 '+r.name+' ('+r.club+') — on fire in '+lg.n,v[0],v[1]));}
    if(l>=4){var v=V.coldForm(r,l,lg.n,lid+'cold'+r.uid+l);items.push(makeStory(lid,'crisis',83,'🚨 Crisis at '+r.name+' — '+l+' defeats in '+lg.n,v[0],v[1]));}
  });

  table.forEach(function(r){
    if(r.p<4)return;
    var streak=0,rev=r.form.slice().reverse();
    for(var i=0;i<rev.length;i++){if(rev[i]!=='l')streak++;else break;}
    if(streak>=5){var v=V.unbeaten(r,streak,lg.n,lid+'unb'+r.uid+streak);items.push(makeStory(lid,'unbeaten',85,'🛡 '+r.name+' — '+streak+' games unbeaten in '+lg.n,v[0],v[1]));}
  });

  if(table.length>=5){
    var p4=table[3],p5=table[4],t4g=p4.pts-p5.pts;
    if(t4g<=2&&p4.p>=2){var v=V.top4(p4,p5,t4g,lg.n,lid+'t4'+p4.uid+p5.uid);items.push(makeStory(lid,'top4',82,'🎯 '+lg.n+' UCL race: '+p4.name+' vs '+p5.name,v[0],v[1]));}
  }

  if(table.length>=4&&table[table.length-1].p>=2){
    var bot=table[table.length-1],bot2=table[table.length-2];
    var v=V.relegation(bot,bot2,lg.n,lid+'rel'+bot.uid+bot.pts);
    items.push(makeStory(lid,'relegation',79,'🚨 '+bot.name+' in trouble at bottom of '+lg.n,v[0],v[1]));
  }

  table.forEach(function(r){
    if(r.penPts>0){var v=V.penalty(r,r.penPts,r.pts,lg.n,lid+'pen'+r.uid+r.penPts);items.push(makeStory(lid,'penalty',90,'⚡ Point deduction: '+r.name+' ('+r.club+')',v[0],v[1]));}
  });

  // Top scoring team (USER's club goals — individual player scoring is untrackable)
  var gf={};played.forEach(function(m){gf[m.homeId]=(gf[m.homeId]||0)+(m.hg||0);gf[m.awayId]=(gf[m.awayId]||0)+(m.ag||0);});
  var topG=Object.entries(gf).filter(function(kv){var p=allPlayers[kv[0]];return p&&p.league===lid;}).sort(function(a,b){return b[1]-a[1];})[0];
  if(topG&&topG[1]>=4){var tp=allPlayers[topG[0]];if(tp){var gp=played.filter(function(m){return m.homeId===tp.uid||m.awayId===tp.uid;}).length;var v=V.topGoals(tp,topG[1],gp,lg.n,lid+'gf'+tp.uid+topG[1]);items.push(makeStory(lid,'goals',75,'⚽ '+tp.club+' — top scoring team in '+lg.n,v[0],v[1]));}}

  // Best defence
  var cs={};played.forEach(function(m){if((m.ag||0)===0)cs[m.homeId]=(cs[m.homeId]||0)+1;if((m.hg||0)===0)cs[m.awayId]=(cs[m.awayId]||0)+1;});
  var topCS=Object.entries(cs).filter(function(kv){var p=allPlayers[kv[0]];return p&&p.league===lid;}).sort(function(a,b){return b[1]-a[1];})[0];
  if(topCS&&topCS[1]>=3){var cp=allPlayers[topCS[0]];if(cp){var v=V.cleansheet(cp,topCS[1],lg.n,lid+'cs'+cp.uid+topCS[1]);items.push(makeStory(lid,'cleansheet',73,'🧤 '+cp.club+' — best defence in '+lg.n,v[0],v[1]));}}

  // Recent results
  var recent=played.sort(function(a,b){return(b.playedAt||0)-(a.playedAt||0);}).slice(0,4);
  recent.forEach(function(m){
    var hp=allPlayers[m.homeId],ap=allPlayers[m.awayId];if(!hp||!ap)return;
    var tot=(m.hg||0)+(m.ag||0),margin=Math.abs((m.hg||0)-(m.ag||0));
    var win=m.hg>m.ag?hp:m.ag>m.hg?ap:null,los=m.hg>m.ag?ap:m.ag>m.hg?hp:null;
    var seed=lid+'res'+m.homeId+m.awayId+(m.hg||0)+(m.ag||0);
    if(margin>=4&&win&&los){var v=V.bigWin(win,los,m.hg,m.ag,lg.n,seed);items.push(makeStory(lid,'result',81,'💥 '+win.username+' '+m.hg+'-'+m.ag+' '+los.username+' in '+lg.n,v[0],v[1]));}
    else if(tot>=7){var v=V.goalFest(hp,ap,m.hg,m.ag,lg.n,seed);items.push(makeStory(lid,'result',72,'🎆 '+tot+'-goal thriller in '+lg.n,v[0],v[1]));}
    else if(!win&&tot>0){var v=V.draw(hp,ap,m.hg,m.ag,lg.n,seed);items.push(makeStory(lid,'result',63,'🤝 '+hp.username+' and '+ap.username+' share the points',v[0],v[1]));}
  });

  // Upcoming big match
  var upcoming=Object.values(allMatches).filter(function(m){return m.league===lid&&!m.played&&m.matchTime&&m.matchTime>Date.now();}).sort(function(a,b){return a.matchTime-b.matchTime;});
  if(upcoming.length){
    var motw=upcoming[0],hp2=allPlayers[motw.homeId],ap2=allPlayers[motw.awayId];
    if(hp2&&ap2){
      var hP=table.findIndex(function(r){return r.uid===motw.homeId;})+1,aP=table.findIndex(function(r){return r.uid===motw.awayId;})+1;
      var mt=fmtFull(motw.matchTime),seed=lid+'up'+motw.homeId+motw.awayId;
      if(hP>0&&aP>0&&hP<=3&&aP<=3){var v=V.topClash(hp2,hP,ap2,aP,mt,lg.n,seed);items.push(makeStory(lid,'upcoming',93,'🔥 TOP CLASH: '+hp2.username+' vs '+ap2.username+' in '+lg.n,v[0],v[1]));}
      else{items.push(makeStory(lid,'upcoming',66,'📅 Next in '+lg.n+': '+hp2.username+' vs '+ap2.username,'Confirmed for '+mt+'.',[hp2.username+' ('+hp2.club+', P'+hP+') hosts '+ap2.username+' ('+ap2.club+', P'+aP+') in the next '+lg.n+' fixture.','Scheduled for '+mt+'. Both managers will be preparing carefully. Here we go!']));}
    }
  }
  return items;
}

function genCross(){
  var items=[],allPlayed=Object.values(allMatches).filter(function(m){return m.played;}),tp=Object.keys(allPlayers).length;
  var actMap={};allPlayed.forEach(function(m){actMap[m.homeId]=(actMap[m.homeId]||0)+1;actMap[m.awayId]=(actMap[m.awayId]||0)+1;});
  var topA=Object.entries(actMap).sort(function(a,b){return b[1]-a[1];})[0];
  if(topA&&topA[1]>=5){var p=allPlayers[topA[0]];if(p){var v=V.mostActive(p,topA[1],(LGS[p.league]||{}).n||'',topA[0]+topA[1]);items.push(makeStory('all','activity',70,'💪 Most active: '+p.username+' — '+topA[1]+' matches',v[0],v[1]));}}
  var disp=allPlayed.filter(function(m){return m.disputed||m.refStatus==='disputed'||m.refStatus==='escalated';});
  if(disp.length>=1){var v=V.disputed(disp.length,'disp'+disp.length);items.push(makeStory('all','discipline',87,'⚠ '+disp.length+' result dispute'+(disp.length>1?'s':'')+' under investigation',v[0],v[1]));}
  [5,10,25,50,100].forEach(function(n){if(allPlayed.length===n){var v=V.milestone(n,'ms'+n);items.push(makeStory('all','milestone',80,v[0],v[1][0],v[1].slice(1)));}}); // fix: milestone returns [subline,body[]]
  if(tp>=8)items.push(makeStory('all','community',65,'👥 '+tp+' managers registered across all leagues','eFootball Universe keeps growing — community now at '+tp+' players.',[tp+' managers competing across EPL, La Liga, Serie A and Ligue 1.',
    'The competition gets stronger every week. Tell your friends — this is where it happens. Here we go!']));
  return items;
}

// ── RENDER — CARD LIST VIEW ──────────────────────────────────
var TYPE_ICON={title:'🏆',form:'🔥',crisis:'🚨',top4:'🎯',relegation:'🚨',penalty:'⚡',cleansheet:'🧤',goals:'⚽',unbeaten:'🛡',result:'📊',upcoming:'📅',activity:'💪',discipline:'⚠',milestone:'🎉',community:'👥'};
var TYPE_COLOR={title:'#FFE600',form:'#00FF85',crisis:'#FF2882',top4:'#00D4FF',relegation:'#FF2882',penalty:'#FF2882',cleansheet:'#00D4FF',goals:'#FF8C00',unbeaten:'#00FF85',result:'#fff',upcoming:'#FFE600',activity:'#00D4FF',discipline:'#FF2882',milestone:'#FFE600',community:'#00D4FF'};

function renderNewsAnchor(){
  var el=$('news-anchor-section');if(!el)return;
  if(!_newsCache.length){el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--dim)"><div style="font-size:1.5rem;margin-bottom:.5rem">📰</div><div>Generating latest news...</div></div>';return;}
  var a=NEWS_ANCHOR;

  // Anchor header
  var html='<div style="background:linear-gradient(135deg,rgba(0,212,255,0.07),rgba(0,255,133,0.04));border:1px solid rgba(0,212,255,0.2);border-radius:16px;padding:1rem 1.1rem;margin-bottom:1rem;display:flex;align-items:center;gap:.9rem">'
    +'<div style="position:relative;flex-shrink:0"><img src="'+a.avatar+'" crossorigin onerror="this.src=\'https://ui-avatars.com/api/?name=FR&background=00D4FF&color=100018&bold=true\'" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2.5px solid #00D4FF;box-shadow:0 0 20px rgba(0,212,255,0.4)">'
    +'<div style="position:absolute;bottom:1px;right:1px;width:13px;height:13px;border-radius:50%;background:#00FF85;border:2px solid var(--dark)"></div></div>'
    +'<div style="flex:1;min-width:0"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.88rem;color:#fff">'+a.name+'</div>'
    +'<div style="font-size:.62rem;color:#00D4FF;margin-top:1px">'+a.role+'</div>'
    +'<div style="font-size:.57rem;color:var(--dim);margin-top:2px">Updated '+fmtAgo(_newsGenerated)+'</div></div>'
    +'<div style="text-align:right;flex-shrink:0"><div style="font-family:Orbitron,sans-serif;font-size:.56rem;color:#00FF85;font-weight:700;letter-spacing:1px">LIVE</div>'
    +'<div style="width:8px;height:8px;border-radius:50%;background:#00FF85;margin:.3rem auto 0"></div></div></div>';

  // Story cards — headline + subline, tap to expand
  _newsCache.slice(0,8).forEach(function(item,i){
    var lg=LGS[item.lid]||{},tc=TYPE_COLOR[item.type]||'#00D4FF',ti=TYPE_ICON[item.type]||'📰';
    var feat=i===0;
    var idx=_newsCache.indexOf(item);
    html+='<div class="news-card" onclick="openNewsStory('+idx+')" style="'
      +'background:var(--card);border:1px solid '+(feat?tc+'33':'rgba(0,212,255,0.1)')+';'
      +'border-radius:13px;padding:.9rem 1rem;margin-bottom:.48rem;cursor:pointer;transition:all .22s;'
      +'animation:fadein '+(.16+i*.05)+'s ease;'
      +(feat?'border-left:3px solid '+tc+';background:'+tc+'07;':'')+'">'
      // Header row
      +'<div style="display:flex;align-items:flex-start;gap:.65rem">'
      +'<div style="font-size:'+(feat?'1.35rem':'1.05rem')+';flex-shrink:0;margin-top:1px">'+ti+'</div>'
      +'<div style="flex:1;min-width:0">'
      // League pill
      +(item.lid!=='all'?'<span style="display:inline-block;font-size:.5rem;font-weight:700;padding:2px 6px;border-radius:4px;background:'+(lg.bg||'rgba(255,255,255,0.06)')+';color:'+(lg.c||'#aaa')+';margin-bottom:.3rem">'+(lg.f||'')+' '+(lg.short||'')+'</span>':'<span style="display:inline-block;font-size:.5rem;font-weight:700;padding:2px 6px;border-radius:4px;background:rgba(0,212,255,0.08);color:#00D4FF;margin-bottom:.3rem">🌍 ALL LEAGUES</span>')
      // Headline
      +'<div style="font-weight:700;font-size:'+(feat?'.88rem':'.8rem')+';color:#fff;line-height:1.36;margin-bottom:.22rem">'+item.headline+'</div>'
      // Subline — the one-liner
      +'<div style="font-size:.7rem;color:#aaa;line-height:1.45">'+item.subline+'</div>'
      +'</div>'
      // Chevron
      +'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="'+tc+'" stroke-width="2.5" style="flex-shrink:0;margin-top:3px;opacity:0.6"><polyline points="9 18 15 12 9 6"/></svg>'
      +'</div></div>';
  });

  if(_newsCache.length>8){
    html+='<button onclick="renderAllNewsCards()" class="bs" style="width:100%;font-size:.75rem;padding:10px;margin-top:.3rem;display:flex;align-items:center;justify-content:center;gap:.4rem"><span>See all '+_newsCache.length+' stories</span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>';
  }
  el.innerHTML=html;
}

// ── OPEN FULL STORY ──────────────────────────────────────────
function openNewsStory(idx){
  var item=_newsCache[idx];if(!item)return;
  _openStory=idx;
  var a=NEWS_ANCHOR;
  var el=$('news-anchor-section');if(!el)return;
  var tc=TYPE_COLOR[item.type]||'#00D4FF';
  var ti=TYPE_ICON[item.type]||'📰';
  var lg=LGS[item.lid]||{};

  var html='<!-- FULL STORY -->'
    // Back button
    +'<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.9rem">'
    +'<button onclick="renderNewsAnchor()" class="bs" style="font-size:.7rem;padding:5px 12px;display:flex;align-items:center;gap:.3rem">'
    +'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg> Back</button>'
    +(item.lid!=='all'?'<span style="font-size:.58rem;font-weight:700;padding:2px 8px;border-radius:5px;background:'+(lg.bg||'rgba(255,255,255,0.06)')+';color:'+(lg.c||'#aaa')+'">'+(lg.f||'')+' '+(lg.n||'')+'</span>':'<span style="font-size:.58rem;font-weight:700;padding:2px 8px;border-radius:5px;background:rgba(0,212,255,0.08);color:#00D4FF">🌍 All Leagues</span>')
    +'</div>'
    // Article card
    +'<div style="background:var(--card);border:1px solid '+tc+'33;border-left:3px solid '+tc+';border-radius:13px;padding:1.1rem 1.2rem;animation:scalein .25s ease">'
    // Icon + headline
    +'<div style="font-size:1.8rem;margin-bottom:.5rem">'+ti+'</div>'
    +'<h2 style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.95rem;color:#fff;line-height:1.35;margin-bottom:.5rem">'+item.headline+'</h2>'
    // Subline (bold intro)
    +'<div style="font-size:.8rem;font-weight:700;color:'+tc+';margin-bottom:.9rem;line-height:1.5">'+item.subline+'</div>'
    // Body paragraphs
    +(item.body||[]).map(function(para,i){
      return'<p style="font-size:.8rem;color:#ccc;line-height:1.75;margin-bottom:.7rem'+(i===0?';padding-top:.2rem':'')+'">'
        +(i===0?'<span style="font-size:.85rem;font-weight:700;color:#fff">'+para.charAt(0)+'</span>'+para.slice(1):para)
        +'</p>';
    }).join('')
    // Byline
    +'<div style="display:flex;align-items:center;gap:.55rem;margin-top:.7rem;padding-top:.65rem;border-top:1px solid rgba(255,255,255,0.07)">'
    +'<img src="'+a.avatar+'" crossorigin onerror="this.style.display=\'none\'" style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(0,212,255,0.3)">'
    +'<div><div style="font-size:.72rem;font-weight:700;color:#00D4FF">'+a.name+'</div>'
    +'<div style="font-size:.58rem;color:var(--dim)">'+a.role+' · '+fmtAgo(_newsGenerated)+'</div></div>'
    +'</div></div>'
    // Next/Prev navigation
    +'<div style="display:flex;gap:.5rem;margin-top:.65rem">'
    +(idx>0?'<button onclick="openNewsStory('+(idx-1)+')" class="bs" style="flex:1;font-size:.7rem;padding:8px;display:flex;align-items:center;justify-content:center;gap:.3rem"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg> Previous</button>':'')
    +(idx<_newsCache.length-1?'<button onclick="openNewsStory('+(idx+1)+')" class="bs" style="flex:1;font-size:.7rem;padding:8px;display:flex;align-items:center;justify-content:center;gap:.3rem">Next <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>':'')
    +'</div>';
  el.innerHTML=html;
}

function renderAllNewsCards(){
  var el=$('news-anchor-section');if(!el)return;
  var a=NEWS_ANCHOR;
  var html='<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.9rem"><button onclick="renderNewsAnchor()" class="bs" style="font-size:.7rem;padding:5px 12px">← Back</button><div style="font-family:Orbitron,sans-serif;font-size:.75rem;color:#00D4FF">All Stories ('+_newsCache.length+')</div></div>';
  _newsCache.forEach(function(item,i){
    var lg=LGS[item.lid]||{},tc=TYPE_COLOR[item.type]||'#00D4FF',ti=TYPE_ICON[item.type]||'📰';
    html+='<div class="news-card" onclick="openNewsStory('+i+')" style="background:var(--card);border:1px solid rgba(0,212,255,0.1);border-radius:12px;padding:.8rem;margin-bottom:.4rem;cursor:pointer;transition:all .2s;animation:fadein '+(.06+i*.02)+'s ease">'
      +'<div style="display:flex;align-items:flex-start;gap:.55rem">'
      +'<div style="font-size:1rem;flex-shrink:0">'+ti+'</div>'
      +'<div style="flex:1;min-width:0">'
      +(item.lid!=='all'?'<span style="font-size:.5rem;font-weight:700;padding:1px 5px;border-radius:3px;background:'+(lg.bg||'')+';color:'+(lg.c||'#aaa')+'">'+(lg.short||'')+'</span> ':'')
      +'<div style="font-size:.78rem;font-weight:700;color:#fff;margin-bottom:.18rem">'+item.headline+'</div>'
      +'<div style="font-size:.67rem;color:#aaa">'+item.subline+'</div>'
      +'</div>'
      +'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="'+tc+'" stroke-width="2.5" style="flex-shrink:0;opacity:.5;margin-top:2px"><polyline points="9 18 15 12 9 6"/></svg>'
      +'</div></div>';
  });
  el.innerHTML=html;
}

// ── TICKER ───────────────────────────────────────────────────
function updateNewsTicker(){
  var bar=$('news-ticker-bar'),track=$('news-ticker-track');
  if(!bar||!track)return;
  if(!_newsCache.length){setTimeout(updateNewsTicker,3000);return;}
  var html=_newsCache.slice(0,14).map(function(n){return'<span class="news-ticker-item"><span class="news-ticker-dot"></span>'+n.headline+'</span>';}).join('');
  track.innerHTML=html+html;
  bar.classList.add('visible');
}
