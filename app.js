const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0);
const normalize=s=>(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const pizzaGroups=MENU.filter(g=>g.kind==='pizza');
const flavors=pizzaGroups.flatMap(g=>g.items.map(([name,desc])=>({name,desc,category:g.label,categoryId:g.id,prices:g.prices,image:CATEGORY_IMAGES[g.id]})));
let cart=JSON.parse(localStorage.getItem('brasinha_cart_v2')||'[]');
let builderMode='half', fulfillment='Entrega', payment='Pix';

function persistCart(){localStorage.setItem('brasinha_cart_v2',JSON.stringify(cart));}
function saveCustomer(){
  const data={name:$('#customerName').value,phone:$('#customerPhone').value,street:$('#customerStreet').value,number:$('#customerNumber').value,neighborhood:$('#customerNeighborhood').value,reference:$('#customerReference').value,fulfillment,payment,cashChange:$('#cashChange').value};
  localStorage.setItem('brasinha_customer_v1',JSON.stringify(data));
}
function loadCustomer(){
  const d=JSON.parse(localStorage.getItem('brasinha_customer_v1')||'{}');
  $('#customerName').value=d.name||'';$('#customerPhone').value=d.phone||'';$('#customerStreet').value=d.street||'';$('#customerNumber').value=d.number||'';$('#customerNeighborhood').value=d.neighborhood||'';$('#customerReference').value=d.reference||'';$('#cashChange').value=d.cashChange||'';
  fulfillment=d.fulfillment||'Entrega';payment=d.payment||'Pix';syncSegmented();
}
function syncSegmented(){
  $$('#fulfillment button').forEach(b=>b.classList.toggle('active',b.dataset.value===fulfillment));
  $$('#paymentMethods button').forEach(b=>b.classList.toggle('active',b.dataset.value===payment));
  $$('.delivery-field').forEach(el=>el.classList.toggle('hidden',fulfillment==='Retirada'));
  $('#cashChangeWrap').classList.toggle('hidden',payment!=='Dinheiro');updateTotals();
}
function getDeliveryFee(){
  if(fulfillment==='Retirada') return 0;
  const typed=normalize($('#customerNeighborhood').value);if(!typed)return null;
  const entry=Object.entries(BRASINHA_CONFIG.deliveryFees).find(([bairro])=>normalize(bairro)===typed);
  return entry?Number(entry[1]):null;
}
function deliveryStatus(){
  const el=$('#deliveryFeeStatus');
  if(fulfillment==='Retirada'){el.textContent='Retirada no balcão: sem taxa de entrega.';el.className='fee-status ok';return;}
  const bairro=$('#customerNeighborhood').value.trim(),fee=getDeliveryFee();
  if(!bairro){el.textContent='Digite o bairro para consultar a taxa.';el.className='fee-status';return;}
  if(fee===null){el.textContent='Bairro ainda sem tarifa cadastrada. A taxa será confirmada pela Brasinha no WhatsApp.';el.className='fee-status';return;}
  el.textContent=`Taxa para ${bairro}: ${money(fee)}`;el.className='fee-status ok';
}
function lineTotal(item){return Number(item.price)*Number(item.qty||1)}
function subtotal(){return cart.reduce((s,i)=>s+lineTotal(i),0)}
function updateTotals(){
  const sub=subtotal(),fee=getDeliveryFee();
  $$('[data-cart-count]').forEach(x=>x.textContent=cart.reduce((n,i)=>n+(i.qty||1),0));
  $('[data-cart-label]').textContent=cart.length?`${cart.reduce((n,i)=>n+(i.qty||1),0)} item(ns) no pedido`:'Seu pedido está vazio';
  $('[data-cart-total]').textContent=money(sub+(fee||0));
  $('#subtotal').textContent=money(sub);$('#deliveryFee').textContent=fulfillment==='Retirada'?money(0):(fee===null?'A confirmar':money(fee));$('#grandTotal').textContent=money(sub+(fee||0));deliveryStatus();
}
function addCart(item){
  const key=item.key||`${item.name}|${item.detail||''}|${item.price}`;const found=cart.find(x=>x.key===key);
  if(found)found.qty=(found.qty||1)+1;else cart.push({...item,key,qty:1});persistCart();renderCart();updateTotals();
}
function removeCart(key){cart=cart.filter(x=>x.key!==key);persistCart();renderCart();updateTotals();}
function changeQty(key,delta){const x=cart.find(i=>i.key===key);if(!x)return;x.qty=Math.max(0,(x.qty||1)+delta);if(!x.qty)return removeCart(key);persistCart();renderCart();updateTotals();}
window.removeCart=removeCart;window.changeQty=changeQty;

function renderTabs(){
  $('#tabs').innerHTML=`<button class="tab active" data-target="all">Todos</button>${MENU.map(g=>`<button class="tab" data-target="${g.id}">${g.label}</button>`).join('')}`;
  $$('.tab').forEach(b=>b.onclick=()=>{$$('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(b.dataset.target==='all')$('#cardapio').scrollIntoView({behavior:'smooth'});else $('#'+b.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});});
}
function itemImage(group,name){
  if(/morango|brigadeiro|choco|m&m|banana|ouro/i.test(name))return 'assets/pizza-morango.jpg';
  if(/pepperoni/i.test(name))return 'assets/pizza-pepperoni.jpg';
  if(/calabresa|baiana/i.test(name))return 'assets/pizza-calabresa.jpg';
  if(/costela|fraldinha|carne|lombo/i.test(name))return 'assets/pizza-carne.jpg';
  if(/rúcula|vegetar|brócolis|marguerita/i.test(name))return 'assets/pizza-vegetariana.jpg';
  return CATEGORY_IMAGES[group.id]||'assets/pizza-especial.jpg';
}
function renderMenu(q=''){
  const query=normalize(q);let rendered=0;$('#menu').innerHTML='';
  MENU.forEach(group=>{
    let items=group.items.map(x=>({raw:x,name:x[0],desc:x[1],price:x[2]}));
    if(group.extras)items=items.concat(group.extras.map(x=>({raw:x,name:x[0],desc:x[1],price:x[2],extra:true})));
    items=items.filter(i=>!query||normalize(`${i.name} ${i.desc} ${group.label}`).includes(query));if(!items.length)return;rendered++;
    const sec=document.createElement('section');sec.className='menu-group';sec.id=group.id;
    const rule=group.kind==='pizza'?`M ${money(group.prices.M)} · G ${money(group.prices.G)}`:'';
    sec.innerHTML=`<div class="group-head"><h3>${group.label}</h3><small>${rule}</small></div><div class="menu-grid"></div>`;
    const grid=$('.menu-grid',sec);
    items.forEach(item=>{
      const card=document.createElement('article');card.className='menu-item';
      const priceText=group.kind==='pizza'&&!item.extra?`M ${money(group.prices.M)} · G ${money(group.prices.G)}`:(item.price==null?'Consulte':money(item.price));
      card.innerHTML=`<div class="item-img"><img loading="lazy" src="${itemImage(group,item.name)}" alt="${item.name}"></div><div class="item-body"><h4>${item.name}</h4><p>${item.desc}</p><div class="item-price">${priceText}</div><div class="item-actions"></div></div>`;
      const acts=$('.item-actions',card);
      if(group.kind==='pizza'&&!item.extra){
        acts.innerHTML='<button data-size="M">Média</button><button data-size="G">Grande</button><button class="primary" data-half>½ + ½</button>';
        $$('[data-size]',acts).forEach(b=>b.onclick=()=>addCart({type:'pizza',name:`Pizza ${item.name}`,detail:b.dataset.size==='M'?'Média':'Grande',price:group.prices[b.dataset.size]}));
        $('[data-half]',acts).onclick=()=>openBuilder(item.name);
      }else if(item.price!=null){acts.innerHTML='<button class="primary">Adicionar</button>';acts.firstElementChild.onclick=()=>addCart({type:'item',name:item.name,detail:group.label,price:item.price});}
      grid.appendChild(card);
    });$('#menu').appendChild(sec);
  });if(!rendered)$('#menu').innerHTML='<div class="empty-filter">Nenhum item encontrado.</div>';
}

function fillBuilder(){
  const options=flavors.map(f=>`<option value="${f.name}">${f.name} · ${f.category}</option>`).join('');$('#flavorA').innerHTML=options;$('#flavorB').innerHTML=options;
  $('#pizzaBorder').innerHTML='<option value="">Sem borda adicional</option>'+BORDERS.map(([n,,p])=>`<option value="${n}">${n} · +${money(p)}</option>`).join('');
}
function flavor(name){return flavors.find(f=>f.name===name)}
function borderPrice(name){return name?(BORDERS.find(x=>x[0]===name)?.[2]||0):0}
function builderPrice(){
  const size=$('#pizzaSize').value,a=flavor($('#flavorA').value),b=flavor($('#flavorB').value),bp=borderPrice($('#pizzaBorder').value);
  if(!a)return {base:0,total:bp};const pa=a.prices[size];const base=builderMode==='half'&&b?(pa/2+b.prices[size]/2):pa;return {base,total:base+bp,pa,pb:b?.prices[size]||0,a,b,bp,size};
}
function renderBuilderPrice(){
  const p=builderPrice();let html='';
  if(builderMode==='half'&&p.a&&p.b)html=`½ ${p.a.name}: ${money(p.pa/2)}<br>½ ${p.b.name}: ${money(p.pb/2)}`;else if(p.a)html=`${p.a.name}: ${money(p.pa)}`;
  if(p.bp)html+=`<br>Borda: +${money(p.bp)}`;html+=`<strong>${money(p.total)}</strong>`;$('#pizzaBreakdown').innerHTML=html;
}
function openBuilder(prefill){$('#pizzaModal').classList.add('open');$('#pizzaModal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';if(prefill)$('#flavorA').value=prefill;renderBuilderPrice();}
function closeBuilder(){$('#pizzaModal').classList.remove('open');$('#pizzaModal').setAttribute('aria-hidden','true');document.body.style.overflow='';}
function addBuiltPizza(){
  const p=builderPrice();if(!p.a)return;let detail='',name='';
  if(builderMode==='half'){if(!p.b)return;name='Pizza meia a meia';detail=`½ ${p.a.name} + ½ ${p.b.name} · ${p.size==='M'?'Média':'Grande'}`;}else{name=`Pizza ${p.a.name}`;detail=p.size==='M'?'Média':'Grande';}
  const border=$('#pizzaBorder').value;if(border)detail+=` · Borda ${border}`;addCart({type:'pizza',name,detail,price:p.total});closeBuilder();openCart();
}

function renderCart(){
  const wrap=$('#cartItems');if(!cart.length){wrap.innerHTML='<div class="cart-empty">Seu pedido ainda está vazio.</div>';return;}
  wrap.innerHTML=cart.map(i=>`<article class="cart-line"><div><h4>${i.name}</h4><small>${i.detail||''}</small><small>${money(i.price)} cada</small><button onclick="removeCart('${i.key.replace(/'/g,"\\'")}')">Remover</button></div><div><strong>${money(lineTotal(i))}</strong><div class="qty"><button onclick="changeQty('${i.key.replace(/'/g,"\\'")}',-1)">−</button> ${i.qty} <button onclick="changeQty('${i.key.replace(/'/g,"\\'")}',1)">+</button></div></div></article>`).join('');
}
function openCart(){renderCart();updateTotals();$('#cartDrawer').classList.add('open');$('#cartDrawer').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';}
function closeCart(){saveCustomer();$('#cartDrawer').classList.remove('open');$('#cartDrawer').setAttribute('aria-hidden','true');document.body.style.overflow='';}
function validateCheckout(){
  if(!cart.length)return 'Adicione pelo menos um item ao pedido.';
  if(!$('#customerName').value.trim())return 'Informe seu nome.';
  if(fulfillment==='Entrega'&&(!$('#customerStreet').value.trim()||!$('#customerNumber').value.trim()||!$('#customerNeighborhood').value.trim()))return 'Preencha endereço, número e bairro para entrega.';
  if(payment==='Dinheiro'&&!$('#cashChange').value.trim())return 'Informe o valor para troco ou escreva "sem troco".';
  return '';
}
function buildWhatsAppMessage(){
  const fee=getDeliveryFee(),sub=subtotal(),total=sub+(fee||0),n=$('#customerName').value.trim();
  let msg=`*PEDIDO ONLINE — BRASINHA*\n\n*Cliente:* ${n}\n`;
  if($('#customerPhone').value.trim())msg+=`*Telefone:* ${$('#customerPhone').value.trim()}\n`;
  msg+=`\n*Pedido:*\n`;
  cart.forEach((i,idx)=>{msg+=`${idx+1}. ${i.qty}x ${i.name}${i.detail?` — ${i.detail}`:''}\n   ${money(lineTotal(i))}\n`;});
  msg+=`\n*Recebimento:* ${fulfillment}\n`;
  if(fulfillment==='Entrega'){
    msg+=`*Endereço:* ${$('#customerStreet').value.trim()}, ${$('#customerNumber').value.trim()}\n*Bairro:* ${$('#customerNeighborhood').value.trim()}\n`;
    if($('#customerReference').value.trim())msg+=`*Referência:* ${$('#customerReference').value.trim()}\n`;
    msg+=`*Taxa de entrega:* ${fee===null?'A confirmar pela pizzaria':money(fee)}\n`;
  }else msg+=`*Retirada:* ${BRASINHA_CONFIG.address}\n`;
  msg+=`*Pagamento:* ${payment}`;if(payment==='Dinheiro')msg+=` — Troco para ${$('#cashChange').value.trim()}`;
  msg+=`\n*Subtotal:* ${money(sub)}\n*Total${fee===null&&fulfillment==='Entrega'?' sem taxa':''}:* ${money(total)}\n`;
  if($('#orderNotes').value.trim())msg+=`\n*Observação:* ${$('#orderNotes').value.trim()}\n`;
  if(fee===null&&fulfillment==='Entrega')msg+=`\n_Por favor, confirme a taxa de entrega e o valor final._`;
  return msg;
}
function sendOrder(){const err=validateCheckout();if(err){alert(err);return;}saveCustomer();window.open(`https://wa.me/${BRASINHA_CONFIG.whatsapp}?text=${encodeURIComponent(buildWhatsAppMessage())}`,'_blank','noopener');}

function bind(){
  renderTabs();renderMenu();fillBuilder();loadCustomer();renderCart();updateTotals();
  $('#search').addEventListener('input',e=>renderMenu(e.target.value));
  $$('[data-open-builder]').forEach(b=>b.onclick=()=>openBuilder());$$('[data-close-builder]').forEach(b=>b.onclick=closeBuilder);
  $$('[data-open-cart]').forEach(b=>b.onclick=openCart);$$('[data-close-cart]').forEach(b=>b.onclick=closeCart);
  $$('#builderMode button').forEach(b=>b.onclick=()=>{builderMode=b.dataset.mode;$$('#builderMode button').forEach(x=>x.classList.toggle('active',x===b));$('#flavorBWrap').classList.toggle('hidden',builderMode==='full');renderBuilderPrice();});
  ['pizzaSize','flavorA','flavorB','pizzaBorder'].forEach(id=>$('#'+id).addEventListener('change',renderBuilderPrice));$('#addPizza').onclick=addBuiltPizza;
  $$('#fulfillment button').forEach(b=>b.onclick=()=>{fulfillment=b.dataset.value;syncSegmented();saveCustomer();});
  $$('#paymentMethods button').forEach(b=>b.onclick=()=>{payment=b.dataset.value;syncSegmented();saveCustomer();});
  ['customerName','customerPhone','customerStreet','customerNumber','customerNeighborhood','customerReference','cashChange'].forEach(id=>$('#'+id).addEventListener('input',()=>{saveCustomer();updateTotals();}));
  $('#sendOrder').onclick=sendOrder;$('#neighborhoodList').innerHTML=Object.keys(BRASINHA_CONFIG.deliveryFees).map(x=>`<option value="${x}">`).join('');
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeBuilder();closeCart();}});
}
bind();
