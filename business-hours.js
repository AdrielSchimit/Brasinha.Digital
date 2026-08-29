// Brasinha — trava de horário no cliente. O backend repete a mesma validação.
(function(){
  const TIME_ZONE='America/Campo_Grande';
  const OPEN=18*60;
  const CLOSE=23*60+30;
  let current=null;
  let originalButtonText='Enviar pedido para a Brasinha';

  function localFallback(){
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:TIME_ZONE,weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());
    const get=t=>parts.find(p=>p.type===t)?.value||'';
    const weekday=get('weekday'),minutes=Number(get('hour'))*60+Number(get('minute'));
    const open=weekday!=='Tue'&&minutes>=OPEN&&minutes<CLOSE;
    let next='às 18:00';
    if(!open){
      if(weekday!=='Tue'&&minutes<OPEN) next='Hoje às 18:00';
      else if(weekday==='Mon'||weekday==='Tue') next='Quarta-feira às 18:00';
      else next='Amanhã às 18:00';
    }
    return {open,nextOpen:open?null:next,schedule:'Quarta a segunda, 18:00–23:30. Terça-feira fechado.'};
  }

  function ensureUi(){
    if(!document.querySelector('#storeHoursBanner')){
      const banner=document.createElement('div');
      banner.id='storeHoursBanner';
      banner.className='store-hours-banner';
      banner.setAttribute('role','status');
      document.body.prepend(banner);
    }
    if(!document.querySelector('#storeClosedModal')){
      const modal=document.createElement('div');
      modal.id='storeClosedModal';
      modal.className='store-closed-modal hidden';
      modal.innerHTML=`<div class="store-closed-backdrop" data-hours-close></div><section class="store-closed-card" role="dialog" aria-modal="true"><div class="store-closed-icon">🕒</div><h2>A Brasinha está fechada agora</h2><p id="storeClosedMessage"></p><strong>Você pode montar o pedido e deixar no carrinho. O envio libera automaticamente no horário de funcionamento.</strong><button type="button" data-hours-close>Entendi</button></section>`;
      document.body.appendChild(modal);
      modal.querySelectorAll('[data-hours-close]').forEach(b=>b.onclick=()=>modal.classList.add('hidden'));
    }
    if(!document.querySelector('#storeHoursStyle')){
      const style=document.createElement('style');style.id='storeHoursStyle';style.textContent=`
      .store-hours-banner{position:sticky;top:0;z-index:90;padding:9px 14px;text-align:center;font:700 14px/1.25 system-ui,-apple-system,Segoe UI,sans-serif;border-bottom:1px solid rgba(255,255,255,.08)}
      .store-hours-banner.open{background:#123d25;color:#dff8e8}.store-hours-banner.closed{background:#4b201b;color:#ffe7df}
      .store-closed-modal{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px}.store-closed-modal.hidden{display:none}.store-closed-backdrop{position:absolute;inset:0;background:rgba(0,0,0,.76)}
      .store-closed-card{position:relative;width:min(440px,100%);background:#17130f;color:#f8efe5;border:1px solid rgba(244,190,80,.28);border-radius:24px;padding:28px;text-align:center;box-shadow:0 24px 70px rgba(0,0,0,.45)}
      .store-closed-icon{font-size:40px}.store-closed-card h2{font-size:28px;margin:8px 0 10px}.store-closed-card p{font-size:18px;line-height:1.45;color:#d5c8ba;margin:0 0 12px}.store-closed-card strong{display:block;font-size:14px;line-height:1.45;color:#efc978;margin-bottom:20px}.store-closed-card button{width:100%;min-height:54px;border:0;border-radius:14px;background:#efb847;color:#17130f;font-size:18px;font-weight:800}
      #sendOrder.store-closed-button{background:#3b342d!important;color:#bdb2a7!important;border-color:#51483f!important}
      `;document.head.appendChild(style);
    }
  }

  function button(){return document.querySelector('#sendOrder');}
  function render(){
    ensureUi();
    const banner=document.querySelector('#storeHoursBanner');
    const btn=button();
    if(btn&&btn.dataset.hoursInit!=='1'){originalButtonText=btn.textContent.trim()||originalButtonText;btn.dataset.hoursInit='1';}
    if(current?.open){
      banner.className='store-hours-banner open';
      banner.textContent='● Aberto agora · Pedidos até 23:30';
      if(btn){btn.classList.remove('store-closed-button');btn.textContent=originalButtonText;btn.setAttribute('aria-disabled','false');}
    }else{
      banner.className='store-hours-banner closed';
      banner.textContent=`Fechado agora · ${current?.nextOpen||'Abrimos às 18:00'}`;
      if(btn){btn.classList.add('store-closed-button');btn.textContent=`Fechado · ${current?.nextOpen||'abre às 18:00'}`;btn.setAttribute('aria-disabled','true');}
    }
  }

  function showClosed(){
    ensureUi();
    document.querySelector('#storeClosedMessage').textContent=`${current?.schedule||'Quarta a segunda, 18:00–23:30. Terça-feira fechado.'} ${current?.nextOpen?`Próxima abertura: ${current.nextOpen}.`:''}`;
    document.querySelector('#storeClosedModal').classList.remove('hidden');
  }

  async function refresh(){
    try{
      const res=await fetch('/api/store/status',{cache:'no-store'});
      if(!res.ok)throw new Error('status indisponível');
      current=await res.json();
    }catch{
      current=localFallback();
    }
    window.BRASINHA_STORE_STATUS=current;
    render();
  }

  document.addEventListener('click',e=>{
    const target=e.target.closest?.('#sendOrder');
    if(!target)return;
    if(current&&!current.open){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();showClosed();}
  },true);

  ensureUi();
  refresh();
  setInterval(refresh,30000);
})();
