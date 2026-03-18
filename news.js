// ============================================================
// NEWS.JS — Fabrizio Romano AI Anchor
// Stories show as headline cards. Tapping one opens a full
// article view — like a proper news app. Every situation has
// multiple phrase variations so nothing repeats.
// ============================================================
var NEWS_ANCHOR = {
  name:   'Fabrizio Romano',
  role:   'eFootball Universe Correspondent',
  avatar: 'https://pbs.twimg.com/profile_images/1592531920777842690/pGMu4FFC_400x400.jpg',
  bio:    'The most trusted name in football transfers, now covering eFootball Universe. Known worldwide for his iconic "Here We Go!" announcement, Fabrizio brings his legendary nose for news to your virtual league — breaking results, tracking form, and exposing every drama before anyone else. Here we go! ✅'
};

function openAnchorBio() {
  var a = NEWS_ANCHOR;
  // Build a modal-style overlay inline
  var existing = document.getElementById('anchor-bio-overlay');
  if (existing) { existing.remove(); return; }
  var div = document.createElement('div');
  div.id = 'anchor-bio-overlay';
  div.onclick = function(e) { if (e.target === div) div.remove(); };
  div.style.cssText = 'position:fixed;inset:0;z-index:900;background:rgba(0,0,0,0.75);display:flex;align-items:flex-end;justify-content:center;padding:0;animation:fadeInBio .2s ease';
  div.innerHTML =
    '<div style="background:#0e0018;border:1px solid rgba(0,212,255,0.25);border-radius:20px 20px 0 0;'
    + 'width:100%;max-width:480px;padding:1.4rem 1.4rem 2.2rem;animation:slideUpBio .25s ease;position:relative">'
    // Close button
    + '<button onclick="document.getElementById(\'anchor-bio-overlay\').remove()" '
    + 'style="position:absolute;top:.8rem;right:.8rem;background:rgba(255,255,255,0.06);border:none;'
    + 'border-radius:50%;width:28px;height:28px;color:#666;font-size:.9rem;cursor:pointer;'
    + 'display:flex;align-items:center;justify-content:center">✕</button>'
    // Avatar + name
    + '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem">'
    + '<div style="position:relative;flex-shrink:0">'
    + '<img src="' + a.avatar + '" crossorigin '
    + 'onerror="this.src=\'https://ui-avatars.com/api/?name=FR&background=00D4FF&color=100018&bold=true\'" '
    + 'style="width:68px;height:68px;border-radius:50%;object-fit:cover;'
    + 'border:2.5px solid #00D4FF;box-shadow:0 0 20px rgba(0,212,255,0.45)">'
    + '<div style="position:absolute;bottom:2px;right:2px;width:14px;height:14px;'
    + 'border-radius:50%;background:#00FF85;border:2px solid #0e0018"></div>'
    + '</div>'
    + '<div>'
    + '<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:1rem;color:#fff">' + a.name + '</div>'
    + '<div style="font-size:.68rem;color:#00D4FF;margin-top:2px">' + a.role + '</div>'
    + '<div style="display:inline-flex;align-items:center;gap:.3rem;margin-top:.4rem;'
    + 'background:rgba(0,255,133,0.1);border:1px solid rgba(0,255,133,0.3);'
    + 'border-radius:20px;padding:2px 8px">'
    + '<div style="width:7px;height:7px;border-radius:50%;background:#00FF85"></div>'
    + '<span style="font-size:.58rem;font-weight:700;color:#00FF85">LIVE COVERAGE</span>'
    + '</div>'
    + '</div></div>'
    // Bio text
    + '<div style="font-size:.8rem;color:#ccc;line-height:1.75;padding:.9rem;'
    + 'background:rgba(0,212,255,0.04);border:1px solid rgba(0,212,255,0.1);'
    + 'border-radius:12px">' + a.bio + '</div>'
    // Here We Go tag
    + '<div style="text-align:center;margin-top:.9rem;font-family:Orbitron,sans-serif;'
    + 'font-size:.75rem;font-weight:900;color:#00D4FF;letter-spacing:2px">HERE WE GO! ✅</div>'
    + '</div>';

  // Add keyframe styles once
  if (!document.getElementById('anchor-bio-styles')) {
    var s = document.createElement('style');
    s.id = 'anchor-bio-styles';
    s.textContent = '@keyframes fadeInBio{from{opacity:0}to{opacity:1}}'
      + '@keyframes slideUpBio{from{transform:translateY(100%)}to{transform:translateY(0)}}';
    document.head.appendChild(s);
  }
  document.body.appendChild(div);
}
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
function makeStory(lid,type,importance,headline,subline,bodyParagraphs,extra){
  var s={lid:lid,type:type,importance:importance,headline:headline,subline:subline,body:bodyParagraphs};
  if(extra)Object.assign(s,extra);
  return s;
}

// ── PHRASE BANKS ────────────────────────────────────────────
// Each function returns an array of [subline, body[]] arrays.
// We pick one based on seed.
var V={
  titleLevel:function(L,S,n,seed){return pick([
    [L.name+' and '+S.name+' are equal on points — title could go either way.',[L.name+' ('+L.club+') and '+S.name+' ('+S.club+') are level at the top of '+n+' — zero points separating them.','Every match from here is a cup final. One slip from either side and the title conversation changes completely.','Neither team will want to go into the final stretch in this position — but both will fancy their chances. Here we go!']],
    ['Deadlock at the summit of '+n+'. Neither team will blink first.',['Breathtaking scenes at the top of '+n+'. '+L.name+' and '+S.name+' have cancelled each other out — inseparable on points.','The pressure on both managers is enormous. A single dropped point could prove catastrophic.','Who wants it more? That question will be answered on the pitch. Here we go!']],
    [L.name+' and '+S.name+' locked together — the best title race in '+n+'.',['You could not write this script. '+L.name+' and '+S.name+' share the top spot in '+n+' after an extraordinary sequence of results.','Not a single point between them. The kind of title race that football was made for.','Every fixture involving these two is now appointment viewing. Here we go!']],
    ['The '+n+' title race is alive — '+L.name+' and '+S.name+' refuse to be separated.',['Game after game, result after result — '+L.name+' and '+S.name+' keep matching each other. Still level at the top of '+n+'.','Two managers, two squads, two sets of supporters — all knowing that one mistake could decide everything.','This is elite-level competition. Here we go!']],
    ['Cannot split them in '+n+'. '+L.name+' and '+S.name+' share top spot.',['The '+n+' season has produced a genuine blockbuster at the top. '+L.name+' ('+L.club+') and '+S.name+' ('+S.club+') — level on points, level on ambition.','Every game matters. Every goal matters. This is what competitive football looks like.','Buckle up. Here we go!']],
    ['Maximum tension in '+n+' — '+L.name+' and '+S.name+' inseparable.',['When two evenly-matched teams go toe-to-toe for an entire season, this is what happens. '+L.name+' and '+S.name+' are tied at the summit of '+n+'.','No daylight between them. The next set of results could change everything.','The whole of '+n+' is watching. Here we go!']],
    ['Zero points separate the top two in '+n+'. History in the making.',['Historic scenes at the top of '+n+'. '+L.name+' and '+S.name+' have been fighting each other to a standstill all season — and still they cannot be split.','The pressure is immense. The stakes are the highest they have ever been.','This is the '+n+' title race. Here we go!']],
    ['Level pegging in '+n+' — '+L.name+' and '+S.name+' go neck and neck.',['Neither '+L.name+' nor '+S.name+' have been able to pull clear in '+n+'. They remain level — point for point, result for result.','The title will be decided by the finest of margins. Form, fitness, and nerve.','Both teams have what it takes. Only one can win. Here we go!']],
    ['It could not be tighter at the top of '+n+'. '+L.name+' and '+S.name+' level.',['Two points. One game. That is how fine the margins are in '+n+' right now. '+L.name+' and '+S.name+' are absolutely equal.','Every match has maximum importance. Every decision could swing the title.','The drama in '+n+' is at its absolute peak. Here we go!']],
    ['The '+n+' title is up for grabs — '+L.name+' and '+S.name+' cannot be separated.',['Anyone who says they know who will win '+n+' is lying. '+L.name+' and '+S.name+' remain level — this truly could go either way.','Identical points, comparable form. The data gives us no clear answer.','Only the pitch can decide now. Here we go!']],
    ['A title race for the ages in '+n+' — '+L.name+' and '+S.name+' dead level.',['Seasons like this do not come along often. '+L.name+' and '+S.name+' have been inseparable in '+n+' and show no signs of letting go.','Champions are made in moments like these. Who has the mental strength to step up?','One of the great '+n+' title races. Here we go!']],
    ['Pure drama at the top of '+n+'. Not a point between '+L.name+' and '+S.name+'.',['The '+n+' title race has taken on a life of its own. '+L.name+' ('+L.club+') and '+S.name+' ('+S.club+') — equal, relentless, and extraordinary.','Results elsewhere are being scrutinised. Every goal in '+n+' now carries extra weight.','This is elite competition at its finest. Here we go!']],
  ],seed)},

  titleClose:function(L,S,gap,n,seed){return pick([
    [gap+' point'+(gap>1?'s':'')+' — '+L.name+' leads but cannot relax.',[L.name+' ('+L.club+') sits at the summit of '+n+' with a '+gap+'-point advantage. It looks comfortable. It is not.','At this level in '+n+', '+gap+' point'+(gap>1?'s':'')+' is nothing. One bad result and the narrative changes.','The pressure is on the leader. Here we go!']],
    ['Slim '+gap+'-point lead for '+L.name+' — '+S.name+' right on their heels.',['The '+n+' title picture is becoming clearer — and it is tense. '+L.name+' holds top spot, just '+gap+' point'+(gap>1?'s':'')+' ahead of '+S.name+'.',''+S.name+' ('+S.club+') is not going anywhere. They are watching, waiting for '+L.name+' to slip.','When two teams are this close, anything can happen. Here we go!']],
    [L.name+' clings to top spot in '+n+' — '+gap+' points the only difference.',['Breathe in. The '+n+' title race is going right down to the wire. '+L.name+' leads '+S.name+' by just '+gap+' point'+(gap>1?'s':'')+'.','The gap is small enough for '+S.name+' to overhaul in one weekend. They know it. '+L.name+' knows it.','This is what the beautiful game is all about. Here we go!']],
    ['A '+gap+'-point margin at the top of '+n+' — but who is really in control?',['On paper, '+L.name+' leads '+n+'. But '+gap+' point'+(gap>1?'s':'')+' is a slender advantage against a '+S.name+' side this hungry.',''+S.name+' ('+S.club+') has the quality to turn this around with one strong run of results.','The title is still wide open. Here we go!']],
    [L.name+' just '+gap+' clear in '+n+' — '+S.name+' refusing to go away.',['This title fight in '+n+' refuses to die. '+L.name+' ('+L.club+') at the top, '+S.name+' ('+S.club+') just '+gap+' point'+(gap>1?'s':'')+' behind.','The chasing pack are sensing blood. One slip from the leaders and the gap is gone.','Who blinks first? Here we go!']],
    ['Hang on tight in '+n+' — '+L.name+' leads by only '+gap+' point'+(gap>1?'s':'')+'.',['The margin at the top of '+n+' is razor thin. '+L.name+' ('+L.club+') is ahead, but only just — '+gap+' point'+(gap>1?'s':'')+' ahead of '+S.name+'.','In a title race this close, a single result can flip everything upside down.','Fasten your seatbelts. Here we go!']],
    [L.name+' leads '+n+' but '+S.name+' will not surrender — gap: '+gap+'pts.',[''+L.name+' is in the driving seat in '+n+'. But '+S.name+' ('+S.club+') is not going quietly — just '+gap+' point'+(gap>1?'s':'')+' separates them.','Every match between now and the end of the season carries enormous weight.','This '+n+' title race is far from over. Here we go!']],
    ['Only '+gap+' point'+(gap>1?'s':'')+' in it at the top of '+n+' — edge-of-your-seat football.',['The tension in '+n+' is palpable. '+L.name+' ('+L.club+') leads '+S.name+' ('+S.club+') by '+gap+' point'+(gap>1?'s':'')+' and that is barely anything at this level.','A win for '+S.name+' in their next fixture closes the gap completely.','Everything is to play for. Here we go!']],
    [L.name+' one slip away from losing top spot in '+n+'.',['Precarious position for '+L.name+' ('+L.club+'). Their '+gap+'-point lead over '+S.name+' ('+S.club+') in '+n+' could vanish with one dropped game.',''+S.name+' is applying relentless pressure. The leader must respond.','The '+n+' title race is heating up. Here we go!']],
    ['Advantage '+L.name+' — but '+S.name+' is hunting them down in '+n+'.',['You can feel the momentum building. '+S.name+' ('+S.club+') is closing in on '+L.name+' at the top of '+n+' — the gap is down to '+gap+' point'+(gap>1?'s':'')+'.','When a team is this close, confidence builds. And confident teams are dangerous.','The title race in '+n+' is entering its most exciting chapter. Here we go!']],
    [''+n+' title: '+L.name+' leads '+S.name+' by '+gap+' — momentum is everything.',['In a '+gap+'-point title race in '+n+', momentum can be more valuable than quality.','Right now, '+L.name+' ('+L.club+') has the points lead. But '+S.name+' ('+S.club+') has the hunger of a chasing pack.','Which factor wins? We will find out. Here we go!']],
    ['Nerve-wracking in '+n+' — '+L.name+' '+gap+' clear of '+S.name+'.',['Nerves of steel required in '+n+'. '+L.name+' ('+L.club+') leads the division by '+gap+' point'+(gap>1?'s':'')+' — not enough to sleep easy.',''+S.name+' ('+S.club+') is breathing down their neck. A slip here, a drop in form there, and it changes everything.','This is high-stakes '+n+' football. Here we go!']],
  ],seed)},

  titleRunaway:function(L,gap,n,seed){return pick([
    [L.name+' is the dominant force in '+n+' — '+gap+' points ahead.',[L.name+' ('+L.club+') is turning this '+n+' title race into a procession. A '+gap+'-point lead speaks for itself.','The consistency has been remarkable. Match after match, this team has delivered.','Unless something dramatic happens, this title looks like it is heading one way. Here we go!']],
    [gap+' points clear — '+L.name+' could win '+n+' at a canter.',['Dominant, relentless, and utterly convincing. '+L.name+' has built a '+gap+'-point lead at the top of '+n+'.','The rest of the division are playing for second place right now.','Credit where it is due: this is an exceptional performance. Here we go!']],
    [L.name+' racing away in '+n+' — '+gap+' points is a statement.',['What a season from '+L.name+' ('+L.club+'). '+gap+' points clear at the top of '+n+' and looking imperious.','Every time a rival wins, '+L.name+' responds. Every time pressure mounts, they deliver.','This is what a title-winning team looks like. Here we go!']],
    ['Is anyone stopping '+L.name+'? '+gap+' clear and cruising in '+n+'.',['The question in '+n+' has stopped being who will win the title. It is now simply — when.',''+L.name+' ('+L.club+') leads by '+gap+' points and the performance level has been extraordinary all season.','The trophy is being polished. Here we go!']],
    [L.name+' on a different level in '+n+' — '+gap+' point'+(gap>1?'s':'')+' clear.',['There are league leaders. And then there is '+L.name+' ('+L.club+'). '+gap+' points ahead in '+n+' and not showing any sign of slowing down.','The gap to the chasing pack is growing. The title conversation is becoming one-sided.','Exceptional. Here we go!']],
    [''+gap+'-point cushion — '+L.name+' has '+n+' firmly in their grasp.',['Comfortable, controlled, and clinical — that is how to describe '+L.name+'\'s '+n+' season so far.','A '+gap+'-point lead is not just a gap in numbers. It is a psychological stranglehold on the rest of the division.','The title is '+L.name+'\'s to lose now. Here we go!']],
    [L.name+' in a class of their own in '+n+'. '+gap+' points says everything.',['Some teams win. Some teams dominate. '+L.name+' ('+L.club+') is dominating '+n+' — and a '+gap+'-point lead is the proof.','Opponents have tried to find a weakness. They have not found one.','This is a team in the form of its life. Here we go!']],
    ['The '+n+' title race is over before it began — '+L.name+' '+gap+' clear.',['Bold statement — but the numbers support it. '+L.name+' ('+L.club+') has built a '+gap+'-point lead in '+n+' that looks insurmountable.','For the chasing pack, the mathematics are becoming very uncomfortable.','One team has simply been better than everyone else. Here we go!']],
    [''+L.name+' is running riot in '+n+' — '+gap+' point'+(gap>1?'s':'')+' and counting.',['Match after match. Week after week. '+L.name+' ('+L.club+') keeps winning in '+n+', keeps extending their lead, and keeps looking unbeatable.',''+gap+' points is the kind of advantage that usually leads to one outcome: the title.','Relentless. Brilliant. Here we go!']],
    ['Who can stop '+L.name+'? '+gap+' points clear at the top of '+n+'.',['An open question to every manager in '+n+': do you have a plan to beat '+L.name+' ('+L.club+')?','Their '+gap+'-point lead at the top of the table suggests nobody has found one yet.','Championship form. Here we go!']],
    [L.name+' turning '+n+' into a one-horse race. '+gap+' points and pulling away.',['The rest of '+n+' can only watch as '+L.name+' ('+L.club+') continues to build their lead. '+gap+' points at the top now.','From form, to fitness, to mentality — every box is being ticked by this squad.','Vintage title-winning football. Here we go!']],
    ['Astonishing. '+L.name+' '+gap+' points clear — '+n+' title theirs to lose.',['Numbers like these do not happen by accident. '+L.name+' ('+L.club+') has been immaculate in '+n+' — now '+gap+' points ahead.','Title rivals will need a miraculous collapse to catch them now.','Truly special season. Here we go!']],
  ],seed)},

  hotForm:function(r,w,n,seed){return pick([
    [w+' wins in last 5 — do not play '+r.name+' right now.',[r.name+' ('+r.club+') is in the form of their lives in '+n+'. '+w+' wins from the last 5 — that is title-winning form.','Their attacking play has been devastating, their defensive structure solid. The complete package.','If you are facing '+r.name+' next — good luck. Here we go!']],
    [r.name+' on an unstoppable run in '+n+' — '+w+'/5 wins.',['When '+r.name+' gets momentum, they are almost impossible to stop. '+w+' victories from their last 5 games proves that.','The confidence is sky-high, the performances electric. A team believing in themselves.','They have gone from contenders to genuine title challengers. Here we go!']],
    ['The form team of '+n+' — '+r.name+' ('+r.club+') cannot stop winning.',['Form table, recent results — every metric points to the same conclusion: '+r.name+' is the best team in '+n+' right now.',''+w+' wins in their last 5. Scoring freely, conceding little. A manager\'s dream.','Other teams must look at the schedule and hope they avoid '+r.name+'. Here we go!']],
    [r.name+' on fire — '+w+' from 5 in '+n+'. Who can stop them?',['There is only one name on everyone\'s lips in '+n+' right now: '+r.name+' ('+r.club+'). '+w+' wins from 5.','The opposition cannot handle them. The goals are flowing and the performances are electric.','Momentum is a powerful thing. '+r.name+' has it in abundance. Here we go!']],
    ['Warning to '+n+': '+r.name+' is hitting top gear. '+w+'/5 wins.',['If you needed a reminder of what '+r.name+' ('+r.club+') can do when fully focused — this is it. '+w+' wins in their last 5 matches in '+n+'.','Structured, clinical, and utterly relentless. Every opposition manager is now doing extra preparation.','Form like this does not last forever — but while it does, '+r.name+' is unstoppable. Here we go!']],
    [r.name+' marching through '+n+' — '+w+' wins from last 5.',['Form guide. Hot streak. Call it what you want — '+r.name+' ('+r.club+') is tearing through '+n+' right now.',''+w+' wins from their last 5 competitive matches. The rest of the division has taken notice.','A team in this kind of form is very, very dangerous. Here we go!']],
    ['Incredible form: '+r.name+' wins '+w+' of last 5 in '+n+'.',['This is what peak performance looks like in '+n+'. '+r.name+' ('+r.club+') has put together a '+w+'-win run that has the whole division talking.','The quality has been there all season — but these last five games have been something else.','Can they keep it going? On this evidence, absolutely. Here we go!']],
    [r.name+' is the hottest team in '+n+' — '+w+' wins and climbing.',['When '+r.name+' plays like this, '+n+' takes notice. '+w+' wins from their last 5 matches — and the performances have been exceptional.','The manager has clearly found the right formula. The players are executing it perfectly.','This run has title implications written all over it. Here we go!']],
    [''+r.name+' ('+r.club+') on a '+w+'-win streak — fear them in '+n+'.',['The numbers tell the story in '+n+'. '+r.name+' — '+w+' wins from 5. Dominant, determined, and dangerous in equal measure.','Opposing managers are struggling to find answers. The tactical problems posed by '+r.name+' are complex.','When a team wins '+w+' from 5, you sit up and pay attention. Here we go!']],
    ['Do not face '+r.name+' right now — '+w+'/5 in '+n+' and relentless.',['Fair warning to every remaining opponent of '+r.name+' ('+r.club+') in '+n+': this team is in frightening form.',''+w+' wins from their last 5 appearances. Goals scored, clean sheets kept, points accumulated.','This is not a purple patch. This is a title charge. Here we go!']],
    [r.name+' cannot stop scoring and winning in '+n+' — '+w+' from 5.',['Goals, wins, and maximum pressure on the teams above them in '+n+'. '+r.name+' ('+r.club+') is delivering '+w+' wins from 5.','The attacking play has been breathtaking. The defensive organisation equally impressive.','A complete team performance sustained over five matches. Here we go!']],
    ['Form of their season: '+r.name+' blazing through '+n+' with '+w+'/5.',['The best version of '+r.name+' is on full display in '+n+'. '+w+' wins from their last 5 — a run that has elevated them into serious title contention.','From the opening whistle to the final second, they have been exceptional.','The title race just got more interesting. Here we go!']],
  ],seed)},

  coldForm:function(r,l,n,seed){return pick([
    [l+' losses in last 5 — something has gone very wrong for '+r.name+'.',[r.name+' ('+r.club+') is experiencing one of the worst runs in '+n+' this season. '+l+' defeats from last 5.','Goals have dried up, defensive shape all wrong, confidence shattered.','The manager needs answers urgently. Here we go!']],
    [r.name+' in freefall — '+l+' defeats raises serious questions.',['Something is fundamentally broken at '+r.name+' right now. '+l+' consecutive losses in '+n+' — beyond a bad run.','Whether tactical, physical, or mental, problems need identifying and fixing immediately.','Other teams in '+n+' will be watching this collapse with interest. Here we go!']],
    ['Crisis point for '+r.name+' — '+l+' losses from last 5 in '+n+'.',['The alarm bells are ringing at '+r.name+' ('+r.club+'). '+l+' defeats from their last 5 in '+n+' — a run that demands urgent answers.','Every weakness is being exposed. Every opponent is finding a way through.','This is a team in trouble. The next few games are defining. Here we go!']],
    ['What has happened to '+r.name+'? '+l+' losses from 5 in '+n+'.',['A month ago, '+r.name+' ('+r.club+') looked solid. Now — '+l+' losses from 5 in '+n+' and the questions are mounting.','Form has collapsed. Confidence appears to have gone with it. A deeply concerning spell.','Something has to change — and it has to change now. Here we go!']],
    [r.name+' cannot buy a win in '+n+' — '+l+' defeats and counting.',['The '+n+' table does not lie. '+r.name+' ('+r.club+') has accumulated just '+l+' defeats from their last 5 matches — a deeply worrying run.','Tactically lost. Defensively leaky. Short on ideas going forward. A crisis on multiple fronts.','Can they find a way out? Time is running out. Here we go!']],
    ['Alarm bells at '+r.name+' — '+l+' losses in '+n+' raising real concerns.',['The run of results for '+r.name+' ('+r.club+') in '+n+' has been nothing short of alarming. '+l+' defeats from 5 and the performances have been poor.','Motivation, tactical discipline, and basic execution have all been lacking.','This level of performance cannot continue. Something has to give. Here we go!']],
    [r.name+' collapse continues in '+n+'. '+l+' defeats and sliding.',['The slide continues for '+r.name+' ('+r.club+'). '+l+' losses in the last 5 '+n+' matches — each defeat harder to explain than the last.','The squad looks short of confidence, short of ideas, and short of answers.','Urgent action required. Here we go!']],
    ['Struggling and searching for answers — '+r.name+' drops '+l+' of last 5.',['Difficult times at '+r.name+' ('+r.club+'). The '+n+' table shows '+l+' defeats from their last 5 — a run that is costing them dearly in the standings.','Opponents are now approaching games against '+r.name+' with far more confidence than they should.','The only direction from here has to be upward. Here we go!']],
    [r.name+'\'s '+n+' campaign in danger — '+l+' losses from 5 is a crisis.',['It is time to use the word: crisis. '+r.name+' ('+r.club+') has produced '+l+' defeats from 5 in '+n+' and there are no easy excuses left.','Standards have dropped. Results have suffered. The pressure is now extreme.','A response is desperately needed. Here we go!']],
    ['Something is broken at '+r.name+' — '+l+'/5 losses in '+n+'.',['You watch '+r.name+' play in '+n+' right now and it is hard to recognise the team from earlier in the season. '+l+' losses from 5 and the problems run deep.','Individually and collectively, they are not functioning. The system has broken down.','A complete reset may be needed. Here we go!']],
    [r.name+' hitting rock bottom — '+l+' '+n+' defeats and sliding fast.',['The numbers are brutal for '+r.name+' ('+r.club+') in '+n+'. '+l+' defeats from their last 5 matches — and they were not close affairs.','When you lose by these margins in '+n+', it reflects something systemic, not situational.','The turnaround has to start now. Here we go!']],
    ['Worrying times: '+r.name+' loses '+l+' of last 5 in '+n+'.',['Every manager in '+n+' wants to avoid a run like this. '+r.name+' ('+r.club+') is living through it — '+l+' defeats from their last 5.','The confidence is gone. The performances have been below the required standard in '+n+'.','They need a spark, a result, and fast. Here we go!']],
  ],seed)},

  unbeaten:function(r,streak,n,seed){return pick([
    [streak+' games without defeat — '+r.name+' is the iron wall of '+n+'.',[r.name+' ('+r.club+') has now gone '+streak+' matches without losing in '+n+'. That is not a run — that is a statement.','Opponents have tried everything. None of it has worked.','This is what genuine consistency looks like. Here we go!']],
    [r.name+' still standing after '+streak+' — one of '+n+'\'s great unbeaten runs.',['The longer the unbeaten run, the bigger the psychological advantage. '+r.name+' now has '+streak+' games in '+n+' without defeat.','Every opponent who has tried and failed has added another chapter to this extraordinary story.','At what point does unbeaten become invincible? Here we go!']],
    [streak+' and counting — nobody can beat '+r.name+' in '+n+'.',['Here is a challenge for every remaining opponent of '+r.name+' ('+r.club+') in '+n+': stop the run. So far, nobody has managed it.',''+streak+' games without a defeat. A record that commands respect throughout the division.','When does this streak end? Not today, and maybe not soon. Here we go!']],
    [r.name+' invincible in '+n+'? '+streak+' unbeaten and still going.',['The word "invincible" gets used too loosely in football. But '+r.name+' ('+r.club+') is making a case for it in '+n+'.',''+streak+' games undefeated. Win after win, or point after point — they simply refuse to lose.','An extraordinary achievement in a competitive '+n+'. Here we go!']],
    ['The unbreakable '+r.name+' — '+streak+' games unbeaten in '+n+'.',['Break them if you can. Every team in '+n+' has tried. None have succeeded. '+r.name+' ('+r.club+') remains unbeaten after '+streak+' matches.','It is not luck. It is not fortune. It is quality, consistency, and a never-say-die mentality.','This run is becoming legendary in '+n+'. Here we go!']],
    [r.name+' undefeated for '+streak+' — '+n+'\'s most consistent side.',['Consistency is the rarest quality in football. '+r.name+' ('+r.club+') has it in abundance — '+streak+' games unbeaten in '+n+'.','Home or away, against the strong or the weak — the results keep coming.','A truly remarkable run. Here we go!']],
    ['Nobody can touch '+r.name+' in '+n+'. '+streak+'-game unbeaten run.',['The stats paint a simple picture in '+n+'. '+r.name+' does not lose. '+streak+' games — not a single defeat.','The tactical setup is sound, the mentality is bulletproof, and the execution has been superb.','An unbeaten record like this defines careers and seasons. Here we go!']],
    [r.name+' ('+r.club+') — '+streak+' without a loss. Pure class in '+n+'.',['Pure, sustained excellence. '+r.name+' has spent '+streak+' games in '+n+' without tasting defeat.','Every opponent that visits or hosts them finds a wall they cannot break down.','A run that deserves enormous recognition. Here we go!']],
    ['How far can '+r.name+' go? '+streak+' games unbeaten in '+n+'.',['It started quietly. Now it has become the story of the '+n+' season. '+r.name+' ('+r.club+') — '+streak+' games without losing.','The question is no longer whether the streak continues. It is how long it goes on for.','Write the name down: '+r.name+'. Unbeaten. Unstoppable. Here we go!']],
    [streak+' matches, no defeats — '+r.name+' setting the '+n+' standard.',['Standards are being set in '+n+' by '+r.name+' ('+r.club+'). '+streak+' games without a single defeat.','Every clean sheet, every narrow win, every comeback — all part of a run that is growing in stature.','This is what a '+n+' benchmark looks like. Here we go!']],
    ['Extraordinary: '+r.name+' goes '+streak+' games unbeaten in '+n+'.',['The word extraordinary is appropriate here. '+r.name+' ('+r.club+') has completed '+streak+' games in '+n+' without losing — and shows no signs of slipping.','The rest of '+n+' is chasing a team that simply refuses to be beaten.','Elite mentality. Elite results. Here we go!']],
    [r.name+' unstoppable in '+n+' — '+streak+'-game unbeaten run confirmed.',['Confirmed, official, and deeply impressive: '+r.name+' ('+r.club+') has gone '+streak+' games in '+n+' without defeat.','Ask any opponent who has tried to end this run — they will tell you it is harder than it looks.','The run goes on. Here we go!']],
  ],seed)},

  top3:function(p4,p5,g,n,seed){return pick([
    [g+' point'+(g>1?'s':'')+' between podium spots in '+n+' — the top-3 race is on.',['The battle for a top-3 finish in '+n+' has reached its most intense point. '+p4.name+' ('+p4.club+') holds 3rd by just '+g+' point'+(g>1?'s':'')+' over '+p5.name+'.','A single result can flip this. Both players are desperate for that podium finish.','Every game from here is a final. Here we go!']],
    ['Only '+g+' point'+(g>1?'s':'')+' for the last podium spot in '+n+'. Nail-biting.',['Podium place, prize money, bragging rights — '+g+' point'+(g>1?'s':'')+' is all that separates '+p4.name+' ('+p4.club+') and '+p5.name+' ('+p5.club+').','Neither player will give this up without a fight.','The next few results will be absolutely crucial. Here we go!']],
    ['Prize race in '+n+': '+p4.name+' ahead of '+p5.name+' by just '+g+'pts.',['The '+n+' prize race is heating up. '+p4.name+' ('+p4.club+') holds 3rd — but only '+g+' point'+(g>1?'s':'')+' ahead of '+p5.name+' ('+p5.club+').','Season rewards are on the line. One bad result and everything changes.','Both players know exactly what is at stake. Here we go!']],
    [n+' podium fight: '+p4.name+' clings to 3rd — '+p5.name+' hunting them.',['Get comfortable — this '+n+' podium battle is going right to the wire. '+p4.name+' ('+p4.club+') clings to 3rd, just '+g+' point'+(g>1?'s':'')+' above '+p5.name+' ('+p5.club+').','Neither player is backing down. The pressure is immense.','The season rewards are watching. Here we go!']],
    ['Heart in mouth: '+g+'-point gap for the '+n+' bronze spot.',['This is what eFootball Universe is all about. '+p4.name+' and '+p5.name+' — separated by '+g+' point'+(g>1?'s':'')+' in the '+n+' top-3 race.','Every match, every goal, every point matters now. The season prize is within reach for both.','Who wants it more? The pitch will decide. Here we go!']],
    [p4.name+' vs '+p5.name+' — the '+n+' prize-race clash nobody saw coming.',['When the season started, nobody predicted this battle for 3rd in '+n+'. Yet here we are — '+p4.name+' ('+p4.club+') and '+p5.name+' ('+p5.club+') separated by just '+g+' point'+(g>1?'s':'')+'.','The fight for end-of-season rewards is fierce, competitive, and deeply personal.','This is the subplot of the '+n+' season. Here we go!']],
    ['Top-3 or bust: '+n+' prize race down to '+g+' points.',['The season prize in '+n+' is decided by top-3 finish — and right now, the gap between '+p4.name+' ('+p4.club+') in 3rd and '+p5.name+' ('+p5.club+') in 4th is just '+g+' point'+(g>1?'s':'')+'.','Months of hard work could be decided by a single match. That is the beauty and the cruelty of football.','The tension is real. Here we go!']],
    ['Season on the line: '+p4.name+' leads '+p5.name+' by '+g+'pts in '+n+' top-3.',['For '+p4.name+' ('+p4.club+') — the end-of-season reward is '+g+' point'+(g>1?'s':'')+' away from being under threat.','For '+p5.name+' ('+p5.club+') — it is '+g+' point'+(g>1?'s':'')+' away from being secured.','This '+n+' subplot is unmissable. Here we go!']],
  ],seed)},


  penalty:function(r,pts,ptsNow,n,seed){return pick([
    [r.name+' officially deducted '+pts+' point'+(pts!==1?'s':'point')+' in '+n+'. Now on '+ptsNow+'.',[r.name+' ('+r.club+') has been officially deducted '+pts+' point'+(pts!==1?'s':'')+' for rule violations in '+n+'.','They now sit on '+ptsNow+' points — significantly changing their season outlook.','The league has acted swiftly. The integrity of '+n+' must be upheld. Here we go!']],
    ['Point deduction confirmed — '+r.name+' punished for misconduct in '+n+'.',['Official confirmation: '+r.name+' has been handed a '+pts+'-point deduction in '+n+'. A major moment.','Down to '+ptsNow+' points, their position in the table changes meaningfully.','A reminder: the rules exist for a reason. Here we go!']],
    [pts+'-point deduction rocks '+r.name+' in '+n+'. Down to '+ptsNow+'.',['Breaking and significant: '+r.name+' ('+r.club+') has been hit with a '+pts+'-point deduction in '+n+'.','The punishment reflects the seriousness of the violation. This is not a slap on the wrist.',''+ptsNow+' points now — and a completely altered season picture. Here we go!']],
    [''+r.name+' penalised '+pts+' points in '+n+' — a devastating blow.',['The points deduction handed to '+r.name+' ('+r.club+') in '+n+' is a hammer blow to their season.','From '+ptsNow+pts+' to '+ptsNow+' points in one ruling. The table looks very different now.','Rules were broken. Consequences have followed. Here we go!']],
    ['Fair play enforcement: '+r.name+' loses '+pts+' points in '+n+'.',['eFootball Universe takes fair play seriously. And today, '+r.name+' ('+r.club+') has paid the price in '+n+'.','A '+pts+'-point deduction — down to '+ptsNow+' — serves as a warning to every team in the division.','The message is clear: violate the rules, face the consequences. Here we go!']],
    [r.name+' ('+r.club+') hit with '+pts+'-point penalty — '+n+' table flipped.',['Dramatic news from '+n+'. '+r.name+' has been handed a '+pts+'-point deduction and now sits on just '+ptsNow+' points.','The timing could not be worse. The table implications are significant.','No team is above the rules in '+n+'. Here we go!']],
    ['Integrity matters: '+r.name+' deducted '+pts+' points in '+n+'.',['The administrators of '+n+' have acted. '+r.name+' ('+r.club+') — '+pts+' points deducted for misconduct.','Now on '+ptsNow+' points, their season has changed drastically with one ruling.','Every player and manager in '+n+' should take note. Integrity comes first. Here we go!']],
    [n+' takes action — '+r.name+' punished with '+pts+'-point deduction.',['A strong statement from the '+n+' administration today. '+r.name+' ('+r.club+') has been deducted '+pts+' point'+(pts!==1?'s':'')+' for breaching league regulations.','The drop to '+ptsNow+' points changes their standing in the table completely.','Standards exist for a reason. They will be enforced. Here we go!']],
  ],seed)},

  topGoals:function(p,goals,games,n,seed){return pick([
    [p.club+' have scored '+goals+' goals in '+games+' matches — the most in '+n+'.',[p.username+'\'s '+p.club+' are the most prolific side in '+n+' right now.',''+goals+' goals from '+games+' match'+(games!==1?'es:'')+' — '+(goals/Math.max(games,1)).toFixed(1)+' per game. Exceptional.','This is a team set up to score. Here we go!']],
    ['Goals are flowing for '+p.club+' ('+p.username+') — '+goals+' in '+games+' '+n+' games.',['If you want goals in '+n+', watch '+p.club+'. '+p.username+' has them playing with real attacking intent.',''+goals+' goals from '+games+' appearance'+(games!==1?'s:'')+' is the kind of record that demands attention.','Top scoring team. Dangerous to play against. Here we go!']],
    ['Nobody scores more than '+p.club+' in '+n+' — '+goals+' goals from '+games+' games.',['The attacking numbers for '+p.club+' ('+p.username+') in '+n+' are genuinely remarkable.',''+goals+' goals from '+games+' matches. On average, they score '+( goals/Math.max(games,1)).toFixed(1)+' times per game.','Clinical, creative, and unstoppable in front of goal. Here we go!']],
    [p.username+'\'s '+p.club+' — '+goals+' goals and rewriting the '+n+' record books.',['At '+goals+' goals in '+games+' games, '+p.club+' ('+p.username+') is producing the most prolific attacking output in all of '+n+'.','What a team. What an attack. What a season it is becoming for '+p.username+' in '+n+'.','Other managers can only watch and wonder how to replicate it. Here we go!']],
    [''+goals+' goals in '+games+' '+n+' games — '+p.club+'\'s attack is terrifying.',['Numbers do not lie. '+p.club+' (managed by '+p.username+') has scored '+goals+' goals in '+games+' '+n+' matches.','That average of '+(goals/Math.max(games,1)).toFixed(1)+' goals per game is the best in the division by some distance.','This is an attacking side operating at an extraordinary level. Here we go!']],
    ['Goal machine: '+p.club+' leads '+n+' with '+goals+' goals from '+games+' games.',['The most dangerous attacking team in '+n+' is easy to identify. It is '+p.club+' — and the stats prove it.',''+goals+' goals from '+games+' matches. '+p.username+' has built a side that opponents simply cannot contain.','Creative, clinical, and relentless. Here we go!']],
  ],seed)},

  cleansheet:function(p,cs,n,seed){return pick([
    [p.club+' have '+cs+' clean sheets — the meanest defence in '+n+'.',[p.club+' ('+p.username+') is the team opponents dread facing in '+n+'.',''+cs+' clean sheets — a record that reflects outstanding defensive organisation.','Scoring against '+p.club+' is one of the hardest tasks in '+n+'. Here we go!']],
    ['Fortress '+p.club+' — '+cs+' shutouts and the best defensive record in '+n+'.',['The statistics are clear. '+p.username+'\'s '+p.club+' does not concede. '+cs+' clean sheets in '+n+'.','Whether tactical discipline, individual quality, or sheer determination — the results speak.','The blueprint for defensive excellence in '+n+'. Here we go!']],
    [cs+' clean sheets — '+p.club+' is '+n+'\'s most difficult team to score against.',['Attackers beware: '+p.club+' ('+p.username+') does not give goals away in '+n+'.',''+cs+' shutouts from their matches — an extraordinary record that reflects a rock-solid defensive structure.','If you are facing '+p.club+' next, you will need your best finishing boots. Here we go!']],
    [''+p.club+' ('+p.username+') keeping '+n+' at bay — '+cs+' clean sheets.',['A '+cs+'-clean-sheet record in '+n+' tells you everything about the defensive quality of '+p.club+'.','Organised, disciplined, and incredibly hard to break down. '+p.username+' has built a defensive unit that the rest of '+n+' envies.','The best defence in the division. Here we go!']],
    ['Brick wall: '+p.club+' with '+cs+' clean sheets in '+n+'. Nobody scores here.',['Scoring against '+p.club+' ('+p.username+') in '+n+' has become one of the most difficult tasks in football.',''+cs+' clean sheets. The goals against column reads almost nothing. How is this achieved?','Tactical mastery, individual brilliance, and collective determination. Here we go!']],
    ['The '+n+' defence that never breaks — '+p.club+' racks up '+cs+' clean sheets.',['If you want a lesson in defensive football, study '+p.club+' ('+p.username+').',''+cs+' clean sheets in '+n+' — a record that speaks of meticulous preparation and exceptional execution.','The meanest defence in the division, and it is not close. Here we go!']],
  ],seed)},

  bigWin:function(win,los,hg,ag,n,seed){return pick([
    ['DEMOLITION in '+n+' — '+win.username+' '+hg+'-'+ag+' '+los.username+'.',['The '+n+' result of the week — not close. '+win.username+' ('+win.club+') absolutely dismantled '+los.username+' ('+los.club+') with a '+hg+'-'+ag+' victory.','A '+Math.abs(hg-ag)+'-goal winning margin. Defensively solid, attacking ferocious.','This result sends a message. Here we go!']],
    [win.username+' send a statement — '+hg+'-'+ag+' thrashing of '+los.username+'.',['Emphatic. Dominant. Decisive. '+win.username+' ('+win.club+') left absolutely no doubt in '+n+'.',''+hg+'-'+ag+' against '+los.username+'. Deserved from start to finish.','The rest of the league takes notice. Here we go!']],
    ['A '+(hg-ag)+'-goal thrashing — '+win.username+' at their devastating best.',['This is how good '+win.username+' can be. '+hg+'-'+ag+' against '+los.username+' in '+n+'.','The goals came from everywhere. The confidence grew with every minute.','A warning shot to every remaining opponent. Here we go!']],
    ['Sensational: '+win.username+' crushes '+los.username+' '+hg+'-'+ag+' in '+n+'.',['You will not see a more one-sided game in '+n+' this season. '+win.username+' ('+win.club+') was ruthless, relentless, and completely dominant.',''+los.username+' ('+los.club+') had no answers. The '+hg+'-'+ag+' scoreline reflects the gulf in performance.','A landmark result in the '+n+' campaign. Here we go!']],
    [hg+'-'+ag+'. Clinical. Dominant. '+win.username+' at their very best in '+n+'.',['Some performances demand to be remembered. '+win.username+' vs '+los.username+' in '+n+' was one of those.',''+hg+'-'+ag+'. The score tells the story perfectly. Total control from the first minute.','When this team plays like that, nobody can live with them. Here we go!']],
    [win.username+' destroys '+los.username+' '+hg+'-'+ag+' — a '+n+' statement of intent.',['Power. Precision. Performance. '+win.username+' ('+win.club+') has delivered the '+n+' result of the season.',''+hg+'-'+ag+' against '+los.username+' ('+los.club+') — a scoreline that leaves rivals trembling.','The title conversation shifts significantly today. Here we go!']],
    ['Historic hammering in '+n+' — '+win.username+' wins '+hg+'-'+ag+'.',['You cannot overstate how complete '+win.username+' was in this '+n+' fixture. '+hg+'-'+ag+' tells you everything.',''+los.username+' ('+los.club+') was overwhelmed in every department.','A performance for the '+n+' history books. Here we go!']],
    ['FIVE STAR performance: '+win.username+' hammers '+los.username+' in '+n+'.',['This is what peak form looks like in '+n+'. '+win.username+' ('+win.club+') produced a '+hg+'-'+ag+' masterclass against '+los.username+'.','Goals, structure, and a complete team performance. The best display of the '+n+' season so far.','Take a bow. Here we go!']],
  ],seed)},

  goalFest:function(hp,ap,hg,ag,n,seed){return pick([
    [(hg+ag)+' goals shared in '+n+' — the match of the season so far.',['Entertainment of the highest order. '+hp.username+' ('+hp.club+') and '+ap.username+' ('+ap.club+') played out an extraordinary '+(hg+ag)+'-goal game.','The final score of '+hg+'-'+ag+' barely tells the story. End-to-end, relentless, completely unpredictable.','This is why we love football. Here we go!']],
    ['Incredible '+hg+'-'+ag+' thriller in '+n+' — '+(hg+ag)+' goals, no shortage of drama.',['If you were not watching '+hp.username+' vs '+ap.username+' in '+n+', you missed something special.','(hg+ag)+\' goals. Both sides refusing to give an inch. A final score of \'+hg+\'-\'+ag+\' that does not capture how extraordinary this was. Here we go!']],
    [hg+'-'+ag+' and the goals just kept coming — '+n+' at its entertaining best.',['Football does not get much more entertaining than this. '+hp.username+' ('+hp.club+') vs '+ap.username+' ('+ap.club+') in '+n+' produced a '+(hg+ag)+'-goal epic.','Defences were nowhere. Attack was everywhere. The players and fans were exhausted just watching.','The match of the '+n+' season. Here we go!']],
    ['End-to-end carnage: '+(hg+ag)+' goals as '+hp.username+' and '+ap.username+' serve up a '+n+' classic.',['The textbooks will tell you that football is about clean sheets and defensive organisation. Then you watch '+hp.username+' vs '+ap.username+'.',''+hg+'-'+ag+' in '+n+'. '+(hg+ag)+' goals between two sides who simply refused to stop attacking.','Chaotic, brilliant, and utterly unforgettable. Here we go!']],
    ['Goals galore in '+n+': '+hp.username+' '+hg+'-'+ag+' '+ap.username+'.',['The scorers were busy in '+n+' today. '+hp.username+' ('+hp.club+') versus '+ap.username+' ('+ap.club+') delivered a '+(hg+ag)+'-goal thriller.',''+hg+'-'+ag+'. Neither manager will have been happy with the defensive display. The attackers? Delighted.','Pure entertainment. Here we go!']],
    ['Firepower on show: '+(hg+ag)+'-goal '+n+' feast — '+hp.username+' '+hg+'-'+ag+' '+ap.username+'.',['If you wanted attacking football in '+n+', you got it in full. '+hp.username+' ('+hp.club+') and '+ap.username+' ('+ap.club+') gave the neutrals everything they could want.','(hg+ag)+\' goals. A '+hg+\'-\'+ag+\' scoreline. An afternoon of absolute chaos. Here we go!']],
  ],seed)},

  draw:function(hp,ap,hg,ag,n,seed){return pick([
    [hp.username+' '+hg+'-'+ag+' '+ap.username+' — points shared in a competitive '+n+' battle.',[hp.username+' ('+hp.club+') and '+ap.username+' ('+ap.club+') gave everything but could not find a winner.','One side feels a point gained; the other feels two dropped. That is football.','Both teams must move on quickly. Here we go!']],
    ['No winner in '+n+': '+hp.username+' and '+ap.username+' cancel each other out.',['Stalemate. '+hp.username+' and '+ap.username+' fought to a '+hg+'-'+ag+' draw — a result that pleases neither fully.','Competitive, intense, and ultimately inconclusive. Both teams analyse in detail.','Who benefits most from this point? The table will tell us. Here we go!']],
    [hg+'-'+ag+' — hard fought draw in '+n+' as both sides dig in.',['This was a match where neither '+hp.username+' ('+hp.club+') nor '+ap.username+' ('+ap.club+') were willing to lose.','The '+hg+'-'+ag+' scoreline in '+n+' reflects a tight contest where both defences were ultimately equal to the attacking threats.','A point each. The table moves — but not decisively. Here we go!']],
    ['Spoils shared in '+n+' — '+hp.username+' and '+ap.username+' play out '+hg+'-'+ag+' draw.',['Football is not always about winners and losers. Sometimes it is about two evenly matched teams refusing to yield.',''+hp.username+' ('+hp.club+') and '+ap.username+' ('+ap.club+') in '+n+' today — '+hg+'-'+ag+', honours even.','Both sets of players left everything on the pitch. Here we go!']],
    ['Neither side blinks — '+hg+'-'+ag+' in '+n+' between '+hp.username+' and '+ap.username+'.',['The tactical battle in '+n+' was fascinating to watch. '+hp.username+' and '+ap.username+' probed, pressed and tested each other — and ended with a '+hg+'-'+ag+' draw.','Full credit to both for the intensity and quality. Not every game needs a winner.','On to the next one. Here we go!']],
    [hp.username+' and '+ap.username+' share a '+hg+'-'+ag+' draw in tense '+n+' encounter.',['When two competitive sides meet in '+n+', sometimes this is how it ends. '+hp.username+' ('+hp.club+') vs '+ap.username+' ('+ap.club+') — '+hg+'-'+ag+'.','Both teams created chances. Both teams defended well at key moments. A fair result in the end.','Points on the board for both. Here we go!']],
  ],seed)},

  topClash:function(hp,hP,ap,aP,mt,n,seed){return pick([
    ['Top-3 showdown in '+n+' — mark this one in the calendar.',['This is the match '+n+' has been waiting for. '+hp.username+' (#'+hP+', '+hp.club+') vs '+ap.username+' (#'+aP+', '+ap.club+').','Two of the top three going head-to-head. Title race implications enormous.','Scheduled for '+mt+'. Here we go!']],
    ['The '+n+' fixture of the season — top-of-table clash confirmed.',['If the '+n+' title is decided in one moment, this could be it. '+hp.username+' (P'+hP+') vs '+ap.username+' (P'+aP+').','Both teams know what is at stake. A win here is potentially season-defining.','Get ready: '+mt+'. Here we go!']],
    ['Title six-pointer confirmed in '+n+' — '+hp.username+' vs '+ap.username+'.',['Circle it. Mark it. This is the '+n+' match that matters most right now.',''+hp.username+' (#'+hP+', '+hp.club+') versus '+ap.username+' (#'+aP+', '+ap.club+'). Top versus top. The stakes could not be higher.','Scheduled for '+mt+'. Everything on the line. Here we go!']],
    ['MUST SEE: '+hp.username+' faces '+ap.username+' in top '+n+' clash.',['The'+n+' title race goes directly through this fixture. '+hp.username+' ('+hp.club+', #'+hP+') welcomes '+ap.username+' ('+ap.club+', #'+aP+') in what could be a defining game.','Both managers have had this fixture circled for weeks. Both squads have been preparing accordingly.',''+mt+' — do not miss it. Here we go!']],
    [''+n+' blockbuster: #'+hP+' vs #'+aP+' — '+hp.username+' against '+ap.username+'.',['At the top of '+n+', two giants are about to collide. '+hp.username+' ('+hp.club+') and '+ap.username+' ('+ap.club+') — the stakes are as high as they get.','A win for either side could prove decisive in the title race. A draw keeps everything in the balance.',''+mt+'. The most important match in '+n+' right now. Here we go!']],
    ['Get ready for the '+n+' showdown — '+hp.username+' hosts '+ap.username+'.',['The scheduling gods have delivered in '+n+'. '+hp.username+' (#'+hP+') vs '+ap.username+' (#'+aP+').','Both teams in form. Both teams with everything to fight for. This clash has the feel of a classic.','Scheduled: '+mt+'. Here. We. Go!']],
    [''+hp.username+' vs '+ap.username+' — the '+n+' clash everyone is talking about.',['When #'+hP+' meets #'+aP+' in '+n+', something special tends to happen. This time, the stakes are at an all-time high.',''+hp.username+' ('+hp.club+') against '+ap.username+' ('+ap.club+'). The title race distilled into one fixture.','Confirmed for '+mt+'. Prepare yourselves. Here we go!']],
    ['The '+n+' game of the season is here — '+hp.username+' vs '+ap.username+'.',['There are big games in '+n+'. Then there is this. '+hp.username+' (#'+hP+', '+hp.club+') vs '+ap.username+' (#'+aP+', '+ap.club+') at '+mt+'.','Every player on the pitch will know what the result means for the title race.','The whole of '+n+' is watching. Here we go!']],
  ],seed)},

  disputed:function(n,seed){return pick([
    [n+' dispute'+(n>1?'s':'')+' under review — the referee team is on it.',['eFootball Universe currently has '+n+' active match result dispute'+(n>1?'s':'')+' under official investigation.','The referee and admin team are reviewing all available evidence.','Every case will be resolved fairly. Fair play is the foundation of this league. Here we go!']],
    ['Integrity matters: '+n+' contested result'+(n>1?'s are':' is')+' being formally reviewed.',['Fair play alert. '+n+' match result'+(n>1?'s have':' has')+' been disputed and are under investigation.','The process: both sides submit evidence, referee reviews, decision reached.','No result stands if it is dishonest. Here we go!']],
    [n+' result'+(n>1?'s':'')+' under investigation — fair play is non-negotiable.',['The integrity of eFootball Universe depends on every result being honest and accurate. That is why '+n+' dispute'+(n>1?'s are':' is')+' currently under review.','Every piece of evidence is being examined carefully by the referee team.','Trust in the process. Honesty will always win. Here we go!']],
    ['Referee team active — '+n+' match'+(n>1?'es':'')+' under dispute investigation.',['The work of the eFootball Universe referee team is never finished. Today, they are investigating '+n+' disputed result'+(n>1?'s':'')+'.','Screenshot reviews, score verification, testimony assessment — the full process is underway.','Correct outcomes will be delivered. Here we go!']],
  ],seed)},

  mostActive:function(p,g,ln,seed){return pick([
    [p.username+' leads all of '+ln+' with '+g+' matches played.',[p.username+' ('+p.club+', '+ln+') simply cannot stop playing. '+g+' matches — more than any other competitor.','This is what dedication looks like. While others wait, '+p.username+' is on the pitch.','The most active player in eFootball Universe. Here we go!']],
    ['No one plays more than '+p.username+' — '+g+' games and counting.',['The stats do not lie. '+p.username+' ('+p.club+') has played '+g+' matches — the most dedicated competitor.','Every game played is experience gained, every result shapes the season.','If you want to know who takes this league most seriously — look no further. Here we go!']],
    [p.username+' sets the pace in '+ln+' — '+g+' appearances and still going.',['Activity, commitment, and relentless competitiveness. '+p.username+' ('+p.club+') in '+ln+' has played '+g+' matches.','Nobody else has stepped up to the plate as often. Nobody else has shown this level of dedication.','The benchmark for commitment in eFootball Universe. Here we go!']],
    ['Unstoppable work rate: '+p.username+' plays '+g+' times in '+ln+'.',['Some players show up when they feel like it. '+p.username+' ('+p.club+') shows up every single time — '+g+' appearances in '+ln+' prove it.','The most active player in the division. The one who has done the most to shape this season.','Respect where it is due. Here we go!']],
  ],seed)},
};
};

// ── INIT ─────────────────────────────────────────────────────
function initNews(){
  if(_newsInited)return; _newsInited=true;
  // Don't attach our own DB listeners — core.js already listens to
  // ef_matches and ef_penalties and calls debouncedRefresh which will
  // trigger refreshAll → renderNewsAnchor on the home/news pages.
  // We just need one initial generation once data has loaded.
  setTimeout(generateAllNews, 1500);
}

// Called by core.js refreshAll whenever data changes
function refreshNews(){
  if(!_newsInited) return;
  generateAllNews();
}

function generateAllNews(){
  if(!allPlayers||!Object.keys(allPlayers).length)return;
  var items=[];
  ['epl','laliga','seriea','ligue1'].forEach(function(lid){items=items.concat(genLeague(lid));});
  items=items.concat(genCross());
  items.sort(function(a,b){var d=(b.importance||0)-(a.importance||0);return d||Math.random()-.5;});
  _newsCache=items.slice(0,35);_newsGenerated=Date.now();
  if(activePage()==='home')renderNewsAnchor();
  if(typeof renderNewsFeatured==='function')renderNewsFeatured();
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
    if(w>=4){var v=V.hotForm(r,w,lg.n,lid+'hot'+r.uid+w);items.push(makeStory(lid,'form',86,'🔥 '+r.name+' ('+r.club+') — on fire in '+lg.n,v[0],v[1],{uid:r.uid}));}
    if(l>=4){var v=V.coldForm(r,l,lg.n,lid+'cold'+r.uid+l);items.push(makeStory(lid,'crisis',83,'🚨 Crisis at '+r.name+' — '+l+' defeats in '+lg.n,v[0],v[1],{uid:r.uid}));}
  });

  table.forEach(function(r){
    if(r.p<4)return;
    var streak=0,rev=r.form.slice().reverse();
    for(var i=0;i<rev.length;i++){if(rev[i]!=='l')streak++;else break;}
    if(streak>=5){var v=V.unbeaten(r,streak,lg.n,lid+'unb'+r.uid+streak);items.push(makeStory(lid,'unbeaten',85,'🛡 '+r.name+' — '+streak+' games unbeaten in '+lg.n,v[0],v[1],{uid:r.uid}));}
  });

  if(table.length>=5){
    var p4=table[3],p5=table[4],t4g=p4.pts-p5.pts;
    if(t4g<=2&&p4.p>=2){var v=V.top3(p4,p5,t4g,lg.n,lid+'pod'+p4.uid+p5.uid);items.push(makeStory(lid,'podium',82,'🎯 '+lg.n+' top-3 race: '+p4.name+' vs '+p5.name,v[0],v[1]));}
  // Bottom of table — season pride on the line
  if(table.length>=4&&table[table.length-1].p>=2){
    var bot=table[table.length-1],bot2=table[table.length-2];
    var bseed=lid+'btm'+bot.uid+bot.pts;
    var bphrases=[
      [bot.name+' at the foot of '+lg.n+' — pride demands a response.',[bot.name+' ('+bot.club+') finds themselves last in '+lg.n+' with just '+bot.pts+' point'+(bot.pts!==1?'s':'')+'. Nobody wants to finish the season at the bottom.',''+bot2.name+' ('+bot2.club+') above is not comfortable either. The bottom of '+lg.n+' needs shaking up.','Turn it around. Here we go!']],
      ['Wooden spoon watch: '+bot.name+' bottom of '+lg.n+'.',[bot.name+' ('+bot.club+') is at risk of finishing last in '+lg.n+'. Just '+bot.pts+' point'+(bot.pts!==1?'s':'')+' — a return that has to improve.','Season pride is on the line. Every remaining game is a must-win situation.','Nobody wants that wooden spoon. Here we go!']],
      [bot.name+' must dig deep — sitting last in '+lg.n+'.',['Nobody wants to end the season at the bottom of '+lg.n+'. But right now, that is exactly where '+bot.name+' ('+bot.club+') sits.',''+bot.pts+' point'+(bot.pts!==1?'s':'')+' — the effort and determination has to increase significantly.','It is not over. But it needs to start now. Here we go!']],
      ['Season pride at stake — '+bot.name+' last in '+lg.n+'.',['The '+lg.n+' table makes grim reading for '+bot.name+' ('+bot.club+'). Last place with '+bot.pts+' point'+(bot.pts!==1?'s':'')+'.',''+bot2.name+' just above is nervous too. The bottom of '+lg.n+' is a fight for dignity.','Nobody wants to be last when the season ends. Here we go!']],
    ];
    var bv=bphrases[Math.abs((bseed.split('').reduce(function(a,c){return a*31+c.charCodeAt(0);},0)))%bphrases.length];
    items.push(makeStory(lid,'bottomFight',65,'📉 '+bot.name+' at foot of '+lg.n,bv[0],bv[1],{uid:bot.uid}));
  }
  }

  

  table.forEach(function(r){
    if(r.penPts>0){var v=V.penalty(r,r.penPts,r.pts,lg.n,lid+'pen'+r.uid+r.penPts);items.push(makeStory(lid,'penalty',90,'⚡ Point deduction: '+r.name+' ('+r.club+')',v[0],v[1],{uid:r.uid}));}
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
    if(margin>=4&&win&&los){var v=V.bigWin(win,los,m.hg,m.ag,lg.n,seed);items.push(makeStory(lid,'result',81,'💥 '+win.username+' '+m.hg+'-'+m.ag+' '+los.username+' in '+lg.n,v[0],v[1],{homeId:m.homeId,awayId:m.awayId,homeName:hp.username,awayName:ap.username}));}
    else if(tot>=7){var v=V.goalFest(hp,ap,m.hg,m.ag,lg.n,seed);items.push(makeStory(lid,'result',72,'🎆 '+tot+'-goal thriller in '+lg.n,v[0],v[1],{homeId:m.homeId,awayId:m.awayId,homeName:hp.username,awayName:ap.username}));}
    else if(!win&&tot>0){var v=V.draw(hp,ap,m.hg,m.ag,lg.n,seed);items.push(makeStory(lid,'result',63,'🤝 '+hp.username+' and '+ap.username+' share the points',v[0],v[1],{homeId:m.homeId,awayId:m.awayId,homeName:hp.username,awayName:ap.username}));}
  });

  // Upcoming big match
  var upcoming=Object.values(allMatches).filter(function(m){return m.league===lid&&!m.played&&m.matchTime&&m.matchTime>Date.now();}).sort(function(a,b){return a.matchTime-b.matchTime;});
  if(upcoming.length){
    var motw=upcoming[0],hp2=allPlayers[motw.homeId],ap2=allPlayers[motw.awayId];
    if(hp2&&ap2){
      var hP=table.findIndex(function(r){return r.uid===motw.homeId;})+1,aP=table.findIndex(function(r){return r.uid===motw.awayId;})+1;
      var mt=fmtFull(motw.matchTime),seed=lid+'up'+motw.homeId+motw.awayId;
      if(hP>0&&aP>0&&hP<=3&&aP<=3){var v=V.topClash(hp2,hP,ap2,aP,mt,lg.n,seed);items.push(makeStory(lid,'upcoming',93,'🔥 TOP CLASH: '+hp2.username+' vs '+ap2.username+' in '+lg.n,v[0],v[1],{matchId:Object.keys(allMatches).find(function(k){return allMatches[k]===motw;})||'',homeId:motw.homeId,awayId:motw.awayId,homeName:hp2.username,awayName:ap2.username}));}
      else{items.push(makeStory(lid,'upcoming',66,'📅 Next in '+lg.n+': '+hp2.username+' vs '+ap2.username,'Confirmed for '+mt+'.',[hp2.username+' ('+hp2.club+', P'+hP+') hosts '+ap2.username+' ('+ap2.club+', P'+aP+') in the next '+lg.n+' fixture.','Scheduled for '+mt+'. Both managers will be preparing carefully. Here we go!'],{matchId:Object.keys(allMatches).find(function(k){return allMatches[k]===motw;})||'',homeId:motw.homeId,awayId:motw.awayId,homeName:hp2.username,awayName:ap2.username}));}
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
var TYPE_ICON={title:'🏆',form:'🔥',crisis:'🚨',podium:'🎯',bottomFight:'📉',penalty:'⚡',cleansheet:'🧤',goals:'⚽',unbeaten:'🛡',result:'📊',upcoming:'📅',activity:'💪',discipline:'⚠',milestone:'🎉',community:'👥'};
var TYPE_COLOR={title:'#FFE600',form:'#00FF85',crisis:'#FF2882',podium:'#00D4FF',bottomFight:'#FF8C00',penalty:'#FF2882',cleansheet:'#00D4FF',goals:'#FF8C00',unbeaten:'#00FF85',result:'#fff',upcoming:'#FFE600',activity:'#00D4FF',discipline:'#FF2882',milestone:'#FFE600',community:'#00D4FF'};

function renderNewsAnchor(){
  var el=$('news-anchor-section');if(!el)return;
  if(!_newsCache.length){el.innerHTML='<div style="text-align:center;padding:2rem;color:var(--dim)"><div style="font-size:1.5rem;margin-bottom:.5rem">📰</div><div>Generating latest news...</div></div>';return;}
  var a=NEWS_ANCHOR;

  // Anchor header
  var html='<div style="background:linear-gradient(135deg,rgba(0,212,255,0.07),rgba(0,255,133,0.04));border:1px solid rgba(0,212,255,0.2);border-radius:16px;padding:1rem 1.1rem;margin-bottom:1rem;display:flex;align-items:center;gap:.9rem">'
    +'<div style="position:relative;flex-shrink:0;cursor:pointer" onclick="openAnchorBio()" title="About '+a.name+'">'
    +'<img src="'+a.avatar+'" crossorigin onerror="this.src=\'https://ui-avatars.com/api/?name=FR&background=00D4FF&color=100018&bold=true\'" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2.5px solid #00D4FF;box-shadow:0 0 20px rgba(0,212,255,0.4);transition:transform .2s" onmouseover="this.style.transform=\'scale(1.08)\'" onmouseout="this.style.transform=\'\'">'
    +'<div style="position:absolute;bottom:1px;right:1px;width:13px;height:13px;border-radius:50%;background:#00FF85;border:2px solid var(--dark)"></div>'
    +'<div style="position:absolute;inset:0;border-radius:50%;background:rgba(0,212,255,0.15);opacity:0;transition:opacity .2s" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0"></div>'
    +'</div>'
    +'<div style="flex:1;min-width:0"><div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.88rem;color:#fff;cursor:pointer" onclick="openAnchorBio()">'+a.name+'</div>'
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
    // Action buttons
    +(function(){
      var btns='',s=item;
      if((s.type==='upcoming')&&s.homeId&&s.awayId){
        var notMe=!myProfile||(myProfile.uid!==s.homeId&&myProfile.uid!==s.awayId);
        if(notMe) btns+='<button onclick="if(typeof openPredictModal===\'function\')openPredictModal(\''+s.matchId+'\');event.stopPropagation()" style="flex:1;background:linear-gradient(135deg,rgba(255,230,0,0.15),rgba(255,140,0,0.1));border:1px solid rgba(255,230,0,0.4);color:#FFE600;border-radius:10px;padding:9px;font-size:.75rem;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation">\uD83C\uDFAF Predict Score</button>';
        if(s.homeId) btns+='<button onclick="openUserModal(\''+s.homeId+'\');event.stopPropagation()" style="flex:1;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);color:#00D4FF;border-radius:10px;padding:9px;font-size:.72rem;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation">\uD83D\uDC64 '+esc(s.homeName||'Home')+'</button>';
        if(s.awayId) btns+='<button onclick="openUserModal(\''+s.awayId+'\');event.stopPropagation()" style="flex:1;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);color:#00D4FF;border-radius:10px;padding:9px;font-size:.72rem;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation">\uD83D\uDC64 '+esc(s.awayName||'Away')+'</button>';
      }
      if((s.type==='form'||s.type==='crisis'||s.type==='penalty'||s.type==='unbeaten'||s.type==='cleansheet'||s.type==='goals'||s.type==='activity')&&s.uid){
        btns+='<button onclick="openUserModal(\''+s.uid+'\');event.stopPropagation()" style="flex:1;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);color:#00D4FF;border-radius:10px;padding:9px;font-size:.75rem;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation">\uD83D\uDC64 View Profile</button>';
      }
      if(s.type==='result'&&s.homeId&&s.awayId){
        btns+='<button onclick="openUserModal(\''+s.homeId+'\');event.stopPropagation()" style="flex:1;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);color:#00D4FF;border-radius:10px;padding:9px;font-size:.72rem;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation">\uD83D\uDC64 '+esc(s.homeName||'Home')+'</button>';
        btns+='<button onclick="openUserModal(\''+s.awayId+'\');event.stopPropagation()" style="flex:1;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.25);color:#00D4FF;border-radius:10px;padding:9px;font-size:.72rem;font-weight:700;cursor:pointer;font-family:inherit;touch-action:manipulation">\uD83D\uDC64 '+esc(s.awayName||'Away')+'</button>';
      }
      return btns?'<div style="display:flex;gap:.45rem;margin-top:.8rem;flex-wrap:wrap">'+btns+'</div>':'';
    })()
    // Byline — clickable to open bio
    +'<div style="display:flex;align-items:center;gap:.55rem;margin-top:.7rem;padding-top:.65rem;border-top:1px solid rgba(255,255,255,0.07);cursor:pointer" onclick="openAnchorBio()">'
    +'<img src="'+a.avatar+'" crossorigin onerror="this.style.display=\'none\'" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1.5px solid rgba(0,212,255,0.4)">'
    +'<div><div style="font-size:.72rem;font-weight:700;color:#00D4FF">'+a.name+' <span style="font-size:.58rem;color:var(--dim);font-weight:400">· tap for bio</span></div>'
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
// After news generates, update the home featured panel too
function updateNewsTicker(){
  var bar=$('news-ticker-bar'),track=$('news-ticker-track');
  if(!bar||!track)return;
  if(!_newsCache.length){setTimeout(updateNewsTicker,3000);return;}
  var html=_newsCache.slice(0,14).map(function(n){return'<span class="news-ticker-item"><span class="news-ticker-dot"></span>'+n.headline+'</span>';}).join('');
  track.innerHTML=html+html;
  bar.classList.add('visible');
}

// ── HOME FEATURED NEWS — last 2 stories shown on home screen ──
function renderNewsFeatured(){
  var el=document.getElementById('news-featured');if(!el)return;
  if(!_newsCache.length){el.innerHTML='';return;}
  var a=NEWS_ANCHOR;
  var top=_newsCache.slice(0,2);
  var html='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.55rem">'
    +'<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:#00D4FF;letter-spacing:1.5px">📰 LATEST NEWS</div>'
    +'<button onclick="goPage(\'news\')" class="btn-xs" style="font-size:.6rem;color:#00D4FF;border-color:rgba(0,212,255,0.3)">All Stories →</button>'
    +'</div>';
  top.forEach(function(item,i){
    var lg=LGS[item.lid]||{},tc=TYPE_COLOR[item.type]||'#00D4FF',ti=TYPE_ICON[item.type]||'📰';
    html+='<div onclick="goPage(\'news\');setTimeout(function(){openNewsStory('+i+')},300)" '
      +'style="background:var(--card);border:1px solid rgba(0,212,255,0.12);border-radius:12px;'
      +'padding:.75rem .85rem;margin-bottom:.4rem;cursor:pointer;transition:all .2s;'
      +'animation:fadein .3s ease">'
      +'<div style="display:flex;align-items:flex-start;gap:.5rem">'
      +'<div style="font-size:.95rem;flex-shrink:0">'+ti+'</div>'
      +'<div style="flex:1;min-width:0">'
      +(item.lid!=='all'?'<span style="font-size:.48rem;font-weight:700;padding:1px 5px;border-radius:3px;'
        +'background:'+(lg.bg||'rgba(255,255,255,0.05)')+';color:'+(lg.c||'#aaa')+';">'+(lg.short||'')+'</span> ':'')
      +'<div style="font-size:.76rem;font-weight:700;color:#fff;margin:.1rem 0">'
      +item.headline+'</div>'
      +'<div style="font-size:.64rem;color:#999">'+item.subline+'</div>'
      +'</div>'
      +'<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="'+tc+'" stroke-width="2.5" '
      +'style="flex-shrink:0;opacity:.5;margin-top:3px"><polyline points="9 18 15 12 9 6"/></svg>'
      +'</div>'
      +'<div style="display:flex;align-items:center;gap:.4rem;margin-top:.45rem;padding-top:.4rem;'
      +'border-top:1px solid rgba(255,255,255,0.05)">'
      +'<img src="'+a.avatar+'" crossorigin onerror="this.style.display=\'none\'" '
      +'style="width:16px;height:16px;border-radius:50%;object-fit:cover;border:1px solid rgba(0,212,255,0.3)">'
      +'<span style="font-size:.58rem;color:#00D4FF;font-weight:700">'+a.name+'</span>'
      +'<span style="font-size:.55rem;color:var(--dim)">· '+fmtAgo(_newsGenerated)+'</span>'
      +'</div>'
      +'</div>';
  });
  el.innerHTML=html;
}
