// ---------- CPF ----------
export function soDigitos(v) {
  return String(v || '').replace(/\D/g, '');
}

export function mascaraCPF(v) {
  const d = soDigitos(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function cpfValido(v) {
  const c = soDigitos(v);
  if (c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  const calc = (n) => {
    let soma = 0;
    for (let i = 0; i < n; i++) soma += Number(c[i]) * (n + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return calc(9) === Number(c[9]) && calc(10) === Number(c[10]);
}

export function mascaraTelefone(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  return d.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

// ---------- Datas ----------
export const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function isoData(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function dataDeIso(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function inicioDaAula(aula) {
  const [h, m] = aula.hora.split(':').map(Number);
  const d = dataDeIso(aula.data);
  d.setHours(h, m, 0, 0);
  return d;
}

export function formatarHora(hora) {
  const [h, m] = hora.split(':');
  return m === '00' ? `${Number(h)}h` : `${Number(h)}h${m}`;
}

export function horaFim(hora, minutos = 60) {
  const [h, m] = hora.split(':').map(Number);
  const t = h * 60 + m + minutos;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

export function dataExtensa(iso) {
  const d = dataDeIso(iso);
  return `${DIAS_LONGOS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
}

// ---------- Formulários ----------
// Validação no navegador: marca o campo com problema (aria-invalid), rola até ele e põe o cursor nele.
// nome = atributo name do campo. Num grupo de opções (sim/não), marca o grupo inteiro.
export function apontarCampo(form, nome) {
  if (!form) return;
  form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
  const el = nome && form.querySelector(`[name="${nome}"]`);
  if (!el) return;
  const grupo = el.type === 'radio' ? el.closest('.sim-nao') : null;
  const alvo = grupo || el;
  alvo.setAttribute('aria-invalid', 'true');
  // ao mexer no campo, o destaque some
  const limpar = () => alvo.removeAttribute('aria-invalid');
  (grupo || el).addEventListener(el.type === 'checkbox' || grupo ? 'change' : 'input', limpar, { once: true });
  el.focus({ preventScroll: true });
  alvo.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

export function idDaAula(data, hora, modalidade) {
  return `${data}_${hora}_${modalidade.toLowerCase()}`;
}
