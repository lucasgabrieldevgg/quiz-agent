# Agente IA de Quiz

> Agente de quiz com perguntas abertas geradas e corrigidas por IA.

[Read in English](README.md)

---

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
