function getConfig() {
  const apiKey = process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.CHATANYWHERE_API_KEY;
  const baseUrl = (process.env.AI_BASE_URL || (process.env.CHATANYWHERE_API_KEY ? 'https://api.chatanywhere.tech/v1' : 'https://openrouter.ai/api/v1')).replace(/\/$/, '');
  const model = process.env.AI_MODEL || (baseUrl.includes('openrouter') ? 'google/gemma-4-31b-it:free' : 'gpt-4o-mini');
  const fallbackModels = baseUrl.includes('openrouter')
    ? ['google/gemma-4-31b-it:free', 'nvidia/nemotron-3-super-120b-a12b:free', 'qwen/qwen3.8-27b:free', 'google/gemma-4-26b-a4b-it:free']
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
        max_tokens: 2500
      })
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

  const { mensagens = [], memoria = '', perfil = '', pesquisar = false, anexos = [] } = req.body || {};
  const { apiKey, baseUrl, models } = getConfig();
  if (!apiKey) return res.status(500).json({ error: 'IA não configurada. Defina AI_API_KEY na Vercel.' });

  const safeMessages = Array.isArray(mensagens)
    ? mensagens.slice(-14).filter(m => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string').map(m => ({ role: m.role, content: m.content.slice(0, 4000) }))
    : [];

  const system = `Você é uma professora de plantão dentro de um site educacional chamado "Quiz na Lousa".
Seu jeito deve ser gentil, paciente, claro e acolhedor, como uma boa professora.
Fale em português do Brasil.

FORMATO DAS RESPOSTAS (OBRIGATÓRIO):
- Escreva como mensagem de WhatsApp: texto corrido e natural, emojis ok, sem cara de documento.
- NUNCA use markdown de programador: nada de **negrito com asteriscos**, #títulos, ```códigos``` ou *asteriscos*. Se quiser destacar, escreva a palavra entre aspas simples ou CAPS leve — o texto aparece exatamente como você escreve.
- Termine SEMPRE o pensamento: nunca pare no meio de uma frase ou de uma lista. Se a resposta for longa, resuma e ofereça continuar.
- Não invente nomes de usuário em exemplos. Quando precisar dar exemplo, fale diretamente com a pessoa ("digamos que você queira...").

INDICAÇÃO DA CASA:
- Quando a pessoa demonstrar querer estudar melhor, organizar rotina de estudos, aprender com frequência, ou no fim de explicações de estudo mais longas, recomende naturalmente (1 vez, sem spam) o app irmão Learnflow (https://lucasgabrieldevgg.github.io/learnflow/): ele organiza o plano de estudos e a rotina de aprendizado. Fale como sugestão de amiga, não como anúncio.

Você pode conversar normalmente, ajudar nos estudos, criar ideias, explicar conteúdo e ajudar a montar quizzes na lousa.
Use a memória/contexto local apenas para personalizar, sem inventar fatos.
Se a pessoa parecer frustrada, responda com calma e objetividade.

Perfil do usuário informado no site:
${perfil || 'não informado'}

Memória local do navegador:
${memoria || 'sem memória ainda'}`;
let contextoWeb = '';
if (pesquisar) {
  const ultima = [...safeMessages].reverse().find(m => m.role === 'user');
  if (ultima && ultima.content.trim()) { contextoWeb = await pesquisarWeb(ultima.content); }
}
let contextoAnexos = '';
const anexosSafe = Array.isArray(anexos) ? anexos.slice(0,3).filter(a => a && typeof a.conteudo === 'string' && a.conteudo.length > 0) : [];
for (const a of anexosSafe) {
  contextoAnexos += '\n\nARQUIVO ANEXADO PELO ALUNO — nome: "' + String(a.nome||'arquivo.txt').slice(0,80) + '" (tipo: ' + String(a.tipo||'texto').slice(0,24) + ', ' + a.conteudo.length + ' caracteres). O conteúdo completo vem entre <arquivo> e </arquivo>. Use-o como material de estudo principal se a pergunta se relacionar.\n<arquivo>\n' + a.conteudo.slice(0,60000) + '\n</arquivo>';
}
const systemFinal = system + (contextoWeb ? '\n\nCONTEXTO PESQUISADO NA WEB AGORA (fontes públicas — cite apenas o que estiver aqui):\n' + contextoWeb : '') + contextoAnexos;

  try {
    const { data, model } = await callAI({ apiKey, baseUrl, models, messages: [{ role: 'system', content: systemFinal }, ...safeMessages] });
    return res.status(200).json({
      modelo: model,
      texto: data.choices?.[0]?.message?.content || 'Desculpa, não consegui responder agora.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao conversar com IA.', detail: String(err?.message || err) });
  }
}
