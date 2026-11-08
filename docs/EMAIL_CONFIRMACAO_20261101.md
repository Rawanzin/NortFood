# Confirmação de e-mail — diagnóstico e correção parcial, 01/11/2026

**Missão ainda pendente: não há comprovação de envio, recebimento ou confirmação de e-mail real nesta rodada.** Não foi informado um destinatário de teste autorizado; nenhum e-mail foi disparado para diagnosticar o problema.

## Diagnóstico comprovado

Consulta pública atual ao projeto principal `zwkhqahivthzivmuirjr`: Auth responde HTTP 200, cadastro por e-mail habilitado e confirmação obrigatória. A homologação apresenta o mesmo contrato. Evidência sanitizada: `test-results/email-confirmation-20261101/public-readonly.json`.

A mensagem de limite foi relatada pelo usuário. Sem logs administrativos não é possível atribuí-la definitivamente ao SMTP padrão, ao Brevo, a remetente não verificado ou à configuração de cotas. O endpoint público de Auth não revela SMTP, limites administrativos, remetente, template remoto ou logs de entrega. Não foram inferidos esses campos a partir de um HTTP 200.

A [documentação oficial do Supabase](https://supabase.com/docs/guides/auth/auth-smtp) informa que o serviço padrão é restrito a testes e destinatários da equipe; o uso desse serviço pelo NortFood permanece não confirmado. Os [limites de Auth](https://supabase.com/docs/guides/auth/rate-limits) também incluem cotas e intervalo entre solicitações. Ajustar a interface não corrige credenciais, cotas ou entrega do provedor.

## Código revisado e correção independente

O formulário existente já impedia submit duplicado enquanto a mesma instância estava ocupada, e não reenviava automaticamente ao abrir. Faltava uma trava compartilhada entre instâncias do modal e uma espera após a resposta. Isso permitia novas tentativas rápidas, mas não comprova a causa da falha de envio observada.

- `src/application/mail-requests.js`: trava em memória por operação/e-mail normalizado, pedido em andamento e espera local de 60 segundos após uma tentativa. Não grava e-mail em armazenamento persistente, não agenda novos envios e não muda os limites do servidor.
- `src/backend.js`: reenvio e recuperação utilizam essa proteção; erro original conhecido do Supabase continua sendo apresentado. Erro SMTP ou limite não é transformado em sucesso. O intervalo local não promete que a cota do provedor estará disponível ao terminar.
- `app.js`: botão de reenvio mostra andamento/contagem, permanece desativado no intervalo e acompanha modal reaberto. Os campos completos de cliente e vendedor foram preservados.
- “Já confirmei — Entrar” continua abrindo o login; não confirma conta administrativamente nem contorna o Supabase. Callbacks continuam exigindo usuário confirmado pelo servidor e vínculo exato com token/sessão.
- Templates locais mantêm `{{ .ConfirmationURL }}`, imagem oficial, botão azul e link textual alternativo. Não foram aplicados remotamente nem considerados entregues. A mudança visual adicional foi adiada até comprovar o funcionamento técnico, conforme a ordem solicitada.

Backup dos arquivos anteriores: `backups/email-confirmation-20261101/`. Não houve alteração estrutural, migração, alteração de RLS ou escrita no banco remoto. Dan Burguer, contas, catálogo, pedidos e comissões não foram modificados.

## Acesso e intervenção indispensável

1. `supabase projects list` retornou `AccessTokenRequiredError`: a CLI não tinha sessão autenticada.
2. A inspeção do Chrome foi encerrada pelo Computer Use porque a URL atual não pôde ser determinada com segurança. Nenhuma sessão Supabase/Brevo foi lida ou alterada por essa tentativa.
3. O login oficial foi iniciado pelo agente. O fluxo exige que o proprietário autentique no navegador e digite o código no terminal; o processo sem interface acessível foi cancelado para não pedir esse código no chat.
4. A abertura de uma janela de terminal interativa foi rejeitada pela revisão automática com `blocked by policy`. Não foi tentado contornar esse bloqueio.

O proprietário precisa executar somente a etapa protegida:

```text
pnpm dlx supabase login --agent no --output-format text
```

Concluir o login e digitar o código apenas no terminal local. Entrar também em [Brevo](https://app.brevo.com/) e informar qual caixa de teste própria está autorizada a receber os ensaios. Não enviar senha, chave SMTP/API, token ou código de autenticação pelo chat. A sessão do navegador sozinha não autentica a CLI. A inspeção automatizada do navegador continua sujeita ao bloqueio descrito.

## Próximas ações após autenticação

- Consultar configuração e logs Auth do projeto exato; guardar somente indicadores sanitizados. Verificar SMTP personalizado, host, porta, remetente, Site URL, allowlist e limites efetivamente persistidos. Não despejar respostas com segredos.
- No Brevo, conferir conta transacional, remetente/domínio realmente pertencente ao responsável, autenticação SPF/DKIM e eventos de envio/bounce/bloqueio. Não inventar domínio ou endereço nem contratar plano.
- Usar `smtp-relay.brevo.com`, porta 587 com STARTTLS, login SMTP exibido na conta e **chave SMTP**, conforme a [integração oficial Brevo/Supabase](https://developers.brevo.com/docs/supabase-smtp-integration). Não confundir com chave API. Transferir dados apenas pelo fluxo protegido e preservar configuração anterior para reversão.
- Confirmar retorno Pages, sem desativar confirmação obrigatória nem proteções contra abuso. Código local usa retorno raiz Pages; `site_url`/allowlist do serviço ainda precisam de leitura administrativa.
- Configurar/publicar o template somente após comprovação técnica; manter `{{ .ConfirmationURL }}` integral e desativar reescrita de links pelo provedor quando aplicável.
- Com a caixa autorizada, executar um cadastro de cliente e um de vendedor, observar aceitação pelo provedor e recebimento/consumo reais, sessão e painel corretos. Em seguida recuperação com senha antiga recusada/nova aceita e reenvio respeitando intervalo. Não criar pedidos comerciais nem usar usuários reais como destinatários.

## Estados dos testes

| Verificação | Estado | Evidência / limite |
| --- | --- | --- |
| Auth e cadastro por e-mail habilitados; confirmação obrigatória | APROVADO | GET público atual, sem acesso a registros privados |
| Proteção contra tentativas repetidas, erro preservado e separação de operações | APROVADO | 3 testes novos; relógio controlado e nenhum e-mail real |
| Auth/callback/recuperação com SDK real | APROVADO local | 35 testes focados; transporte interceptado, sem prova SMTP |
| Modal não dispara e-mail ao abrir; um envio apesar de submit duplicado; espera visível | APROVADO local | 2 testes Chrome; `resend-browser.log`, sem serviço remoto |
| Remetente Brevo, SMTP habilitado, credenciais e logs | PENDENTE | Acesso administrativo indispensável |
| Conectividade local Brevo SMTP 587/STARTTLS | APROVADO | Certificado validado, sem AUTH e sem envio; não testa a rede do Supabase. `smtp-connectivity.json` |
| Cadastro real de cliente/vendedor e recebimento/consumo do e-mail | NÃO TESTADO | Aguardar caixa autorizada e configuração verificada |
| Recuperação/reenvio reais, falha SMTP e limite real | NÃO TESTADO | Sem disparos de teste ou tentativas de saturar cotas |
| Configuração efetiva de Site URL/allowlist/template remoto | PENDENTE | Configuração pública/frontend não comprova estado administrativo |
| Suíte completa | FALHOU — 230/231 aprovados | Durante a execução, ícones, manifesto e testes PWA foram alterados externamente para transparência; teste já iniciado exigia canto branco. Falha preservada em `full-suite.log`; não foi modificada para simular aprovação. |
| Sintaxe / arquitetura | APROVADO | 166 arquivos sem erro de sintaxe; 25 módulos sem ciclos/violações |
| Build e inspeção do pacote | APROVADO | Build inicial de 117 arquivos; pacote final combinado de 126 arquivos, sem segredos detectados pela auditoria do pacote |
| Prévia HTTPS final | APROVADO | 129 checks de arquivos/status e 18 cenários Chrome, zero erros JS; `merged-preview-package.json`, `merged-preview-browser.log` |
| Publicação principal da proteção de reenvio | APROVADO | Release `075e7f3ec4709ed78571`, 129 checks de arquivos/status e 18 cenários Chrome. Não representa SMTP ou entrega aprovada |

## Isolamento das alterações concorrentes do PWA

Durante os testes desta rodada, os arquivos de ícone/manifesto e seus testes foram alterados por outro trabalho. Foram preservados. O pacote de autenticação já havia sido gerado antes dessa alteração e foi copiado para uma pasta isolada, conferindo cada SHA-256. A comparação com a versão pública anterior comprovou mudanças somente em `app.js`, `assets/nortfood-backend.js`, `sw.js` e `release.json`; não inclui os novos ícones em andamento. Esse primeiro snapshot mantinha os ícones anteriores e não foi publicado no principal, porque a versão remota mudou. Isso evita misturar a correção de e-mail com o trabalho de PWA. Evidências: `package-diff.json`, `package-audit.json`, `public-backup.json`; 117 arquivos da versão anterior preservados para reversão. A suíte inteira do checkout concorrente não foi declarada aprovada.

Antes da publicação principal, a checagem detectou que outro trabalho já havia publicado `ed0f9acda6d4b1325761`. O primeiro deploy foi interrompido antes de escrever. Em seguida, foi utilizado o snapshot local dessa publicação, previamente verificado em `test-results/app-icons-nortfood.pages.dev.json`. Os dois arquivos de autenticação desse snapshot eram idênticos à base conhecida anterior; foi possível aplicar a correção sem perder alterações neles. O pacote final `.build/email-confirmation-merged` preserva todos os demais bytes, incluindo os novos ícones transparentes. Somente os dois arquivos Auth e os metadados de release/cache mudaram; `merged-diff.json` registra essa comparação. O verificador de pacote aceita uma raiz isolada por variável de processo, evitando depender de `dist-pages` concorrente.

## Publicação final e pendência principal

- Site oficial: [https://nortfood.pages.dev](https://nortfood.pages.dev).
- Release de conteúdo: **`075e7f3ec4709ed78571`**, baseada no PWA publicado `ed0f9acda6d4b1325761`.
- Deployment imutável: [https://bbc953f4.nortfood.pages.dev](https://bbc953f4.nortfood.pages.dev).
- Prévia final validada: [https://fc4f978f.nortfood.pages.dev](https://fc4f978f.nortfood.pages.dev).
- Base Git do checkout: `79f8f8cc617e3da5fe2aaaba1102cc95c50bebf6`. As alterações continuam não commitadas; esse SHA não representa o conteúdo publicado. O inventário SHA-256 e as verificações públicas identificam a versão efetiva. Nenhum push foi executado.
- Principal: **129/129 checks de arquivos/status e 18 cenários Chrome aprovados**, sem erros JavaScript. Evidências: `production-package.json`, `production-browser.log` e `browser/pages/browser.json` na pasta de resultados desta rodada.
- A verificação do navegador não enviou cadastro, reenvio ou recuperação reais. Os testes de caixa de entrada continuam **NÃO TESTADOS**.
- Na última verificação, a CLI continuava sem sessão autenticada. Configuração SMTP, remetente Brevo, logs reais e entrega/consumo permanecem **PENDENTES** da autenticação protegida e da caixa de teste autorizada. A missão de entrega real não está concluída.

O piloto comercial permanece bloqueado. Esta correção reduz tentativas repetidas no cliente; não representa uma resolução do SMTP nem uma aprovação de entrega real.
