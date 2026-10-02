(function(){
'use strict';
var I=DATA.I, R=DATA.R, P=DATA.P||{};
var BY={}; R.forEach(function(r){BY[r.slug]=r});
var AISLES=[['meat','Meat'],['fish','Fish'],['veg','Fruit and veg'],['fridge','Fridge'],['bakery','Bread'],['frozen','Frozen'],['cupboard','Tins, rice and pasta'],['pantry','Store cupboard'],['spices','Herbs and spices']];
var CHECK={pantry:1,spices:1};
var UTM='utm_source=adams_family_kitchen&utm_medium=referral';
var $=function(s,el){return (el||document).querySelector(s)};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};

/* ---------- state ---------- */
var S={n:5,plan:[null,null,null,null,null,null,null],filter:'All',q:''};
try{var saved=JSON.parse(localStorage.getItem('afk-week')||'null');if(saved&&saved.plan){S.n=saved.n;S.plan=saved.plan.concat([null,null,null,null,null,null,null]).slice(0,7)}}catch(e){}
function save(){try{localStorage.setItem('afk-week',JSON.stringify({n:S.n,plan:S.plan}))}catch(e){}}

/* ---------- photos ---------- */
function photo(slug,w){var p=P[slug];if(p&&p.file)return p.file;return p?p.img+'?auto=format&fit=crop&w='+(w||800)+'&q=75':null}
function imgTag(slug,w,cls){var src=photo(slug,w),r=BY[slug];
  if(!src) return '<div class="'+(cls||'')+'" style="display:grid;place-items:center;height:100%;background:var(--mark-pale);font:700 15px var(--sans);color:var(--mark);padding:12px;text-align:center">'+esc(r.title)+'</div>';
  return '<img src="'+src+'" alt="'+esc(r.title)+'" loading="lazy" class="'+(cls||'')+'" onerror="this.outerHTML=window.__ph(this.alt)">'}
window.__ph=function(t){return '<div style="display:grid;place-items:center;width:100%;height:100%;min-height:100%;background:var(--mark-pale);font:700 15px var(--sans);color:var(--mark);padding:12px;text-align:center">'+t+'</div>'};
function credit(slug){var p=P[slug];if(!p)return '';
  return 'Photo: <a href="'+p.byUrl+'?'+UTM+'" target="_blank" rel="noopener">'+esc(p.by)+'</a> on <a href="'+p.page+'?'+UTM+'" target="_blank" rel="noopener">Unsplash</a>'}

/* ---------- quantities ---------- */
var UNIT={g:'g',ml:'ml',tbsp:'tbsp',tsp:'tsp',cm:'cm'};
var COUNTED={clove:['clove','cloves'],tin:['tin','tins'],sachet:['sachet','sachets'],jar:['jar','jars'],bunch:['bunch','bunches'],loaf:['loaf','loaves'],bottle:['bottle','bottles'],can:['can','cans'],pack:['pack','packs'],block:['block','blocks']};
function num(q){q=Math.round(q*100)/100;var w=Math.floor(q),f=q-w,fr='';
  if(Math.abs(f-.5)<.01)fr='½';else if(Math.abs(f-.25)<.01)fr='¼';else if(Math.abs(f-.75)<.01)fr='¾';else if(Math.abs(f-1/3)<.02)fr='⅓';else if(Math.abs(f-2/3)<.02)fr='⅔';else if(f>0)return String(q);
  return (w?w:'')+fr||'0'}
function singular(name){var m=name.match(/^([^(]*?)(\s*\(.*\))?$/),main=m[1],rest=m[2]||'';
  var words=main.split(' '),l=words.length-1,w=words[l];
  if(/ies$/.test(w))w=w.replace(/ies$/,'y');else if(/oes$/.test(w))w=w.replace(/es$/,'');else if(/(ches|shes)$/.test(w))w=w.replace(/es$/,'');else if(/s$/.test(w)&&!/ss$/.test(w))w=w.replace(/s$/,'');
  words[l]=w;return words.join(' ')+rest}
function qtyText(q,u){
  if(u==='g'&&q>=1000)return num(q/1000)+' kg';
  if(u==='ml'&&q>=1000)return num(q/1000)+' litres';
  if(UNIT[u])return num(q)+' '+UNIT[u];
  if(COUNTED[u])return num(q)+' '+(q>1?COUNTED[u][1]:COUNTED[u][0]);
  return num(q)}
function ingLine(q,u,key){var name=I[key][0];
  if(key==='garlic'){return {q:qtyText(q,'clove'),name:'garlic'}}
  if(u===''||u===undefined){return {q:num(q),name:q<=1?singular(name):name}}
  return {q:qtyText(q,u),name:name}}

/* ---------- merging ---------- */
function merged(slugs){var M={};
  slugs.forEach(function(s){BY[s].ings.forEach(function(x){var q=x[0],u=x[1],k=x[2];
    if(u==='tsp'){u='tbsp';q=q/3}
    M[k]=M[k]||{};M[k][u]=(M[k][u]||0)+q})});
  var out={};AISLES.forEach(function(a){out[a[0]]=[]});
  Object.keys(M).forEach(function(k){var parts=[],units=M[k];
    Object.keys(units).forEach(function(u){var q=units[u];
      if(u==='tbsp'){var t=Math.round(q*3);var tb=Math.floor(t/3),ts=t%3;parts.push([tb?tb+' tbsp':'',ts?ts+' tsp':''].filter(Boolean).join(' + '))}
      else if(k==='garlic'){var b=Math.ceil(q/10);parts.push(q+' cloves (about '+b+' bulb'+(b>1?'s':'')+')')}
      else if(u===''){parts.push(num(q))}
      else parts.push(qtyText(q,u))});
    var nm=I[k][0];var single=Object.keys(units).length===1&&units['']===1;
    out[I[k][1]].push({k:k,name:single?singular(nm):nm,q:parts.join(' + ')})});
  Object.keys(out).forEach(function(a){out[a].sort(function(x,y){return x.name.localeCompare(y.name)})});
  return out}

/* ---------- filters ---------- */
var FILTERS=['All','Slow cooker','Dump and bake','Chicken','Beef','Pork','Lamb','Fish','Vegetarian','Kids love it','Curry night','Freezes well'];
function matches(r){var f=S.filter;
  if(f==='Slow cooker'&&r.method!=='slow')return false;
  if(f==='Dump and bake'&&r.method!=='oven')return false;
  if(f!=='All'&&f!=='Slow cooker'&&f!=='Dump and bake'&&r.tags.indexOf(f)<0)return false;
  if(S.q){var hay=(r.title+' '+r.summary+' '+r.tags.join(' ')+' '+r.ings.map(function(x){return I[x[2]][0]}).join(' ')).toLowerCase();
    return S.q.toLowerCase().split(/\s+/).every(function(w){return hay.indexOf(w)>=0})}
  return true}
function renderChips(){$('#chips').innerHTML=FILTERS.map(function(f){return '<button type="button" class="chip" aria-pressed="'+(S.filter===f)+'" data-f="'+f+'">'+f+'</button>'}).join('')}

/* ---------- grid ---------- */
function inPlan(slug){return S.plan.slice(0,S.n).indexOf(slug)>=0}
function card(r){var m=r.method==='slow'?'<span class="meth label m-slow">Slow cooker</span>':'<span class="meth label m-oven">Dump &amp; bake</span>';
  var on=inPlan(r.slug);
  return '<article class="card" draggable="true" data-slug="'+r.slug+'">'+
   '<button type="button" class="open" data-open="'+r.slug+'" aria-label="Open '+esc(r.title)+'">'+
   '<div class="ph">'+imgTag(r.slug,600)+m+'</div>'+
   '<div class="body"><h3>'+esc(r.title)+'</h3><p>'+esc(r.summary)+'</p>'+
   '<div class="meta"><span><b>'+r.prep+' min</b> prep</span><span><b>'+esc(r.cook)+'</b></span></div>'+
   (r.inspired?'<div class="inspo">Idea from Taming Twins</div>':'')+'</div></button>'+
   '<button type="button" class="add'+(on?' on':'')+'" data-add="'+r.slug+'" aria-label="'+(on?'Remove '+esc(r.title)+' from':'Add '+esc(r.title)+' to')+' your week">'+(on?'✓':'+')+'</button></article>'}
function renderGrid(){var list=R.filter(matches);
  $('#grid').innerHTML=list.map(card).join('')||'<p>No recipes match that. Try another word or filter.</p>';
  $('#count').textContent=list.length+' recipe'+(list.length===1?'':'s')+(S.filter!=='All'?' · '+S.filter:'')}

/* ---------- week ---------- */
function renderWeek(){$('#n').textContent=S.n;
  var h='';for(var i=0;i<S.n;i++){var s=S.plan[i];
    h+='<div class="slot'+(s?' full':'')+'" data-slot="'+i+'"><span class="n">Meal '+(i+1)+'</span>'+
     (s?'<div style="width:56px;height:46px;flex:none;border-radius:6px;overflow:hidden">'+imgTag(s,160)+'</div><span class="t" data-open="'+s+'">'+esc(BY[s].title)+'</span><button type="button" class="x" data-rm="'+i+'" aria-label="Remove '+esc(BY[s].title)+'">×</button>'
       :'<span class="e">Drag a recipe here or tap +</span>')+'</div>'}
  $('#slots').innerHTML=h;
  var c=S.plan.slice(0,S.n).filter(Boolean).length;
  $('#wbcount').textContent=c+'/'+S.n;
  $('#shopbtn').disabled=!c;$('#shopbtn').textContent=c?'Shopping list for '+c+' meal'+(c>1?'s':''):'Shopping list';
  save()}
function addTo(slug,slot){
  var cur=S.plan.slice(0,S.n).indexOf(slug);
  if(slot===undefined){if(cur>=0){S.plan[cur]=null;toast('Removed from your week');refresh();return}
    slot=S.plan.slice(0,S.n).indexOf(null);
    if(slot<0){toast('Your week is full. Add another meal or remove one.');openWeek();return}}
  else if(cur>=0&&cur!==slot){S.plan[cur]=S.plan[slot]}
  S.plan[slot]=slug;toast(BY[slug].title+' added');refresh()}
function refresh(){renderWeek();renderGrid()}
function openWeek(){$('#week').classList.add('open')}

/* ---------- overlays ---------- */
var lastFocus=null;
function show(html){lastFocus=document.activeElement;$('#sheet').innerHTML='<button type="button" class="close" data-close aria-label="Close">×</button>'+html;$('#ov').hidden=false;document.body.style.overflow='hidden';$('#ov').scrollTop=0;setTimeout(function(){$('.close').focus()},30)}
function hide(){$('#ov').hidden=true;document.body.style.overflow='';if(location.hash)history.replaceState(null,'',location.pathname);if(lastFocus)lastFocus.focus()}

function recipeView(slug,tab){var r=BY[slug];if(!r)return;var step=0;
  var ings='<ul class="ings">'+r.ings.map(function(x,i){var l=ingLine(x[0],x[1],x[2]);return '<li><label><input type="checkbox" id="i-'+slug+'-'+i+'"><span><span class="q">'+esc(l.q)+'</span> '+esc(l.name)+'</span></label></li>'}).join('')+'</ul>';
  var steps='<ol class="steps-list">'+r.steps.map(function(s){return '<li><div><b>'+esc(s[0])+'</b>'+esc(s[1])+'</div></li>'}).join('')+'</ol>';
  var on=inPlan(slug);
  show('<div class="hero">'+imgTag(slug,1400)+'</div><div class="credit">'+credit(slug)+(r.inspired?' · Idea from <a href="'+r.inspired+'" target="_blank" rel="noopener">Taming Twins</a>':'')+'</div>'+
   '<div class="r-in"><span class="label" style="color:var(--mark)">'+(r.method==='slow'?'Slow cooker':'Dump and bake')+'</span><h2 id="dlgTitle">'+esc(r.title)+'</h2><p class="lede">'+esc(r.summary)+'</p>'+
   '<div class="facts"><div class="fact"><b>'+r.prep+' min</b>morning prep</div><div class="fact"><b>'+esc(r.cook)+'</b>'+(r.method==='slow'?'then leave it':'at tea time')+'</div><div class="fact"><b>Serves 5</b>2 adults, 3 boys</div><div class="fact"><b>'+r.ings.length+'</b>ingredients</div></div>'+
   '<div class="r-actions"><button type="button" class="btn btn-main" data-cook>Cook step by step</button><button type="button" class="btn btn-ghost" data-add="'+slug+'">'+(on?'✓ In your week':'+ Add to your week')+'</button></div>'+
   '<div class="tabs" role="tablist"><button class="tab" role="tab" aria-selected="true" data-tab="all">Ingredients and method</button><button class="tab" role="tab" aria-selected="false" data-tab="cook">Step by step</button></div>'+
   '<div id="tabbody"></div></div>');
  function all(){$('#tabbody').innerHTML='<div class="cols"><div><h3 class="label" style="margin:0 0 6px">You need</h3>'+ings+'</div><div><h3 class="label" style="margin:0 0 6px">Method</h3>'+steps+'<div class="serve"><b style="font-family:var(--sans)">Serve with:</b> '+esc(r.serve)+'</div></div></div>'}
  function cook(){var n=r.steps.length,s=r.steps[step];
    $('#tabbody').innerHTML='<div class="cook"><div class="dots" aria-hidden="true">'+r.steps.map(function(_,i){return '<span class="'+(i<=step?'on':'')+'"></span>'}).join('')+'</div>'+
     '<div class="card-step" aria-live="polite"><span class="label k">Step '+(step+1)+' of '+n+'</span><h3>'+esc(s[0])+'</h3><p>'+esc(s[1])+'</p></div>'+
     '<div class="nav"><button type="button" class="btn btn-ghost" data-prev '+(step?'':'disabled')+'>Back</button><button type="button" class="btn btn-main" data-next>'+(step===n-1?'Done, enjoy it':'Next step')+'</button></div></div>'}
  function setTab(t){[].forEach.call(document.querySelectorAll('.tab'),function(b){b.setAttribute('aria-selected',b.dataset.tab===t)});t==='cook'?cook():all();curTab=t}
  var curTab='all';setTab(tab||'all');
  $('#sheet').onclick=function(e){var t=e.target.closest('button');if(!t)return;
    if(t.dataset.tab)setTab(t.dataset.tab);
    if(t.hasAttribute('data-cook')){step=0;setTab('cook');$('.tabs').scrollIntoView({behavior:'smooth',block:'start'})}
    if(t.hasAttribute('data-next')){if(step<r.steps.length-1){step++;cook()}else{setTab('all');toast('Enjoy your tea')}}
    if(t.hasAttribute('data-prev')&&step>0){step--;cook()}
    if(t.dataset.add){addTo(slug);t.textContent=inPlan(slug)?'✓ In your week':'+ Add to your week'}};
  keyNav=function(e){if(curTab!=='cook')return;if(e.key==='ArrowRight'&&step<r.steps.length-1){step++;cook()}if(e.key==='ArrowLeft'&&step>0){step--;cook()}};
  history.replaceState(null,'','#'+slug)}
var keyNav=null;

function weekSlugs(){return S.plan.slice(0,S.n).filter(Boolean)}
function shopView(){var slugs=weekSlugs();if(!slugs.length)return;var m=merged(slugs);
  var shop=AISLES.filter(function(a){return !CHECK[a[0]]&&m[a[0]].length}),cup=AISLES.filter(function(a){return CHECK[a[0]]&&m[a[0]].length});
  function block(a){return '<div class="aisle"><h4 class="label">'+a[1]+'</h4><ul class="ings">'+m[a[0]].map(function(x,i){return '<li><label><input type="checkbox" id="s-'+x.k+'"><span><span class="q">'+esc(x.q)+'</span> '+esc(x.name)+'</span></label></li>'}).join('')+'</ul></div>'}
  show('<div class="r-in shop"><span class="label" style="color:var(--mark)">Shopping list</span><h2 id="dlgTitle">'+slugs.length+' dinner'+(slugs.length>1?'s':'')+' for five</h2>'+
   '<div class="meals-sum">'+slugs.map(function(s){return '<span class="ms"><span style="width:30px;height:30px;border-radius:50%;overflow:hidden;display:block">'+imgTag(s,80)+'</span>'+esc(BY[s].title)+'</span>'}).join('')+'</div>'+
   '<div class="r-actions"><button type="button" class="btn btn-main" data-dl>Download for the shopping agent (.md)</button><button type="button" class="btn btn-ghost" data-copy>Copy list</button></div>'+
   '<p style="font-size:15px;color:var(--muted);margin:0 0 16px">Everything is added up across your meals, so anything used twice only appears once. Weekly essentials are not included.</p>'+
   '<div class="cols"><div>'+shop.map(block).join('')+'</div><div><div class="tip" style="background:var(--rory-pale)"><span>Check the cupboard first. You probably have most of these.</span></div>'+cup.map(block).join('')+'</div></div></div>');
  $('#sheet').onclick=function(e){var t=e.target.closest('button');if(!t)return;
    if(t.hasAttribute('data-dl')){var md=toMD(slugs,m),b=new Blob([md],{type:'text/markdown'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='adams-shopping-'+new Date().toISOString().slice(0,10)+'.md';document.body.appendChild(a);a.click();a.remove();toast('Downloaded')}
    if(t.hasAttribute('data-copy')){var txt=toMD(slugs,m);(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){toast('Copied')},function(){toast('Copy did not work, use Download instead')})}}}

function toMD(slugs,m){var d=new Date(),base=location.origin+location.pathname;
  var L=['# Adams family shopping list','','Week of '+d.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})+' · '+slugs.length+' dinners · feeds 5 (2 adults, 3 young boys)','','## Dinners this week',''];
  slugs.forEach(function(s,i){var r=BY[s];L.push((i+1)+'. **'+r.title+'** ('+(r.method==='slow'?'slow cooker, '+r.cook:'dump and bake, '+r.cook)+') — '+base+'#'+s)});
  L.push('','## Shopping','');
  AISLES.forEach(function(a){if(CHECK[a[0]]||!m[a[0]].length)return;L.push('### '+a[1]);m[a[0]].forEach(function(x){L.push('- [ ] '+x.q+' '+x.name)});L.push('')});
  L.push('## Check the cupboard first (only buy if we have run out)','');
  AISLES.forEach(function(a){if(!CHECK[a[0]]||!m[a[0]].length)return;L.push('### '+a[1]);m[a[0]].forEach(function(x){L.push('- [ ] '+x.q+' '+x.name)});L.push('')});
  L.push('## Notes for the shopping agent','','- Quantities are totals across all the dinners above. Round up to the nearest pack size.','- **Allergy: no prawns or shellfish.** Check any prepared foods.','- Weekly essentials (milk, bread, fruit and so on) are not on this list and are handled separately.','- Swap like for like if something is out of stock (for example a different brand of curry paste).','');
  return L.join('\n')}

/* ---------- toast ---------- */
var tt;function toast(t){var el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){el.classList.remove('on')},1800)}

/* ---------- events ---------- */
document.addEventListener('click',function(e){var t=e.target.closest('[data-open],[data-add],[data-rm],[data-close],[data-f]');
  if(e.target===$('#ov')){hide();return}
  if(!t)return;
  if(t.closest('#sheet')&&!t.hasAttribute('data-close'))return;
  if(t.hasAttribute('data-close'))hide();
  else if(t.dataset.f){S.filter=t.dataset.f;renderChips();renderGrid()}
  else if(t.dataset.add)addTo(t.dataset.add);
  else if(t.dataset.rm!==undefined){S.plan[+t.dataset.rm]=null;refresh()}
  else if(t.dataset.open)recipeView(t.dataset.open)});
document.addEventListener('keydown',function(e){if($('#ov').hidden)return;if(e.key==='Escape')hide();else if(keyNav)keyNav(e)});
$('#q').addEventListener('input',function(e){S.q=e.target.value.trim();renderGrid()});
$('#minus').onclick=function(){if(S.n>1){S.n--;refresh()}};
$('#plus').onclick=function(){if(S.n<7){S.n++;refresh()}};
$('#clear').onclick=function(){S.plan=[null,null,null,null,null,null,null];refresh();toast('Week cleared')};
$('#fill').onclick=function(){var used=S.plan.slice(0,S.n),pool=R.filter(function(r){return used.indexOf(r.slug)<0&&matches(r)}).map(function(r){return r.slug});
  for(var i=0;i<S.n;i++){if(!S.plan[i]&&pool.length){S.plan[i]=pool.splice(Math.floor(Math.random()*pool.length),1)[0]}}refresh();toast('Gaps filled. Swap any you don\'t fancy.')};
$('#shopbtn').onclick=function(){shopView()};
$('#weekbtn').onclick=function(){$('#week').classList.toggle('open')};

/* drag and drop */
document.addEventListener('dragstart',function(e){var c=e.target.closest&&e.target.closest('.card');if(!c)return;e.dataTransfer.setData('text/plain',c.dataset.slug);e.dataTransfer.effectAllowed='copy';c.classList.add('dragging');if(window.innerWidth<=1000)openWeek()});
document.addEventListener('dragend',function(e){var c=e.target.closest&&e.target.closest('.card');if(c)c.classList.remove('dragging')});
var slots=$('#slots');
slots.addEventListener('dragover',function(e){var s=e.target.closest('.slot');if(!s)return;e.preventDefault();e.dataTransfer.dropEffect='copy';[].forEach.call(slots.children,function(x){x.classList.toggle('over',x===s)})});
slots.addEventListener('dragleave',function(e){var s=e.target.closest('.slot');if(s&&!s.contains(e.relatedTarget))s.classList.remove('over')});
slots.addEventListener('drop',function(e){var s=e.target.closest('.slot');if(!s)return;e.preventDefault();s.classList.remove('over');var slug=e.dataTransfer.getData('text/plain');if(BY[slug])addTo(slug,+s.dataset.slot)});

renderChips();refresh();
if(location.hash.length>1&&BY[location.hash.slice(1)])recipeView(location.hash.slice(1));
})();
