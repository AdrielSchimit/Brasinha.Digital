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
