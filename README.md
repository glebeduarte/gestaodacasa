# Casa Hylana

App de gestão da manutenção da casa: categorias de custo, custos fixos, despesas com contexto, obras com linha do tempo e pessoas que trabalham na casa.

Stack: Vite + React + Supabase (banco, auth e fotos), hospedado na Vercel.

## Rodar localmente

```
npm install
cp .env.example .env
npm run dev
```

## Variáveis de ambiente

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Usuários

O login é por e-mail e senha. Crie os usuários no painel do Supabase (Authentication > Users > Add user). Não há cadastro aberto.
