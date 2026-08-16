# Quiz Agent

> AI quiz agent with no preset options — it works like a real agent:

1. The student or teacher types any category or topic
2. The AI generates open-ended questions
3. The student answers in free text
4. The AI grades, accepts equivalent answers and explains
5. The category can be changed at any time

**Live demo:** https://quiz-agent-sigma.vercel.app

[Leia em Portugues](README.pt-BR.md)

## Files

- `index.html` — quiz agent UI
- `api/quiz.js` — generates dynamic quizzes with AI
- `api/corrigir.js` — grades open answers with AI
- `api/ia.js` — optional generic endpoint
- `vercel.json` — Vercel configuration

## Chosen AI

Default configuration:

```txt
qwen/qwen3-next-80b-a3b-instruct:free
```

Via OpenRouter. ChatAnywhere also works, since the backend uses the OpenAI-compatible protocol.

## Configure the AI on Vercel

In the Vercel dashboard, set environment variables:

### OpenRouter

```txt
AI_API_KEY=your_openrouter_key
AI_BASE_URL=https://openrouter.ai/api/v1
AI_MODEL=qwen/qwen3-next-80b-a3b-instruct:free
```

### ChatAnywhere

```txt
AI_API_KEY=your_chatanywhere_key
AI_BASE_URL=https://api.chatanywhere.tech/v1
AI_MODEL=gpt-4o-mini
```

These alternative names also work:

```txt
OPENROUTER_API_KEY=...
CHATANYWHERE_API_KEY=...
```

## Security

Never put keys inside `index.html` — everything in the HTML is public in the browser.

Vercel tokens and AI keys must live only in environment variables or the Vercel dashboard.

## Deploy

```bash
vercel --prod
```
