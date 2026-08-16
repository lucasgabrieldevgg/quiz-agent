# Quiz Agent

> AI quiz agent — no preset options. Type any topic, the AI generates open-ended questions, you answer freely, and the AI grades you (accepting equivalent answers) and explains the results.

**Live demo:** https://quiz-agent-sigma.vercel.app

## How it works

1. Student or teacher types any category or topic
2. The AI generates open-ended questions
3. The student answers in free text
4. The AI grades, accepts equivalent answers and explains — the category can be changed at any time

## Files

- `index.html` — quiz agent UI
- `api/quiz.js` — generates dynamic quizzes with AI
- `api/corrigir.js` — grades open answers with AI
- `api/ia.js` — optional generic endpoint
- `vercel.json` — Vercel configuration

## Configuration

Set env vars on Vercel (OpenRouter or any OpenAI-compatible provider such as ChatAnywhere):

```txt
AI_API_KEY=your_key
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=qwen/qwen3-next-80b-a3b-instruct:free
```

`OPENROUTER_API_KEY` / `CHATANYWHERE_API_KEY` also work as aliases. Never put keys inside `index.html` — everything in the HTML is public in the browser.

---

# 🇧🇷 Português (original)

# Agente IA de Quiz

Agora o site **não usa opções pré-feitas**. Ele funciona como um agente:

1. O aluno/professor digita qualquer categoria ou tema.
2. A IA gera perguntas abertas.
3. O aluno responde livremente.
4. A IA corrige, aceita respostas equivalentes e explica.
5. A categoria pode ser alterada a qualquer momento.

## Arquivos

- `index.html` — interface do agente de quiz.
- `api/quiz.js` — gera quizzes dinâmicos com IA.
- `api/corrigir.js` — corrige respostas abertas com IA.
- `api/ia.js` — endpoint genérico opcional.
- `vercel.json` — configuração para Vercel.

## IA escolhida

Padrão configurado:

```txt
qwen/qwen3-next-80b-a3b-instruct:free
```

Via OpenRouter. Também aceita ChatAnywhere, pois o backend usa protocolo compatível com OpenAI.

## Configurar a IA na Vercel

No painel da Vercel, configure variáveis de ambiente:

### OpenRouter

```txt
AI_API_KEY=sua_chave_openrouter
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=qwen/qwen3-next-80b-a3b-instruct:free
```

### ChatAnywhere

```txt
AI_API_KEY=sua_chave_chatanywhere
AI_BASE_URL=https://api.chatanywhere.tech/v1
AI_MODEL=gpt-4o-mini
```

Também funcionam estes nomes alternativos:

```txt
OPENROUTER_API_KEY=...
CHATANYWHERE_API_KEY=...
```

## Segurança

Não coloque chaves dentro do `index.html`, porque tudo que está no HTML fica público no navegador.

Tokens da Vercel e chaves de IA devem ficar apenas em variáveis de ambiente ou no painel da Vercel.

## Deploy

```bash
vercel --prod
```
