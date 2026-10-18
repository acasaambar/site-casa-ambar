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
