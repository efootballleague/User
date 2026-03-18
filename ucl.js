// ============================================================
// UCL.JS — Champions League: Bracket + Paystack Payments
// ============================================================

function renderUCL() {
  var pg = $('page-ucl'); if (!pg) return;

  // Top 4 from each league = 16 seeds — FIX: use correct IDs
  var seeds = [];
  UCL_LEAGUES.forEach(function (lid) {
    computeStd(lid).slice(0, 4).forEach(function (r, i) {
      seeds.push(Object.assign({}, r, { league: lid, seed: i + 1 }));
    });
  });

  var fee      = parseFloat(uclSettings.fee) || 0;
  var cur      = uclSettings.currency || '$';
  var paidList = Object.values(uclPayments).filter(function (p) { return p.status === 'confirmed'; });
  var pool     = paidList.length * fee;
  var p1       = (pool * 0.7).toFixed(2);
  var p2       = (pool * 0.3).toFixed(2);
  var isAdmin  = me && me.email === ADMIN_EMAIL;
  var myPay    = myProfile ? (uclPayments[myProfile.uid] || null) : null;
  var iQ       = myProfile && seeds.some(function (s) { return s.uid === myProfile.uid; });

  var html =
    '<div class="section-header"><div class="section-title c-gold">Champions League</div><div class="section-line gold"></div></div>'
    // Prize cards
    + '<div class="ucl-prizes">'
    + '<div class="ucl-prize gold"><div class="ucl-prize-label">1st Place</div><div class="ucl-prize-val">' + (fee > 0 && pool > 0 ? cur + p1 : fee > 0 ? cur + '?' : '--') + '</div></div>'
    + '<div class="ucl-prize silver"><div class="ucl-prize-label">2nd Place</div><div class="ucl-prize-val">' + (fee > 0 && pool > 0 ? cur + p2 : fee > 0 ? cur + '?' : '--') + '</div></div>'
    + '<div class="ucl-prize cyan"><div class="ucl-prize-label">Prize Pool</div><div class="ucl-prize-val" style="color:var(--cyan)">' + cur + pool.toFixed(2) + '</div><div style="font-size:.6rem;color:var(--dim)">' + paidList.length + '/16 paid</div></div>'
    + '</div>'
    // My fee status
    + (iQ ? '<div class="ucl-fee-box">'
      + '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--dim);letter-spacing:1.5px;margin-bottom:.5rem">YOUR ENTRY</div>'
      + (!fee ? '<div style="font-size:.76rem;color:var(--dim)">Admin has not set the entry fee yet.</div>'
        : !myPay ? '<button class="btn-primary" onclick="openUCLPay()">Pay Entry Fee (' + cur + fee + ')</button>'
        : myPay.status === 'pending' ? '<div style="font-size:.76rem;color:var(--gold)">Payment submitted — admin reviewing.</div>'
        : myPay.status === 'confirmed' ? '<div style="font-size:.76rem;color:var(--green)">Spot locked!</div>'
        : '<button class="btn-primary" onclick="openUCLPay()">Pay (' + cur + fee + ')</button>')
      + '</div>' : '')
    // Rules
    + '<div class="ucl-rules"><div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--gold);letter-spacing:1.5px;margin-bottom:.4rem">HOW IT WORKS</div>'
    + '<div style="font-size:.74rem;color:var(--dim);line-height:1.6">Top 4 from each league (16 total) qualify · Pay entry fee · 70% to 1st, 30% to 2nd · No payment in 48hrs = forfeit spot</div>'
    + '</div>'
    // Qualified players
    + '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--dim);letter-spacing:1.5px;margin:1rem 0 .5rem">QUALIFIED</div>'
    + '<div class="grid2">' + (seeds.length ? seeds.map(function (s) {
      var p    = allPlayers[s.uid]; if (!p) return '';
      var lg   = LGS[s.league] || {};
      var paid = uclPayments[s.uid] && uclPayments[s.uid].status === 'confirmed';
      return '<div class="card" style="padding:.7rem;display:flex;align-items:center;gap:.5rem">'
        + clubBadge(p.club, s.league, 26)
        + '<div style="flex:1;min-width:0"><div style="font-size:.78rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.username) + '</div>'
        + '<div style="font-size:.6rem;color:' + lg.c + '">' + esc(lg.short || '') + ' #' + s.seed + '</div></div>'
        + '<div style="font-size:.65rem;color:' + (paid ? 'var(--green)' : 'var(--dim)') + '">' + (paid ? 'Paid' : 'Unpaid') + '</div>'
        + '</div>';
    }).join('') : '<div class="card empty" style="grid-column:span 2">No qualifiers yet. Complete your league season first.</div>') + '</div>'
    // Bracket
    + '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--dim);letter-spacing:1.5px;margin:1rem 0 .5rem">BRACKET</div>'
    + '<div id="ucl-bracket" style="overflow-x:auto">' + renderBracket(seeds, paidList) + '</div>'
    // Admin panel
    + (isAdmin ? renderUCLAdmin() : '');

  pg.innerHTML = html;
}

function renderBracket(seeds, paidList) {
  if (seeds.length < 8) return '<div class="card empty">Bracket available once 8+ players qualify.</div>';
  // Simple bracket display
  var rounds = ['Quarter Finals', 'Semi Finals', 'Final'];
  var matches = [
    [seeds[0], seeds[7]], [seeds[1], seeds[6]], [seeds[2], seeds[5]], [seeds[3], seeds[4]]
  ];
  var html = '<div style="display:flex;gap:.5rem;overflow-x:auto;padding-bottom:.5rem">';
  rounds.forEach(function (round, ri) {
    html += '<div style="min-width:140px">'
      + '<div style="font-family:Orbitron,sans-serif;font-size:.58rem;color:var(--dim);letter-spacing:1px;margin-bottom:.4rem;text-align:center">' + round + '</div>';
    var roundMatches = ri === 0 ? matches : Array(Math.pow(2, 1 - ri) + 1).fill(null).map(function () { return [null, null]; });
    roundMatches.forEach(function (pair) {
      html += '<div style="background:var(--card);border:1px solid var(--border);border-radius:8px;padding:.45rem .6rem;margin-bottom:.4rem">'
        + '<div style="font-size:.7rem;font-weight:700;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:.25rem;margin-bottom:.25rem">'
        + (pair && pair[0] ? esc((allPlayers[pair[0].uid] || {}).username || '?') : 'TBD') + '</div>'
        + '<div style="font-size:.7rem;font-weight:700">'
        + (pair && pair[1] ? esc((allPlayers[pair[1].uid] || {}).username || '?') : 'TBD') + '</div>'
        + '</div>';
    });
    html += '</div>';
  });
  html += '</div>';
  return html;
}

function renderUCLAdmin() {
  return '<div style="background:rgba(255,40,130,0.05);border:1px solid rgba(255,40,130,0.15);border-radius:12px;padding:.9rem;margin-top:1rem">'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--pink);letter-spacing:1.5px;margin-bottom:.7rem">ADMIN — UCL SETTINGS</div>'
    + '<div class="form-row">'
    + '<div class="form-group"><label class="lbl">Entry Fee</label><input class="inp" id="ucl-fee-inp" type="number" min="1" placeholder="e.g. 5" value="' + (uclSettings.fee || '') + '"></div>'
    + '<div class="form-group"><label class="lbl">Currency</label><input class="inp" id="ucl-cur-inp" placeholder="NGN" value="' + (uclSettings.currency || '') + '"></div>'
    + '</div>'
    + '<div class="form-row">'
    + '<div class="form-group" style="flex:2"><label class="lbl">Paystack Key</label><input class="inp" id="ucl-pk-inp" placeholder="pk_live_..." value="' + (uclSettings.pk || PAYSTACK_PK || '') + '"></div>'
    + '<div class="form-group"><label class="lbl">Account Email</label><input class="inp" id="ucl-acct-inp" placeholder="you@email.com" value="' + (uclSettings.acctEmail || '') + '"></div>'
    + '</div>'
    + '<button class="btn-primary" onclick="saveUCLSettings()">Save Settings</button>'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--dim);letter-spacing:1px;margin-top:.9rem;margin-bottom:.4rem">PAYMENTS</div>'
    + '<div id="ucl-payment-log">' + renderUCLPayLog() + '</div>'
    + '</div>';
}

function saveUCLSettings() {
  if (!db || !me || me.email !== ADMIN_EMAIL) return;
  var fee     = parseFloat($('ucl-fee-inp').value) || 0;
  var cur     = $('ucl-cur-inp').value.trim() || '$';
  var pk      = $('ucl-pk-inp').value.trim();
  var acct    = $('ucl-acct-inp').value.trim();
  db.ref(DB.uclSet).update({ fee:fee, currency:cur, pk:pk, acctEmail:acct })
    .then(function () { toast('UCL settings saved!'); });
}

function renderUCLPayLog() {
  var pays = Object.entries(uclPayments);
  if (!pays.length) return '<div style="font-size:.74rem;color:var(--dim)">No payments yet.</div>';
  return pays.map(function (kv) {
    var uid = kv[0], pay = kv[1];
    var p   = allPlayers[uid];
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:.74rem">'
      + '<span>' + esc(p ? p.username : uid) + '</span>'
      + '<span style="color:' + (pay.status==='confirmed'?'var(--green)':pay.status==='pending'?'var(--gold)':'var(--pink)') + '">' + esc(pay.status || '') + '</span>'
      + (pay.status === 'pending' && me && me.email === ADMIN_EMAIL
        ? '<button class="btn-xs" onclick="confirmUCLPayment(\'' + uid + '\')">Confirm</button>' : '')
      + '</div>';
  }).join('');
}

function confirmUCLPayment(uid) {
  if (!db || !me || me.email !== ADMIN_EMAIL) return;
  db.ref(DB.uclPay + '/' + uid).update({ status:'confirmed', confirmedAt:Date.now(), confirmedBy:me.uid })
    .then(function () {
      toast('Payment confirmed for ' + (allPlayers[uid] ? allPlayers[uid].username : uid));
      sendNotif(uid, { title:'UCL Payment Confirmed', body:'Your spot is locked! Get ready.', icon:'trophy' });
      renderUCL();
    });
}

// ── PAYSTACK PAYMENT ──────────────────────────────────────────
function openUCLPay() {
  if (!myProfile) { showLanding(); return; }
  var fee = parseFloat(uclSettings.fee) || 0;
  var cur = uclSettings.currency || 'NGN';
  if (!fee) { toast('Entry fee not set yet.', 'error'); return; }
  $('modal-prize-1').textContent = cur + (fee * 16 * 0.7).toFixed(2);
  $('modal-prize-2').textContent = cur + (fee * 16 * 0.3).toFixed(2);
  $('modal-fee-display').textContent = cur + fee;
  $('pay-err').textContent = '';
  openMo('ucl-pay-mo');
}

function launchPaystack() {
  var fee  = parseFloat(uclSettings.fee) || 0;
  var cur  = uclSettings.currency || 'NGN';
  var pk   = uclSettings.pk || PAYSTACK_PK;
  var acct = uclSettings.acctEmail || '';
  var err  = $('pay-err');

  if (!fee)  { err.textContent = 'Entry fee not configured.'; return; }
  if (!pk)   { err.textContent = 'Payment not configured.'; return; }
  if (!acct) { err.textContent = 'Recipient email not configured.'; return; }

  var btn = $('pay-submit-btn');
  btn.textContent = 'Opening payment...'; btn.disabled = true;

  // Save pending record first
  db.ref(DB.uclPay + '/' + myProfile.uid).set({
    uid:       myProfile.uid,
    username:  myProfile.username,
    amount:    fee,
    currency:  cur,
    status:    'pending',
    createdAt: Date.now()
  }).then(function () {
    var handler = PaystackPop.setup({
      key:        pk,
      email:      myProfile.email || me.email,
      amount:     fee * 100,
      currency:   cur,
      ref:        'UCL_' + myProfile.uid + '_' + Date.now(),
      metadata:   { uid: myProfile.uid, username: myProfile.username },
      callback:   function (response) {
        db.ref(DB.uclPay + '/' + myProfile.uid).update({ paystackRef:response.reference, paidAt:Date.now() })
          .then(function () {
            closeMo('ucl-pay-mo');
            toast('Payment submitted! Admin will confirm shortly.');
            btn.textContent = 'Pay & Lock My Spot'; btn.disabled = false;
          });
      },
      onClose: function () {
        btn.textContent = 'Pay & Lock My Spot'; btn.disabled = false;
      }
    });
    handler.openIframe();
  });
}
