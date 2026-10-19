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
| Professora | só as próprias aulas: lista de presença e ficha de saúde das alunas |

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

### Cupons e vales-presente

- **Cupom**: desconto (% ou R$) que o aluno digita no pagamento; criado pela administração.
- **Vale-presente**: cortesia (não é vendido). Dá uma aula/plano ou um valor em R$. A equipe gera, entrega por
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
