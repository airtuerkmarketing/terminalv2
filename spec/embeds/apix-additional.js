
(function(){
var IMG = {
  charter:     'https://cdn.prod.website-files.com/68d6684f885f73c332639c8e/69e9f685efee263a505b6beb_charter.png',
  fullcharter: 'https://cdn.prod.website-files.com/68d6684f885f73c332639c8e/69e9f6861ffad85de7baba82_full-charter.png',
  scheduled:   'https://cdn.prod.website-files.com/68d6684f885f73c332639c8e/69e9f685c48bf5627425dba9_scheduled-flights.png',
  ndc:         'https://cdn.prod.website-files.com/68d6684f885f73c332639c8e/69e9f68533e00a21be774578_a3f853437f3e6e08018c406483c5f42d_ndc-direct.png',
  leftover:    'https://cdn.prod.website-files.com/68d6684f885f73c332639c8e/69e9f685607fd07fc95ba809_left-over-seats.png'
};
/* Lucide icon NAME per id (browse names at lucide.dev). Edit a name to swap an icon. */
var ICONS={
  content:'file-text', payment:'credit-card', features:'sparkles',
  volumedeals:'tags', conditions:'route', luggage:'luggage',
  refund:'rotate-ccw', invoicing:'receipt',
  multiairline:'combine', checkin:'circle-check', cache:'database',
  schedule:'calendar-clock', ssr:'accessibility', oneway:'arrow-left-right',
  b2b:'briefcase', b2c:'user-round'
};
/* per-module color themes — content blue, payment green, features orange */
var THEME={
  content: {c:'#0A82DF', soft:'#EFF6FE', g1:'#EFF6FE', g2:'#CFE4F9'},
  payment: {c:'#16a34a', soft:'#ECFDF3', g1:'#ECFDF3', g2:'#C3EFD3'},
  features:{c:'#EA580C', soft:'#FFF3EC', g1:'#FFF4ED', g2:'#FBD7BE'}
};
function lucideRefresh(){ if(window.lucide&&window.lucide.createIcons)window.lucide.createIcons(); }
function whenLucide(cb){ if(window.lucide&&window.lucide.createIcons)return cb();
  var t=setInterval(function(){ if(window.lucide&&window.lucide.createIcons){clearInterval(t);cb();} },40);
  setTimeout(function(){clearInterval(t)},8000); }
function ax_injectIcons(){
  document.querySelectorAll('.ax-mod-item').forEach(function(el){
    if(el.querySelector('.ax-mi-ico'))return;
    var nm=ICONS[el.dataset.id];if(!nm)return;
    el.insertAdjacentHTML('afterbegin','<span class="ax-mi-ico"><i data-lucide="'+nm+'"></i></span>');
  });
}
var DATA={
charter:{b:'Source · Inventory',t:'Charter Flights',img:'charter',d:'<p>Exclusive seat blocks contracted directly with charter operators. airtuerk negotiates dedicated allocations on charter aircraft, giving partners reliable access to inventory not available through traditional channels.</p><p>Especially valuable for seasonal routes and tour-operator-friendly destinations where guaranteed capacity beats market availability.</p>'},
fullcharter:{b:'Source · Inventory',t:'Full-Charter',img:'fullcharter',d:'<p>Complete aircraft chartered by airtuerk for specific routes or programs. Used when partners need guaranteed capacity at scale — high-volume holiday routes, group movements, or seasonal peaks where every seat counts.</p><p>APIX exposes these capacity blocks alongside scheduled inventory, so partners can sell from a single search.</p>'},
scheduled:{b:'Source · Inventory',t:'Scheduled Flights',img:'scheduled',d:'<p>IATA-published commercial routes from scheduled airlines worldwide. Connected via direct GDS feeds and cached for sub-second response times.</p><p>The standard backbone for any travel platform — every major destination, every major carrier, in real time.</p>'},
ndc:{b:'Source · Inventory',t:'NDC + Direct Connections',img:'ndc',d:'<p>Direct connections to airline NDC (New Distribution Capability) feeds and direct API integrations. Goes beyond traditional GDS to deliver richer content, branded fares, ancillaries, and dynamic pricing.</p><p>Currently includes Lufthansa, SWISS and other NDC-enabled carriers, with new connections added continuously.</p>'},
leftover:{b:'Source · Inventory',t:'Left Over Seats',img:'leftover',d:'<p>Last-minute unsold inventory aggregated from multiple sources. Often available at discounted rates and ideal for flash-deal platforms, last-minute booking engines, and opportunistic resellers.</p><p>APIX surfaces these seats automatically as they become available — no separate integration required.</p>'},
streaming:{b:'Infrastructure',t:'Data Streaming',d:'<p>The real-time aggregation layer that brings every source into a unified data stream. Continuous price updates, availability changes, and schedule modifications flow through here before they reach the gateway.</p><p>This is what makes APIX feel instant — no batch jobs, no stale data, no waiting for nightly syncs.</p>'},
content:{b:'Module · Content',t:'Content Module',d:'<p>Pricing rules, route-specific conditions, and baggage configuration — all the commercial logic that turns raw inventory into a sellable product.</p><p>APIX lets partners configure custom content rules per market or even per individual customer.</p>',items:['volumedeals','conditions','luggage']},
volumedeals:{b:'Content · Pricing',t:'Volume Deals',d:'<p>Negotiated bulk-rate agreements for partners with significant booking volume. Discounts, override commissions, and custom pricing tiers are applied automatically based on partner ID.</p><p>No manual handling required — partners just integrate once and the right pricing flows through every search and booking.</p>',parent:'content'},
conditions:{b:'Content · Pricing',t:'Route-specific conditions',d:'<p>Custom rules applied to individual routes. Different fare logic for high-demand corridors, seasonal pricing, or restricted-distribution markets — all configurable without code changes.</p>',parent:'content'},
luggage:{b:'Content · Ancillaries',t:'Luggage handling',d:'<p>Configurable baggage rules per fare class, route, or partner. APIX surfaces included baggage allowances, paid options, and bag policies consistently across all connected products.</p><p>Eliminates the manual lookup partners would otherwise need against airline-specific baggage tables.</p>',parent:'content'},
payment:{b:'Module · Payment',t:'Payment Module',d:'<p>Transaction infrastructure built into APIX. Handles the full payment lifecycle — collection, processing, refunds, and partner-specific billing arrangements like invoicing for B2B accounts.</p>',items:['refund','invoicing']},
refund:{b:'Payment · Automation',t:'Automatic refund feature',d:'<p>Self-service refund flows triggered by cancellation events. Refund eligibility is calculated against fare rules and processed without manual intervention.</p><p>Cuts agency support load significantly — what used to be a back-office task is now an instant API call.</p>',parent:'payment'},
invoicing:{b:'Payment · Methods',t:'Invoicing + Card payments',d:'<p>Multiple payment paths in one API. Credit card processing for direct B2C bookings, monthly invoicing for B2B partners with credit lines.</p><p>Partners choose what fits their flow without building separate payment integrations.</p>',parent:'payment'},
features:{b:'Module · Operations',t:'Features Module',d:'<p>Operational tools that make APIX useful day-to-day. Multi-airline ticketing, online check-in, schedule-change automation, special service requests — the heavy lifting that would otherwise require separate integrations is built in.</p>',items:['multiairline','checkin','cache','schedule','ssr','oneway','b2b','b2c']},
multiairline:{b:'Features · Itinerary',t:'Multiple Airline combination',d:'<p>Combine segments from different carriers into a single itinerary — including mixed scheduled + charter combinations. Pricing and ticketing handled automatically.</p>',parent:'features'},
checkin:{b:'Features · Service',t:'Online check-in function',d:'<p>Trigger check-in workflows from the partner\'s interface. APIX brokers the request to the operating airline and returns boarding pass data when available.</p>',parent:'features'},
cache:{b:'Features · Performance',t:'Cache data query',d:'<p>Fast-lookup endpoint that reads from APIX\'s cached availability layer. Sub-100ms response for high-frequency queries like search-result enrichment.</p>',parent:'features'},
schedule:{b:'Features · Automation',t:'Automated schedule change',d:'<p>When carriers update timetables, APIX detects affected bookings, notifies partners, and offers reaccommodation options — all without manual intervention from agents.</p>',parent:'features'},
ssr:{b:'Features · Service',t:'SSR booking function',d:'<p>Special Service Requests — wheelchair, meal preferences, infant seats — booked through the same API call as the flight itself. No second integration required.</p>',parent:'features'},
oneway:{b:'Features · Pricing',t:'OneWay + Return content',d:'<p>Smart fare construction that combines one-way and return inventory to create the cheapest possible itinerary, even when traditional return fares would be more expensive.</p>',parent:'features'},
b2b:{b:'Features · Tools',t:'B2B Management tool',d:'<p>Admin interface for B2B partners to manage their bookings, refunds, billing, and settings — browser-based UI sitting on top of the same APIX endpoints.</p>',parent:'features'},
b2c:{b:'Features · Tools',t:'B2C Management tool',d:'<p>White-label B2C booking management interface for end-customer self-service. Customers can view bookings, request refunds, and manage extras.</p>',parent:'features'},
gateway:{b:'Core',t:'airtuerk API Gateway',d:'<p>The single REST endpoint that exposes everything — every source, every module, every feature — through one consistent API.</p><p>Authentication, rate limiting, versioning, and documentation all sit at this layer. <strong>One integration replaces a dozen.</strong></p>'},
customers:{b:'Endpoint · Partners',t:'Connected partners',d:'<p>APIX is built for travel businesses that need flight inventory programmatically:</p><ul><li><strong>Online Travel Agencies</strong> — power flight search and booking on consumer sites</li><li><strong>Tour Operators</strong> — combine flights with hotel/package inventory</li><li><strong>B2B Portals</strong> — give travel agents access under their own brand</li><li><strong>Booking Engines</strong> — embed flight booking into corporate travel tools</li></ul>'}
};
/* global item order for prev/next (loops through everything) */
var ITEM_ORDER=[];
['content','payment','features'].forEach(function(m){(DATA[m].items||[]).forEach(function(it){ITEM_ORDER.push(it)})});
var CONNS=[['ndc','streaming'],['scheduled','streaming'],['fullcharter','streaming'],['charter','streaming'],['leftover','streaming'],['streaming','content'],['streaming','payment'],['streaming','features'],['content','gateway'],['payment','gateway'],['features','gateway'],['gateway','customers']];
var $=function(i){return document.getElementById(i)};
var root=$('ax-root'),stage=$('ax-stage'),wrap=$('ax-stage-wrap'),svg=$('ax-svg');
var modal=$('ax-modal'),card=$('ax-card'),mb=$('ax-mb'),mt=$('ax-mt'),mbo=$('ax-mbo'),mc=$('ax-mc');
var mh=$('ax-mh'),mhi=$('ax-mhi'),mih=$('ax-mih'),mtico=$('ax-mtico');
var mback=$('ax-mback'),mbacktxt=$('ax-mbacktxt'),mi=$('ax-mi'),mig=$('ax-mig');
var boxes={},dragBox=null,dragOff={x:0,y:0},scale=1,moved=false,startX=0,startY=0,currentId=null;
var CW=1900,CH=900,MIN_SCALE=0.5;
document.querySelectorAll('[data-img-key]').forEach(function(el){
  var k=el.dataset.imgKey; if(IMG[k])el.style.backgroundImage="url('"+IMG[k]+"')";
});
function initBoxes(){
  document.querySelectorAll('.ax-box').forEach(function(el){
    boxes[el.dataset.id]=el; el.style.left=el.dataset.x+'px'; el.style.top=el.dataset.y+'px';
  });
}
function updateScale(){
  var w=wrap.clientWidth;if(!w)return;
  if(root.classList.contains('ax-fs')){
    wrap.style.height='';var h=wrap.clientHeight||1;
    scale=Math.min(w/CW,h/CH);wrap.style.overflow='hidden';
    stage.style.marginLeft=Math.max(0,(w-CW*scale)/2)+'px';
    stage.style.marginTop=Math.max(0,(h-CH*scale)/2)+'px';
  }else{
    stage.style.marginLeft='0';stage.style.marginTop='0';
    var fit=w/CW;
    if(fit>=MIN_SCALE){scale=fit;wrap.style.overflow='hidden'}
    else{scale=MIN_SCALE;wrap.style.overflow='auto hidden'}
    wrap.style.height=(CH*scale)+'px';
  }
  stage.style.transform='scale('+scale+')';
}
function getBoxRect(el){
  var x=parseFloat(el.style.left)||0,y=parseFloat(el.style.top)||0;
  return{x:x,y:y,w:el.offsetWidth,h:el.offsetHeight,cx:x+el.offsetWidth/2,cy:y+el.offsetHeight/2};
}
function buildOrthoPath(a,b){
  var goRight=a.cx<b.cx,ax,bx,ay,by;
  if(goRight){ax=a.x+a.w;bx=b.x}else{ax=a.x;bx=b.x+b.w}
  ay=Math.max(a.y+12,Math.min(a.y+a.h-12,b.cy));
  by=Math.max(b.y+12,Math.min(b.y+b.h-12,a.cy));
  var R=14,dx=bx-ax,dy=by-ay;
  if(Math.abs(dy)<3)return'M'+ax+' '+ay+' L'+bx+' '+by;
  if(Math.abs(dx)<10){var midX=(ax+bx)/2;return'M'+ax+' '+ay+' L'+midX+' '+ay+' L'+midX+' '+by+' L'+bx+' '+by;}
  var mx=ax+dx*0.5,minClear=R+6;
  if(goRight){if(mx-ax<minClear)mx=ax+minClear;if(bx-mx<minClear)mx=bx-minClear}
  else{if(ax-mx<minClear)mx=ax-minClear;if(mx-bx<minClear)mx=bx+minClear}
  var rx=Math.min(R,Math.abs(mx-ax)-2,Math.abs(bx-mx)-2);
  var ry=Math.min(R,Math.abs(dy)/2-1);
  var r=Math.max(2,Math.min(rx,ry));
  var sx=goRight?1:-1,sy=dy>0?1:-1;
  var p='M'+ax+' '+ay;p+=' L'+(mx-r*sx)+' '+ay;
  var s1=(sx===1&&sy===1)||(sx===-1&&sy===-1)?1:0;
  p+=' A'+r+' '+r+' 0 0 '+s1+' '+mx+' '+(ay+r*sy);p+=' L'+mx+' '+(by-r*sy);
  var s2=(sx===1&&sy===1)||(sx===-1&&sy===-1)?0:1;
  p+=' A'+r+' '+r+' 0 0 '+s2+' '+(mx+r*sx)+' '+by;p+=' L'+bx+' '+by;
  return p;
}
function buildLines(){
  var html='';
  CONNS.forEach(function(c,i){
    var dark=(c[0]==='gateway'||c[1]==='gateway')?' ax-dark':'';
    html+='<g class="ax-cg'+dark+'" data-a="'+c[0]+'" data-b="'+c[1]+'">'
      +'<path id="axp'+i+'" class="ax-track" d=""/><path class="ax-flow" d=""/>'
      +'<circle class="ax-packet" r="4"><animateMotion dur="3s" begin="'+(i*0.4)+'s" repeatCount="indefinite"><mpath href="#axp'+i+'" xlink:href="#axp'+i+'"/></animateMotion></circle></g>';
  });
  svg.innerHTML=html;updateLines(true);
}
function updateLines(syncSpeed){
  var gs=svg.children;
  CONNS.forEach(function(c,i){
    var a=boxes[c[0]],b=boxes[c[1]],g=gs[i];if(!a||!b||!g)return;
    var d=buildOrthoPath(getBoxRect(a),getBoxRect(b));
    g.children[0].setAttribute('d',d);g.children[1].setAttribute('d',d);
    if(syncSpeed){try{var len=g.children[0].getTotalLength();
      g.children[2].querySelector('animateMotion').setAttribute('dur',Math.max(1.4,len/150).toFixed(2)+'s');}catch(e){}}
  });
}
function highlight(id,on){
  svg.querySelectorAll('.ax-cg').forEach(function(g){
    var rel=g.dataset.a===id||g.dataset.b===id;
    g.classList.toggle('ax-hot',on&&rel);g.classList.toggle('ax-dim',on&&!rel);
  });
}
var raf=null,pend=null;
function startDrag(e,el){
  if(window.innerWidth<981)return;
  if(e.target.closest('.ax-mod-item')||e.target.closest('.ax-mod-head')||e.target.closest('.ax-cust-cta'))return;
  e.preventDefault();
  dragBox=el;moved=false;startX=e.clientX;startY=e.clientY;
  el.classList.add('ax-dragging');svg.classList.add('ax-busy');
  var r=el.getBoundingClientRect();dragOff.x=(e.clientX-r.left)/scale;dragOff.y=(e.clientY-r.top)/scale;
  try{el.setPointerCapture(e.pointerId)}catch(_){}
}
function onMove(e){if(!dragBox)return;e.preventDefault();pend=e;if(!raf)raf=requestAnimationFrame(applyDrag);}
function applyDrag(){
  raf=null;if(!dragBox||!pend)return;var e=pend;
  if(Math.abs(e.clientX-startX)>4||Math.abs(e.clientY-startY)>4)moved=true;
  var sr=stage.getBoundingClientRect();
  var x=(e.clientX-sr.left)/scale-dragOff.x,y=(e.clientY-sr.top)/scale-dragOff.y;
  x=Math.max(0,Math.min(CW-dragBox.offsetWidth,x));y=Math.max(0,Math.min(CH-dragBox.offsetHeight,y));
  dragBox.style.left=x+'px';dragBox.style.top=y+'px';updateLines(false);
}
function endDrag(){if(!dragBox)return;dragBox.classList.remove('ax-dragging');dragBox=null;svg.classList.remove('ax-busy');updateLines(true);}
function themeFor(id){
  if(THEME[id])return THEME[id];
  var d=DATA[id];if(d&&d.parent&&THEME[d.parent])return THEME[d.parent];
  return THEME.content;
}
function openModal(id){
  var d=DATA[id];if(!d)return;
  currentId=id;
  var th=themeFor(id);
  card.style.setProperty('--tc',th.c);card.style.setProperty('--tsoft',th.soft);
  card.style.setProperty('--tg1',th.g1);card.style.setProperty('--tg2',th.g2);
  mb.textContent=d.b;mt.textContent=d.t;mbo.innerHTML=d.d;
  var isItem=ITEM_ORDER.indexOf(id)>-1;
  if(d.img&&IMG[d.img]){
    mhi.style.backgroundImage="url('"+IMG[d.img]+"')";mh.style.display='block';mih.style.display='none';mih.innerHTML='';card.classList.remove('no-hero');
  }else if(ICONS[id]){
    var nav=isItem
      ?'<button class="ax-ih-nav ax-ih-nav-l" type="button" aria-label="Previous"><i data-lucide="chevron-left"></i></button>'
       +'<button class="ax-ih-nav ax-ih-nav-r" type="button" aria-label="Next"><i data-lucide="chevron-right"></i></button>'
       +'<div class="ax-ih-count">'+(ITEM_ORDER.indexOf(id)+1)+' / '+ITEM_ORDER.length+'</div>'
      :'';
    mih.innerHTML='<div class="ax-ih-disc"><i data-lucide="'+ICONS[id]+'"></i></div>'+nav;
    mih.style.display='flex';mh.style.display='none';card.classList.remove('no-hero');
  }else{
    mh.style.display='none';mih.style.display='none';mih.innerHTML='';card.classList.add('no-hero');
  }
  if(ICONS[id]){mtico.innerHTML='<i data-lucide="'+ICONS[id]+'"></i>';mtico.classList.add('is-on');}
  else{mtico.innerHTML='';mtico.classList.remove('is-on');}
  if(d.parent&&DATA[d.parent]){mback.style.display='inline-flex';mbacktxt.textContent=DATA[d.parent].t;mback.dataset.target=d.parent;}
  else{mback.style.display='none';}
  if(d.items&&d.items.length){
    var html='';
    d.items.forEach(function(iid){var sd=DATA[iid];if(!sd)return;
      html+='<button class="ax-mi-card" data-id="'+iid+'" type="button">'+sd.t+'<i data-lucide="chevron-right"></i></button>';});
    mig.innerHTML=html;mi.style.display='block';
    mig.querySelectorAll('.ax-mi-card').forEach(function(b){b.addEventListener('click',function(){openModal(b.dataset.id)});});
  }else{mi.style.display='none';}
  modal.classList.add('ax-open');
  whenLucide(lucideRefresh);
  setTimeout(function(){var c=modal.querySelector('.ax-modal-content');if(c)c.scrollTop=0},10);
}
function closeModal(){modal.classList.remove('ax-open')}
function navItem(dir){
  var i=ITEM_ORDER.indexOf(currentId);if(i<0)return;
  openModal(ITEM_ORDER[(i+dir+ITEM_ORDER.length)%ITEM_ORDER.length]);
}
function toggleFs(){
  var fs=root.classList.toggle('ax-fs');
  $('ax-fs').setAttribute('aria-pressed',fs?'true':'false');
  document.body.style.overflow=fs?'hidden':'';
  updateScale();updateLines(false);setTimeout(function(){updateScale();updateLines(false)},80);
}
document.querySelectorAll('.ax-box').forEach(function(el){
  el.addEventListener('pointerdown',function(e){startDrag(e,el)});
  el.addEventListener('click',function(e){
    if(moved){moved=false;return}
    if(e.target.closest('.ax-mod-item')||e.target.closest('.ax-mod-head')||e.target.closest('.ax-cust-cta'))return;
    openModal(el.dataset.id);
  });
  el.addEventListener('pointerenter',function(){highlight(el.dataset.id,true)});
  el.addEventListener('pointerleave',function(){highlight(el.dataset.id,false)});
});
document.addEventListener('pointermove',onMove,{passive:false});
document.addEventListener('pointerup',endDrag);
document.addEventListener('pointercancel',endDrag);
document.querySelectorAll('.ax-mod-head').forEach(function(el){
  el.addEventListener('click',function(e){e.stopPropagation();openModal(el.dataset.id)});
});
document.querySelectorAll('.ax-mod-item').forEach(function(el){
  el.addEventListener('click',function(e){e.stopPropagation();openModal(el.dataset.id)});
});
document.querySelector('.ax-cust-cta').addEventListener('click',function(e){e.stopPropagation();openModal('customers')});
mih.addEventListener('click',function(e){
  if(e.target.closest('.ax-ih-nav-l'))navItem(-1);
  else if(e.target.closest('.ax-ih-nav-r'))navItem(1);
});
mback.addEventListener('click',function(){if(mback.dataset.target)openModal(mback.dataset.target)});
mc.addEventListener('click',closeModal);
modal.addEventListener('click',function(e){if(e.target===modal)closeModal()});
document.addEventListener('keydown',function(e){
  if(modal.classList.contains('ax-open')){
    if(e.key==='Escape'){closeModal();return;}
    if(e.key==='ArrowRight')navItem(1);
    else if(e.key==='ArrowLeft')navItem(-1);
    return;
  }
  if(e.key==='Escape'&&root.classList.contains('ax-fs'))toggleFs();
});
$('ax-reset').addEventListener('click',function(){
  document.querySelectorAll('.ax-box').forEach(function(el){el.style.left=el.dataset.x+'px';el.style.top=el.dataset.y+'px';});
  setTimeout(function(){updateLines(true)},50);
});
$('ax-fs').addEventListener('click',toggleFs);
window.addEventListener('resize',function(){updateScale();updateLines(false)});
window.addEventListener('load',function(){updateScale();updateLines(true)});
function boot(){
  initBoxes();ax_injectIcons();updateScale();buildLines();
  whenLucide(lucideRefresh);
  setTimeout(function(){updateScale();updateLines(true)},50);
  setTimeout(function(){updateScale();updateLines(true)},250);
  setTimeout(function(){updateScale();updateLines(true);lucideRefresh()},800);
}
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',boot)}
else{requestAnimationFrame(boot)}
})();



(function () {
  /* ============================================================
     airtuerk APIX — Global Network  ·  LOGIC (Block 3 of 3)
     ============================================================ */
  /* ╔══════════════════════════════════════════════════════════╗
     ║  ★★★  EDIT YOUR MARKETS HERE  ★★★                         ║
     ║                                                            ║
     ║  Hub = GERMANY (company favicon marker, always visible).   ║
     ║  Tabs are single-select. Allowed `state` values:           ║
     ║    'active'    → "Doing business currently"  (DEFAULT)    ║
     ║    'upcoming'  → "Coming up next"                          ║
     ║    'office'    → "Our Offices" (building markers; add     ║
     ║                   office:true and a `role` label)          ║
     ╚══════════════════════════════════════════════════════════╝ */
  const HUB_ICON = "https://cdn.prod.website-files.com/68d6684f885f73c332639c8e/69faf99d5741fe8723502313_at%20Favicon.svg";
  const COUNTRIES = [
    /* ─── HUB (always visible, company favicon) ────────────── */
    { name: "GERMANY",              code: "de", lng: 10.45, lat: 51.16, hub: true, state: "active" },
    /* ─── DOING BUSINESS CURRENTLY (30 active partners) ───── */
    { name: "TÜRKİYE",              code: "tr", lng: 35.24, lat: 39.00, state: "active" },
    { name: "IRAQ",                 code: "iq", lng: 43.68, lat: 33.00, state: "active" },
    { name: "GABON",                code: "ga", lng: 11.60, lat: -0.80, state: "active" },
    { name: "IRELAND",              code: "ie", lng: -8.00, lat: 53.20, state: "active" },
    { name: "BELGIUM",              code: "be", lng:  4.60, lat: 50.60, state: "active" },
    { name: "UKRAINE",              code: "ua", lng: 31.50, lat: 49.00, state: "active" },
    { name: "LIBYA",                code: "ly", lng: 17.50, lat: 27.00, state: "active" },
    { name: "UNITED KINGDOM",       code: "gb", lng: -2.00, lat: 54.00, state: "active" },
    { name: "AZERBAIJAN",           code: "az", lng: 47.70, lat: 40.30, state: "active" },
    { name: "PALESTINE",            code: "ps", lng: 35.20, lat: 31.90, state: "active" },
    { name: "KENYA",                code: "ke", lng: 37.90, lat:  0.20, state: "active" },
    { name: "PAKISTAN",             code: "pk", lng: 69.30, lat: 30.40, state: "active" },
    { name: "UNITED ARAB EMIRATES", code: "ae", lng: 54.30, lat: 24.00, state: "active" },
    { name: "FRANCE",               code: "fr", lng:  2.40, lat: 46.60, state: "active" },
    { name: "MOROCCO",              code: "ma", lng: -6.50, lat: 31.80, state: "active" },
    { name: "SAUDI ARABIA",         code: "sa", lng: 45.00, lat: 24.00, state: "active" },
    { name: "NEPAL",                code: "np", lng: 84.10, lat: 28.40, state: "active" },
    { name: "UNITED STATES",        code: "us", lng: -98.0, lat: 39.50, state: "active" },
    { name: "CHINA",                code: "cn", lng: 104.0, lat: 35.50, state: "active" },
    { name: "HONG KONG",            code: "hk", lng: 114.2, lat: 22.30, state: "active" },
    { name: "UZBEKISTAN",           code: "uz", lng: 64.50, lat: 41.50, state: "active" },
    { name: "INDONESIA",            code: "id", lng: 113.0, lat: -1.50, state: "active" },
    { name: "INDIA",                code: "in", lng: 79.00, lat: 22.00, state: "active" },
    { name: "ALGERIA",              code: "dz", lng:  2.60, lat: 28.00, state: "active" },
    { name: "QATAR",                code: "qa", lng: 51.20, lat: 25.30, state: "active" },
    { name: "GREECE",               code: "gr", lng: 22.00, lat: 39.20, state: "active" },
    { name: "SYRIA",                code: "sy", lng: 38.50, lat: 35.00, state: "active" },
    { name: "KYRGYZSTAN",           code: "kg", lng: 74.80, lat: 41.30, state: "active" },
    { name: "KAZAKHSTAN",           code: "kz", lng: 67.00, lat: 48.00, state: "active" },
    { name: "TAJIKISTAN",           code: "tj", lng: 71.30, lat: 38.90, state: "active" },
    /* ─── COMING UP NEXT (edit / add / remove freely) ─────── */
    { name: "SERBIA",               code: "rs", lng: 21.00, lat: 44.20, state: "upcoming" },
    { name: "BULGARIA",             code: "bg", lng: 25.50, lat: 42.70, state: "upcoming" },
    { name: "SOUTH AFRICA",         code: "za", lng: 25.00, lat: -29.0, state: "upcoming" },
    { name: "EGYPT",                code: "eg", lng: 30.50, lat: 26.50, state: "upcoming" },
    { name: "NIGERIA",              code: "ng", lng:  8.00, lat:  9.00, state: "upcoming" },
    { name: "SENEGAL",              code: "sn", lng: -14.5, lat: 14.50, state: "upcoming" },
    /* ─── OUR OFFICES (building markers) ──────────────────── */
    { name: "FRANKFURT", code: "de", lng:  8.68, lat: 50.11, state: "office", office: true, role: "HQ" },
    { name: "ISTANBUL",  code: "tr", lng: 28.98, lat: 41.01, state: "office", office: true, role: "BedBank" },
    { name: "ANTALYA",   code: "tr", lng: 30.71, lat: 36.89, state: "office", office: true, role: "Service Center" },
  ];
  /* ─────────────  END OF EDITABLE MARKET DATA  ───────────── */
  const STATE_META = {
    active:   { label: "Doing business currently", color: "#0A82DF" },
    upcoming: { label: "Coming up next",           color: "#F59E0B" },
    office:   { label: "Our Offices",              color: "#0557A6" },
  };
  const DEFAULT_STATE = "active";
  const WIDTH = 1400, HEIGHT = 720, ITER = 340;
  const HUB_R = 13, OFFICE_R = 12;
  const FLAG = c => "https://flagcdn.com/w80/" + c + ".png";
  /* lucide.dev "building-2" path data (24×24) */
  const BUILDING2 = ["M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z","M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2","M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2","M10 6h4","M10 10h4","M10 14h4","M10 18h4"];
  const root = document.getElementById("apixMap"); if (!root) return;
  const stageEl  = document.getElementById("apixStage");
  const pillsEl  = document.getElementById("apixPills");
  const ddEl     = document.getElementById("apixDropdown");
  const ddBtn    = document.getElementById("apixDdBtn");
  const ddBtnFlag= document.getElementById("apixDdBtnFlag");
  const ddLabel  = document.getElementById("apixDdBtnLabel");
  const ddSearch = document.getElementById("apixDdSearch");
  const ddList   = document.getElementById("apixDdList");
  const labelsBtn= document.getElementById("apixLabelsBtn");
  const fsBtn    = document.getElementById("apixFsBtn");
  let activeGroup = DEFAULT_STATE;
  let d3, svgSel, gZoom, ringLayer, projection, zoom, points = [], selected = null;
  function loadScript(src, ready) {
    return new Promise((res, rej) => {
      if (ready && ready()) return res();
      let s = document.querySelector('script[data-apix-src="' + src + '"]');
      if (!s) { s = document.createElement("script"); s.src = src; s.async = true;
        s.dataset.apixSrc = src; s.onerror = () => rej(); document.head.appendChild(s); }
      const t0 = Date.now();
      (function p(){ if (ready && ready()) return res();
        if (Date.now() - t0 > 15000) return rej(); setTimeout(p, 30); })();
    });
  }
  Promise.all([
    loadScript("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js", () => window.d3),
    loadScript("https://cdn.jsdelivr.net/npm/topojson-client@3/dist/topojson-client.min.js", () => window.topojson),
  ])
    .then(() => fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json"))
    .then(r => r.json()).then(init)
    .catch(() => { stageEl.innerHTML =
      '<div style="padding:80px 24px;text-align:center;color:#64748b;font-family:Inter,sans-serif">Map data could not be loaded.</div>'; });
  function init(world) {
    d3 = window.d3;
    svgSel = d3.select("#apixStage svg");
    projection = d3.geoMercator().scale(245).center([30, 28]).translate([WIDTH / 2, HEIGHT / 2 + 70]);
    const path = d3.geoPath().projection(projection);
    svgSel.append("defs").append("clipPath").attr("id", "apix-hub-clip").append("circle").attr("r", 11);
    gZoom = svgSel.append("g");
    const landLayer   = gZoom.append("g");
    const linkLayer   = gZoom.append("g");
    const leaderLayer = gZoom.append("g");
    const dotLayer    = gZoom.append("g");
    const hubLayer    = gZoom.append("g");
    ringLayer         = gZoom.append("g");
    const hitLayer    = gZoom.append("g");
    const land = window.topojson.feature(world, world.objects.countries);
    landLayer.selectAll("path").data(land.features).join("path").attr("class", "land").attr("d", path);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
      render(linkLayer, leaderLayer, dotLayer, hubLayer, ringLayer, hitLayer);
      setupZoom(); buildDropdown(); wireControls();
      updateStateCounts(); applyFilters();
      if (window.matchMedia("(max-width:720px)").matches) {
        root.classList.add("labels-off"); labelsBtn.setAttribute("aria-pressed", "true");
      }
      layoutLabels();
      let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(layoutLabels, 120); }).observe(stageEl);
    });
  }
  function render(linkLayer, leaderLayer, dotLayer, hubLayer, ringLayer, hitLayer) {
    const hub = COUNTRIES.find(c => c.hub);
    const hubPt = projection([hub.lng, hub.lat]);
    points = COUNTRIES.map(c => {
      const p = projection([c.lng, c.lat]);
      return Object.assign({}, c, { state: c.state || DEFAULT_STATE, x: p[0], y: p[1], lx: p[0], ly: p[1] - 40 });
    });
    /* Hub → spoke curves (all non-hub points, incl. offices) */
    points.filter(c => !c.hub).forEach((c, i) => {
      const dx = c.x - hubPt[0], dy = c.y - hubPt[1], dist = Math.hypot(dx, dy) || 1;
      const mx = (hubPt[0] + c.x) / 2, my = (hubPt[1] + c.y) / 2;
      const amt = Math.min(dist * 0.18, 110);
      const cx = mx + (-dy / dist) * amt, cy = my + (dx / dist) * amt;
      c.connection = linkLayer.append("path").attr("class", "connection s-" + c.state)
        .attr("d", "M" + hubPt[0] + "," + hubPt[1] + " Q" + cx + "," + cy + " " + c.x + "," + c.y)
        .style("animation-delay", (i * 28) + "ms");
    });
    /* HUB: white disc + company favicon + accent ring */
    const hubGroup = hubLayer.append("g").attr("class", "hub-marker")
      .attr("transform", "translate(" + hubPt[0] + "," + hubPt[1] + ")");
    hubGroup.append("circle").attr("r", 11).attr("fill", "#fff");
    hubGroup.append("image")
      .attr("href", HUB_ICON).attr("xlink:href", HUB_ICON)
      .attr("x", -8).attr("y", -8).attr("width", 16).attr("height", 16)
      .attr("clip-path", "url(#apix-hub-clip)")
      .attr("preserveAspectRatio", "xMidYMid meet");
    hubGroup.append("circle").attr("r", 11).attr("fill", "none").attr("stroke", "#fff").attr("stroke-width", 2);
    hubGroup.append("circle").attr("r", 12).attr("fill", "none").attr("stroke", "#0A82DF").attr("stroke-width", 1.2).attr("opacity", .55);
    hub.dot = hubGroup;
    for (let i = 0; i < 2; i++)
      ringLayer.append("circle").attr("class", "hub-ring")
        .attr("cx", hubPt[0]).attr("cy", hubPt[1]).attr("r", 12)
        .style("animation-delay", (i * 1.2) + "s");
    /* Markers + pills */
    points.forEach((c, i) => {
      if (c.hub) return;
      c.leader = leaderLayer.append("line").attr("class", "leader")
        .attr("x1", c.x).attr("y1", c.y).attr("x2", c.lx).attr("y2", c.ly)
        .style("animation-delay", (600 + Math.random() * 300) + "ms");
      if (c.office) {
        /* office: rounded square + lucide building-2 */
        const g = dotLayer.append("g").attr("class", "office-marker")
          .attr("transform", "translate(" + c.x + "," + c.y + ")")
          .style("animation-delay", (300 + i * 16) + "ms");
        g.append("rect").attr("class", "ofc-bg")
          .attr("x", -10).attr("y", -10).attr("width", 20).attr("height", 20).attr("rx", 6);
        const ic = g.append("g").attr("transform", "translate(-6.5,-6.5) scale(0.542)");
        BUILDING2.forEach(p => ic.append("path").attr("class", "ofc-ic").attr("d", p));
        c.dot = g;
      } else {
        c.dot = dotLayer.append("circle").attr("class", "country-dot s-" + c.state)
          .attr("cx", c.x).attr("cy", c.y).attr("r", 3.4)
          .style("animation-delay", (300 + i * 16) + "ms");
      }
      c.hit = hitLayer.append("circle").attr("class", "country-hit")
        .attr("cx", c.x).attr("cy", c.y).attr("r", c.office ? 16 : 13);
      const pill = document.createElement("div");
      pill.className = "apix-pill" + (c.office ? " is-office" : "");
      pill.style.animationDelay = (500 + i * 20) + "ms";
      pill.innerHTML = '<div class="apix-pill__flag"><img loading="lazy" alt="" src="' + FLAG(c.code) +
        '"></div><div class="apix-pill__label">' + c.name + "</div>" +
        (c.role ? '<div class="apix-pill__role">' + c.role + "</div>" : "");
      pillsEl.appendChild(pill); c.pill = pill;
    });
    /* Hover wiring */
    let timer = null, pending = null;
    function activate(c) {
      if (c.hub) return;
      if (timer && pending === c) { clearTimeout(timer); timer = null; }
      c.pill.classList.add("is-hovered");
      c.leader.classed("is-active", true);
      c.connection.classed("is-active", true);
      if (c.office) c.dot.classed("is-hot", true);
      else c.dot.interrupt().transition().duration(160).attr("r", 5);
    }
    function deactivate(c) {
      if (c.hub || c === selected) return;
      if (timer) clearTimeout(timer); pending = c;
      timer = setTimeout(() => {
        c.pill.classList.remove("is-hovered");
        c.leader.classed("is-active", false);
        c.connection.classed("is-active", false);
        if (c.office) c.dot.classed("is-hot", false);
        else c.dot.interrupt().transition().duration(160).attr("r", 3.4);
        timer = null;
      }, 150);
    }
    points.forEach(c => {
      if (c.hub) return;
      c.hit.on("mouseenter", () => activate(c)).on("mouseleave", () => deactivate(c));
      c.pill.addEventListener("mouseenter", () => activate(c));
      c.pill.addEventListener("mouseleave", () => deactivate(c));
      c.pill.addEventListener("click", () => selectCountry(c));
    });
    render._activate = activate;
  }
  /* ── AUTO LABEL PLACEMENT (visible labels only; avoids hub + office markers) ── */
  function layoutLabels() {
    if (!points.length) return;
    const ratio = stageEl.clientWidth / WIDTH; if (!ratio) return;
    const vis = points.filter(c => c.pill && c.pill.style.display !== "none");
    if (!vis.length) return;
    vis.forEach(c => { c.w = c.pill.offsetWidth / ratio + 8; c.h = c.pill.offsetHeight / ratio + 8; });
    const mx = d3.mean(vis, p => p.x), my = d3.mean(vis, p => p.y);
    vis.forEach(c => {
      let a = Math.atan2(c.y - my, c.x - mx); if (!isFinite(a)) a = -Math.PI / 2;
      const r0 = 30 / ratio; c.lx = c.x + Math.cos(a) * r0; c.ly = c.y + Math.sin(a) * r0;
    });
    const target = 24 / ratio, dotPad = 6 / ratio;
    for (let it = 0; it < ITER; it++) {
      vis.forEach(c => {
        let dx = c.lx - c.x, dy = c.ly - c.y, d = Math.hypot(dx, dy) || 0.01;
        const f = (d - target) * 0.06; c.lx -= dx / d * f; c.ly -= dy / d * f;
      });
      for (let i = 0; i < vis.length; i++)
        for (let j = i + 1; j < vis.length; j++) {
          const a = vis[i], b = vis[j], dx = b.lx - a.lx, dy = b.ly - a.ly;
          const ox = (a.w / 2 + b.w / 2) - Math.abs(dx), oy = (a.h / 2 + b.h / 2) - Math.abs(dy);
          if (ox > 0 && oy > 0) {
            if (ox < oy) { const s = (dx < 0 ? -1 : 1) * ox / 2; a.lx -= s; b.lx += s; }
            else         { const s = (dy < 0 ? -1 : 1) * oy / 2; a.ly -= s; b.ly += s; }
          }
        }
      vis.forEach(c => points.forEach(o => {
        if (o === c) return;
        const pad = o.hub ? HUB_R : (o.office ? OFFICE_R : dotPad);
        const dx = c.lx - o.x, dy = c.ly - o.y;
        const ox = (c.w / 2 + pad) - Math.abs(dx), oy = (c.h / 2 + pad) - Math.abs(dy);
        if (ox > 0 && oy > 0) { if (ox < oy) c.lx += (dx < 0 ? -1 : 1) * ox; else c.ly += (dy < 0 ? -1 : 1) * oy; }
      }));
      vis.forEach(c => {
        c.lx = Math.max(c.w / 2 + 2, Math.min(WIDTH - c.w / 2 - 2, c.lx));
        c.ly = Math.max(c.h / 2 + 2, Math.min(HEIGHT - c.h / 2 - 2, c.ly));
      });
    }
    vis.forEach(c => { if (c.leader) c.leader.attr("x1", c.x).attr("y1", c.y).attr("x2", c.lx).attr("y2", c.ly); });
    updateOverlay(d3.zoomTransform(svgSel.node()));
  }
  function updateOverlay(t) {
    const ratio = stageEl.clientWidth / WIDTH; if (!ratio) return;
    points.forEach(c => { if (!c.pill) return;
      c.pill.style.left = ((c.lx * t.k + t.x) * ratio) + "px";
      c.pill.style.top  = ((c.ly * t.k + t.y) * ratio) + "px"; });
  }
  function setupZoom() {
    zoom = d3.zoom().scaleExtent([1, 8]).translateExtent([[-220, -220], [WIDTH + 220, HEIGHT + 220]])
      .on("zoom", e => { gZoom.attr("transform", e.transform); updateOverlay(e.transform); });
    svgSel.call(zoom).on("dblclick.zoom", null);
  }
  function zoomToCountry(c, scale) {
    const p = projection([c.lng, c.lat]);
    const t = d3.zoomIdentity.translate(WIDTH / 2, HEIGHT / 2).scale(scale || 3.4).translate(-p[0], -p[1]);
    svgSel.transition().duration(800).ease(d3.easeCubicOut).call(zoom.transform, t);
  }
  function pulse(c) {
    const ring = ringLayer.append("circle").attr("class", "apix-pulse")
      .attr("cx", c.x).attr("cy", c.y).attr("r", c.hub ? 13 : (c.office ? 14 : 10));
    setTimeout(() => ring.remove(), 3700);
  }
  function applyFilters() {
    points.forEach(c => {
      const on = c.hub || c.state === activeGroup;
      const disp = on ? "" : "none";
      c.dot && c.dot.style("display", disp);
      c.connection && c.connection.style("display", disp);
      c.hit && c.hit.style("display", disp);
      c.leader && c.leader.style("display", disp);
      if (c.pill) c.pill.style.display = disp;
    });
  }
  function setActiveGroup(s) {
    if (!STATE_META[s] || s === activeGroup) {
      root.querySelectorAll(".apix-state[data-state]").forEach(b =>
        b.setAttribute("aria-pressed", b.dataset.state === activeGroup ? "true" : "false"));
      return;
    }
    activeGroup = s;
    root.querySelectorAll(".apix-state[data-state]").forEach(b =>
      b.setAttribute("aria-pressed", b.dataset.state === s ? "true" : "false"));
    clearHighlight(); applyFilters();
    setTimeout(layoutLabels, 30);
  }
  function updateStateCounts() {
    const counts = { active: 0, upcoming: 0, office: 0 };
    points.forEach(c => { if (!c.hub && counts.hasOwnProperty(c.state)) counts[c.state]++; });
    Object.keys(counts).forEach(s => {
      const el = document.getElementById("apixCount-" + s);
      if (el) el.textContent = counts[s];
    });
  }
  function clearHighlight() {
    if (!selected) return;
    if (selected.pill) selected.pill.classList.remove("is-hovered");
    if (selected.leader) selected.leader.classed("is-active", false);
    if (selected.connection) selected.connection.classed("is-active", false);
    if (selected.dot && !selected.hub) {
      if (selected.office) selected.dot.classed("is-hot", false);
      else selected.dot.interrupt().transition().duration(160).attr("r", 3.4);
    }
    selected = null;
  }
  function selectCountry(c) {
    closeDropdown(); clearHighlight();
    if (!c) {
      ddLabel.textContent = "All countries"; ddBtnFlag.innerHTML = "";
      svgSel.transition().duration(600).call(zoom.transform, d3.zoomIdentity);
      return;
    }
    if (!c.hub && c.state !== activeGroup) setActiveGroup(c.state);
    ddLabel.textContent = c.name.charAt(0) + c.name.slice(1).toLowerCase() + (c.role ? " · " + c.role : "");
    ddBtnFlag.innerHTML = '<img alt="" src="' + FLAG(c.code) + '">';
    selected = c; if (!c.hub) render._activate(c); pulse(c); zoomToCountry(c);
  }
  function buildDropdown() {
    const sorted = points.slice().sort((a, b) => a.name.localeCompare(b.name));
    ddList.innerHTML = ""; ddList.appendChild(makeItem(null)); sorted.forEach(c => ddList.appendChild(makeItem(c)));
  }
  function makeItem(c) {
    const el = document.createElement("div"); el.className = "apix-dd__item" + (c ? "" : " is-all");
    if (c) {
      el.dataset.search = (c.name + " " + (c.role || "")).toLowerCase();
      el.innerHTML = '<div class="apix-dd__iflag"><img alt="" src="https://flagcdn.com/w40/' + c.code +
        '.png"></div><div class="apix-dd__iname">' + c.name.toLowerCase() + (c.role ? " · " + c.role : "") +
        '</div><div class="apix-dd__idot" style="background:' + (STATE_META[c.state] ? STATE_META[c.state].color : "#0A82DF") + '"></div>';
    } else { el.dataset.search = "all countries reset"; el.textContent = "All countries"; }
    el.addEventListener("click", () => selectCountry(c)); return el;
  }
  function filterList() {
    const q = ddSearch.value.trim().toLowerCase(); let any = false;
    ddList.querySelectorAll(".apix-dd__item").forEach(it => {
      const show = !q || it.dataset.search.indexOf(q) > -1; it.style.display = show ? "" : "none";
      if (show && !it.classList.contains("is-all")) any = true;
    });
    let empty = ddList.querySelector(".apix-dd__empty");
    if (!any && q) { if (!empty) { empty = document.createElement("div"); empty.className = "apix-dd__empty";
        empty.textContent = "No countries found"; ddList.appendChild(empty); } }
    else if (empty) empty.remove();
  }
  function openDropdown()  { ddEl.classList.add("is-open"); ddBtn.setAttribute("aria-expanded", "true"); setTimeout(() => ddSearch.focus(), 30); }
  function closeDropdown() { ddEl.classList.remove("is-open"); ddBtn.setAttribute("aria-expanded", "false"); }
  function toggleFullscreen() {
    const fs = root.classList.toggle("is-fullscreen");
    fsBtn.setAttribute("aria-pressed", fs ? "true" : "false");
    document.body.style.overflow = fs ? "hidden" : "";
    setTimeout(layoutLabels, 60); setTimeout(layoutLabels, 280);
  }
  function wireControls() {
    root.querySelectorAll(".apix-state[data-state]").forEach(btn =>
      btn.addEventListener("click", () => setActiveGroup(btn.dataset.state)));
    labelsBtn.addEventListener("click", () => {
      const off = root.classList.toggle("labels-off"); labelsBtn.setAttribute("aria-pressed", off ? "true" : "false"); });
    fsBtn.addEventListener("click", toggleFullscreen);
    document.getElementById("apixZoomIn").addEventListener("click", () => svgSel.transition().duration(250).call(zoom.scaleBy, 1.5));
    document.getElementById("apixZoomOut").addEventListener("click", () => svgSel.transition().duration(250).call(zoom.scaleBy, 1 / 1.5));
    document.getElementById("apixZoomReset").addEventListener("click", () => { clearHighlight(); svgSel.transition().duration(550).call(zoom.transform, d3.zoomIdentity); });
    ddBtn.addEventListener("click", e => { e.stopPropagation(); ddEl.classList.contains("is-open") ? closeDropdown() : openDropdown(); });
    ddSearch.addEventListener("input", filterList);
    ddSearch.addEventListener("click", e => e.stopPropagation());
    document.addEventListener("click", e => { if (!ddEl.contains(e.target)) closeDropdown(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") { closeDropdown(); if (root.classList.contains("is-fullscreen")) toggleFullscreen(); } });
  }
})();



(function () {
  /* ╔══════════════════════════════════════════════════════════╗
     ║  ★★★  EDIT YOUR GROUP STRUCTURE HERE  ★★★                 ║
     ║                                                            ║
     ║  4 columns. Each card supports:                            ║
     ║    name      → company name (required)                     ║
     ║    sub       → location / function line under the name     ║
     ║    lat, lng  → pin position for the modal map              ║
     ║                (omit/null = modal shows no map)            ║
     ║    founded   → founding year, e.g. 1995                    ║
     ║                (null = chip is hidden — PLEASE FILL IN)    ║
     ║    desc      → optional short description in the modal     ║
     ║    self      → true = highlight your own company           ║
     ║                                                            ║
     ║  Cards can be drag-reordered inside their column.          ║
     ║  Click on a card opens the detail modal.                   ║
     ╚══════════════════════════════════════════════════════════╝ */
  const COLUMNS = [
    {
      title: "Consolidator National",
      color: "#0A82DF", bg: "#EFF6FE", border: "#BFDDF8",
      icon: ["M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z","M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2","M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2","M10 6h4","M10 10h4","M10 14h4","M10 18h4"],
      items: [
        { name: "AERTiCKET Conso", sub: "Berlin (DE)", lat: 52.490, lng: 13.412, founded: 1993,
          desc: "The nucleus of the group: founded in 1993 as consolidator AER Reiseservice, with roots in Titanic Reisen, the Berlin-Kreuzberg travel agency started by Rainer Klee in 1988." },
        { name: "TSS AERTiCKET Service", sub: "Leipzig (DE)", lat: 51.340, lng: 12.375, founded: 2005,
          desc: "Consolidator joint venture with the TSS cooperation: airline tickets and travel services for travel agencies, tour operators and portals." },
        { name: "rtk ticketplus Travel Service", sub: "Burghausen (DE)", lat: 48.169, lng: 12.831, founded: null,
          desc: "Consolidator joint venture with the RTK travel agency cooperation \u2014 following the AERTiCKET model: parent company plus joint ventures with cooperations." },
        { name: "BEST AERTiCKET Service", sub: "Filderstadt (DE)", lat: 48.658, lng: 9.220, founded: null,
          desc: "Consolidator directly attached to the BEST-REISEN cooperation: IATA services, tour operator fares and ticketing from Filderstadt." },
        { name: "Team Travel", sub: "D\u00fcsseldorf (DE)", lat: 51.228, lng: 6.773, founded: null, desc: "" },
        { name: "airtuerk Service", sub: "Frankfurt am Main (DE)", lat: 50.107, lng: 8.664, founded: 2007,
          desc: "Leading airline ticket wholesaler focused on Turkish travel agencies and holiday destinations. Around 170 airlines, the multicheck, cockpit, holidays & myBooking platforms \u2014 service in German, English and Turkish, around the clock.", self: true },
        { name: "World of Conso", sub: "D\u00fcsseldorf (DE)", lat: 51.215, lng: 6.781, founded: null,
          desc: "Flight consolidator of the Explorer Travel Group in D\u00fcsseldorf." },
      ],
    },
    {
      title: "Consolidator International",
      color: "#7C3AED", bg: "#F6F1FE", border: "#DFD0FA",
      icon: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z","M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20","M2 12h20"],
      items: [
        { name: "Global Ticket Factory", sub: "Berlin (DE)", lat: 52.490, lng: 13.412, founded: 2023,
          desc: "Serves the group's international customers outside Germany; founded in the course of the international expansion." },
        { name: "AERTiCKET Austria", sub: "Innsbruck (AT)", lat: 47.269, lng: 11.404, founded: null,
          desc: "Consolidator for the Austrian market \u2014 AERTiCKET has been active in Austria since the 2000s." },
        { name: "AERTiCKET Switzerland", sub: "Z\u00fcrich (CH)", lat: 47.377, lng: 8.541, founded: 2019,
          desc: "Founded in Zurich in 2019 as AERTiCKET Suisse; cooperating with Globetrotter Travel Service since 2021 and in a strategic partnership with Hotelplan Suisse since 2023." },
        { name: "AERTiCKET Spain", sub: "Palma de Mallorca (ES)", lat: 39.570, lng: 2.650, founded: null,
          desc: "Consolidator for the Spanish market, based in Mallorca." },
        { name: "Hooray", sub: "Ilawa (PL)", lat: 53.596, lng: 19.566, founded: null,
          desc: "Consolidator for the Polish market." },
        { name: "Picasso Travel / Panorama Travel", sub: "Los Angeles, New York (US)", lat: 34.052, lng: -118.244, founded: 1979,
          desc: "One of North America's largest air consolidators, in business since 1979 \u2014 and the largest consolidator of the AERTiCKET Group. The partnership with AERTiCKET (AER Picasso) dates back to 2008." },
        { name: "AERTiCKET France", sub: "Paris (FR)", lat: 48.857, lng: 2.352, founded: 2016,
          desc: "Joint venture with the French travel agency network Tourcom \u2014 the group's first step into the French market." },
        { name: "CMS Vacances", sub: "Bordeaux (FR)", lat: 44.838, lng: -0.579, founded: null,
          desc: "Expert in fulfillment, call centers and airline ticket wholesale; acquired from BNP Paribas in November 2019. Bordeaux is the group's most important location after Berlin." },
        { name: "AERTiCKET Brazil", sub: "S\u00e3o Paulo (BR)", lat: -23.551, lng: -46.633, founded: 2022,
          desc: "Founded in 2022 \u2014 the expansion into South America's largest domestic market." },
        { name: "AERTiCKET UK", sub: "London (UK)", lat: 51.507, lng: -0.128, founded: null,
          desc: "Part of the group since 2021 through the acquisition of the Emerald UK consolidator business \u2014 the foothold in Great Britain." },
        { name: "BiletBank", sub: "Istanbul (TR)", lat: 41.008, lng: 28.978, founded: 2008,
          desc: "T\u00fcrkiye's leading online B2B consolidator (brand launched in 2008, with roots in the Akdeniz PE-TUR agency founded in 1982). AERTiCKET acquired 50% in 2020 and took over completely in 2022." },
        { name: "Skyways", sub: "Brussels (BE)", lat: 50.847, lng: 4.352, founded: null,
          desc: "Belgian flight ticket consolidator, part of the AERTiCKET Group since August 2022." },
        { name: "AERTiCKET Denmark", sub: "Malm\u00f6 (SE), Copenhagen (DK)", lat: 55.605, lng: 13.003, founded: null,
          desc: "Emerged from the Scandinavian B2B consolidator Inca Tickets (formerly Inca Tours), acquired in 2024 \u2014 the entry into the Nordic market." },
        { name: "AERTiCKET India", sub: "Mumbai (IND)", lat: 19.076, lng: 72.878, founded: 2024,
          desc: "Founded in 2024 as Raviwo AERTiCKET Alliance India; offices in Mumbai, Kochi and Ahmedabad." },
        { name: "Servivuelo", sub: "Madrid (ES)", lat: 40.417, lng: -3.703, founded: null,
          desc: "Madrid-based consolidator, acquired in 2025 \u2014 strengthening the group's presence in the Spanish market." },
      ],
    },
    {
      title: "Service & Procurement",
      color: "#16A34A", bg: "#ECFDF3", border: "#BBE9CD",
      icon: ["m12.83 2.18 8.11 4.06a1 1 0 0 1 0 1.79l-8.11 4.06a2 2 0 0 1-1.66 0L3.06 8.03a1 1 0 0 1 0-1.79l8.11-4.06a2 2 0 0 1 1.66 0Z","m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65","m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"],
      items: [
        { name: "AERUNI", sub: "Fulfillment", lat: 51.340, lng: 12.373, founded: 2008,
          desc: "The group's fulfillment and payment processing partner for booking portals, based in Leipzig." },
        { name: "AFL", sub: "Scheduled Flight Procurement \u00b7 Berlin (DE)", lat: 52.490, lng: 13.412, founded: null,
          desc: "Central scheduled flight procurement of the group, based in Berlin." },
        { name: "French Travel Alliance", sub: "Scheduled Flight Procurement", lat: null, lng: null, founded: 2019,
          desc: "50/50 joint venture between AERTiCKET and Penguin World (Resaneo), founded in December 2019: pools flight purchasing for the French market." },
      ],
    },
    {
      title: "Technology",
      color: "#EA580C", bg: "#FFF3EB", border: "#FBD7BC",
      icon: ["M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"],
      items: [
        { name: "AER Technology Holding", sub: "Service and IT Services \u00b7 Berlin (DE)", lat: 52.490, lng: 13.412, founded: null,
          desc: "Holding for the group's central service and IT companies, based in Berlin." },
        { name: "Technoly", sub: "Software Development", lat: 52.490, lng: 13.412, founded: null,
          desc: "Builds smart software solutions for the travel industry \u2014 with teams in Berlin, Aschaffenburg and Kyiv, among others; the Technoly \u0130stanbul site opened in 2022 at Zaim Teknopark." },
        { name: "AIC Ukraine", sub: "Service Center/Software Development", lat: 50.450, lng: 30.524, founded: null,
          desc: "The AERTiCKET subsidiary aic co-develops the Cockpit booking world; service center and software development from Ukraine." },
        { name: "Global Conso Tech", sub: "Development \u00b7 Berlin (DE)", lat: 52.490, lng: 13.412, founded: 2021,
          desc: "Holding founded in 2021 that created the structures for international growth \u2014 through it, partners jointly distribute airfares from more than 70 countries. Based in Berlin." },
        { name: "t.e.a.m.-CCS", sub: "3V Marketing Matching Engine \u00b7 Berlin (DE)", lat: 52.490, lng: 13.412, founded: null,
          desc: "Operates the 3V marketing matching engine, based in Berlin." },
        { name: "ASNM New Media", sub: "B2C IBE Sales \u00b7 Berlin (DE)", lat: 52.490, lng: 13.412, founded: null,
          desc: "B2C internet booking engine sales, based in Berlin." },
      ],
    },
  ];
  /* ─────────────  END OF EDITABLE STRUCTURE DATA  ───────────── */
  const root = document.getElementById("apixOrg"); if (!root) return;
  const colsEl   = document.getElementById("apixOrgCols");
  const resetBtn = document.getElementById("apixOrgReset");
  const modal      = document.getElementById("apixOrgModal");
  const modalMapEl = document.getElementById("apixOrgModalMap");
  const modalChips = document.getElementById("apixOrgModalChips");
  const modalTitle = document.getElementById("apixOrgModalTitle");
  const modalLoc   = document.getElementById("apixOrgModalLoc");
  const modalDesc  = document.getElementById("apixOrgModalDesc");
  const modalClose = document.getElementById("apixOrgModalClose");
  const GRIP = '<svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor"><circle cx="2.5" cy="2.5" r="1.5"/><circle cx="7.5" cy="2.5" r="1.5"/><circle cx="2.5" cy="8" r="1.5"/><circle cx="7.5" cy="8" r="1.5"/><circle cx="2.5" cy="13.5" r="1.5"/><circle cx="7.5" cy="13.5" r="1.5"/></svg>';
  const PIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>';
  const CAL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>';
  function hexShadow(hex) {
    const n = parseInt(hex.slice(1), 16);
    return "rgba(" + (n >> 16) + "," + ((n >> 8) & 255) + "," + (n & 255) + ",.2)";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, m =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
  }
  /* ─── render columns + cards ─── */
  function render() {
    colsEl.innerHTML = "";
    COLUMNS.forEach((col, ci) => {
      const colEl = document.createElement("div");
      colEl.className = "apix-org-col";
      const head = document.createElement("div");
      head.className = "apix-org-colhead";
      head.style.background = col.bg;
      head.style.borderColor = col.border;
      head.style.color = col.color;
      head.style.animationDelay = (ci * 70) + "ms";
      head.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        col.icon.map(d => '<path d="' + d + '"/>').join("") + "</svg>" +
        "<span>" + esc(col.title) + "</span>" +
        '<span class="apix-org-colhead__count"><span>' + col.items.length + "</span></span>";
      colEl.appendChild(head);
      const list = document.createElement("div");
      list.className = "apix-org-list";
      col.items.forEach((it, i) => {
        const card = document.createElement("div");
        card.className = "apix-org-card" + (it.self ? " is-self" : "");
        card.style.setProperty("--col", col.color);
        card.style.setProperty("--colShadow", hexShadow(col.color));
        card.style.animationDelay = (ci * 70 + 80 + i * 35) + "ms";
        card.innerHTML =
          '<span class="apix-org-card__grip">' + GRIP + "</span>" +
          '<div class="apix-org-card__title">' + esc(it.name) + "</div>" +
          (it.sub ? '<div class="apix-org-card__sub">' + esc(it.sub) + "</div>" : "");
        wireDrag(card, list);
        card.addEventListener("click", e => {
          if (blockClick) return;
          if (e.target.closest(".apix-org-card__grip")) return;
          openModal(it, col);
        });
        list.appendChild(card);
      });
      colEl.appendChild(list);
      colsEl.appendChild(colEl);
    });
  }
  /* ─── Pointer-based drag & drop (mouse + touch), within own column ─── */
  let drag = null, blockClick = false;
  function wireDrag(card, list) {
    card.addEventListener("pointerdown", e => {
      if (e.button !== undefined && e.button !== 0) return;
      const onGrip = e.target.closest(".apix-org-card__grip");
      /* mouse: drag from anywhere · touch/pen: only from the grip */
      if (e.pointerType !== "mouse" && !onGrip) return;
      if (onGrip) e.preventDefault();
      drag = { card, list, startX: e.clientX, startY: e.clientY, active: false,
               offX: e.clientX - card.getBoundingClientRect().left,
               offY: e.clientY - card.getBoundingClientRect().top };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp, { once: true });
      window.addEventListener("pointercancel", onUp, { once: true });
    });
  }
  function startDrag(e) {
    const r = drag.card.getBoundingClientRect();
    const ghost = drag.card.cloneNode(true);
    ghost.classList.add("apix-org-drag-ghost");
    ghost.classList.remove("is-ghosted");
    ghost.style.width = r.width + "px";
    document.body.appendChild(ghost);
    drag.ghost = ghost;
    drag.card.classList.add("is-ghosted");
    root.classList.add("is-dragging");
    moveGhost(e);
  }
  function moveGhost(e) {
    drag.ghost.style.left = (e.clientX - drag.offX) + "px";
    drag.ghost.style.top  = (e.clientY - drag.offY) + "px";
  }
  function onMove(e) {
    if (!drag) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) return;
      drag.active = true; startDrag(e);
    }
    e.preventDefault();
    moveGhost(e);
    const sibs = Array.from(drag.list.children).filter(el => el !== drag.card);
    let after = null;
    for (const s of sibs) {
      const r = s.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) { after = s; break; }
    }
    if (after) { if (after !== drag.card.nextSibling) drag.list.insertBefore(drag.card, after); }
    else if (drag.list.lastElementChild !== drag.card) drag.list.appendChild(drag.card);
  }
  function onUp() {
    window.removeEventListener("pointermove", onMove);
    if (drag) {
      if (drag.ghost) drag.ghost.remove();
      drag.card.classList.remove("is-ghosted");
      root.classList.remove("is-dragging");
      if (drag.active) { blockClick = true; setTimeout(() => { blockClick = false; }, 50); }
    }
    drag = null;
  }
  /* ─── Leaflet lazy loader ─── */
  let leafletReady = null, leafletMap = null;
  function loadLeaflet() {
    if (leafletReady) return leafletReady;
    leafletReady = new Promise((res, rej) => {
      if (window.L) return res();
      const css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
      const s = document.createElement("script");
      s.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      s.async = true; s.onerror = rej; document.head.appendChild(s);
      const t0 = Date.now();
      (function p() { if (window.L) return res();
        if (Date.now() - t0 > 15000) return rej(); setTimeout(p, 30); })();
    });
    return leafletReady;
  }
  /* ─── Detail modal ─── */
  function openModal(it, col) {
    const hasMap = it.lat != null && it.lng != null;
    modal.classList.toggle("has-map", hasMap);
    modalChips.innerHTML =
      '<span class="apix-org-chip apix-org-chip--cat" style="--chipBg:' + col.bg +
      ';--chipCol:' + col.color + ';--chipBorder:' + col.border + '">' + esc(col.title) + "</span>" +
      (it.founded ? '<span class="apix-org-chip apix-org-chip--founded">' + CAL_ICON + "Founded " + esc(it.founded) + "</span>" : "") +
      (it.self ? '<span class="apix-org-chip apix-org-chip--self">That\'s us</span>' : "");
    modalTitle.textContent = it.name;
    modalLoc.innerHTML = it.sub ? (PIN_ICON + "<span>" + esc(it.sub) + "</span>") : "";
    modalLoc.style.display = it.sub ? "" : "none";
    modalDesc.textContent = it.desc || "";
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (hasMap) {
      loadLeaflet().then(() => {
        if (leafletMap) { leafletMap.remove(); leafletMap = null; }
        leafletMap = window.L.map(modalMapEl, {
          zoomControl: true, scrollWheelZoom: false, attributionControl: true,
        }).setView([it.lat, it.lng], 11);
        window.L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd", maxZoom: 19,
        }).addTo(leafletMap);
        window.L.marker([it.lat, it.lng], {
          icon: window.L.divIcon({
            className: "",
            html: '<div class="apix-org-pin" style="--col:' + col.color + '"></div>',
            iconSize: [18, 18], iconAnchor: [9, 9],
          }),
        }).addTo(leafletMap);
        setTimeout(() => leafletMap && leafletMap.invalidateSize(), 220);
      }).catch(() => { modal.classList.remove("has-map"); });
    }
  }
  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
  }
  modalClose.addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
  });
  resetBtn.addEventListener("click", render);
  render();
})();



(function () {
  'use strict';
  console.log('[at-dl] clean-download ready ✓');
  var CDN_HOSTS = ['website-files.com'];
  var FILE_RE = /\.(pdf|docx?|pptx?|xlsx?|zip|rar|7z|png|jpe?g|svg|gif|webp|ai|psd|eps|indd|sketch|fig|tiff?|ttf|otf|woff2?|mp4|mov|csv|txt|key|numbers|pages)(\?|#|$)/i;
  var HASH_PREFIX_RE = /^[0-9a-f]{16,40}_/i;
  function cleanName(url, explicit) {
    if (explicit) return explicit;
    try {
      var seg = decodeURIComponent((new URL(url, location.href)).pathname.split('/').pop() || '');
      return seg.replace(HASH_PREFIX_RE, '') || 'download';
    } catch (e) { return 'download'; }
  }
  function shouldHandle(a) {
    if (!a || !a.href || a.hasAttribute('data-no-dl')) return false;
    // Only ever touch real http(s) links — this excludes our own blob:/data: clicks (the loop bug)
    if (a.protocol !== 'http:' && a.protocol !== 'https:') return false;
    var onCdn = CDN_HOSTS.some(function (h) { return a.hostname && a.hostname.indexOf(h) !== -1; });
    return (onCdn && FILE_RE.test(a.href)) || a.hasAttribute('data-dl-name');
  }
  function saveBlob(blob, name) {
    var obj = URL.createObjectURL(blob);
    var t = document.createElement('a');
    t.href = obj;
    t.download = name;
    t.setAttribute('data-no-dl', '1');   // <-- key fix: never re-process our own click
    document.body.appendChild(t);
    t.click();
    t.remove();
    setTimeout(function () { URL.revokeObjectURL(obj); }, 4000);
  }
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || !shouldHandle(a)) return;
    var url = a.href, name = cleanName(url, a.getAttribute('data-dl-name'));
    e.preventDefault();
    a.style.opacity = '.6';
    fetch(url, { mode: 'cors' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
      .then(function (blob) { saveBlob(blob, name); a.style.opacity = ''; console.log('[at-dl] ✓', name); })
      .catch(function (err) {
        a.style.opacity = '';
        console.warn('[at-dl] fetch failed (' + (err && err.message) + '), opening directly:', url);
        window.location.href = url;
      });
  }, true);
})();
