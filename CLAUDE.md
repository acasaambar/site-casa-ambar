# Casa Âmbar — instruções para o Claude

Site e sistema da **Casa Âmbar** (Rua Eduardo Salgado, 448, Aldeota, Fortaleza): yoga, pilates, estética e fisioterapia.
No ar em **https://www.acasambar.com.br** (GitHub Pages) e bancada interna da equipe em **/#/bancada**.

## Quem pede e como responder

- O dono do projeto é o Fábio. Ele está começando em programação e chegou ao projeto como "vibe coder".
- Responda sempre em **português do Brasil**, de forma **objetiva e direta**.
- Quando houver código para ele usar, entregue **completo e pronto**, nunca trechos soltos para encaixar.
- Faça as mudanças você mesmo, teste, publique (commit + push) e explique **o que mudou** em poucas linhas, sem jargão.
- Quando ele precisar fazer algo fora do código (Google, GitHub, InfinitePay), dê o passo a passo numerado.

## Como o projeto funciona

| Parte | Onde | Observação |
|---|---|---|
| Site (React 19 + Vite) | `src/` | HashRouter. Fontes: Italiana (títulos), IBM Plex Mono (texto do site), IBM Plex Sans (texto da bancada), Pinyon Script (detalhe). |
| Área do aluno | `src/pages/` | Só **Yoga e Pilates**: reserva com escolha de tapete, check-in, planos, Wellhub, ficha de saúde. |
| Bancada interna | `src/bancada/` | Carregada à parte (lazy). Papéis: `admin`, `recepcao`, `professora` (também cobre profissional de estética/fisio). |
| Backend | `apps-script/*.gs` | Google Apps Script + Google Sheets (a planilha é o banco). Um único `doPost`; ações da bancada começam com `b_`. |
| Configuração do site | `src/config.js` | URL da API, WhatsApp, e-mail. `VITE_API_URL` troca a API (para testes locais). |

Arquivos do backend:
- `Codigo.gs`: núcleo. Abas (`ABAS`), planilha, alunos, aulas, reservas, pagamentos InfinitePay, utilidades (`lerAba`, `valoresAba`, `adicionarLinha(s)`, `atualizarLinha`, `seguro`, `novoNsu`, `esperarTrava`).
- `Seguranca.gs`: senhas, links de senha, limites de tentativas, e-mail com a marca, `autorizarEmails()`.
- `Bancada.gs`: login da equipe, `PERMISSOES` (lista do que cada papel pode), agenda, clientes, vendas, vales, cupons, ajustes.
- `Servicos.gs`: catálogo de serviços e pacotes, profissionais (com os serviços que cada uma faz, comissão e tempo próprios), horários livres, agendamento de serviços.
- `Gestao.gs`: produtos e estoque, comandas, comissões, despesas, financeiro, caixa do dia, bloqueio de horário (folgas).
- `Clientes.gs`: cliente sem CPF (código interno de 15 dígitos começando com 9), importação de CSV, ficha de estética, evolução com fotos (Drive), histórico.
- `Marketing.gs`: promoções automáticas, campanhas (e-mail e WhatsApp) com descadastro, lembretes da véspera.
- `Vales.gs`: cupons, vales-presente (cortesia, **não são vendidos**) e `calcularPreco` (promoção × cupom: vale o maior; o vale entra depois).
- `Relatorios.gs`: relatórios da administração.

Regras de negócio importantes:
- Serviços (estética e fisioterapia) são agendados **só pela bancada**, nunca pela área do aluno.
- Toda ação nova da bancada precisa entrar em `PERMISSOES` (Bancada.gs), senão é recusada.
- Comissão de um serviço: a da profissional naquele serviço (Catálogo → Profissionais) → a do serviço → a padrão da profissional. O tempo da profissional no serviço vale para horários livres e agenda. Na aba Profissionais, coluna `servicos` = `id:comissão:minutos;…` (vazio = padrão).
- Horário das profissionais: por dia da semana com até 3 turnos (`horarios`, JSON) e datas especiais (`especiais`, JSON; `[]` = não atende). Sem `horarios`, vale o cadastro antigo (dias + início/fim dentro de `HORARIO_CASA`). `turnosDoProfissional` decide; a agenda do dia recebe os turnos em `equipe`.
- Agenda (bancada): "Agenda do dia" no estilo Avec (todas lado a lado: estética, fisio, Pilates, Yoga; horas nas linhas; listrado = fora do horário) e "Aulas e presença".
- Cliente: endereço (CEP com ViaCEP, rua, número, complemento, bairro, cidade, UF) e "Como nos conheceu?" (`como_conheceu`; opções em `src/lib/clientes.js`). Relatórios → Alunos mostra canais, vendas por canal e bairros.
- Pagamento com cartão (comanda e balcão): a bandeira é obrigatória na tela (`BANDEIRAS`), gravada em `Pagamentos.bandeira`; na comanda o servidor também exige.
- Professoras de aula (Catálogo → Professoras de aula, aba `Professoras`): Pilates = % sobre o valor da aula da aluna (plano ÷ aulas do plano; mensal 2x = 8; Wellhub = `WELLHUB_VALOR_CHECKIN` nas Propriedades); Yoga = R$ fixo por aula dada (hora/aula). Só aulas terminadas, a partir de `desde`; falta/cancelada não contam. `sincronizarComissoesAulas` (Gestao.gs) grava na aba Comissoes (origem `aula`/`aula_fixa`) ao abrir Comissões, Financeiro ou Meus ganhos (no máximo a cada 5 min; presença e cancelamento refazem na hora).
- Abas novas: declarar em `ABAS` (Codigo.gs) e, se tiver CPF/IDs, em `FORMATO_TEXTO`. Colunas novas vão **no fim** da lista (a planilha já existe com dados).
- Fora de escopo por decisão do dono: clube de assinaturas, nota fiscal e WhatsApp pago (API oficial). Não propor de novo sem ele pedir.

## Publicação (automática)

- `git push` na `main` → workflow **Publicar site** (GitHub Pages) e, se mudou `apps-script/`, **Publicar Apps Script** (clasp push + atualiza a mesma implantação).
- Se o Apps Script falhar com `invalid_grant`, a permissão do clasp expirou. O Fábio refaz: `npx @google/clasp@2.4.2 login` no Mac → copia `~/.clasprc.json` → GitHub → Settings → Secrets → `CLASPRC_JSON`.
- Mudar `oauthScopes` no `appsscript.json` exige que o dono reautorize no editor: evite, a não ser que seja essencial.
- Depois de publicar, confira as execuções com `gh api repos/acasaambar/site-casa-ambar/actions/runs`.

## Velocidade (Apps Script é lento: cada leitura da planilha custa 0,1 a 0,5 s)

- Servidor: durante um pedido, o que já foi lido fica em memória (`valoresAba`/`lerAba`). `aba(nome)` descarta a cópia daquela aba (use-o para gravar). Dentro de trava, use `esperarTrava(trava, ms)`, que relê tudo. Não grave por fora dessas funções depois de ler a mesma aba no mesmo pedido.
- `atualizarLinha` grava colunas vizinhas juntas. Prefira-a a `getRange().setValue()` solto.
- Tela: `useDados` mostra na hora o que já foi carregado e atualiza por trás (`src/bancada/memoria.js`, aviso "Atualizando…"). Catálogo e planos são pré-carregados.
- `npm run velocidade` conta leituras/gravações de cada tela e ação. Rode antes e depois de mexer no backend.
- `DEMORA=1500 npm run simulador` imita a demora do Google para testar a tela.

## Testar antes de publicar

```bash
npm install
npm run lint        # oxlint
npm run build
npm run teste       # testa o backend inteiro num simulador (sem tocar na planilha real)
npm run velocidade  # quantas idas à planilha cada tela/ação faz
npm run simulador   # cópia local com dados de exemplo em http://localhost:8787
# em outro terminal: VITE_API_URL=http://localhost:8787 npm run dev
```
Contas de exemplo do simulador: `contato@acasaambar.com.br` / `ambar2026adm` (admin), `bia@acasaambar.com.br` / `recep2026ok` (recepção), `lia@gmail.com` / `liamoura2026` (profissional).
Ao criar algo novo no backend, acrescente casos em `testes/*.teste.cjs`.

## Segurança: não negociável

- **Nunca** colocar chaves no código (o repositório é público). A chave da InfinitePay fica só nas Propriedades do script (`INFINITEPAY_API_KEY`) e só o servidor a usa.
- **Nunca** apagar nem alterar a propriedade `SENHA_PIMENTA` (todas as senhas deixariam de funcionar).
- Não pedir nem colar no chat o conteúdo do `.clasprc.json` ou qualquer token.
- Todo texto que vai para a planilha passa por `seguro()` (impede fórmulas). Use sempre `adicionarLinha(s)`/`atualizarLinha`.
- Sessões são guardadas só como hash. Mensagens de erro internas não vão para a tela.
- Professora/profissional só vê o que é dela (`mesmaProfessora`), sem CPF nem WhatsApp das clientes.
- Dados de saúde e fotos são sensíveis (LGPD): planilha e pastas do Drive devem ficar com acesso **Restrito**.

## Visual da bancada ("caderno da casa")

Cores: tinta `#2F3821`, papel `#F4EFDF`, linho `#FBF8EF`, oliva `#6F784D`, terracota `#7E3717`, caramelo `#A6845E`.
Leitura em primeiro lugar (pedido da equipe): texto em IBM Plex Sans 15 px; números, horas e nomes em Plex Sans seminegrito; **Italiana só nos títulos grandes** (página, janela) e no selo de cera. Nada abaixo de 13 px, cinzas escuros (`--b-suave: #535647`). Rótulos e botões em caixa normal (sem LETRAS MAIÚSCULAS espaçadas); formulários abrem como folha lateral (no celular, de baixo para cima). Senhas sempre com `CampoSenha` (botão de olho).
Peças com identidade: a **linha do dia** com o sol (Hoje), a **comanda como papel de nota picotado**, a **promoção como selo de cera**.
Sempre conferir no celular (390 px), no iPad (820 px) e no computador, sem rolagem lateral. Estilos em `src/bancada/bancada.css` (camadas "DESENHO 2", "DESENHO 3" e "DESENHO 4 · leitura" no fim).

## Pendências e próximos passos

- Fábio/equipe: cadastrar a % de comissão de cada profissional (Catálogo → Profissionais), os produtos e o consumo de cada serviço, as despesas fixas, e importar os clientes do Avec (CSV).
- Usar a bancada junto com o Avec por 2 a 4 semanas antes de cancelar o Avec.
- Conferir que a planilha e as pastas do Drive (anamneses e fotos) estão com acesso **Restrito**.
- Gerar uma chave nova da InfinitePay (a antiga apareceu numa conversa) e atualizar `INFINITEPAY_API_KEY`.
