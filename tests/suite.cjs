// ============================================================
// 🧑‍🏫 Suíte de consistência — Quiz na Lousa (quiz-agent)
// Joga de verdade com o corretor local de matemática (sem IA),
// testa memória/chat/escape e BLINDA a identidade anti-vibe.
// ============================================================
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
const htmlSemScript = html.replace(/<script>[\s\S]*?<\/script>/g, '');

let pass = 0, fail = 0;
function ok(cond, nome) {
  if (cond) { pass++; console.log('  ✓ ' + nome); }
  else { fail++; console.log('  ✗ FALHOU: ' + nome); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

function carregar(seeds) {
  const dom = new JSDOM(htmlSemScript, { url: 'http://localhost/', runScripts: 'outside-only' });
  for (const [k, v] of Object.entries(seeds || {})) dom.window.localStorage.setItem(k, v);
  dom.window.eval(scripts + `
    ;globalThis.__Q = { get chatMessages(){ return chatMessages; }, set chatMessages(v){ chatMessages = v; }, renderMessages };`);
  return dom;
}

(async () => {
  console.log('— ESTRUTURA DA LOUSA —');
  {
    const dom = carregar();
    const d = dom.window.document;
    ok(d.getElementById('agentForm') !== null, 'formulário do agente existe');
    ok(['categoria', 'quantidade', 'nivel', 'instrucoes'].every(id => d.getElementById(id)), 'controles: categoria, quantidade, nível, instruções');
    ok(d.getElementById('tabQuiz') && d.getElementById('tabChat'), 'duas abas (quiz / conversa)');
    d.getElementById('tabChat').click();
    ok(d.getElementById('chatView').classList.contains('active'), 'aba Conversa abre');
    ok(!d.getElementById('quizView').classList.contains('active'), 'aba Quiz fecha');
    d.getElementById('tabQuiz').click();
    ok(d.getElementById('quizView').classList.contains('active'), 'volta pra aba Quiz');
    ok(d.getElementById('messages').textContent.includes('professora de plantão'), 'saudação da professora');
  }

  console.log('— DEMO LOCAL (sem IA) —');
  {
    const dom = carregar();
    const w = dom.window, d = w.document;
    d.getElementById('mathDemo').click();
    ok(d.querySelectorAll('#quiz .card').length === 6, 'demo carrega 6 questões');
    ok(d.getElementById('totalCount').textContent === '6', 'placar conta 6 questões');
    ok(d.getElementById('checkAll').disabled === false, 'botões de correção habilitam');
  }

  console.log('— CORRETOR LOCAL (a IA caiu, a aula continua) —');
  {
    const dom = carregar();
    const w = dom.window, d = w.document;
    d.getElementById('mathDemo').click();
    // responde 3x + 5x = 8x
    d.getElementById('ans-q4').value = '8x';
    w.checkOne('q4');
    await sleep(80);
    ok(d.getElementById('fb-q4').classList.contains('ok'), 'resposta certa vira verde');
    ok(d.getElementById('fb-q4').textContent.includes('Correto'), 'feedback de acerto');
    ok(d.getElementById('okCount').textContent === '1', 'placar conta o acerto');
    ok(d.getElementById('percentCount').textContent === '17%', 'aproveitamento 1/6 = 17%');
    // resposta errada
    d.getElementById('ans-q2').value = 'composto';
    w.checkOne('q2');
    await sleep(80);
    ok(d.getElementById('fb-q2').classList.contains('bad'), '17 é primo — "composto" vira vermelho');
    ok(d.getElementById('answeredCount').textContent === '2', 'respondidas conta 2');
    ok(d.getElementById('percentCount').textContent === '17%', 'aproveitamento = acertos/questões (1/6 = 17%, errar não pune o placar');
    // dica
    w.showHint('q3');
    ok(d.getElementById('ex-q3').classList.contains('show') && d.getElementById('ex-q3').textContent.includes('primos'), 'dica abre com texto');
    // limpar
    d.getElementById('reset').click();
    ok(d.getElementById('ans-q4').value === '' && d.getElementById('fb-q4').textContent.includes('Aguardando'), 'limpar respostas zera tudo');
    ok(d.getElementById('okCount').textContent === '0', 'placar volta a zero');
  }

  console.log('— CORRETOR LOCAL: CASOS DE MATEMÁTICA —');
  {
    const dom = carregar();
    const w = dom.window;
    const q = (enunciado, esperada) => ({ enunciado, respostaEsperada: esperada });
    ok(w.norm('8X²') === '8x^2', 'norm: maiúscula, ² e espaços normalizam');
    ok(w.localMathCheck(q('Quais são os divisores positivos de 18?', ''), '1, 2, 3, 6, 9, 18').correta, 'divisores de 18: aceita na ordem');
    ok(!w.localMathCheck(q('Quais são os divisores positivos de 18?', ''), '1, 2, 3, 6, 18').correta, 'divisores de 18: rejeita incompleto');
    ok(w.localMathCheck(q('17 é primo ou composto?', ''), 'primo').correta, '17 é primo: aceita');
    ok(w.localMathCheck(q('Fatore 36 em fatores primos.', ''), '2·2·3·3').correta, 'fatoração de 36 aceita notação com ·');
    ok(w.localMathCheck(q('Resolva: 4x × 2x = ?', ''), '8x²').correta, '4x×2x aceita 8x²');
    ok(w.localMathCheck(q('Coloque em fator comum: 15x + 10.', ''), '5(3x + 2)').correta, 'FCE 15x+10 aceita 5(3x+2)');
    ok(w.escapeHtml('<b>&"') === '&lt;b&gt;&amp;&quot;', 'escapeHtml neutraliza HTML (anti-injection)');
  }

  console.log('— MEMÓRIA E CONVERSA (localStorage) —');
  {
    const dom = carregar();
    const w = dom.window, d = w.document;
    d.getElementById('userName').value = 'Luke';
    d.getElementById('memory').value = 'gosto de exemplos curtos';
    d.getElementById('saveMemory').click();
    ok(w.localStorage.getItem('aiUserName') === 'Luke', 'nome persiste');
    ok(w.localStorage.getItem('aiMemory') === 'gosto de exemplos curtos', 'memória persiste');
    // mesma janela: esvazia os campos e repõe do storage (o que loadMemory faz ao abrir)
    d.getElementById('userName').value = '';
    d.getElementById('memory').value = '';
    w.loadMemory();
    ok(d.getElementById('userName').value === 'Luke', 'loadMemory repõe nome/memória do storage');
    // chat offline: fetch não existe → erro amigável, aula continua
    d.getElementById('chatInput').value = 'me explica fatoração';
    d.getElementById('chatForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
    await sleep(120);
    let msgs = d.querySelectorAll('.msg');
    ok(msgs.length === 2 && msgs[1].textContent.includes('Desculpa'), 'offline: erro amigável da professora');
    ok(msgs[0].classList.contains('user') && msgs[1].classList.contains('ai'), 'bolhas user/ai nos lados certos');
    ok(w.localStorage.getItem('chatMessages') === null, 'offline: nada persiste ainda (só persiste com resposta)');
    // chat com IA respondendo (fetch mockado): persiste de verdade
    w.fetch = async () => ({ ok: true, json: async () => ({ texto: 'Fatoração é escrever um número como multiplicação de primos.' }) });
    d.getElementById('chatInput').value = 'agora com a IA';
    d.getElementById('chatForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
    await sleep(120);
    msgs = d.querySelectorAll('.msg');
    ok(msgs.length === 4, 'IA respondeu (4 mensagens na lousa)');
    const salvo = JSON.parse(w.localStorage.getItem('chatMessages'));
    ok(Array.isArray(salvo) && salvo.length === 4 && salvo[3].content.includes('Fatoração'), 'conversa persiste no navegador');
    d.getElementById('clearChat').click();
    ok(w.localStorage.getItem('chatMessages') === null && d.querySelectorAll('.msg').length === 1, 'limpar conversa restaura a saudação');
  }

  console.log('— 📌 CATEGORIA PERSISTENTE (bug do "sempre aparece") —');
  {
    ok(!/id="categoria"[^>]*value="matemática: divisores/.test(html), 'input de categoria NÃO tem value hardcodado');
    const dom = carregar({ aiLastCategoria: 'história do Brasil' });
    ok(dom.window.document.getElementById('categoria').value === 'história do Brasil', 'recarregar repõe a última categoria real (localStorage)');
    const domVazio = carregar();
    ok(domVazio.window.document.getElementById('categoria').value === '', 'primeira visita: campo vazio com placeholder');
  }

  console.log('— 🌐 PESQUISAR ANTES DE GERAR —');
  {
    const dom = carregar();
    const w = dom.window, d = w.document;
    let capturado = null;
    w.fetch = async (url, opt) => { capturado = JSON.parse(opt.body); return { ok: true, json: async () => ({ fonte: 'ia', modelo: 'teste/x', questoes: [{ id: 'q1', categoria: 't', enunciado: '2+2?', respostaEsperada: '4', dica: 'd' }] }) }; };
    d.getElementById('categoria').value = 'tabuada do 7';
    d.getElementById('pesquisarQuiz').checked = true;
    d.getElementById('agentForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
    await sleep(60);
    ok(capturado && capturado.categoria === 'tabuada do 7', 'gerar envia a categoria digitada');
    ok(capturado && capturado.pesquisar === true, 'checkbox 🌐 vai no payload');
    ok(w.localStorage.getItem('aiLastCategoria') === 'tabuada do 7', 'categoria salva pra próxima visita');
    ok(d.querySelectorAll('#quiz .card').length === 1, 'quiz renderizou');
  }

  console.log('— 📎 ANEXOS + REGRA DO ENVIAR —');
  {
    const dom = carregar();
    const w = dom.window, d = w.document;
    ok(d.getElementById('sendChat').disabled === true, 'Enviar nasce desabilitado (sem texto, sem anexo)');
    d.getElementById('chatInput').value = 'oi';
    w.updateSend();
    ok(d.getElementById('sendChat').disabled === false, 'com texto, Enviar habilita');
    d.getElementById('chatInput').value = '';
    w.updateSend();
    ok(d.getElementById('sendChat').disabled === true, 'sem texto de novo, desabilita');
    // anexar txt (FileReader real do jsdom)
    const f = new w.File(['linha 1\nlinha 2 com conteúdo'], 'resumo.txt', { type: 'text/plain' });
    await w.processarFiles([f]);
    await sleep(80);
    ok(d.querySelectorAll('#anexosBox .anexo-chip').length === 1, 'anexo vira chip no composer');
    ok(d.getElementById('sendChat').disabled === false, 'com anexo (sem texto), Enviar habilita');
    ok(d.getElementById('anexosBox').textContent.includes('resumo.txt'), 'chip mostra o nome do arquivo');
    // enviar com anexo: payload leva conteudo + mensagem placeholder
    let capturado = null;
    w.fetch = async (url, opt) => { capturado = JSON.parse(opt.body); return { ok: true, json: async () => ({ texto: 'Li o arquivo!' }) }; };
    d.getElementById('chatForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
    await sleep(80);
    ok(capturado && Array.isArray(capturado.anexos) && capturado.anexos[0].conteudo.includes('linha 1'), 'anexo vai no payload com o conteúdo extraído');
    ok(capturado && capturado.mensagens[capturado.mensagens.length - 1].content.includes('[arquivo anexado'), 'mensagem do user cita o anexo');
    ok(d.querySelectorAll('#anexosBox .anexo-chip').length === 0, 'após enviar, chips limpos');
    ok(d.getElementById('sendChat').disabled === true, 'e o Enviar volta a desabilitar');
    // submit sem nada: não envia nada
    let nada = null;
    w.fetch = async (url, opt) => { nada = JSON.parse(opt.body); return { ok: true, json: async () => ({ texto: 'x' }) }; };
    d.getElementById('chatForm').dispatchEvent(new w.Event('submit', { cancelable: true }));
    await sleep(60);
    ok(nada === null, 'sem texto E sem anexo: nada é enviado');

    // truncamento
    const grande = new w.File(['x'.repeat(70000)], 'grande.txt', { type: 'text/plain' });
    await w.processarFiles([grande]);
    await sleep(80);
    ok(d.getElementById('anexosBox').textContent.includes('truncado'), 'arquivo acima de 60k chars é truncado com aviso');
    // 🌐 do chat
    d.getElementById('btnWeb').click();
    ok(d.getElementById('btnWeb').classList.contains('on'), '🌐 do chat liga modo pesquisa');
    d.getElementById('btnWeb').click();
    ok(!d.getElementById('btnWeb').classList.contains('on'), '🌐 desliga');
  }

  console.log('— 🗨️ RENDERIZAÇÃO DA FALA (fim do ** aparecendo) —');
  {
    const dom = carregar();
    const w = dom.window, d = w.document;
    w.__Q.chatMessages = [
      { role: 'assistant', content: 'Isso é **importante** e isso é *detalhe*' },
      { role: 'assistant', content: 'veja ```python\ncode``` e ## título e `código`' },
      { role: 'user', content: '**meu** texto *cru* fica igual' }
    ];
    w.renderMessages();
    const msgs = d.querySelectorAll('.msg');
    ok(msgs[0].querySelector('b') !== null && !msgs[0].textContent.includes('**'), 'assistant: **negrito** vira negrito de verdade');
    ok(msgs[0].querySelector('i') !== null, '*itálico* vira itálico');
    ok(!msgs[1].textContent.includes('```') && !msgs[1].textContent.includes('#'), 'assistant: cercos de código e marcas de título somem do texto');
    ok(msgs[2].textContent.includes('**meu**'), 'user: texto do aluno NUNCA é reinterpretado');
  }

  console.log('— 🔥 NADA DE CARA DE IA —');
  {
    ok(/font-family:'Atkinson Hyperlegible'/.test(html) && !/font-family:Inter|Inter,system-ui/.test(html), 'corpo em Atkinson (nada de Inter/system como personalidade)');
    ok(/'Caveat'/.test(html) && /fonts.googleapis.com\/css2\?family=Caveat/.test(html), 'giz manuscrito: Caveat carregada do Google Fonts');
    ok((html.match(/linear-gradient/g) || []).length === 0 && !/radial-gradient/.test(html), 'ZERO gradientes (nem glassmorphism)');
    ok(!/7c5cff|4aa3ff|VibeCode|#8b5cf6/i.test(html), 'zero roxo-lavanda de IA');
    ok(!/box-shadow:0 0 1[0-9]px/.test(html) && !/class="dot"/.test(html), 'zero bolinha brilhando / glow');
    ok(/border:10px solid var\(--moldura\)/.test(html) && /--moldura:#7a5230/.test(html), 'moldura de madeira (o primitivo da casa, repetido)');
    ok(/prefers-reduced-motion/.test(html), 'prefers-reduced-motion respeitado');
    ok(/rel="icon"/.test(html) && /🧑%F0%9F%A7%91%E2%80%8D%F0%9F%8F%AB|🧑‍🏫/.test(html), 'favicon 🧑‍🏫');
    ok(!/ghp_[A-Za-z0-9]{20,}|sk-or-v1-|sk-ant-|AIzaSy|vcp_[A-Za-z0-9]{20,}/.test(html), 'zero segredo no index.html');
    ok(fs.existsSync(path.join(__dirname, '..', 'LICENSE')), 'LICENSE MIT presente');
  }

  console.log('— BACKEND SERVERLESS (leitura, sem rede) —');
  {
    for (const f of ['quiz.js', 'corrigir.js', 'chat.js', 'ia.js']) {
      const src = fs.readFileSync(path.join(__dirname, '..', 'api', f), 'utf8');
      ok(/export default async function handler/.test(src), `api/${f} exporta handler Vercel`);
      ok(!/ghp_[A-Za-z0-9]{20,}|sk-or-v1-|sk-ant-|AIzaSy|vcp_[A-Za-z0-9]{20,}/.test(src), `api/${f}: zero segredo (tudo em env)`);
      ok(src.includes('text.pollinations.ai'), `api/${f}: Pollinations como último recurso`);
    }
    const quizSrc = fs.readFileSync(path.join(__dirname, '..', 'api', 'quiz.js'), 'utf8');
    const chatSrc = fs.readFileSync(path.join(__dirname, '..', 'api', 'chat.js'), 'utf8');
    ok(quizSrc.includes('pesquisarWeb') && quizSrc.includes('api.openalex.org'), 'api/quiz: pesquisa web (OpenAlex)');
    ok(chatSrc.includes('pesquisarWeb') && chatSrc.includes('wikipedia.org'), 'api/chat: pesquisa web (Wikipédia)');
    ok(chatSrc.includes('anexosSafe') && chatSrc.includes('<arquivo>'), 'api/chat: anexos injetados como <arquivo> explicado');
    const vcfg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
    ok(vcfg.functions && vcfg.functions['api/*.js'] && vcfg.functions['api/*.js'].maxDuration === 30, 'vercel.json: maxDuration 30s (fim do timeout de 10s)');
    ok(/max_tokens: 2500/.test(chatSrc), 'api/chat: 2500 tokens (fala não corta mais no meio)');
    ok(/NUNCA use markdown de programador/.test(chatSrc) && /Termine SEMPRE o pensamento/.test(chatSrc), 'api/chat: formato WhatsApp + anti-corte no system');
    ok(!/Luke/.test(chatSrc), 'api/chat: zero exemplo "Luke"');
    ok(chatSrc.includes('learnflow'), 'api/chat: indica o Learnflow pra quem quer estudar melhor');
  }

  console.log(`\n═══ RESULTADO: ${pass} ✓ · ${fail} ✗ ═══`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('CRASH:', e); process.exit(1); });
