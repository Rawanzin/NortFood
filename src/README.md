# Organização do frontend

O projeto conserva HTML/CSS/JavaScript e esbuild. Não há uma segunda aplicação ou migração de framework. `app.js` mantém a composição da interface existente e adapta o estado comercial às telas aprovadas. A Edge Function continua em TypeScript.

| Camada | Responsabilidade |
|---|---|
| `backend.js` | Composição do SDK, autenticação, RPCs e eventos. Único cliente Supabase do navegador. |
| `commercial.js` | Coordenação de comandos e aplicação das projeções às telas existentes. |
| `application/refresh-queue.js` | Serializar atualizações e preservar eventos de recuperação/sessão. |
| `application/snapshot.js` | Projeção pura do snapshot e validação do vínculo profile/user. |
| `application/catalog-images.js` | Resolver mídias com concorrência limitada a quatro. |
| `application/checkout.js` | Tentativas idempotentes por conta, recuperação de resposta incerta e armazenamento tolerante a falhas. |
| `application/session-commands.js` | Invalidar cadeias de comandos quando a identidade que as iniciou muda. |
| `data/signed-media.js` | Cache limitado e deduplicação de URLs assinadas, isolado por revisão de sessão. |
| `platform/http.js` | Timeout e cancelamento de transporte. |
| `platform/cart-storage.js`, `auth-storage.mjs` | Persistência de carrinho e escolha de duração da sessão, separadamente. |
| `presentation/finance.js`, `presentation/admin.js` | HTML administrativo e financeiro, sem acesso direto ao SDK. |
| `compatibility.js` | Conversão dos contratos PostgreSQL para as telas existentes. |
| `money.cjs` | Conversão estrita para centavos e arredondamento da comissão. |
| `qr-menu.js`, `pdf-export.js` | Funcionalidades existentes de cardápio/mesas, QR e exportação. |
| `demo/catalog.js` | Dados sintéticos carregados dinamicamente somente em demo explícita em loopback. |

## Contratos que devem permanecer

- O banco é a autoridade para identidade, preços, adicionais, zonas, estados, totais e comissões. Nenhum valor no carrinho ou cargo do navegador concede permissão.
- Uma atualização prepara catálogo, perfil, snapshots, administração e mídias fora do estado visível. Ela só publica depois de conferir a revisão da sessão, após o último await.
- Mudanças de identidade invalidam contexto administrativo, mensagens, notificações, históricos e mídias; carrinhos permanecem associados à respectiva conta. Antes de autenticar, só o carrinho de visitante pode ser selecionado.
- Uma resposta de checkout da conta A não pode limpar carrinho/navegar para pedido da conta B. Resposta incerta usa a mesma chave idempotente para consultar/repetir no servidor.
- Sem storage, a aba continua funcionando, mas não há garantia de recuperar o carrinho/tentativa após fechar a aba. A interface informa o limite; o servidor continua protegendo pedidos.
- O SW não guarda configuração, snapshots, HTML personalizado, respostas privadas/no-store, APIs ou tráfego autenticado. Navegação offline apresenta uma página explícita, sem simular pedido.
- O modo demo em loopback não cria cliente Supabase, mesmo que exista configuração pública principal no servidor local.

## Desenvolvimento e verificação

Execute `pnpm dev` para homologação local isolada. `pnpm build:homologation` gera o pacote isolado; `pnpm build` gera o candidato principal, sem publicá-lo. `assets/nortfood-backend.js`, `assets/pdf-export.js` e `assets/demo-catalog.js` são gerados de `src`; não editá-los à mão.

`pnpm test` executa a suite completa; `pnpm test:modernization` cobre os novos limites; `pnpm test:demo` mantém as jornadas demonstrativas separadas. `pnpm check:architecture` verifica ciclos e dependências entre camadas. `pnpm audit:homologation:read` consulta somente contratos anônimos por GET e não substitui auditoria SQL ou teste positivo com identidades independentes.

O build prepara uma saída completa em `.build/`, calcula a versão do SW pelo conteúdo, promove a pasta e remove a saída anterior somente após a promoção. Uma falha ao promover restaura a pasta anterior. Os arquivos da raiz usados pelo servidor local também são regenerados após a promoção; o diretório publicado é a saída do build. Arquivos obsoletos da saída anterior não são copiados ao novo pacote.
