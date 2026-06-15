
(function(){
  var CDN = 'https://cdn.prod.website-files.com/68d6684f885f73c332639c8e/';
  var COLORS = {
    blue:    { main: CDN+'69e76f1e7dc40163a5f42c6d_Jersey%20Mockup%20Blue%20Tagline.png',
               noTag: CDN+'69e76f1eb71d19f7312b5bdc_Jersey%20Mockup%20Blue%20NoTagline.png',
               hex:'#17479E', name:'Orient Blue', hue:223 },
    red:     { main: CDN+'69e76f1e45e05c4addfc1760_Jersey%20Mockup%20Red.png',
               hex:'#DC2626', name:'Torch Red', hue:0 },
    darkred: { main: CDN+'69e76f1e4ca14e7af6ab01d8_Jersey%20Mockup%20Dark%20Red.png',
               hex:'#88080C', name:'Maroon', hue:358 },
    black:   { main: CDN+'69e76e7a2c6df261aefaeaa8_Jersey%20Mockup%20Black.png',
               hex:'#000000', name:'Jet Black', hue:0 },
    white:   { main: CDN+'69e76e7ac0d4b5445b1cf9a5_Jersey%20Mockup%20White.png',
               hex:'#FFFFFF', name:'Pure White', hue:0 }
  };
  var ORDER = ['blue', 'red', 'darkred', 'black', 'white'];
  var current = 'blue', hideTag = false, format = 'HEX';
  var $ = function(id){ return document.getElementById(id); };
  var bg = $('jc-bg'), display = $('jc-display'),
      hexEl = $('jc-hex'), formatLabel = $('jc-format-label'),
      hueEl = $('jc-hue'), nameEl = $('jc-name'),
      track = $('jc-track'), thumb = $('jc-thumb'),
      tagBtn = $('jc-tagline-btn'), tagLabel = $('jc-tagline-label'),
      formatBtn = $('jc-format-btn'), formatMenu = $('jc-format-menu'), formatText = $('jc-format-text'),
      nameBtn = $('jc-name-btn'), nameMenu = $('jc-name-menu'),
      swatches = document.querySelectorAll('.jc-swatch'),
      formatItems = formatMenu.querySelectorAll('.jc-menu-item'),
      nameItems = nameMenu.querySelectorAll('.jc-menu-item');
  // Preload all images
  Object.keys(COLORS).forEach(function(k){
    var c = COLORS[k];
    (new Image()).src = c.main;
    if(c.noTag) (new Image()).src = c.noTag;
  });
  // Color conversion helpers
  function hexToRgb(hex){
    var h = hex.replace('#','');
    return { r: parseInt(h.substr(0,2),16), g: parseInt(h.substr(2,2),16), b: parseInt(h.substr(4,2),16) };
  }
  function rgbToHsl(r,g,b){
    r/=255; g/=255; b/=255;
    var max = Math.max(r,g,b), min = Math.min(r,g,b);
    var h, s, l = (max+min)/2;
    if(max === min){ h = s = 0; }
    else {
      var d = max-min;
      s = l > .5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h = (g-b)/d + (g<b?6:0); break;
        case g: h = (b-r)/d + 2; break;
        case b: h = (r-g)/d + 4; break;
      }
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s*100), l: Math.round(l*100) };
  }
  function formatValue(hex, fmt){
    if(fmt === 'HEX') return hex.toUpperCase();
    var rgb = hexToRgb(hex);
    if(fmt === 'RGB') return rgb.r + ', ' + rgb.g + ', ' + rgb.b;
    var hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return hsl.h + '°, ' + hsl.s + '%, ' + hsl.l + '%';
  }
  function positionOf(key){
    var idx = ORDER.indexOf(key);
    return (idx / (ORDER.length - 1)) * 100;
  }
  function colorAtPercent(percent){
    var step = 100 / (ORDER.length - 1);
    var idx = Math.round(percent / step);
    idx = Math.max(0, Math.min(ORDER.length - 1, idx));
    return ORDER[idx];
  }
  function updateMenuHints(){
    formatItems.forEach(function(item){
      var fmt = item.dataset.format;
      var hint = item.querySelector('.jc-menu-hint');
      if(hint) hint.textContent = formatValue(COLORS[current].hex, fmt);
    });
  }
  function render(animate){
    var c = COLORS[current];
    var src = (hideTag && c.noTag) ? c.noTag : c.main;
    if(animate){
      bg.classList.add('jc-fading');
      setTimeout(function(){
        bg.src = src;
        bg.classList.remove('jc-fading');
      }, 140);
    } else {
      bg.src = src;
    }
    display.style.backgroundColor = c.hex;
    hexEl.textContent = formatValue(c.hex, format);
    formatLabel.textContent = format;
    formatText.textContent = format;
    hueEl.textContent = c.hue;
    nameEl.textContent = c.name;
    thumb.style.left = positionOf(current) + '%';
    swatches.forEach(function(s){
      s.classList.toggle('jc-selected', s.dataset.color === current);
    });
    formatItems.forEach(function(i){
      i.classList.toggle('jc-selected', i.dataset.format === format);
    });
    nameItems.forEach(function(i){
      i.classList.toggle('jc-selected', i.dataset.color === current);
    });
    updateMenuHints();
    if(c.noTag){
      tagBtn.disabled = false;
      tagLabel.textContent = hideTag ? 'Show tagline' : 'Hide tagline';
      tagBtn.classList.toggle('jc-hiding', hideTag);
    } else {
      tagBtn.disabled = true;
      tagLabel.textContent = 'Hide tagline';
      tagBtn.classList.remove('jc-hiding');
    }
  }
  // Swatches
  swatches.forEach(function(s){
    s.addEventListener('click', function(){
      if(s.dataset.color === current) return;
      current = s.dataset.color;
      hideTag = false;
      render(true);
    });
  });
  // Tagline
  tagBtn.addEventListener('click', function(){
    if(tagBtn.disabled) return;
    hideTag = !hideTag;
    render(true);
  });
  // Slider
  var dragging = false;
  function updateFromEvent(e){
    var rect = track.getBoundingClientRect();
    var clientX = e.clientX != null ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    var percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    var next = colorAtPercent(percent);
    if(next !== current){
      current = next;
      hideTag = false;
      render(true);
    }
  }
  track.addEventListener('pointerdown', function(e){
    dragging = true;
    track.classList.add('jc-dragging');
    try{ track.setPointerCapture(e.pointerId); }catch(err){}
    updateFromEvent(e);
  });
  track.addEventListener('pointermove', function(e){ if(dragging) updateFromEvent(e); });
  function endDrag(e){
    if(!dragging) return;
    dragging = false;
    track.classList.remove('jc-dragging');
    try{ track.releasePointerCapture(e.pointerId); }catch(err){}
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('lostpointercapture', endDrag);
  // Dropdown logic
  function closeAllMenus(){
    formatMenu.classList.remove('jc-open');
    nameMenu.classList.remove('jc-open');
    formatBtn.setAttribute('aria-expanded', 'false');
    nameBtn.setAttribute('aria-expanded', 'false');
  }
  function toggleMenu(btn, menu){
    var isOpen = menu.classList.contains('jc-open');
    closeAllMenus();
    if(!isOpen){
      menu.classList.add('jc-open');
      btn.setAttribute('aria-expanded', 'true');
    }
  }
  formatBtn.addEventListener('click', function(e){
    e.stopPropagation();
    toggleMenu(formatBtn, formatMenu);
  });
  nameBtn.addEventListener('click', function(e){
    e.stopPropagation();
    toggleMenu(nameBtn, nameMenu);
  });
  // Format menu items
  formatItems.forEach(function(item){
    item.addEventListener('click', function(e){
      e.stopPropagation();
      format = item.dataset.format;
      closeAllMenus();
      render(false);
    });
  });
  // Name menu items
  nameItems.forEach(function(item){
    item.addEventListener('click', function(e){
      e.stopPropagation();
      if(item.dataset.color === current){ closeAllMenus(); return; }
      current = item.dataset.color;
      hideTag = false;
      closeAllMenus();
      render(true);
    });
  });
  // Close on outside click / Esc
  document.addEventListener('click', closeAllMenus);
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') closeAllMenus();
  });
  render(false);
})();
