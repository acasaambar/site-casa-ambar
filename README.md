# Casa Âmbar — site e reserva de aulas

Site da Casa Âmbar (Fortaleza) com área do aluno para reservar aulas de **Yoga** (com escolha do tapete, 12 tapetes) e **Pilates**, login por **CPF e senha**, check-in pelo celular e banco de dados no **Google Sheets**.

## Como está organizado

| Pasta / arquivo | O que é |
| --- | --- |
| `src/config.js` | **Tudo que muda com frequência**: URL da API, WhatsApp, horário, grade de aulas, preços, regras de check-in e cancelamento |
| `src/pages/` | As páginas: início, entrar, aulas, escolha do tapete, minhas reservas |
| `src/components/Tapete.jsx` | O desenho do tapete de yoga |
| `src/styles.css` | Cores, fontes e visual (seguindo o manual da marca) |
| `apps-script/` | O código do "servidor", que roda no Google Apps Script e grava na planilha |
| `public/img/` | Logo, fotos e elementos da marca |

## Modo demonstração

Enquanto `API_URL` em `src/config.js` estiver vazio, o site funciona em **modo demonstração**: os dados ficam salvos só no navegador. Conta de teste: CPF `123.456.789-09`, senha `ambar123`.

## Ligar o banco de dados (Google Sheets)

1. Crie uma planilha nova na conta Google da Casa Âmbar.
2. Extensões → Apps Script. Cole o conteúdo de `apps-script/Codigo.gs`.
3. Configurações do projeto → marque "Mostrar arquivo de manifesto". Cole o `apps-script/appsscript.json`.
4. Execute a função `configurarPlanilha` uma vez e autorize.
5. Implantar → Nova implantação → App da Web → Executar como: Eu · Acesso: Qualquer pessoa.
6. Copie a URL `/exec` e cole em `API_URL` no `src/config.js`. Ao salvar no GitHub, o site é publicado de novo sozinho.

### Abas da planilha

- **Grade**: horários fixos. Para mudar professor, horário ou capacidade, edite aqui. `ativo = NÃO` desliga uma aula.
- **Bloqueios**: feriados e aulas canceladas. Preencha `data` (2026-11-02) e, se quiser, `hora` e `modalidade`. Só a data bloqueia o dia inteiro.
- **Alunos**: cadastros. A senha fica criptografada. `ativo = NÃO` bloqueia o acesso.
- **Reservas**: uma linha por reserva, com tapete e status (`reservado`, `check-in`, `cancelado`).
- **Sessoes**: logins ativos (não precisa mexer).
- **Anamneses**: a ficha de saúde de cada aluno (uma linha por aluno, sempre a mais recente). A coluna `pdf` tem o link do PDF.

### Minha conta (área do aluno)

A aluna vê e corrige os próprios dados: nome, WhatsApp, data de nascimento, endereço e se quer receber novidades.
O CPF não muda (é o login; correção pela recepção). Para trocar o e-mail ou a senha ela digita a senha atual;
o e-mail antigo recebe um aviso da troca, e trocar a senha desconecta os outros aparelhos.

### Ficha de saúde (anamnese)

Depois de criar a conta, o aluno preenche a ficha em 3 etapas: contato de emergência, questionário PAR-Q e histórico de saúde, com consentimento LGPD. Sem ficha não é possível reservar.
Cada ficha também vira um **PDF** na pasta do Google Drive **"Casa Âmbar · Anamneses"**, criada automaticamente.

**Dados de saúde são sensíveis (LGPD):** não compartilhe a planilha nem a pasta com quem não precisa. Se um aluno pedir a exclusão, apague a linha dele na aba Anamneses e o PDF na pasta.

### Parcelas sem juros por plano (InfinitePay)

Com a **API Key** da InfinitePay configurada, cada link de pagamento leva sua regra (`options.assured_installments`):
avulsa e mensal **1x sem juros**; trimestral **até 3x sem juros**; acima disso, juros por conta da aluna, até 12x.
A coluna `sem_juros_ate` da aba Planos muda a regra de um plano.

A chave **nunca** vai para o código (o GitHub é público). Ela fica no Apps Script em
**Configurações do projeto → Propriedades do script → `INFINITEPAY_API_KEY`**.
Sem a chave, o trimestral volta a ser vendido só pela atendente.

### Planos pagos no balcão (trimestral e outros)

O plano trimestral (até 3x sem juros) é feito com a atendente. Depois de receber, lance o plano na aba **Creditos** preenchendo só 3 colunas:
`cpf` (só números), `plano_id` (ex.: `yoga-trimestral-2x`, igual à aba Planos) e `inicio` (ex.: `2026-10-20`).
O sistema completa o resto da linha sozinho na próxima vez que a aluna abrir o site.

### Wellhub

A aluna ativa o Wellhub em **Meu plano** informando o ID Wellhub. Ela já pode reservar (status `pendente`) e, na reserva, escolhe **Usar meu Wellhub**.
Ao chegar, ela faz o **check-in no app Wellhub** (é o que garante o repasse para a Casa Âmbar).
Na aba **Alunos**, coluna `wellhub`, a recepção marca `SIM` depois do primeiro check-in validado, ou `NÃO` para bloquear.
Reservas Wellhub aparecem na aba Reservas com `credito_id = WELLHUB`. Limite: 1 aula por dia (ajustável em `AJUSTES.wellhub` no Codigo.gs).

## Bancada interna (equipe)

Endereço: **www.acasambar.com.br/#/bancada**. Cada pessoa entra com o próprio e-mail e senha.

| Acesso | O que faz |
|---|---|
| Administração | tudo, inclusive relatórios, equipe, planos/preços, cupons e ajustes |
| Recepção | agenda, agendar/cancelar, presença, alunos, vendas no balcão, vales-presente e bloqueios |
| Profissional | só as próprias aulas e atendimentos: presença, ficha de saúde, **Clientes** (anamnese com fotos e comandas de quem atende), Meus ganhos |

Primeiro acesso: no editor do Apps Script, execute **uma vez** a função `autorizarEmails` (arquivo Seguranca.gs).
Ela autoriza o envio de e-mails e manda para o dono da conta Google o link para criar a senha de administrador.
Depois disso, novos acessos são criados na própria bancada (Equipe → Novo acesso), com convite por e-mail.

O código da bancada fica em `src/bancada/` (telas) e `apps-script/Bancada.gs`, `Vales.gs`, `Relatorios.gs` (servidor).
Abas novas da planilha (criadas sozinhas): Equipe, SessoesEquipe, Redefinicoes, Registro, Cupons, Vales.

### Senhas

Sal (único por pessoa) + pimenta (segredo do sistema) com HMAC-SHA256 repetido. A pimenta fica só nas
Propriedades do script, em `SENHA_PIMENTA`, criada sozinha. **Nunca apague nem altere essa propriedade.**
Senhas antigas continuam valendo e são convertidas no próximo login. "Esqueci minha senha" envia um link
de uso único, válido por 1 hora, para o e-mail do cadastro.

### Serviços (estética e fisioterapia)

Só a equipe agenda serviços, pela bancada (Agenda → Serviços). A área do aluno continua só com Yoga e Pilates.
Catálogo → Serviços e pacotes traz o material "Rituais Casa Âmbar" (preços, durações e combos). Em Catálogo → Profissionais,
cadastre quem atende, as áreas e o horário de cada uma. Os horários livres consideram a jornada e os atendimentos já marcados.
Abas novas: Servicos, Pacotes, Profissionais, Atendimentos.

### Agenda e profissionais

- **Agenda do dia** (estilo Avec): estética, fisioterapia, Pilates e Yoga lado a lado (a profissional vê só a própria coluna), horários nas linhas (a cada 30 min).
  Listrado = fora do horário de quem atende. Toque num horário vago para agendar; toque numa aula para marcar a presença. Filtre por grupo e escolha quantas colunas cabem na tela.
- **Horário de cada profissional** (Catálogo → Profissionais): cada dia da semana com até 3 turnos (ex.: 8h–12h e 14h–18h) e **dias especiais**
  (um sábado com horário diferente, um dia de folga). Os horários livres e a agenda seguem isso.

### Substituição de profissional

Agenda → **Trocas**. A profissional pede pela bancada ("Pedir substituição"); a recepção resolve ou usa **"Alguém não vem"**
para ver tudo da pessoa no dia. Para cada horário aparecem quem pode cobrir (faz o serviço ou dá a aula) e se está livre.
A troca de aula vale só para aquele dia; a de atendimento muda a agenda, a comanda aberta, o pagamento e a comissão.
A regra da comissão é escolhida na hora (de quem substitui ou da titular). Os clientes não recebem aviso automático:
a recepção recebe a lista com o WhatsApp e a mensagem prontos. Quem cobre recebe e-mail. Escolher a titular desfaz a troca.
Aba nova: Substituicoes.

### Clientes: endereço e "Como nos conheceu?"

Cadastro com endereço (o CEP preenche rua, bairro e cidade) para nota fiscal e a pergunta "Como nos conheceu?".
No **cadastro do site** o endereço é obrigatório; quem se cadastrou antes vê o aviso "Complete seu endereço" na área do aluno.
Relatórios → Alunos e marketing mostra de onde vêm as clientes, quanto cada canal vendeu e os bairros.

### Gestão da casa (comandas, caixa, estoque, financeiro)

- **Comandas e caixa**: a comanda é a conta da visita (serviços, produtos, planos e pacotes). Abre pela agenda ("Receber na comanda") ou em Comandas → Nova comanda.
  Aceita promoção, cupom, vale e pagamento dividido (ex.: Pix + cartão). No cartão, escolha a **bandeira** (Visa, Master, Elo…) para conferir com a maquininha. Ao fechar: entra em Vendas, baixa o estoque, marca o atendimento como atendido e gera a comissão.
  **Caixa do dia**: abrir com o troco, sangria/suprimento/despesa, fechar contando a gaveta (mostra a diferença).
- **Estoque**: produtos de revenda e insumos. A venda na comanda e o uso em cada serviço (Catálogo → serviço → produtos usados) baixam o saldo sozinhos.
- **Comissões**: em Catálogo → Profissionais, marque os serviços que cada uma faz, com a comissão (%) e o tempo (min) dela em cada um (como no Avec).
  Em branco vale o padrão: a comissão do serviço, senão a comissão padrão da profissional; o tempo do serviço. Financeiro → Comissões para pagar; a profissional vê em "Meus ganhos".
  **Profissionais de aula** (Catálogo → Profissionais de aula): Pilates ganha % sobre o valor de cada aluno na aula (o plano dividido pelas aulas dele, a avulsa ou o check-in Wellhub);
  Yoga ganha um valor fixo por aula dada. Contam só aulas que já terminaram, a partir da data escolhida; falta e reserva cancelada não contam.
- **Financeiro**: visão do mês (entradas × saídas), despesas (com contas fixas que se repetem todo mês) e fechamentos de caixa.
- **Bloquear horário**: Agenda → Serviços → Bloquear horário (folga, almoço, curso), com repetição semanal.
- **Marketing**: promoções automáticas (sem código), campanhas por e-mail ou WhatsApp (sumidas, aniversariantes, pacote acabando…),
  lembretes da véspera por e-mail (saem sozinhos quando a recepção abre a bancada), vales-presente e cupons.
  Todo e-mail de campanha tem o link "não quero mais receber".
- **Clientes**: cliente sem CPF tem cadastro completo (não acessa a área do aluno); ao informar o CPF, o histórico é transferido.
  Histórico completo, ficha de estética e evolução com fotos de antes e depois (pasta privada "Casa Âmbar · Fotos de clientes" no Drive).
  **Importar planilha** (Avec ou outro sistema, em CSV) em Clientes.

- **Clientes** (profissional): as pessoas que ela atende, com três abas: **Anamnese** (anotações de texto livre, sem limite de tamanho, com até 30 fotos cada),
  **Ficha e evolução** e **Comandas** (abertas e as últimas fechadas, sem CPF nem WhatsApp). Abre também pelo atendimento na agenda.
  Cada anotação mostra quem escreveu; só a autora (ou a administração) edita. Recepção e administração leem tudo na ficha da cliente (aba Anamnese).
  Texto curto fica na aba AnamnesesProf; texto muito longo vai para um arquivo na pasta privada de fotos do Drive.

Abas novas: Produtos, MovEstoque, Comandas, Comissoes, Despesas, Caixa, Folgas, Promocoes, Campanhas, FichasEstetica, Evolucoes, AnamnesesProf.

### Velocidade

- Durante um pedido, cada aba é lida uma vez só. Entre pedidos, o catálogo (Grade, Planos, Servicos, Pacotes, Profissionais, Professoras, Promocoes)
  fica 2 minutos no cache do Google. O que a bancada salva aparece na hora; **o que for editado direto na planilha aparece em até 2 minutos**.
- A sessão da equipe fica 10 minutos no cache (mudar o papel, desativar, trocar a senha ou sair vale na hora).
- A bancada guarda na tela o que já carregou e atualiza por trás; ao entrar, já busca a agenda do dia, o catálogo e as comandas abertas.

### Segurança

- Só duas portas: o site e a bancada falam com o servidor por `doPost`, que aceita uma lista fechada de ações. As da bancada (`b_…`)
  só rodam se estiverem em `PERMISSOES` e se a pessoa tiver o papel certo. Nenhuma outra função do Apps Script pode ser chamada de fora
  (o "_" no fim do nome não é o que protege aqui: a lista fechada é). `npm run teste` confere isso em todas as ações.
- Sessões: a planilha guarda só o hash do token (aba Sessoes e SessoesEquipe), no máximo 10 por aluna. Sair invalida na hora.
- Pagamentos: o aviso da InfinitePay só vale com o valor certo e uma transação ainda não usada. Vale e cupom ficam reservados enquanto o link
  de pagamento está em aberto (24 h), para não serem usados duas vezes. Reserva aguardando pagamento não faz check-in.
- Textos que chegam do site nunca viram fórmula na planilha (proteção contra IMPORTXML/HYPERLINK).
- Limite de tentativas: login, link de senha e códigos de cupom/vale.
- Login e "Esqueci minha senha" não revelam se o CPF ou e-mail tem cadastro. Muitas tentativas erradas no geral deixam o login mais lento.
- Senha da equipe: no mínimo 10 caracteres. Professora/profissional só vê a própria agenda, sem CPF e WhatsApp, e não vê comissões das outras.
- O site tem política de segurança de conteúdo (CSP) no index.html e não abre dentro de outro site (proteção contra clickjacking).
- As pastas do Drive (anamneses e fotos) só são usadas se pertencerem à conta do sistema.
- Mantenha a planilha e a pasta de anamneses com acesso **Restrito** (nunca "qualquer pessoa com o link").

### Comanda editável, vale vendido e exclusão de cliente

- Na comanda aberta, cada item pode trocar de serviço e de profissional (a agenda acompanha), ter desconto em % ou R$ com motivo e uma observação.
  Tudo o que muda fica no **histórico** da comanda, com quem fez.
- **Vale-presente vendido**: entra como item da comanda (valor em R$ ou um serviço/plano). O código nasce ao fechar e pode ir por e-mail
  e WhatsApp para quem recebe. Vale de cortesia continua em Marketing → Vales.
- **Reabrir comanda fechada** (só administração, com motivo): desfaz pagamentos, estoque e comissões para corrigir e fechar de novo.
- **Excluir cliente** (só administração): sem histórico, o cadastro some; com histórico, os dados pessoais e de saúde são apagados
  e as vendas ficam como "Cliente excluído" (LGPD), sem mudar o financeiro.

### Cupons e vales-presente

- **Cupom**: desconto (% ou R$) que o aluno digita no pagamento; criado pela administração.
- **Vale-presente**: cortesia (Marketing → Vales) ou vendido na comanda. Dá uma aula/plano ou um valor em R$. A equipe gera, entrega por
  e-mail, WhatsApp ou no balcão, e o aluno usa em Meu plano → "Tenho um vale-presente".

## Publicação

Todo envio para a branch `main` publica o site no GitHub Pages pelo workflow `.github/workflows/deploy.yml`.
Primeira vez: no repositório, **Settings → Pages → Source: GitHub Actions**.

## Rodar no computador

```bash
npm install
npm run dev
```

## Fontes

O manual usa a fonte **Schoneheid** nos títulos. Ela não é gratuita na web, então o site usa a **Italiana**, que é parecida. Se a designer enviar os arquivos da Schoneheid (`.woff2`) com licença para web, basta trocá-la em `src/styles.css` (`--display`).
