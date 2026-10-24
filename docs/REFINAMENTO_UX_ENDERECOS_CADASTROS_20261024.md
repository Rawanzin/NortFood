# NortFood — refinamento visual, endereços e cadastros

Data: 24/10/2026. Documento interno; não integrar ao diretório público do deploy.

Endereço principal temporário: **https://nortfood.pages.dev/**.

**Resultado técnico:** melhorias publicadas e verificadas em HTTPS, versão `6af307dd6c0ecc08559c`. Cadastros completos em etapas, endereço e mapa secundário implementados; migração 012 aplicada com dados preservados. Novos cadastros foram habilitados no Supabase com confirmação obrigatória. Uma conta QA e seu perfil foram realmente criados; confirmação, sessão autenticada, Google, e-mails externos e pedidos comerciais ainda não foram aprovados.

## Interface e localização

- Identidade branca/off-white, vermelho e grafite preservada. Logotipos, banners e arquitetura existentes mantidos.
- Tipografia, rótulos, espaçamentos, cards, formulários, alvos de toque e modais padronizados. Inputs de 16px nos celulares; links legais em vermelho com sublinhado e consentimento legível.
- Cabeçalho agora oferece “Entregar em / Escolher endereço”, também no celular, preservando logo, busca e carrinho. Texto longo é truncado sem ultrapassar o espaço disponível.
- A seleção de entrega prioriza pesquisa explícita, localização atual, endereços da conta e preenchimento manual. O mapa deixou de ser o elemento principal e abre em diálogo secundário.
- Pesquisa não utiliza autocomplete nem gera consultas a cada caractere. GPS depende de ação explícita e sua permissão é opcional. Endereço aproximado e coordenadas precisam de conferência; GPS e mapa nunca salvam automaticamente o destino.
- Editor solicita rua, número, bairro, cidade, UF, CEP opcional, complemento e referência opcionais. Endereços podem ser adicionados, editados, selecionados e excluídos pelas operações existentes da conta.
- Busca de endereço dentro do cadastro usa diálogo próprio e devolve os campos ao mesmo formulário, preservando os demais dados. O mapa de explorar lojas permanece separado do fluxo de entrega; não foram inventados estabelecimentos ou pontos de lojas.
- Estados de carregamento, permissão de GPS negada, endereço não encontrado e serviço indisponível mantêm a alternativa de preenchimento manual.
- Atalhos do vendedor usam rolagem horizontal discreta no celular. Indicadores financeiros têm grid efetivo. Links com aparência de botão agora têm caixa completa, evitando bordas quebradas em textos com mais de uma linha.

## Cadastros restaurados

Os caminhos **Pedir | Vender** foram preservados. O cadastro é dividido em três etapas curtas: dados, endereço e acesso.

| Cliente | Vendedor |
|---|---|
| Nome completo | Nome completo do responsável |
| E-mail e celular com DDD | E-mail e telefone/WhatsApp comercial |
| Endereço de entrega completo | Nome do estabelecimento e categoria principal |
| Rua, número, bairro, cidade e UF | Endereço comercial: rua, número, bairro, cidade e UF |
| CEP, complemento e referência opcionais | CEP, complemento e referência opcionais |
| Senha e confirmação | Senha e confirmação |
| Aceite dos termos e Política de Privacidade | Aceite dos termos e Política de Privacidade |

A senha tem mínimo de **8 caracteres**, confirmação obrigatória e mostrar/ocultar independente. Não há exigência de maiúsculas, números ou símbolos. Validação e feedback são em português. A configuração salva do Supabase já usa mínimo de 8, sem composição adicional. A tentativa QA real com senha de 11 caracteres retornou HTTP 200 e criou usuário/perfil; isso não comprova confirmação por e-mail ou sessão.

Voltar entre etapas, abrir a busca de endereço ou receber falha controlada de autenticação preserva o formulário. Senhas permanecem somente na DOM enquanto o formulário está aberto; não integram localStorage, sessionStorage, rascunhos ou registros de onboarding. O rascunho mantém apenas campos permitidos e respeita o vínculo com a identidade da conta.

Vendedores continuam iniciando em rascunho, sem publicação ou liberação automática de pedidos. A configuração posterior da loja e a retomada do cadastro existente permanecem disponíveis ao usuário autenticado e autorizado.

## Banco principal e preservação

**Migração `202610240012_address_details.sql` APLICADA** no projeto principal Supabase **`zwkhqahivthzivmuirjr`**. Não foi aplicado SQL ao projeto de homologação e não foram reaplicadas migrações anteriores.

Antes da operação foi obtido e verificado backup privado. A comparação antes/depois confirmou:

- Registro de versões passou de 11 para 12 migrações.
- **32 tabelas existentes comparadas; todos os registros preservados**, políticas RLS inalteradas e usuários Auth inalterados.
- Dan Burguer preservada, sem duplicação ou recriação: **46 produtos, 20 grupos e 220 opções** de adicionais.
- Uma loja existente; nenhum pedido, perfil, administrador ou vínculo foi criado por esta migração.
- Nenhuma tabela de aplicação sem proteção RLS; execução anônima das RPCs sensíveis continua não autorizada (`anon=false`). A verificação de ACL não substitui um teste positivo entre contas autenticadas.

A migração é aditiva: CEP estruturado nos endereços, referência comercial na loja e atualização de `nf_save_address`, `nf_complete_onboarding` e `nf_save_store`. Validações, vínculo ao usuário, retomada idempotente e preservação dos dados comerciais existentes permanecem no servidor. Evidência de comparação: `test-results/ux-20261024/preservation-012.json`. Backups e seus conteúdos permanecem privados e excluídos da publicação.

## Páginas e testes efetivamente executados

| Verificação | Resultado | Limite da evidência |
|---|---|---|
| Suíte local completa final | **APROVADO — 166/166, zero falhas e zero skips**, 115.331 ms | Inclui PostgreSQL local e transportes controlados; não comprova Supabase Auth ou e-mails reais |
| Sintaxe | **APROVADO — 136 arquivos, zero falhas** | Análise local informada pela execução principal |
| Arquitetura | **APROVADO — 19 módulos, zero ciclos ou violações** | Análise local informada pela execução principal |
| Navegação visual local integrada | **APROVADO — 96 casos**, sem overflow horizontal ou erro JavaScript | Dados sintéticos em modo demo. Quatro navegações `#admin` nesse modo exibem início e não contam como prova de administração |
| Administração pelo código comercial | **APROVADO — 4 renderizações**, 360/390/430/1365px | SDK e contexto administrativo sintéticos; não comprova autorização administrativa real |
| Cabeçalho e seletor de entrega | **APROVADO — 8 larguras**, 320/360/375/390/412/430/768/1365px | Navegação local; alvo de 44–46px, sem colisão entre logo e ações |
| Cadastros cliente/vendedor integrados | **APROVADO — 6 casos**, 360/390/430px | Três etapas, diálogo de endereço, confirmação divergente, senha de 11 caracteres e erro Auth com transporte controlado |
| Altura reduzida | **APROVADO — 360×420 e 390×420**, botões alcançáveis | Simulação de viewport; teclado físico Android/iOS não testado |
| Verificador anônimo em localhost:4173 | **APROVADO — 8 verificações**, zero erros JS e zero consultas geográficas | Interface real integrada; nenhum cadastro enviado e nenhum endereço persistido |
| Criação real de conta e perfil | **APROVADO PARCIAL — API HTTP 200 e SQL confirmam uma conta QA e um perfil** | E-mail ainda não confirmado; a conta é identificada como teste, sem cargo administrativo ou loja |
| Cadastro completo autenticado de clientes/vendedores | **PENDENTE** | Endereço/onboarding remoto, login, logout e restauração de sessão dependem da confirmação real |
| GPS físico, teclado físico e instalação em dispositivo | **NÃO TESTADO** | Testes controlados e viewport reduzido não equivalem a hardware real |
| Pedidos comerciais completos | **NÃO TESTADO / BLOQUEADO** | Não houve envio de pedido ou aceite da loja |

Páginas renderizadas: início, pesquisa, favoritos, ofertas, ajuda, endereços, pedidos, perfil, notificações, conversas, configurações, loja e cardápio; painel do vendedor nas abas pedidos, cardápio, perfil da loja e vendas. Também foram renderizados, com conteúdo sintético, detalhe de pedido, chat, notificações, personalização de produto, carrinho e revisão de checkout para retirada, sem confirmar compra.

Foram encontrados e corrigidos dois defeitos adicionais durante a revisão integrada: botão “Criar conta” comprimido pela largura herdada do botão “Voltar” e dois controles de fechar no editor de endereço aninhado. Em 360px, a ação principal passou a 206px e “Voltar” mantém 88px. As novas capturas comprovam um único controle de fechar.

Evidências privadas: `full-suite-release.txt`, `routes.json`, `commercial-components.json`, `header-selector.json`, `signup-integrated.json` e capturas em `test-results/ux-20261024/`; verificador anônimo local e capturas em `test-results/ux-public-20261024/local/`.

## Bloqueios externos ainda existentes

| Fluxo | Impedimento comprovado | Próxima validação necessária |
|---|---|---|
| Bloqueio `signup_disabled` | **RESOLVIDO**: `disable_signup=false`, confirmação obrigatória preservada; uma criação QA real HTTP 200 persistiu usuário e perfil | Confirmar o e-mail e validar login/sessão/onboarding. Não confundir criação com cadastro completo autenticado |
| Login com Google | Provedor desligado, HTTP **400** `provider is not enabled` | Concluir entrada/salvamento protegido de Client ID e Secret, habilitar provedor, conferir URLs e executar OAuth completo com sessão válida |
| Confirmação e recuperação por e-mail | SMTP personalizado não configurado; Resend sem domínio verificado. Conta Brevo iniciada com nome/site oficiais e opção sem publicidade; onboarding exige endereço da organização | Usuário precisa preencher na tela o endereço que autoriza incluir nos e-mails. Depois concluir plano gratuito, verificação do remetente, liberação transacional e entrada protegida de credenciais; comprovar recebimento e uso dos links |
| Pedidos comerciais | Piloto e loja continuam bloqueados, além das pendências comerciais existentes | Homologar autenticação, checkout, recebimento, confirmação confiável, WhatsApp e configuração oficial da loja |

Não foram desativadas verificações de segurança para ocultar esses erros. Não foi declarado que o cadastro passou por haver um formulário completo ou por testes controlados aprovados. Client Secret e credenciais SMTP exigem o fluxo protegido de entrada pelo usuário; nenhum segredo deve ser enviado ao chat ou incluído neste documento.

## Arquivos principais alterados

- `app.js`, `refinements.css`, `index.html`: integração incremental de endereço, cabeçalho, cadastros e apresentação responsiva.
- `assets/delivery-address.js` e `.css`: seletor de endereço, confirmação estruturada, GPS solicitado e mapa secundário.
- `assets/signup-flow.js` e `.css`: etapas, validação acessível, preservação da DOM e integração da busca de endereço.
- `src/commercial.js`, `src/compatibility.js`, `src/platform/onboarding-draft.js`: CEP/referência, tradução dos dados e rascunhos sem senha. `assets/nortfood-backend.js` é o bundle gerado correspondente.
- `supabase/migrations/202610240012_address_details.sql`: única migração nova desta entrega.
- `scripts/verify-ux-public.cjs`, `scripts/verify-auth-browser.cjs` e verificações de build/sintaxe: validação da interface integrada e dos artefatos.
- Testes de endereço, cadastro, onboarding, temas, contratos de UI e banco foram ajustados aos fluxos atuais.

## Recuperação segura

O frontend pode retornar ao deploy Pages verificado **`99fcf5a4-6d14-4239-98b0-96b24e90bfec`**, versão `71a03a52e3b2e3c9e473`. Esse identificador pertence ao Cloudflare Pages e não é um commit Git. O rollback deve selecionar o deploy existente ou seu pacote sanitizado preservado, mantendo a hospedagem e o projeto atuais.

**Manter a migração 012 no banco.** Ela foi aplicada uma única vez e mantém compatibilidade com o frontend anterior; reverter o frontend não exige remover colunas, funções, dados ou registros de migração. Não reaplicar 001–012 e não restaurar o backup sobre produção como procedimento de rollback de interface. Qualquer futura alteração no banco exige nova verificação de destino e versão.

## Publicação e verificação HTTPS

- URL principal: **https://nortfood.pages.dev/**. Mesmo projeto Pages e Supabase; não houve troca de hospedagem ou criação de outro backend.
- Deploy final: **332a778b-0dda-4284-9c26-d3ed0084f2c3**, URL imutável https://332a778b.nortfood.pages.dev/.
- Versão: **6af307dd6c0ecc08559c**; código público **61f14b515b2c0a2cc77a3ab587b26f0e2c535893**, enviado a `release/nortfood` com `[skip netlify]`.
- Build Pages e auditoria: **APROVADOS**, 102 arquivos e 23.187.777 bytes. 101 arquivos servidos foram comparados por SHA-256 e todos responderam HTTP 200; `_headers` é configuração da plataforma, não arquivo público.
- Sete caminhos internos/inexistentes retornaram 404. Headers HTTPS/CSP/nosniff e políticas de cache foram verificados.
- **8 verificações públicas de UX**, **19 de formulários/erros Auth** e **18 de navegação/piloto** passaram, sem erros JavaScript. Esses 45 checks não equivalem a 45 jornadas autenticadas.
- Mapa: teste real encontrou uma corrida entre a animação de centralização e a resposta da identificação de endereço. O defeito foi reproduzido com Leaflet e atraso controlado de 400 ms; a correção desativa somente a animação programática por clique/GPS e preserva o descarte de respostas quando o usuário muda o ponto. Regressão e segunda suíte completa **166/166** passaram.
- Após a correção, identificação real do ponto escolhido: **HTTP 200 / APROVADO**, endereço mostrado para conferência e **não salvo automaticamente**.
- Pesquisa da rua/número da Dan Burguer: **HTTP 200, zero resultados / PENDENTE**. O serviço OpenStreetMap não localizou esse endereço específico. Há estado de endereço não encontrado e preenchimento manual; não foram inventadas coordenadas ou resultados.
- Atualização PWA real de **9975f150b284b2b1a29e → 6af307dd6c0ecc08559c**: **APROVADA**, formulário digitado preservado até a confirmação, versão nova ativada e caches antigos removidos. Auth, REST, Supabase e config não foram armazenados no cache público. Sessões autenticadas e instalação física permanecem não testadas.
- Chamada anônima real de onboarding: **HTTP 401 / 42501**, negada. Operação comercial continua bloqueada no servidor.

## Configurações externas e registros reais desta execução

Após autorização específica do usuário, foram salvos Site URL `https://nortfood.pages.dev`, retornos exatos com/sem barra e origem JavaScript do Pages no cliente Google existente. Netlify e callback `https://zwkhqahivthzivmuirjr.supabase.co/auth/v1/callback` foram preservados. Cadastros estão habilitados, confirmação de e-mail ligada, login anônimo e vínculo manual continuam desligados. Não houve alteração de senha ou nova chave privilegiada.

Uma conta QA com alias da caixa Gmail do administrador autorizado foi criada por API real e identificada como teste; SQL confirmou **1 usuário Auth, 1 perfil, e-mail não confirmado**, sem duplicação da Dan Burguer ou criação de outra loja. A senha sintética de 11 caracteres existiu somente na memória do processo de teste; não foi gravada em relatórios, storage ou rascunhos. Uma tentativa anterior com domínio reservado foi recusada como `email_address_invalid`; não foi interpretada como erro de SMTP nem sucesso. Não foram apagadas contas para limpar os testes.

Os snapshots de preservação antes/depois da migração 012 mostram usuários inalterados naquele momento (zero); a conta QA foi acrescentada **posteriormente**, como ação de teste separada. Os 46 produtos, 20 grupos, 220 opções e a única loja Dan Burguer foram mantidos.

O formulário protegido Google apresentava um e-mail no campo Client IDs e provedor desligado. O usuário ficou de corrigir Client ID/Secret e salvar. Não foram lidas ou copiadas chaves secretas pelo agente. O último diagnóstico real ainda indicava Google desligado e HTTP 400; nenhuma sessão OAuth foi declarada válida.

A documentação oficial confirma que o [SMTP padrão do Supabase](https://supabase.com/docs/guides/auth/auth-smtp) é limitado a destinatários autorizados da equipe, tem cota pequena e não serve como entrega geral de produção. O [catálogo oficial de erros](https://supabase.com/docs/guides/auth/debugging/error-codes) distingue endereço reservado inválido, endereço não autorizado, limite e falha de envio. A conta QA recebida pelo servidor não comprova recebimento na caixa postal nem envio a clientes externos.

A [Brevo documenta](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders) tratamento de remetentes gratuitos/não autenticados, com substituição por endereço compatível. Isso não elimina verificação de remetente, aprovação transacional ou teste de recebimento. Nenhum SMTP funcional foi inventado; nenhum Gmail foi configurado como remetente Resend sem verificação.

## Intervenções humanas pendentes

1. **Google/Supabase, tela protegida já aberta:** corrigir Client IDs e Secret do NortFood Web, ativar provedor e salvar. As duas opções de relaxamento de nonce/e-mail devem continuar desligadas. Usuário já confirmou que fará a entrada; ainda falta a confirmação de salvamento e o ciclo OAuth real.
2. **Brevo, tela “Qual é o endereço da sua organização?” já aberta:** informar o endereço oficial que pode constar nos e-mails. Esse dado não existe confirmado para o NortFood; o endereço da Dan Burguer não foi reutilizado. A autorização de conta gratuita e Termos já foi recebida, não precisa ser repetida.
3. Depois das etapas anteriores, entrada protegida de nova credencial SMTP e eventual código/validação do remetente serão necessários se o serviço exigir. Não enviar senhas, chaves ou códigos no chat. Aprovações de fornecedor que não dependem do agente permanecem pendentes até o retorno real.

Evidências privadas principais: `test-results/ux-20261024/pages-package.json`, `full-suite-release.txt`, `signup-mail-gate.json`, `public-ux-first-attempt.json`; `test-results/ux-public-20261024/pages/browser.json`; `test-results/auth-definitive/pages/browser.json`; `test-results/recovery-20261024/pages-https.json`, `pages-storage-security.json` e `pwa-live-update.json`. Capturas mostram Supabase, Brevo e a interface HTTPS, sem revelar segredos.

Nenhuma contratação paga, domínio novo ou migração de hospedagem foi realizada. Não houve tentativa de consumir a cota bloqueada de publicação Netlify. Pedidos comerciais reais seguem **BLOQUEADOS**, aguardando homologação e os dados comerciais oficiais pendentes.
