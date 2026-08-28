// Brasinha — assistência de endereço sem bloquear o checkout.
(function(){
  const street=document.querySelector('#customerStreet');
  const number=document.querySelector('#customerNumber');
  const neighborhood=document.querySelector('#customerNeighborhood');
  const form=document.querySelector('#customerForm');
  if(!street||!number||!neighborhood||!form)return;

  const normalize=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const onlyDigits=v=>String(v||'').replace(/\D/g,'');
  let timer=null,controller=null,lastQuery='';

  // Campo CEP opcional.
  let cep=document.querySelector('#customerCep');
  if(!cep){
    const label=document.createElement('label');
    label.className='delivery-field';
    label.innerHTML='CEP <small style="opacity:.65">opcional</small><input id="customerCep" inputmode="numeric" autocomplete="postal-code" placeholder="00000-000" maxlength="9" />';
    const refLabel=document.querySelector('#customerReference')?.closest('label');
    if(refLabel)form.insertBefore(label,refLabel);else form.appendChild(label);
    cep=label.querySelector('input');
  }

  let assist=document.querySelector('#addressAssist');
  if(!assist){
    assist=document.createElement('div');
    assist.id='addressAssist';
    assist.className='address-assist hidden';
    form.insertAdjacentElement('afterend',assist);
  }

  const style=document.createElement('style');
  style.textContent=`
    .address-assist{margin:10px 0 2px;border:1px solid rgba(240,199,120,.22);background:#171512;border-radius:14px;padding:12px;color:#e9ded0}
    .address-assist.hidden{display:none}.address-assist strong{display:block;font-size:14px;margin-bottom:4px}.address-assist p{margin:0;color:#a99d8f;font-size:13px;line-height:1.4}.address-assist-list{display:grid;gap:7px;margin-top:10px}.address-assist-option{display:flex;justify-content:space-between;gap:12px;align-items:center;width:100%;min-height:50px;border:1px solid rgba(255,255,255,.1);border-radius:12px;background:#211d18;color:#f5eadf;padding:9px 11px;text-align:left;font-size:14px}.address-assist-option b{color:#efc36d;font-size:12px;white-space:nowrap}.delivery-zone-note{margin-top:7px!important;color:#d9b76f!important}
    #customerCep{font-size:16px}
  `;
  document.head.appendChild(style);

  function zoneNames(){return Object.keys(BRASINHA_CONFIG.deliveryFees||{});}
  function refreshNeighborhoodList(){
    const list=document.querySelector('#neighborhoodList');if(!list)return;
    list.innerHTML=zoneNames().sort((a,b)=>a.localeCompare(b,'pt-BR')).map(x=>`<option value="${x.replace(/"/g,'&quot;')}"></option>`).join('');
  }
  refreshNeighborhoodList();

  function maskCep(v){const d=onlyDigits(v).slice(0,8);return d.length>5?`${d.slice(0,5)}-${d.slice(5)}`:d;}
  function fire(el){el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
  function hideAssist(){assist.classList.add('hidden');assist.innerHTML='';}
  function showInfo(title,text){assist.innerHTML=`<strong>${title}</strong><p>${text}</p>`;assist.classList.remove('hidden');}

  function applyResult(r){
    if(r.logradouro)street.value=r.logradouro;
    if(r.bairro){neighborhood.value=r.bairro;fire(neighborhood);}
    if(r.cep){cep.value=maskCep(r.cep);localStorage.setItem('brasinha_customer_cep_v1',cep.value);}
    const fee=Object.entries(BRASINHA_CONFIG.deliveryFees||{}).find(([b])=>normalize(b)===normalize(r.bairro));
    assist.innerHTML=`<strong>Endereço localizado ✓</strong><p>${r.logradouro||street.value}${number.value?`, ${number.value}`:''} · ${r.bairro||'bairro não informado'} · ${r.cep||''}</p>${fee?`<p class="delivery-zone-note">Taxa de entrega para ${fee[0]}: ${money(Number(fee[1]))}</p>`:`<p class="delivery-zone-note">A taxa será confirmada conforme o bairro cadastrado pela Brasinha.</p>`}`;
    assist.classList.remove('hidden');
    try{saveCustomer();updateTotals();}catch{}
  }

  async function request(url){
    if(controller)controller.abort();controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),4500);
    try{const res=await fetch(url,{signal:controller.signal});if(!res.ok)throw new Error('consulta indisponível');return await res.json();}
    finally{clearTimeout(timeout);}
  }

  async function searchStreet(){
    const typed=street.value.trim();
    if(typed.length<3)return;
    const query=normalize(typed);if(query===lastQuery&&assist.dataset.done==='1')return;
    lastQuery=query;assist.dataset.done='0';
    showInfo('Localizando endereço…','Você pode continuar preenchendo normalmente. O CEP não é obrigatório.');
    try{
      const city=encodeURIComponent('Água Clara');
      const road=encodeURIComponent(typed);
      const data=await request(`https://viacep.com.br/ws/MS/${city}/${road}/json/`);
      if(!Array.isArray(data)||!data.length){showInfo('Não encontramos automaticamente','Sem problema: informe o bairro manualmente e continue o pedido.');return;}
      const seen=new Set();
      const matches=data.filter(r=>normalize(r.localidade)==='agua clara').filter(r=>{const k=`${r.cep}|${r.logradouro}|${r.bairro}`;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,8);
      if(!matches.length){showInfo('Não encontramos automaticamente','Sem problema: informe o bairro manualmente e continue o pedido.');return;}
      assist.dataset.done='1';
      const uniqueArea=new Set(matches.map(r=>`${normalize(r.logradouro)}|${normalize(r.bairro)}|${onlyDigits(r.cep)}`));
      if(matches.length===1||uniqueArea.size===1){applyResult(matches[0]);return;}
      assist.innerHTML='<strong>Qual destes endereços é o seu?</strong><p>Escolha uma opção. Se nenhuma estiver correta, continue digitando manualmente.</p><div class="address-assist-list"></div>';
      const list=assist.querySelector('.address-assist-list');
      matches.forEach(r=>{const btn=document.createElement('button');btn.type='button';btn.className='address-assist-option';btn.innerHTML=`<span>${r.logradouro||typed}<br><small>${r.bairro||'Bairro não informado'}</small></span><b>${r.cep||''}</b>`;btn.onclick=()=>applyResult(r);list.appendChild(btn);});
      assist.classList.remove('hidden');
    }catch(e){if(e.name!=='AbortError')showInfo('Consulta de endereço indisponível','O pedido continua normalmente. Digite o bairro e siga para finalizar.');}
  }

  async function searchCep(){
    const d=onlyDigits(cep.value);cep.value=maskCep(cep.value);localStorage.setItem('brasinha_customer_cep_v1',cep.value);
    if(d.length!==8)return;
    showInfo('Consultando CEP…','O CEP é opcional e nunca impede o pedido.');
    try{
      const r=await request(`https://viacep.com.br/ws/${d}/json/`);
      if(r?.erro||normalize(r?.localidade)!=='agua clara'){showInfo('CEP não localizado em Água Clara','Continue preenchendo rua e bairro manualmente.');return;}
      applyResult(r);
    }catch(e){if(e.name!=='AbortError')showInfo('Consulta de CEP indisponível','Continue preenchendo manualmente.');}
  }

  // A busca por endereço do ViaCEP usa UF/cidade/logradouro; o número é mantido no pedido,
  // mas não é necessário para descobrir CEP/bairro.
  street.addEventListener('input',()=>{clearTimeout(timer);hideAssist();timer=setTimeout(searchStreet,850);});
  street.addEventListener('blur',()=>{clearTimeout(timer);searchStreet();});
  number.addEventListener('blur',()=>{if(street.value.trim().length>=3&&!neighborhood.value.trim())searchStreet();});
  cep.addEventListener('input',()=>{cep.value=maskCep(cep.value);});
  cep.addEventListener('blur',searchCep);

  neighborhood.addEventListener('input',()=>{try{updateTotals();}catch{};});
  const savedCep=localStorage.getItem('brasinha_customer_cep_v1');if(savedCep)cep.value=savedCep;
})();