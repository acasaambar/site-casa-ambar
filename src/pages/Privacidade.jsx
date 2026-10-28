import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CONFIG } from '../config.js';
import { POLITICA_DATA } from '../lib/privacidade.js';
import { rolagemSuave } from '../lib/movimento.js';

// Política de Privacidade da Casa Âmbar (LGPD, Lei 13.709/2018).
// Escrita em linguagem simples e conferida com o que o sistema realmente coleta e faz.
// Mudou o texto? Atualize a versão em src/lib/privacidade.js e em apps-script/Codigo.gs.

const SECOES = [
  { id: 'quem', titulo: 'Quem cuida dos seus dados' },
  { id: 'dados', titulo: 'Quais dados coletamos e para quê' },
  { id: 'saude', titulo: 'Dados de saúde e imagens' },
  { id: 'compartilhamos', titulo: 'Com quem compartilhamos' },
  { id: 'base', titulo: 'Por que podemos usar seus dados' },
  { id: 'tempo', titulo: 'Por quanto tempo guardamos' },
  { id: 'seguranca', titulo: 'Como protegemos' },
  { id: 'direitos', titulo: 'Seus direitos e como exercê-los' },
  { id: 'menores', titulo: 'Menores de 18 anos' },
  { id: 'mudancas', titulo: 'Mudanças nesta política' },
];

function irPara(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: rolagemSuave(), block: 'start' });
  el.focus({ preventScroll: true });
}

export default function Privacidade() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <main className="privacidade">
      <header className="privacidade__topo">
        <p className="rotulo">Casa Âmbar</p>
        <h1 className="display-m">Política de Privacidade</h1>
        <p className="privacidade__data">Atualizada em {POLITICA_DATA}</p>
      </header>

      <section className="privacidade__resumo" aria-labelledby="resumo-titulo">
        <h2 id="resumo-titulo" className="display-p">Em poucas palavras</h2>
        <ul>
          <li>Pedimos só o que precisamos para cuidar de você: reservar aulas, receber, falar com você e manter sua segurança nas práticas.</li>
          <li>Seus dados de saúde são usados apenas para a sua segurança e só quem precisa deles na equipe tem acesso.</li>
          <li>Não vendemos nem alugamos seus dados.</li>
          <li>Você pode ver, corrigir e pedir a exclusão dos seus dados quando quiser. Basta falar com a gente.</li>
        </ul>
      </section>

      <nav className="privacidade__indice" aria-labelledby="indice-titulo">
        <h2 id="indice-titulo" className="rotulo">Nesta página</h2>
        <ol>
          {SECOES.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => irPara(s.id)}>{s.titulo}</button>
            </li>
          ))}
        </ol>
      </nav>

      <article className="privacidade__texto">
        <section id="quem" tabIndex={-1}>
          <h2 className="display-p">1. Quem cuida dos seus dados</h2>
          <p>
            A <strong>Casa Âmbar</strong> (Rua Eduardo Salgado, 448, Aldeota, Fortaleza) é quem decide como os seus dados são usados:
            na lei, a “controladora”. Esta política vale para o nosso site, a área do aluno e o atendimento na casa
            (yoga, pilates, estética e fisioterapia).
          </p>
          <p>
            Para qualquer assunto de privacidade, fale com a gente por <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a> ou
            pelo WhatsApp <a href={`https://wa.me/${CONFIG.whatsapp}`} target="_blank" rel="noreferrer">{CONFIG.telefone}</a>.
          </p>
        </section>

        <section id="dados" tabIndex={-1}>
          <h2 className="display-p">2. Quais dados coletamos e para quê</h2>
          <dl className="privacidade__lista">
            <div>
              <dt>Cadastro</dt>
              <dd>
                Nome, CPF, WhatsApp, e-mail, endereço (CEP, rua, número, complemento, bairro, cidade e estado), como nos conheceu
                e senha. Usamos para criar e manter a sua conta, reservar aulas, falar com você e emitir cobranças e recibos.
                A senha é guardada de forma embaralhada: nem a equipe consegue lê-la.
              </dd>
            </div>
            <div>
              <dt>Data de nascimento e contato de emergência</dt>
              <dd>Para identificar você no contrato e na ficha de saúde e para avisar alguém de confiança se houver uma emergência durante a prática.</dd>
            </div>
            <div>
              <dt>Reservas, presença e planos</dt>
              <dd>Aulas reservadas, check-in, cancelamentos, lista de espera, planos e créditos. Usamos para organizar as turmas e as suas aulas.</dd>
            </div>
            <div>
              <dt>Pagamentos</dt>
              <dd>
                Valor, data, forma de pagamento, bandeira e parcelas. <strong>Não guardamos o número do seu cartão</strong>: o pagamento
                é feito pela InfinitePay (link de pagamento ou maquininha) e os dados do cartão ficam com ela.
              </dd>
            </div>
            <div>
              <dt>Contrato dos planos</dt>
              <dd>
                O texto que você aceitou, a versão, a data e a hora, o nome digitado, a assinatura desenhada, a sua escolha sobre o uso de
                imagem e a cópia em PDF, guardada em pasta privada. Servem como prova do que foi combinado.
              </dd>
            </div>
            <div>
              <dt>Mensagens</dt>
              <dd>
                Lembretes de aula e de atendimento, links para confirmar horário, avisos de vaga na lista de espera, recuperação de senha
                e recibos, por e-mail e WhatsApp. Novidades e promoções também chegam por e-mail e WhatsApp, e você pode parar de recebê-las
                a qualquer momento, em “Minha conta” ou pelo link no fim de cada e-mail.
              </dd>
            </div>
            <div>
              <dt>Segurança da sua conta</dt>
              <dd>
                Registros técnicos mínimos, como tentativas de acesso e data e hora de ações importantes, para proteger a sua conta e
                prevenir fraudes. A equipe da Casa também deixa registrado quem consultou dados sensíveis.
              </dd>
            </div>
            <div>
              <dt>No navegador</dt>
              <dd>
                Guardamos no seu aparelho apenas o necessário para você continuar com a sessão aberta. Não usamos cookies de publicidade.
                Medimos as visitas do site com o Cloudflare Web Analytics, que não usa cookies e não identifica você. No cadastro e em
                “Esqueci minha senha”, o Cloudflare Turnstile confirma que você não é um robô. Ao digitar o CEP, consultamos o serviço ViaCEP
                (enviamos só o CEP).
              </dd>
            </div>
          </dl>
        </section>

        <section id="saude" tabIndex={-1}>
          <h2 className="display-p">3. Dados de saúde e imagens</h2>
          <p>
            A <strong>ficha de saúde</strong> (questionário de prontidão para atividade física, condições de saúde, medicamentos, alergias,
            gestação, cirurgias e lesões, plano de saúde) é um dado sensível. Só pedimos com o seu consentimento, usamos apenas para a sua
            segurança durante as práticas e deixamos o acesso restrito à equipe que precisa dele. Você pode retirar o consentimento quando
            quiser.
          </p>
          <p>
            Nos atendimentos de estética e fisioterapia, a profissional também pode registrar fichas, anotações de evolução e fotos do
            tratamento. Esses registros são feitos com a sua autorização, servem para acompanhar o seu cuidado e ficam em pastas privadas.
            Fotos suas só são usadas em divulgação se você autorizar o uso de imagem no contrato.
          </p>
        </section>

        <section id="compartilhamos" tabIndex={-1}>
          <h2 className="display-p">4. Com quem compartilhamos</h2>
          <p>Não vendemos seus dados. Compartilhamos só o necessário com quem nos ajuda a prestar o serviço:</p>
          <ul>
            <li><strong>Google</strong> (Planilhas, Drive e envio de e-mails): onde guardamos o cadastro, os registros e os PDFs, com acesso restrito.</li>
            <li><strong>InfinitePay</strong>: recebe os dados necessários para processar o seu pagamento.</li>
            <li><strong>Cloudflare</strong>: verificação “não sou robô” e medição de visitas, sem cookies.</li>
            <li><strong>GitHub</strong>: hospeda as páginas do site; não recebe os dados do seu cadastro.</li>
            <li><strong>WhatsApp</strong>: quando conversamos por lá, vale também a política do próprio WhatsApp.</li>
            <li><strong>Profissionais e equipe da Casa</strong>: veem apenas o que precisam para atender você.</li>
            <li><strong>Autoridades</strong>: quando a lei ou uma ordem judicial exigir.</li>
          </ul>
          <p>
            Alguns desses fornecedores têm servidores fora do Brasil. Nesses casos, seus dados são tratados conforme as regras de proteção
            de dados desses fornecedores e a LGPD.
          </p>
        </section>

        <section id="base" tabIndex={-1}>
          <h2 className="display-p">5. Por que podemos usar seus dados</h2>
          <ul>
            <li><strong>Para cumprir o que combinamos com você</strong>: cadastro, reservas, planos, pagamentos e contrato.</li>
            <li><strong>Com o seu consentimento</strong>: dados de saúde, fotos e uso de imagem, e novidades e promoções.</li>
            <li><strong>Para cumprir a lei</strong>: por exemplo, guardar registros financeiros e fiscais.</li>
            <li><strong>Para nos proteger e proteger você</strong>: segurança da conta, prevenção de fraudes e defesa em eventuais disputas.</li>
            <li><strong>Para proteger a sua vida ou saúde</strong>: se houver uma emergência durante a prática.</li>
          </ul>
        </section>

        <section id="tempo" tabIndex={-1}>
          <h2 className="display-p">6. Por quanto tempo guardamos</h2>
          <p>
            Guardamos seus dados enquanto você for cliente da Casa e pelo tempo necessário para cumprir as finalidades desta política e as
            obrigações legais, como as fiscais e contábeis. Depois disso, apagamos ou anonimizamos os dados que não precisamos mais guardar.
          </p>
        </section>

        <section id="seguranca" tabIndex={-1}>
          <h2 className="display-p">7. Como protegemos</h2>
          <ul>
            <li>Conexão protegida (HTTPS) e senhas guardadas de forma embaralhada.</li>
            <li>Cada pessoa da equipe acessa só o que o seu papel permite, e as sessões expiram sozinhas.</li>
            <li>Planilhas e pastas com dados de saúde e fotos ficam com acesso restrito.</li>
            <li>Limites de tentativas de acesso e confirmação “não sou robô” no cadastro.</li>
          </ul>
          <p>
            Nenhum sistema é totalmente imune a falhas. Se acontecer um incidente que possa trazer risco a você, avisaremos você e a
            Autoridade Nacional de Proteção de Dados (ANPD), como a lei determina.
          </p>
        </section>

        <section id="direitos" tabIndex={-1}>
          <h2 className="display-p">8. Seus direitos e como exercê-los</h2>
          <p>A LGPD garante a você, a qualquer momento:</p>
          <ul>
            <li>saber se tratamos seus dados e ter acesso a eles;</li>
            <li>corrigir dados incompletos ou desatualizados (você mesmo pode fazer isso em “Minha conta”);</li>
            <li>pedir a anonimização, o bloqueio ou a exclusão de dados desnecessários ou tratados em desacordo com a lei;</li>
            <li>pedir a portabilidade dos seus dados;</li>
            <li>saber com quem compartilhamos seus dados;</li>
            <li>retirar um consentimento (por exemplo, parar de receber novidades) e se opor a um uso;</li>
            <li>pedir a revisão de decisões tomadas só por sistemas automáticos (não tomamos decisões assim).</li>
          </ul>
          <p>
            Para pedir qualquer uma dessas coisas, escreva para <a href={`mailto:${CONFIG.email}`}>{CONFIG.email}</a> ou chame no WhatsApp{' '}
            <a href={`https://wa.me/${CONFIG.whatsapp}`} target="_blank" rel="noreferrer">{CONFIG.telefone}</a>. Respondemos em até 15 dias.
            Ao pedir a exclusão, removemos ou anonimizamos seus dados, e guardamos só o que a lei obriga (como registros financeiros), sem
            identificar você sempre que possível. Se a resposta não resolver, você também pode recorrer à ANPD (gov.br/anpd).
          </p>
        </section>

        <section id="menores" tabIndex={-1}>
          <h2 className="display-p">9. Menores de 18 anos</h2>
          <p>O cadastro de pessoas menores de 18 anos deve ser feito e acompanhado pelo responsável legal, que responde pelo consentimento.</p>
        </section>

        <section id="mudancas" tabIndex={-1}>
          <h2 className="display-p">10. Mudanças nesta política</h2>
          <p>
            Podemos atualizar este texto. A data no topo mostra a versão em vigor, e quando a mudança for importante avisaremos no site.
            A versão que você aceitou no cadastro fica registrada.
          </p>
        </section>
      </article>

      <p className="privacidade__voltar"><Link to="/" className="botao botao--linha">Voltar ao início</Link></p>
    </main>
  );
}
