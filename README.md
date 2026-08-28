# Brasinha.Digital

Cardápio digital mobile-first da **Brasinha Pizzaria & Chopperia**, em Água Clara/MS.

## O que já funciona

- cardápio responsivo;
- busca por sabor e ingrediente;
- pizza inteira em tamanho médio ou grande;
- pizza meia a meia com cálculo pela metade de cada sabor;
- borda adicional;
- carrinho persistente;
- dados do cliente salvos no `localStorage` do aparelho;
- entrega ou retirada;
- Pix, cartão ou dinheiro;
- resumo completo enviado ao WhatsApp da Brasinha;
- taxa de entrega configurável por bairro.

### Regra do meio a meio

O cálculo é a soma de 50% do preço de cada sabor no tamanho escolhido.

Exemplo: sabor A = R$ 60 e sabor B = R$ 80 → R$ 30 + R$ 40 = **R$ 70**.

## Taxas de entrega

As taxas **não foram inventadas**. Elas precisam ser informadas pela pizzaria.

Edite `BRASINHA_CONFIG.deliveryFees` em `data.js`:

```js
deliveryFees: {
  'Centro': 5,
  'Jardim Exemplo': 8
}
```

Se o bairro não estiver cadastrado, o pedido vai ao WhatsApp com **"taxa a confirmar pela pizzaria"**.

## Deploy

Projeto estático, sem build. Pode publicar diretamente na Vercel ou GitHub Pages.
