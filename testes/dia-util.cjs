// Os testes rodam sempre num dia útil (terça a quinta), no mesmo horário de agora.
// No sábado a casa fecha ao meio-dia e no domingo não abre: agendar "hoje" falhava no fim de semana,
// e a publicação (que só sobe com os testes verdes) travava. Só vale para os arquivos *.teste.*;
// o `npm run simulador` usa a data de verdade. DIA_REAL=1 desliga.
const DIA = 864e5;
const ativo = /\.teste\.(c|m)?js$/.test(process.argv[1] || '') && !process.env.DIA_REAL;
const diaFortaleza = new Date(Date.now() - 3 * 3600e3).getUTCDay();
const OFFSET = ativo ? ({ 0: 2, 1: 1, 2: 0, 3: 0, 4: 0, 5: 4, 6: 3 })[diaFortaleza] * DIA : 0;

// troca o Date por um que anda junto, só que OFFSET à frente (datas passadas de propósito continuam iguais)
function deslocar(D, offset) {
  if (!offset) return D;
  class Data extends D {
    constructor(...a) { if (a.length === 0) super(D.now() + offset); else super(...a); }
    static now() { return D.now() + offset; }
  }
  return Data;
}

if (OFFSET && !global.__diaUtil) { global.Date = deslocar(Date, OFFSET); global.__diaUtil = true; }
// o mesmo para o código do Apps Script dentro do simulador (que tem o próprio Date)
const noContexto = OFFSET ? `globalThis.Date = (${deslocar.toString()})(Date, ${OFFSET});` : '';
module.exports = { OFFSET, noContexto };
