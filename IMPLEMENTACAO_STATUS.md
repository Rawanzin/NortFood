# Implementação comercial — 12/10/2026

Estado inicial preservado na branch codex/commercial-mvp-20261012. Cópia integral dos arquivos anteriores (sem .git) e diff em %TEMP%/nortfood-recovery-20261012. Nenhum arquivo antigo dos ZIPs será restaurado sobre código atual.

Baseline executado novamente: node tests/flows.cjs, 79 verificações aprovadas em Chrome headless. Isso valida apenas o protótipo local; não autenticação real ou sincronização.

## Diagnóstico funcional
Home, busca, categorias, banners, navegação e modais: reutilizáveis.
Login/cadastro, perfil, catálogo editável, adicionais, pedidos, histórico, chat, notificações, endereços, avaliações, favoritos e painel: funcionam apenas localmente.
Comissão: estimativa em frontend, inadequada para registrar obrigação comercial.
Administração, aprovação, RLS, checkout no servidor, idempotência e sincronização: ausentes.
Produtos têm IDs derivados de índice. Login local não protege acesso comercial. Loja nova recebe nota 5 fictícia. Nenhum recurso está aprovado para lançamento.

## Decisão
Manter HTML/CSS/JS e componentes. Criar camada Supabase e migrações PostgreSQL; usar IDs UUID, dinheiro em centavos, RLS e RPCs transacionais. Modo comercial é padrão e falha fechado sem configuração; modo demonstrativo preservado somente em localhost com ?demo=1. Não migrar contas/senhas locais para Auth real.

## Dependências
Proprietário confirmou que não existe projeto Supabase. Sem Docker/PostgreSQL/CLI disponíveis. Testes SQL locais utilizarão o motor PostgreSQL PGlite com esquema Auth de teste, sem alegar validação do serviço Supabase Auth. Configuração de Supabase/HTTPS e testes externos permanecem gates de lançamento.

## Checkpoint final local
Auditoria, preservação e implementação local concluídas nesta etapa. Fundação SQL, camada Supabase, integração dos fluxos existentes, administração e documentação estão implementadas. Validação do serviço hospedado e preparação operacional permanecem pendentes. O usuário confirmou que pausaria a edição concorrente; logotipos, tema e categorias dessa edição foram preservados.

Validação em 12/10: sintaxe de app.js e build aprovados; 26 testes automatizados aprovados, sem falhas. O teste SQL usa PostgreSQL PGlite com Auth/Storage auxiliares de teste; o teste de interface usa respostas controladas. Isso não comprova Supabase Auth, PostgREST, Storage, Realtime ou SMTP reais. Veja RELATORIO_COMERCIAL.md e VALIDACAO_COMERCIAL.json para resultados finais e limites.

## Próximo passo exato
Seguir docs/CONFIGURACAO_E_PUBLICACAO.md em um projeto Supabase **de testes**: aplicar as quatro migrações, configurar Auth/SMTP, cadastrar o primeiro administrador pelo procedimento privado e configurar as variáveis públicas localmente. Depois implantar a função de upload no ambiente de testes e executar tests/supabase-live.cjs com suas condições explícitas de ambiente descartável. Executar também o roteiro de dois dispositivos em docs/PILOTO.md. Não habilitar o piloto comercial antes dos critérios eliminatórios.

## Pendências que impedem lançamento
- Projeto Supabase, Auth real, SMTP e confirmação/recuperação de e-mail; isolamento e sincronização reais entre sessões/dispositivos.
- Upload remoto, validação por decodificação de imagem, quotas e proteção contra abuso; revisão dos limites de cadastro e armazenamento.
- HTTPS, domínio, cabeçalhos implantados, observabilidade, restauração de backups e rotina de suporte.
- Termos/privacidade, identificação do controlador, contratos e política de cobrança/vencimento, retenção e atendimento a solicitações de dados.
- Testes reais de falhas de rede, dispositivos físicos, GPS e alertas sonoros.

Limites de interface: um grupo de adicionais por produto; banco aceita vários, mas edição de produtos com múltiplos grupos precisa ser ampliada antes desse uso. Conversas carregam as últimas 100 mensagens, sem paginação anterior. Vencimentos contratuais e exclusão efetiva de conta ainda exigem procedimento operacional. Pagamento é declaração do estabelecimento; não há integração bancária, split ou aprovação automática.

Resultado: **NO-GO para lançamento**. Nenhum serviço externo, publicação ou banco remoto foi criado; nenhum dado local antigo foi migrado ou apagado.
