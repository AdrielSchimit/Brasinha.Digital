const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(n)||0);
const escapeHtml=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

let catalog=null;
let activeCategory='all';
let editing=null;
let pendingPhoto=null;
let removePhoto=false;
let publishQueue=Promise.resolve();

function showLogin(message=''){
  $('#loginView').classList.remove('hidden');
  $('#adminView').classList.add('hidden');
  $('#loginError').textContent=message;
}
function showAdmin(){
  $('#loginView').classList.add('hidden');
  $('#adminView').classList.remove('hidden');
}
async function api(url,options={}){
  const res=await fetch(url,{credentials:'same-origin',headers:{'Content-Type':'application/json',...(options.headers||{})},...options});
  const data=await res.json().catch(()=>({}));
  if(!res.ok){const e=new Error(data.error||'Não foi possível concluir.');e.status=res.status;throw e;}
  return data;
}
async function loadCatalog(){
  try{
    catalog=await api('/api/admin/menu');
    showAdmin();renderAll();
  }catch(e){if(e.status===401)showLogin();else showLogin(e.message);}
}

function getMeta(item){
  if(!item[3]||typeof item[3]!=='object'||Array.isArray(item[3]))item[3]={};
  return item[3];
}
function isActive(item){return getMeta(item).active!==false;}
function publicImage(path){
  if(!path)return '../assets/logo.svg';
  if(/^https?:\/\//i.test(path)||path.startsWith('data:'))return path;
  return '../'+path.replace(/^\//,'');
}
function imageFor(group,item){return publicImage(getMeta(item).image||catalog.categoryImages[group.id]||'assets/logo.svg');}
function itemPrices(group,item,isExtra=false){
  const meta=getMeta(item);
  if(group.kind==='pizza'&&!isExtra)return meta.prices||group.prices||{M:0,G:0};
  return Number(item[2])||0;
}
function itemPriceLabel(group,item,isExtra=false){
  if(group.kind==='pizza'&&!isExtra){const p=itemPrices(group,item,false);return `M ${money(p.M)} · G ${money(p.G)}`;}
  return item[2]==null?'Preço a consultar':money(item[2]);
}
function allEntries(group){
  const entries=(group.items||[]).map((item,index)=>({group,item,index,list:'items',isExtra:false}));
  return entries.concat((group.extras||[]).map((item,index)=>({group,item,index,list:'extras',isExtra:true})));
}
function matches(entry,q){const s=`${entry.item[0]} ${entry.item[1]} ${entry.group.label}`.toLowerCase();return s.includes(q.toLowerCase());}

function renderTabs(){
  $('#categoryTabs').innerHTML=`<button class="category-tab ${activeCategory==='all'?'active':''}" data-cat="all">Todos</button>`+catalog.menu.map(g=>`<button class="category-tab ${activeCategory===g.id?'active':''}" data-cat="${escapeHtml(g.id)}">${escapeHtml(g.label)}</button>`).join('');
  $$('.category-tab').forEach(b=>b.onclick=()=>{activeCategory=b.dataset.cat;renderTabs();renderProducts();});
}
function renderProducts(){
  const q=$('#adminSearch').value.trim();
  const entries=catalog.menu.flatMap(allEntries).filter(e=>(activeCategory==='all'||e.group.id===activeCategory)&&(!q||matches(e,q)));
  const wrap=$('#productList');
  if(!entries.length){wrap.innerHTML='<div class="empty">Nenhum produto encontrado.</div>';return;}
  wrap.innerHTML=entries.map(e=>{
    const active=isActive(e.item);
    return `<article class="product-card ${active?'':'paused'}">
      <img class="product-photo" src="${escapeHtml(imageFor(e.group,e.item))}" alt="${escapeHtml(e.item[0])}" loading="lazy" />
      <div class="product-info"><h3>${escapeHtml(e.item[0])}</h3><p>${escapeHtml(e.item[1]||'')}</p><div class="product-meta"><span>${escapeHtml(itemPriceLabel(e.group,e.item,e.isExtra))}</span><span class="status-pill ${active?'on':''}">${active?'Disponível':'Pausado'}</span></div></div>
      <div class="product-actions"><button data-edit="${escapeHtml(e.group.id)}|${e.list}|${e.index}">Editar</button><button class="${active?'pause':'activate'}" data-toggle="${escapeHtml(e.group.id)}|${e.list}|${e.index}">${active?'Pausar':'Ativar'}</button></div>
    </article>`;
  }).join('');
  $$('[data-edit]').forEach(b=>b.onclick=()=>openEditorFromKey(b.dataset.edit));
  $$('[data-toggle]').forEach(b=>b.onclick=()=>toggleFromKey(b.dataset.toggle));
}
function renderAll(){renderTabs();renderProducts();}

function parseKey(key){const [groupId,list,index]=key.split('|');const group=catalog.menu.find(g=>g.id===groupId);return {group,list,index:Number(index),item:group?.[list]?.[Number(index)]};}
async function toggleFromKey(key){
  const ref=parseKey(key);if(!ref.item)return;
  const meta=getMeta(ref.item),before=meta.active!==false;meta.active=!before;renderProducts();
  try{await publish('Disponibilidade atualizada');}
  catch(e){meta.active=before;renderProducts();alert(e.message);}
}

function setSaveStatus(text,state=''){$('#saveStatus').textContent=text;$('#saveStatus').dataset.state=state;}
function publish(label='Alterações publicadas'){
  publishQueue=publishQueue.then(async()=>{
    setSaveStatus('Publicando...','saving');
    const result=await api('/api/admin/menu',{method:'PUT',body:JSON.stringify({config:catalog.config,categoryImages:catalog.categoryImages,menu:catalog.menu,sha:catalog.sha})});
    if(result.sha)catalog.sha=result.sha;
    setSaveStatus(label,'saved');
    setTimeout(()=>setSaveStatus('Tudo salvo'),2200);
    return result;
  }).catch(e=>{setSaveStatus('Erro ao salvar','error');throw e;});
  return publishQueue;
}

function categoryOptions(){return catalog.menu.map(g=>`<option value="${escapeHtml(g.id)}">${escapeHtml(g.label)}</option>`).join('');}
function currentEditGroup(){return catalog.menu.find(g=>g.id===$('#editCategory').value);}
function syncPriceFields(isExtra=false){
  const group=currentEditGroup();const pizza=group?.kind==='pizza'&&!isExtra;
  $('#pizzaPrices').classList.toggle('hidden',!pizza);$('#simplePriceWrap').classList.toggle('hidden',pizza);
}
function openEditorFromKey(key){
  const ref=parseKey(key);if(!ref.item)return;
  editing={...ref,isNew:false,isExtra:ref.list==='extras'};
  pendingPhoto=null;removePhoto=false;
  $('#editTitle').textContent='Editar produto';
  $('#editCategory').innerHTML=categoryOptions();$('#editCategory').value=ref.group.id;$('#editCategory').disabled=true;
  $('#editName').value=ref.item[0]||'';$('#editDescription').value=ref.item[1]||'';
  const meta=getMeta(ref.item);$('#editActive').checked=meta.active!==false;
  if(ref.group.kind==='pizza'&&!editing.isExtra){const p=meta.prices||ref.group.prices;$('#editPriceM').value=p?.M??'';$('#editPriceG').value=p?.G??'';}else $('#editPrice').value=ref.item[2]??'';
  $('#photoPreview').src=imageFor(ref.group,ref.item);syncPriceFields(editing.isExtra);openModal();
}
function openNewEditor(){
  const group=catalog.menu.find(g=>g.id===activeCategory)||catalog.menu[0];
  editing={isNew:true,isExtra:false};pendingPhoto=null;removePhoto=false;
  $('#editTitle').textContent='Novo produto';$('#editCategory').innerHTML=categoryOptions();$('#editCategory').disabled=false;$('#editCategory').value=group.id;
  $('#editName').value='';$('#editDescription').value='';$('#editPrice').value='';$('#editPriceM').value=group.prices?.M??'';$('#editPriceG').value=group.prices?.G??'';$('#editActive').checked=true;
  $('#photoPreview').src=publicImage(catalog.categoryImages[group.id]||'assets/logo.svg');syncPriceFields(false);openModal();
}
function openModal(){$('#editModal').classList.remove('hidden');$('#editModal').setAttribute('aria-hidden','false');document.body.style.overflow='hidden';$('#editMessage').textContent='';}
function closeModal(){$('#editModal').classList.add('hidden');$('#editModal').setAttribute('aria-hidden','true');document.body.style.overflow='';editing=null;pendingPhoto=null;removePhoto=false;$('#photoInput').value='';}

async function compressImage(file){
  if(!file)return null;
  if(file.size>12*1024*1024)throw new Error('Escolha uma imagem com menos de 12 MB.');
  const url=URL.createObjectURL(file);
  try{
    const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url;});
    const max=1200,scale=Math.min(1,max/Math.max(img.width,img.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/webp',.82);
  }finally{URL.revokeObjectURL(url);}
}

async function saveEditor(){
  const name=$('#editName').value.trim();if(!name)throw new Error('Informe o nome do produto.');
  const group=currentEditGroup();if(!group)throw new Error('Selecione uma categoria.');
  const desc=$('#editDescription').value.trim();
  const pizza=group.kind==='pizza'&&!editing?.isExtra;
  let item,meta;
  if(editing.isNew){
    item=pizza?[name,desc,null,{active:$('#editActive').checked}]:[name,desc,Number($('#editPrice').value)||0,{active:$('#editActive').checked}];
    group.items.push(item);editing={group,list:'items',index:group.items.length-1,item,isNew:false,isExtra:false};
  }else{
    item=editing.item;item[0]=name;item[1]=desc;meta=getMeta(item);meta.active=$('#editActive').checked;
    if(!pizza)item[2]=Number($('#editPrice').value)||0;
  }
  meta=getMeta(item);meta.active=$('#editActive').checked;
  if(pizza)meta.prices={M:Number($('#editPriceM').value)||0,G:Number($('#editPriceG').value)||0};
  if(removePhoto)delete meta.image;
  if(pendingPhoto){
    $('#editMessage').textContent='Enviando foto...';
    const upload=await api('/api/admin/upload',{method:'POST',body:JSON.stringify({name,dataUrl:pendingPhoto})});
    meta.image=upload.path;
  }
  $('#editMessage').textContent='Publicando...';await publish('Produto atualizado');
  renderAll();closeModal();
}

$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();$('#loginError').textContent='Entrando...';try{await api('/api/admin/login',{method:'POST',body:JSON.stringify({password:$('#adminPassword').value})});$('#adminPassword').value='';await loadCatalog();}catch(err){$('#loginError').textContent=err.message;}});
$('#logoutBtn').onclick=async()=>{try{await api('/api/admin/logout',{method:'POST',body:'{}'});}finally{catalog=null;showLogin();}};
$('#adminSearch').addEventListener('input',renderProducts);
$('#newProductBtn').onclick=openNewEditor;
$$('[data-close-modal]').forEach(b=>b.onclick=closeModal);
$('#editCategory').addEventListener('change',()=>{const g=currentEditGroup();syncPriceFields(false);$('#photoPreview').src=publicImage(catalog.categoryImages[g.id]||'assets/logo.svg');if(g.kind==='pizza'){if(!$('#editPriceM').value)$('#editPriceM').value=g.prices?.M??'';if(!$('#editPriceG').value)$('#editPriceG').value=g.prices?.G??'';}});
$('#photoInput').addEventListener('change',async e=>{try{pendingPhoto=await compressImage(e.target.files?.[0]);removePhoto=false;if(pendingPhoto)$('#photoPreview').src=pendingPhoto;}catch(err){alert(err.message);e.target.value='';}});
$('#removePhotoBtn').onclick=()=>{pendingPhoto=null;removePhoto=true;const g=currentEditGroup();$('#photoPreview').src=publicImage(catalog.categoryImages[g.id]||'assets/logo.svg');};
$('#editForm').addEventListener('submit',async e=>{e.preventDefault();const btn=$('#saveProductBtn');btn.disabled=true;try{await saveEditor();}catch(err){$('#editMessage').textContent=err.message;$('#editMessage').className='message error';}finally{btn.disabled=false;}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#editModal').classList.contains('hidden'))closeModal();});

loadCatalog();