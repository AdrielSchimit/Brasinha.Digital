// Envia uma cópia do pedido para a fila de impressão sem impedir o WhatsApp.
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

  function snapshotOrder(){
    const fee = getDeliveryFee();
    const sub = subtotal();
    return {
      id: makeOrderId(),
      source: 'brasinha-web-v1',
      customer: {
        name: document.querySelector('#customerName').value.trim(),
        phone: document.querySelector('#customerPhone').value.trim(),
        street: document.querySelector('#customerStreet').value.trim(),
        number: document.querySelector('#customerNumber').value.trim(),
        neighborhood: document.querySelector('#customerNeighborhood').value.trim(),
        reference: document.querySelector('#customerReference').value.trim()
      },
      fulfillment,
      payment,
      cashChange: document.querySelector('#cashChange').value.trim(),
      notes: document.querySelector('#orderNotes').value.trim(),
      items: cart.map(i=>({ name:i.name, detail:i.detail||'', qty:Number(i.qty||1), price:Number(i.price||0) })),
      subtotal: sub,
      deliveryFee: fee,
      total: sub + (fee || 0)
    };
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
    queuePrint(order); // não bloqueia a abertura do WhatsApp
    window.open(`https://wa.me/${BRASINHA_CONFIG.whatsapp}?text=${encodeURIComponent(originalBuildMessage())}`,'_blank','noopener');
  };

  const button = document.querySelector('#sendOrder');
  if(button) button.onclick = sendOrder;
})();

// UX V4 é carregada por último para simplificar a experiência sem tocar no fluxo de impressão.
(function(){
  if(!document.querySelector('link[href="ux-v4.css"]')){
    const css=document.createElement('link');css.rel='stylesheet';css.href='ux-v4.css';document.head.appendChild(css);
  }
  const js=document.createElement('script');js.src='ux-v4.js';js.defer=false;document.body.appendChild(js);
})();
