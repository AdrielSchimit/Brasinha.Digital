const BRASINHA_CONFIG = {
  whatsapp: '5567992161939',
  address: 'Av. Benevenuto, 747 — Água Clara/MS',
  // Preencha com os valores reais da pizzaria. Ex.: 'Centro': 5.
  // Enquanto um bairro não estiver cadastrado, o pedido informa "taxa a confirmar".
  deliveryFees: {}
};

const CATEGORY_IMAGES = {
  classicas:'assets/pizza-calabresa.jpg', especiais:'assets/pizza-especial.jpg', gourmet:'assets/pizza-carne.jpg',
  doces:'assets/pizza-morango.jpg', bordas:'assets/pizza-borda.jpg', burgers:'assets/pizza-borda.jpg',
  extras:'assets/pizza-borda.jpg', porcoes:'assets/pizza-especial.jpg', bebidas:'assets/pizza-vegetariana.jpg',
  cervejas:'assets/pizza-pepperoni.jpg', drinks:'assets/pizza-vegetariana.jpg', soda:'assets/pizza-morango.jpg'
};

const MENU = [
  {id:'classicas',label:'Clássicas',kind:'pizza',prices:{M:60,G:70},items:[
    ['Bauru','Mussarela, presunto e tomate.'],['Bacon','Mussarela e bacon.'],['Calabresa','Mussarela, calabresa e cebola.'],['Marguerita','Mussarela, manjericão e tomate.'],['Mussarela','Mussarela e tomate em rodelas.'],['Pepperoni','Mussarela e pepperoni.'],['Frango com Catupiry','Mussarela, frango e Catupiry.'],['Palmito','Mussarela, palmito, tomate e cebola.'],['Portuguesa','Mussarela, presunto, ovos, bacon, ervilha e cebola.'],['Brócolis','Mussarela, brócolis, bacon e alho.'],['Vegetariana','Mussarela, brócolis, palmito, ervilha e tomate.'],['Baiana','Mussarela, calabresa moída, cebola, ovos e pimenta-calabresa.']
  ]},
  {id:'especiais',label:'Especiais',kind:'pizza',prices:{M:65,G:75},items:[
    ['Água Clara','Mussarela, carne seca, banana-da-terra, tomate e bacon.'],['Troiana','Mussarela, lombo, Catupiry e parmesão.'],['Lácreme','Mussarela, frango, creme de leite e Catupiry.'],['Brasinha','Mussarela, Catupiry, palmito e atum.'],['Catupireza','Mussarela, Catupiry e calabresa.'],['Costela','Mussarela, costela, tomate picado, cebola e pimenta-biquinho.'],['Rúcula','Mussarela, rúcula, tomate seco e cebola.'],['Quatro Queijos','Mussarela, Catupiry, parmesão e provolone.'],['Strogonoff de Carne','Mussarela, strogonoff e batata palha.'],['Strogonoff de Frango','Mussarela, strogonoff e batata palha.']
  ]},
  {id:'gourmet',label:'Gourmet',kind:'pizza',prices:{M:70,G:80},items:[
    ['Nordestina Gourmet','Mussarela, cream cheese, carne seca, queijo coalho, cebolinha, parmesão e geleia de pimenta.'],['Mexicana','Mussarela, pepperoni, molho de pimenta, cebola doce e pimenta-biquinho.'],['Quatro Queijos do Chef','Mussarela, Catupiry, provolone, parmesão, tomate seco, manjericão e alho.'],['Camponesa','Mussarela, lombo, cheddar, bacon e cebola.'],['Brócolis Gratinado','Mussarela, brócolis, Catupiry, cream cheese, bacon e alho.'],['Cornbacon','Mussarela, frango, milho, Catupiry e bacon.'],['Lombo ao Creme','Mussarela, lombo, Catupiry, bacon e parmesão.'],['Fraldinha do Chef','Mussarela, filé de fraldinha, pimentão, cebola, geleia de pimenta e champignon.'],['Fraldinha Supreme','Mussarela, filé de fraldinha, cebola roxa, parmesão, creme de leite, tomate seco e cebolinha.'],['Frango Caipira Crocante','Mussarela, frango, bacon, milho e batata palha.']
  ]},
  {id:'doces',label:'Doces',kind:'pizza',prices:{M:65,G:75},items:[
    ['Brigadeiro','Chocolate ao leite e granulado.'],['Morango','Chocolate com avelã e morango.'],['Di Maria','Chocolate branco flambado e banana.'],['Bananada','Mussarela, doce de leite, Catupiry e açúcar mascavo.'],['Banana Clássica','Mussarela, banana e açúcar mascavo.'],['M&M','Chocolate ao leite e M&M.'],['Ouro Branco','Chocolate ao leite e bombom Ouro Branco.'],['Chocoduo','Chocolate ao leite, chocolate branco e morango.']
  ],extras:[['Calzone Chocoduo','Chocolate ao leite e chocolate branco.',null],['Calzone Chocomorango','Chocolate com avelã e morango.',30]]},
  {id:'bordas',label:'Bordas',kind:'simple',items:[
    ['Catupiry Original','Borda recheada.',12],['Cheddar Original','Borda recheada.',12],['Mussarela','Borda recheada.',25],['Escama Calabresa','Borda especial.',25],['Pãozinho — Frango ou Presunto e Queijo','Borda em formato de pãozinho.',30],['Pãozinho — Brócolis ou Calabresa','Borda em formato de pãozinho.',30],['Chocolate','Borda doce.',25],['Catupiry com Goiabada','Borda agridoce.',25],['Vulcão Cheddar','Borda vulcão.',30],['Vulcão de Catupiry ou Mista','Borda vulcão.',40]
  ]},
  {id:'burgers',label:'Burgers',kind:'simple',items:[
    ['Classic Burguer','Hambúrguer bovino de 150 g, mussarela, tomate, alface fresca e maionese da casa. Acompanha batata frita.',28],['Old Burguer','Hambúrguer bovino de 150 g, mussarela, bacon e maionese da casa. Acompanha batata frita.',28],['Brasa Burguer','Hambúrguer bovino de 150 g, barbecue, mussarela, cebola dourada na chapa e maionese da casa. Acompanha batata frita.',30],['Rúcula Burguer','Hambúrguer bovino de 150 g, molho da casa, mussarela, mel e rúcula. Acompanha batata frita.',30]
  ]},
  {id:'extras',label:'Extras',kind:'simple',items:[['Catupiry','Adicional.',6],['Cheddar','Adicional.',6],['Bacon','Adicional.',5],['Calabresa','Adicional.',5],['Hambúrguer','Adicional.',8],['Molho extra','Adicional.',2]]},
  {id:'porcoes',label:'Porções',kind:'simple',items:[['Porção de pastel','Porção.',40],['Batata frita simples','Porção.',35],['Batata frita completa','Porção.',45],['Filé de tilápia e cebola empanada','Porção.',65],['Frango à passarinho','Porção.',50],['Calabresa acebolada','Porção.',45],['Contrafilé com fritas','Carne em tiras e batata frita com mussarela.',80]]},
  {id:'bebidas',label:'Bebidas',kind:'simple',items:[['Fanta 2 L','Laranja ou uva.',10],['Guaraná Antarctica 2 L','Refrigerante.',12],['Coca-Cola 2 L','Refrigerante.',15],['Refrigerante lata','Lata.',6],['Coca-Cola / Antarctica 1 L','Refrigerante.',8],['Água sem gás','Garrafa.',4],['Água com gás','Garrafa.',5],['Suco de polpa','Copo.',6],['Suco de laranja','Copo.',8],['Energético','Lata.',15],['Copo com limão e gelo','Adicional.',2],['Copo com laranja e gelo','Adicional.',2.5]]},
  {id:'cervejas',label:'Cervejas',kind:'simple',items:[['Skol 600 ml','Cerveja.',10],['Brahma 600 ml','Cerveja.',10],['Amstel 600 ml','Cerveja.',12],['Original 600 ml','Cerveja.',12],['Heineken 600 ml','Cerveja.',15],['Long neck Stella Artois','Long neck.',10],['Long neck Budweiser','Long neck.',10],['Long neck Heineken','Long neck.',12]]},
  {id:'drinks',label:'Drinks',kind:'simple',items:[['Smirnoff Morango','Drink.',35],['Batidinha','Drink.',25],['Caipirinha Morango','Drink.',18],['Caipirinha Limão','Drink.',15],['Dose Cowboy','Dose.',15],['Gin Tônica','Drink.',30],['Garibaldi','Drink.',25]]},
  {id:'soda',label:'Soda Italiana',kind:'simple',items:[['Soda Italiana','Sabores: morango, limão, tangerina, blueberry ou cranberry.',12]]}
];

const BORDERS = MENU.find(x=>x.id==='bordas').items;
