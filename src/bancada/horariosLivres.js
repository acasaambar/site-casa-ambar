// ============================================================
//  HORÁRIOS LIVRES NA HORA
//  A mesma conta do servidor (bancada_horarios em Servicos.gs), feita na tela com a agenda da semana
//  que já está carregada: escolher profissional, dia ou serviço não espera o servidor.
//  O servidor confere por trás (a resposta dele substitui esta) e de novo ao salvar.
//  Mudou a regra no servidor? Mude aqui também (testes/horarios.teste.mjs compara os dois).
// ============================================================
const semAcento = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
const min = (h) => { const [a, b] = String(h).split(':').map(Number); return a * 60 + (b || 0); };
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// segundos desde a meia-noite em Fortaleza (o horário que já passou hoje não aparece)
export function segundosAgoraFortaleza(agora = new Date()) {
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Fortaleza', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(agora).map((x) => [x.type, x.value]));
    return Number(p.hour) * 3600 + Number(p.minute) * 60 + Number(p.second);
  } catch {
    const d = new Date(agora.getTime() - 3 * 3600e3);
    return d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
  }
}

const mesmaPessoa = (a, b) => semAcento(a) === semAcento(b);
const fazServico = (p, serv) => (p.servicos?.length ? p.servicos.some((c) => c.id === serv.id) : !p.categorias?.length || p.categorias.includes(serv.categoria));

// tempo do serviço com esta profissional (o dela, se tiver; senão o do serviço)
export function duracaoNoServico(catalogo, serv, profissional) {
  const p = catalogo.profissionais.find((x) => mesmaPessoa(x.nome, profissional));
  const c = p?.servicos?.find((x) => x.id === serv.id);
  return (c && c.duracao) || serv.duracao;
}

// null = não dá para calcular aqui (dia fora da semana carregada, profissional sem turnos…): fica com o servidor
export function horariosLivres({ semana, catalogo, servicoId, profissional, data, ignorarId, hoje, segundosAgora }) {
  if (!semana || !catalogo || !servicoId || !profissional || !data) return null;
  const serv = catalogo.servicos.find((s) => s.id === servicoId);
  if (!serv) return null;
  const p = catalogo.profissionais.find((x) => mesmaPessoa(x.nome, profissional));
  if (p && !fazServico(p, serv)) return { horarios: [], motivo: `${profissional} não faz ${serv.nome}. Confira em Catálogo → Profissionais.` };
  const eq = (semana.equipe || []).find((e) => mesmaPessoa(e.nome, profissional));
  if (!eq || !eq.dias || !(data in eq.dias)) return null;
  const dur = duracaoNoServico(catalogo, serv, profissional);
  const turnos = eq.dias[data].map(([a, b]) => [min(a), min(b)]);
  if (!turnos.length) return { horarios: [], motivo: `${profissional} não atende neste dia.` };

  // ocupações do dia: folgas/bloqueios dela, casa fechada e as aulas que ela dá
  const ocup = (semana.folgas || []).filter((f) => f.data === data && mesmaPessoa(f.profissional, profissional));
  if (semana.fechados && data in semana.fechados) ocup.push({ diaTodo: true, motivo: 'casa fechada' + (semana.fechados[data] ? ': ' + semana.fechados[data] : '') });
  (semana.aulas || []).filter((a) => a.data === data && mesmaPessoa(a.professor, profissional)).forEach((a) => {
    ocup.push({ diaTodo: false, inicio: a.hora, fim: hhmm(min(a.hora) + (Number(a.duracao) || semana.duracaoAula || 60)), motivo: 'aula de ' + a.modalidade });
  });
  const diaTodo = ocup.find((f) => f.diaTodo);
  if (diaTodo) return { horarios: [], motivo: `${profissional} não atende neste dia (${diaTodo.motivo}).` };
  const blocos = ocup.map((f) => [min(f.inicio), min(f.fim)]);
  const atend = (semana.atendimentos || []).filter((a) => a.data === data && a.status !== 'cancelado' && a.status !== 'falta' && a.id !== ignorarId
    && mesmaPessoa(a.profissional, profissional)).map((a) => [min(a.hora), min(a.hora) + (Number(a.duracao) || 60)]);

  const livres = [];
  turnos.forEach(([t0, t1]) => {
    for (let m = t0; m + dur <= t1; m += 15) {
      if (data === hoje && m * 60 < segundosAgora) continue;
      const fim = m + dur;
      if (atend.some(([b0, b1]) => m < b1 && b0 < fim)) continue;
      if (blocos.some(([b0, b1]) => m < b1 && b0 < fim)) continue;
      livres.push(hhmm(m));
    }
  });
  return { horarios: livres, duracao: dur };
}
