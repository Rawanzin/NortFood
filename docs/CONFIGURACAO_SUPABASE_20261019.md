# Verificação do Supabase — 19/10/2026

**Resultado final:** backup validado e migrações 002–007 aplicadas. A 001 não foi repetida. Consulte [RESULTADO_SUPABASE_20261019.md](RESULTADO_SUPABASE_20261019.md). As seções abaixo registram a auditoria anterior à aplicação; estados de espera e respostas 404 ali descritos são históricos. A função Edge de upload, porém, permanece sem deploy.

## Estado e bloqueio de produção

A 001 foi aplicada pelo responsável. O agente não a modificou nesta etapa; SHA-256: `AD69B835FCF6575BD9DA1CE627A5EC8241AA45704D617A2531B139E5CF75FB16`. A confirmação do histórico SQL remoto depende de acesso autenticado ao PostgreSQL. Sinais da Data API não substituem esse histórico.

Não executar alterações em produção sem backup validado e inventário remoto. O roteiro abaixo não é uma declaração de aplicação. O teste `test:live` cria dados e altera a configuração de piloto: não foi executado em produção.

O responsável confirmou a redefinição da senha. Aberta janela protegida do PowerShell para a nova entrada, com host oficial do Session Pooler, usuário completo, porta 5432 e SSL obrigatório. Na última conferência, o manifesto estava em `AGUARDANDO_SENHA_SEGURA`: a nova autenticação ainda não foi tentada e nenhum `.dump` foi gerado. Nenhuma migração ou configuração remota foi alterada. Essa entrada pessoal, sem envio de senha pelo chat, é a intervenção indispensável pendente.

## Correção da conexão do aplicativo

O `.env` local continha `/rest/v1/` no final da URL do projeto. O SDK acrescentava novamente os caminhos de Auth, REST e Storage. Corrigida somente a URL para a raiz do projeto. `scripts/public-config.cjs` agora rejeita caminhos, consultas e fragmentos; o teste cobre essas entradas. `.env.example` explica o formato. Nenhuma senha ou chave administrativa foi adicionada ao frontend.

Após a correção, consultas HTTP GET com a configuração pública retornaram:

| Verificação sem alteração de dados | Resultado |
| --- | --- |
| Auth `/settings` | 200; cadastro habilitado, confirmação de e-mail habilitada |
| Categorias públicas, limite 1 | 200; nenhum registro |
| Catálogo e estado operacional RPC | 404 / PGRST202 |
| Colunas `latitude`, `longitude`, `tables_enabled`, limite zero | 400 / coluna ausente |
| Coluna interna `status_reason`, limite zero | 200; permissão de seleção presente, nenhum valor consultado |

Esses resultados são compatíveis com a base 001 sem as extensões posteriores. A 002 restringe a coluna interna. Não foram lidos motivos administrativos para demonstrar o problema. Erro de senha PostgreSQL é separado da URL incorreta do SDK.

## Migrações revisadas e ordem

Depois do backup e da conferência em `supabase/checks/deployment_inventory.sql`, aplicar **somente os arquivos comprovadamente pendentes**, na sequência:

1. `202610120002_operations.sql`: autorização das RPCs, preços e checkout no servidor, grants restritos.
2. `202610120003_storage_realtime.sql`: bucket privado, proteção dos históricos, publicação restrita.
3. `202610120004_reporting.sql`: relatórios, quitações/ajustes e cursor composto.
4. `202610150005_store_location.sql`: coordenadas de loja e snapshot de retirada.
5. `202610170006_qr_tables.sql`: QR estável, mesas e pedidos presenciais no sistema de pedidos existente.
6. `202610190007_media_upload_limits.sql`: reservas de upload autorizadas somente ao serviço de servidor.

**Não repetir a 001.** Em instalação descartável nova, ela continua sendo pré-requisito das demais. Execuções manuais anteriores podem não constar de `supabase_migrations`; não usar `db push` indiscriminadamente nem deduzir pendências apenas da ausência de histórico.

As migrações criam/alteram estruturas, políticas, triggers e funções. A 005 move a implementação base da edição de loja para `private`, preservando a entrada autorizada. A 006 substitui funções para suportar atendimento por mesa e substitui restrições de estados/modalidades; não apaga tabelas nem registros. Não há `DROP TABLE`, `TRUNCATE` executado ou limpeza de dados durante a aplicação. Triggers `BEFORE TRUNCATE` servem para impedir truncamento. A 003 adiciona metadados do bucket; sua guarda interrompe a transação diante de configuração incompatível, sem tornar um bucket existente público.

Exclusões dentro de RPCs não são executadas durante o DDL: exclusão autorizada de endereço próprio e substituição de vínculos de categorias na edição da loja continuam ações de usuário. Ajustes financeiros são lançamentos adicionais, sem reescrever a cobrança original. A 007 não modifica lançamentos, pedidos, lojas ou imagens anteriores; acrescenta tabela privada, índice e função.

## Upload de imagens

O bucket continua privado; escrita direta por `anon` e `authenticated` permanece bloqueada. A função verifica origem, token com `auth.getUser()` e vínculo real com a loja. Caminho e nome aleatório são escolhidos pelo servidor. `service_role` permanece exclusivamente no servidor.

Adicionados limite de leitura do corpo multipart, inspeção estrutural e decodificação/regravação real via `@imagemagick/magick-wasm@0.0.44`, com remoção de metadados, inclusive GPS. Aceita PNG, JPEG e WebP estáticos, até 1 MB, 4 megapixels e 4096 pixels por lado. Limites de memória e quantidade de imagens são aplicados no decodificador. O mesmo inicializador é exercitado nos testes; um limite de listas excessivamente restritivo foi corrigido após falha real no Deno.

A nova RPC reserva tentativas atomicamente por loja: 10 por minuto, 100 por 24 horas e até 500 objetos existentes. Erros de decodificação/upload após a reserva consomem a tentativa. São limites técnicos iniciais explícitos; não existe cobrança de armazenamento implementada. Não há limpeza automática das reservas nem de imagens órfãs nesta etapa.

A leitura de bucket privado deve continuar por URL assinada autorizada, nunca por uma URL pública presumida. O WASM é dependência de desenvolvimento/teste e importação da função de servidor; não integra o bundle do navegador.

**Pendente no serviço real:** aplicar 007, implantar a função com o WASM, configurar `APP_ORIGIN`, validar os segredos exclusivamente no servidor, a inclusão do arquivo WASM no deploy, CORS, token real, permissões, upload e URL assinada no Storage. `deno check` e execução local do decodificador não comprovam deploy no Supabase. Nenhum bucket foi aberto para contornar esses requisitos.

## Permissões e regras preservadas

`owner` e `staff` continuam com os mesmos poderes de membro existentes; não há política de negócio definida para diferenciá-los. Edição de loja/localização, produtos, mesas, pedidos, mensagens e upload seguem esse vínculo. Nenhum deles recebe poderes administrativos da plataforma. A distinção futura deve ser decidida explicitamente.

Comissão: somente conclusão gera cobrança positiva, uma por pedido, com vencimento no mesmo `completed_at` salvo + 7 dias. Base de produtos após descontos, sem entrega. Ajustes/quitações não reiniciam prazo; saldo vencido é positivo e vence inclusive no instante exato. Histórico ordena por data e UUID, usando ambos no cursor. Localização de retirada preserva snapshot do pedido; mapas não rastreiam clientes.

## Evidências e limites dos testes

- Resultado desta execução: **59/59 testes** da suíte principal aprovados; **107 verificações** do fluxo demonstrativo aprovadas. Build estático e `deno check` aprovados. Execução Deno/WASM aprovou PNG, JPEG e WebP com os limites de produção locais.
- Suíte Node/PGlite: migrações em PostgreSQL embarcado descartável, RLS, grants, isolamento, comissão, concorrência/idempotência, cursor, localização e mesas. Não inicia os serviços gerenciados Auth/Storage/Realtime.
- Testes de navegador locais: demonstração e contratos/QR; não comprovam login ou pedidos em produção.
- Upload: processamento real dos três formatos no Node e no Deno com WASM; quotas e ACL em PGlite. Não é um upload remoto.
- Transporte de senha: clientes PostgreSQL nativos e servidor de teste local; senha fictícia. Não demonstra aceitação da nova senha pelo projeto remoto.
- Build estático e verificação TypeScript da função via Deno. Não existe script de lint dedicado neste projeto.
- Verificações remotas citadas acima: somente HTTP GET, sem criação de usuários, pedidos ou mudanças de configuração.

O PostgreSQL local instalado não dispõe dos arquivos de servidor necessários para `initdb`; não foi executada restauração isolada de produção. `pg_restore --list` e leitura integral de arquivo comprovam legibilidade, mas não substituem ensaio de restauração. Backup SQL também não inclui os arquivos binários do Storage, segredos de funções, configurações de Auth/SMTP, domínio ou integrações externas; estes precisam de proteção separada.

## Avisos e decisões antes de operação real

Tabelas privadas sem políticas podem gerar avisos: RLS habilitado sem políticas bloqueia clientes intencionalmente; funções autorizadas operam com proprietário controlado e `search_path` vazio. Funções `SECURITY DEFINER` e alterações de políticas/constraints podem receber alertas genéricos do SQL Editor; avaliar o conteúdo, sem removê-las para ocultar avisos. Configurações gerenciadas de Auth (SMTP, proteção de senhas, limites e URLs) precisam de conferência no painel, assim como o esquema `private` fora da Data API.

Ainda faltam evidências de login/cadastro reais com confirmação, autorização de estabelecimento, upload implantado, recebimento Realtime entre duas sessões, mensagens e pedido completo em ambiente de homologação. Domínio público/HTTPS, SMTP e provisionamento administrativo precisam de configuração verificada. Não habilitar o piloto automaticamente. **Marketplace não está aprovado para operação real somente pelos testes locais.**

Referências oficiais consultadas: [Image Manipulation / WASM](https://supabase.com/docs/guides/functions/examples/image-manipulation), [Database Backups](https://supabase.com/docs/guides/platform/backups) e [Download Objects / metadados versus arquivos](https://supabase.com/docs/guides/storage/management/download-objects).
