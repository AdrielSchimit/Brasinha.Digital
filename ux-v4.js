// Brasinha UX V4 — fluxo guiado sem selects nativos gigantes.
(function(){
  let section='pizzas';
  let state={size:'M',mode:'full',a:null,b:null,border:null,picker:'a',search:'',showBorders:false};

  const sections={
    pizzas:{label:'Pizzas',icon:'🍕',ids:['classicas','especiais','gourmet','doces']},
    lanches:{label:'Lanches',icon:'🍔',ids:['burgers','extras']},
    porcoes:{label:'Porções',icon:'🍟',ids:['porcoes']},
    bebidas:{label:'Bebidas',icon:'🥤',ids:['bebidas','cervejas','drinks','soda']}
  };

  function safe(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
  function norm(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}
  function meta(raw){return raw?.[3]&&typeof raw[3]==='object'&&!Array.isArray(raw[3])?raw[3]:{};}
  function active(raw){return meta(raw).active!==false;}
  function prices(group,raw){return meta(raw).prices||group.prices||{M:0,G:0};}
  function image(group,name,raw){try{return itemImage(group,name,raw);}catch{return CATEGORY_IMAGES[group.id]||'assets/pizza-especial.jpg';}}
  function allFlavors(){
    return MENU.filter(g=>g.kind==='pizza').flatMap(g=>(g.items||[]).filter(active).map(raw=>({name:raw[0],desc:raw[1],group,prices:prices(g,raw),raw})));
  }
  function borders(){return (MENU.find(g=>g.id==='bordas')?.items||[]).filter(active).map(raw=>({name:raw[0],price:Number(raw[2]||0),raw}));}

  function installMainTabs(){
    const menuHead=document.querySelector('.menu-head');
    if(!menuHead||document.querySelector('#v4MainTabs'))return;
    const wrap=document.createElement('div');wrap.id='v4MainTabs';wrap.className='v4-main-tabs';
    menuHead.insertAdjacentElement('afterend',wrap);renderMainTabs();
  }
  function renderMainTabs(){
    const wrap=document.querySelector('#v4MainTabs');if(!wrap)return;
    wrap.innerHTML=Object.entries(sections).map(([id,s])=>`<button class="v4-main-tab ${section===id?'active':''}" data-v4-section="${id}"><span>${s.icon}</span>${s.label}</button>`).join('');
    wrap.querySelectorAll('[data-v4-section]').forEach(btn=>btn.onclick=()=>{section=btn.dataset.v4Section;renderMainTabs();renderMenu(document.querySelector('#search')?.value||'');document.querySelector('#menu')?.scrollIntoView({behavior:'smooth',block:'start'});});
  }

  renderMenu=function(q=''){
    const root=document.querySelector('#menu');if(!root)return;
    const query=norm(q),allowed=sections[section].ids;let rendered=0;root.innerHTML='';
    MENU.filter(g=>allowed.includes(g.id)).forEach(group=>{
      let items=(group.items||[]).map(raw=>({raw,name:raw[0],desc:raw[1],price:raw[2],extra:false})).filter(x=>active(x.raw));
      if(group.extras)items=items.concat(group.extras.map(raw=>({raw,name:raw[0],desc:raw[1],price:raw[2],extra:true})).filter(x=>active(x.raw)));
      items=items.filter(x=>!query||norm(`${x.name} ${x.desc} ${group.label}`).includes(query));
      if(!items.length)return;rendered++;
      const sec=document.createElement('section');sec.className='menu-group';sec.id=group.id;
      sec.innerHTML=`<div class="group-head"><h3>${safe(group.label)}</h3></div><div class="menu-grid"></div>`;
      const grid=sec.querySelector('.menu-grid');
      items.forEach(item=>{
        const card=document.createElement('article');card.className='menu-item';
        const p=prices(group,item.raw);
        const priceText=group.kind==='pizza'&&!item.extra?`M ${money(p.M)} · G ${money(p.G)}`:(item.price==null?'Consulte':money(item.price));
        card.innerHTML=`<div class="item-img"><img loading="lazy" src="${safe(image(group,item.name,item.raw))}" alt="${safe(item.name)}"></div><div class="item-body"><h4>${safe(item.name)}</h4><p>${safe(item.desc||'')}</p><div class="item-price">${priceText}</div><div class="item-actions"></div></div>`;
        const actions=card.querySelector('.item-actions');
        if(group.kind==='pizza'&&!item.extra){
          actions.innerHTML='<button class="v4-pizza-choice">Escolher</button>';
          actions.firstElementChild.onclick=()=>openBuilder(item.name);
        }else if(item.price!=null){
          actions.innerHTML=`<button class="v4-pizza-choice">Adicionar · ${money(item.price)}</button>`;
          actions.firstElementChild.onclick=()=>{addCart({type:'item',name:item.name,detail:group.label,price:Number(item.price)});};
        }
        grid.appendChild(card);
      });
      root.appendChild(sec);
    });
    if(!rendered)root.innerHTML='<div class="empty-filter">Nenhum item encontrado.</div>';
  };

  function installWizard(){
    const card=document.querySelector('.builder-card');if(!card||document.querySelector('#v4Wizard'))return;
    const wizard=document.createElement('div');wizard.id='v4Wizard';wizard.className='v4-wizard';
    const oldBreak=document.querySelector('#pizzaBreakdown');
    oldBreak.insertAdjacentElement('beforebegin',wizard);
  }

  function currentPrice(flavor){return flavor?Number(flavor.prices?.[state.size]||0):0;}
  function borderPrice(){return state.border?Number(state.border.price||0):0;}
  function total(){
    const pa=currentPrice(state.a),pb=currentPrice(state.b);
    const base=state.mode==='half'&&state.b?(pa/2+pb/2):pa;
    return base+borderPrice();
  }
  function chooseFlavor(name){
    const f=allFlavors().find(x=>x.name===name);if(!f)return;
    if(state.picker==='a')state.a=f;else state.b=f;
    state.search='';renderWizard();
  }
  function flavorPicker(target,title){
    state.picker=target;
    const selected=target==='a'?state.a:state.b;
    if(selected){
      return `<div class="v4-selected"><div><small>${title}</small><strong>${safe(selected.name)}</strong></div><button type="button" data-change-flavor="${target}">Trocar</button></div>`;
    }
    const list=allFlavors().filter(f=>!state.search||norm(`${f.name} ${f.group.label}`).includes(norm(state.search))).slice(0,30);
    return `<div class="v4-search"><input id="v4FlavorSearch" type="search" autocomplete="off" placeholder="🔎 Digite o sabor..." value="${safe(state.search)}"></div><div class="v4-flavors">${list.map(f=>`<button type="button" class="v4-flavor" data-flavor="${safe(f.name)}"><span><strong>${safe(f.name)}</strong><small>${safe(f.group.label)}</small></span><span class="v4-flavor-price">${money(currentPrice(f))}</span></button>`).join('')}</div>`;
  }

  function renderWizard(){
    const w=document.querySelector('#v4Wizard');if(!w)return;
    const needA=!state.a;
    const needB=state.mode==='half'&&!state.b;
    const border=state.border;
    w.innerHTML=`
      <section class="v4-step"><h3 class="v4-step-title"><span class="v4-step-number">1</span>Qual tamanho?</h3><div class="v4-choice-grid"><button type="button" class="v4-choice ${state.size==='M'?'active':''}" data-size="M">Média<small>A partir de ${money(state.a?state.a.prices.M:60)}</small></button><button type="button" class="v4-choice ${state.size==='G'?'active':''}" data-size="G">Grande<small>A partir de ${money(state.a?state.a.prices.G:70)}</small></button></div></section>
      <section class="v4-step"><h3 class="v4-step-title"><span class="v4-step-number">2</span>Como você quer?</h3><div class="v4-choice-grid"><button type="button" class="v4-choice ${state.mode==='full'?'active':''}" data-mode="full">Inteira<small>Um sabor</small></button><button type="button" class="v4-choice ${state.mode==='half'?'active':''}" data-mode="half">Meia a meia<small>Dois sabores</small></button></div></section>
      <section class="v4-step"><h3 class="v4-step-title"><span class="v4-step-number">3</span>${needA?'Escolha o sabor':'Seu sabor'}</h3>${flavorPicker('a','Primeiro sabor')}</section>
      ${state.mode==='half'?`<section class="v4-step"><h3 class="v4-step-title"><span class="v4-step-number">4</span>${needB?'Escolha o outro sabor':'Segundo sabor'}</h3>${flavorPicker('b','Segundo sabor')}</section>`:''}
      <section class="v4-step"><h3 class="v4-step-title"><span class="v4-step-number">${state.mode==='half'?5:4}</span>Borda <small style="font-weight:500;color:#918577">opcional</small></h3>${border?`<div class="v4-selected"><div><small>Borda escolhida</small><strong>${safe(border.name)} · +${money(border.price)}</strong></div><button type="button" data-remove-border>Remover</button></div>`:`<button type="button" class="v4-border-toggle" data-toggle-borders>+ Adicionar borda</button>`}${state.showBorders&&!border?`<div class="v4-border-list">${borders().map(b=>`<button type="button" class="v4-border" data-border="${safe(b.name)}"><span>${safe(b.name)}</span><strong>+${money(b.price)}</strong></button>`).join('')}</div>`:''}</section>
      <div class="v4-summary">${state.a?`<div class="v4-summary-line"><span>${state.mode==='half'?'½ ':' '}${safe(state.a.name)}</span><strong>${money(state.mode==='half'?currentPrice(state.a)/2:currentPrice(state.a))}</strong></div>`:''}${state.mode==='half'&&state.b?`<div class="v4-summary-line"><span>½ ${safe(state.b.name)}</span><strong>${money(currentPrice(state.b)/2)}</strong></div>`:''}${border?`<div class="v4-summary-line"><span>Borda ${safe(border.name)}</span><strong>+${money(border.price)}</strong></div>`:''}<div class="v4-summary-total"><span>Total</span><strong>${money(total())}</strong></div></div>
      <button type="button" class="v4-add" id="v4AddPizza" ${(!state.a||(state.mode==='half'&&!state.b))?'disabled':''}>Adicionar ao pedido · ${money(total())}</button>`;

    w.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>{state.size=b.dataset.size;renderWizard();});
    w.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{state.mode=b.dataset.mode;if(state.mode==='full')state.b=null;renderWizard();});
    w.querySelectorAll('[data-change-flavor]').forEach(b=>b.onclick=()=>{if(b.dataset.changeFlavor==='a')state.a=null;else state.b=null;state.picker=b.dataset.changeFlavor;renderWizard();setTimeout(()=>document.querySelector('#v4FlavorSearch')?.focus(),0);});
    w.querySelectorAll('[data-flavor]').forEach(b=>b.onclick=()=>chooseFlavor(b.dataset.flavor));
    const search=w.querySelector('#v4FlavorSearch');if(search)search.oninput=e=>{state.search=e.target.value;const pos=e.target.selectionStart;renderWizard();const n=document.querySelector('#v4FlavorSearch');if(n){n.focus();try{n.setSelectionRange(pos,pos);}catch{}}};
    w.querySelector('[data-toggle-borders]')?.addEventListener('click',()=>{state.showBorders=!state.showBorders;renderWizard();});
    w.querySelectorAll('[data-border]').forEach(b=>b.onclick=()=>{state.border=borders().find(x=>x.name===b.dataset.border)||null;state.showBorders=false;renderWizard();});
    w.querySelector('[data-remove-border]')?.addEventListener('click',()=>{state.border=null;state.showBorders=false;renderWizard();});
    w.querySelector('#v4AddPizza')?.addEventListener('click',()=>{
      if(!state.a||state.mode==='half'&&!state.b)return;
      const sizeLabel=state.size==='M'?'Média':'Grande';
      let name,detail;
      if(state.mode==='half'){name='Pizza meia a meia';detail=`½ ${state.a.name} + ½ ${state.b.name} · ${sizeLabel}`;}
      else{name=`Pizza ${state.a.name}`;detail=sizeLabel;}
      if(state.border)detail+=` · Borda ${state.border.name}`;
      addCart({type:'pizza',name,detail,price:total()});closeBuilder();openCart();
    });
  }

  openBuilder=function(prefill){
    state={size:'M',mode:'full',a:null,b:null,border:null,picker:'a',search:'',showBorders:false};
    if(prefill)state.a=allFlavors().find(f=>f.name===prefill)||null;
    const modal=document.querySelector('#pizzaModal');modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
    document.querySelector('#builderTitle').textContent=state.a?state.a.name:'Monte sua pizza';
    renderWizard();
  };

  function init(){installMainTabs();installWizard();renderMenu(document.querySelector('#search')?.value||'');renderWizard();}
  init();
})();
