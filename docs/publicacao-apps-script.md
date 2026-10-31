# Publicar o Apps Script sem o login do clasp vencer

O workflow **Publicar Apps Script** usa a API oficial do Google quando existem os segredos
`GAS_CLIENT_ID`, `GAS_CLIENT_SECRET` e `GAS_REFRESH_TOKEN`. Sem eles, continua com o clasp (`CLASPRC_JSON`),
que vence a cada ~16 h por causa do "Controle de sessão do Google Cloud" do Google Workspace.

Faça tudo logado na **conta Google da Casa que é dona do Apps Script** (a mesma que fez a implantação). Uma vez só, ~20 min.

1. Abra **console.cloud.google.com** → no topo, "Selecionar projeto" → **Novo projeto** → nome `Casa Ambar Publicacao` → Criar. Espere e selecione esse projeto.
2. Menu ☰ → **APIs e serviços → Biblioteca** → procure **Apps Script API** → **Ativar**.
3. Menu ☰ → **APIs e serviços → Tela de permissão OAuth** (pode aparecer como "Branding" / "Público-alvo"): tipo de usuário **Interno**. Se só aparecer "Externo", escolha Externo e depois clique em **Publicar app** (status "Em produção"; em "Teste" o token vence em 7 dias). Nome do app `Publicacao Casa Ambar`, e-mail de suporte da Casa. Salvar.
4. Menu ☰ → **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth** → tipo **Aplicativo da Web** → nome `GitHub Actions` → em **URIs de redirecionamento autorizados** adicione exatamente `https://developers.google.com/oauthplayground` → **Criar**. Guarde o **ID do cliente** e a **Chave secreta do cliente** num lugar seguro (nunca no chat nem no código).
5. Abra **https://developers.google.com/oauthplayground** → engrenagem (canto direito) → marque **Use your own OAuth credentials** → cole o ID e a chave secreta do passo 4.
6. No passo 1 do Playground, na caixa **Input your own scopes**, cole
   `https://www.googleapis.com/auth/script.projects https://www.googleapis.com/auth/script.deployments`
   e clique **Authorize APIs**. Entre com a conta da Casa e aceite.
7. No passo 2, clique **Exchange authorization code for tokens** e copie o **Refresh token** (começa com `1//`).
8. GitHub → repositório → **Settings → Secrets and variables → Actions → New repository secret**: crie `GAS_CLIENT_ID`, `GAS_CLIENT_SECRET` e `GAS_REFRESH_TOKEN`. `SCRIPT_ID` e `DEPLOYMENT_ID` continuam como estão.
9. Confira que a Apps Script API está ligada em https://script.google.com/home/usersettings (já está, porque o clasp funciona).
10. GitHub → **Actions → Publicar Apps Script → Run workflow** (branch `main`). Ficou verde com "Implantação atualizada para a versão N"? Pode apagar o segredo `CLASPRC_JSON`.

Paliativo sem mexer em nada disso (só administrador do Workspace): admin.google.com → Segurança → Controle de acesso e dados → **Controle de sessão do Google Cloud** → "Nunca exigir reautenticação". Resolve na hora, mas afrouxa a segurança da conta no Google Cloud.
