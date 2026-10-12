# Relatório comercial — NortFood — 12/10/2026

## A. Resumo executivo

**NO-GO para lançamento.** A etapa local foi implementada diretamente no projeto existente, mantendo HTML/CSS/JavaScript, identidade vermelha/branca, componentes e o modelo de entrega pelo estabelecimento. Não existe projeto Supabase: os fluxos comerciais estão preparados, mas não certificados em serviço real. O modo padrão bloqueia operações sem configuração; o protótipo anterior permanece explícito em localhost com `?demo=1`.

Antes das alterações, foram examinados os pontos de entrada, renderizadores, eventos, armazenamento, autenticação, carrinho, pedidos, loja, relatórios, menus e testes existentes. O diagnóstico mostrou que grande parte das telas já existia, mas os dados e autorizações eram locais. A missão adicional foi atendida com uma camada de integração e banco, evitando recriar telas duplicadas. A comparação visual e o trabalho anterior estão registrados em AUDITORIA.md e RELATORIO.md; esses documentos de 11/10 não substituem a validação comercial desta etapa.

## B. Arquivos e preservação

Modificados nesta etapa: `app.js`, `index.html`, `README.md` e `tests/flows.cjs`. Criados: `config.js`, `.env.example`, `.gitignore`, `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `_headers`, `netlify.toml`, `IMPLEMENTACAO_STATUS.md`, este relatório e `VALIDACAO_COMERCIAL.json`.

Novos módulos: `src/backend.js`, `src/commercial.js`, `src/compatibility.js`, `src/money.cjs`. Scripts: `scripts/build.cjs`, `scripts/serve.cjs`, `scripts/public-config.cjs`. Build gerado: `assets/nortfood-backend.js` e diretório ignorado `dist/`.

Banco: `supabase/config.toml`, quatro arquivos em `supabase/migrations/` e `supabase/functions/upload-media/index.ts`. Testes: `tests/database.test.cjs`, `tests/commercial.test.cjs`, `tests/ui-contract.test.cjs`, `tests/supabase-live.cjs`. Guias: `docs/CONFIGURACAO_E_PUBLICACAO.md`, `docs/PILOTO.md`, `docs/CUSTOS.md`.

Branch: `codex/commercial-mvp-20261012`. Recuperação anterior em `%TEMP%/nortfood-recovery-20261012`, com ZIP, diff e status. Nenhum commit, push, reset, migração remota ou exclusão foi executado. As alterações anteriores e as imagens, logotipos, tema e categorias da edição concorrente foram preservados; esses assets não são criação desta etapa.

## C. Arquitetura

A interface existente continua responsável pela apresentação e pelo carrinho temporário. O adaptador converte UUIDs, centavos e snapshots do banco para os componentes atuais. O SDK Supabase cuida de autenticação/sessão e canais; o controlador encaminha operações sensíveis para RPCs e atualiza a interface com dados autorizados.

No modo comercial, usuários, pedidos, catálogo e comissões do protótipo local não são fonte de verdade. Contas/senhas antigas não são migradas para Auth. O SDK persiste sua sessão; somente o carrinho temporário usa persistência própria no navegador. O checkout guarda uma chave transitória de idempotência para recuperar resultado desconhecido sem repetir o pedido.

O build empacota somente a camada nova, sem trocar a tecnologia principal. A configuração publicada contém apenas modo, URL, chave pública e URL da aplicação; chaves privilegiadas são rejeitadas. Dependências: SDK Supabase, esbuild, Playwright e PGlite para testes locais.

## D. Banco de dados

Quatro migrações organizam 25 tabelas públicas e a tabela privada de administradores: perfis, lojas/membros/categorias, produtos/adicionais, endereços/zonas, pedidos/itens/opções/eventos, conversas/mensagens/leituras, notificações, avaliações, favoritos, configurações, ledger/quitações, auditoria e solicitações de dados.

IDs permanentes UUID, dinheiro inteiro em centavos, RLS e privilégios mínimos. Checkout transacional recalcula produtos, opções, taxa da zona, mínimo e total, exige loja aprovada/aberta e piloto habilitado, verifica endereço e congela valores. Chave de idempotência está vinculada ao cliente e ao payload. Mudanças de status exigem versão e transições permitidas.

A comissão nasce uma vez após entrega/retirada, sobre subtotal de produtos com taxa congelada no pedido; não inclui entrega. Ledger, quitações, auditoria e eventos são imutáveis. Ajustes e quitações administrativas exigem motivo e validação do saldo. Relatórios usam o fuso de São Paulo. Não há cobrança bancária nem geração automática de vencimentos contratuais.

## E. Telas e funcionalidades

| Área | Resultado local | Validação externa |
|---|---|---|
| Home, busca, categorias, lojas e cardápio | Reutilizadas; catálogo comercial separado da demonstração | Consulta pública/RLS no serviço pendente |
| Login, cadastro, sessão, recuperação e perfil | Integrados ao SDK/Auth; confirmação de e-mail respeitada | Auth/SMTP reais pendentes |
| Produto, adicionais e carrinho | UUIDs, seleção obrigatória e uma loja por pedido; confirmação antes da troca | Checkout SQL local aprovado |
| Endereço, revisão e pedido | Bairro/zona, entrega ou retirada, preço revisado e RPC idempotente | Fluxo real entre dispositivos pendente |
| Histórico e detalhes | Snapshots, paginação de pedidos antigos, rota de detalhe autorizada | PostgREST real pendente |
| Conversas, notificações, favoritos e avaliações | Integração autorizada; avaliação após conclusão; atualização por canal e polling | Realtime real pendente |
| Painel, catálogo e configurações da loja | Produtos/arquivo/reordenação, horários, abertura, zonas e status separados do cliente | Operação real e upload pendentes |
| Administração | **Nova área**: aprovação/suspensão, piloto, categorias, taxas, suporte e dados | Administrador real a provisionar |
| Financeiro administrativo | **Novas telas**: ledger, ajustes, quitações, resumo e exportação CSV | Contrato, cobrança e conciliação pendentes |
| Ajuda, privacidade e recuperação | Fluxos completados; solicitações administrativas e textos identificados como rascunho | Revisão jurídica e operação pendentes |

As novas áreas são acessíveis pela navegação com a identidade retornada pelo servidor. Cliente, loja e administrador permanecem separados. Nenhuma logística própria, pagamento aprovado fictício ou mensagem externa simulada foi acrescentada. Algumas funcionalidades estão implementadas no código, mas continuam **parciais para uso comercial** por falta da validação externa.

## F. Testes e resultados

- Sintaxe de `app.js`: aprovada. Build estático: aprovado, sem credenciais comerciais configuradas; operações permanecem bloqueadas.
- Suite local: **26 testes aprovados, zero falhas**. Inclui dinheiro/arredondamento, configuração pública, RLS/GRANTs, checkout, idempotência, isolamento, status/versionamento, comissão/ajustes/quitações, avaliações, chat, bloqueio do piloto e reordenação com UUID.
- PGlite executa as quatro migrações no motor PostgreSQL com esquemas auxiliares de Auth/Storage. Não comprova serviços Supabase hospedados.
- Chrome testa o modo comercial sem configuração e contratos de interface com respostas controladas: cliente, vendedor e administrador, formulários, carrinho, RPC, exportação CSV e larguras 320/360/390/430/768/1365. Essas respostas não são autenticação real.
- Protótipo preservado: **107 verificações aprovadas**, incluindo navegação, ações, fluxos locais e responsividade automatizada; nenhum erro JavaScript capturado.
- Servidor local: página e configuração retornaram 200; `.env`, fonte, scripts e configuração Supabase retornaram 404. Uma tentativa de iniciar segundo servidor encontrou porta ocupada; a verificação foi feita no processo existente, sem encerrá-lo. `git diff --check` aprovado, apenas avisos de conversão LF/CRLF.
- Teste Supabase real preparado, **não executado** por ausência de projeto/credenciais. Upload Edge, SMTP, dois dispositivos, falhas reais de rede, HTTPS, GPS, áudio físico e restauração de backup não foram certificados.

## G. Correções e segurança

Corrigidos nesta etapa: IDs por índice, confiança em preço/comissão do cliente, potencial repetição de checkout, mistura de dados demonstrativos com comerciais, permissões baseadas apenas na interface, estados de retirada, endereço sem bairro, identidade ao trocar sessão, exportação CSV com fórmulas e valores negativos e ausência de bloqueio administrativo do piloto.

RLS e RPCs defendem operações no banco, sem atribuir administrador por metadados de cadastro. Contexto autenticado é consultado no provedor. Erros de conexão bloqueiam operações e são apresentados. Não há armazenamento novo de senha em texto puro; credenciais demonstrativas anteriores continuam restritas ao protótipo local.

A função de upload valida origem, usuário, vínculo à loja, tamanho, MIME e assinatura; imagens ficam em bucket privado com URL assinada. **Ainda falta validação completa por decodificação, quotas, testes de abuso e execução real da função.** Limites de cadastro e armazenamento também precisam de revisão. Textos legais são rascunhos, não parecer jurídico. Não há declaração de segurança de produção.

## H. Publicação e operação

O guia detalhado está em docs/CONFIGURACAO_E_PUBLICACAO.md. Primeiro configurar um Supabase de testes e executar o roteiro em docs/PILOTO.md. Só então preparar produção, HTTPS, domínio, SMTP, backups/restauração, alertas, suporte, contratos e revisão de segurança. Netlify está preparado para publicar apenas `dist/`; nenhum deploy foi realizado.

A chave privilegiada de upload pertence exclusivamente ao ambiente servidor. As variáveis do teste real não entram no build. Nenhuma conta externa foi criada ou cobrada.

## I. Custos e limitações

docs/CUSTOS.md registra planos consultados e itens variáveis; custo real depende do plano contratado, uso, e-mail, domínio, backups e monitoramento. Não há contratação nesta entrega.

Além das dependências externas: a interface edita um grupo de adicionais por produto; não usar produtos de múltiplos grupos antes de ampliar a edição. Chat carrega últimas 100 mensagens sem paginação anterior. Vencimentos contratuais não são automáticos. Solicitações de dados têm registro e processamento administrativo, mas exclusão/retencão efetivas precisam de procedimento. Notificações são internas com navegador aberto; não há push. Pagamento é informado pelo estabelecimento, sem conciliação bancária.

## J. Decisão e continuidade

**NO-GO.** Há implementação concreta e validação local, mas não evidência suficiente de operação comercial. Próximo passo: projeto Supabase de testes, quatro migrações, administrador privado, Auth/SMTP e upload; depois testes reais, roteiro em dois dispositivos e revisão operacional/jurídica. Manter o piloto bloqueado no servidor até cumprir os critérios. O checkpoint em IMPLEMENTACAO_STATUS.md permite continuar sem recomeçar o projeto.
