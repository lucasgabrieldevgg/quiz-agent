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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const { questao, respostaAluno } = req.body || {};
  if (!questao?.enunciado) return res.status(400).json({ error: 'Campo questao.enunciado é obrigatório.' });
  if (!String(respostaAluno || '').trim()) return res.status(400).json({ error: 'Resposta do aluno vazia.' });

  const { apiKey, baseUrl, models } = getConfig();
  if (!apiKey) return res.status(500).json({ error: 'IA não configurada. Defina AI_API_KEY na Vercel.' });

  const messages = [
    { role: 'system', content: 'Você é um agente corretor de quizzes. Corrija respostas abertas em português do Brasil. Aceite respostas equivalentes, variações de notação e pequenos erros de formatação. Seja justo, mas não aceite resposta conceitualmente errada. Retorne APENAS JSON válido.' },
    { role: 'user', content: `Corrija a resposta do aluno.
Categoria: ${questao.categoria || 'não informada'}
Pergunta: ${questao.enunciado}
Resposta esperada/critérios: ${questao.respostaEsperada || 'não informado'}
Resposta do aluno: ${respostaAluno}

Formato obrigatório:
{"correta":true,"nota":0,"resumo":"frase curta","explicacao":"explicação didática curta","respostaCorreta":"resposta ideal"}` }
  ];

  try {
    const { data, model } = await callAI({ apiKey, baseUrl, models, messages, temperature: 0.15, max_tokens: 700 });
    const parsed = jsonFromText(data.choices?.[0]?.message?.content || '');
    return res.status(200).json({
      modelo: model,
      correta: !!parsed.correta,
      nota: Number(parsed.nota || (parsed.correta ? 100 : 0)),
      resumo: parsed.resumo || '',
      explicacao: parsed.explicacao || '',
      respostaCorreta: parsed.respostaCorreta || questao.respostaEsperada || ''
    });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao corrigir com IA.', detail: String(err?.message || err) });
  }
}
