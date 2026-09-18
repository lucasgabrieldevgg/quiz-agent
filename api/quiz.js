const fallbackMath = [
  { id: 'q1', categoria: 'Divisores', enunciado: 'Quais são os divisores positivos de 18?', respostaEsperada: '1, 2, 3, 6, 9, 18', dica: 'Liste os números que dividem 18 sem deixar resto.' },
  { id: 'q2', categoria: 'Primo ou composto', enunciado: '17 é primo ou composto?', respostaEsperada: 'primo', dica: 'Um número primo tem exatamente dois divisores positivos.' },
  { id: 'q3', categoria: 'Fatoração prima', enunciado: 'Fatore 36 em fatores primos.', respostaEsperada: '2² × 3²', dica: 'Quebre 36 em fatores que sejam primos.' },
  { id: 'q4', categoria: 'Termos semelhantes', enunciado: 'Resolva: 3x + 5x = ?', respostaEsperada: '8x', dica: 'Some os coeficientes dos termos semelhantes.' },
  { id: 'q5', categoria: 'Multiplicação algébrica', enunciado: 'Resolva: 4x × 2x = ?', respostaEsperada: '8x²', dica: 'Multiplique coeficientes e variáveis.' },
  { id: 'q6', categoria: 'FCE', enunciado: 'Coloque em fator comum: 15x + 10.', respostaEsperada: '5(3x + 2)', dica: 'O maior fator comum é 5.' }
];

function jsonFromText(text) {
  const clean = String(text || '').trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
  try { return JSON.parse(clean); } catch {}
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error('A IA não retornou JSON válido.');
}

function getConfig() {
  const apiKey = process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.CHATANYWHERE_API_KEY;
  const baseUrl = (process.env.AI_BASE_URL || (process.env.CHATANYWHERE_API_KEY ? 'https://api.chatanywhere.tech/v1' : 'https://openrouter.ai/api/v1')).replace(/\/$/, '');
  const model = process.env.AI_MODEL || (baseUrl.includes('openrouter') ? 'qwen/qwen3-next-80b-a3b-instruct:free' : 'gpt-4o-mini');
  const fallbackModels = baseUrl.includes('openrouter')
    ? ['qwen/qwen3-next-80b-a3b-instruct:free', 'qwen/qwen3-coder:free', 'openai/gpt-oss-20b:free', 'meta-llama/llama-3.3-70b-instruct:free']
    : [model];
  return { apiKey, baseUrl, models: [...new Set([model, ...fallbackModels])] };
}

async function callAI({ apiKey, baseUrl, models, messages, max_tokens, temperature }) {
  let lastError = null;
  for (const model of models) {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://quiz-agent-sigma.vercel.app',
        'X-Title': 'Agente IA de Quiz'
      },
      body: JSON.stringify({ model, messages, temperature, max_tokens, response_format: { type: 'json_object' } })
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok) return { data, model };
    lastError = data;
    if (![408, 409, 429, 500, 502, 503, 504].includes(r.status)) break;
  }
  const msg = lastError?.error?.message || lastError?.error || 'Erro na IA.';
  throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
}

/* 🚦 Limite diário de IA (generoso) — mantém o site grátis no ar */
const LIMITE_DIA=40;
const _HITS=new Map();
function limiteEstourado(req){
  const hoje=new Date().toISOString().slice(0,10);
  for(const k of [..._HITS.keys()]) if(!k.startsWith(hoje)) _HITS.delete(k);
  const ip=String(req.headers['x-forwarded-for']||'').split(',')[0].trim()||'anon';
  const k=hoje+':'+ip;
  const n=_HITS.get(k)||0;
  if(n>=LIMITE_DIA) return true;
  _HITS.set(k,n+1);
  return false;
}
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  if (limiteEstourado(req)) return res.status(429).json({ error: 'Você bateu o limite diário de IA (40 usos/dia por pessoa) — volta amanhã! 💙' });

  const { categoria = 'matemática', quantidade = 6, nivel = 'médio', instrucoes = '' } = req.body || {};
  const n = Math.max(1, Math.min(Number(quantidade) || 6, 12));
  const { apiKey, baseUrl, models } = getConfig();

  if (!apiKey) return res.status(200).json({ fonte: 'fallback', questoes: fallbackMath.slice(0, n) });

  const messages = [
    { role: 'system', content: 'Você é um agente criador de quizzes educacionais em português do Brasil. Você pode mudar totalmente a categoria conforme o usuário pedir. Crie perguntas abertas, não múltipla escolha. Retorne APENAS JSON válido.' },
    { role: 'user', content: `Crie um quiz na categoria/tema: "${categoria}".
Quantidade: ${n}.
Nível: ${nivel}.
Instruções extras: ${instrucoes || 'nenhuma'}.

Formato obrigatório:
{"titulo":"string","questoes":[{"id":"q1","categoria":"subtema","enunciado":"pergunta aberta","respostaEsperada":"resposta curta ou critério","dica":"dica curta"}]}

Regras: não crie alternativas; perguntas abertas; em matemática aceite equivalentes; seja claro.` }
  ];

  try {
    const { data, model } = await callAI({ apiKey, baseUrl, models, messages, temperature: 0.55, max_tokens: 1800 });
    const parsed = jsonFromText(data.choices?.[0]?.message?.content || '');
    return res.status(200).json({ fonte: 'ia', modelo: model, titulo: parsed.titulo || 'Quiz', questoes: (parsed.questoes || []).slice(0, n) });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao gerar quiz com IA.', detail: String(err?.message || err) });
  }
}
