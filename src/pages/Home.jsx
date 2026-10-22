import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo, Sol, Forma, Monograma, Seta, IconeInstagram, IconeWhatsapp, IconeEmail, img } from '../components/Marca.jsx';
import { CONFIG, CUIDADOS, GRADE, PRECOS_AULAS } from '../config.js';
import { DIAS_CURTOS, formatarHora } from '../lib/util.js';

function useRevelar() {
  useEffect(() => {
    const els = document.querySelectorAll('.revelar');
    if (!('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('visivel'));
      return;
    }
    const io = new IntersectionObserver(
      (entradas) =>
        entradas.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('visivel');
            io.unobserve(en.target);
          }
        }),
      { threshold: 0.15 }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

// Nossa equipe: foto = nome do arquivo em public/img/equipe (sem foto, aparece a inicial)
const EQUIPE = [
  { nome: 'Ana Paula', funcao: 'Yoga', quando: 'seg, qua e sex · manhãs e sáb', foto: 'ana-paula', forma: 'equilibrio', cor: 'var(--oliva)' },
  { nome: 'Hanna', funcao: 'Yoga', quando: 'seg e qua · 18h30', forma: 'sutileza', cor: 'var(--oliva)' },
  { nome: 'Kalliny', funcao: 'Pilates', quando: 'seg a sex · 6h às 10h', forma: 'presenca', cor: 'var(--terracota)' },
  { nome: 'Sara', funcao: 'Pilates', quando: 'seg a sex · 16h às 20h', forma: 'equilibrio', cor: 'var(--terracota)' },
  { nome: 'Marylia', funcao: 'Estética', foto: 'marylia', forma: 'sutileza', cor: 'var(--caramelo-escuro)' },
  { nome: 'Sarah', funcao: 'Recepção', foto: 'sarah', forma: 'presenca', cor: 'var(--verde)' },
  { nome: 'Jainara', funcao: 'Recepção', foto: 'jainara', forma: 'equilibrio', cor: 'var(--verde)' },
];

export default function Home() {
  useRevelar();
  useEffect(() => {
    const alvo = sessionStorage.getItem('ambar_rolar');
    if (alvo) {
      sessionStorage.removeItem('ambar_rolar');
      setTimeout(() => document.getElementById(alvo)?.scrollIntoView({ behavior: 'smooth' }), 120);
    }
  }, []);

  const yoga = GRADE.filter((g) => g.modalidade === 'Yoga');
  const horariosYoga = [...new Set(yoga.map((g) => g.hora))].sort();
  const diasYoga = [...new Set(yoga.map((g) => g.dia))].sort();
  // versão para celular: um item por horário + professora, com os dias juntos
  const listaYoga = [];
  horariosYoga.forEach((h) => {
    const porProf = {};
    yoga.filter((g) => g.hora === h).sort((a, b) => a.dia - b.dia).forEach((g) => {
      (porProf[g.professor] = porProf[g.professor] || []).push(DIAS_CURTOS[g.dia]);
    });
    Object.entries(porProf).forEach(([prof, dias]) => listaYoga.push({ h, prof, dias }));
  });

  return (
    <main>
      {/* ---------- HERO ---------- */}
      <section className="hero">
        <img className="hero__foto" src={img('yoga.jpg')} alt="" aria-hidden="true" />
        <div className="hero__veu" />
        <div className="hero__conteudo">
          <Sol tamanho={40} className="hero__sol" />
          <Logo variante="creme" largura={230} className="hero__logo" />
          <p className="script hero__frase">harmonia em estado natural</p>
          <p className="rotulo hero__desde">desde 26</p>
          <div className="hero__botoes">
            <Link to="/entrar" className="botao botao--ambar">Reservar minha aula</Link>
            <a href="#conceito" className="botao botao--linha-clara" onClick={(e) => { e.preventDefault(); document.getElementById('conceito').scrollIntoView({ behavior: 'smooth' }); }}>
              Conhecer a casa
            </a>
          </div>
        </div>
        <Seta className="hero__seta" />
      </section>

      {/* ---------- CONCEITO ---------- */}
      <section id="conceito" className="secao secao--terracota">
        <div className="largura conceito">
          <div className="conceito__lado revelar">
            <h2 className="rotulo-espacado">Conceito</h2>
            <Sol tamanho={46} />
          </div>
          <div className="conceito__texto revelar">
            <p>
              A <strong>Casa Âmbar</strong> nasce como um espaço de pausa que não exige silêncio absoluto nem transformação radical.
              É um lugar onde <strong>corpo e mente encontram ritmo, não pressão</strong>.
            </p>
            <p>
              Assim como o <strong>âmbar</strong> não é uma pedra formada de imediato, mas resultado do tempo, da resina e da espera,
              a Casa Âmbar entende o cuidado como um <strong>processo orgânico</strong>. Nada apressado, nada imposto.
            </p>
          </div>
        </div>
      </section>

      {/* ---------- PILARES ---------- */}
      <section className="secao secao--papel">
        <div className="largura pilares">
          <Sol tamanho={36} className="cor-caramelo" />
          <ul>
            {[
              ['presenca', 'Presença'],
              ['equilibrio', 'Equilíbrio'],
              ['sutileza', 'Sutileza'],
            ].map(([f, t], i) => (
              <li key={f} className="revelar" style={{ transitionDelay: `${i * 120}ms` }}>
                <Forma nome={f} tamanho={92} cor="var(--terracota)" />
                <span className="rotulo-espacado cor-terracota">{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- MOVIMENTO ---------- */}
      <section id="movimento" className="secao secao--verde movimento">
        <div className="largura">
          <div className="movimento__titulo revelar">
            <span className="movimento__e" aria-hidden="true">&amp;</span>
            <h2 className="display">
              Movi<br />mento<br />fluidez
            </h2>
            <p className="movimento__lead">
              Yoga e Pilates em turmas pequenas. Reserve pelo celular, escolha o número do seu tapete
              e faça o check-in quando chegar.
            </p>
            <Link to="/entrar" className="botao botao--ambar">Reservar aula</Link>
          </div>

          <div className="movimento__grid">
            <article className="cartao-aula revelar">
              <header>
                <h3 className="display-p">Yoga</h3>
                <span className="rotulo">12 tapetes</span>
              </header>
              <div className="tabela-rolagem">
                <table className="grade">
                  <thead>
                    <tr>
                      <th scope="col">Hora</th>
                      {diasYoga.map((d) => <th key={d} scope="col">{DIAS_CURTOS[d]}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {horariosYoga.map((h) => (
                      <tr key={h}>
                        <th scope="row">{formatarHora(h)}</th>
                        {diasYoga.map((d) => {
                          const g = yoga.find((x) => x.dia === d && x.hora === h);
                          return <td key={d}>{g ? g.professor : <span className="vazio">·</span>}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="grade-lista">
                {listaYoga.map((x) => (
                  <li key={x.h + x.prof}>
                    <strong>{formatarHora(x.h)}</strong>
                    <span className="grade-lista__dias">{x.dias.join(' · ')}</span>
                    <span className="grade-lista__prof">{x.prof}</span>
                  </li>
                ))}
              </ul>
              <Precos lista={PRECOS_AULAS.Yoga} />
            </article>

            <article className="cartao-aula revelar">
              <header>
                <h3 className="display-p">Pilates</h3>
                <span className="rotulo">seg a sex</span>
              </header>
              <div className="pilates-horas">
                <div>
                  <span className="rotulo">Manhã · com Kalliny</span>
                  <p>6h · 7h · 8h · 9h</p>
                </div>
                <div>
                  <span className="rotulo">Tarde · com Sara</span>
                  <p>16h · 17h · 18h · 19h</p>
                </div>
              </div>
              <Precos lista={PRECOS_AULAS.Pilates} />
            </article>
          </div>
          <p className="nota-plano">Planos trimestrais com valor reduzido. Consulte na recepção.</p>

          <ol className="como">
            {[
              ['Crie sua conta', 'Com CPF e senha, e uma ficha de saúde rápida para quem dá a aula te conhecer.'],
              ['Escolha aula e tapete', 'Veja horários, quem conduz a aula e as vagas livres. No Yoga, escolha o número do seu tapete.'],
              ['Faça o check-in', 'Ao chegar, confirme sua presença pelo celular. Seu tapete estará te esperando.'],
            ].map(([t, d], i) => (
              <li key={t} className="revelar" style={{ transitionDelay: `${i * 120}ms` }}>
                <span className="como__num">0{i + 1}</span>
                <strong>{t}</strong>
                <p>{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- EQUIPE ---------- */}
      <section className="secao secao--papel equipe">
        <div className="largura">
          <div className="equipe__cabeca revelar">
            <span className="rotulo-espacado cor-terracota">Quem cuida de você</span>
            <h2 className="display-m">Nossa equipe</h2>
          </div>
          <ul className="equipe__lista">
            {EQUIPE.map(({ nome, funcao, quando, foto, forma, cor }, i) => (
              <li key={nome} className="prof revelar" style={{ transitionDelay: `${(i % 4) * 100}ms` }}>
                <div className={'prof__selo' + (foto ? ' prof__selo--foto' : '')} style={{ '--cor': cor }}>
                  {foto ? (
                    <img src={img(`equipe/${foto}.jpg`)} srcSet={`${img(`equipe/${foto}-360.jpg`)} 360w, ${img(`equipe/${foto}.jpg`)} 600w`}
                      sizes="(max-width: 700px) 45vw, 25vw" width="600" height="800" alt={`${nome}, ${funcao}`} loading="lazy" decoding="async" />
                  ) : (
                    <span className="prof__inicial">{nome[0]}</span>
                  )}
                  <Forma nome={forma} tamanho={34} cor="var(--creme)" className="prof__forma" />
                </div>
                <strong className="display-p">{nome}</strong>
                <span className="rotulo" style={{ color: cor }}>{funcao}</span>
                {quando && <span className="prof__quando">{quando}</span>}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------- MANIFESTO ---------- */}
      <section className="secao secao--caramelo manifesto">
        <Sol tamanho={40} className="cor-creme" />
        <p className="display manifesto__texto revelar">Cuidado que<br />permanece</p>
        <figure className="manifesto__foto revelar">
          <img src={img('equipe.jpg')} srcSet={`${img('equipe-900.jpg')} 900w, ${img('equipe.jpg')} 1460w`} sizes="(max-width: 1100px) 92vw, 1000px"
            width="1460" height="1070" alt="A equipe da Casa Âmbar reunida na entrada da casa" loading="lazy" decoding="async" />
          <figcaption className="rotulo-espacado">A equipe da Casa Âmbar</figcaption>
        </figure>
      </section>

      {/* ---------- CUIDADOS ---------- */}
      <section id="cuidados" className="secao secao--papel">
        <div className="largura cuidados">
          <div className="cuidados__intro revelar">
            <Monograma tamanho={150} cor="var(--oliva)" />
            <h2 className="display-m">Rituais de cuidado</h2>
            <p>Estética facial, corporal, capilar e fisioterapia. Agende pelo WhatsApp e a nossa equipe encontra o melhor horário para você.</p>
            <a className="botao" href={`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Olá! Quero agendar um cuidado na Casa Âmbar.')}`} target="_blank" rel="noreferrer">
              <IconeWhatsapp /> Agendar pelo WhatsApp
            </a>
          </div>
          <div className="cuidados__lista">
            {CUIDADOS.map((c) => (
              <details key={c.titulo} className="ritual revelar">
                <summary>
                  <span className="display-p">{c.titulo}</span>
                  <span className="ritual__mais" aria-hidden="true" />
                </summary>
                <ul>
                  {c.itens.map(([nome, tempo, preco]) => (
                    <li key={nome}>
                      <span>{nome}</span>
                      <span className="ritual__tempo">{tempo}</span>
                      <span className="ritual__preco">{preco}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- A CASA ---------- */}
      <section className="secao secao--creme casa">
        <div className="largura casa__grid">
          <figure className="casa__foto revelar">
            <img src={img('fachada.jpg')} alt="Fachada amarela da Casa Âmbar, com a placa oval na entrada" loading="lazy" />
          </figure>
          <div className="casa__texto revelar">
            <span className="rotulo-espacado cor-terracota">Crescimento contínuo e presença viva</span>
            <h2 className="display-m">Uma casa na Aldeota para desacelerar</h2>
            <p>{CONFIG.endereco}</p>
            {CONFIG.horario && <p>{CONFIG.horario}</p>}
            <p><a className="com-icone" href={`https://wa.me/${CONFIG.whatsapp}`} target="_blank" rel="noreferrer"><IconeWhatsapp /> {CONFIG.telefone}</a></p>
            <p><a className="com-icone" href={`mailto:${CONFIG.email}`}><IconeEmail /> {CONFIG.email}</a></p>
            <div className="casa__botoes">
              <a className="botao" href={CONFIG.mapa} target="_blank" rel="noreferrer">Como chegar</a>
              <a className="botao botao--linha" href={`https://instagram.com/${CONFIG.instagram}`} target="_blank" rel="noreferrer"><IconeInstagram /> @{CONFIG.instagram}</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Precos({ lista }) {
  return (
    <ul className="precos">
      {lista.map(([n, v]) => (
        <li key={n}>
          <span>{n}</span>
          <span className="precos__linha" aria-hidden="true" />
          <strong>{v}</strong>
        </li>
      ))}
    </ul>
  );
}
