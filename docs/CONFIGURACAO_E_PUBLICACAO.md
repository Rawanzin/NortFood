# Configuração e publicação do NortFood

Estado em 12/10/2026: **NO-GO**. Nenhuma conta de serviço, banco remoto, domínio ou publicação foi criada. Comece em um projeto de testes novo. Não use produção neste procedimento inicial.

## 1. Abrir o projeto e executar localmente

1. No Explorador de Arquivos, abra `C:\Users\keven\Documents\NortFood`.
2. Clique na barra de endereço, digite `powershell` e pressione Enter. O terminal deve abrir nessa pasta.
3. Digite `node --version`. O projeto foi testado com Node 24. Se não estiver instalado, use o instalador Windows na [página oficial do Node](https://nodejs.org/en/download), escolhendo a linha 24 LTS. Reabra o terminal depois da instalação.
4. Execute os comandos abaixo, um por vez:

```powershell
npx.cmd pnpm@11.25.0 install --frozen-lockfile
npx.cmd pnpm@11.25.0 build
npx.cmd pnpm@11.25.0 start
```

5. Abra `http://localhost:4173`. Sem configuração, a mensagem de Supabase pendente e o bloqueio de pedidos são esperados. Nenhuma loja de demonstração deve aparecer.
6. Para conferir apenas a interface antiga, abra `http://localhost:4173/?demo=1`. Essa demonstração é permitida somente em localhost/arquivo local. Ela não é uma operação comercial. Contas e pedidos dessa página não serão importados.

## 2. Criar o ambiente Supabase de TESTES

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard) com a sua conta.
2. Use a opção de criar projeto da organização, com nome `NortFood-testes`. Confira o plano e os custos antes de confirmar. A criação não foi executada pelo assistente.
3. Escolha a região próxima oferecida pelo painel e uma senha de banco exclusiva. Guarde a senha em um gerenciador; não a cole nesta conversa nem no JavaScript.
4. Espere o projeto terminar de iniciar. Confira que está no projeto de testes, e não em uma futura produção.
5. Abra **SQL Editor**, opção identificada na [documentação do banco](https://supabase.com/docs/guides/database/overview). Crie uma consulta e copie o conteúdo completo de cada arquivo abaixo. Clique em executar, um arquivo por vez, nesta ordem:

```text
supabase/migrations/202610120001_foundation.sql
supabase/migrations/202610120002_operations.sql
supabase/migrations/202610120003_storage_realtime.sql
supabase/migrations/202610120004_reporting.sql
```

6. Cada arquivo contém sua própria transação. Se aparecer um erro, pare e preserve a mensagem. Não tente resolver apagando tabelas. Não reaplique uma migração já executada. O procedimento manual deve ser registrado com data, arquivo e operador; ao usar CLI posteriormente, concilie o histórico de migrações antes de um `db push`.
7. Confira as tabelas criadas e a indicação de RLS habilitada no painel. O piloto nasce desabilitado no servidor. Apenas um administrador provisionado poderá autorizá-lo.

Alternativa técnica: usar Supabase CLI com migrações versionadas. O [ambiente Supabase local completo](https://supabase.com/docs/guides/local-development/cli/getting-started) exige um runtime de containers; este computador não possuía Docker na execução. O teste PGlite não inicia Auth/Storage/Realtime. Não executar `db reset` em banco com dados a preservar.

## 3. Copiar somente a configuração pública

1. No projeto de testes, abra **Connect** ou **Settings > API Keys**, conforme a [documentação de chaves](https://supabase.com/docs/guides/getting-started/api-keys).
2. Copie a URL do projeto e a chave **publishable** (prefixo `sb_publishable_`). A chave antiga `anon` também é aceita. **Nunca copie `service_role`, `sb_secret_`, senha do banco ou chave privada para a configuração do navegador.**
3. No Explorador, faça uma cópia de `.env.example` e dê o nome `.env`. Ative a exibição de extensões para evitar criar `.env.txt`.
4. Abra `.env` no editor e preencha somente:

```dotenv
NORTFOOD_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NORTFOOD_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
NORTFOOD_APP_URL=http://localhost:4173
```

5. Deixe variáveis de testes secretos vazias. Salve o arquivo. Ele está ignorado pelo Git.
6. Pare o terminal do servidor com Ctrl+C, execute novamente `npx.cmd pnpm@11.25.0 build` e `npx.cmd pnpm@11.25.0 start`.
7. Recarregue `http://localhost:4173`. A faixa deve informar que a plataforma está configurada, mas o piloto está bloqueado. Se houver erro de permissão/API, não habilite o piloto; confira migrações, chave e projeto.

O build e o servidor exportam apenas quatro campos públicos. As variáveis de serviço/teste não são copiadas para `dist`. Chaves administrativas são rejeitadas. A segurança dos dados depende adicionalmente das políticas do servidor, não do segredo da chave pública.

## 4. Configurar confirmação de e-mail e recuperação

1. No projeto, abra a área **Authentication**. Nas configurações de URLs, informe o endereço de teste (`http://localhost:4173`) e autorize o retorno para `http://localhost:4173/#settings`.
2. Mantenha confirmação de e-mail e confirmação dupla de mudança de e-mail. Configure senha mínima de 12 caracteres e proteções do provedor disponíveis no plano.
3. Configure SMTP próprio em **Authentication settings**, seguindo [a documentação atual de SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Credenciais SMTP ficam no painel do provedor, nunca no frontend.
4. Faça um cadastro de teste, confirme pelo e-mail e entre. Use Recuperar acesso e confira o e-mail recebido. Após o retorno, abra Configurações > Alterar senha para definir uma senha nova. A recuperação não exige a senha esquecida na interface.
5. Não declare confirmação/recuperação funcionando até realizar esses passos. O SMTP padrão possui restrições e não é indicado pelo Supabase para produção.

## 5. Provisionar o primeiro administrador

1. Cadastre e confirme uma conta real sua no Auth de TESTES pelo aplicativo, com senha exclusiva forte. Não use a conta local `cliente@demo.com`.
2. Somente você, no SQL Editor do projeto correto, execute a consulta abaixo após substituir `SEU_EMAIL_REAL` pelo e-mail confirmado:

```sql
insert into private.admin_users(user_id)
select id from auth.users where email = 'SEU_EMAIL_REAL'
on conflict(user_id) do nothing;
```

3. Confira que uma linha foi associada ao UUID correto. Se nenhuma linha foi inserida, confirme o cadastro/e-mail antes de tentar de novo.
4. Saia e entre novamente no NortFood. Perfil deve oferecer Administração. Uma conta comum não pode fazer essa associação pela API, por formulário ou por `localStorage`.
5. No painel, crie as categorias reais necessárias. Solicitações de lojas aparecem pendentes; aprove somente após verificar informações e autorização do responsável. O botão do piloto exige confirmação e justificativa, auditadas no servidor. Em testes isolados, habilite somente para executar o gate; no final, bloqueie novamente.

## 6. Mídia e atualização de pedidos

O código de upload está em `supabase/functions/upload-media/index.ts`. Ele verifica usuário, vínculo com loja, tamanho de até 1 MB, MIME e assinatura de PNG/JPEG/WebP. O bucket é privado e não oferece INSERT direto para clientes. Validação completa de decodificação, quotas cumulativas e testes contra arquivos maliciosos ainda precisam ser reforçados antes do lançamento.

Para implantar a função no projeto de TESTES, use a [CLI documentada](https://supabase.com/docs/guides/functions/deploy), versão consultada `2.120.0`:

```powershell
npx.cmd supabase@2.120.0 login
npx.cmd supabase@2.120.0 projects list
```

Confira o identificador do projeto de testes e então vincule/deploy a função. A CLI pode solicitar credenciais pelo seu próprio fluxo; não as copie para o código ou para a conversa.

```powershell
npx.cmd supabase@2.120.0 link --project-ref SEU_PROJETO_DE_TESTES
npx.cmd supabase@2.120.0 functions deploy upload-media
```

Configure `APP_ORIGIN=http://localhost:4173` como segredo de ambiente da função. Depois da hospedagem, use a origem HTTPS exata, sem barra final. Variáveis `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` são utilizadas apenas no runtime da função. Verifique no painel a configuração efetiva. `verify_jwt=false` não remove a autenticação: a função chama `auth.getUser()` e valida o vínculo; falhas retornam 401/403.

Teste upload válido, arquivo inválido, arquivo maior que 1 MB e tentativa de upload para loja alheia. Estes testes de serviço **não foram executados nesta tarefa**.

A migração adiciona pedidos, mensagens e notificações à publicação Realtime quando ela existe. A interface também consulta o estado a cada 15 segundos, recupera conexão e limita requisições a 12 segundos. O painel deve permanecer aberto. Push com navegador fechado não está implementado.

## 7. Executar testes

```powershell
npx.cmd pnpm@11.25.0 test
npx.cmd pnpm@11.25.0 test:demo
```

É necessário Chrome instalado. Para outro Chromium, configure `NORTFOOD_BROWSER` com o caminho do executável. Os testes criam contextos de navegador isolados. SQL é testado com PostgreSQL PGlite e identidades de teste; o teste de contrato da UI utiliza respostas controladas. Nenhum deles substitui o gate externo.

Para o gate real, copie `.env.example` para `.env.test` e preencha apenas localmente as variáveis `NORTFOOD_TEST_*`: URL, chave pública, chave secreta de serviço de **TESTES**, e-mail/senha do administrador provisionado e `NORTFOOD_TEST_CONFIRM_DISPOSABLE=yes`. Esse arquivo também é ignorado. **Não executar contra produção.**

```powershell
node --env-file=.env.test tests/supabase-live.cjs
```

Sem configuração, esse comando informa NÃO EXECUTADO e encerra com código 2. Ele usa Auth e sessões SDK independentes, cria dados de teste explicitamente identificados, verifica pedidos/RLS/Realtime/comissões e mantém os dados históricos. Ao terminar ou falhar após provisionamento, tenta bloquear o piloto e suspender a loja fictícia. Complete também o roteiro de dois navegadores em `docs/PILOTO.md`.

## 8. Preparar hospedagem HTTPS depois dos gates

1. Valide o checklist antes de habilitar pedidos ao público. Criar produção, domínio ou serviços pagos exige decisão específica do proprietário; não foram executados aqui.
2. Para um preview de testes, configure `NORTFOOD_APP_URL` com a futura URL HTTPS e gere `dist` por `npx.cmd pnpm@11.25.0 build`.
3. Em [Netlify Drop](https://app.netlify.com/drop), envie **somente a pasta `dist`**, conforme a [documentação de deploy manual](https://docs.netlify.com/manage/projects/add-new-project/). Não envie o projeto inteiro, `.env`, testes ou diretórios Supabase.
4. O resultado deve abrir por HTTPS. Como não havia conta conectada, nenhuma publicação foi feita nem seu certificado foi verificado.
5. Atualize a URL permitida de Auth e a origem da função de upload. Refaça cadastro, login, recuperação, pedido e Realtime usando o preview.
6. Verifique rotas `#shop/UUID`, `#orders` e `#admin` após atualizar a página. O projeto usa fragmentos, mantendo a arquitetura atual.
7. `netlify.toml` prepara build automatizado (`pnpm build`, saída `dist`, Node 24). `_headers` prepara CSP, bloqueio de frames, MIME e política de permissões. Confirme os headers efetivos no preview antes de aprovar.
8. Só conecte domínio definitivo e ambiente de produção após contrato, privacidade, SMTP, testes reais, backups/restauração e operação aprovados. Não copiar contas fictícias do ambiente de testes.

## 9. Backups, restauração e rollback

Código: ponto inicial em `%TEMP%/nortfood-recovery-20261012/workspace-before.zip` e diff `changes-before.patch`; branch `codex/commercial-mvp-20261012`. Preserve essa cópia. Não use reset destrutivo.

Banco: confira o plano e a política efetiva em [Backups Supabase](https://supabase.com/docs/guides/platform/backups). O projeto não tem banco contratado nem restauração verificada. Backups de banco não substituem cópias dos objetos Storage. Antes do piloto, faça uma exportação/backup, restaure em outro ambiente isolado e confira contas, pedidos, eventos, itens, mensagens e ledger; registre evidências e tempos. Não restaurar por cima de produção sem autorização e plano.

Rollback: bloquear novos pedidos pelo administrador; restaurar a versão anterior do frontend compatível com o banco; preservar pedidos já registrados; corrigir o esquema por migração aditiva. Não apagar tabelas, histórico financeiro ou usuários para voltar uma versão. Retenção e procedimentos de exclusão precisam de definição jurídica.
