// Cadastro de clientes: "Como nos conheceu?" e endereço (para nota fiscal e relatórios)
import { soDigitos } from './util.js';

export const COMO_CONHECEU = ['Instagram', 'Google', 'Indicação de alguém', 'Wellhub', 'Passou em frente', 'WhatsApp', 'Facebook', 'Evento ou parceria'];

export const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];

export const ENDERECO_VAZIO = { cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '' };

export const mascaraCep = (v) => soDigitos(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');

// Busca rua, bairro, cidade e UF pelo CEP (ViaCEP, gratuito).
// CEP inexistente: { erro: 'cep' }; sem conexão com o ViaCEP: { erro: 'rede' }.
export async function buscarCep(cep) {
  const c = soDigitos(cep);
  if (c.length !== 8) return null;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  try {
    const r = await fetch(`https://viacep.com.br/ws/${c}/json/`, { signal: ctrl.signal });
    const j = await r.json();
    if (j.erro) return { erro: 'cep' };
    return { endereco: j.logradouro || '', bairro: j.bairro || '', cidade: j.localidade || '', uf: j.uf || '' };
  } catch {
    return { erro: 'rede' };
  } finally {
    clearTimeout(t);
  }
}

// nome do primeiro campo do endereço com problema (para levar a pessoa até ele)
export function campoFaltandoNoEndereco(e) {
  const k = ['cep', 'endereco', 'numero', 'bairro', 'cidade', 'uf'].find((c) => !String(e[c] || '').trim());
  return k || (String(e.cep).replace(/\D/g, '').length !== 8 ? 'cep' : '');
}

// o que falta para o endereço ficar completo (mesma regra do servidor)
export function faltaNoEndereco(e) {
  const nomes = [['cep', 'CEP'], ['endereco', 'rua'], ['numero', 'número'], ['bairro', 'bairro'], ['cidade', 'cidade'], ['uf', 'UF']];
  const falta = nomes.filter(([k]) => !String(e[k] || '').trim()).map(([, t]) => t);
  if (falta.length) return `Complete o endereço: ${falta.join(', ')}.`;
  if (String(e.cep).replace(/\D/g, '').length !== 8) return 'O CEP tem 8 números.';
  return '';
}
