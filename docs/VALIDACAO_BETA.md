# NortFood — validação do beta em 20/10/2026

**NO-GO para operação pública.** Permitida continuidade de homologação privada, exclusivamente com dados sintéticos e pedidos comerciais bloqueados. Nenhum resultado local abaixo representa aprovação automática em produção.

## Testes executados nesta tarefa

| Ensaio | Resultado | Evidência |
|---|---|---|
| Suíte automatizada completa | APROVADO LOCAL: 103 testes, zero falhas | test-results/final-audit/full-tests-final.txt |
| Regressões novas | APROVADO LOCAL: 6 testes; imagens hostis, frete, endereço/POLL, contraste/foco | regressions-final.txt no mesmo diretório |
| Jornadas demonstrativas | APROVADO LOCAL: 107 verificações, sem erro JS | demo-final.txt; não usa pedidos reais |
| Regressões UI/Auth/contrato após clareza do checkout | APROVADO LOCAL: 7 testes, zero falhas; depois incluídos na suíte final ampliada | affected-final.txt |
| Sintaxe JS e compilação TS | APROVADO: 73 arquivos JS/CJS/MJS; TS da Edge transformado sem erro | syntax.json; não foi typecheck Deno ou lint completo |
| Dependências de execução | 43 dependências de execução; auditoria adicional de 121 dependências incluindo desenvolvimento, zero vulnerabilidades reportadas | dependency-audit.json/dependency-audit-all.json; não é garantia de ausência de vulnerabilidades |
| Build de homologação | APROVADO LOCAL, esbuild, 77 arquivos, somente destino de testes | build-final.txt/build-manifest.json |
| PostgreSQL 17 local restaurado | APROVADO COM LIMITAÇÃO: 64 tabelas e contagens conferidas; servidor encerrado | backups/restore-isolated-2026-10-20T22-35-12-469Z/result.json |
| Fluxos SQL no restore isolado | APROVADO LOCAL: 18 verificações reais em Postgres; ACL/lojas/produtos/preços/idempotência/isolamento/chat/estados/comissões/endereço/histórico | native_flows do relatório de restore; JWT claims SQL, sem serviço Auth ou socket Realtime |
| Cadastro/confirmar/recuperar | APROVADO REMOTO NO RECORTE: 6 verificações Auth+SMTP/IMAP TLS de captura; senha antiga recusada e links consumidos recusados | smtp-live.json; credenciais e links só em memória |
| Login, reload, novo contexto e logout | APROVADO UI LOCAL COM SUPABASE REAL: 4 verificações, sem transporte simulado | session-live.json |
| RLS e permissões com conta nova comum | APROVADO REMOTO NO RECORTE: 17 verificações; catálogo privado, dados alheios, RPC anônima/admin, coluna interna e reserva de upload | remote-isolation.json |
| História de migrações e proteções | APROVADO REMOTO SOMENTE LEITURA: 001–007, RLS ativo, piloto false, bucket privado, admins 0, lojas aprovadas 0, vencimentos coerentes | remote-readonly.txt |
| ACL admin_users/funções | APROVADO NO RECORTE: anon/auth sem SELECT/INSERT; superfície RPC pública prevista; event trigger com pg_catalog identificado | remote-acl.txt, remote-definer-detail.txt, remote-event-trigger.txt |
| Serviços públicos/negativas de upload | APROVADO REMOTO: Auth settings 200, e-mail habilitado e confirmação obrigatória, Google false; preflight da origem exata 200, POST sem autenticação 401, origem alheia 403 | services-readonly.json; não envia imagem |
| HTTPS da prévia | APROVADO NO RECORTE: tema claro, cinco abas, sem atalhos extras/overflow na janela inspecionada, noindex, piloto bloqueado, zero erros de console capturados | https-ui.txt, https-console.json, https-preview.png |
| Proteção da prévia | A conferência final de origem e permalink fica registrada em protection-final.json | Nenhum cookie/token enviado pelo verificador anônimo |
| Desempenho | Medido: LCP 3916 ms, CLS 0, 452575 bytes locais, cache frio/CPU 4x/rede 1,6 Mbps/150 ms | performance.txt; uma amostra local, não Core Web Vitals de usuários |

Responsividade: testes Chromium em 320/360/390/430/768/1365 e larguras adicionais dos painéis, sem overflow nos cenários executados. Tema claro verificado inclusive com preferência antiga escura. Contraste secundário sobre fundo principal corrigido de 4,35:1 para pelo menos 4,5:1 e verificado em navegador. Foco sólido, nomes acessíveis e interação essencial por controles HTML preservados. Isso não comprova conformidade WCAG integral, leitor de tela real ou teclado físico de Android/iPhone.

Restauração: backup de 19/10, anterior ao lote 002–007. Primeiro ensaio integral acusa extensão gerenciada Vault ausente no Windows; restauração compatível exclui essas entradas (zero linhas Vault no dump). As 64 tabelas são conferidas antes dos fixtures. Depois o helper aplica 002–007 **somente no cluster local isolado** e testa 18 comportamentos. Não usa endpoint de produção. Não restaura blobs Storage, provedores Auth, SMTP, segredos, DNS ou toda a infraestrutura Supabase. Não equivale a validar um backup novo do estado remoto posterior ao lote.

## Evidência remota anterior preservada (não repetida como teste desta execução)

Documentos RESULTADO_PREVIA_HTTPS_20261020.md e FINALIZACAO_BETA_20261020.md registram pedidos sintéticos reais, segunda sessão de vendedor, entrega com taxa 499, retirada, transições/conclusão, chat, categorias múltiplas, snapshot de retirada, upload privado/URL assinada e gate administrativo temporário com quitações/ajustes. O acesso administrativo foi revogado; não foi reativado agora.

Esses recortes anteriores continuam relevantes porque SQL e Edge não foram alterados. Não os rotular como testes novos da interface corrigida. Não equivalem a homologar produção ou confirmar todos os estados possíveis de rede. Publicação Realtime foi lida agora; novo teste de evento autenticado entre sessões não foi executado nesta etapa.

## PENDENTE, sem aprovação por simulação

- Entrega de confirmação/recuperação em caixa externa real, limites de envio e antifraude operacional.
- Google OAuth com credenciais/provedor/consentimento reais; atualmente indisponível.
- Reexecução positiva integral de estabelecimento, produto/imagem, pedido/recusa/cancelamento/chat/Realtime/administração na origem operacional final. Nesta execução não se aprovou loja nem se habilitou piloto apenas para repetir os testes históricos.
- Último aceite em aparelhos físicos e leitores de tela, observação de perda de rede em dispositivos reais e desempenho de campo.
- Hospedagem Hostinger autenticada/configurada e produção HTTPS: acesso redireciona a login, sem plano ou servidor confirmado.
- Revisão jurídica/comercial, procedimentos e autorização de abertura pública.

## Publicação protegida desta tarefa

URL: https://lucky-lamington-022ea1.netlify.app. Exclusivamente Supabase zrczgghucwsaxqnyaapk. Deploy final e hash do pacote: consultar registro abaixo e build-manifest.json. A etiqueta Production do feed Netlify é o canal de deploy desse projeto privado de testes, não o banco principal ou autorização comercial.

Nenhum dado principal alterado; nenhuma migração remota ou concessão administrativa; nenhuma exclusão de conta/histórico; nenhum serviço pago, domínio ou DNS contratado/alterado. Apenas uma conta comum sintética e seus fluxos Auth foram usados remotamente; a conta não foi promovida nem apagada. SQL remoto desta execução foi somente leitura.

**Deploy final verificado:** 6ad7efc9ad4585b597fa770e. Origem e permalink: 10/10 respostas HTTP 401 a acessos anônimos (HTML, config e scripts). CSS atualizado --muted=#6b6f75, tema light, noindex, cinco abas e piloto bloqueado conferidos no HTTPS; zero erros de console capturados.

Pacote: test-results/final-audit/nortfood-audit-rc-20261020.zip, 21.699.101 bytes; SHA-256 0b549fc22cee6afc18ec71c736c8c5dad81f6aacd98ee8c078fc55b0b57312c7. Apenas 77 arquivos estáticos do build, sem relatórios, ambientes ou servidor. O ZIP e o backup permanecem ignorados pelo Git.
