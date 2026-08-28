// Brasinha Order Format V2 — pedido estruturado para WhatsApp e impressão.
(function(){
  const moneyBR=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
  const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();

  function meta(raw){return raw?.[3]&&typeof raw[3]==='object'&&!Array.isArray(raw[3])?raw[3]:{};}
  function pizzaFlavor(name){
    for(const group of (window.MENU||MENU||[])){
      if(group.kind!=='pizza') continue;
      for(const raw of (group.items||[])){
        if(norm(raw[0])===norm(name)){
          const p=meta(raw).prices||group.prices||{M:0,G:0};
          return {name:raw[0],prices:{M:Number(p.M)||0,G:Number(p.G)||0}};
        }
      }
    }
    return null;
  }
  function borderInfo(name){
    const groups=(window.MENU||MENU||[]);
    const group=groups.find(g=>g.id==='bordas');
    const raw=(group?.items||[]).find(x=>norm(x[0])===norm(name));
    return raw?{name:raw[0],price:Number(raw[2])||0}:null;
  }
  function cleanDetail(detail){
    return String(detail||'')
      .replace(/½/g,'1/2')
      .replace(/[·•]/g,' | ')
      .replace(/[—–]/g,'-')
      .replace(/\s*\|\s*/g,' | ')
      .trim();
  }

  function parsePizza(item){
    if(!item||!/pizza/i.test(item.name||'')) return null;
    if(item.components?.kind==='pizza') return item.components;

    const detail=cleanDetail(item.detail);
    const parts=detail.split('|').map(x=>x.trim()).filter(Boolean);
    const size=/grande/i.test(detail)?'G':'M';
    const sizeLabel=size==='G'?'Grande':'Média';
    const isHalf=/meia a meia/i.test(item.name||'')||/1\/2/i.test(detail);
    let flavorNames=[];

    if(isHalf){
      const flavorPart=parts.find(p=>/1\/2/i.test(p))||detail;
      const m=flavorPart.match(/1\/2\s+(.+?)\s*\+\s*1\/2\s+(.+?)(?:\s*\||$)/i);
      if(m) flavorNames=[m[1].trim(),m[2].trim()];
    }else{
      const n=String(item.name||'').replace(/^pizza\s+/i,'').trim();
      if(n) flavorNames=[n];
    }

    const flavors=flavorNames.map(name=>{
      const found=pizzaFlavor(name);
      const fullPrice=found?Number(found.prices[size])||0:0;
      return {
        name:found?.name||name,
        fullPrice,
        chargedPrice:isHalf?fullPrice/2:fullPrice
      };
    });

    const borderPart=parts.find(p=>/^borda\s+/i.test(p));
    let border=null;
    if(borderPart){
      const rawName=borderPart.replace(/^borda\s+/i,'').trim();
      border=borderInfo(rawName)||{name:rawName,price:0};
    }

    return {
      kind:'pizza',
      mode:isHalf?'half':'full',
      size,
      sizeLabel,
      flavors,
      border,
      unitTotal:Number(item.price)||0
    };
  }

  function upgradeItem(item){
    if(!item) return item;
    const next={...item};
    if(/pizza/i.test(next.name||'')){
      const parsed=parsePizza(next);
      if(parsed) next.components=parsed;
      if(next.components?.kind==='pizza'){
        const c=next.components;
        if(c.mode==='half'&&c.flavors?.length>=2){
          next.detail=`1/2 ${c.flavors[0].name} + 1/2 ${c.flavors[1].name} - ${c.sizeLabel||'Média'}${c.border?` - Borda ${c.border.name}`:''}`;
        }else if(c.flavors?.[0]){
          next.detail=`${c.sizeLabel||'Média'}${c.border?` - Borda ${c.border.name}`:''}`;
        }
      }
    }
    return next;
  }

  function upgradeCart(){
    try{
      if(typeof cart==='undefined'||!Array.isArray(cart)) return;
      let changed=false;
      for(let i=0;i<cart.length;i++){
        const before=JSON.stringify(cart[i]);
        cart[i]=upgradeItem(cart[i]);
        if(JSON.stringify(cart[i])!==before) changed=true;
      }
      if(changed&&typeof persistCart==='function') persistCart();
    }catch(e){console.warn('Brasinha V2: não foi possível atualizar carrinho antigo.',e);}
  }

  const originalAdd=typeof addCart==='function'?addCart:null;
  if(originalAdd){
    const wrapped=function(item){return originalAdd(upgradeItem(item));};
    try{window.addCart=wrapped;addCart=wrapped;}catch{window.addCart=wrapped;}
  }

  function itemLines(item,index){
    const i=upgradeItem(item);
    const qty=Number(i.qty||1);
    const total=(Number(i.price)||0)*qty;
    const c=i.components;
    const lines=[`${index}. ${qty}x ${i.name}`];

    if(c?.kind==='pizza'&&Array.isArray(c.flavors)&&c.flavors.length){
      if(c.mode==='half'&&c.flavors.length>=2){
        lines.push(`   - 1/2 ${c.flavors[0].name}: ${moneyBR(c.flavors[0].chargedPrice)}`);
        lines.push(`   - 1/2 ${c.flavors[1].name}: ${moneyBR(c.flavors[1].chargedPrice)}`);
      }else{
        lines.push(`   - Sabor: ${c.flavors[0].name}: ${moneyBR(c.flavors[0].chargedPrice||i.price)}`);
      }
      lines.push(`   - Tamanho: ${c.sizeLabel|| (c.size==='G'?'Grande':'Média')}`);
      if(c.border) lines.push(`   - Borda ${c.border.name}: ${moneyBR(c.border.price)}`);
      lines.push(`   - Total do item: ${moneyBR(total)}`);
    }else{
      if(i.detail) lines.push(`   - ${cleanDetail(i.detail)}`);
      lines.push(`   - ${moneyBR(total)}`);
    }
    return lines;
  }

  function buildWhatsAppMessageV2(){
    const fee=typeof getDeliveryFee==='function'?getDeliveryFee():null;
    const sub=typeof subtotal==='function'?subtotal():0;
    const total=sub+(fee||0);
    let msg='*PEDIDO ONLINE — BRASINHA*\n\n';
    msg+=`*Cliente:* ${document.querySelector('#customerName')?.value.trim()||''}\n`;
    const phone=document.querySelector('#customerPhone')?.value.trim();
    if(phone) msg+=`*Telefone:* ${phone}\n`;
    msg+='\n*Pedido:*\n';
    (typeof cart!=='undefined'?cart:[]).forEach((item,idx)=>{msg+=itemLines(item,idx+1).join('\n')+'\n';});
    msg+=`\n*Recebimento:* ${typeof fulfillment!=='undefined'?fulfillment:'Entrega'}\n`;
    if((typeof fulfillment==='undefined'?'Entrega':fulfillment)==='Entrega'){
      const street=document.querySelector('#customerStreet')?.value.trim()||'';
      const number=document.querySelector('#customerNumber')?.value.trim()||'';
      const neighborhood=document.querySelector('#customerNeighborhood')?.value.trim()||'';
      const cep=document.querySelector('#customerCep')?.value.trim()||'';
      msg+=`*Endereço:* ${street}, ${number}\n`;
      msg+=`*Bairro:* ${neighborhood}\n`;
      if(cep) msg+=`*CEP:* ${cep}\n`;
      const ref=document.querySelector('#customerReference')?.value.trim();
      if(ref) msg+=`*Referência:* ${ref}\n`;
      msg+=`*Taxa de entrega:* ${fee===null?'A confirmar pela pizzaria':moneyBR(fee)}\n`;
    }else if(typeof BRASINHA_CONFIG!=='undefined'){
      msg+=`*Retirada:* ${BRASINHA_CONFIG.address}\n`;
    }
    const pay=typeof payment!=='undefined'?payment:'Pix';
    msg+=`*Pagamento:* ${pay}`;
    const change=document.querySelector('#cashChange')?.value.trim();
    if(pay==='Dinheiro'&&change) msg+=` — Troco para ${change}`;
    msg+=`\n*Subtotal:* ${moneyBR(sub)}\n`;
    msg+=`*Total${fee===null&&(typeof fulfillment==='undefined'?'Entrega':fulfillment)==='Entrega'?' sem taxa':''}:* ${moneyBR(total)}\n`;
    const notes=document.querySelector('#orderNotes')?.value.trim();
    if(notes) msg+=`\n*Observação:* ${notes}\n`;
    if(fee===null&&(typeof fulfillment==='undefined'?'Entrega':fulfillment)==='Entrega') msg+='\n_Por favor, confirme a taxa de entrega e o valor final._';
    return msg;
  }

  window.brasinhaUpgradeItem=upgradeItem;
  window.brasinhaItemLines=itemLines;
  window.brasinhaBuildWhatsAppMessageV2=buildWhatsAppMessageV2;
  upgradeCart();
})();
