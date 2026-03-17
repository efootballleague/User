// ============================================================
// UCL
// ============================================================
function renderUCL(){
  var seeds=[];
  ['epl','esl','ebl','esc'].forEach(function(lid){computeStd(lid).slice(0,4).forEach(function(r,i){seeds.push(Object.assign({},r,{league:lid,seed:i+1}));});});
  var fee=parseFloat(uclSettings.fee)||0,cur=uclSettings.currency||'$';
  var paidList=Object.values(uclPayments).filter(function(p){return p.status==='confirmed';});
  var pool=paidList.length*fee,p1=(pool*.7).toFixed(2),p2=(pool*.3).toFixed(2);
  var e1=$('prize-1st'),e2=$('prize-2nd'),ep=$('prize-pool-total'),ec=$('ucl-paid-count');
  if(e1)e1.textContent=fee>0?(pool>0?cur+p1:cur+'?'):'--';
  if(e2)e2.textContent=fee>0?(pool>0?cur+p2:cur+'?'):'--';
  if(ep)ep.textContent=fee>0?cur+pool.toFixed(2):'$0';
  if(ec)ec.textContent=paidList.length;
  var myPay=myProfile?uclPayments[myProfile.uid]||null:null;
  var iQ=myProfile&&seeds.some(function(s){return s.uid===myProfile.uid;});
  var fs=$('ucl-fee-section');
  if(fs){
    if(!iQ){fs.style.display='none';}
    else{
      fs.style.display='block';var sH='',pA='';
      if(!fee){sH='<span class="usb usb-pend">Fee not set</span>';pA='<div style="font-size:.76rem;color:var(--dim)">Admin has not set the entry fee yet.</div>';}
      else if(!myPay){sH='<span class="usb usb-unpaid">Unpaid</span>';pA='<button class="pay-btn" style="margin-top:.5rem" onclick="openUCLPay()">Pay Entry Fee ('+cur+fee+')</button>';}
      else if(myPay.status==='pending'){sH='<span class="usb usb-pend">Pending</span>';pA='<div style="font-size:.76rem;color:#FFE600">Payment submitted - admin reviewing.</div>';}
      else if(myPay.status==='confirmed'){sH='<span class="usb usb-paid">Paid</span>';pA='<div style="font-size:.76rem;color:#00FF85">Spot locked!</div>';}
      var ms=$('ucl-my-status'),pa=$('ucl-pay-area');
      if(ms)ms.innerHTML=sH;if(pa)pa.innerHTML=pA;
    }
  }
  var ac=$('ucl-admin-controls');
  if(ac){
    ac.style.display=(me&&me.email===ADMIN_EMAIL)?'block':'none';
    if(me&&me.email===ADMIN_EMAIL){
      var fi=$('ucl-fee-inp');if(fi&&!fi.value)fi.value=fee||'';
      var ci=$('ucl-cur-inp');if(ci&&!ci.value)ci.value=uclSettings.currency||'$';
      var pi=$('ucl-pk-inp');if(pi&&!pi.value)pi.value=uclSettings.pk||PAYSTACK_PK;
      var ai=$('ucl-acct-inp');if(ai&&!ai.value)ai.value=uclSettings.acctEmail||'';
      renderUCLPayLog();
    }
  }
  var ss=$('ucl-seeds');
  if(ss){
    ss.innerHTML=seeds.length?seeds.map(function(s,i){
      var lg=LGS[s.league]||{};
      var pay=uclPayments[s.uid];
      var pb=!fee?'':pay&&pay.status==='confirmed'?'<span class="usb usb-paid" style="font-size:.52rem">Paid</span>':pay&&pay.status==='pending'?'<span class="usb usb-pend" style="font-size:.52rem">Pending</span>':'<span class="usb usb-unpaid" style="font-size:.52rem">Unpaid</span>';
      return'<div class="card" style="padding:.82rem;display:flex;align-items:center;gap:.65rem;border:1px solid '+lg.c+'33">'
        +'<div style="font-family:Orbitron,sans-serif;font-weight:900;font-size:.85rem;color:#FFE600;min-width:20px">#'+(i+1)+'</div>'
        +clubBadge(s.club,30)
        +'<div style="flex:1"><div style="font-weight:700;font-size:.8rem">'+esc(s.name)+'</div>'
        +'<div style="font-size:.6rem;color:var(--dim)">'+esc(s.club)+'</div>'
        +'<div style="font-size:.6rem;color:'+lg.c+'">'+esc(lg.n||'')+'</div></div>'
        +'<div style="text-align:right"><div style="font-family:Orbitron,sans-serif;font-weight:900;color:#FFE600;font-size:.8rem">'+s.pts+'pts</div>'+pb+'</div></div>';
    }).join(''):'<div class="card" style="padding:1.2rem;text-align:center;color:var(--dim)">Register and play to qualify!</div>';
  }
  var br=$('ucl-bracket');
  if(br){
    var pad=function(s){return s||{name:'TBD',club:'--'};};
    var rounds=[
      {t:'QF',ms:[{h:pad(seeds[0]),a:pad(seeds[15])},{h:pad(seeds[1]),a:pad(seeds[14])},{h:pad(seeds[2]),a:pad(seeds[13])},{h:pad(seeds[3]),a:pad(seeds[12])}]},
      {t:'SF',ms:[{h:{name:'QF1 Win'},a:{name:'QF2 Win'}},{h:{name:'QF3 Win'},a:{name:'QF4 Win'}}]},
      {t:'Final',ms:[{h:{name:'SF1 Win'},a:{name:'SF2 Win'}}]}
    ];
    br.innerHTML=rounds.map(function(r){
      return'<div style="flex:1;display:flex;flex-direction:column;gap:.55rem">'
        +'<div style="text-align:center;font-family:Orbitron,sans-serif;font-size:.56rem;font-weight:700;letter-spacing:2px;color:#FFE600;margin-bottom:.28rem">'+r.t+'</div>'
        +r.ms.map(function(m){
          return'<div style="background:var(--card);border:1px solid rgba(255,230,0,0.13);border-radius:8px;overflow:hidden">'
            +'<div style="padding:5px 9px;display:flex;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.04);font-size:.7rem;font-weight:600"><span>'+esc(m.h.name||'TBD')+'</span><span style="color:var(--dim)">?</span></div>'
            +'<div style="padding:5px 9px;display:flex;justify-content:space-between;font-size:.7rem;font-weight:600"><span>'+esc(m.a.name||'TBD')+'</span><span style="color:var(--dim)">?</span></div></div>';
        }).join('')+'</div>';
    }).join('');
  }
}
function openUCLPay(){
  if(!myProfile){showLanding();return;}
  if(!uclSettings.pk||!uclSettings.fee){toast('Payment not configured. Contact admin.','error');return;}
  var fee=parseFloat(uclSettings.fee),cur=uclSettings.currency||'NGN';
  var pool=Object.values(uclPayments).filter(function(p){return p.status==='confirmed';}).length*fee;
  var m1=$('modal-prize-1'),m2=$('modal-prize-2'),mf=$('modal-fee-display');
  if(m1)m1.textContent=pool>0?cur+(pool*.7).toFixed(2):cur+'?';
  if(m2)m2.textContent=pool>0?cur+(pool*.3).toFixed(2):cur+'?';
  if(mf)mf.textContent=cur+fee;
  var pe=$('pay-err');if(pe)pe.textContent='';
  openMo('ucl-pay-mo');
}
function launchPaystack(){
  if(!myProfile){toast('Login first','error');return;}
  var pe=$('pay-err');if(pe)pe.textContent='';
  var pk=uclSettings.pk||PAYSTACK_PK,fee=parseFloat(uclSettings.fee),cur=(uclSettings.currency||'NGN').toUpperCase();
  if(!pk||!fee){if(pe)pe.textContent='Payment not configured.';return;}
  if(typeof PaystackPop==='undefined'){if(pe)pe.textContent='Paystack not loaded. Check connection.';return;}
  var btn=$('pay-submit-btn');btn.textContent='Opening...';btn.disabled=true;
  PaystackPop.setup({
    key:pk,email:myProfile.email,amount:Math.round(fee*100),currency:cur,
    ref:'UCL-'+myProfile.uid+'-'+Date.now(),
    onSuccess:function(tx){
      btn.textContent='Pay & Lock My Spot';btn.disabled=false;
      db.ref('ef_ucl_payments/'+myProfile.uid).set({uid:myProfile.uid,username:myProfile.username,club:myProfile.club,email:myProfile.email,ref:tx.reference,status:'confirmed',confirmedAt:Date.now(),fee:fee,currency:cur,method:'paystack'})
        .then(function(){closeMo('ucl-pay-mo');toast('Payment confirmed! UCL spot locked!');})
        .catch(function(){toast('Payment done! Contact admin with ref: '+tx.reference,'error');});
    },
    onCancel:function(){btn.textContent='Pay & Lock My Spot';btn.disabled=false;if(pe)pe.textContent='Cancelled.';}
  }).openIframe();
}
function saveUCLSettings(){
  if(!me||me.email!==ADMIN_EMAIL){toast('Admin only','error');return;}
  var pk=($('ucl-pk-inp')?$('ucl-pk-inp').value:'').trim();
  var fee=parseFloat($('ucl-fee-inp').value);
  var cur=($('ucl-cur-inp').value||'NGN').trim().toUpperCase();
  var acct=($('ucl-acct-inp')?$('ucl-acct-inp').value:'').trim();
  if(!pk||!pk.startsWith('pk_')){toast('Invalid Paystack key','error');return;}
  if(isNaN(fee)||fee<=0){toast('Invalid fee','error');return;}
  db.ref('ef_ucl_settings').set({pk:pk,fee:fee,currency:cur,acctEmail:acct,updatedAt:Date.now()})
    .then(function(){toast('UCL settings saved!');}).catch(function(){toast('Failed','error');});
}
function renderUCLPayLog(){
  var el=$('ucl-payment-log');if(!el)return;
  var pays=Object.values(uclPayments);
  if(!pays.length){el.innerHTML='<div style="color:var(--dim)">No payments yet.</div>';return;}
  pays.sort(function(a,b){return(b.submittedAt||0)-(a.submittedAt||0);});
  el.innerHTML=pays.map(function(p){
    var sc=p.status==='confirmed'?'#00FF85':p.status==='rejected'?'#FF2882':'#FFE600';
    return'<div style="background:var(--card);border:1px solid var(--border);border-radius:9px;padding:.65rem .85rem;display:flex;align-items:center;gap:.65rem;flex-wrap:wrap;margin-bottom:.4rem">'
      +'<div style="flex:1"><div style="font-weight:700;font-size:.8rem">'+esc(p.username)+'</div>'
      +'<div style="font-size:.63rem;color:var(--dim)">Ref: '+esc(p.ref||'--')+' - '+(p.currency||'$')+(p.fee||'?')+'</div></div>'
      +'<span style="font-size:.6rem;font-weight:700;color:'+sc+'">'+esc((p.status||'').toUpperCase())+'</span>'
      +(p.status==='pending'?'<div style="display:flex;gap:4px"><button class="bg" style="font-size:.65rem;padding:4px 9px" onclick="confirmUCLPay(\''+p.uid+'\',\''+esc(p.username)+'\')">Confirm</button><button class="bd" style="font-size:.65rem;padding:4px 9px" onclick="rejectUCLPay(\''+p.uid+'\',\''+esc(p.username)+'\')">Reject</button></div>':'')
      +'</div>';
  }).join('');
}
function confirmUCLPay(uid,name){db.ref('ef_ucl_payments/'+uid).update({status:'confirmed',confirmedAt:Date.now()}).then(function(){toast(name+" payment confirmed!");}).catch(function(){toast('Failed','error');});}
function rejectUCLPay(uid,name){if(!confirm('Reject payment from '+name+'?'))return;db.ref('ef_ucl_payments/'+uid).update({status:'rejected',rejectedAt:Date.now()}).then(function(){toast('Payment rejected.');}).catch(function(){toast('Failed','error');});}