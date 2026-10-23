# Localização e pendências SQL — 15/10/2026

## 1. Escopo e arquivos

Evolução direta do NortFood em HTML/CSS/JavaScript, sem trocar framework, dependências ou modelo de entrega. Não foram encontradas instruções AGENTS.md na árvore do projeto nem nos diretórios ancestrais consultados. Alterações anteriores de tema, identidade, categorias e documentação foram preservadas.

SQL modificado nesta etapa: `202610120002_operations.sql` e `202610120004_reporting.sql`. Nova migração: `202610150005_store_location.sql`. A 003 foi revisada e mantida com as proteções já existentes. A 001 foi somente lida; hash SHA256 preservado: `AD69B835FCF6575BD9DA1CE627A5EC8241AA45704D617A2531B139E5CF75FB16`.

Interface/integração: `app.js`, `src/commercial.js`, `src/compatibility.js`, `index.html`, `refinements.css`, `_headers` e novo `assets/store-location.js`. `assets/nortfood-backend.js` foi regenerado pelo build. Testes novos: `tests/location-finance.test.cjs`, `tests/store-location.test.cjs`; ampliado `tests/ui-contract.test.cjs`; comando test atualizado em `package.json`. Documentação: README, IMPLEMENTACAO_STATUS, CONFIGURACAO_E_PUBLICACAO, PILOTO e aviso histórico em AUDITORIA_MIGRACOES. A função de upload não foi modificada nem implantada nesta etapa.

## 2. Migrações e dependências

- **002:** grava vencimento da comissão e ordena snapshot de pedidos de modo determinístico. Não depende da 005; as operações originais continuam disponíveis antes das coordenadas.
- **003:** mantém bucket privado, limites, parser seguro de caminho, políticas restritivas, histórico imutável inclusive TRUNCATE e publicação Realtime restrita. Não depende da 005.
- **004:** inclui vencimento atingido no relatório e cria uma única assinatura de histórico com cursor composto. Não depende da 005.
- **005:** adiciona latitude/longitude de loja, constraints, grants por coluna, edição autorizada e trigger de snapshot de retirada. Depende das anteriores, especialmente da nf_save_store criada pela 002.

A 005 move a implementação anterior de nf_save_store para `private.save_store_base`, revoga sua execução dos papéis de clientes e recria o endpoint público com a mesma assinatura/nomes de argumentos. Não usa DROP nem CREATE OR REPLACE. A função privada mantém todas as regras existentes; o endpoint adiciona as validações da posição e delega a edição. Não há overload ambíguo. O proprietário esperado continua sendo postgres, como na conferência fornecida pelo responsável.

## 3. Comissão em sete dias

nf_transition bloqueia o pedido, confere versão e transição permitida, grava completed_at e recebe a linha efetivamente atualizada com RETURNING. A cobrança usa **essa mesma linha**, com `due_at = completed_at + interval '7 days'`. Não usa created_at, fechamento semanal ou data do navegador. A função fixa TimeZone UTC durante sua execução, para não depender do fuso da sessão de quem a chama: sete dias correspondem a 604800 segundos; apresentação comercial em America/Sao_Paulo. Exemplo validado: 15/10/2026 14h −03 → 22/10/2026 14h −03.

Base e arredondamento preservados: produtos após descontos, sem entrega, taxa congelada no pedido. Valor zero não gera cobrança. Cancelamento/recusa não gera cobrança. Lock, versão, índice único e ON CONFLICT preservam uma cobrança por pedido. Ajustes e quitações não modificam due_at.

O relatório considera prazo **atingido** (`due_at <= now()`), soma cobrança/ajustes por pedido e subtrai quitações. Somente saldos positivos contribuem ao vencido, com piso zero por pedido. O filtro temporal do relatório continua aplicável à geração/recebimentos; saldo e vencido são posições atuais, conforme comportamento anterior.

Nenhum lançamento histórico foi atualizado. Se existirem cobranças antigas com due_at NULL, continuarão sem vencimento registrado. Qualquer backfill exige revisão separada, autorização e compatibilidade com triggers de imutabilidade; não foi preparado nem executado um UPDATE indiscriminado.

## 4. Paginação

Assinatura final única: `public.nf_order_history(p_before timestamptz DEFAULT NULL, p_limit integer DEFAULT 50, p_before_id uuid DEFAULT NULL)`. A primeira página envia ambos os componentes nulos. As seguintes enviam created_at e id da última linha recebida. Um componente sem o outro é rejeitado. Ordenação e comparação usam `(created_at DESC, id DESC)` e `(created_at,id) < (p_before,p_before_id)`.

REVOKE/GRANT apontam para `(timestamptz,integer,uuid)`. Não há assinatura legada aplicada, pois 004 ainda não foi executada no projeto remoto. O consumidor preserva a precisão original do timestamp em texto, guarda cursor independente de pedidos ativos/deep links, impede chamadas simultâneas e deduplica IDs. Páginas já presentes no snapshot são atravessadas automaticamente, em lotes limitados, sem pular registros ainda não carregados. Troca de identidade limpa o histórico local. Autorização permanece no servidor.

## 5. Cadastro pelo vendedor

Painel do estabelecimento → **Perfil da loja** → formulário existente de perfil → **Localização do estabelecimento**. Mostra endereço textual, mapa e marcador. Pode usar GPS por ação explícita, tocar/clicar, arrastar o pino ou digitar coordenadas pelo teclado. Sem posição salva, abre a região de Porteirinha **sem marcador confirmado**.

GPS/marcação são provisórios. É necessário **Confirmar ponto** e depois **Salvar perfil e localização**. Fechar/navegar/descartar não grava coordenadas provisórias. Alterar novamente o pino exige nova confirmação. Remover coordenadas marca remoção explícita, aplicada ao salvar; descartar restaura o estado inicial. Respostas atrasadas de GPS são ignoradas após descarte, edição manual ou fechamento. Atualizações de background não redesenham o formulário aberto.

Permissão negada, indisponibilidade, timeout e navegador sem GPS têm mensagens distintas e preservam edição manual. Não existe watchPosition nem GPS automático. Não há geocodificação nesta funcionalidade e o GPS não altera o endereço textual.

## 6. Persistência e validação

Novas colunas apenas em stores: `latitude double precision` e `longitude double precision`. Ambas nulas ou ambas preenchidas, latitude −90…90, longitude −180…180; constraints rejeitam NaN/infinitos e zero é aceito. RPC exige números JSON válidos. Campos ausentes preservam a posição; ambos explicitamente null removem. Campo isolado ou tipo inválido rejeita a transação inteira. Demais dados administrativos/proprietário não são copiados do payload.

RLS existente controla visibilidade. Coordenadas das lojas aprovadas são públicas; de lojas pendentes/suspensas são visíveis somente por caminhos autorizados. Grants por coluna foram adicionados sem reabrir status_reason. Catálogo usa o registro da loja e o adaptador passa os campos à interface. Não foram preenchidas coordenadas fictícias nem alterados endereços/posições de clientes.

## 7. Mapa público e navegação

Página individual/compartilhável → **Mapa / Como chegar**. A listagem de localização também usa o mesmo componente. Com coordenadas, há mapa com nome/pino e **Traçar rota no Google Maps**, usando `https://www.google.com/maps/dir/?api=1&destination=...`. Origem e modo de transporte não são fixados. Links usam parâmetros codificados e `noopener noreferrer` em nova aba.

Sem coordenadas, endereço suficiente oferece **Buscar endereço no Google Maps**, claramente identificado como busca, sem afirmar precisão. Sem endereço suficiente, mostra **Localização ainda não cadastrada**. Centro da cidade não é usado como destino. NortFood não desenha trajetória, linha reta, distância ou tempo de chegada; a rota real é responsabilidade do Google Maps. A [documentação oficial de Maps URLs](https://developers.google.com/maps/documentation/urls/get-started) prevê navegador/aplicativo conforme o dispositivo e não exige chave de API para esses links. Não foi contratado serviço de roteamento.

## 8. Retirada e snapshots

Ao escolher retirada, a revisão do pedido mostra endereço e Como chegar. No detalhe/acompanhamento, a ação aparece antes da linha do tempo; em Pronto para retirada fica destacada pelo título. Abrir rota não atualiza status nem confirma retirada.

Na criação, o trigger adiciona as coordenadas da loja ao endereço já congelado pelo checkout, sob o mesmo bloqueio de leitura da loja/transação. Mudança posterior de endereço/pino não modifica o pedido. Detalhes usam exclusivamente `address_snapshot`; pedidos antigos sem posição usam o próprio endereço histórico para busca, sem recorrer à loja atual. Pedidos de entrega não ganham mapa de retirada nem expõem endereços de terceiros. Demonstração local também preserva snapshot, sem representar pedido real.

## 9. Proprietário e funcionário

Não há distinção de negócio documentada além do campo member_role. `is_member` ignora o valor owner/staff e `require_store` verifica o vínculo. Mantido sem reduzir poderes silenciosamente:

| Operação | owner | staff |
|---|---|---|
| Editar perfil, categorias, horários, zonas, localização | permitido na própria loja | permitido na própria loja |
| Abrir/pausar, criar/editar/arquivar/reordenar produtos | permitido | permitido |
| Ler/atualizar pedidos e informar recebimento | permitido | permitido |
| Conversas da loja e relatórios financeiros da loja | permitido | permitido |
| Administração da plataforma, taxas, aprovação, quitações/ajustes | sem privilégio pelo cargo | sem privilégio pelo cargo |

Poderes administrativos dependem separadamente de private.admin_users. Interface não oferece gestão de convites/cargos. Definir quais ações serão exclusivas de owner continua sendo decisão pendente do responsável; nenhuma política nova foi inventada.

## 10. Upload: situação real

Existe `supabase/functions/upload-media/index.ts`. Confere origem configurada, método POST, getUser no servidor e vínculo exato com a loja. Caminho é criado no servidor com UUID; cliente não escolhe diretório/arquivo. Limite de arquivo 1 MB, MIME PNG/JPEG/WebP e assinatura inicial coerente. Credencial service_role é lida somente no ambiente da função. O frontend usa invoke e `createSignedUrl` do bucket privado, com validade de 30 minutos/cache de 25; não presume URL pública. Nenhum segredo foi adicionado ao frontend.

**Incompleto para certificação:** assinatura inicial não é decodificação completa da imagem. Falta rejeitar imagens truncadas/polyglots/bombas de descompressão por decodificação e limites de dimensões, limitar corpo antes de formData, quotas/rate limit e validar implantação/segredos/origem com arquivos adversos no serviço real. Deno/serviço Edge não foi executado aqui. Não é declarado upload funcional de produção. Bucket permaneceu privado, sem escrita direta por clientes. URLs assinadas previamente emitidas podem valer até expirar após suspensão.

## 11. Privacidade e provedores

Texto operacional/privacidade atualizado factualmente: posição fixa da loja confirmada, mapas externos e snapshot de retirada. Não garante conformidade jurídica. Abrir rota não captura/salva posição do cliente, não a envia à loja e não cria analytics/logs de coordenadas. O Google Maps gerencia a origem conforme suas próprias permissões.

Leaflet 1.9.4 já existente foi reutilizado. Mapas públicos carregam ao expandir; instâncias/listeners/timers/ResizeObserver são limpos ao trocar tela/fechar. Ajuste de tamanho cobre áreas antes ocultas. Endereço, link externo e coordenadas manuais continuam disponíveis se biblioteca/tiles falharem.

Revisadas [documentação Leaflet](https://leafletjs.com/reference.html) e [política oficial de tiles OSM](https://operations.osmfoundation.org/policies/tiles/): atribuição visível, Referer preservado, cache normal do navegador e ausência de prefetch/offline/descarga em massa. Uso público é sujeito à capacidade e bloqueios do provedor; não é SLA ilimitado. Crescimento de tráfego exige provedor adequado e revisão de custos. Nenhuma geocodificação nova foi adicionada; o fluxo de endereço de cliente preexistente mantém seu Nominatim e requer acompanhamento separado de uso.

## 12. Testes e limites

Resultados finais e hashes: `VALIDACAO_LOCALIZACAO.json`. **49 testes aprovados, zero falhas**, sintaxe e build aprovados; **107 verificações do protótipo preservado aprovadas**, sem erro JavaScript capturado. A suite inclui PostgreSQL PGlite real em WASM/memória, sequência local completa 001–005 e testes de banco anteriores com fixture da 001. A primeira foi aplicada apenas ao ambiente descartável autorizado, nunca reaplicada remotamente. Não há script de lint configurado; diff --check dos fontes passou. O bundle gerado pelo SDK contém whitespace em strings multilinha e não foi alterado manualmente para ocultar esse aviso.

Regressões: prazo exato, limite antes/no instante/depois, parcial/total, ajustes, zero/cancelado/recusado; duas tentativas enfileiradas de conclusão sem duplicação; timestamps iguais em várias páginas/isolamento; salvar/preservar/editar/remover/zero/rejeitar coordenadas; outra loja/usuário negados; owner/staff sem admin; visibilidade pública e base privada; snapshot antigo após mudança da loja.

Chrome com Leaflet **real** (CDN fixada e hash validado) testa clique, arraste, campos, GPS controlado/negado/indisponível/timeout/ausente, ausência de pedido automático de GPS, cancelamento, callback tardio, erro de tiles/biblioteca, reabertura e quatro larguras. Tiles são sintéticos locais nesses testes, evitando tráfego automatizado OSM. Captura inspecionada em `test-results/store-location-mobile.png`; não representa teste de ruas reais. A interface completa usa transporte controlado para salvar posição, cursor composto e destino histórico; demais regressões cobrem seis larguras.

Sem Docker/psql/Supabase CLI/Deno disponíveis. Não houve PostgreSQL servidor com múltiplas conexões: locks/versionamento e tentativas enfileiradas foram verificados, mas não corrida real entre sessões. Não houve GPS físico, abertura de app Google Maps em telefone, Auth/PostgREST/Storage/Realtime/Edge/SMTP hospedados ou validação de headers HTTPS implantados. Nenhum teste de serviço foi simulado como evidência real.

## 13. Dados, avisos e ordem exata

Aplicação: 002/004 criam funções/grants; 003 cria bucket/políticas/triggers/publicação conforme auditoria anterior; 005 adiciona colunas/constraints/grants, move uma função já criada na 002 e cria wrapper/trigger. Nenhuma migração aplica DELETE/TRUNCATE/DROP ou backfill de dados históricos. Lojas existentes recebem somente as novas colunas nulas.

Somente ao chamar RPC: edição de perfil/localização altera a própria loja; remoção explícita limpa o par de coordenadas; exclusão de endereço próprio e substituição dos vínculos de categorias da própria loja continuam existindo em funções, dentro de transação. Arquivamento de produtos e inativação de adicionais/zonas preservam histórico. Não removidos para ocultar avisos.

Advisor/SQL Editor ainda podem avisar sobre SECURITY DEFINER intencional, REVOKE/ALTER/POLICY, RLS sem política no admin privado, palavras DELETE/TRUNCATE em funções/triggers, ausência de PK convencional em favoritos e FKs/índices de desempenho. A 005 move função e adiciona constraint: ler esses avisos, sem substituir por comandos permissivos. Não há overload ambíguo de histórico e todas as novas funções têm search_path vazio e execução limitada.

Para **este projeto remoto**, com 001 já aplicada:

1. `supabase/migrations/202610120002_operations.sql`
2. `supabase/migrations/202610120003_storage_realtime.sql`
3. `supabase/migrations/202610120004_reporting.sql`
4. `supabase/migrations/202610150005_store_location.sql`

Um arquivo/transação por vez. Não repetir 001. Se houver erro, interromper e guardar a mensagem; não apagar funções/tabelas para forçar aplicação. Publicar frontend atualizado somente depois da assinatura nova e da 005. Resultados remotos fornecidos pelo responsável são compatíveis com as premissas; a permissão real de DDL Storage/publicação e cache da Data API só poderão ser confirmados na aplicação manual/etapa real.

## 14. Vereditos separados

- **Migrações:** prontas na validação local para aplicação na ordem acima, sob as premissas remotas fornecidas. Verificar o erro real se o serviço rejeitar algum DDL; não houve execução remota pelo agente.
- **Mapa:** implementação integrada e testes locais aprovados; uso comercial depende da 005, frontend publicado em contexto seguro, conectividade/provedor e validação física do GPS/Google Maps. A posição fixa é cadastrada pela própria loja, não inferida.
- **Marketplace:** **NO-GO para operação real.** Faltam testes hospedados entre identidades/dispositivos, upload endurecido/implantado, SMTP, backups/restauração, suporte e documentos comerciais/jurídicos. Diferenciar owner/staff continua decisão de negócio pendente, sem bloquear o comportamento atual preservado.

**Nada foi executado no Supabase remoto. Não foram solicitadas credenciais de produção.**
