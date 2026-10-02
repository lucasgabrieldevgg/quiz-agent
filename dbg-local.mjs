// reproduz a invocação localmente
globalThis.fetch = async (url) => { throw new Error('rede bloqueada no teste: ' + url); };
const mod = await import('./api/chat.js');
try {
  await mod.default({ method: 'POST', headers: { 'x-forwarded-for': 't' }, body: {
    mensagens: [{ role: 'user', content: 'oi' }],
    perfil: '', memoria: '', pesquisar: false,
    anexos: [{ nome: 'glm.txt', tipo: 'txt', conteudo: 'print do kdenlive' }]
  }}, { status: c => ({ json: j => { console.log('STATUS', c, JSON.stringify(j).slice(0, 200)); return { json: () => {} }; } }), json: j => console.log('RET', JSON.stringify(j).slice(0, 200)) });
} catch (e) { console.log('CRASH LOCAL:', e.message); }
