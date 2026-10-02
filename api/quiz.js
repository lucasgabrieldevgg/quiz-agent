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
  const model = process.env.AI_MODEL || (baseUrl.includes('openrouter') ? 'google/gemma-4-31b-it:free' : 'gpt-4o-mini');
  const fallbackModels = baseUrl.includes('openrouter')
    ? ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3-super-120b-a12b:free', 'qwen/qwen3.8-27b:free', 'google/gemma-4-26b-a4b-it:free']
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
  // 🟡 último recurso (regra da casa): Pollinations — grátis, sem chave
  try {
    const pr = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'openai', messages, temperature, max_tokens })
    });
    const pd = await pr.json().catch(() => ({}));
    if (pr.ok && pd.choices && pd.choices[0] && pd.choices[0].message && pd.choices[0].message.content) return { data: pd, model: 'pollinations/openai' };
  } catch {}
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

/* 🌐 pesquisa web — fontes públicas grátis, keyless (regra da casa) */
function palavrasChave(txt, max){
  const stop = new Set(['de','da','do','das','dos','e','as','os','um','uma','com','para','por','em','no','na','nos','nas','sobre','básica','basica','exercicios','exercícios']);
  return String(txt||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>2 && !stop.has(w)).slice(0,max||3);
}
async function pesquisarWeb(topico){
  const partes = [];
  try {
    const q = palavrasChave(topico,3).join(' ');
    if (q) {
      const r = await fetch('https://api.openalex.org/works?filter=title.search:'+encodeURIComponent(q)+'&per-page=3&select=title,publication_year,cited_by_count&mailto=app-semeador@proton.me');
      if (r.ok) { const d = await r.json();
        const arts = (d.results||[]).map(w=>'- "'+(w.title||'')+'" ('+(w.publication_year||'?')+'), '+(w.cited_by_count||0)+' citações').filter(s=>s.length>15);
        if (arts.length) partes.push('TRABALHOS ACADÊMICOS RELACIONADOS (OpenAlex):\n'+arts.join('\n'));
      }
    }
  } catch {}
  try {
    const q2 = palavrasChave(topico,4).join(' ');
    if (q2) {
      const r = await fetch('https://pt.wikipedia.org/w/api.php?action=query&list=search&srsearch='+encodeURIComponent(q2)+'&srlimit=3&format=json&origin=*');
      if (r.ok) { const d = await r.json();
        const arts = (d.query&&d.query.search||[]).map(s=>'- '+s.title+': '+String(s.snippet||'').replace(/<[^>]+>/g,''));
        if (arts.length) partes.push('RESUMOS DA WIKIPÉDIA (pt):\n'+arts.join('\n'));
      }
    }
  } catch {}
  return partes.join('\n\n');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  if (limiteEstourado(req)) return res.status(429).json({ error: 'Você bateu o limite diário de IA (40 usos/dia por pessoa) — volta amanhã! 💙' });

  const { categoria = 'matemática', quantidade = 6, nivel = 'médio', instrucoes = '', pesquisar = false } = req.body || {};
  const n = Math.max(1, Math.min(Number(quantidade) || 6, 12));
  const { apiKey, baseUrl, models } = getConfig();

  if (!apiKey) return res.status(200).json({ fonte: 'fallback', questoes: fallbackMath.slice(0, n) });

  let contextoWeb = '';
  if (pesquisar) { contextoWeb = await pesquisarWeb(categoria); }

  const messages = [
    { role: 'system', content: 'Você é um agente criador de quizzes educacionais em português do Brasil. Você pode mudar totalmente a categoria conforme o usuário pedir. Crie perguntas abertas, não múltipla escolha. Retorne APENAS JSON válido.' },
    { role: 'user', content: `Crie um quiz na categoria/tema: "${categoria}".
Quantidade: ${n}.
Nível: ${nivel}.
Instruções extras: ${instrucoes || 'nenhuma'}.

Formato obrigatório:
{"titulo":"string","questoes":[{"id":"q1","categoria":"subtema","enunciado":"pergunta aberta","respostaEsperada":"resposta curta ou critério","dica":"dica curta"}]}

Regras: não crie alternativas; perguntas abertas; em matemática aceite equivalentes; seja claro.` },
    ...(contextoWeb ? [{ role: 'system', content: 'CONTEXTO PESQUISADO NA WEB AGORA (fontes públicas — use como inspiração fiel, não invente além dele):\n\n' + contextoWeb }] : [])
  ];

  try {
    const { data, model } = await callAI({ apiKey, baseUrl, models, messages, temperature: 0.55, max_tokens: 1800 });
    const parsed = jsonFromText(data.choices?.[0]?.message?.content || '');
    return res.status(200).json({ fonte: 'ia', modelo: model, titulo: parsed.titulo || 'Quiz', questoes: (parsed.questoes || []).slice(0, n) });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao gerar quiz com IA.', detail: String(err?.message || err) });
  }
}
