# Quiz Agent

> AI quiz agent with no preset options — it works like a real agent:

1. The student or teacher types any category or topic
2. The AI generates open-ended questions
3. The student answers in free text
4. The AI grades, accepts equivalent answers and explains
5. The category can be changed at any time

**Live demo:** https://quiz-agent-sigma.vercel.app — free, no account. If the AI is down, the built-in local math grader keeps the class going.

[Leia em Portugues](README.pt-BR.md)

## What's new in v1.2

- **Category persists** (localStorage) — the old hardcoded default is gone; empty field on first visit
- **🌐 Research mode**: check it before generating a quiz, or press 🌐 in the chat to research the web (OpenAlex + Wikipedia, free public sources) before that answer
- **📎 Attachments**: attach txt/md/csv/json/log/xml/html or **pdf** (pdf.js extracts the text). Content goes to the AI as an explained `<arquivo>` block — you can ⬇ download it back as .txt, and **Send only enables with text or attachment**
- **Robust free AI**: Gemma 4 31B → Nemotron 3 Super → Qwen 3.8 → Gemma 4 26B → Pollinations (last resort, keyless)
- **No more 10s timeouts** (`maxDuration: 30`)

## The look (CRA — no AI-slop)

Chalkboard classroom: green board, wooden frame, handwritten chalk (Caveat) on Atkinson Hyperlegible body. Zero gradients, zero glassmorphism, zero purple. The audit lives in `tests/cra_test.cjs` (55 checks) — visual tells are regression-tested.

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
