# Guia de design da bancada (revisão visual de out/2026)

Pedido do Fábio: **visual bonito e moderno, sem texto solto e longo**. Estas são as regras de toda tela da bancada.
Vale também para qualquer tela nova (padrão de entrega da Casa: bonito, organizado, funcional).

## 1. Princípios

1. **Menos texto, mais estrutura.** Cada tela se entende em 3 segundos: título, o que importa em destaque (números, nomes, horários), ações claras.
2. **Hierarquia.** Uma coisa principal por bloco (negrito, maior); o resto é apoio (cinza `--b-suave`, menor). Nada compete com o botão principal.
3. **Respiro.** Espaços da escala `--e-1…--e-5` (6/10/16/24/36 px). Nada colado.
4. **Consistência.** Mesmo problema, mesma peça: cabeçalho, seção, lista, aviso, vazio e carregando são sempre os mesmos componentes.
5. **Cor só informa.** Verde-tinta = estrutura; oliva = ok; terracota = ação/atenção da casa; caramelo = detalhe. Alerta (vermelho-terracota) só para o que exige atitude.
6. **Celular de verdade.** Conferir em 390, 820 e 1280 px, sem rolagem lateral, alvos de toque ≥ 40 px, campos 16 px.

## 2. Dieta de texto (a regra mais importante)

| Era | Vira |
|---|---|
| Parágrafo de 2–3 linhas sob o título da página | Subtítulo de **uma linha** (até ~70 caracteres) em `<Cabecalho>`; o resto em `ajuda=` (botão "?") |
| Frase explicativa solta acima de lista/formulário | `<Ajuda>` ao lado do título da seção, ou `<Aviso>` curto (só se for **ação** ou **alerta**) |
| Nota de rodapé ("Para remarcar, arraste…") | Dica dentro do `<Ajuda>` do cabeçalho ou título (`title=`) no elemento; nunca rodapé solto |
| "Horários bloqueados hoje: A (…) · B (…)" corrido | Lista curta em cartão/chips, ou `<Aviso tom="aviso">` com contagem e detalhe no toque |
| Link sublinhado "editar", "+ pacote ou combo", "ver" | Botão `botao botao--fantasma botao--p` (ou ícone com `aria-label`) |
| Texto de explicação dentro de modal | 1 linha acima do campo (`.b-suave`) ou `<Ajuda>` no rótulo |
| Estado vazio "Nenhum item" seco | `<Vazio titulo="…" acao={<botão>}>` com a próxima ação |

Regras de redação: frases curtas, verbo no começo dos botões ("Salvar", "Agendar"), sem ponto final em rótulo e botão, sem jargão, **textos valem para qualquer gênero** (nada só no feminino), números e moeda sempre por `real()`, datas por `dataBR()`/`dataCurta()`.
Nunca cortar informação que a equipe usa: o que sai da tela vai para `ajuda` ou detalhe ao toque, **não some**.

## 3. Peças prontas (`src/bancada/ui.jsx` e `src/bancada/css/base.css`)

- `<Cabecalho titulo acoes ajuda>children = 1 linha</Cabecalho>` — título da página.
- `<Ajuda titulo>texto</Ajuda>` — botão "?" com cartãozinho (no celular abre na base da tela).
- `<Aviso tom="info|ok|aviso|alerta" titulo acao>texto curto</Aviso>`.
- `<Secao titulo ajuda acoes>…</Secao>` — bloco com título em Plex Sans, ações à direita.
- `<Vazio titulo acao>`, `<Esqueleto linhas />` (carregando: use no lugar do círculo girando em listas e cartões; `Carregando` continua para telas inteiras).
- `<Kpi rotulo valor detalhe tom>` dentro de `.b-kpis`; `<Tag tom>`; `<Abas>`/`<Segmento>`; `<Modal>` (folha lateral).
- Classes: `.b-cartao`, `.b-itens` + `.b-item` (`.b-item__corpo`, `.b-item__titulo`, `.b-item__lado`) para listas; `.b-meta` (info miúda separada por ponto); `.b-icone-chip`; `.b-grade-cartoes`; `.b-barra-fixa` (filtros que acompanham a rolagem); `.botao--fantasma`.
- Tokens: `--r-p/m/g` (cantos), `--sombra-1/2`, `--e-1…5` (espaços), cores `--b-*` (veja `bancada.css`), `--b-foco` / `--b-foco-escuro` (anel de foco).
- Peças de teclado e leitor de tela (ui.jsx): `useCamada(ref, { foco, ehTopo })` (guarda quem tinha o foco e devolve ao fechar, puxa o foco de volta se escapar, trava a rolagem do fundo), `prenderTab(e, raiz)` (Tab não sai da camada), `focaveisEm(raiz)`, `travarRolagem()`/`soltarRolagem()` (contador: busca e folha podem abrir juntas), classe `.b-so-leitor` (texto só para leitor de tela) e `<SeletorMes className="b-mes--cheio">` (ocupa a largura no celular).

## 3.1 Acessibilidade (regras de toda tela e de toda peça nova)

- **Foco visível**: o anel único está em `css/base.css` (`:focus-visible`, `--b-foco`, 9:1 no papel; claro no fundo verde). Não escreva `outline: none` em componente novo: se precisar de outro destaque, some a ele, nunca tire o anel.
- **Camadas** (`Modal`, `Busca`, gaveta do menu): `role="dialog"` + `aria-modal` + nome (`aria-labelledby`), foco inicial dentro, Tab preso, Esc fecha só a de cima, foco volta ao botão que abriu. Camada nova: use `useCamada` + `prenderTab`.
- **Abas e segmentos** (`Abas`, `Segmento`): `role=tablist`, só a aba atual entra no Tab, setas/Home/End trocam. Passe `rotulo` quando houver mais de um conjunto de abas na página.
- **Avisos**: `alerta` = `role="alert"`, `ok` = `status`, `info`/`aviso` = `note`; o tom também vai por escrito ao leitor de tela (cor nunca é a única pista). `Tag` sempre leva texto.
- **Botão que espera o servidor** (`BotaoAcao`): `aria-busy`, "Aguarde" ao leitor e o erro aparece em `role="alert"`.
- **Menu "Mais"** (`MenuMais`): abre com Enter/↓, setas navegam, Esc fecha e devolve o foco.
- **Casca** (`Bancada.jsx`): botão "Ir para o conteúdo" (primeiro Tab), `<main id="conteudo">`, título da aba do navegador por tela, foco vai para o conteúdo ao trocar de tela, topo do celular é `<header>`, gaveta do menu com foco/Tab/Esc.
- **Campos**: rótulo ligado ao campo (`<label>` envolvendo, ou `aria-label` quando só há ícone/valor), 16 px e 44 px de altura no celular (a regra de 16 px já vale para todo `input`/`select`/`textarea` até 900 px), alvos de toque de 40 px ou mais (o "?" tem área de 42 px).
- **Contraste**: texto pequeno AA (4,5:1). Cores de apoio já aprovadas: `--b-suave #6A6C56` (e `#535647` onde a leitura é longa), tags e avisos `--b-*-tinta`, placeholder `#6F715F`. Texto claro sobre caramelo só com `#86653F` ou mais escuro.
- **Movimento**: `prefers-reduced-motion` corta animações e transições em toda a bancada (base.css). Animação nova não precisa de regra própria.
- **Impressão**: `.b-pular` e `.b-so-leitor` não saem no papel; as regras de `#vale-impressao`, `.ag-impressao` e `.rel-tela` dependem de `body:has(...)`: não crie elemento filho direto do `body` sem conferir a impressão.
- Conferir uma tela nova: `node testes/tela.cjs ...` para as fotos e `axe-core` no Playwright (`npm i --no-save axe-core`, `bypassCSP: true`) nas rotas.

## 4. Tipografia

Títulos de **página e janela**: Italiana (já feito pelo `.b-titulo` e `.b-modal__titulo`). Títulos de seção/cartão: IBM Plex Sans 600 (17–18 px). Texto: Plex Sans 15 px; apoio 13–14 px (**nada abaixo de 13 px**). Números e horas: Plex Sans semibold. Rótulos em caixa normal (nada de MAIÚSCULAS espaçadas).

## 5. Como trabalhar numa tela

1. Veja a tela antes (foto) e liste: texto solto, hierarquia fraca, link sublinhado, tabela crua, vazio seco, aperto no celular.
2. Refaça **só a apresentação**: JSX e CSS. **Não mude comportamento, dados, nomes de ações da API, chaves de memória, regras de negócio nem o backend (`apps-script/`).**
3. Estilos novos vão em `src/bancada/css/<area>.css`, importado no topo do `.jsx` da tela (`import './css/agenda.css';`). Esse arquivo carrega **depois** de `bancada.css` e `base.css`, então ganha de regras antigas de mesma especificidade. Ao substituir uma regra antiga por completo, apague-a de `bancada.css` (só se tiver certeza de que ninguém mais usa a classe: `grep -rn "classe" src`).
4. `ui.jsx`, `css/base.css`, `css/shell.css`, `bancada.css` e `Bancada.jsx` são compartilhados: só quem cuida da estrutura edita. Precisa de algo novo e genérico? Faça local na sua tela e avise.
5. Rode `npm run lint` e `npm run build`. Rode `npm run teste` se mexeu em algo que o teste toca (só front-end: não precisa).
6. Fotos: `node testes/tela.cjs --url <vite> --papel admin --rotas a,b --larg 390,820,1280 --saida <pasta> --abas` (veja o cabeçalho do arquivo). Confira **todas** as abas, o estado vazio e pelo menos uma janela (modal/folha) por tela.
7. Texto de tela que a equipe usa todo dia (Agenda, Comandas, Hoje) deve ficar **mais rápido de ler**, nunca mais escondido.

## 6. Pronto quando

- Nenhum parágrafo de mais de 2 linhas solto na tela; subtítulo de 1 linha; explicações em "?".
- Nenhum link sublinhado de ação; botões coerentes (principal cheio, secundário contorno, fantasma na lista).
- Lista/tabela com hierarquia e, no celular, em cartões legíveis; estado vazio com próxima ação; carregamento com esqueleto onde fizer sentido.
- 390/820/1280 px sem rolagem lateral e sem texto cortado onde importa.
- Lint e build sem erros.
