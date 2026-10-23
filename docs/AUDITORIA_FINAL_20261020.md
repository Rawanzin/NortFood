# NortFood — auditoria final de 20/10/2026

**Veredito: NO-GO para beta público.** Homologação privada pode continuar. Este fechamento distingue resultados desta execução de evidências históricas; não autoriza pedidos comerciais.

## Estado preservado e alcance

Checkout existente na branch codex/commercial-mvp-20261012, já com muitas alterações e arquivos não rastreados. Não foi feito reset, stash, limpeza ou restauração de versão antiga. Recuperação local: backups/source-recovery-2026-10-20T22-32-05-367Z, com 213 entradas, cópias verificadas por SHA-256, manifest.json, HEAD.txt, git-status.txt e working-tree.patch. Ausências também registradas. Ambientes ignorados, segredos, node_modules e backups antigos não foram duplicados nem modificados.

Inventário: 187 arquivos em src/assets/scripts/tests/docs/supabase, sem arquivos vazios (test-results/final-audit/inventory.json). Inspecionados os pontos de entrada, estilos, configurações, módulos comerciais/Auth/QR/mapas, SQL, upload, scripts de build/servidor/implantação/restauração, testes e relatórios anteriores. Não se trata de garantia de ausência de qualquer defeito ou pentest independente.

Arquitetura mantida: HTML/CSS/JS, esbuild, SDK Supabase, Leaflet local, QR e PDF. Supabase é responsável por autenticação, dados, RPCs, imagens privadas e eventos. Não há backend de pagamento bancário nem logística própria.

## Problemas priorizados

| Prioridade | Achado | Resultado |
|---|---|---|
| P0 corrigido | Capa em shop() interpolada diretamente em atributo style e foto de produto do vendedor sem escape; permitiam injetar marcação/atributos | Validação de URL, escape HTML e serialização separada de string CSS; regressão com conteúdo hostil em navegador |
| P1 corrigido | Ausência de zona convertida em frete zero; carrinho usava menor taxa de outra zona | Taxa apenas da zona do endereço escolhido; ausência é null, sem total fechado ou revisão permitida |
| P1 corrigido | POLL substituía o endereço escolhido pelo principal | Preserva endereço existente por ID somente na mesma identidade; troca de conta descarta seleção |
| P1 corrigido | Controles essenciais sem nome acessível e textos de entrega ambíguos | Busca/carrinho/adicionar/quantidades/fechar nomeados; Contraste de texto secundário corrigido (antes 4,35:1 no fundo principal), foco sólido e texto de ações legível. CTA Continuar pedido; entrega desabilitada quando não oferecida; avaliação comercial sem rótulo demonstrativo |
| P0 pendente | SMTP atual captura e não entrega e-mails externos | Não atende confirmação e recuperação de clientes reais |
| P0 pendente | Origem operacional pública/Hostinger e retorno Auth de produção não validados | Gate de configuração retorna PUBLIC_HTTPS_URL_PENDING; não publicar build principal |
| P0 pendente | Identificação do operador, termos, privacidade, contrato, suporte e autorização comercial | Documentos continuam rascunhos; decisões não inventadas |
| P1 pendente | Login Google desativado | Interface informa indisponibilidade; OAuth real não aprovado. Não impede usar e-mail se Google continuar explicitamente indisponível |
| P1 pendente | Aparelhos físicos, leitores de tela e ensaio operacional final no destino definitivo | Emulação local não os substitui |
| P1 | Desempenho laboratorial LCP 3916 ms, CLS 0, 452575 bytes locais | Um ensaio com CPU 4x e 1,6 Mbps/150 ms; sem aprovação de Core Web Vitals de campo |
| P2 | app.js concentra renderização e lógica demonstrativa; uploads antigos e reservas demandam política futura de retenção | Sem reescrita ampla ou exclusão de histórico para esta tarefa |

## Banco e autorização: comprovação atual

Somente NortFood-Homologacao zrczgghucwsaxqnyaapk foi consultado/testado remotamente. O principal não foi acessado nem alterado nesta execução. História real confirmou 202610120001, 202610120002, 202610120003, 202610120004, 202610150005, 202610170006 e 202610190007. Nenhuma migração foi modificada/reaplicada.

Consulta BEGIN READ ONLY: piloto false, administradores 0, lojas aprovadas 0, tabelas public/private sem RLS 0, bucket store-media privado, divergências de vencimento 0. Publicação Realtime restrita a dining_tables/messages/notifications/orders. Provas: remote-readonly.txt e remote-isolation.json em test-results/final-audit.

anon e authenticated não possuem SELECT/INSERT em private.admin_users; leitura private pela Data API recusada. status_reason recusado por coluna. RPCs anônimas nf_catalog, nf_operating_status e nf_table_context, previstas pelo catálogo/mesa pública. Reserva de upload recusada a conta comum com 42501. Um filtro inicial de search_path estritamente vazio apontou public.rls_auto_enable, mas a inspeção mostrou search_path=pg_catalog: não é caminho mutável da aplicação. É o mecanismo de event trigger descrito na [documentação oficial](https://supabase.com/docs/guides/database/postgres/event-triggers); não foi removido para esconder aviso. Evidências remote-acl.txt/remote-definer-detail.txt.

RPCs aplicam identidade, vínculo e privilégios no servidor. owner e staff conservam os mesmos poderes de membro já existentes: editar loja/localização/cardápio/mesas, abrir/pausar, tratar pedidos/pagamento declarado, chat e relatórios da própria loja. Nenhum recebe administração da plataforma. Diferenciar esses cargos exige definição de negócio futura.

Checkout SQL recalcula preços/adicionais/mínimo/zona, bloqueia loja/produto indisponível, usa chave idempotente e bloqueios; versões controlam transições. Comissão: produtos após desconto, sem frete, cobrança positiva única, vencimento exatamente completed_at + interval '7 days'; ajustes/quitações não reiniciam prazo e vencido requer prazo atingido e saldo positivo por pedido. Sem mudanças históricas nesta execução.

Upload existente: Edge Function valida usuário real, vínculo, origem exata, tamanho, MIME, conteúdo e dimensões, decodifica/reencodifica/retira metadados, reserva quota no banco e grava caminho aleatório. Bucket não é público; leitura por URL assinada. Credencial privilegiada somente no servidor. Origem local não está liberada para upload: os testes de upload anteriores usaram HTTPS autorizado; isso não é falha a contornar com wildcard. Não foi reimplantada a função nesta etapa.

## Persistência e limitações

Modo comercial: pedidos, perfis, conversas, notificações, catálogo e finanças via Supabase; carrinho temporário e preferência de duração de sessão no navegador. Auth usa armazenamento do SDK. Demonstração usa nortfood-v1 apenas em localhost/127.0.0.1 com ?demo=1; não equivale a backend. Preferências opcionais de estatísticas não tornam analytics automaticamente ativo.

Realtime tem polling complementar. Testes SQL locais não comprovam socket Realtime ou entrega de notificações externas. Estados indicam pagamento declarado à loja, nunca aprovação bancária pelo NortFood. Localização de retirada usa snapshot do pedido, sem rastrear cliente/entregador.

## Implantação

Build estático de homologação exclusivo, sem segredos, noindex e piloto bloqueado. Netlify privada é o destino efetivamente disponível. Hostinger foi novamente consultada e redirecionou ao login; plano, servidor, diretório, TLS e origem não confirmados. _headers/netlify.toml não configuram Hostinger. Geradores separados Apache/LiteSpeed e Nginx permanecem preparados, sem aplicar regras de servidor presumido. Rotas # não exigem fallback universal; 404 real preservado. Scripts não versionados exigem revalidação de cache; nenhum DNS alterado.

Ver resultados finais e publicação em VALIDACAO_BETA.md; pendências eliminatórias em PENDENCIAS_LANCAMENTO.md.
