
(function(){
  var toast = document.getElementById('ce-toast-logo');
  var toastTimer, copyTimers = new WeakMap();
  function showToast(label, value){
    toast.innerHTML = label + ' <code>' + value + '</code> copied';
    toast.classList.add('ce-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove('ce-visible'); }, 2200);
  }
  function copyText(text, cb){
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function(){ cb(true); }).catch(fb);
      return;
    } fb();
    function fb(){
      var t = document.createElement('textarea');
      t.value = text; t.style.position = 'fixed'; t.style.left = '-9999px';
      document.body.appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch(e){}
      document.body.removeChild(t); cb(ok);
    }
  }
  function flash(strip){
    clearTimeout(copyTimers.get(strip));
    strip.classList.add('ce-just-copied');
    copyTimers.set(strip, setTimeout(function(){ strip.classList.remove('ce-just-copied'); }, 1600));
  }
  var wrap = toast.parentElement;
  wrap.querySelectorAll('.ce-strip').forEach(function(strip){
    strip.addEventListener('click', function(){
      copyText(strip.dataset.hex, function(ok){
        if(ok){ flash(strip); showToast('HEX', strip.dataset.hex); }
      });
    });
  });
})();



(function(){
  var toast = document.getElementById('ce-toast');
  var toastTimer, copyTimers = new WeakMap();
  function showToast(label, value){
    toast.innerHTML = label + ' <code>' + value + '</code> copied';
    toast.classList.add('ce-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function(){ toast.classList.remove('ce-visible'); }, 2200);
  }
  function copyText(text, cb){
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function(){ cb(true); }).catch(fb);
      return;
    } fb();
    function fb(){
      var t = document.createElement('textarea');
      t.value = text; t.style.position = 'fixed'; t.style.left = '-9999px';
      document.body.appendChild(t); t.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch(e){}
      document.body.removeChild(t); cb(ok);
    }
  }
  function flash(strip){
    clearTimeout(copyTimers.get(strip));
    strip.classList.add('ce-just-copied');
    copyTimers.set(strip, setTimeout(function(){ strip.classList.remove('ce-just-copied'); }, 1600));
  }
  document.querySelectorAll('.ce-strip').forEach(function(strip){
    strip.addEventListener('click', function(){
      copyText(strip.dataset.hex, function(ok){
        if(ok){ flash(strip); showToast('HEX', strip.dataset.hex); }
      });
    });
  });
})();



(function(){
  var LOGO = 'https://cdn.prod.website-files.com/68d6684f885f73c332639c8e/69e79d753cea22c01699cad0_logo.png';
  var IG_ICON = 'https://cdn.prod.website-files.com/68d6684f885f73c332639c8e/69e79ff177246b0ddf2f5bed_instagram.png';
  var LI_ICON = 'https://cdn.prod.website-files.com/68d6684f885f73c332639c8e/69e7a004ef247851a057564e_linkedin-sign.png';
  var BANNER_VARIANTS = {
    1: 'https://cdn.prod.website-files.com/68d6684f885f73c332639c8e/69fc7bfcc9b5ee2a6473b441_Kununu%20Banner%2026.jpg',
    2: 'https://cdn.prod.website-files.com/68d6684f885f73c332639c8e/69fd9aaa70ed7d5cbe26a7a6_Kununu%20Banner%2026%201.jpg'
  };
  var BANNER_W = 530, BANNER_H = 158, bannerVariant = 1;
  var SWYX_PREFIX = '069 264 86 78 - ';
  var LINKS = {
    logo: 'https://www.airtuerk.de/',
    ig: 'https://www.instagram.com/airtuerk_official/',
    li: 'https://www.linkedin.com/company/airtuerk-service-gmbh'
  };
  var phoneLabels = { 1: null, 2: null };
  var $ = function(id){ return document.getElementById(id); };
  var nameEl=$('sg-name'), positionEl=$('sg-position'), emailEl=$('sg-email'), phoneEl=$('sg-phone');
  var phone2El=$('sg-phone2'), phone2Wrap=$('sg-phone2-wrap');
  var swyxEl=$('sg-swyx'), swyxWrap=$('sg-swyx-wrap');
  var bannerWrap=$('sg-banner-wrap');
  var addPhone2Btn=$('sg-add-phone2'), removePhone2Btn=$('sg-phone2-remove');
  var addSwyxBtn=$('sg-add-swyx'), removeSwyxBtn=$('sg-swyx-remove');
  var addBannerBtn=$('sg-add-banner'), removeBannerBtn=$('sg-banner-remove');
  var previewMain=$('sg-preview-main'), previewReply=$('sg-preview-reply');
  var cardMain=$('sg-card-main'), cardReply=$('sg-card-reply');
  var copyMainBtn=$('sg-copy-main'), copyReplyBtn=$('sg-copy-reply');
  var toast=$('sg-toast'), toastCta=$('sg-toast-cta'), toastClose=$('sg-toast-close');
  var stateMain=$('sg-state-main'), stateReply=$('sg-state-reply');
  var statusMain=$('sg-status-main'), statusReply=$('sg-status-reply');
  var cardStatusMain=$('sg-card-status-main'), cardStatusReply=$('sg-card-status-reply');
  var allSetEl=$('sg-allset');
  var infoCard=$('sg-info-card'), infoToggle=$('sg-info-toggle');
  var activeCard='main', copied={main:false,reply:false}, toastTimer=null, copyResetTimers={main:null,reply:null};
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function getPhone2(){ if(phone2Wrap.hasAttribute('hidden')) return ''; return phone2El.value.trim(); }
  function getSwyxFull(){ if(swyxWrap.hasAttribute('hidden')) return ''; var ext=swyxEl.value.trim(); if(!ext) return ''; return SWYX_PREFIX+ext; }
  function getPhonePrefix(n){ var l=phoneLabels[n]; if(l==='tel') return 'Tel. '; if(l==='mobil') return 'Mobil: '; return ''; }
  function isBannerEnabled(){ return !bannerWrap.hasAttribute('hidden'); }
  function getBannerBlock(){
    if(!isBannerEnabled()) return '';
    var url=BANNER_VARIANTS[bannerVariant];
    return '<table cellspacing="0" cellpadding="0" border="0" style="margin:14px 0 0 0;border-collapse:collapse;border-spacing:0;"><tr><td style="padding:0;"><img src="'+url+'" alt="kununu Top Company 2026 - airtuerk Service GmbH" width="'+BANNER_W+'" height="'+BANNER_H+'" style="display:block;width:'+BANNER_W+'px;height:'+BANNER_H+'px;border:0;outline:none;"></td></tr></table>';
  }
  function selectBannerVariant(n){
    if(!BANNER_VARIANTS[n]) return;
    bannerVariant=n;
    document.querySelectorAll('.sg-banner-variant').forEach(function(btn){ btn.classList.toggle('sg-banner-variant-active', parseInt(btn.dataset.variant,10)===n); });
    renderAll(); resetCopyState();
  }
  function refreshLabelBadges(){
    document.querySelectorAll('.sg-label-badge').forEach(function(btn){
      var phoneNum=parseInt(btn.dataset.phone,10), label=btn.dataset.label;
      var otherPhone=phoneNum===1?2:1, otherLabel=phoneLabels[otherPhone];
      if(otherLabel===label){ btn.setAttribute('hidden',''); } else { btn.removeAttribute('hidden'); }
      var isActive=(phoneLabels[phoneNum]===label);
      btn.classList.toggle('sg-label-badge-active',isActive);
      var labelText=label==='tel'?'Tel':'Mobil';
      btn.textContent=(isActive?'\u2713 ':'+ ')+labelText;
    });
  }
  function setPhoneLabel(phoneNum,label){
    if(phoneLabels[phoneNum]===label){ phoneLabels[phoneNum]=null; } else { phoneLabels[phoneNum]=label; }
    refreshLabelBadges(); renderAll(); resetCopyState();
  }
  function buildMain(){
    var n=esc(nameEl.value.trim()||'Your Name'), positionRaw=positionEl.value.trim(), p=esc(positionRaw);
    var e=esc(emailEl.value.trim()||'name@airtuerk.de');
    var t=getPhonePrefix(1)+esc(phoneEl.value.trim()||'&#43;49 000 000 0000');
    var t2raw=getPhone2(), swyxraw=getSwyxFull();
    var t2Block=t2raw?'<p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#000;line-height:1.2;">'+getPhonePrefix(2)+esc(t2raw)+'</p>':'';
    var swyxBlock=swyxraw?'<p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#000;line-height:1.2;">Office: '+esc(swyxraw)+'</p>':'';
    var positionBlock=positionRaw?'<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#333;line-height:1.2;">'+p+'</p>':'';
    return '<div style="font-family:Arial,sans-serif;color:#333;">'+
      '<table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;border-spacing:0;">'+
        '<tr>'+
          '<td style="vertical-align:top;padding:0 14px 0 0;"><a href="'+LINKS.logo+'" style="text-decoration:none;" target="_blank"><img src="'+LOGO+'" alt="airtuerk" width="86" height="19" style="display:block;width:86px;height:19px;border:0;outline:none;"></a></td>'+
          '<td style="vertical-align:top;padding:0;"><p style="margin:0 0 2px 0;font-family:Arial,Helvetica,sans-serif;font-size:11pt;font-weight:bold;color:#333;line-height:1.2;">'+n+'</p>'+positionBlock+'</td>'+
        '</tr>'+
        '<tr><td colspan="2" style="height:10px;font-size:0;line-height:0;">&nbsp;</td></tr>'+
        '<tr>'+
          '<td style="vertical-align:top;padding:0 14px 0 0;"><table cellspacing="0" cellpadding="0" border="0"><tr>'+
            '<td style="padding:0 6px 0 0;"><a href="'+LINKS.ig+'" style="text-decoration:none;" target="_blank"><img src="'+IG_ICON+'" alt="Instagram" width="16" height="16" style="display:block;width:16px;height:16px;border:0;"></a></td>'+
            '<td style="padding:0;"><a href="'+LINKS.li+'" style="text-decoration:none;" target="_blank"><img src="'+LI_ICON+'" alt="LinkedIn" width="16" height="16" style="display:block;width:16px;height:16px;border:0;"></a></td>'+
          '</tr></table></td>'+
          '<td style="vertical-align:top;padding:0;">'+
            '<p style="margin:0;font-family:Arial,sans-serif;font-size:7pt;color:#000;line-height:1.2;"><a href="mailto:'+e+'" style="color:#000;text-decoration:none;">'+e+'</a></p>'+
            '<p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#000;line-height:1.2;">'+t+'</p>'+
            t2Block+swyxBlock+
          '</td>'+
        '</tr>'+
      '</table>'+
      getBannerBlock()+
      '<p style="margin:14px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#A6A6A6;line-height:1.2;">Speicherstra&#223;e 1, 60327 Frankfurt am Main</p>'+
      '<p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#A6A6A6;line-height:1.2;">Gesch&#228;ftsf&#252;hrer: &#220;mit Tenekeci | USt-ID: DE254890797 | Amtsgericht Frankfurt a.M. HRB-Nr.: 80 417</p>'+
      '<p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#A6A6A6;line-height:1.2;">Diese E-Mail enth&#228;lt vertrauliche und/oder rechtlich gesch&#252;tzte Informationen. Wenn Sie nicht der richtige Adressat sind oder diese E-Mail irrt&#252;mlich erhalten haben, informieren Sie bitte sofort den Absender und vernichten Sie diese E-Mail.</p>'+
    '</div>';
  }
  function buildReply(){
    var n=esc(nameEl.value.trim()||'Your Name'), positionRaw=positionEl.value.trim(), p=esc(positionRaw);
    var e=esc(emailEl.value.trim()||'name@airtuerk.de');
    var t=getPhonePrefix(1)+esc(phoneEl.value.trim()||'&#43;49 000 000 0000');
    var t2raw=getPhone2(), swyxraw=getSwyxFull();
    var t2Block=t2raw?'<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#333;line-height:1.4;">'+getPhonePrefix(2)+esc(t2raw)+'</p>':'';
    var swyxBlock=swyxraw?'<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#333;line-height:1.4;">Office: '+esc(swyxraw)+'</p>':'';
    var positionBlock=positionRaw?'<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#333;line-height:1.3;">'+p+'</p>':'';
    return '<div style="font-family:Arial,Helvetica,sans-serif;color:#333;">'+
      '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:10pt;font-weight:bold;color:#333;line-height:1.3;">'+n+'</p>'+
      positionBlock+
      '<p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#333;line-height:1.4;"><a href="mailto:'+e+'" style="color:#333;text-decoration:none;">'+e+'</a></p>'+
      '<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#333;line-height:1.4;">'+t+'</p>'+
      t2Block+swyxBlock+
      '<p style="margin:8px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:8pt;color:#333;line-height:1.2;">'+
        '<a href="'+LINKS.logo+'" style="color:#333;text-decoration:none;" target="_blank">airtuerk.de</a>'+
        ' <span style="color:#CCC;">|</span> <a href="'+LINKS.li+'" style="color:#333;text-decoration:none;" target="_blank">LinkedIn</a>'+
        ' <span style="color:#CCC;">|</span> <a href="'+LINKS.ig+'" style="color:#333;text-decoration:none;" target="_blank">Instagram</a>'+
      '</p>'+
      '<p style="margin:4px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#CCC;line-height:1;letter-spacing:-0.5px;">_________________________________________</p>'+
      '<p style="margin:10px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#A6A6A6;line-height:1.2;">Speicherstra&#223;e 1, 60327 Frankfurt am Main</p>'+
      '<p style="margin:2px 0 0 0;font-family:Arial,sans-serif;font-size:7pt;color:#A6A6A6;line-height:1.2;">Gesch&#228;ftsf&#252;hrer: &#220;mit Tenekeci | USt-ID: DE254890797 | Amtsgericht Frankfurt a.M. HRB-Nr.: 80 417</p>'+
    '</div>';
  }
  function buildByTab(tab){ return tab==='main'?buildMain():buildReply(); }
  function buildPlainByTab(tab){
    var lines=[nameEl.value.trim()], positionTrimmed=positionEl.value.trim();
    if(positionTrimmed) lines.push(positionTrimmed);
    lines.push('',emailEl.value.trim(),getPhonePrefix(1)+phoneEl.value.trim());
    var t2=getPhone2(); if(t2) lines.push(getPhonePrefix(2)+t2);
    var swyx=getSwyxFull(); if(swyx) lines.push('Office: '+swyx);
    if(tab==='main'){ lines.push('','Speicherstraße 1, 60327 Frankfurt am Main','Geschäftsführer: Ümit Tenekeci | USt-ID: DE254890797 | Amtsgericht Frankfurt a.M. HRB-Nr.: 80 417'); }
    else { lines.push('','airtuerk.de | LinkedIn | Instagram'); }
    return lines.join('\n');
  }
  function renderAll(){ previewMain.innerHTML=buildMain(); previewReply.innerHTML=buildReply(); }
  function resetCopyState(){ copied.main=false; copied.reply=false; updateUI(); }
  function showPhone2(){ phone2Wrap.removeAttribute('hidden'); addPhone2Btn.setAttribute('hidden',''); setTimeout(function(){ phone2El.focus(); },50); refreshLabelBadges(); renderAll(); resetCopyState(); }
  function hidePhone2(){ phone2El.value=''; phoneLabels[2]=null; phone2Wrap.setAttribute('hidden',''); addPhone2Btn.removeAttribute('hidden'); refreshLabelBadges(); renderAll(); resetCopyState(); }
  addPhone2Btn.addEventListener('click',showPhone2); removePhone2Btn.addEventListener('click',hidePhone2);
  function showSwyx(){ swyxWrap.removeAttribute('hidden'); addSwyxBtn.setAttribute('hidden',''); setTimeout(function(){ swyxEl.focus(); },50); renderAll(); resetCopyState(); }
  function hideSwyx(){ swyxEl.value=''; swyxWrap.setAttribute('hidden',''); addSwyxBtn.removeAttribute('hidden'); renderAll(); resetCopyState(); }
  addSwyxBtn.addEventListener('click',showSwyx); removeSwyxBtn.addEventListener('click',hideSwyx);
  function showBanner(){ bannerWrap.removeAttribute('hidden'); addBannerBtn.setAttribute('hidden',''); renderAll(); resetCopyState(); }
  function hideBanner(){ bannerWrap.setAttribute('hidden',''); addBannerBtn.removeAttribute('hidden'); renderAll(); resetCopyState(); }
  addBannerBtn.addEventListener('click',showBanner); removeBannerBtn.addEventListener('click',hideBanner);
  document.querySelectorAll('.sg-banner-variant').forEach(function(btn){ btn.addEventListener('click',function(){ selectBannerVariant(parseInt(btn.dataset.variant,10)); }); });
  document.querySelectorAll('.sg-label-badge').forEach(function(btn){ btn.addEventListener('click',function(){ setPhoneLabel(parseInt(btn.dataset.phone,10),btn.dataset.label); }); });
  [nameEl,positionEl,emailEl,phoneEl,phone2El,swyxEl].forEach(function(el){ el.addEventListener('input',function(){ renderAll(); resetCopyState(); }); });
  function setActiveCard(tab){ activeCard=tab; cardMain.classList.toggle('sg-card-active',tab==='main'); cardReply.classList.toggle('sg-card-active',tab==='reply'); }
  function updateUI(){
    statusMain.classList.toggle('sg-done',copied.main); statusReply.classList.toggle('sg-done',copied.reply);
    stateMain.textContent=copied.main?'Copied':'Not copied'; stateMain.classList.toggle('sg-done',copied.main);
    stateReply.textContent=copied.reply?'Copied':'Not copied'; stateReply.classList.toggle('sg-done',copied.reply);
    allSetEl.classList.toggle('sg-visible',copied.main&&copied.reply);
    cardStatusMain.classList.toggle('sg-done',copied.main); cardStatusReply.classList.toggle('sg-done',copied.reply);
    updateBtnLabel(copyMainBtn,'main'); updateBtnLabel(copyReplyBtn,'reply');
  }
  function updateBtnLabel(btn,tab){
    var label=btn.querySelector('.sg-btn-label');
    if(btn.classList.contains('sg-just-copied')) return;
    label.textContent=copied[tab]?(tab==='main'?'Copy Main again':'Copy Reply again'):(tab==='main'?'Copy Main':'Copy Reply');
  }
  [cardMain,cardReply].forEach(function(card){ card.addEventListener('click',function(e){ if(e.target.closest('.sg-copy-btn')) return; setActiveCard(card.dataset.tab); }); });
  function showToast(){ toast.classList.add('sg-toast-visible'); clearTimeout(toastTimer); toastTimer=setTimeout(hideToast,10000); }
  function hideToast(){ toast.classList.remove('sg-toast-visible'); clearTimeout(toastTimer); setTimeout(function(){ toastCta.classList.remove('sg-toast-cta-done'); toastCta.innerHTML='Copy Reply <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h6M7 3l3 3-3 3"/></svg>'; },300); }
  toastClose.addEventListener('click',hideToast);
  toastCta.addEventListener('click',function(){
    setActiveCard('reply');
    copyContent('reply',function(success){ if(success){ copied.reply=true; updateUI(); flashCopyBtn(copyReplyBtn,'reply'); toastCta.classList.add('sg-toast-cta-done'); toastCta.innerHTML='<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5l2.5 2.5 4.5-5"/></svg> Copied'; setTimeout(hideToast,1800); } });
  });
  function copyContent(tab,callback){
    var html=buildByTab(tab), plain=buildPlainByTab(tab);
    if(navigator.clipboard&&window.ClipboardItem){ try{ var item=new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([plain],{type:'text/plain'})}); navigator.clipboard.write([item]).then(function(){ if(callback) callback(true); }).catch(function(){ fallbackCopy(html,callback); }); return; } catch(e){} }
    fallbackCopy(html,callback);
  }
  function fallbackCopy(html,callback){ var tmp=document.createElement('div'); tmp.contentEditable='true'; tmp.innerHTML=html; tmp.style.position='fixed'; tmp.style.left='-9999px'; document.body.appendChild(tmp); var range=document.createRange(); range.selectNodeContents(tmp); var sel=window.getSelection(); sel.removeAllRanges(); sel.addRange(range); var ok=false; try{ ok=document.execCommand('copy'); }catch(err){ ok=false; } sel.removeAllRanges(); document.body.removeChild(tmp); if(callback) callback(ok); }
  function flashCopyBtn(btn,tab){
    var label=btn.querySelector('.sg-btn-label'); clearTimeout(copyResetTimers[tab]);
    btn.classList.add('sg-just-copied'); label.textContent='Copied!';
    copyResetTimers[tab]=setTimeout(function(){ btn.classList.remove('sg-just-copied'); updateBtnLabel(btn,tab); },1800);
  }
  [copyMainBtn,copyReplyBtn].forEach(function(btn){
    btn.addEventListener('click',function(e){
      e.stopPropagation(); var tab=btn.dataset.tab; setActiveCard(tab);
      copyContent(tab,function(success){ if(success){ copied[tab]=true; updateUI(); flashCopyBtn(btn,tab); if(tab==='main'&&!copied.reply){ setTimeout(showToast,400); } } else { var label=btn.querySelector('.sg-btn-label'); label.textContent='Copy failed'; setTimeout(function(){ updateBtnLabel(btn,tab); },3000); } });
    });
  });
  // Collapsible "How to install"
  if(infoCard && infoToggle){
    infoToggle.addEventListener('click',function(){
      var expanded = infoCard.classList.toggle('sg-info-expanded');
      infoToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  }
  refreshLabelBadges(); renderAll(); updateUI();
})();



(function(){
  var TEXTS = {
    de: {
      formal: {
        subject: function(name){ return 'Abwesenheitsnotiz: ' + name; },
        gruss: 'Sehr geehrte Damen und Herren,',
        intro: function(von, bis, grund){ return 'vielen Dank für Ihre Nachricht.' + (grund ? ' Ich befinde mich' + grund + '.' : '') + '\nIch bin vom <strong>' + von + '</strong> bis einschließlich <strong>' + bis + '</strong> nicht erreichbar.'; },
        rueck: function(bis){ return 'Ab dem <strong>' + bis + '</strong> stehe ich Ihnen wieder zur Verfügung und werde mich umgehend bei Ihnen melden.'; },
        vtext: function(vname, vemail, vphone){ return 'In dringenden Fällen wenden Sie sich bitte an meine Vertretung:\n<strong>' + vname + '</strong>' + (vemail ? '\n✉ ' + vemail : '') + (vphone ? '\n☎ ' + vphone : ''); },
        gruss2: 'Mit freundlichen Grüßen,',
      },
      locker: {
        subject: function(name){ return 'Bin grad weg — ' + name; },
        gruss: 'Hallo,',
        intro: function(von, bis, grund){ return 'danke für deine Nachricht!' + (grund ? ' Ich bin' + grund + '.' : '') + '\nIch bin vom <strong>' + von + '</strong> bis <strong>' + bis + '</strong> nicht erreichbar.'; },
        rueck: function(bis){ return 'Ab <strong>' + bis + '</strong> bin ich wieder da und melde mich dann bei dir!'; },
        vtext: function(vname, vemail, vphone){ return 'Bei dringenden Sachen wende dich gerne an:\n<strong>' + vname + '</strong>' + (vemail ? '\n✉ ' + vemail : '') + (vphone ? '\n☎ ' + vphone : ''); },
        gruss2: 'Viele Grüße,',
      }
    },
    en: {
      formal: {
        subject: function(name){ return 'Out of Office: ' + name; },
        gruss: 'Dear Sir or Madam,',
        intro: function(von, bis, grund){ return 'Thank you for your message.' + (grund ? ' I am currently' + grund + '.' : '') + '\nI will be out of the office from <strong>' + von + '</strong> to <strong>' + bis + '</strong> (inclusive).'; },
        rueck: function(bis){ return 'I will return on <strong>' + bis + '</strong> and will respond to your message as soon as possible.'; },
        vtext: function(vname, vemail, vphone){ return 'For urgent matters, please contact my colleague:\n<strong>' + vname + '</strong>' + (vemail ? '\n✉ ' + vemail : '') + (vphone ? '\n☎ ' + vphone : ''); },
        gruss2: 'Kind regards,',
      },
      locker: {
        subject: function(name){ return 'OOO — ' + name; },
        gruss: 'Hi there,',
        intro: function(von, bis, grund){ return 'Thanks for your message!' + (grund ? ' I\'m currently' + grund + '.' : '') + '\nI\'m out of office from <strong>' + von + '</strong> to <strong>' + bis + '</strong>.'; },
        rueck: function(bis){ return 'I\'ll be back on <strong>' + bis + '</strong> and will get back to you then!'; },
        vtext: function(vname, vemail, vphone){ return 'For anything urgent, reach out to:\n<strong>' + vname + '</strong>' + (vemail ? '\n✉ ' + vemail : '') + (vphone ? '\n☎ ' + vphone : ''); },
        gruss2: 'Best,',
      }
    },
    tr: {
      formal: {
        subject: function(name){ return 'Ofis Dışında: ' + name; },
        gruss: 'Sayın ilgili,',
        intro: function(von, bis, grund){ return 'Mesajınız için teşekkür ederim.' + (grund ? ' Şu anda' + grund + '.' : '') + '\n<strong>' + von + '</strong> – <strong>' + bis + '</strong> tarihleri arasında ofiste olmayacağım.'; },
        rueck: function(bis){ return '<strong>' + bis + '</strong> tarihinden itibaren tekrar erişilebilir olacak ve en kısa sürede dönüş yapacağım.'; },
        vtext: function(vname, vemail, vphone){ return 'Acil durumlarda lütfen şu kişiyle iletişime geçin:\n<strong>' + vname + '</strong>' + (vemail ? '\n✉ ' + vemail : '') + (vphone ? '\n☎ ' + vphone : ''); },
        gruss2: 'Saygılarımla,',
      },
      locker: {
        subject: function(name){ return 'Şu an ofiste değilim — ' + name; },
        gruss: 'Merhaba,',
        intro: function(von, bis, grund){ return 'Mesajın için teşekkürler!' + (grund ? ' ' + grund + '.' : '') + '\n<strong>' + von + '</strong> – <strong>' + bis + '</strong> tarihleri arasında ofiste olmayacağım.'; },
        rueck: function(bis){ return '<strong>' + bis + '</strong> tarihinde döneceğim ve sana o zaman yazacağım!'; },
        vtext: function(vname, vemail, vphone){ return 'Acil bir şey varsa şu kişiye ulaşabilirsin:\n<strong>' + vname + '</strong>' + (vemail ? '\n✉ ' + vemail : '') + (vphone ? '\n☎ ' + vphone : ''); },
        gruss2: 'İyi günler,',
      }
    }
  };
  var GRUND_LABELS = {
    de: { urlaub: ' im Urlaub', dienstreise: ' auf Dienstreise', messe: ' auf einer Messe', schulung: ' auf einer Schulung', krank: ' erkrankt' },
    en: { urlaub: ' on annual leave', dienstreise: ' on a business trip', messe: ' at a trade fair', schulung: ' at a training', krank: ' on sick leave' },
    tr: { urlaub: ' yıllık izindeyim', dienstreise: ' iş seyahatindeyim', messe: ' bir fuardayım', schulung: ' eğitimdeyim', krank: ' rahatsızım' }
  };
  var lang = 'de', ton = 'formal', grund = null, activePill = null;
  var $ = function(id){ return document.getElementById(id); };
  var nameEl = $('oo-name'), posEl = $('oo-position');
  var fromEl = $('oo-from'), toEl = $('oo-to');
  var vnameEl = $('oo-vname'), vemailEl = $('oo-vemail'), vphoneEl = $('oo-vphone');
  var subjectEl = $('oo-subject-preview'), previewEl = $('oo-text-preview');
  var copyBtn = $('oo-copy-btn'), outlookBtn = $('oo-outlook-btn');
  var cardStatus = $('oo-card-status');
  var infoCard = $('oo-info-card'), infoToggle = $('oo-info-toggle');
  var copyReset = null;
  function formatDate(val){ if(!val) return '?'; var p=val.split('-'); return p[2]+'.'+p[1]+'.'+p[0]; }
  function addOneDay(val){ if(!val) return val; var d=new Date(val); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; }
  (function(){
    var today = new Date(), end = new Date();
    end.setDate(end.getDate()+7);
    fromEl.value = today.toISOString().split('T')[0];
    toEl.value = end.toISOString().split('T')[0];
  })();
  function buildText(){
    var t = TEXTS[lang][ton];
    var name = nameEl.value.trim() || 'Your Name';
    var von = formatDate(fromEl.value), bis = formatDate(toEl.value);
    var bisPlus = formatDate(addOneDay(toEl.value));
    var grundStr = grund ? (GRUND_LABELS[lang][grund] || '') : '';
    var vname = vnameEl.value.trim(), vemail = vemailEl.value.trim(), vphone = vphoneEl.value.trim();
    var parts = [t.gruss, '', t.intro(von, bis, grundStr), '', t.rueck(bisPlus)];
    if(vname) parts.push('', t.vtext(vname, vemail, vphone));
    parts.push('', t.gruss2, name + (posEl.value.trim() ? '\n' + posEl.value.trim() : ''));
    return { subject: t.subject(name), body: parts.join('\n') };
  }
  function buildPlainText(){ var r=buildText(); return r.subject+'\n\n'+r.body.replace(/<strong>/g,'').replace(/<\/strong>/g,''); }
  function render(){
    var r = buildText();
    subjectEl.textContent = r.subject;
    previewEl.innerHTML = r.body.replace(/\n/g,'<br>');
  }
  document.querySelectorAll('.oo-pill').forEach(function(btn){
    btn.addEventListener('click', function(){
      fromEl.value = btn.dataset.from; toEl.value = btn.dataset.to;
      if(activePill) activePill.classList.remove('oo-pill-active');
      if(activePill === btn){ activePill = null; } else { btn.classList.add('oo-pill-active'); activePill = btn; }
      render(); resetCopy();
    });
  });
  document.querySelectorAll('.oo-badge').forEach(function(btn){
    btn.addEventListener('click', function(){
      var g = btn.dataset.grund;
      if(grund === g){ grund = null; btn.classList.remove('oo-badge-active'); }
      else { document.querySelectorAll('.oo-badge').forEach(function(b){ b.classList.remove('oo-badge-active'); }); grund = g; btn.classList.add('oo-badge-active'); }
      render(); resetCopy();
    });
  });
  document.querySelectorAll('.oo-toggle-btn[data-lang]').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.oo-toggle-btn[data-lang]').forEach(function(b){ b.classList.remove('oo-toggle-active'); });
      btn.classList.add('oo-toggle-active'); lang = btn.dataset.lang; render(); resetCopy();
    });
  });
  document.querySelectorAll('.oo-toggle-btn[data-ton]').forEach(function(btn){
    btn.addEventListener('click', function(){
      document.querySelectorAll('.oo-toggle-btn[data-ton]').forEach(function(b){ b.classList.remove('oo-toggle-active'); });
      btn.classList.add('oo-toggle-active'); ton = btn.dataset.ton; render(); resetCopy();
    });
  });
  [nameEl, posEl, fromEl, toEl, vnameEl, vemailEl, vphoneEl].forEach(function(el){
    el.addEventListener('input', function(){ render(); resetCopy(); });
    el.addEventListener('change', function(){ render(); resetCopy(); });
  });
  function resetCopy(){
    clearTimeout(copyReset);
    copyBtn.classList.remove('oo-just-copied');
    copyBtn.querySelector('.oo-btn-label').textContent = 'Copy';
    cardStatus.classList.remove('oo-done');
  }
  copyBtn.addEventListener('click', function(){
    var plain = buildPlainText(), r = buildText();
    var html = '<p>' + r.body.replace(/\n/g,'<br>') + '</p>';
    function doFallback(){ var tmp=document.createElement('textarea'); tmp.value=plain; tmp.style.position='fixed'; tmp.style.left='-9999px'; document.body.appendChild(tmp); tmp.select(); try{ document.execCommand('copy'); }catch(e){} document.body.removeChild(tmp); flashCopied(); }
    if(navigator.clipboard && window.ClipboardItem){
      try{ var item=new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([plain],{type:'text/plain'})}); navigator.clipboard.write([item]).then(flashCopied).catch(doFallback); } catch(e){ doFallback(); }
    } else { doFallback(); }
  });
  function flashCopied(){
    copyBtn.classList.add('oo-just-copied');
    copyBtn.querySelector('.oo-btn-label').textContent = 'Copied!';
    cardStatus.classList.add('oo-done');
    copyReset = setTimeout(function(){ copyBtn.classList.remove('oo-just-copied'); copyBtn.querySelector('.oo-btn-label').textContent = 'Copy'; }, 2000);
  }
  outlookBtn.addEventListener('click', function(){
    var r = buildText(), plain = buildPlainText();
    window.location.href = 'mailto:?subject=' + encodeURIComponent(r.subject) + '&body=' + encodeURIComponent(plain);
  });
  // Collapsible "How to set up in Outlook"
  if(infoCard && infoToggle){
    infoToggle.addEventListener('click', function(){
      var expanded = infoCard.classList.toggle('oo-info-expanded');
      infoToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });
  }
  render();
})();
