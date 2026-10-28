// Homepage presentation and local progress only. Experiment engines stay in the parent app.
(function(){
 'use strict';
 var SOUND_KEY='kimyasal_olay_yeri_sound_v1',THEME_KEY='kimyasal_olay_yeri_theme_v1';
 function read(key,fallback){try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
 function save(key,value){try{localStorage.setItem(key,value);}catch{}}
 var state={cases:window.HOME_CASES||[],theme:read(THEME_KEY,'dark'),soundEnabled:read(SOUND_KEY,'true')!=='false'};
 function escapeHtml(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function applyTheme(){document.documentElement.setAttribute('data-theme',state.theme);}
 function playClick(){if(state.soundEnabled&&window.SoundManager)window.SoundManager.playClick();}
 function icon(name){return '<i data-lucide="'+name+'" aria-hidden="true"></i>';}
 function status(id){try{var w=JSON.parse(read(state.cases.find(function(c){return c.id===id;})?.storageKey,'null'));return w?.complete&&w.version===5?'Tamamlandı':w?.complete?'Karar değerlendirmesi bekliyor':w?.history?.some(function(h){return h.length;})?'Devam ediyor':'Henüz başlanmadı';}catch{return 'Henüz başlanmadı';}}
 function render(){
  var app=document.getElementById('app');if(!app)return;
  var completed=state.cases.filter(function(c){return status(c.id)==='Tamamlandı';}).length;
  var html='<header class="app-header"><div class="header-inner"><div class="brand-container"><div class="brand-logo-icon">'+icon('Fingerprint')+'</div><div><div class="brand-title">Kimyasal Olay Yeri Uzmanı</div><div class="brand-motto">Gözlemle <span>•</span> Kanıtları Topla <span>•</span> Karar Ver</div></div></div><div class="header-actions">';
  html+='<button class="btn-icon" id="btnToggleTheme" aria-label="Temayı değiştir" title="Temayı değiştir">'+icon(state.theme==='dark'?'Sun':'Moon')+'</button><button class="btn-icon" id="btnToggleSound" aria-label="Ses efektleri" aria-pressed="'+state.soundEnabled+'" title="Ses efektleri">'+icon(state.soundEnabled?'Volume2':'VolumeX')+'</button>';
  [['btnOpenGuide','Info','Rehber'],['btnOpenNotebook','BookOpen','Dijital Deney Defteri'],['btnOpenReport','Clipboard','Vaka Raporu']].forEach(function(b){html+='<button class="home-secondary" id="'+b[0]+'" disabled aria-label="'+b[2]+'" title="Yakında">'+icon(b[1])+'<span>'+b[2]+'</span></button>';});
  html+='</div></div></header><main class="main-content main-case-grid"><section class="hero-banner"><div><h1 class="hero-title">İncelenecek Olayı Seç</h1><p class="hero-desc">Olayı izle, kanıtları topla ve değişimi kendi gerekçenle açıkla.</p><div class="home-flow"><span>01 Gözlem</span><span>02 Kanıt</span><span>03 Karar</span></div></div><section class="home-progress" aria-labelledby="progress-title"><div class="home-progress-title"><h2 id="progress-title">İlerleme durumu</h2><span>'+completed+' / 12 tamamlandı</span></div><div class="case-dot-grid">';
  state.cases.forEach(function(c){var enabled=!!c.route;html+='<div class="case-dot '+(enabled&&status(c.id)==='Tamamlandı'?'dot-solved':'dot-empty')+'" data-case-dot-id="'+c.id+'" role="button" tabindex="'+(enabled?'0':'-1')+'" aria-disabled="'+!enabled+'" aria-label="'+escapeHtml(c.title)+': '+(enabled?status(c.id):'Yakında')+'">'+c.id+'</div>';});
  html+='</div><p>12 deney açık</p></section></section><div class="cases-compact-grid">';
  state.cases.forEach(function(c){var enabled=!!c.route;html+='<div class="case-card-compact" data-case-id="'+c.id+'" role="button" tabindex="'+(enabled?'0':'-1')+'" aria-disabled="'+!enabled+'" aria-label="'+escapeHtml(c.title)+(enabled?' deneyini incele':' · Yakında')+'"><div class="case-thumbnail"><img src="thumbnails/'+escapeHtml(c.thumbnail)+'" alt="" loading="lazy"><span class="compact-case-num">'+String(c.id).padStart(2,'0')+'</span></div><div class="compact-info-col"><div class="compact-title">'+escapeHtml(c.title)+'</div><div class="compact-subdesc">'+escapeHtml(c.shortDesc)+'</div><div class="case-card-bottom"><span class="compact-status-badge">'+(enabled?status(c.id):'Yakında')+'</span>'+(enabled?icon('ArrowUpRight'):icon('LockKeyhole'))+'</div></div></div>';});
  html+='</div></main>';app.innerHTML=html;bindEvents();window.lucide?.createIcons();
 }
 function openCase(id){id=Number(id);var item=state.cases.find(function(c){return c.id===id;});if(!item?.route)return;playClick();window.parent.postMessage({type:'koy-open-experiment',id:item.route},'*');}
  function bindEvents(){
    ['btnOpenGuide','btnHeroOpenGuide','btnOpenNotebook','btnOpenReport','btnResetData'].forEach(function(id){var b=document.getElementById(id);if(b){b.disabled=true;b.title='Yakında';b.setAttribute('aria-disabled','true');}});
    var theme=document.getElementById('btnToggleTheme');if(theme)theme.onclick=function(){state.theme=state.theme==='dark'?'light':'dark';save(THEME_KEY,state.theme);applyTheme();window.parent.postMessage({type:'koy-home-theme',value:state.theme},'*');playClick();render();};
    var sound=document.getElementById('btnToggleSound');if(sound)sound.onclick=function(){state.soundEnabled=!state.soundEnabled;save(SOUND_KEY,String(state.soundEnabled));window.parent.postMessage({type:'koy-home-sound',value:state.soundEnabled},'*');playClick();render();};
    [['.case-card-compact, .case-card','data-case-id'],['.case-dot[data-case-dot-id]','data-case-dot-id']].forEach(function(pair){document.querySelectorAll(pair[0]).forEach(function(el){el.onclick=function(){openCase(el.getAttribute(pair[1]));};el.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}};});});
    var rotate=document.getElementById('btnRotateFullscreen');if(rotate)rotate.onclick=function(){var doc=document.documentElement;try{var action=doc.requestFullscreen||doc.webkitRequestFullscreen;if(action)Promise.resolve(action.call(doc)).then(function(){return window.screen.orientation?.lock?.('landscape');}).catch(function(){});}catch{}};
  }
  window.addEventListener('message',function(event){if(event.source!==window.parent||event.data?.type!=='koy-home-preferences')return;var d=event.data,changed=false;if(['dark','light'].includes(d.theme)&&state.theme!==d.theme){state.theme=d.theme;save(THEME_KEY,d.theme);applyTheme();changed=true;}if(typeof d.sound==='boolean'&&state.soundEnabled!==d.sound){state.soundEnabled=d.sound;save(SOUND_KEY,String(d.sound));changed=true;}if(changed)render();});
  function updateViewport(){var v=window.visualViewport;document.documentElement.style?.setProperty('--app-height',(v?v.height:window.innerHeight)+'px');document.documentElement.style?.setProperty('--app-top',(v?v.offsetTop:0)+'px');}
  window.addEventListener('DOMContentLoaded',function(){updateViewport();applyTheme();render();});
  window.addEventListener('resize',updateViewport);
  if(window.visualViewport){window.visualViewport.addEventListener('resize',updateViewport);window.visualViewport.addEventListener('scroll',updateViewport);}
})();
