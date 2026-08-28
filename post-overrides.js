const FREE_FOOD_IMAGES={
  sweet:'https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=900&q=82',
  pepperoni:'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=82',
  classic:'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=82',
  gourmet:'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=82',
  veg:'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=82'
};

function catalogMeta(raw){return raw?.[3]&&typeof raw[3]==='object'&&!Array.isArray(raw[3])?raw[3]:{};}
function catalogActive(raw){return catalogMeta(raw).active!==false;}
function catalogPrices(group,raw){return catalogMeta(raw).prices||group.prices||{M:0,G:0};}
function safeText(value){return String(value??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function groupHasActiveItems(group){return [...(group.items||[]),...(group.extras||[])].some(catalogActive);}

itemImage=function(group,name,raw){
  const custom=catalogMeta(raw).image;
  if(custom)return custom;
  if(/morango|brigadeiro|choco|m&m|banana|ouro/i.test(name))return FREE_FOOD_IMAGES.sweet;
  if(/pepperoni/i.test(name))return FREE_FOOD_IMAGES.pepperoni;
  if(/calabresa|baiana/i.test(name))return FREE_FOOD_IMAGES.classic;
  if(/costela|fraldinha|carne|lombo/i.test(name))return FREE_FOOD_IMAGES.gourmet;
  if(/rúcula|vegetar|brócolis|marguerita/i.test(name))return FREE_FOOD_IMAGES.veg;
  return CATEGORY_IMAGES[group.id]||FREE_FOOD_IMAGES.classic;
};

renderTabs=function(){
  const groups=MENU.filter(groupHasActiveItems);
  document.querySelector('#tabs').innerHTML=`<button class="tab active" data-target="all">Todos</button>${groups.map(g=>`<button class="tab" data-target="${safeText(g.id)}">${safeText(g.label)}</button>`).join('')}`;
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');if(b.dataset.target==='all')document.querySelector('#cardapio').scrollIntoView({behavior:'smooth'});else document.querySelector('#'+b.dataset.target)?.scrollIntoView({behavior:'smooth',block:'start'});});
};

renderMenu=function(q=''){
  const query=normalize(q);let rendered=0;document.querySelector('#menu').innerHTML='';
  MENU.forEach(group=>{
    let items=(group.items||[]).map(x=>({raw:x,name:x[0],desc:x[1],price:x[2],extra:false})).filter(i=>catalogActive(i.raw));
    if(group.extras)items=items.concat(group.extras.map(x=>({raw:x,name:x[0],desc:x[1],price:x[2],extra:true})).filter(i=>catalogActive(i.raw)));
    items=items.filter(i=>!query||normalize(`${i.name} ${i.desc} ${group.label}`).includes(query));
    if(!items.length)return;rendered++;
    const sec=document.createElement('section');sec.className='menu-group';sec.id=group.id;
    const groupRule=group.kind==='pizza'?`M ${money(group.prices.M)} · G ${money(group.prices.G)}`:'';
    sec.innerHTML=`<div class="group-head"><h3>${safeText(group.label)}</h3><small>${groupRule}</small></div><div class="menu-grid"></div>`;
    const grid=sec.querySelector('.menu-grid');
    items.forEach(item=>{
      const meta=catalogMeta(item.raw),prices=catalogPrices(group,item.raw);
      const card=document.createElement('article');card.className='menu-item';
      const priceText=group.kind==='pizza'&&!item.extra?`M ${money(prices.M)} · G ${money(prices.G)}`:(item.price==null?'Consulte':money(item.price));
      card.innerHTML=`<div class="item-img"><img loading="lazy" src="${safeText(itemImage(group,item.name,item.raw))}" alt="${safeText(item.name)}"></div><div class="item-body"><h4>${safeText(item.name)}</h4><p>${safeText(item.desc)}</p><div class="item-price">${priceText}</div><div class="item-actions"></div></div>`;
      const acts=card.querySelector('.item-actions');
      if(group.kind==='pizza'&&!item.extra){
        acts.innerHTML='<button data-size="M">Média</button><button data-size="G">Grande</button><button class="primary" data-half>½ + ½</button>';
        acts.querySelectorAll('[data-size]').forEach(b=>b.onclick=()=>addCart({type:'pizza',name:`Pizza ${item.name}`,detail:b.dataset.size==='M'?'Média':'Grande',price:prices[b.dataset.size]}));
        acts.querySelector('[data-half]').onclick=()=>openBuilder(item.name);
      }else if(item.price!=null){acts.innerHTML='<button class="primary">Adicionar</button>';acts.firstElementChild.onclick=()=>addCart({type:'item',name:item.name,detail:group.label,price:item.price});}
      grid.appendChild(card);
    });
    document.querySelector('#menu').appendChild(sec);
  });
  if(!rendered)document.querySelector('#menu').innerHTML='<div class="empty-filter">Nenhum item encontrado.</div>';
};

function availableFlavors(){
  return MENU.filter(g=>g.kind==='pizza').flatMap(g=>(g.items||[]).filter(catalogActive).map(raw=>({name:raw[0],desc:raw[1],category:g.label,categoryId:g.id,prices:catalogPrices(g,raw),image:itemImage(g,raw[0],raw),raw})));
}
fillBuilder=function(){
  const currentA=document.querySelector('#flavorA')?.value,currentB=document.querySelector('#flavorB')?.value;
  const options=availableFlavors().map(f=>`<option value="${safeText(f.name)}">${safeText(f.name)} · ${safeText(f.category)}</option>`).join('');
  document.querySelector('#flavorA').innerHTML=options;document.querySelector('#flavorB').innerHTML=options;
  if(currentA&&availableFlavors().some(f=>f.name===currentA))document.querySelector('#flavorA').value=currentA;
  if(currentB&&availableFlavors().some(f=>f.name===currentB))document.querySelector('#flavorB').value=currentB;
  const borders=(MENU.find(x=>x.id==='bordas')?.items||[]).filter(catalogActive);
  document.querySelector('#pizzaBorder').innerHTML='<option value="">Sem borda adicional</option>'+borders.map(([n,,p])=>`<option value="${safeText(n)}">${safeText(n)} · +${money(p)}</option>`).join('');
};
flavor=function(name){return availableFlavors().find(f=>f.name===name);};
borderPrice=function(name){if(!name)return 0;const borders=(MENU.find(x=>x.id==='bordas')?.items||[]).filter(catalogActive);return borders.find(x=>x[0]===name)?.[2]||0;};

renderTabs();
renderMenu(document.querySelector('#search')?.value||'');
fillBuilder();

// UX v3 — cadastro de uma única vez, validação e montagem segura.
const profileBox=document.querySelector('#savedProfile');
const customerForm=document.querySelector('#customerForm');
const editProfileBtn=document.querySelector('#editProfile');
let profileEditing=false;

function digits(v){return (v||'').replace(/\D/g,'');}
function maskPhone(v){
  const d=digits(v).slice(0,11);
  if(d.length<=2)return d;
  if(d.length<=6)return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if(d.length<=10)return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}
const phoneInput=document.querySelector('#customerPhone');
phoneInput.addEventListener('input',()=>{phoneInput.value=maskPhone(phoneInput.value);});
phoneInput.value=maskPhone(phoneInput.value);

function profileData(){
  return {
    name:document.querySelector('#customerName').value.trim(),
    phone:document.querySelector('#customerPhone').value.trim(),
    street:document.querySelector('#customerStreet').value.trim(),
    number:document.querySelector('#customerNumber').value.trim(),
    neighborhood:document.querySelector('#customerNeighborhood').value.trim(),
    reference:document.querySelector('#customerReference').value.trim()
  };
}
function profileComplete(){
  const d=profileData();
  const basic=d.name&&digits(d.phone).length>=10;
  return fulfillment==='Retirada'?basic:basic&&d.street&&d.number&&d.neighborhood;
}
function appendProfileLine(text,className){
  const el=document.createElement('span');
  if(className)el.className=className;
  el.textContent=text;
  profileBox.appendChild(el);
}
function refreshProfile(forceOpen=false){
  const d=profileData();
  const complete=profileComplete();
  if(forceOpen)profileEditing=true;
  if(complete&&!profileEditing){
    profileBox.replaceChildren();
    appendProfileLine('✓ Dados salvos','saved-ok');
    const name=document.createElement('strong');name.textContent=d.name;profileBox.appendChild(name);
    appendProfileLine(d.phone);
    if(fulfillment==='Entrega')appendProfileLine(`${d.street}, ${d.number} · ${d.neighborhood}${d.reference?` · ${d.reference}`:''}`);
    else appendProfileLine('Retirada no balcão');
    profileBox.classList.remove('hidden');
    editProfileBtn.classList.remove('hidden');
    customerForm.classList.add('customer-form-collapsed');
  }else{
    profileBox.classList.add('hidden');
    editProfileBtn.classList.toggle('hidden',!complete);
    customerForm.classList.remove('customer-form-collapsed');
  }
}
editProfileBtn.addEventListener('click',()=>{profileEditing=true;refreshProfile(true);document.querySelector('#customerName').focus();});

document.querySelectorAll('#fulfillment button').forEach(btn=>btn.addEventListener('click',()=>{profileEditing=false;setTimeout(()=>refreshProfile(),0);}));
document.querySelectorAll('[data-open-cart]').forEach(btn=>btn.addEventListener('click',()=>{profileEditing=false;setTimeout(()=>refreshProfile(),0);}));

validateCheckout=function(){
  document.querySelectorAll('.form-grid input').forEach(i=>i.classList.remove('invalid'));
  if(!cart.length)return 'Adicione pelo menos um item ao pedido.';
  const name=document.querySelector('#customerName'),phone=document.querySelector('#customerPhone');
  if(!name.value.trim()){name.classList.add('invalid');name.focus();return 'Informe seu nome para finalizar.';}
  if(digits(phone.value).length<10){phone.classList.add('invalid');phone.focus();return 'Informe um WhatsApp válido para a Brasinha confirmar o pedido.';}
  if(fulfillment==='Entrega'){
    const fields=[['customerStreet','Informe a rua ou avenida.'],['customerNumber','Informe o número.'],['customerNeighborhood','Informe o bairro.']];
    for(const [id,msg] of fields){const el=document.querySelector('#'+id);if(!el.value.trim()){el.classList.add('invalid');el.focus();return msg;}}
  }
  if(payment==='Dinheiro'&&!document.querySelector('#cashChange').value.trim())return 'Informe o valor para troco ou escreva “sem troco”.';
  return '';
};

const originalAddBuiltPizza=addBuiltPizza;
document.querySelector('#addPizza').onclick=()=>{
  if(builderMode==='half'&&document.querySelector('#flavorA').value===document.querySelector('#flavorB').value){
    alert('Escolha dois sabores diferentes para a pizza meia a meia. Para um único sabor, selecione “Inteira”.');
    return;
  }
  originalAddBuiltPizza();
};

document.querySelector('#pizzaBorder').addEventListener('change',()=>{
  const selected=document.querySelector('#pizzaBorder').value;
  if(selected)document.querySelector('#pizzaBreakdown').setAttribute('aria-label','Borda adicionada ao total da pizza');
});

refreshProfile();