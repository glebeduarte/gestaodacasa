import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const PROMPT = (cats: string) => `Você lê extratos bancários e faturas de cartão de crédito brasileiros de uma família.
Liste TODOS os lançamentos do documento e responda SOMENTE com JSON neste formato:
{
  "fonte": "cartao" | "banco",
  "instituicao": string,                 // ex.: Nubank, Itaú, Banco do Brasil
  "periodo_inicio": "AAAA-MM-DD", "periodo_fim": "AAAA-MM-DD",
  "fatura_vencimento": "AAAA-MM-DD" | null,   // só para cartão
  "fatura_paga": boolean | null,              // só para cartão, se o documento indicar pagamento da fatura
  "lancamentos": [
    {
      "data": "AAAA-MM-DD",
      "descricao_original": string,      // como está no extrato
      "descricao": string,               // nome limpo e curto, ex.: "Conta de luz Cosern", "Supermercado Nordestão"
      "fornecedor": string | null,
      "valor": number,                   // sempre positivo, em reais
      "sentido": "saida" | "entrada",    // entrada = crédito, estorno, salário, pagamento de fatura recebido
      "parcela": string | null,          // ex.: "3/10"
      "tipo_conta": "energia"|"agua"|"gas"|"telefone"|"internet"|"tv"|"condominio"|"iptu"|"seguro"|"outro",
      "categoria_sugerida": string | null,   // EXATAMENTE um nome desta lista, ou null: ${cats}
      "nova_categoria": string | null,       // só se nenhuma da lista servir e for gasto da casa; nome curto (ex.: Mercado, Farmácia, Pet)
      "gasto_da_casa": boolean,          // true para despesas da residência (contas, mercado, manutenção, funcionários, jardim, piscina, pet, material de construção); false para transferências entre contas, investimentos, pagamento da própria fatura, saques, tarifas e itens claramente pessoais
      "pago": boolean                    // extrato bancário: débito efetivado = true; agendado/previsto = false. Cartão: compras = true
    }
  ]
}
Regras: não invente lançamentos; ignore linhas de saldo e totais; datas no ano correto do documento.`;

// Ordem de tentativa: modelo configurado, atual, e alternativas mais leves quando houver sobrecarga
const MODELOS = [Deno.env.get('GEMINI_MODEL'), 'gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-pro-latest'].filter(Boolean) as string[];
const espera = (ms: number) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const t0 = Date.now();
  try {
    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) return json({ erro: 'A chave do Gemini (GEMINI_API_KEY) ainda não foi configurada no Supabase.' }, 500);
    const { arquivo, mime, texto, categorias } = await req.json();
    if (!arquivo && !texto) return json({ erro: 'Arquivo não enviado.' }, 400);
    const cats = (categorias || []).map((c: { nome: string }) => c.nome).join(', ');
    const doc = texto ? { text: `EXTRATO:\n${String(texto).slice(0, 400000)}` } : { inline_data: { mime_type: mime, data: arquivo } };
    let ultimo = '';
    for (const [n, modelo] of MODELOS.entries()) {
      if (n > 0 && /high demand|overloaded|unavailable/i.test(ultimo)) await espera(2500);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 120000);
      let r: Response, out;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: 'POST', signal: ctrl.signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ contents: [{ parts: [doc, { text: PROMPT(cats) }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
        });
        out = await r.json();
      } catch { return json({ erro: 'O Gemini demorou demais. Tente um extrato de período menor.' }, 504); }
      finally { clearTimeout(timer); }
      console.log('gemini', modelo, r.status, Date.now() - t0, 'ms');
      if (!r.ok) {
        ultimo = out?.error?.message || 'Falha ao consultar o Gemini.';
        if ([404, 429, 500, 503].includes(r.status) || /no longer available|not found|not supported|high demand|overloaded|unavailable/i.test(ultimo)) continue;
        return json({ erro: ultimo }, 502);
      }
      const txt = out?.candidates?.[0]?.content?.parts?.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || '').join('') || '';
      try { return json({ dados: JSON.parse(txt.replace(/^```json|```$/g, '').trim()), modelo }); }
      catch { return json({ erro: 'Não consegui entender o extrato. Tente o PDF original do banco ou o arquivo CSV/OFX.' }, 422); }
    }
    return json({ erro: /high demand|overloaded|unavailable/i.test(ultimo) ? 'O Gemini está sobrecarregado agora. Tente de novo em alguns minutos.' : (ultimo || 'Nenhum modelo do Gemini disponível.') }, 503);
  } catch (e) {
    return json({ erro: String((e as Error)?.message || e) }, 500);
  }
});
