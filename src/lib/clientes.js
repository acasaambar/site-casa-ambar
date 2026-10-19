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
