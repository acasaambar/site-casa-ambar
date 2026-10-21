# Casa Âmbar — instruções para o Claude

Site e sistema da **Casa Âmbar** (Rua Eduardo Salgado, 448, Aldeota, Fortaleza): yoga, pilates, estética e fisioterapia.
No ar em **https://www.acasambar.com.br** (GitHub Pages) e bancada interna da equipe em **/#/bancada**.

## Quem pede e como responder

- O dono do projeto é o Fábio. Ele está começando em programação e chegou ao projeto como "vibe coder".
- Responda sempre em **português do Brasil**, de forma **objetiva e direta**.
- Textos do sistema (telas e e-mails) valem para homens e mulheres: nada só no feminino ("Boas-vindas", "quem dá a aula", "Clientes", "Profissional"). Se não der para neutralizar, use a forma genérica ("Área do aluno").
- Quando houver código para ele usar, entregue **completo e pronto**, nunca trechos soltos para encaixar.
- Faça as mudanças você mesmo, teste, publique (commit + push) e explique **o que mudou** em poucas linhas, sem jargão.
- Quando ele precisar fazer algo fora do código (Google, GitHub, InfinitePay), dê o passo a passo numerado.

## Como o projeto funciona

| Parte | Onde | Observação |
|---|---|---|
| Site (React 19 + Vite) | `src/` | HashRouter. Fontes: Italiana (títulos), IBM Plex Mono (texto do site), IBM Plex Sans (texto da bancada), Pinyon Script (detalhe). |
| Área do aluno | `src/pages/` | Só **Yoga e Pilates**: reserva com escolha de tapete, check-in, planos, Wellhub, ficha de saúde, **Minha conta** (`MinhaConta.jsx`). Cadastro exige endereço (`EnderecoSite.jsx`). |
| Bancada interna | `src/bancada/` | Carregada à parte (lazy). Papéis: `admin`, `recepcao`, `professora` (também cobre profissional de estética/fisio). |
| Backend | `apps-script/*.gs` | Google Apps Script + Google Sheets (a planilha é o banco). Um único `doPost`; ações da bancada começam com `b_`. |
| Configuração do site | `src/config.js` | URL da API, WhatsApp, e-mail. `VITE_API_URL` troca a API (para testes locais). |

Arquivos do backend:
- `Codigo.gs`: núcleo. Abas (`ABAS`), planilha, alunos, aulas, reservas, pagamentos InfinitePay, utilidades (`lerAba`, `valoresAba`, `adicionarLinha(s)`, `atualizarLinha`, `seguro`, `novoNsu`, `esperarTrava`).
- `Seguranca.gs`: senhas, links de senha, limites de tentativas, e-mail com a marca, `autorizarEmails()`.
- `Bancada.gs`: login da equipe, `PERMISSOES` (lista do que cada papel pode), agenda, clientes, vendas, vales, cupons, ajustes.
- `Servicos.gs`: catálogo de serviços e pacotes, profissionais (com os serviços que cada uma faz, comissão e tempo próprios), horários livres, agendamento de serviços.
- `Gestao.gs`: produtos e estoque, comandas, comissões, despesas, financeiro, caixa do dia, bloqueio de horário (folgas).
- `Clientes.gs`: cliente sem CPF (código interno de 15 dígitos começando com 9), importação de CSV, ficha de estética, evolução com fotos (Drive), histórico, endereço (`exigirEndereco`, `salvarEndereco` do site), **Clientes** da profissional e **anamnese da profissional** (aba `AnamnesesProf`; texto > 44 mil caracteres vai para arquivo no Drive) e comandas da cliente.
- `Marketing.gs`: promoções automáticas, campanhas (e-mail e WhatsApp) com descadastro, lembretes da véspera.
- `Vales.gs`: cupons, vales-presente e `calcularPreco` (promoção × cupom: vale o maior; o vale entra depois). Vale-presente é **sempre vendido** (decisão do dono, não há vale de cortesia): nasce só como item da comanda (`tipo: 'vale'`, Vales.origem = `vendido`, Vales.comanda); fica em **Vendas → Vales-presente** (não no Marketing): "Vender vale-presente" abre a comanda já na venda do vale. Para **usar** um vale: na comanda (forma "Vale-presente") ou direto na agenda ("Já pagou", "Marcar atendido", aula avulsa) com `CamposPagamento` (ui.jsx): `metodo: 'Vale-presente'` + `codigo` + `resto` (forma do que o vale não cobre); `registrarVenda` (Bancada.gs) aplica e o atendimento guarda o valor cheio (`valeUsado`) para a comissão.
- `Relatorios.gs`: relatórios da administração.
- `Substituicoes.gs`: troca de profissional em aula ou atendimento (aba `Substituicoes`), pedidos da profissional, "Alguém não vem".
- `Espera.gs`: lista de espera (aba `Espera`: aula lotada pelo site ou pela recepção; serviço com dia/período/profissional preferidos) e retornos sugeridos (`retorno_dias` do serviço → Marketing → Retornos; `Atendimentos.retorno` = avisado/dispensado).

Regras de negócio importantes:
- Serviços (estética e fisioterapia) são agendados **só pela bancada**, nunca pela área do aluno.
- Toda ação nova da bancada precisa entrar em `PERMISSOES` (Bancada.gs), senão é recusada.
- Comissão de um serviço: a da profissional naquele serviço (Catálogo → Profissionais) → a do serviço → a padrão da profissional. O tempo da profissional no serviço vale para horários livres e agenda. Na aba Profissionais, coluna `servicos` = `id:comissão:minutos;…` (vazio = padrão).
- Horário das profissionais: por dia da semana com até 3 turnos (`horarios`, JSON) e datas especiais (`especiais`, JSON; `[]` = não atende). Sem `horarios`, vale o cadastro antigo (dias + início/fim dentro de `HORARIO_CASA`). `turnosDoProfissional` decide; a agenda do dia recebe os turnos em `equipe`.
- Agenda (bancada): "Agenda do dia" no estilo Avec (todas lado a lado: estética, fisio, Pilates, Yoga; horas nas linhas; listrado = fora do horário) e "Aulas e presença".
- Agenda × velocidade (revisão de out/2026): a tela Agenda busca a **semana inteira numa ida só** (`b_agendaSemana` em Servicos.gs: aulas com reservas + atendimentos + folgas + turnos de cada dia) e pré-carrega a semana anterior e a seguinte; trocar de dia não vai ao servidor. `AgendaServicos` e `AgendaSemana` recebem os dados prontos da `Agenda.jsx` (nunca mostram outra semana enquanto carrega: `atual` do `useDados`). Salvar/remarcar/mudar status devolve o atendimento e `aplicar()` mostra na hora (a semana se atualiza por trás). Botões da agenda ficam na barra das abas (portal no `slot`); o que se usa pouco vai no `MenuMais` (ui.jsx); a barra se ajusta pelo espaço (`@container agbarra`); no celular "Agendar serviço" flutua no canto. Tira da semana (seg–dom) mostra quantos atendimentos há em cada dia; ← → trocam de dia. Busca, pré-carregamento e `useFazServicos` usam a mesma `agendaSemana`. `chaveConfirmacao` é lida uma vez por pedido (antes, uma leitura das Propriedades por atendimento).
- Cliente: endereço (CEP com ViaCEP, rua, número, complemento, bairro, cidade, UF) e "Como nos conheceu?" (`como_conheceu`; opções em `src/lib/clientes.js`). Relatórios → Alunos mostra canais, vendas por canal e bairros. No site o endereço é obrigatório no cadastro; `publico()` devolve `endereco: false` para quem ainda não tem (aviso em Aulas).
- Minha conta (área do aluno, `/minha-conta`; servidor em Clientes.gs: `minhaConta`, `salvarConta`, `trocarEmail`, `trocarSenha`): a aluna edita nome, WhatsApp, nascimento, endereço e "receber novidades" (`marketing`). CPF não muda. Trocar e-mail ou senha pede a senha atual (mesmo limite de tentativas do login), avisa por e-mail e a troca de senha desconecta os outros aparelhos (devolve sessão nova). `salvarEmail` só vale para quem ainda não tem e-mail. Na barra da área do aluno, "Minha conta" e "Sair" ficam juntos à direita (o Sair também está no menu do topo, no celular).
- Profissional (papel `professora`, mostrado como "Profissional"): "Clientes" (`/bancada/clientes/:ref`, `ref` = id de um atendimento dela) com Anamnese (texto livre + fotos; só a autora ou admin edita), Ficha e evolução, Comandas. Ela nunca abre cliente pelo CPF (`cpfComAcesso`). Na Agenda do dia ela vê só a própria coluna (`ehDela` em `ui.jsx`, igual a `mesmaProfessora`); quem só dá aula abre em "Aulas e presença".
- Substituição (`Substituicoes.gs`, tela `src/bancada/Trocas.jsx`, aba Agenda → Trocas): a profissional só PEDE (`b_pedirSubstituicao`); admin/recepção trocam (`b_substituir`, `b_ausencia`). Aula: vale só para aquele `aula_id` (`gerarAulas` aplica `trocasDeAulas()`, devolve `titular`; as Reservas passam para quem substitui). Atendimento: `profissional` muda, `titular` guarda a original, `comissao_de` = de quem é a regra (vazio = de quem atende); comanda aberta e Pagamentos acompanham. Regra da comissão escolhida na hora (padrão: de quem substitui). Clientes NÃO são avisados sozinhos: a resposta traz `avisos` com o texto para WhatsApp; quem cobre recebe e-mail. Escolher a titular desfaz.
- Comanda (Gestao.gs): cada item tem `uid`; dá para trocar serviço e profissional (o atendimento ligado acompanha; item `pago` não troca de serviço), desconto por item em % ou R$ com motivo (`descontoTipo`/`descontoValor`/`motivoDesconto`) e observação (`obs`). Tudo o que muda vai para `Comandas.historico` (`diferencasComanda`, `anotarComanda`). Reabrir comanda fechada é só da administração (`b_reabrirComanda`, com motivo): estorna pagamentos, desativa créditos e vales vendidos nela, devolve vale usado, estoque e cancela comissões; recusa se plano/pacote/vale já foi usado ou comissão já paga.
- Agenda × dinheiro (revisão de out/2026): **reagendar move o mesmo atendimento** (`reagendarServico`, mesmo id: pagamento, pacote, comanda e comissão continuam; serviço só muda se ainda for `no_dia`). Na comanda, "já pago" de item da agenda é decidido pelo servidor pelo atendimento (nunca pela tela). Atendimento numa comanda aberta não recebe pela agenda nem é cancelado/marcado falta (tirar o item antes); ao fechar, item de atendimento cancelado/falta é recusado e serviço sem profissional também. Estorno em Vendas de linha de comanda é recusado (usar Reabrir comanda); estorno devolve o saldo do vale. Vale em R$ não vai no campo do código da comanda (só no Receber). Horários livres de serviço (`ocupacoesDoDia`) descontam as aulas da própria profissional e o dia de casa fechada (bloqueio sem hora e sem modalidade); `falta` libera o horário. Renomear profissional leva os atendimentos/folgas futuros; trocar professora na grade leva as reservas futuras. Cliente sem cadastro com WhatsApp de outra pessoa: erro `WHATSAPP_DE_OUTRA` e a tela pergunta (`outraPessoa`).
- Tela: `hojeIso()` é o dia em Fortaleza; `useAtualizarSozinho` (agenda busca de novo ao voltar à aba e a cada 3 min); `useEsquecerPedidoDaRota` (state `novo`/`nova` vale uma vez); `BotaoAcao` mostra o erro que a ação não tratou e não aceita dois toques; `numBR` entende "1.200,00" e "99.90".
- Novidades de out/2026 (testes em `testes/novidades.teste.cjs`):
  - **Alertas da cliente**: `Alunos.alerta` (texto fixo) + alergias/gestante das fichas → `alertasDe(cpf)` (Clientes.gs, cache 30 min, apagado ao gravar em Alunos/Anamneses/FichasEstetica). Aparecem na agenda (`!` no bloco), no detalhe, nas aulas, na comanda e na ficha (`<Alertas>` em ui.jsx). A profissional vê.
  - **Arrastar para remarcar** (Agenda do dia, `AgendaServicos`): mouse arrasta; toque segura 0,4 s. Solta → confirmação (`MoverAtendimento`) → `agendarServico` com `reagendarId`. **Imprimir** a agenda do dia (Mais → Imprimir; `ImpressaoDia`, portal no body + `@media print`: uma lista por pessoa com horário, cliente, serviço, alertas e ☐ para marcar). As regras de impressão do vale (`#vale-impressao`) e da agenda (`.ag-impressao`) valem só quando o elemento está na página (`body:has(...)`); antes uma escondia a outra e a folha saía em branco.
  - **Semana** (aba da Agenda, `AgendaSemana`): uma pessoa, 7 dias; `b_atendimentos` com `porDia` devolve os turnos de cada dia.
  - **Lista de espera**: cancelar reserva (site ou bancada) chama `avisarVagaAula` (e-mail para quem espera); reservar/agendar tira da lista (`esperaResolvida`). Site: botão "Lista de espera" em aula lotada (`entrarEspera`/`sairEspera`).
  - **Série**: `agendarServico` com `repetir: { cadaDias: 7|14|21|28, vezes }`; só a 1ª fica paga, pacote vale enquanto houver sessão; dias ocupados vêm em `serie.pulados`.
  - **Confirmação pelo link**: `#/confirmar/<id>.<hmac>` (chave `CHAVE_CONFIRMACAO` nas Propriedades, criada sozinha); ações públicas `verConfirmacao`/`responderConfirmacao`; `Atendimentos.resposta` = confirmou/remarcar (reagendar limpa). Lembrete por e-mail e WhatsApp leva o link.
  - **Caixa × extrato**: fechar o caixa aceita `conferencia` por forma (Pix, débito, crédito, link) → `Caixa.conferencia`. **Taxas da maquininha** em Ajustes (`AJUSTES.taxas`, em `AJUSTES_JSON`) → Financeiro mostra taxas estimadas e resultado líquido.
  - **Pacote na comanda**: item de serviço com `usarPacote` usa uma sessão (`creditoDeServico`); ao fechar, usa o **horário marcado** da cliente para aquele serviço (`agendamentoDoItem`: de hoje em diante, o mais próximo; horário futuro fica `pacote` e continua agendado). Só sem horário marcado cria um registro "Feito na comanda" para contar a sessão, que **não aparece na grade** nem ocupa horário (`soDaComanda`). Ao salvar a comanda, serviço lançado à mão para quem tem horário hoje é ligado a ele. Reabrir devolve. (Bug de out/2026: criava atendimento no dia e na hora do fechamento, fora do horário.)
  - **Busca rápida** (`Busca.jsx`, Ctrl+K ou "/"): clientes, agenda de hoje, comandas abertas e atalhos.
- Caixa do dia: a recepção mexe só no de hoje (pode fechar um caixa esquecido aberto); a administração abre, lança e fecha caixa de dias que passaram (`diaDoCaixa`), marcado como "aberto depois".
- Excluir cliente (`b_excluirCliente`, só administração, confirma com o primeiro nome): sem histórico apaga o cadastro; com histórico anonimiza (CPF vira código interno, nome "Cliente excluído", contatos apagados em todas as abas de `ABAS_COM_HISTORICO`) e apaga ficha de saúde, estética, evolução, anamneses e fotos (Drive). O financeiro não muda.
- Pagamento com cartão (comanda e balcão): a bandeira é obrigatória na tela (`BANDEIRAS`), gravada em `Pagamentos.bandeira`; na comanda o servidor também exige. No **Link InfinitePay** a bandeira aparece, mas é opcional (o link também aceita Pix): `pedeBandeira` (ui.jsx) e `bandeiraDe` (Gestao.gs).
- Profissionais de aula (Catálogo → Profissionais de aula, aba `Professoras`): Pilates = % sobre o valor da aula da aluna (plano ÷ aulas do plano; mensal 2x = 8; Wellhub = `WELLHUB_VALOR_CHECKIN` nas Propriedades); Yoga = R$ fixo por aula dada (hora/aula). Só aulas terminadas, a partir de `desde`; falta/cancelada não contam. `sincronizarComissoesAulas` (Gestao.gs) grava na aba Comissoes (origem `aula`/`aula_fixa`) ao abrir Comissões, Financeiro ou Meus ganhos (no máximo a cada 5 min; presença e cancelamento refazem na hora).
- Abas novas: declarar em `ABAS` (Codigo.gs) e, se tiver CPF/IDs, em `FORMATO_TEXTO`. Colunas novas vão **no fim** da lista (a planilha já existe com dados).
- Fora de escopo por decisão do dono: clube de assinaturas, nota fiscal e WhatsApp pago (API oficial). Não propor de novo sem ele pedir.

## Publicação (automática)

- `git push` na `main` → workflow **Publicar site** (GitHub Pages) e, se mudou `apps-script/`, **Publicar Apps Script** (clasp push + atualiza a mesma implantação).
- Se o Apps Script falhar com `invalid_grant`, a permissão do clasp expirou. O Fábio refaz: `npx @google/clasp@2.4.2 login` no Mac → copia `~/.clasprc.json` → GitHub → Settings → Secrets → `CLASPRC_JSON`.
- Mudar `oauthScopes` no `appsscript.json` exige que o dono reautorize no editor: evite, a não ser que seja essencial.
- Depois de publicar, confira as execuções com `gh api repos/acasaambar/site-casa-ambar/actions/runs`.

## Velocidade (Apps Script é lento: cada leitura da planilha custa 0,1 a 0,5 s)

- Servidor: durante um pedido, o que já foi lido fica em memória (`valoresAba`/`lerAba`). `aba(nome)` descarta a cópia daquela aba (use-o para gravar). Dentro de trava, use `esperarTrava(trava, ms)`, que relê tudo. Não grave por fora dessas funções depois de ler a mesma aba no mesmo pedido.
- **Cache das abas com versão** (out/2026, Codigo.gs): `valoresAba` guarda cada aba no CacheService (gzip em partes, 5 min) junto com a versão da aba (`v_<aba>`). `aba(nome)` marca a aba como gravada (`_sujas`); `confirmarGravacoes()` faz flush e troca a versão — roda em `soltarTrava(trava)` (use SEMPRE no lugar de `trava.releaseLock()`) e em `responder`. Fora da trava qualquer aba vem do cache; dentro da trava só o catálogo (`ABAS_EM_CACHE`), o resto é lido da planilha (decisão de horário livre, CPF repetido etc. nunca usa cópia). Mudança feita à mão na planilha aparece em até 5 min ou na hora em Ajustes → Velocidade → "Ler a planilha de novo" (`b_lerPlanilhaDeNovo`, só admin); `configurarPlanilha` também esquece o cache. Gravar por fora de `aba()` (ex.: `getSheetByName`) não troca a versão: não faça. Dentro da trava, `atualizarLinha` com 3+ blocos de colunas lê a faixa e grava de uma vez. Trabalho que não precisa da trava (registro, lista de espera, montar a resposta) vai depois de `soltarTrava`. A sessão da equipe fica 600 s no cache (`m_`+hash); `esquecerSessoesEmCache(email)` ao mudar papel/desativar.
- **Medidor**: toda resposta traz `medida` (`ms` no servidor, abas lidas da `planilha` e do `cache`); `src/lib/api.js` guarda as últimas 400 no navegador (`ambar_medidas`, só números) e a tela **Velocidade** (`/bancada/velocidade`, Ajustes → Velocidade, busca Ctrl+K) mostra a mediana por ação e "Copiar o resumo". Total − servidor = internet + Google preparando o pedido (não depende do nosso código).
- **Telas sem espera**: busca de cliente filtra na hora a lista pré-carregada (`useBuscaClientes`/`filtrarClientes` em ui.jsx) e confirma com o servidor por trás; cadastrar cliente devolve a ficha (`b_novoAluno` → `ficha`) e a tela abre na hora (`lembrarResultado`, `incluirNaListaDeClientes`); item novo na comanda aparece na hora e os salvamentos vão em fila (`fila`/`servidor` em ComandaModal, um de cada vez sobre a comanda mais nova); presença marca na hora e volta se o servidor recusar.
- Bancada pré-carrega ao entrar (efeito em `Bancada.jsx`): agenda da semana, catálogo, planos, comandas abertas e a lista de clientes; profissional, a agenda e "Minhas clientes".
- **Memória que sobrevive ao F5** (`memoria.js`): `catalogoServicos` e `planos` (nada pessoal) ficam no localStorage por pessoa (`ambar_fixo|email|…`); agenda da semana, clientes, comandas, Hoje, espera e "Minhas clientes" ficam no sessionStorage (`ambar_mem|token|…`) até fechar a aba. `usarDono(token, email)` (sessao.jsx) traz de volta ao abrir; `esquecerTudo()` (sair/trocar login/login vencido) apaga os dados pessoais. O que voltou do navegador aparece na hora e é buscado de novo por trás (`estaFresco`, `preCarregar`). Novo tipo de dado pessoal: só em `DA_ABA`, nunca em `FIXOS`.
- **Horários livres na hora** (`src/bancada/horariosLivres.js`): a mesma conta de `bancada_horarios`, feita na tela com a `agendaSemana` da memória (que traz `fechados` = casa fechada e `duracaoAula`); o servidor responde por trás e substitui, e confere de novo ao salvar. Mudou a regra no servidor? Mude nos dois; `testes/horarios.teste.mjs` compara tela × servidor em ~1.500 combinações.
- `atualizarLinha` grava colunas vizinhas juntas. Prefira-a a `getRange().setValue()` solto.
- Tela: `useDados` mostra na hora o que já foi carregado e atualiza por trás (`src/bancada/memoria.js`, aviso "Atualizando…"). Catálogo e planos são pré-carregados.
- `npm run velocidade` conta leituras/gravações de cada tela e ação. Rode antes e depois de mexer no backend.
- **Datas e horas da planilha** (bug de out/2026: 27/10 09:00 aparecia em 26/10 01:00): o Google transforma "2026-10-27"/"09:00" em data/hora (o `appendRow` ignora a coluna de texto) e devolve um Date que depende do fuso. Toda leitura passa por `valoresComTexto` (Codigo.gs): célula com data vira o **texto que a planilha mostra** (`textoDeData`, sem conta de fuso). No fim do pedido, `datasParaTexto` (em `responder`, com a trava livre) grava essas células como texto (`@`), fora das abas que apagam linhas sem trava (`ABAS_SEM_DATA_TEXTO`). Leitura crua nova de aba com data: use `valoresComTexto(range)`, nunca `getValues()`. Teste: `testes/datas.teste.cjs` (simulador com `__fuso` e `__appendIgnoraTexto`).
- Abas grandes (Reservas, Pagamentos, Atendimentos): não monte objeto de todas as linhas para usar poucas. Filtre os valores crus antes (`linhasDoCpf`, `indiceColunas` em Bancada.gs). Datas: `dataHoraTexto` faz a conta no fuso fixo (Fortaleza) sem chamar o Google.
- Lista de Clientes: `listaClientes()` monta numa passada por aba e guarda 5 min no CacheService (gzip, em partes); gravar em Alunos/Creditos/Anamneses/Atendimentos pelas funções de gravação apaga (`esquecerListaClientes`). A tela mostra 150 por vez e a ficha abre com o resumo da lista.
- `DEMORA=1500 npm run simulador` imita a demora do Google para testar a tela.

## Testar antes de publicar

```bash
npm install
npm run lint        # oxlint
npm run build
npm run teste       # testa o backend inteiro num simulador (sem tocar na planilha real), inclusive segurança, substituições e comanda
npm run velocidade  # quantas idas à planilha cada tela/ação faz
npm run simulador   # cópia local com dados de exemplo em http://localhost:8787
# em outro terminal: VITE_API_URL=http://localhost:8787 npm run dev
```
Contas de exemplo do simulador: `contato@acasaambar.com.br` / `ambar2026adm` (admin), `bia@acasaambar.com.br` / `recep2026ok` (recepção), `lia@gmail.com` / `liamoura2026` (profissional).
Ao criar algo novo no backend, acrescente casos em `testes/*.teste.cjs`.

## Segurança: não negociável

- Só `doPost`/`doGet` são acessíveis de fora (não há `google.script.run` nem API executável): o "_" no nome das funções não protege nada aqui. A proteção é a lista fechada de ações em `doPost` (`hasOwnProperty`) e `PERMISSOES` + papel em `executarBancada`. `testes/seguranca.teste.cjs` confere todas as ações; rode-o ao criar ação nova.
- Webhook da InfinitePay: só `P` + dígitos, exige transação e valor ≥ o do pedido, e a mesma transação não paga dois pedidos. Vale/cupom em link pendente (24 h) já contam como usados (`pagamentosQueContam`).
- Para a aluna, `observacao` do pagamento passa por `observacaoParaAluna` (notas internas não saem).

- **Nunca** colocar chaves no código (o repositório é público). A chave da InfinitePay fica só nas Propriedades do script (`INFINITEPAY_API_KEY`) e só o servidor a usa.
- **Nunca** apagar nem alterar a propriedade `SENHA_PIMENTA` (todas as senhas deixariam de funcionar).
- Não pedir nem colar no chat o conteúdo do `.clasprc.json` ou qualquer token.
- Todo texto que vai para a planilha passa por `seguro()` (impede fórmulas). Use sempre `adicionarLinha(s)`/`atualizarLinha`.
- Sessões são guardadas só como hash (o valor da planilha não serve como token). Mensagens de erro internas não vão para a tela.
- Login expira: **bancada** até a meia-noite (Fortaleza, no máximo 14 h) e depois de 3 h sem uso (servidor: marca `u_` no cache; tela: toque/tecla); **área do aluno** 7 dias (`validadeSessaoDias`) e 3 dias sem abrir o site (tela). `sessaoValida`/`momentoDe` (Codigo.gs) conferem também a data de criação (sessões antigas caem).
- Revisão de out/2026: a profissional vê a comanda sem código de vale/cupom/dados de quem recebe; muda presença/atendimento só até 24 h depois (depois, a recepção); juntar cadastro pelo CPF pede confirmação (`CPF_DE_OUTRA` → `juntarCpf`); trocar e-mail/senha anula links de senha pendentes (`anularLinksSenha`); link de confirmação assina dia e hora (remarcou = link novo); excluir cliente tira o nome de Comissoes/Substituicoes/MovEstoque/Registro; webhook só pega a trava para pedido pendente. Pendências baixas: aviso "CPF já tem cadastro" no site, limite global de cadastros, `tokenLista` usa `SENHA_PIMENTA` (trocar invalidaria links de descadastro já enviados), arquivos do Drive vão para a lixeira (30 dias).
- Professora/profissional só vê o que é dela (`mesmaProfessora`), sem CPF nem WhatsApp das clientes.
- Dados de saúde e fotos são sensíveis (LGPD): planilha e pastas do Drive devem ficar com acesso **Restrito**.

## Visual da bancada ("caderno da casa")

Cores: tinta `#2F3821`, papel `#F4EFDF`, linho `#FBF8EF`, oliva `#6F784D`, terracota `#7E3717`, caramelo `#A6845E`.
Leitura em primeiro lugar (pedido da equipe): texto em IBM Plex Sans 15 px; números, horas e nomes em Plex Sans seminegrito; **Italiana só nos títulos grandes** (página, janela) e no selo de cera. Nada abaixo de 13 px, cinzas escuros (`--b-suave: #535647`). Rótulos e botões em caixa normal (sem LETRAS MAIÚSCULAS espaçadas); formulários abrem como folha lateral (no celular, de baixo para cima). Senhas sempre com `CampoSenha` (botão de olho).
Peças com identidade: a **linha do dia** com o sol (Hoje), a **comanda como papel de nota picotado**, a **promoção como selo de cera**.
Sempre conferir no celular (390 px), no iPad (820 px) e no computador, sem rolagem lateral. Estilos em `src/bancada/bancada.css` (camadas "DESENHO 2" a "DESENHO 7 · novidades" no fim).
No celular: campos com 16 px (o iPhone não dá zoom) e alvos de toque com 40 px ou mais. Plurais com `plural()` (`ui.jsx`), nunca "(s)". Formulários longos com o botão de salvar preso ao pé (`.b-salvar-fixo`).

## Visual do site

Nada abaixo de 12 px (textos de ajuda com 13 px); rótulos em maiúsculas espaçadas fazem parte da identidade do site. Números dentro de títulos em Italiana passam por `comNumeros()` (`src/components/Num.jsx`): a Italiana tem algarismos antigos ("1X" parece "IX"). Caramelo em texto pequeno: `--caramelo-claro` (fundo escuro) ou `--caramelo-escuro` (fundo claro). Erros de formulário apontam o campo com `apontarCampo()` (`src/lib/util.js`). O WhatsApp flutuante some na área do aluno no celular/iPad (cobria tapetes e botões).

## Pendências e próximos passos

- Fábio: criar e verificar o **Perfil da Empresa no Google** (business.google.com), pedir avaliações e cadastrar o site no **Search Console** (o `index.html` tem o lugar comentado para a tag de verificação). SEO do site: título, descrição, dados estruturados (JSON-LD) e texto de reserva no `index.html`, `robots.txt` e `sitemap.xml` em `public/`. CEP (60150-140) e horário no JSON-LD: conferir.
- Fábio: preencher as **taxas da maquininha** (Ajustes) e o **retorno sugerido** dos serviços (Catálogo).
- Fábio/equipe: cadastrar a % de comissão de cada profissional (Catálogo → Profissionais), os produtos e o consumo de cada serviço, as despesas fixas, e importar os clientes do Avec (CSV).
- Usar a bancada junto com o Avec por 2 a 4 semanas antes de cancelar o Avec.
- Conferir que a planilha e as pastas do Drive (anamneses e fotos) estão com acesso **Restrito**.
- Gerar uma chave nova da InfinitePay (a antiga apareceu numa conversa) e atualizar `INFINITEPAY_API_KEY`.
