// Brasinha Admin — gerenciamento simples de Bairro -> Taxa de entrega.
(function(){
  const toolbar=document.querySelector('.toolbar');
  const newBtn=document.querySelector('#newProductBtn');
  if(!toolbar||!newBtn)return;

  const style=document.createElement('style');
  style.textContent=`
    .delivery-fee-btn{margin-right:8px}.delivery-zone-modal{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:18px}.delivery-zone-modal.hidden{display:none}.delivery-zone-modal .dz-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.72)}.delivery-zone-card{position:relative;width:min(720px,100%);max-height:88vh;overflow:auto;border-radius:20px;background:#171512;border:1px solid rgba(255,255,255,.1);padding:20px;color:#f4eadf}.delivery-zone-card h2{margin:0 0 5px}.delivery-zone-card p{color:#a89b8e;margin:0 0 16px;line-height:1.45}.dz-list{display:grid;gap:8px}.dz-row{display:grid;grid-template-columns:1fr 120px 42px;gap:8px}.dz-row input{min-height:46px;border:1px solid rgba(255,255,255,.12);border-radius:10px;background:#0f0e0c;color:white;padding:0 12px;font-size:16px}.dz-remove{border:1px solid rgba(255,255,255,.1);background:#241c18;color:#f2b2a8;border-radius:10px;font-size:20px}.dz-actions{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:16px}.dz-actions .right{display:flex;gap:8px}.dz-add{border:1px dashed rgba(240,199,120,.35);background:#1d1812;color:#edc276;border-radius:10px;padding:11px 14px}.dz-note{font-size:12px!important;color:#d0b06a!important;margin-top:12px!important}@media(max-width:600px){.dz-row{grid-template-columns:1fr 100px 42px}.delivery-zone-card{padding:16px}}
  `;
  document.head.appendChild(style);

  const btn=document.createElement('button');
  btn.id='deliveryFeesBtn';btn.type='button';btn.className='ghost delivery-fee-btn';btn.textContent='🚚 Taxas de entrega';
  newBtn.parentNode.insertBefore(btn,newBtn);

  const modal=document.createElement('div');modal.className='delivery-zone-modal hidden';modal.innerHTML=`
    <div class="dz-backdrop" data-dz-close></div>
    <section class="delivery-zone-card" role="dialog" aria-modal="true" aria-labelledby="dzTitle">
      <h2 id="dzTitle">Taxas por bairro</h2>
      <p>Cadastre os bairros atendidos e o valor da entrega. O site usa o bairro — não o CEP — para calcular o frete.</p>
      <div id="dzList" class="dz-list"></div>
      <button id="dzAdd" class="dz-add" type="button">+ Adicionar bairro</button>
      <p class="dz-note">Se o endereço não for localizado automaticamente, o cliente ainda pode digitar o bairro manualmente.</p>
      <div class="dz-actions"><span id="dzStatus"></span><div class="right"><button type="button" class="ghost" data-dz-close>Cancelar</button><button id="dzSave" type="button" class="primary">Salvar taxas</button></div></div>
    </section>`;
  document.body.appendChild(modal);

  const list=modal.querySelector('#dzList'),status=modal.querySelector('#dzStatus');
  function row(name='',fee=''){
    const el=document.createElement('div');el.className='dz-row';el.innerHTML=`<input class="dz-name" placeholder="Ex.: Centro" value="${String(name).replace(/"/g,'&quot;')}"><input class="dz-fee" type="number" min="0" step="0.01" inputmode="decimal" placeholder="Taxa" value="${fee}"><button class="dz-remove" type="button" aria-label="Remover">×</button>`;
    el.querySelector('.dz-remove').onclick=()=>el.remove();list.appendChild(el);
  }
  function open(){
    if(!catalog)return alert('Aguarde o cardápio carregar.');
    list.innerHTML='';const fees=catalog.config?.deliveryFees||{};const entries=Object.entries(fees);
    if(entries.length)entries.sort((a,b)=>a[0].localeCompare(b[0],'pt-BR')).forEach(([n,f])=>row(n,f));else row();
    status.textContent='';modal.classList.remove('hidden');document.body.style.overflow='hidden';
  }
  function close(){modal.classList.add('hidden');document.body.style.overflow='';}
  btn.onclick=open;modal.querySelector('#dzAdd').onclick=()=>row();modal.querySelectorAll('[data-dz-close]').forEach(x=>x.onclick=close);
  modal.querySelector('#dzSave').onclick=async()=>{
    const fees={};
    [...list.querySelectorAll('.dz-row')].forEach(r=>{const n=r.querySelector('.dz-name').value.trim();const f=Number(r.querySelector('.dz-fee').value);if(n&&Number.isFinite(f)&&f>=0)fees[n]=f;});
    if(!Object.keys(fees).length&&!confirm('Salvar sem nenhum bairro/taxa cadastrada?'))return;
    catalog.config=catalog.config||{};catalog.config.deliveryFees=fees;status.textContent='Publicando...';
    try{await publish('Taxas de entrega atualizadas');status.textContent='Salvo ✓';setTimeout(close,600);}catch(e){status.textContent=e.message||'Erro ao salvar';}
  };
})();