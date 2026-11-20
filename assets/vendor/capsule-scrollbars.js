/* Layout-free, shared scroll indicators for cards, dialogs and nested panels. */
(function(window, document) {
  'use strict';
  if (!window.ResizeObserver || !window.MutationObserver) return;
  var entries = new Map(), portals = new Map(), pending = new Set(), frame = 0, sequence = 0, root;
  var skip = 'html,body,svg,svg *,canvas,script,style,link,option,.mebi-stepper-track,.welcome-tabs-track';
  var resize = new window.ResizeObserver(function() { schedule(); });

  function schedule(node) {
    if (node) pending.add(node);
    if (!frame) frame = window.requestAnimationFrame(flush);
  }
  function overlay(node) { return node.nodeType === 1 ? node.closest('.mebi-capsule-scrollbars') : node.parentElement && node.parentElement.closest('.mebi-capsule-scrollbars'); }
  function portal(el) {
    var dialog=el.closest('dialog');
    if (!dialog) return root;
    if (!portals.has(dialog)) {
      var layer=document.createElement('div'); layer.className='mebi-capsule-scrollbars';
      dialog.appendChild(layer); portals.set(dialog,layer);
    }
    return portals.get(dialog);
  }
  function candidate(el) {
    if (!el.isConnected || el.matches(skip) || overlay(el)) return;
    var css = window.getComputedStyle(el);
    if (/^(auto|scroll)$/.test(css.overflowY) || /^(auto|scroll)$/.test(css.overflowX)) attach(el);
  }
  function scan(node) {
    if (node.nodeType !== 1 || !node.isConnected || overlay(node)) return;
    candidate(node);
    node.querySelectorAll('*').forEach(candidate);
  }
  function attach(el) {
    if (entries.has(el)) return;
    var generatedId = !el.id;
    if (generatedId) el.id = 'mebi-capsule-content-' + (++sequence);
    var entry = {el:el, generatedId:generatedId, id:el.id, axes:[], children:new Set(),portal:portal(el),inlineScroll:[]};
    ['scrollbar-width','scrollbar-gutter'].forEach(function(property) {
      entry.inlineScroll.push({property:property,value:el.style.getPropertyValue(property),priority:el.style.getPropertyPriority(property)});
      el.style.setProperty(property,property==='scrollbar-width'?'none':'auto','important');
    });
    ['y','x'].forEach(function(axis) {
      var rail = document.createElement('div'), thumb = document.createElement('button');
      rail.className = 'capsule-rail'; rail.dataset.axis = axis; rail.hidden = true;
      thumb.type = 'button'; thumb.className = 'capsule-thumb';
      thumb.setAttribute('role','scrollbar'); thumb.setAttribute('aria-controls',el.id);
      thumb.setAttribute('aria-label',axis === 'y' ? 'Kartı dikey kaydır' : 'Kartı yatay kaydır');
      thumb.setAttribute('aria-orientation',axis === 'y' ? 'vertical' : 'horizontal');
      thumb.setAttribute('aria-valuemin','0'); thumb.setAttribute('aria-valuemax','100');
      thumb.setAttribute('aria-valuenow','0');
      rail.appendChild(thumb); entry.portal.appendChild(rail);
      var control = {axis:axis,rail:rail,thumb:thumb,travel:0,max:0,size:0,drag:null};
      entry.axes.push(control); wire(entry,control);
    });
    entries.set(el,entry);
    el.classList.add('mebi-capsule-scroller');
    resize.observe(el);
    observeChildren(entry);
  }
  function observeChildren(entry) {
    entry.children.forEach(function(child) {
      if (child.parentElement !== entry.el) { resize.unobserve(child); entry.children.delete(child); }
    });
    Array.from(entry.el.children).forEach(function(child) {
      if (!overlay(child) && !entry.children.has(child)) { entry.children.add(child); resize.observe(child); }
    });
  }
  function detach(entry) {
    resize.unobserve(entry.el);
    entry.children.forEach(function(child) { resize.unobserve(child); });
    entry.axes.forEach(function(control) { control.rail.remove(); });
    entry.el.classList.remove('mebi-capsule-scroller');
    entry.inlineScroll.forEach(function(style) {
      if (style.value) entry.el.style.setProperty(style.property,style.value,style.priority);
      else entry.el.style.removeProperty(style.property);
    });
    if (entry.generatedId && entry.el.id === entry.id) entry.el.removeAttribute('id');
    entries.delete(entry.el);
  }
  function position(entry) {
    var el = entry.el, css = window.getComputedStyle(el);
    if (!/^(auto|scroll)$/.test(css.overflowY) && !/^(auto|scroll)$/.test(css.overflowX)) { detach(entry); return; }
    entry.axes.forEach(function(control) { control.rail.hidden = true; });
    var rect = el.getBoundingClientRect();
    if (!el.getClientRects().length || css.visibility !== 'visible' || Number(css.opacity) === 0 || rect.width < 24 || rect.height < 24) return;
    var bounds = {left:Math.max(0,rect.left),right:Math.min(window.innerWidth,rect.right),
      top:Math.max(0,rect.top),bottom:Math.min(window.innerHeight,rect.bottom)};
    for (var parent = el.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      var style = window.getComputedStyle(parent);
      if (style.visibility !== 'visible' || Number(style.opacity) === 0) return;
      if (style.overflowX !== 'visible' || style.overflowY !== 'visible') {
        var clip = parent.getBoundingClientRect();
        if (style.overflowX !== 'visible') { bounds.left=Math.max(bounds.left,clip.left); bounds.right=Math.min(bounds.right,clip.right); }
        if (style.overflowY !== 'visible') { bounds.top=Math.max(bounds.top,clip.top); bounds.bottom=Math.min(bounds.bottom,clip.bottom); }
      }
    }
    if (bounds.right-bounds.left < 24 || bounds.bottom-bounds.top < 24) return;
    var vertical = /^(auto|scroll)$/.test(css.overflowY) && el.scrollHeight-el.clientHeight > 1;
    var horizontal = /^(auto|scroll)$/.test(css.overflowX) && el.scrollWidth-el.clientWidth > 1;
    entry.axes.forEach(function(control) {
      var y = control.axis === 'y';
      if (!(y ? vertical : horizontal)) return;
      // Don't move an off-screen edge onto unrelated visible content.
      if (y ? rect.right > bounds.right+1 : rect.bottom > bounds.bottom+1) return;
      var start = y ? bounds.top+5 : bounds.left+5;
      var length = (y ? bounds.bottom-bounds.top : bounds.right-bounds.left)-10-((y ? horizontal : vertical) ? 9 : 0);
      var cross = y ? rect.right-el.clientLeft-14 : rect.bottom-el.clientTop-14;
      if (length < 24) return;
      var hit = document.elementFromPoint(y ? cross+7 : start+length/2,y ? start+length/2 : cross+7);
      if (!hit || !(hit === el || el.contains(hit))) return;
      var viewport = y ? el.clientHeight : el.clientWidth;
      var total = y ? el.scrollHeight : el.scrollWidth;
      control.max = total-viewport;
      control.size = Math.min(length,Math.max(32,length*viewport/total));
      control.travel = length-control.size;
      var offset = y ? el.scrollTop : Math.abs(el.scrollLeft);
      var ratio = Math.max(0,Math.min(1,offset/control.max));
      control.rail.style.cssText = y ? 'left:'+cross+'px;top:'+start+'px;height:'+length+'px;' : 'left:'+start+'px;top:'+cross+'px;width:'+length+'px;';
      control.thumb.style.cssText = (y ? 'height:' : 'width:')+control.size+'px;transform:translate'+(y?'Y':'X')+'('+control.travel*ratio+'px);';
      control.thumb.setAttribute('aria-valuenow',Math.round(ratio*100));
      control.rail.hidden = false;
    });
  }
  function flush() {
    frame = 0;
    var nodes = Array.from(pending); pending.clear();
    nodes.forEach(scan);
    // Hide our hit targets while checking which card is actually in front.
    root.style.visibility = 'hidden';
    portals.forEach(function(layer) { layer.style.visibility='hidden'; });
    entries.forEach(function(entry) {
      if (!entry.el.isConnected) detach(entry);
      else { observeChildren(entry); position(entry); }
    });
    root.style.visibility = '';
    portals.forEach(function(layer,dialog) {
      layer.style.visibility='';
      if (!layer.childElementCount || !dialog.isConnected) { layer.remove(); portals.delete(dialog); }
    });
  }
  function move(entry,control,value) {
    value = Math.max(0,Math.min(control.max,value));
    if (control.axis === 'y') entry.el.scrollTop=value;
    else entry.el.scrollLeft=window.getComputedStyle(entry.el).direction==='rtl' ? -value : value;
    schedule();
  }
  function current(entry,control) { return control.axis === 'y' ? entry.el.scrollTop : Math.abs(entry.el.scrollLeft); }
  function wire(entry,control) {
    var rail = control.rail, thumb = control.thumb, y = control.axis === 'y';
    thumb.addEventListener('pointerdown',function(event) {
      if (event.button !== 0 || event.isPrimary === false) return;
      event.preventDefault(); event.stopPropagation();
      control.drag = {id:event.pointerId,point:y?event.clientY:event.clientX,scroll:current(entry,control)};
      thumb.setPointerCapture(event.pointerId); rail.setAttribute('data-dragging','');
      thumb.focus({preventScroll:true});
    });
    thumb.addEventListener('pointermove',function(event) {
      var drag = control.drag;
      if (!drag || drag.id !== event.pointerId || !control.travel) return;
      move(entry,control,drag.scroll+((y?event.clientY:event.clientX)-drag.point)*control.max/control.travel);
    });
    function end(event) {
      if (control.drag && event.pointerId === control.drag.id) { control.drag=null; rail.removeAttribute('data-dragging'); }
    }
    thumb.addEventListener('pointerup',end); thumb.addEventListener('pointercancel',end); thumb.addEventListener('lostpointercapture',end);
    rail.addEventListener('pointerdown',function(event) {
      if (event.target !== rail || event.button !== 0 || !control.travel) return;
      event.preventDefault(); event.stopPropagation();
      var rect=rail.getBoundingClientRect(),point=(y?event.clientY-rect.top:event.clientX-rect.left)-control.size/2;
      move(entry,control,point/control.travel*control.max);
    });
    thumb.addEventListener('keydown',function(event) {
      var page=(y?entry.el.clientHeight:entry.el.clientWidth)*.85;
      var steps={ArrowDown:36,ArrowUp:-36,ArrowRight:36,ArrowLeft:-36,PageDown:page,PageUp:-page,' ':event.shiftKey?-page:page,Home:-Infinity,End:Infinity};
      if (!(event.key in steps)) return;
      event.preventDefault(); event.stopPropagation();
      move(entry,control,event.key==='Home'?0:event.key==='End'?control.max:current(entry,control)+steps[event.key]);
    });
    rail.addEventListener('wheel',function(event) {
      event.preventDefault();
      var delta = y ? event.deltaY : event.deltaX || event.deltaY;
      var scale = event.deltaMode===1?16:event.deltaMode===2?(y?entry.el.clientHeight:entry.el.clientWidth):1;
      move(entry,control,current(entry,control)+delta*scale);
    },{passive:false});
  }
  function init() {
    root=document.createElement('div'); root.id='mebiCapsuleScrollbars'; root.className='mebi-capsule-scrollbars'; document.body.appendChild(root);
    new window.MutationObserver(function(records) {
      records.forEach(function(record) {
        if (overlay(record.target)) return;
        if (record.type==='childList') record.addedNodes.forEach(function(node) { if (node.nodeType===1) pending.add(node); });
        else if (record.type==='attributes') {
          if (record.attributeName==='class') {
            // Our marker is the only class change on initial attachment.
            if ((record.oldValue||'').replace(/\bmebi-capsule-scroller\b/g,'').trim() !== (record.target.getAttribute('class')||'').replace(/\bmebi-capsule-scroller\b/g,'').trim()) pending.add(record.target);
          } else if (record.target.nodeType===1 && !entries.has(record.target)) candidate(record.target);
        }
      });
      if (records.some(function(record) { return !overlay(record.target); })) schedule();
    }).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeOldValue:true,attributeFilter:['class','style','hidden','open']});
    document.addEventListener('scroll',function() { schedule(); },true);
    document.addEventListener('input',function() { schedule(); },true);
    document.addEventListener('transitionend',function() { schedule(); },true);
    document.addEventListener('animationend',function() { schedule(); },true);
    window.addEventListener('resize',function() { schedule(document.body); });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize',function() { schedule(); });
      window.visualViewport.addEventListener('scroll',function() { schedule(); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function() { schedule(); });
    schedule(document.body);
  }
  window.MebiCapsuleScrollbars={refresh:function() { if (root) schedule(document.body); }};
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})(window,document);
