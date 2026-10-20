// A Italiana tem algarismos antigos: o 1 parece um I e o 0 parece um o ("1X NA SEMANA" vira "IX", "20" vira "2o").
// Nos títulos com texto variável (datas, nomes de plano), os números vão na mono, com a classe .num.
export function comNumeros(texto) {
  return String(texto ?? '')
    .split(/(\d+(?:[.,]\d+)*)/)
    .map((parte, i) => (i % 2 ? <span key={i} className="num">{parte}</span> : parte));
}
