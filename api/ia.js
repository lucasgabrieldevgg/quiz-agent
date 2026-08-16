// Compatibilidade: endpoint genérico de tutor IA.
// Preferencialmente use /api/quiz e /api/corrigir.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });

  const apiKey = process.env.AI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.CHATANYWHERE_API_KEY;
  const baseUrl = (process.env.AI_BASE_URL || (process.env.CHATANYWHERE_API_KEY ? 'https://api.chatanywhere.tech/v1' : 'https://openrouter.ai/api/v1')).replace(/\/$/, '');
  const model = process.env.AI_MODEL || (baseUrl.includes('openrouter') ? 'qwen/qwen3-next-80b-a3b-instruct:free' : 'gpt-4o-mini');

  if (!apiKey) return res.status(500).json({ error: 'Defina AI_API_KEY na Vercel.' });

  const { mensagem, pergunta, respostaAluno, resultado } = req.body || {};
  const prompt = mensagem || `Explique em português, de forma curta e didática. Pergunta: ${pergunta || ''}. Resposta do aluno: ${respostaAluno || ''}. Resultado: ${resultado || ''}.`;

  try {
    const r = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.APP_URL || 'https://vercel.app',
        'X-Title': 'Agente IA de Quiz'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'Você é um tutor educacional claro, gentil e objetivo.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 400
      })
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    return res.status(200).json({ texto: data.choices?.[0]?.message?.content || 'Sem resposta.' });
  } catch (err) {
    return res.status(500).json({ error: 'Falha ao chamar a IA.', detail: String(err?.message || err) });
  }
}
