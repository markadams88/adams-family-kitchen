(function(){
'use strict';
var I=DATA.I, R=DATA.R, P=DATA.P||{};
var BY={}; R.forEach(function(r){BY[r.slug]=r});
var AISLES=[['meat','Meat'],['fish','Fish'],['veg','Fruit and veg'],['fridge','Fridge'],['bakery','Bread'],['frozen','Frozen'],['cupboard','Tins, rice and pasta'],['pantry','Store cupboard'],['spices','Herbs and spices']];
var CHECK={pantry:1,spices:1};
var UTM='utm_source=adams_family_kitchen&utm_medium=referral';
var DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
var DAY3=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
var $=function(s,el){return (el||document).querySelector(s)};
var esc=function(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
function isSlug(s){return !!(s&&BY[s])}

/* ---------- dates ---------- */
function noon(d){d=new Date(d);d.setHours(12,0,0,0);return d}
function isoOf(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function fromIso(s){var p=s.split('-');return new Date(+p[0],+p[1]-1,+p[2],12)}
function mondayOf(d){d=noon(d);d.setDate(d.getDate()-((d.getDay()+6)%7));return isoOf(d)}
function addDays(iso,n){var d=fromIso(iso);d.setDate(d.getDate()+n);return isoOf(d)}
function dateOf(iso,i){return fromIso(addDays(iso,i))}
function fmt(d,o){return d.toLocaleDateString('en-GB',o)}
function short(d){return fmt(d,{day:'numeric',month:'short'})}
var THIS=mondayOf(new Date());
function weekName(iso){var diff=Math.round((fromIso(iso)-fromIso(THIS))/864e5/7);
  return diff===0?'This week':diff===1?'Next week':diff===-1?'Last week':diff>1?'In '+diff+' weeks':Math.abs(diff)+' weeks ago'}
function weekRange(iso){return short(fromIso(iso))+' to '+short(dateOf(iso,6))}

/* ---------- state ---------- */
var S={wk:THIS,weeks:{},filter:'All',q:''};
try{var sv=JSON.parse(localStorage.getItem('afk-weeks')||'null');if(sv&&sv.weeks)S.weeks=sv.weeks;
  else{var old=JSON.parse(localStorage.getItem('afk-week')||'null');
    if(old&&old.plan){var d=[null,null,null,null,null,null,null],j=0;old.plan.slice(0,old.n||7).forEach(function(s){if(isSlug(s)&&j<7)d[j++]=s});if(j)S.weeks[THIS]={d:d}}}}catch(e){}
function W(iso){iso=iso||S.wk;if(!S.weeks[iso])S.weeks[iso]={d:[null,null,null,null,null,null,null]};return S.weeks[iso]}
function days(iso){var w=S.weeks[iso||S.wk];return w?w.d:[null,null,null,null,null,null,null]}
function meals(iso){var out=[];days(iso).forEach(function(s,i){if(isSlug(s))out.push({day:i,slug:s})});return out}
function save(){Object.keys(S.weeks).forEach(function(k){if(!S.weeks[k].d.some(Boolean))delete S.weeks[k]});
  try{localStorage.setItem('afk-weeks',JSON.stringify({v:2,weeks:S.weeks}))}catch(e){}}

var FAV=[];try{FAV=JSON.parse(localStorage.getItem('afk-fav')||'[]')||[]}catch(e){}
function isFav(s){return FAV.indexOf(s)>=0}
function saveFav(){try{localStorage.setItem('afk-fav',JSON.stringify(FAV))}catch(e){}}
function toggleFav(s){var i=FAV.indexOf(s);if(i>=0)FAV.splice(i,1);else FAV.push(s);saveFav();
  document.querySelectorAll('[data-fav="'+s+'"]').forEach(function(b){var on=isFav(s),r=BY[s];b.classList.toggle('on',on);b.setAttribute('aria-pressed',on);b.setAttribute('aria-label',(on?'Remove ':'Add ')+r.title+(on?' from':' to')+' favourites');if(b.classList.contains('btn'))b.textContent=on?'★ Favourite':'☆ Favourite';else b.textContent=on?'★':'☆'});
  if(S.filter==='Favourites')renderGrid();renderChips();toast(isFav(s)?'Added to favourites':'Removed from favourites')}

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
/* amounts in the normalised units used for adding up (tsp folded into tbsp) */
function norm(q,u){if(u==='tsp')return [q/3,'tbsp'];return [q,u||'']}
function amt(q,u,k){
  if(k==='garlic')return num(q)+' clove'+(q>1?'s':'');
  if(u==='tbsp'){var t=Math.round(q*3),tb=Math.floor(t/3),ts=t%3;return [tb?tb+' tbsp':'',ts?ts+' tsp':''].filter(Boolean).join(' + ')||'a pinch'}
  if(u==='')return num(q);
  return qtyText(q,u)}
function sumText(list,k){var by={};list.forEach(function(e){by[e.u]=(by[e.u]||0)+e.q});
  return Object.keys(by).map(function(u){return amt(by[u],u,k)}).join(' + ')}

/* ---------- a week's ingredients: who uses what, on which day ---------- */
function usage(iso){var U={};
  meals(iso).forEach(function(m){BY[m.slug].ings.forEach(function(x){var n=norm(x[0],x[1]),k=x[2];
    (U[k]=U[k]||[]).push({day:m.day,slug:m.slug,q:n[0],u:n[1]})})});
  return U}
function shortTitle(s){return BY[s].title.replace(/^Slow cooker /i,'').replace(/^(\w)/,function(c){return c.toUpperCase()})}
/* note shown next to an ingredient when other dinners that week use it too */
function shareNote(k,day,U){var list=U&&U[k];if(!list||list.length<2)return null;
  var mine=list.filter(function(e){return e.day===day}),rest=list.filter(function(e){return e.day!==day});
  if(!mine.length)return null;
  var total=sumText(list,k),use=sumText(mine,k);
  var keep=rest.map(function(e){return amt(e.q,e.u,k)+' for '+DAY3[e.day]+' ('+shortTitle(e.slug)+')'});
  return {use:use,total:total,keep:keep,text:'Only use '+use+' of the '+total+'. Save '+(keep.length>1?keep.slice(0,-1).join(', ')+' and '+keep[keep.length-1]:keep[0])+'.'}}

/* ---------- merging for the shopping list ---------- */
function merged(iso){var U=usage(iso),out={};AISLES.forEach(function(a){out[a[0]]=[]});
  Object.keys(U).forEach(function(k){var list=U[k],by={};list.forEach(function(e){by[e.u]=(by[e.u]||0)+e.q});
    var parts=Object.keys(by).map(function(u){var q=by[u];
      if(k==='garlic'){var b=Math.ceil(q/10);return num(q)+' cloves (about '+b+' bulb'+(b>1?'s':'')+')'}
      return amt(q,u,k)});
    var nm=I[k][0],single=Object.keys(by).length===1&&by['']===1;
    out[I[k][1]].push({k:k,name:single?singular(nm):nm,q:parts.join(' + '),
      split:list.length>1?list.map(function(e){return {day:e.day,slug:e.slug,a:amt(e.q,e.u,k)}}):null})});
  Object.keys(out).forEach(function(a){out[a].sort(function(x,y){return x.name.localeCompare(y.name)})});
  return out}

/* ---------- filters ---------- */
var FILTERS=['All','Favourites','Slow cooker','Dump and bake','Chicken','Beef','Pork','Lamb','Fish','Vegetarian','Kids love it','Curry night','Freezes well'];
function matches(r){var f=S.filter;
  if(f==='Favourites')return isFav(r.slug)&&(!S.q||matchQ(r));
  if(f==='Slow cooker'&&r.method!=='slow')return false;
  if(f==='Dump and bake'&&r.method!=='oven')return false;
  if(f!=='All'&&f!=='Slow cooker'&&f!=='Dump and bake'&&r.tags.indexOf(f)<0)return false;
  return !S.q||matchQ(r)}
function matchQ(r){var hay=(r.title+' '+r.summary+' '+r.tags.join(' ')+' '+r.ings.map(function(x){return I[x[2]][0]}).join(' ')).toLowerCase();
  return S.q.toLowerCase().split(/\s+/).every(function(w){return hay.indexOf(w)>=0})}
function renderChips(){$('#chips').innerHTML=FILTERS.map(function(f){return '<button type="button" class="chip" aria-pressed="'+(S.filter===f)+'" data-f="'+f+'">'+(f==='Favourites'?'★ Favourites'+(FAV.length?' ('+FAV.length+')':''):f)+'</button>'}).join('')}

/* ---------- grid ---------- */
function dayIn(slug,iso){return days(iso).indexOf(slug)}
function card(r){var m=r.method==='slow'?'<span class="meth label m-slow">Slow cooker</span>':'<span class="meth label m-oven">Dump &amp; bake</span>';
  var di=dayIn(r.slug),on=di>=0;
  return '<article class="card" draggable="true" data-slug="'+r.slug+'">'+
   '<button type="button" class="open" data-open="'+r.slug+'" aria-label="Open '+esc(r.title)+'">'+
   '<div class="ph">'+imgTag(r.slug,600)+m+(on?'<span class="onday label">'+DAY3[di]+'</span>':'')+'</div>'+
   '<div class="body"><h3>'+esc(r.title)+'</h3><p>'+esc(r.summary)+'</p>'+
   '<div class="meta"><span><b>'+r.prep+' min</b> prep</span><span><b>'+esc(r.cook)+'</b></span></div>'+
   (r.inspired?'<div class="inspo">Idea from Taming Twins</div>':'')+'</div></button>'+
   '<button type="button" class="add'+(on?' on':'')+'" data-add="'+r.slug+'" aria-label="'+(on?'Remove '+esc(r.title)+' from':'Add '+esc(r.title)+' to')+' the week">'+(on?'✓':'+')+'</button>'+
   '<button type="button" class="fav'+(isFav(r.slug)?' on':'')+'" data-fav="'+r.slug+'" aria-pressed="'+isFav(r.slug)+'" aria-label="'+(isFav(r.slug)?'Remove '+esc(r.title)+' from':'Add '+esc(r.title)+' to')+' favourites">'+(isFav(r.slug)?'★':'☆')+'</button></article>'}
function renderGrid(){var list=R.filter(matches);
  $('#grid').innerHTML=list.map(card).join('')||(S.filter==='Favourites'&&!FAV.length?'<p>No favourites yet. Tap the ☆ on any recipe to keep it here.</p>':'<p>No recipes match that. Try another word or filter.</p>');
  $('#count').textContent=list.length+' recipe'+(list.length===1?'':'s')+(S.filter!=='All'?' · '+S.filter:'')}

/* ---------- week planner ---------- */
function renderWeek(){var d=days(),iso=S.wk;
  $('#wkname').textContent=weekName(iso);
  $('#wkrange').textContent=weekRange(iso);
  var h='';for(var i=0;i<7;i++){var s=d[i],dt=dateOf(iso,i),today=isoOf(dt)===isoOf(noon(new Date()));
    var lab='<span class="n'+(today?' today':'')+'"><b>'+DAY3[i]+'</b>'+dt.getDate()+'</span>';
    if(isSlug(s))h+='<div class="slot full" data-slot="'+i+'" draggable="true" data-move="'+i+'">'+lab+
      '<div class="th">'+imgTag(s,160)+'</div><span class="t" data-open="'+s+'" data-day="'+i+'">'+esc(BY[s].title)+'</span><button type="button" class="x" data-rm="'+i+'" aria-label="Remove '+esc(BY[s].title)+'">×</button></div>';
    else if(s==='off')h+='<div class="slot off" data-slot="'+i+'">'+lab+'<span class="e">Night off, no cooking</span><button type="button" class="x" data-rm="'+i+'" aria-label="Undo night off">↺</button></div>';
    else if(past(i,iso))h+='<div class="slot past" data-slot="'+i+'">'+lab+'<span class="e">Gone by</span></div>';
    else h+='<div class="slot" data-slot="'+i+'">'+lab+'<span class="e">Drag a recipe here or tap +</span><button type="button" class="offb" data-off="'+i+'">Night off</button></div>'}
  $('#slots').innerHTML=h;
  var c=meals().length,off=d.filter(function(x){return x==='off'}).length;
  $('#wksum').textContent=c?c+' dinner'+(c>1?'s':'')+' planned'+(off?' · '+off+' night'+(off>1?'s':'')+' off':''):'Nothing planned yet';
  $('#wbcount').textContent=c;
  ['#shopbtn','#mdbtn','#pdfbtn'].forEach(function(b){$(b).disabled=!c});
  $('#shopbtn').textContent=c?'Shopping list for '+c+' dinner'+(c>1?'s':''):'Shopping list';
  save()}
function past(i,iso){return isoOf(dateOf(iso||S.wk,i))<isoOf(noon(new Date()))}
function setWeek(iso){S.wk=iso;refresh()}
function addTo(slug,slot){var d=W().d,cur=d.indexOf(slug);
  if(slot===undefined){if(cur>=0){d[cur]=null;toast('Removed from '+DAYS[cur]);refresh();return}
    slot=d.findIndex(function(x,i){return !x&&!past(i)});if(slot<0&&d.every(function(x,i){return x||past(i)})&&S.wk===THIS){toast('The rest of this week is full. Use › to plan next week.');openWeek();return}
    if(slot<0){toast('That week is full. Remove a dinner or go to next week.');openWeek();return}}
  else if(cur>=0&&cur!==slot){d[cur]=isSlug(d[slot])?d[slot]:null}
  d[slot]=slug;toast(BY[slug].title+' on '+DAYS[slot]);refresh()}
function refresh(){renderWeek();renderGrid()}
function openWeek(){$('#week').classList.add('open')}

/* ---------- overlays ---------- */
var lastFocus=null,keyNav=null;
function show(html,wide){lastFocus=document.activeElement;$('#sheet').className='sheet'+(wide?' wide':'');$('#sheet').innerHTML='<button type="button" class="close" data-close aria-label="Close">×</button>'+html;$('#ov').hidden=false;document.body.style.overflow='hidden';$('#ov').scrollTop=0;keyNav=null;$('#sheet').onclick=null;setTimeout(function(){var c=$('.close');if(c)c.focus()},30)}
function hide(){$('#ov').hidden=true;document.body.style.overflow='';keyNav=null;if(location.hash)history.replaceState(null,'',location.pathname);if(lastFocus&&lastFocus.focus)lastFocus.focus()}

/* ---------- recipe view and step-by-step cook mode ---------- */
function recipeView(slug,opt){var r=BY[slug];if(!r)return;opt=opt||{};
  var iso=opt.wk||S.wk,day=opt.day!==undefined?opt.day:dayIn(slug,iso);
  if(day>=0&&days(iso)[day]!==slug)day=-1;
  var U=day>=0?usage(iso):null;
  var notes=r.ings.map(function(x){return day>=0?shareNote(x[2],day,U):null});
  var shared=notes.filter(Boolean).length;
  function ingList(cls){return '<ul class="ings'+(cls?' '+cls:'')+'">'+r.ings.map(function(x,i){var l=ingLine(x[0],x[1],x[2]),n=notes[i];
    return '<li><label><input type="checkbox"><span><span class="q">'+esc(l.q)+'</span> '+esc(l.name)+(n?'<span class="share">'+esc(n.text)+'</span>':'')+'</span></label></li>'}).join('')+'</ul>'}
  var steps='<ol class="steps-list">'+r.steps.map(function(s){return '<li><div><b>'+esc(s[0])+'</b>'+esc(s[1])+'</div></li>'}).join('')+'</ol>';
  var when=day>=0?'<div class="when"><span class="label">On the menu</span><b>'+fmt(dateOf(iso,day),{weekday:'long',day:'numeric',month:'long'})+'</b>'+(shared?'<span>'+shared+' ingredient'+(shared>1?'s are':' is')+' shared with other dinners this week. The yellow notes tell you how much to use so you don\'t run short later in the week.</span>':'')+'</div>':'';
  var on=day>=0;
  show('<div class="hero">'+imgTag(slug,1400)+'</div><div class="credit">'+credit(slug)+(r.inspired?' · Idea from <a href="'+r.inspired+'" target="_blank" rel="noopener">Taming Twins</a>':'')+'</div>'+
   '<div class="r-in"><span class="label" style="color:var(--mark)">'+(r.method==='slow'?'Slow cooker':'Dump and bake')+'</span><h2 id="dlgTitle">'+esc(r.title)+'</h2><p class="lede">'+esc(r.summary)+'</p>'+when+
   '<div class="facts"><div class="fact"><b>'+r.prep+' min</b>morning prep</div><div class="fact"><b>'+esc(r.cook)+'</b>'+(r.method==='slow'?'then leave it':'at tea time')+'</div><div class="fact"><b>Serves 5</b>2 adults, 3 boys</div><div class="fact"><b>'+r.ings.length+'</b>ingredients</div></div>'+
   '<div class="r-actions"><button type="button" class="btn btn-main" data-cook>▶ Cook step by step</button><button type="button" class="btn btn-ghost" data-add="'+slug+'">'+(on?'✓ In '+weekName(iso).toLowerCase():'+ Add to '+weekName(iso).toLowerCase())+'</button><button type="button" class="btn btn-ghost favbtn'+(isFav(slug)?' on':'')+'" data-fav="'+slug+'" aria-pressed="'+isFav(slug)+'">'+(isFav(slug)?'★ Favourite':'☆ Favourite')+'</button></div>'+
   '<div class="tabs" role="tablist"><button class="tab" role="tab" aria-selected="false" data-tab="cook">Step by step</button><button class="tab" role="tab" aria-selected="true" data-tab="all">Everything on one page</button></div>'+
   '<div id="tabbody"></div></div>');
  /* cards: 0 = what you need, 1..n = the steps, last = serve */
  var cards=[{k:'Before you start',h:'Get everything out',body:'<p class="sub">'+(r.method==='slow'?'This is the morning job. About '+r.prep+' minutes, then the slow cooker does the rest.':'Build it in the morning (about '+r.prep+' minutes), cover it and keep it in the fridge. It goes in the oven at tea time.')+'</p>'+ingList('compact')}]
    .concat(r.steps.map(function(s){return {h:s[0],body:'<p>'+esc(s[1])+'</p>'}}))
    .concat([{k:'Ready',h:'Serve it up',body:'<p>Serve with '+esc(r.serve.charAt(0).toLowerCase()+r.serve.slice(1))+'.</p>'}]);
  var step=0,curTab;
  function all(){$('#tabbody').innerHTML='<div class="cols"><div><h3 class="label" style="margin:0 0 6px">You need</h3>'+ingList()+'</div><div><h3 class="label" style="margin:0 0 6px">Method</h3>'+steps+'<div class="serve"><b style="font-family:var(--sans)">Serve with:</b> '+esc(r.serve)+'</div></div></div>'}
  function cook(){var n=cards.length,c=cards[step];
    $('#tabbody').innerHTML='<div class="cook"><div class="dots">'+cards.map(function(_,i){return '<button type="button" class="'+(i<=step?'on':'')+'" data-go="'+i+'" aria-label="Go to '+(i===0?'what you need':i===n-1?'serving':'step '+i)+'"></button>'}).join('')+'</div>'+
     '<div class="card-step'+(step===0?' first':'')+'" aria-live="polite"><div class="sp">'+imgTag(slug,900)+'<span class="badge label">'+(step===0?'Start':step===n-1?'Done':'Step '+step+' of '+(n-2))+'</span></div>'+
     '<div class="sc"><span class="label k">'+esc(c.k||('Step '+step))+'</span><h3>'+esc(c.h)+'</h3>'+c.body+'</div></div>'+
     '<div class="nav"><button type="button" class="btn btn-ghost" data-prev '+(step?'':'disabled')+'>Back</button><button type="button" class="btn btn-main" data-next>'+(step===0?'Start step 1':step===n-1?'Done, enjoy it':step===n-2?'Last bit':'Next step')+'</button></div></div>'}
  function setTab(t){[].forEach.call(document.querySelectorAll('.tab'),function(b){b.setAttribute('aria-selected',b.dataset.tab===t)});curTab=t;t==='cook'?cook():all()}
  setTab(opt.tab||'all');
  $('#sheet').onclick=function(e){var t=e.target.closest('button');if(!t)return;
    if(t.dataset.tab)setTab(t.dataset.tab);
    if(t.dataset.go!==undefined){step=+t.dataset.go;cook()}
    if(t.hasAttribute('data-cook')){step=0;setTab('cook');$('.tabs').scrollIntoView({behavior:'smooth',block:'start'})}
    if(t.hasAttribute('data-next')){if(step<cards.length-1){step++;cook();$('.tabs').scrollIntoView({block:'start'})}else{setTab('all');toast('Enjoy your tea')}}
    if(t.hasAttribute('data-prev')&&step>0){step--;cook()}
    if(t.dataset.add){addTo(slug);var d2=dayIn(slug,iso);t.textContent=d2>=0?'✓ On '+DAYS[d2]:'+ Add to '+weekName(iso).toLowerCase()}};
  keyNav=function(e){if(curTab!=='cook')return;if(e.key==='ArrowRight'&&step<cards.length-1){step++;cook()}if(e.key==='ArrowLeft'&&step>0){step--;cook()}};
  history.replaceState(null,'','#'+slug)}

/* ---------- shopping list for a week ---------- */
function splitText(x){return x.split.map(function(p){return DAY3[p.day]+' '+shortTitle(p.slug)+': '+p.a}).join(' · ')}
function shopView(iso){iso=iso||S.wk;var ms=meals(iso);if(!ms.length)return;var m=merged(iso);
  var shop=AISLES.filter(function(a){return !CHECK[a[0]]&&m[a[0]].length}),cup=AISLES.filter(function(a){return CHECK[a[0]]&&m[a[0]].length});
  function block(a){return '<div class="aisle"><h4 class="label">'+a[1]+'</h4><ul class="ings">'+m[a[0]].map(function(x){return '<li><label><input type="checkbox"><span><span class="q">'+esc(x.q)+'</span> '+esc(x.name)+(x.split?'<span class="split">'+esc(splitText(x))+'</span>':'')+'</span></label></li>'}).join('')+'</ul></div>'}
  show('<div class="r-in shop"><span class="label" style="color:var(--mark)">Shopping list · '+weekName(iso)+'</span><h2 id="dlgTitle">'+ms.length+' dinner'+(ms.length>1?'s':'')+', '+weekRange(iso)+'</h2>'+
   '<div class="meals-sum">'+ms.map(function(x){return '<button type="button" class="ms" data-goto="'+x.slug+'" data-day="'+x.day+'"><span class="msi">'+imgTag(x.slug,80)+'</span><span><small>'+DAY3[x.day]+'</small> '+esc(BY[x.slug].title)+'</span></button>'}).join('')+'</div>'+
   '<div class="r-actions"><button type="button" class="btn btn-main" data-pdf>Download PDF</button><button type="button" class="btn btn-ghost" data-md>Download for the shopping agent (.md)</button><button type="button" class="btn btn-ghost" data-copy>Copy list</button></div>'+
   '<p class="note">Everything is added up across the week, so you only buy it once. Where an item is shared, the grey line shows how it splits by day, and each recipe tells you how much to use. Weekly essentials are not included.</p>'+
   '<div class="cols"><div>'+shop.map(block).join('')+'</div><div><div class="tip" style="background:var(--rory-pale)"><span>Check the cupboard first. You probably have most of these.</span></div>'+cup.map(block).join('')+'</div></div></div>');
  $('#sheet').onclick=function(e){var t=e.target.closest('button');if(!t)return;
    if(t.dataset.goto)recipeView(t.dataset.goto,{wk:iso,day:+t.dataset.day});
    if(t.hasAttribute('data-md'))downloadMD(iso);
    if(t.hasAttribute('data-pdf'))downloadPDF(iso,t);
    if(t.hasAttribute('data-copy')){var txt=toMD(iso);(navigator.clipboard?navigator.clipboard.writeText(txt):Promise.reject()).then(function(){toast('Copied')},function(){toast('Copy did not work, use Download instead')})}}}

/* ---------- plan ahead: the calendar of weeks ---------- */
var SHOWN=12;
function planView(){var list=[],seen={};
  for(var i=-1;i<SHOWN;i++){var w=addDays(THIS,7*i);list.push(w);seen[w]=1}
  Object.keys(S.weeks).sort().forEach(function(w){if(!seen[w]&&S.weeks[w].d.some(Boolean))list.push(w)});
  list.sort();
  var rows=list.map(function(w){var d=days(w),c=meals(w).length;
    return '<div class="cal-row'+(w===S.wk?' cur':'')+(w===THIS?' now':'')+'"><button type="button" class="cal-w" data-wk="'+w+'"><b>'+weekName(w)+'</b><span>'+weekRange(w)+'</span><small>'+(c?c+' dinner'+(c>1?'s':''):'Nothing planned')+'</small></button>'+
      d.map(function(s,i){return '<button type="button" class="cal-d'+(isSlug(s)?' has':'')+(s==='off'?' off':'')+'" data-wk="'+w+'" data-cd="'+i+'" title="'+(isSlug(s)?esc(BY[s].title):s==='off'?'Night off':'Empty')+'"><span class="dn">'+dateOf(w,i).getDate()+'</span>'+(isSlug(s)?imgTag(s,120)+'<span class="ct">'+esc(shortTitle(s))+'</span>':s==='off'?'<span class="ct">Off</span>':'')+'</button>'}).join('')+
      '<div class="cal-a">'+(c?'<button type="button" class="mini" data-shop="'+w+'">List</button><button type="button" class="mini" data-wmd="'+w+'">.md</button><button type="button" class="mini" data-wpdf="'+w+'">PDF</button>':'')+'</div></div>'}).join('');
  show('<div class="r-in"><span class="label" style="color:var(--mark)">Plan ahead</span><h2 id="dlgTitle">Your weeks</h2><p class="note">Tap a week to plan it, or tap a dinner to open it. Plan as far ahead as you like.</p>'+
   '<div class="cal"><div class="cal-row head"><span></span>'+DAY3.map(function(d){return '<span class="label">'+d+'</span>'}).join('')+'<span></span></div>'+rows+'</div>'+
   '<div class="r-actions" style="margin-top:16px"><button type="button" class="btn btn-ghost" data-more>Show 12 more weeks</button></div></div>',true);
  $('#sheet').onclick=function(e){var t=e.target.closest('button');if(!t)return;
    if(t.dataset.cd!==undefined){var s=days(t.dataset.wk)[+t.dataset.cd];if(isSlug(s)){recipeView(s,{wk:t.dataset.wk,day:+t.dataset.cd});return}S.wk=t.dataset.wk;refresh();hide();openWeek();toast(weekName(S.wk)+': drag a recipe onto '+DAYS[+t.dataset.cd]);return}
    if(t.dataset.wk){S.wk=t.dataset.wk;refresh();hide();openWeek();return}
    if(t.dataset.shop)shopView(t.dataset.shop);
    if(t.dataset.wmd)downloadMD(t.dataset.wmd);
    if(t.dataset.wpdf)downloadPDF(t.dataset.wpdf,t);
    if(t.hasAttribute('data-more')){SHOWN+=12;planView();$('#ov').scrollTop=1e6}}}

/* ---------- downloads ---------- */
function fileDate(iso){return iso}
function save_(blob,name){var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)}
function downloadMD(iso){if(!meals(iso).length){toast('Nothing planned that week');return}save_(new Blob([toMD(iso)],{type:'text/markdown'}),'adams-week-'+fileDate(iso)+'.md');toast('Downloaded')}
function toMD(iso){var ms=meals(iso),m=merged(iso),U=usage(iso),base=location.origin+location.pathname,d=days(iso);
  var L=['# Adams family dinners: week of '+fmt(fromIso(iso),{day:'numeric',month:'long',year:'numeric'}),'',weekRange(iso)+' · '+ms.length+' dinners · feeds 5 (2 adults, 3 young boys)','','## Menu',''];
  for(var i=0;i<7;i++){var s=d[i],dt=fmt(dateOf(iso,i),{weekday:'long',day:'numeric',month:'short'});
    if(isSlug(s)){var r=BY[s];L.push('- **'+dt+':** '+r.title+' ('+(r.method==='slow'?'slow cooker, '+r.cook:'dump and bake, '+r.cook)+', '+r.prep+' min prep) '+base+'#'+s)}
    else if(s==='off')L.push('- **'+dt+':** night off')}
  L.push('','## Shopping list (everything combined, buy once)','');
  AISLES.forEach(function(a){if(CHECK[a[0]]||!m[a[0]].length)return;L.push('### '+a[1]);m[a[0]].forEach(function(x){L.push('- [ ] '+x.q+' '+x.name+(x.split?' _(split: '+splitText(x)+')_':''))});L.push('')});
  L.push('## Check the cupboard first (only buy if we have run out)','');
  AISLES.forEach(function(a){if(!CHECK[a[0]]||!m[a[0]].length)return;L.push('### '+a[1]);m[a[0]].forEach(function(x){L.push('- [ ] '+x.q+' '+x.name+(x.split?' _(split: '+splitText(x)+')_':''))});L.push('')});
  L.push('## Day by day: how much to use','','Shared ingredients are bought once for the week. Use only the amount shown so there is enough left for later dinners.','');
  ms.forEach(function(x){var r=BY[x.slug];L.push('### '+DAYS[x.day]+': '+r.title,'');
    r.ings.forEach(function(g){var l=ingLine(g[0],g[1],g[2]),n=shareNote(g[2],x.day,U);L.push('- '+l.q+' '+l.name+(n?' **(shared: '+n.text+')**':''))});
    L.push('','Method:');r.steps.forEach(function(st,j){L.push((j+1)+'. **'+st[0]+'.** '+st[1])});L.push('','Serve with: '+r.serve,'')});
  L.push('## Notes for the shopping agent','','- Quantities are totals across all the dinners above. Round up to the nearest pack size.','- **Allergy: no prawns or shellfish.** Check any prepared foods, including dumplings and stir-fry sauces.','- Weekly essentials (milk, bread, fruit and so on) are not on this list and are handled separately.','- Swap like for like if something is out of stock (for example a different brand of curry paste).','');
  return L.join('\n')}

function pdfHTML(iso){var ms=meals(iso),m=merged(iso),U=usage(iso),d=days(iso);
  var h='<div class="pdf"><div class="pdf-head"><img src="img/logo-stacked-white.png" alt=""><div><div class="pk">Dinners for the week</div><div class="pt">'+fmt(fromIso(iso),{day:'numeric',month:'long',year:'numeric'})+'</div><div class="ps">'+weekRange(iso)+' · '+ms.length+' dinners · feeds 2 adults and 3 boys</div></div></div><div class="pdf-strip"><span style="background:#1E5EFF"></span><span style="background:#00A878"></span><span style="background:#FF5A4E"></span><span style="background:#FF9A3C"></span><span style="background:#FFD84D"></span></div>';
  h+='<h2>Menu</h2><div class="pdf-menu">';
  for(var i=0;i<7;i++){var s=d[i];h+='<div class="pm pdf-avoid'+(isSlug(s)?'':' empty')+'"><div class="pd"><b>'+DAY3[i]+'</b>'+dateOf(iso,i).getDate()+'</div>'+
    (isSlug(s)?'<img src="'+photo(s,300)+'" alt=""><div class="pi"><b>'+esc(BY[s].title)+'</b><span>'+(BY[s].method==='slow'?'Slow cooker':'Dump and bake')+' · '+BY[s].prep+' min prep · '+esc(BY[s].cook)+'</span></div>':'<div class="pi"><span>'+(s==='off'?'Night off':'Nothing planned')+'</span></div>')+'</div>'}
  h+='</div>';
  function blk(a){return '<div class="pa pdf-avoid"><h4>'+a[1]+'</h4>'+m[a[0]].map(function(x){return '<div class="pr"><span class="bx"></span><span><b>'+esc(x.q)+'</b> '+esc(x.name)+(x.split?'<em>'+esc(splitText(x))+'</em>':'')+'</span></div>'}).join('')+'</div>'}
  h+='<h2 class="pb">Shopping list</h2><p class="pn">Everything is combined, so each item is bought once. The small grey line shows how a shared item splits across the week.</p><div class="pcols"><div>'+AISLES.filter(function(a){return !CHECK[a[0]]&&m[a[0]].length}).map(blk).join('')+'</div><div><div class="pcheck">Check the cupboard first</div>'+AISLES.filter(function(a){return CHECK[a[0]]&&m[a[0]].length}).map(blk).join('')+'</div></div>';
  h+='<h2 class="pb">Day by day</h2><p class="pn">What to use each day. Yellow notes are shared ingredients: use only that amount so there is enough left.</p>';
  ms.forEach(function(x){var r=BY[x.slug];
    h+='<div class="pday pdf-avoid"><div class="pdh"><img src="'+photo(x.slug,300)+'" alt=""><div><span class="pk">'+DAYS[x.day]+' '+fmt(dateOf(iso,x.day),{day:'numeric',month:'long'})+'</span><b>'+esc(r.title)+'</b><span>'+(r.method==='slow'?'Slow cooker, '+esc(r.cook)+'. Morning prep '+r.prep+' min.':'Build in the morning ('+r.prep+' min), fridge, then '+esc(r.cook)+'.')+'</span></div></div>'+
      '<div class="pcols"><div>'+r.ings.map(function(g){var l=ingLine(g[0],g[1],g[2]),n=shareNote(g[2],x.day,U);return '<div class="pr"><span class="bx"></span><span><b>'+esc(l.q)+'</b> '+esc(l.name)+(n?'<i>'+esc(n.text)+'</i>':'')+'</span></div>'}).join('')+'</div>'+
      '<ol>'+r.steps.map(function(st){return '<li><b>'+esc(st[0])+'.</b> '+esc(st[1])+'</li>'}).join('')+'<li><b>Serve</b> with '+esc(r.serve.charAt(0).toLowerCase()+r.serve.slice(1))+'.</li></ol></div></div>'});
  h+='<p class="pfoot">No prawns or shellfish (Jade). Photos from Unsplash, credited on the website. markadams88.github.io/adams-family-kitchen</p></div>';
  return h}
/* the PDF is laid out in a hidden frame of its own, so nothing on the page can shift it */
function downloadPDF(iso,btn){if(!meals(iso).length){toast('Nothing planned that week');return}
  var lbl=btn?btn.textContent:'';if(btn){btn.disabled=true;btn.textContent='Making PDF…'}
  var css=[].map.call(document.querySelectorAll('style'),function(x){return x.textContent}).join('\n');
  var base=location.href.replace(/[#?].*$/,'').replace(/[^\/]*$/,'');
  var fr=document.createElement('iframe');fr.setAttribute('aria-hidden','true');fr.tabIndex=-1;
  fr.style.cssText='position:fixed;left:-10000px;top:0;width:820px;height:1200px;border:0;visibility:hidden';
  var done=function(ok){if(btn){btn.disabled=false;btn.textContent=lbl}toast(ok?'PDF downloaded':'The PDF could not be made here. Try the .md instead.');setTimeout(function(){fr.remove()},1500)};
  window.__pdfDone=done;
  fr.srcdoc='<!doctype html><html><head><meta charset="utf-8"><base href="'+base+'"><style>'+css+'body{margin:0;background:#fff;width:780px}</style></head><body>'+pdfHTML(iso)+
    '<script src="vendor/html2pdf.bundle.min.js" onerror="parent.__pdfDone(false)"><\/script><script>if(!window.html2pdf)throw 0<\/script><script>(function(){var imgs=[].slice.call(document.images);'+
    'Promise.all(imgs.map(function(i){return i.complete?0:new Promise(function(ok){i.onload=i.onerror=ok})})).then(function(){return document.fonts?document.fonts.ready:0}).then(function(){'+
    'return html2pdf().set({margin:[8,8,10,8],filename:'+JSON.stringify('adams-week-'+fileDate(iso)+'.pdf')+',image:{type:"jpeg",quality:.92},html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff"},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:["css","legacy"],before:".pb",avoid:".pdf-avoid"}}).from(document.querySelector(".pdf")).save()})'+
    '.then(function(){parent.__pdfDone(true)},function(){parent.__pdfDone(false)})})()<\/script></body></html>';
  document.body.appendChild(fr)}

/* ---------- toast ---------- */
var tt;function toast(t){var el=$('#toast');el.textContent=t;el.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){el.classList.remove('on')},2200)}

/* ---------- events ---------- */
document.addEventListener('click',function(e){var fv=e.target.closest('[data-fav]');if(fv){e.preventDefault();e.stopPropagation();toggleFav(fv.dataset.fav);return}
  if(e.target===$('#ov')){hide();return}
  var t=e.target.closest('[data-open],[data-add],[data-rm],[data-off],[data-close],[data-f]');
  if(!t)return;
  if(t.closest('#sheet')&&!t.hasAttribute('data-close'))return;
  if(t.hasAttribute('data-close'))hide();
  else if(t.dataset.f){S.filter=t.dataset.f;renderChips();renderGrid()}
  else if(t.dataset.add)addTo(t.dataset.add);
  else if(t.dataset.rm!==undefined){W().d[+t.dataset.rm]=null;refresh()}
  else if(t.dataset.off!==undefined){W().d[+t.dataset.off]='off';refresh()}
  else if(t.dataset.open)recipeView(t.dataset.open,t.dataset.day!==undefined?{wk:S.wk,day:+t.dataset.day}:null)});
document.addEventListener('keydown',function(e){if($('#ov').hidden)return;if(e.key==='Escape')hide();else if(keyNav)keyNav(e)});
$('#q').addEventListener('input',function(e){S.q=e.target.value.trim();renderGrid()});
$('#prevwk').onclick=function(){setWeek(addDays(S.wk,-7))};
$('#nextwk').onclick=function(){setWeek(addDays(S.wk,7))};
$('#clear').onclick=function(){if(!days().some(Boolean))return;S.weeks[S.wk]={d:[null,null,null,null,null,null,null]};refresh();toast(weekName(S.wk)+' cleared')};
$('#fill').onclick=function(){var d=W().d,pool=R.filter(function(r){return d.indexOf(r.slug)<0&&matches(r)}).map(function(r){return r.slug}),n=0;
  for(var i=0;i<7;i++){if(!d[i]&&!past(i)&&pool.length){d[i]=pool.splice(Math.floor(Math.random()*pool.length),1)[0];n++}}
  refresh();toast(n?'Filled '+n+' day'+(n>1?'s':'')+'. Swap any you don\'t fancy.':'No empty days to fill')};
$('#shopbtn').onclick=function(){shopView()};
$('#mdbtn').onclick=function(){downloadMD(S.wk)};
$('#pdfbtn').onclick=function(){downloadPDF(S.wk,this)};
$('#planbtn').onclick=function(){planView()};
$('#planbtn2').onclick=function(){planView()};
$('#weekbtn').onclick=function(){$('#week').classList.toggle('open')};
$('#wkclose').onclick=function(){$('#week').classList.remove('open')};

/* drag and drop: recipe cards onto days, and days onto other days */
var dragFrom=null;
document.addEventListener('dragstart',function(e){if(!e.target.closest)return;var c=e.target.closest('.card'),sl=e.target.closest('.slot[data-move]');
  if(c){dragFrom=null;e.dataTransfer.setData('text/plain',c.dataset.slug);e.dataTransfer.effectAllowed='copyMove';c.classList.add('dragging');if(window.innerWidth<=1000)openWeek()}
  else if(sl){dragFrom=+sl.dataset.move;e.dataTransfer.setData('text/plain',days()[dragFrom]);e.dataTransfer.effectAllowed='move'}});
document.addEventListener('dragend',function(e){var c=e.target.closest&&e.target.closest('.card');if(c)c.classList.remove('dragging')});
var slots=$('#slots');
slots.addEventListener('dragover',function(e){var s=e.target.closest('.slot');if(!s)return;e.preventDefault();[].forEach.call(slots.children,function(x){x.classList.toggle('over',x===s)})});
slots.addEventListener('dragleave',function(e){var s=e.target.closest('.slot');if(s&&!s.contains(e.relatedTarget))s.classList.remove('over')});
slots.addEventListener('drop',function(e){var s=e.target.closest('.slot');if(!s)return;e.preventDefault();s.classList.remove('over');var to=+s.dataset.slot,d=W().d;
  if(dragFrom!==null){var a=d[dragFrom];d[dragFrom]=d[to]==='off'?null:d[to];d[to]=a;dragFrom=null;refresh();return}
  var slug=e.dataTransfer.getData('text/plain');if(BY[slug])addTo(slug,to)});

renderChips();refresh();
if(location.hash.length>1&&BY[location.hash.slice(1)])recipeView(location.hash.slice(1));
})();
