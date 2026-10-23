# Homologação isolada do NortFood

## Estado e intervenção necessária

Atualização em **20/10/2026**: o projeto **NortFood-Homologacao** foi localizado e configurado na organização **NortFood FREE**, região São Paulo, identificador `zrczgghucwsaxqnyaapk`. A URL é `https://zrczgghucwsaxqnyaapk.supabase.co`. As migrações **001–007 já foram aplicadas neste projeto novo**, e seu histórico foi registrado. **Não reaplicar o bootstrap.** O principal e os projetos Rawanzin não foram alterados.

A configuração pública está em `.env.homologacao`, ignorada pelo Git; não é necessário procurar links ou preencher novamente a URL/chave pública. Auth usa `http://localhost:4174`, com dois retornos exatos, confirmação de e-mail ativa e senha mínima de 12 caracteres. `upload-media` foi implantada e sua origem permitida é somente `http://localhost:4174`; usa autenticação obrigatória no código, em vez da verificação legada incompatível com as chaves novas. O bucket permanece privado.

A entrada manual de chave foi **dispensada**: a credencial legada `service_role` já existente do projeto novo foi obtida pelo caminho oficial do painel e usada somente em memória, por IPC local e ambiente de processos de teste. Não foi criada/rotacionada chave nem consultada a senha do banco. O formulário de entrada protegida foi encerrado.

O gate autenticado e o recorte de interface de login/retirada/estados/chat/logout passaram com contas sintéticas sem cargo administrativo. Como `service_role` não possui UPDATE em `platform_settings`, não foram ampliados seus grants: a preparação/fechamento das fixtures foram feitos pelo SQL Editor somente na homologação. O piloto terminou bloqueado e nenhuma loja aprovada permaneceu visível. Não reaplicar migrações ou repetir esses testes no principal.

Para futuras execuções existem dois modos distintos: `scripts/Test-Homologacao.ps1`/`Start-HomologationSession.ps1` usam entrada protegida e operador previamente autorizado; o modo de automação `scripts/homologation-session.cjs --ipc --service-fixtures` usa credencial existente em memória, não cria administrador e depende da aplicação das fixtures SQL preparadas em `test-results/homologation/`. Não confundir esse preparo de dados com teste das RPCs administrativas de aprovação/quitação; elas continuam pendentes de operador autorizado. Nunca enviar credenciais pelo chat.

Resultados e limites atuais: [HOMOLOGACAO_RESULTADO_20261020.md](HOMOLOGACAO_RESULTADO_20261020.md). Os testes de API e interface autenticada são remotos; a suíte de 76 testes e as cinco regressões focadas posteriores são locais. Confirmação/recuperação por e-mail ainda precisam de caixa postal de testes e configuração de envio.

Ainda falta escolher SMTP/remetente verificado. Isso bloqueia a prova de cadastro público, confirmação e recuperação por e-mail, mas não impede preparar o schema e testar outras APIs com contas de teste provisionadas. Não desative confirmação de e-mail.

## Separação dos ambientes

| Principal | Homologação |
|---|---|
| Configuração existente em `.env` | Configuração exclusiva em `.env.homologacao` |
| Servidor local habitual na porta 4173 | `pnpm start:homologation`, porta **4174** |
| Não recebe fixtures | Somente dados sintéticos claramente identificados como TESTE |
| Migrações 001–007 já aplicadas | Schema novo recebe 001–007 uma única vez |

O servidor de homologação não lê `.env` do principal. Exporta ao navegador somente modo, URL de testes, chave pública de testes e `http://localhost:4174`. O executor bloqueia explicitamente a URL do principal, exige declaração de destino descartável e não aceita endpoints externos arbitrários. Não se deve copiar backup, arquivos Storage, usuários ou dados pessoais de produção.

Copie `supabase/homologacao.env.example` para `.env.homologacao`, que é ignorado pelo Git. Preencha somente os campos públicos e a confirmação `NORTFOOD_TEST_CONFIRM_DISPOSABLE=yes` depois de identificar o projeto novo como descartável. Prefira manter os campos secretos vazios e usar o terminal protegido. Não altere `.env` do aplicativo principal para testar.

## Preparação do schema e serviços — somente no projeto novo

Ordem exata das fontes, sem novas migrações:

1. `202610120001_foundation.sql`
2. `202610120002_operations.sql`
3. `202610120003_storage_realtime.sql`
4. `202610120004_reporting.sql`
5. `202610150005_store_location.sql`
6. `202610170006_qr_tables.sql`
7. `202610190007_media_upload_limits.sql`

`pnpm prepare:homologation` gera um SQL em `test-results/homologation/bootstrap-*.sql` após validar a configuração do destino. Ele **não conecta nem executa SQL**. Há também um template local já preparado em `test-results/homologation/bootstrap-template.sql`, sem credenciais ou dados pessoais. O gerador é a fonte reproduzível; não versionar resultados privados.

O SQL agrupa as sete migrações em uma transação e registra o histórico compatível com a CLI. Ele recusa destino com tabelas de aplicação/histórico, usuários Auth, objetos Storage ou publicação Realtime já ocupada. Foi testado localmente aplicando as sete migrações e recusando reaplicação sem perder uma loja existente. O piloto termina desabilitado; nenhuma conta/pedido demonstrativo é inserido pelo bootstrap. **Não executar esse arquivo no principal nem usar reset/restore/drop.** Em caso de erro, parar e investigar; não retirar os guardas.

Antes da execução, conferir o nome/ref do projeto no painel e o destino indicado no arquivo gerado. A proteção de banco vazio complementa essa conferência, não identifica sozinha todos os projetos possíveis. Não combinar o bootstrap com uma segunda aplicação dos mesmos arquivos pela CLI.

No novo projeto:

- Aplicar o schema preparado e conferir sete registros no histórico, RLS, publicação restrita e bucket privado. O registro de schema não habilita os serviços automaticamente fora do Supabase.
- Implantar **os três arquivos atuais** de `supabase/functions/upload-media` (`index.ts`, `media-validation.mjs`, `runtime-config.mjs`). Usar ref explícito de homologação para não depender de link da CLI com produção. Configurar **APP_ORIGIN=http://localhost:4174** somente nessa função/projeto. Segredos administrativos permanecem no servidor. A função continua exigindo `auth.getUser()` e vínculo com a loja; preservar a configuração de gateway compatível com as chaves atuais e não abrir escrita direta no Storage.
- Configurar Auth Site URL `http://localhost:4174`, retornos exatos `http://localhost:4174` e `http://localhost:4174/#settings`. Manter senha mínima 12, confirmação de e-mail e RLS. Não usar wildcard nem URL fictícia pública.
- Preparar um administrador **exclusivo de testes** no Auth e aprovar seu UUID exato em `private.admin_users` pelo SQL administrativo do projeto de testes. Não usar metadados de cadastro para conceder poderes. Essa configuração exige acesso administrativo ao projeto novo; não concede nada no principal.
- Configurar SMTP com remetente verificado para os testes de e-mail. Segredos apenas nas configurações protegidas do Supabase. Ver [SMTP.md](SMTP.md).

Referências oficiais consultadas em 19/10/2026: [ambientes separados](https://supabase.com/docs/guides/deployment/managing-environments), [implantação de funções](https://supabase.com/docs/guides/functions/deploy), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Não é necessário instalar Docker para criar esse projeto remoto separado.

## Execução segura dos testes de API

Depois do schema, função e administrador preparados, o script `scripts/Test-Homologacao.ps1` valida primeiro a URL pública de testes, solicita a chave secreta e a senha do administrador em entradas protegidas, e executa o gate. As credenciais não são gravadas em scripts/arquivos ou passadas como argumentos; ficam no ambiente do processo e são removidas/restauradas ao encerrar. A sintaxe foi verificada, mas os prompts e chamadas remotas ainda dependem do novo ambiente.

Alternativamente, com variáveis privadas já injetadas por mecanismo seguro: `pnpm test:homologation`. O resultado fica em `test-results/homologation/resultado.json`, ignorado pelo Git. `pnpm start:homologation` abre o frontend de testes; usar **sem `?demo=1`**.

O gate primeiro valida o destino, o administrador e o preflight de upload. Depois cria contas sintéticas com confirmação administrativa explícita e executa pedidos, transições, chat, notificações e eventos autenticados, edição de produto preservando snapshots, imagens sintéticas, leitura assinada, relatórios e comissões, além de tentativas indevidas. Não faz cobrança real. Contas/objetos/históricos de teste são preservados; ao encerrar tenta bloquear o piloto e suspender as lojas. Se falhar antes da limpeza, revisar o projeto de testes antes de repetir. Não existe exclusão automática de usuários ou histórico.

**Contas criadas por `auth.admin.createUser(email_confirm:true)` não validam cadastro público nem recebimento de e-mail.** O sucesso do gate é evidência de API, não aprovação de todos os fluxos da interface. O relatório mantém os fluxos completos pendentes até sua execução e comprovação.

## Checklist completo de homologação remota

Usar duas sessões independentes de cliente (A e B), duas de estabelecimento (A e B) e uma administrativa de testes. Identificar todos os registros como TESTE. Para e-mails, usar caixas dedicadas sob controle dos responsáveis, sem importar contas de produção. Senhas somente em campos/terminal protegidos. Guardar evidências sem tokens, links de recuperação completos ou conteúdo pessoal.

| Caso | Passos e resultado necessário para APROVADA |
|---|---|
| Cadastro de cliente | Pela UI em 4174, cadastrar cliente novo; conferir perfil no projeto de testes. Não substituir por criação administrativa |
| Confirmação de e-mail | Receber mensagem na caixa real de teste, abrir o link e comprovar confirmação/acesso. Testar reutilização/expiração sem expor o token |
| Login/logout | Entrar com conta confirmada, sair, confirmar recusa das operações protegidas e entrar novamente em sessão independente; testar lembrar/não lembrar |
| Recuperação | Solicitar pela UI, receber e consumir e-mail, definir senha protegida; nova senha entra e anterior é recusada. Não usar `admin.generateLink` como prova de entrega SMTP |
| Estabelecimento | Conta de vendedor solicita loja; fica pendente e invisível ao cliente; administrador de testes aprova; vendedor edita horários, categorias e abertura, sem alterar aprovação |
| Produtos | Cadastrar, editar preço/adicionais/disponibilidade, reordenar e arquivar pela UI; conferir banco e preservação dos valores de pedidos antigos |
| Imagens | Enviar imagem válida pela UI e conferir leitura assinada em outra sessão; rejeitar arquivo inválido, excesso de tamanho e upload para outra loja; impedir escrita direta no bucket |
| Carrinho/checkout | Cliente A adiciona itens, tenta trocar de loja com aviso, altera quantidade e confirma pedido; conferir total calculado no servidor, endereço/cobertura, retirada e idempotência. Preço manipulado deve ser recusado |
| Recebimento/transições | Vendedor A recebe e atualiza o mesmo pedido; cliente A acompanha; vendedor B não consegue alterar; testar versão desatualizada, cancelamento e recusa |
| Chat | A envia mensagem, vendedor A recebe e responde em outra sessão; atualização chega sem recarregar. B não pode ler nem enviar na conversa de A |
| Notificações Realtime | Observar eventos autenticados de pedido/mensagem em sessões distintas, sem contar polling ou broadcast público como prova. Reconectar e conferir persistência |
| Financeiro/comissões | Concluir pedidos, conferir base após descontos sem entrega, vencimento em completed_at + 7 dias, relatório, quitação parcial/total e ajustes. Cancelados não geram cobrança; não usar dinheiro real |
| Isolamento | Cliente B não lê endereços, pedidos, notificações ou conversas de A; vendedor B não lê/altera produtos, pedidos ou relatórios de A |
| Operações indevidas | Cliente/staff não ganham poderes administrativos por metadados; anônimo não grava pedidos; loja fechada/piloto bloqueado recusam compra; privado/Storage/RLS permanecem restritos |

Repetir UI em celular e computador, incluindo voltar/avançar, perda de conexão e mensagens de erro. O mapa de retirada deve manter o snapshot após mudança da loja. GPS deve continuar opcional. Homologação de UI em navegador automatizado não substitui um ensaio físico com o estabelecimento e o aparelho.

Cada caso deve registrar **APROVADA** somente com evidência remota correspondente, **REPROVADA** com erro reproduzível e **PENDENTE** quando não executado. Se apenas a API passou, registrar isso separadamente e manter a etapa de UI/e-mail pendente. Não alterar classificações apenas porque testes locais passaram.
