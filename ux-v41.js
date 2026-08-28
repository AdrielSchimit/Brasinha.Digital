// Brasinha UX V4.1 — fluxo robusto, guiado e acessível.
(function(){
  const pizzaIds = new Set(['classicas','especiais','gourmet','doces']);
  const sections = {
    pizzas: {label:'Pizzas', icon:'🍕', ids:['classicas','especiais','gourmet','doces']},
    lanches:{label:'Lanches',icon:'🍔',ids:['burgers','extras']},
    porcoes:{label:'Porções',icon:'🍟',ids:['porcoes']},
    bebidas:{label:'Bebidas',icon:'🥤',ids:['bebidas','cervejas','drinks','soda']}
  };
  let activeSection='pizzas';
  let wizard=null;
  let drinkPromptHandled=false;

  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const meta=raw=>raw?.[3]&&typeof raw[3]==='object'&&!Array.isArray(raw[3])?raw[3]:{};
  const active=raw=>meta(raw).active!==false;
  const itemPrices=(g,raw)=>meta(raw).prices||g.prices||{M:0,G:0};
  const flavors=()=>MENU.filter(g=>g.kind==='pizza').flatMap(g=>(g.items||[]).filter(active).map(raw=>({name:raw[0],desc:raw[1],group:g,prices:itemPrices(g,raw),raw})));
  const borders=()=>((MENU.find(g=>g.id==='bordas')?.items)||[]).filter(active).map(raw=>({name:raw[0],price:Number(raw[2]||0),raw}));
  const drinks=()=>{
    const group=MENU.find(g=>g.id==='bebidas');
    return (group?.items||[]).filter(active).filter(raw=>raw[2]!=null).map(raw=>({name:raw[0],desc:raw[1],price:Number(raw[2])}));
  };

  function installSectionButtons(){
    if(document.querySelector('#v41Sections')) return;
    const head=document.querySelector('.menu-head');
    if(!head) return;
    const wrap=document.createElement('div');
    wrap.id='v41Sections';wrap.className='v41-sections';
    head.insertAdjacentElement('afterend',wrap);
    renderSectionButtons();
  }
  function renderSectionButtons(){
    const wrap=document.querySelector('#v41Sections'); if(!wrap) return;
    wrap.innerHTML=Object.entries(sections).map(([id,s])=>`<button type="button" class="v41-section ${id===activeSection?'active':''}" data-section="${id}"><span aria-hidden="true">${s.icon}</span><strong>${s.label}</strong></button>`).join('');
    wrap.querySelectorAll('[data-section]').forEach(btn=>btn.addEventListener('click',()=>{
      activeSection=btn.dataset.section;
      renderSectionButtons();
      applyMenuEnhancements();
      document.querySelector('#menu')?.scrollIntoView({behavior:'smooth',block:'start'});
    }));
  }

  function applyMenuEnhancements(){
    const allowed=new Set(sections[activeSection].ids);
    document.querySelectorAll('#menu .menu-group').forEach(sec=>{
      sec.hidden=!allowed.has(sec.id);
      if(sec.hidden) return;
      if(pizzaIds.has(sec.id)){
        sec.querySelectorAll('.menu-item').forEach(card=>{
          const name=card.querySelector('h4')?.textContent?.trim();
          const actions=card.querySelector('.item-actions');
          if(!name||!actions) return;
          actions.innerHTML='<button type="button" class="v41-choose">Escolher</button>';
          actions.querySelector('button').addEventListener('click',()=>openWizard(name));
        });
      } else {
        sec.querySelectorAll('.item-actions button').forEach(btn=>btn.classList.add('v41-simple-add'));
      }
    });
  }

  function getFlavor(name){return flavors().find(f=>f.name===name)||null;}
  function priceOf(f,size){return f?Number(f.prices?.[size]||0):0;}
  function wizardTotal(){
    if(!wizard?.a) return 0;
    const pa=priceOf(wizard.a,wizard.size);
    let base=pa;
    if(wizard.mode==='half'&&wizard.b) base=pa/2+priceOf(wizard.b,wizard.size)/2;
    return base+(wizard.border?.price||0);
  }

  function ensureWizardModal(){
    let modal=document.querySelector('#v41WizardModal');
    if(modal) return modal;
    modal=document.createElement('div');
    modal.id='v41WizardModal';modal.className='v41-modal';modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="v41-backdrop" data-v41-close></div><section class="v41-panel" role="dialog" aria-modal="true" aria-labelledby="v41Title"><button type="button" class="v41-close" data-v41-close aria-label="Fechar">×</button><div id="v41WizardBody"></div></section>';
    document.body.appendChild(modal);
    modal.querySelectorAll('[data-v41-close]').forEach(x=>x.addEventListener('click',closeWizard));
    return modal;
  }
  function openWizard(prefill){
    wizard={size:'M',mode:'full',a:prefill?getFlavor(prefill):null,b:null,border:null,borderDecision:null,searchA:'',searchB:''};
    const modal=ensureWizardModal();
    modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
    renderWizard();
  }
  function closeWizard(){
    const modal=document.querySelector('#v41WizardModal');if(!modal)return;
    modal.classList.remove('open');modal.setAttribute('aria-hidden','true');document.body.style.overflow='';
  }

  function flavorList(target){
    const q=norm(target==='a'?wizard.searchA:wizard.searchB);
    const other=target==='a'?wizard.b:wizard.a;
    return flavors().filter(f=>(!other||f.name!==other.name)&&(!q||norm(f.name+' '+f.group.label).includes(q))).slice(0,20);
  }
  function flavorChooser(target,label){
    const selected=target==='a'?wizard.a:wizard.b;
    if(selected) return `<div class="v41-selected"><div><small>${label}</small><strong>${esc(selected.name)}</strong><span>${money(priceOf(selected,wizard.size))}</span></div><button type="button" data-change="${target}">Trocar</button></div>`;
    return `<div class="v41-search"><label for="v41Search${target}">${label}</label><input id="v41Search${target}" data-search="${target}" type="search" inputmode="search" autocomplete="off" placeholder="Digite o sabor, ex.: calabresa"></div><div class="v41-flavor-list">${flavorList(target).map(f=>`<button type="button" data-flavor-target="${target}" data-flavor="${esc(f.name)}"><span><strong>${esc(f.name)}</strong><small>${esc(f.group.label)}</small></span><b>${money(priceOf(f,wizard.size))}</b></button>`).join('')}</div>`;
  }

  function renderWizard(){
    const body=document.querySelector('#v41WizardBody');if(!body||!wizard)return;
    const readyFlavors=wizard.a&&(wizard.mode==='full'||wizard.b);
    const stepFlavor=wizard.mode==='half'?5:4;
    body.innerHTML=`
      <p class="v41-eyebrow">MONTE SUA PIZZA</p>
      <h2 id="v41Title">${wizard.a?esc(wizard.a.name):'Escolha sua pizza'}</h2>
      <section class="v41-step"><h3>1. Qual tamanho?</h3><div class="v41-two"><button type="button" class="v41-choice ${wizard.size==='M'?'active':''}" data-size="M"><strong>Média</strong><small>${wizard.a?money(priceOf(wizard.a,'M')):'Escolher'}</small></button><button type="button" class="v41-choice ${wizard.size==='G'?'active':''}" data-size="G"><strong>Grande</strong><small>${wizard.a?money(priceOf(wizard.a,'G')):'Escolher'}</small></button></div></section>
      <section class="v41-step"><h3>2. Como você quer?</h3><div class="v41-two"><button type="button" class="v41-choice ${wizard.mode==='full'?'active':''}" data-mode="full"><strong>Inteira</strong><small>1 sabor</small></button><button type="button" class="v41-choice ${wizard.mode==='half'?'active':''}" data-mode="half"><strong>Meia a meia</strong><small>2 sabores</small></button></div></section>
      <section class="v41-step"><h3>3. ${wizard.a?'Sabor escolhido':'Escolha o sabor'}</h3>${flavorChooser('a','Primeiro sabor')}</section>
      ${wizard.mode==='half'&&wizard.a?`<section class="v41-step"><h3>4. ${wizard.b?'Segundo sabor':'Escolha o outro sabor'}</h3>${flavorChooser('b','Segundo sabor')}</section>`:''}
      ${readyFlavors?`<section class="v41-step"><h3>${stepFlavor}. Deseja borda recheada?</h3><div class="v41-two"><button type="button" class="v41-choice ${wizard.borderDecision==='no'?'active':''}" data-border-decision="no"><strong>Não, obrigado</strong><small>Sem adicional</small></button><button type="button" class="v41-choice ${wizard.borderDecision==='yes'?'active':''}" data-border-decision="yes"><strong>Sim</strong><small>Escolher borda</small></button></div>${wizard.borderDecision==='yes'?`<div class="v41-border-list">${borders().map(b=>`<button type="button" class="${wizard.border?.name===b.name?'active':''}" data-border="${esc(b.name)}"><span>${esc(b.name)}</span><b>+ ${money(b.price)}</b></button>`).join('')}</div>`:''}</section>`:''}
      ${readyFlavors&&wizard.borderDecision?`<div class="v41-summary">${wizard.mode==='half'?`<div><span>½ ${esc(wizard.a.name)}</span><b>${money(priceOf(wizard.a,wizard.size)/2)}</b></div><div><span>½ ${esc(wizard.b.name)}</span><b>${money(priceOf(wizard.b,wizard.size)/2)}</b></div>`:`<div><span>${esc(wizard.a.name)}</span><b>${money(priceOf(wizard.a,wizard.size))}</b></div>`}${wizard.border?`<div><span>Borda ${esc(wizard.border.name)}</span><b>+ ${money(wizard.border.price)}</b></div>`:''}<div class="total"><span>Total</span><b>${money(wizardTotal())}</b></div></div><button type="button" id="v41AddPizza" class="v41-primary">Adicionar ao pedido · ${money(wizardTotal())}</button>`:''}`;

    body.querySelectorAll('[data-size]').forEach(btn=>btn.addEventListener('click',()=>{wizard.size=btn.dataset.size;renderWizard();}));
    body.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{wizard.mode=btn.dataset.mode;if(wizard.mode==='full')wizard.b=null;wizard.borderDecision=null;wizard.border=null;renderWizard();}));
    body.querySelectorAll('[data-change]').forEach(btn=>btn.addEventListener('click',()=>{if(btn.dataset.change==='a')wizard.a=null;else wizard.b=null;wizard.borderDecision=null;wizard.border=null;renderWizard();setTimeout(()=>document.querySelector('#v41Search'+btn.dataset.change)?.focus(),0);}));
    body.querySelectorAll('[data-flavor]').forEach(btn=>btn.addEventListener('click',()=>{const f=getFlavor(btn.dataset.flavor);if(btn.dataset.flavorTarget==='a')wizard.a=f;else wizard.b=f;wizard.borderDecision=null;wizard.border=null;renderWizard();}));
    body.querySelectorAll('[data-search]').forEach(input=>input.addEventListener('input',e=>{const target=e.target.dataset.search;if(target==='a')wizard.searchA=e.target.value;else wizard.searchB=e.target.value;renderWizard();const n=document.querySelector('#v41Search'+target);if(n){n.value=target==='a'?wizard.searchA:wizard.searchB;n.focus();n.setSelectionRange(n.value.length,n.value.length);}}));
    body.querySelectorAll('[data-border-decision]').forEach(btn=>btn.addEventListener('click',()=>{wizard.borderDecision=btn.dataset.borderDecision;if(wizard.borderDecision==='no')wizard.border=null;renderWizard();}));
    body.querySelectorAll('[data-border]').forEach(btn=>btn.addEventListener('click',()=>{wizard.border=borders().find(b=>b.name===btn.dataset.border)||null;renderWizard();}));
    body.querySelector('#v41AddPizza')?.addEventListener('click',()=>{
      const sizeLabel=wizard.size==='M'?'Média':'Grande';
      let name,detail;
      if(wizard.mode==='half') {name='Pizza meia a meia';detail=`½ ${wizard.a.name} + ½ ${wizard.b.name} · ${sizeLabel}`;}
      else {name=`Pizza ${wizard.a.name}`;detail=sizeLabel;}
      if(wizard.border)detail+=` · Borda ${wizard.border.name}`;
      addCart({type:'pizza',name,detail,price:wizardTotal()});
      closeWizard();
      openCart();
    });
  }

  function hasPizza(){return cart.some(i=>String(i.type||'').toLowerCase()==='pizza'||/pizza/i.test(i.name||''));}
  function hasDrink(){return cart.some(i=>/bebida|cerveja|drink|soda/i.test(i.detail||'')||/coca|fanta|guaran|água|agua|suco|energ|skol|brahma|amstel|heineken|stella|budweiser/i.test(i.name||''));}
  function ensureDrinkModal(){
    let modal=document.querySelector('#v41DrinkModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='v41DrinkModal';modal.className='v41-modal';modal.setAttribute('aria-hidden','true');
    modal.innerHTML='<div class="v41-backdrop"></div><section class="v41-panel v41-drink-panel" role="dialog" aria-modal="true" aria-labelledby="v41DrinkTitle"><div id="v41DrinkBody"></div></section>';
    document.body.appendChild(modal);return modal;
  }
  function openDrinkPrompt(){
    const modal=ensureDrinkModal(),body=modal.querySelector('#v41DrinkBody');
    body.innerHTML=`<p class="v41-eyebrow">QUASE PRONTO</p><h2 id="v41DrinkTitle">Deseja alguma bebida?</h2><p class="v41-help">Toque para adicionar. Se não quiser, é só finalizar.</p><div class="v41-drinks">${drinks().slice(0,10).map(d=>`<button type="button" data-drink="${esc(d.name)}"><span><strong>${esc(d.name)}</strong><small>${esc(d.desc||'')}</small></span><b>+ ${money(d.price)}</b></button>`).join('')}</div><button type="button" id="v41NoDrink" class="v41-secondary">Não, finalizar pedido</button>`;
    body.querySelectorAll('[data-drink]').forEach(btn=>btn.addEventListener('click',()=>{
      const d=drinks().find(x=>x.name===btn.dataset.drink);if(!d)return;
      addCart({type:'item',name:d.name,detail:'Bebidas',price:d.price});
      drinkPromptHandled=true;closeDrinkPrompt();renderCart();updateTotals();
    }));
    body.querySelector('#v41NoDrink').addEventListener('click',()=>{drinkPromptHandled=true;closeDrinkPrompt();window.sendOrder();});
    modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.style.overflow='hidden';
  }
  function closeDrinkPrompt(){const m=document.querySelector('#v41DrinkModal');if(!m)return;m.classList.remove('open');m.setAttribute('aria-hidden','true');document.body.style.overflow='';}

  function bindGlobalGuards(){
    document.addEventListener('click',e=>{
      const hero=e.target.closest('[data-open-builder]');
      if(hero){e.preventDefault();e.stopImmediatePropagation();openWizard();return;}
      const send=e.target.closest('#sendOrder');
      if(send&&hasPizza()&&!hasDrink()&&!drinkPromptHandled){e.preventDefault();e.stopImmediatePropagation();const err=validateCheckout();if(err){alert(err);return;}openDrinkPrompt();}
    },true);
    document.querySelector('#search')?.addEventListener('input',()=>setTimeout(applyMenuEnhancements,0));
  }

  function init(){
    document.querySelector('.tabs')?.classList.add('v41-hide-old-tabs');
    installSectionButtons();
    applyMenuEnhancements();
    bindGlobalGuards();
  }
  init();
})();
