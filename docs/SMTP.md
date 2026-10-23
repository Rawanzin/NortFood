# SMTP — preparação pendente de provedor

## Resultado atual — captura configurada e homologada

Após autorização específica, Ethereal foi configurado exclusivamente no NortFood-Homologacao com TLS e templates `supabase/templates/homologacao-confirmation.html` e `homologacao-recovery.html`. Seis verificações remotas passaram: IMAP/TLS, cadastro público via API com login não confirmado recusado, confirmação recebida, login/logout, recuperação recebida/troca de senha e recusa de reutilização dos dois links. Repetidas com destino `https://lucky-lamington-022ea1.netlify.app`, também aprovadas. Evidências privadas: `smtp-capture-live-result.json` e `smtp-https-redirect-result.json` em `test-results/homologation/`.

O ensaio descobriu conflito de fragmentos com `/#settings`; frontend passou a retornar à raiz, e o evento PASSWORD_RECOVERY escolhe configurações. Falha original e regressão antes/depois preservadas. O roteiro consome links por SDK/HTTP; não é aprovação da jornada completa de troca de senha na UI HTTPS.

**A captura continua ativa somente na homologação e não entrega mensagens a clientes.** Credenciais permanecem na configuração criptografada do Supabase; não há senha no frontend, código ou relatório. Não inserir dados reais nem usar no principal. Para beta, permanece indispensável provedor com remetente verificado e teste de recebimento externo. Nenhum provedor pago/domínio foi contratado. [Fechamento detalhado](RESULTADO_PREVIA_HTTPS_20261020.md). Seções abaixo são histórico.

## Opções preparadas para a prévia protegida

Templates exclusivos de homologação adicionados em `supabase/templates/`, ainda não aplicados. Foi solicitada autorização para SMTP de captura Ethereal: gratuito e sem domínio, retém mensagens de teste e **não entrega e-mails a clientes**. A autorização segue pendente; nenhuma configuração remota foi alterada.

Brevo Free é candidato à entrega real (300 envios/dia segundo documentação atual), mas depende de conta e remetente/domínio autorizados. Não foi contratado serviço, criado remetente ou inventado domínio. Plano de configuração e fontes oficiais: [PREVIA_PROTEGIDA_20261020.md](PREVIA_PROTEGIDA_20261020.md). Os resultados de tokens abaixo permanecem separados de SMTP e entregabilidade.

## Continuação em 20/10/2026

O painel **NortFood-Homologacao** (`zrczgghucwsaxqnyaapk`) confirmou `Enable custom SMTP` desligado. Nenhuma credencial SMTP ou sessão de hospedagem autorizada foi encontrada na configuração disponível; não foi contratado provedor, criado remetente fictício ou desativada confirmação. O painel informa que os templates personalizados dependem de SMTP configurado.

Cinco verificações **remotas reais de tokens**, executadas sem envio de e-mail, passaram: login não confirmado recusado, confirmação aceita, confirmação repetida recusada, recuperação com troca real de senha (antiga recusada/nova aceita) e recuperação repetida recusada. As contas são sintéticas, e os links foram gerados pela API administrativa, sem atribuir cargo de administrador a ninguém. Isso **não aprova cadastro público, envio/recebimento ou links recebidos numa caixa postal**. Evidência privada: `test-results/homologation/auth-tokens-live-result.json`.

A configuração de retorno desta homologação é `http://localhost:4174` e `http://localhost:4174/#settings`; não copiar a configuração histórica do principal abaixo. O bloqueio mínimo restante é acesso autorizado a um provedor/remetente verificado e uma caixa controlada de testes. Credenciais somente por entrada protegida; não enviar segredos no chat. Depois desse acesso, a configuração técnica e os ensaios podem ser executados automaticamente.

Em 19/10/2026, o responsável confirmou que ainda não possui SMTP. Nenhum provedor foi contratado, remetente inventado ou configuração remota alterada nesta etapa.

## Preparado no NortFood

- Confirmação de cadastro e confirmação dupla de alteração de e-mail permanecem ativas em `supabase/config.toml`.
- O aplicativo utiliza Supabase Auth para confirmação e recuperação; não precisa receber senha SMTP no navegador.
- `NORTFOOD_APP_URL` e `NORTFOOD_AUTH_REDIRECT_URL` parametrizam os retornos. Neste momento: `http://localhost:4173` e `http://localhost:4173/#settings`.
- A allowlist remota é restrita aos destinos locais já homologados. Publicação exige domínio HTTPS definido e atualização explícita dos retornos e de `APP_ORIGIN` do upload.

## Dados necessários quando houver provedor

Obter host, porta, usuário SMTP, credencial de envio e remetente autorizado. Nome de exibição previsto: NortFood. Confirmar as configurações de transporte com o provedor, sem deduzir host ou porta.

Cadastrar os segredos exclusivamente na configuração protegida de SMTP do Supabase, por entrada protegida. Não adicionar senha SMTP a `.env` do frontend, exemplos, scripts, Git, chat ou logs. Configurar SMTP no painel remoto não depende de executar novamente as migrações.

Verificar o domínio de envio e configurar os registros DNS de autenticação exigidos pelo provedor. O serviço SMTP padrão do Supabase restringe destinatários e não se destina à produção. Referência consultada em 19/10/2026: [SMTP oficial do Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

## Homologação após configurar

1. Cadastrar uma conta de teste autorizada e conferir recebimento, destino e confirmação do link.
2. Testar login, saída, recuperação, alteração da senha e recusa da senha anterior; tratar senhas somente em entrada protegida.
3. Verificar expiração/reutilização de links, retorno correto ao aplicativo, spam e limites de envio.
4. Repetir no domínio HTTPS definitivo antes de liberar cadastros públicos.

Não desativar confirmação de e-mail para contornar falta de SMTP. Envio e recuperação por e-mail continuam sem homologação real; a preparação não remove o bloqueio de lançamento descrito em [BETA_20261019.md](BETA_20261019.md).
