function getConfig() {
  const apiKey = process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.CHATANYWHERE_API_KEY;
  const baseUrl = (process.env.AI_BASE_URL || (process.env.CHATANYWHERE_API_KEY ? 'https://api.chatanywhere.tech/v1' : 'https://openrouter.ai/api/v1')).replace(/\/$/, '');
  const model = process.env.AI_MODEL || (baseUrl.includes('openrouter') ? 'qwen/qwen3-next-80b-a3b-instruct:free' : 'gpt-4o-mini');
  const fallbackModels = baseUrl.includes('openrouter')
    ? ['qwen/qwen3-next-80b-a3b-instruct:free', 'qwen/qwen3-coder:free', 'openai/gpt-oss-20b:free', 'meta-llama/llama-3.3-70b-instruct:free']
    : [model];
  return { apiKey, baseUrl, models: [...new Set([model, ...fallbackModels])] };
}

async function callAI({ apiKey, baseUrl, models, messages }) {
  let lastError = null;
  for (const model of models) {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://quiz-agent-sigma.vercel.app',
        'X-Title': 'Agente IA de Quiz e Chat'
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.65,
        max_tokens: 900
      })
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

  const { mensagens = [], memoria = '', perfil = '' } = req.body || {};
  const { apiKey, baseUrl, models } = getConfig();
  if (!apiKey) return res.status(500).json({ error: 'IA não configurada. Defina AI_API_KEY na Vercel.' });

  const safeMessages = Array.isArray(mensagens)
    ? mensagens.slice(-14).filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 4000) }))
    : [];

  const system = `Você é uma IA assistente dentro de um site educacional.
Seu jeito deve ser gentil, paciente, claro e acolhedor, parecido com um bom tutor.
Fale em português do Brasil.
Você pode conversar normalmente, ajudar nos estudos, criar ideias, explicar conteúdo, e também ajudar o usuário a montar quizzes.
Não seja seco. Chame o usuário pelo nome se ele informou.
Use a memória/local context apenas para personalizar, sem inventar fatos.
Se o usuário parecer frustrado, responda com calma e objetividade.

Perfil do usuário informado no site:
${perfil || 'não informado'}

Memória local do navegador:
${memoria || 'sem memória ainda'}`;

  try {
    const { data, model } = await callAI({ apiKey, baseUrl, models, messages: [{ role: 'system', content: system }, ...safeMessages] });
    return res.status(200).json({
      modelo: model,
      texto: data.choices?.[0]?.message?.content || 'Desculpa, não consegui responder agora.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao conversar com IA.', detail: String(err?.message || err) });
  }
}
