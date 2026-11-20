// Homepage presentation and local progress only. Experiment engines stay in the parent app.
(function(){
 'use strict';
 var parentOrigin=window.location.protocol==='file:'?null:window.location.origin;
 function sendToParent(message){window.parent.postMessage(message,parentOrigin??'*');}
 var SOUND_KEY='kimyasal_olay_yeri_sound_v1',THEME_KEY='kimyasal_olay_yeri_theme_v1';
 function read(key,fallback){try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
 function save(key,value){try{localStorage.setItem(key,value);}catch{}}
 var state={cases:window.HOME_CASES||[],progress:{},theme:document.documentElement.getAttribute('data-theme'),soundEnabled:read(SOUND_KEY,'true')!=='false'};
 function escapeHtml(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function applyTheme(){document.documentElement.setAttribute('data-theme',state.theme);}
 function playClick(){if(state.soundEnabled&&window.SoundManager)window.SoundManager.playClick();}
 function icon(name){return '<i data-lucide="'+name+'" aria-hidden="true"></i>';}
 function statusLabel(kind){return kind==='completed'?'Tamamlandı':kind==='in-progress'?'Devam ediyor':'Henüz başlanmadı';}
 function homeMenuButton(){return document.getElementById('btnHomeMenu');}
 function setHomeMenu(open,restoreFocus){
  var button=homeMenuButton();if(!button)return;
  button.setAttribute('aria-expanded',String(open));
  if(restoreFocus&&button.getClientRects().length)button.focus({preventScroll:true});
 }
 function render(){
  var app=document.getElementById('app');if(!app)return;
  var focusedAction=document.activeElement?.closest?.('.header-actions button')?.id;
  var menuOpen=homeMenuButton()?.getAttribute('aria-expanded')==='true';
  var completed=state.cases.filter(function(c){return state.progress[c.route]==='completed';}).length;
  var html='<header class="app-header"><div class="header-inner"><div class="brand-container"><div class="brand-logo-icon">'+icon('Fingerprint')+'</div><div><div class="brand-title">Kimyasal Olay Yeri Uzmanı</div><div class="brand-motto">Gözlemle <span>•</span> Kanıtları Topla <span>•</span> Karar Ver</div></div></div><div class="header-actions">';
  html+='<button type="button" class="btn-icon home-menu-toggle" id="btnHomeMenu" aria-label="Ana sayfa menüsü" aria-expanded="false" aria-controls="home-menu-tools">'+icon('Menu')+'</button><div class="home-menu-tools" id="home-menu-tools" role="group" aria-label="Ana sayfa araçları">';
  html+='<button class="btn-icon" id="btnToggleTheme" aria-label="Temayı değiştir" title="Temayı değiştir">'+icon(state.theme==='dark'?'Sun':'Moon')+'<span class="home-menu-label">Temayı değiştir</span></button><button class="btn-icon" id="btnToggleSound" aria-label="Ses efektleri" aria-pressed="'+state.soundEnabled+'" title="Ses efektleri">'+icon(state.soundEnabled?'Volume2':'VolumeX')+'<span class="home-menu-label">Ses efektleri</span></button>';
  html+='<button class="home-secondary" id="btnOpenGuide" title="Kullanım Rehberi" aria-label="Kullanım Rehberi">'+icon('Info')+'<span class="home-desktop-label">Rehber</span><span class="home-menu-label">Kullanım Rehberi</span></button>';
  html+='<button class="home-secondary" id="btnOpenNotebook" title="Dijital Deney Defteri" aria-label="Dijital Deney Defteri">'+icon('BookOpen')+'<span>Dijital Deney Defteri</span></button>';
  html+='</div></div></div></header><main class="main-content main-case-grid"><section class="case-selection" aria-labelledby="case-selection-title"><div class="hero-banner"><div><h1 id="case-selection-title" class="hero-title">İncelenecek Olayı Seç</h1><p class="hero-desc">Olayı izle, kanıtları topla ve değişimi kendi gerekçenle açıkla.</p><div class="home-flow"><span>01 Gözlem</span><span>02 Kanıt ve sınır</span><span>03 Karar</span></div></div><section class="home-progress" aria-labelledby="progress-title"><div class="home-progress-title"><h2 id="progress-title">İlerleme durumu</h2><span>'+completed+' / 12 tamamlandı</span></div><div class="case-dot-grid">';
  state.cases.forEach(function(c){var enabled=!!c.route,sk=state.progress[c.route]||'not-started',st=statusLabel(sk);html+='<div class="case-dot '+(enabled?(sk==='completed'?'dot-solved':sk==='in-progress'?'dot-progress':'dot-empty'):'dot-empty')+'" data-case-dot-id="'+c.id+'" role="button" tabindex="'+(enabled?'0':'-1')+'" aria-disabled="'+!enabled+'" aria-label="'+escapeHtml(c.title)+': '+(enabled?st:'Yakında')+'">'+c.id+'</div>';});
  html+='</div></section></div><div class="cases-compact-grid">';
  state.cases.forEach(function(c){
   var enabled=!!c.route,sk=state.progress[c.route]||'not-started',status=enabled?statusLabel(sk):'Yakında';
   var statusIcon=enabled?(sk==='completed'?'CheckCircle2':sk==='in-progress'?'Clock3':'CircleDashed'):'LockKeyhole';
   html+='<div class="case-card-compact" data-case-id="'+c.id+'" role="button" data-status="'+sk+'" tabindex="'+(enabled?'0':'-1')+'" aria-disabled="'+!enabled+'" aria-label="'+escapeHtml(c.title)+(enabled?' deneyini incele':'')+' · '+status+'">'+
    '<span class="compact-case-num">'+String(c.id).padStart(2,'0')+'</span><div class="case-thumbnail"><img src="thumbnails/'+escapeHtml(c.thumbnail)+'" alt="" loading="lazy"></div>'+
    '<div class="compact-info-col"><div class="compact-title">'+escapeHtml(c.title)+'</div><div class="compact-subdesc">'+escapeHtml(c.shortDesc)+'</div>'+
    '<div class="case-card-bottom"><span class="compact-status-icon" title="'+status+'">'+icon(statusIcon)+'</span></div></div></div>';
  });
  html+='</div></section></main>';app.innerHTML=html;bindEvents();window.lucide?.createIcons();
  setHomeMenu(menuOpen,false);
  if(focusedAction)document.getElementById(focusedAction)?.focus({preventScroll:true});
 }
 function openCase(id){id=Number(id);var item=state.cases.find(function(c){return c.id===id;});if(!item?.route)return;playClick();sendToParent({type:'koy-open-experiment',id:item.route});}
  function bindEvents(){
    var menu=homeMenuButton();if(menu)menu.onclick=function(){setHomeMenu(menu.getAttribute('aria-expanded')!=='true',false);};
    ['btnHeroOpenGuide','btnOpenReport','btnResetData'].forEach(function(id){var b=document.getElementById(id);if(b){b.disabled=true;b.title='Yakında';b.setAttribute('aria-disabled','true');}});var guide=document.getElementById('btnOpenGuide');if(guide){guide.disabled=false;guide.onclick=function(){setHomeMenu(false,true);playClick();sendToParent({type:'koy-open-guide'});};}var notebook=document.getElementById('btnOpenNotebook');if(notebook){notebook.disabled=false;notebook.onclick=function(){setHomeMenu(false,true);playClick();sendToParent({type:'koy-open-notebook'});};}
    var theme=document.getElementById('btnToggleTheme');if(theme)theme.onclick=function(){setHomeMenu(false,true);state.theme=state.theme==='dark'?'light':'dark';save(THEME_KEY,state.theme);applyTheme();sendToParent({type:'koy-home-theme',value:state.theme});playClick();render();};
    var sound=document.getElementById('btnToggleSound');if(sound)sound.onclick=function(){setHomeMenu(false,true);state.soundEnabled=!state.soundEnabled;save(SOUND_KEY,String(state.soundEnabled));sendToParent({type:'koy-home-sound',value:state.soundEnabled});playClick();render();};
    [['.case-card-compact, .case-card','data-case-id'],['.case-dot[data-case-dot-id]','data-case-dot-id']].forEach(function(pair){document.querySelectorAll(pair[0]).forEach(function(el){el.onclick=function(){openCase(el.getAttribute(pair[1]));};el.onkeydown=function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();el.click();}};});});
  }
  window.addEventListener('pointerdown',function(event){var menu=homeMenuButton();if(menu&&!menu.closest('.header-actions').contains(event.target))setHomeMenu(false,false);});
  window.addEventListener('keydown',function(event){if(event.key==='Escape'&&homeMenuButton()?.getAttribute('aria-expanded')==='true'){event.preventDefault();setHomeMenu(false,true);}});
  window.matchMedia?.('(max-width: 700px) and (orientation: portrait)').addEventListener('change',function(){setHomeMenu(false,false);});
  window.addEventListener('message',function(event){if(event.source!==window.parent||(parentOrigin!==null&&event.origin!==parentOrigin))return;if(event.data?.type==='koy-home-progress'){state.progress=event.data.progress;render();return;}if(event.data?.type!=='koy-home-preferences')return;var d=event.data,changed=false;if(['dark','light'].includes(d.theme)&&state.theme!==d.theme){state.theme=d.theme;save(THEME_KEY,d.theme);applyTheme();changed=true;}if(typeof d.sound==='boolean'&&state.soundEnabled!==d.sound){state.soundEnabled=d.sound;save(SOUND_KEY,String(d.sound));changed=true;}if(changed)render();});
  function updateViewport(){var v=window.visualViewport;document.documentElement.style?.setProperty('--app-height',(v?v.height:window.innerHeight)+'px');document.documentElement.style?.setProperty('--app-top',(v?v.offsetTop:0)+'px');}
  window.addEventListener('DOMContentLoaded',function(){updateViewport();applyTheme();render();});
  window.addEventListener('resize',updateViewport);
  if(window.visualViewport){window.visualViewport.addEventListener('resize',updateViewport);window.visualViewport.addEventListener('scroll',updateViewport);}
})();
