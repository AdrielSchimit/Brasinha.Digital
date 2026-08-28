const FREE_FOOD_IMAGES={
  sweet:'https://images.unsplash.com/photo-1565299507177-b0ac66763828?auto=format&fit=crop&w=900&q=82',
  pepperoni:'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=82',
  classic:'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=82',
  gourmet:'https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=900&q=82',
  veg:'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=82'
};
itemImage=function(group,name){
  if(/morango|brigadeiro|choco|m&m|banana|ouro/i.test(name))return FREE_FOOD_IMAGES.sweet;
  if(/pepperoni/i.test(name))return FREE_FOOD_IMAGES.pepperoni;
  if(/calabresa|baiana/i.test(name))return FREE_FOOD_IMAGES.classic;
  if(/costela|fraldinha|carne|lombo/i.test(name))return FREE_FOOD_IMAGES.gourmet;
  if(/rúcula|vegetar|brócolis|marguerita/i.test(name))return FREE_FOOD_IMAGES.veg;
  return CATEGORY_IMAGES[group.id]||FREE_FOOD_IMAGES.classic;
};
renderMenu(document.querySelector('#search')?.value||'');

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