import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const PROMPT = (cats: string) => `Você lê contas de consumo e boletos brasileiros de uma residência.
Extraia os dados do documento e responda SOMENTE com um JSON neste formato (use null quando não encontrar):
{
  "tipo_conta": "energia" | "agua" | "gas" | "telefone" | "internet" | "tv" | "condominio" | "iptu" | "seguro" | "outro",
  "fornecedor": string,
  "descricao": string,
  "valor": number,
  "vencimento": "AAAA-MM-DD",
  "referencia": "AAAA-MM",
  "codigo_barras": string,
  "pix_copia_cola": string,
  "categoria_sugerida": string,
  "nova_categoria": string,
  "detalhes": {},
  "confianca": "alta" | "media" | "baixa"
}
Regras:
- fornecedor: nome da empresa (ex.: Neoenergia Cosern, CAERN, Claro).
- descricao: curta, ex.: "Luz outubro/2026".
- valor: TOTAL A PAGAR em reais, com ponto decimal.
- categoria_sugerida: escolha EXATAMENTE um nome desta lista, ou null se nenhum servir: ${cats}
- nova_categoria: só se nenhuma da lista servir, sugira um nome curto.
- detalhes: só os campos que existirem no documento, conforme o tipo:
  energia: consumo_kwh, instalacao (nº da unidade consumidora), leitura_anterior, leitura_atual, bandeira, dias_faturados
  agua: consumo_m3, matricula, leitura_anterior, leitura_atual
  gas: consumo_m3 ou consumo_kg, codigo_cliente
  telefone/internet/tv: numero_linha, contrato, plano, velocidade
  condominio/iptu/seguro: inscricao, apolice, parcela, unidade`;

// Modelo configurável pelo secret GEMINI_MODEL; se o Google aposentar um, tenta os seguintes
// Ordem de tentativa: modelo configurado, atual, e alternativas mais leves quando houver sobrecarga
const MODELOS = [Deno.env.get('GEMINI_MODEL'), 'gemini-3.8-flash', 'gemini-3.8-flash', 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemini-pro-latest'].filter(Boolean) as string[];
const espera = (ms: number) => new Promise(r => setTimeout(r, ms));

async function chamar(modelo: string, key: string, mime: string, arquivo: string, cats: string) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ inline_data: { mime_type: mime, data: arquivo } }, { text: PROMPT(cats) }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0 },
      }),
    });
    return { r, out: await r.json() };
  } finally { clearTimeout(timer); }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const t0 = Date.now();
  try {
    const key = Deno.env.get('GEMINI_API_KEY');
    if (!key) return json({ erro: 'A chave do Gemini (GEMINI_API_KEY) ainda não foi configurada no Supabase.' }, 500);
    const { arquivo, mime, categorias } = await req.json();
    if (!arquivo || !mime) return json({ erro: 'Arquivo não enviado.' }, 400);
    const cats = (categorias || []).map((c: { nome: string }) => c.nome).join(', ');
    let ultimo = '';
    for (const [n, modelo] of MODELOS.entries()) {
      if (n > 0 && /high demand|overloaded|unavailable/i.test(ultimo)) await espera(2500);
      let res;
      try { res = await chamar(modelo, key, mime, arquivo, cats); }
      catch { return json({ erro: 'O Gemini demorou demais para responder. Tente de novo em instantes.' }, 504); }
      const { r, out } = res;
      console.log('gemini', modelo, r.status, Date.now() - t0, 'ms');
      if (!r.ok) {
        ultimo = out?.error?.message || 'Falha ao consultar o Gemini.';
        if ([404, 429, 500, 503].includes(r.status) || /no longer available|not found|not supported|high demand|overloaded|unavailable/i.test(ultimo)) continue;
        const chaveRuim = /API key|API_KEY|permission|unauthenticated/i.test(ultimo);
        return json({ erro: chaveRuim ? 'A chave do Gemini foi recusada. Confira se é uma chave de API válida (aistudio.google.com/apikey).' : ultimo }, 502);
      }
      const texto = out?.candidates?.[0]?.content?.parts?.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text || '').join('') || '';
      try {
        const dados = JSON.parse(texto.replace(/^```json|```$/g, '').trim());
        return json({ dados, modelo });
      } catch { return json({ erro: 'Não consegui entender a conta. Tente uma foto mais nítida.' }, 422); }
    }
    return json({ erro: /high demand|overloaded|unavailable/i.test(ultimo) ? 'O Gemini está sobrecarregado agora. Tente de novo em alguns minutos.' : (ultimo || 'Nenhum modelo do Gemini disponível.') }, 503);
  } catch (e) {
    console.log('erro', String(e));
    return json({ erro: String((e as Error)?.message || e) }, 500);
  }
});
