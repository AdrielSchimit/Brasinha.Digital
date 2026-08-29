// Envia uma cópia estruturada do pedido para a fila de impressão sem impedir o WhatsApp.
(function(){
  const originalBuildMessage = buildWhatsAppMessage;

  function makeOrderId(){
    const now = new Date();
    const y = String(now.getFullYear()).slice(-2);
    const m = String(now.getMonth()+1).padStart(2,'0');
    const d = String(now.getDate()).padStart(2,'0');
    const t = `${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}${String(now.getSeconds()).padStart(2,'0')}`;
    return `${y}${m}${d}-${t}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  }

  function serializeItem(item){
    const upgraded=window.brasinhaUpgradeItem?window.brasinhaUpgradeItem(item):item;
    return {
      name:upgraded.name,
      detail:upgraded.detail||'',
      qty:Number(upgraded.qty||1),
      price:Number(upgraded.price||0),
      components:upgraded.components||null
    };
  }

  function snapshotOrder(){
    const fee = getDeliveryFee();
    const sub = subtotal();
    return {
      id: makeOrderId(),
      source: 'brasinha-web-v2',
      createdAt: new Date().toISOString(),
      customer: {
        name: document.querySelector('#customerName').value.trim(),
        phone: document.querySelector('#customerPhone').value.trim(),
        street: document.querySelector('#customerStreet').value.trim(),
        number: document.querySelector('#customerNumber').value.trim(),
        neighborhood: document.querySelector('#customerNeighborhood').value.trim(),
        cep: document.querySelector('#customerCep')?.value.trim()||'',
        reference: document.querySelector('#customerReference').value.trim()
      },
      fulfillment,
      payment,
      cashChange: document.querySelector('#cashChange').value.trim(),
      notes: document.querySelector('#orderNotes').value.trim(),
      items: cart.map(serializeItem),
      subtotal: sub,
      deliveryFee: fee,
      total: sub + (fee || 0)
    };
  }

  function message(){
    return window.brasinhaBuildWhatsAppMessageV2?window.brasinhaBuildWhatsAppMessageV2():originalBuildMessage();
  }

  async function queuePrint(order){
    try{
      const response = await fetch('/api/print/order', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify(order),
        keepalive:true
      });
      if(!response.ok) console.warn('Brasinha Print: fila indisponível', response.status);
    }catch(error){
      console.warn('Brasinha Print: pedido seguirá pelo WhatsApp, mas não entrou na fila de impressão.', error);
    }
  }

  sendOrder = function(){
    const err = validateCheckout();
    if(err){ alert(err); return; }
    saveCustomer();
    const order = snapshotOrder();
    queuePrint(order);
    window.open(`https://wa.me/${BRASINHA_CONFIG.whatsapp}?text=${encodeURIComponent(message())}`,'_blank','noopener');
  };

  const button = document.querySelector('#sendOrder');
  if(button) button.onclick = sendOrder;
})();

// Carrega primeiro o formatador estruturado; depois a UX guiada.
(function(){
  function load(src,onload){
    const js=document.createElement('script');
    js.src=src;
    js.async=false;
    if(onload) js.onload=onload;
    document.body.appendChild(js);
  }

  // A trava de horário é independente da UX e usa status do servidor.
  load('business-hours.js?v=1');

  load('order-format-v2.js?v=2',()=>{
    if(!document.querySelector('link[href^="ux-v41.css"]')){
      const css=document.createElement('link');
      css.rel='stylesheet';
      css.href='ux-v41.css?v=41';
      document.head.appendChild(css);
    }
    load('ux-v41.js?v=41',()=>{
      load('address-assist.js?v=1');
    });
  });
})();
