# NortFood — resultado das duas ordens

## Resultado

Site oficial atualizado e verificado: **https://nortfood.netlify.app**.
**Pedidos comerciais reais continuam BLOQUEADOS.** A publicação das correções não equivale à aprovação comercial.

- Netlify existente: `3bca8094-c54e-416c-89d8-bec51a3d252e`, plano Free.
- Deploy de produção pronto: `6adbcb97e6f2eaacb2e345f7`, publicado em 23/10/2026 às 21:03:42 UTC.
- Commit público: `61011c4fc95b637c550b6d78a86ba2571bc9eed8`, branch `release/nortfood`.
- Release HTTPS real: `ec43a56032d791cc5b34`, com sourceCommit correspondente.
- GitHub–Netlify automático comprovado pelo push e pelo deploy pronto. Não foi criado outro site ou domínio.
- Checkpoint anterior: `checkpoint/auth-map-dan-burguer-20261023` → `4b80309`. Commit local das alterações: `b65e462`.
- Nenhum serviço pago contratado, domínio comprado ou faturamento ativado.

## Dan Burguer no banco principal

Supabase principal: `zwkhqahivthzivmuirjr`. Migrações 001–008 conferidas antes de agir; aplicada e registrada **somente 009**, em transação, após testes isolados. Não houve recriação do banco nem exclusão de dados.

Loja criada: **Dan Burguer**, UUID `40bac4d9-2e3c-4f1d-b33b-ab9628176136`.
Estado: rascunho, pausada, sem aprovação ou modalidade de atendimento liberada. O catálogo público permanece sem lojas aprovadas; isso é uma restrição real, preservada no backend.

| Registros | Quantidade remota conferida |
|---|---:|
| Lanches | 20 |
| Mini pizzas | 4 |
| Jarras de suco 750 ml | 9 |
| Bebidas sem álcool | 7 |
| Bebidas alcoólicas | 6 |
| Total de produtos | 46 |
| Grupos de adicionais | 20 |
| Opções de adicionais | 220 |

Os 46 nomes, preços, descrições e categorias foram comparados individualmente com o cardápio fornecido. Endereço, CEP e funcionamento diário 19:00–23:45 foram gravados. Não foram inventados bairro, coordenadas, fotos, marcas ou tamanhos de produtos.

Todos os produtos aguardam conferência de disponibilidade. Os 9 sucos também possuem restrição de confirmação de preço; as 6 bebidas alcoólicas permanecem bloqueadas no checkout do servidor. Não há liberação automática por alterar a disponibilidade. Remoções não dão desconto e a taxa de troca não é cobrada automaticamente. As referências de R$ 2,00 e R$ 3,00 são editáveis no painel, sem inferir cobertura.

O telefone informado foi preservado como pendente, sem transformá-lo em WhatsApp. O campo WhatsApp está vazio. Nenhum pedido ou mensagem comercial foi enviado.

O vínculo com `Danburguer@gmail.com` foi preparado em tabela privada; só pode ser reivindicado por uma identidade Auth com esse e-mail efetivamente confirmado. Há **zero usuários, administradores e vínculos de loja remotos**. O e-mail administrativo `kevenrawan@gmail.com` foi documentado, sem concessão insegura de privilégios.

## Matriz de homologação

| Item | Classificação | Evidência e limite |
|---|---|---|
| Site oficial, HTTPS e recursos privados protegidos | APROVADO | 39 verificações HTTPS reais; release e commit conferidos |
| Interface publicada, categorias, logo e responsividade | APROVADO | 18 verificações de navegador; 320–1365 px, temas claro/escuro, console sem erros |
| Cadastro inicial simplificado | APROVADO local/UI | Pedir/Vender; e-mail, senha e consentimento; contato coletado antes do pedido; vendedor direcionado ao perfil |
| Senhas | APROVADO configuração/local | Mínimo 8 no frontend e configuração salva no painel Supabase; teste local com 8 caracteres; aceitação real no Auth remoto pendente |
| Cadastro, login, confirmação e recuperação remotos | PENDENTE | Cadastro global desabilitado por falta de envio de confirmação de produção; não foram criadas contas artificiais para contornar isso |
| Sessões e recuperação de perfil | APROVADO local | Testes controlados de login/logout, retorno, recuperação, troca de conta e criação idempotente do próprio perfil; sessão real remota NÃO TESTADA |
| Google OAuth real | PENDENTE | Termos Cloud aceitos com autorização; projeto NortFood criado, consentimento preenchido; política adicional ainda depende do aceite solicitado; cliente/segredo/provedor não ativados |
| Resend e modelos de e-mail | PENDENTE | Três modelos locais preparados; sem conta autorizada, domínio/remetente verificado ou SMTP ativo; modelos ainda não aplicados remotamente |
| Cardápio oficial e importação sem duplicatas | APROVADO | Conferência SQL remota de 46 produtos/220 opções; repetição preservando edições testada em PostgreSQL isolado |
| Produtos, adicionais, remoções e carrinho | APROVADO local | Preço imediato, quantidades, variantes, persistência e ingredientes no resumo; validação SQL de remoções permitidas |
| Totais do servidor, frete e idempotência | APROVADO isolado | Transações reais PostgreSQL; fraude de total e opções, zona inválida, duplicata e conflito rejeitados; confirmação incerta recuperada no frontend |
| Checkout, recebimento e acompanhamento comerciais remotos | NÃO TESTADO | Bloqueados por Auth, loja em rascunho e piloto desativado; nenhum pedido real criado |
| Permissões/RLS | APROVADO estrutura e testes isolados | Zero tabelas public/private sem RLS; 28 políticas; isolamento de cliente/loja/admin em SQL isolado. Acesso entre contas reais remotas ainda NÃO TESTADO |
| WhatsApp | PENDENTE | Resumo de pedido registrado e compartilhamento sem falso aceite cobertos localmente; número oficial efetivo ainda não confirmado |
| Mapa em modal e busca manual | APROVADO | HTTPS real, tiles OpenStreetMap HTTP 200, busca Nominatim por Porteirinha; mesma URL e nenhuma nova aba |
| GPS | APROVADO controlado / NÃO TESTADO físico | API real no código, acionada por botão; sucesso, recusa, indisponibilidade e timeout simulados em testes. Nenhuma localização física do usuário capturada |
| Pinos de loja e abertura do perfil | APROVADO controlado | Marcador de loja sintética testado; lojas reais sem coordenadas confirmadas não recebem pinos inventados |
| PWA/cache/atualização | APROVADO navegador | SW em HTTPS; atualização oferecida e aplicada na aba pública existente; testes locais de cache privado, offline e preservação de formulário. Android/iPhone físicos NÃO TESTADOS |
| Chat, notificações e Realtime | APROVADO local/estrutura | Testes SQL e UI controlados; publicação remota de orders/messages/notifications/dining_tables presente; tráfego autenticado remoto NÃO TESTADO |
| Storage | APROVADO configuração | Bucket store-media privado, limite 1 MiB e PNG/JPEG/WebP. Upload autenticado real remoto NÃO TESTADO |
| SEO | PENDENTE indexação | Título/canonical/manifest/rotas verificados; noindex mantido por lançamento comercial ainda pendente |

## Qualidade e performance

- Suíte final: **154 aprovados, zero reprovados**, arquivo `test-results/auth-dan/complete-final-suite.txt`.
- Validação sintática: 126 arquivos, zero falhas. É checagem de sintaxe, não uma auditoria ESLint.
- Arquitetura: 18 módulos, zero ciclos ou violações.
- Build de produção e auditoria do pacote aprovados: 99 arquivos, sem fontes privadas, relatórios, backups ou segredos publicados.
- Prévia Netlify verificada antes da produção: `6adbc89beb5e68b3ded94ee5`.
- Lighthouse real da URL oficial: **performance 84, acessibilidade 100, boas práticas 100, SEO 69**. LCP 4,38 s, CLS 0,0202, transferência 618.650 bytes, sem avisos de execução. LCP ainda admite melhoria; não representa garantia de latência para usuários reais.

Carga executada exclusivamente em loopback, servidor estático local, GET /, sem Auth, Supabase, checkout, navegador ou tráfego Netlify. Não é homologação de usuários comerciais simultâneos.

| Conexões virtuais locais | p50 ms | p95 ms | p99 ms | req/s bem-sucedidas | Erros | CPU ms | Pico RSS MiB |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 50 | 17,97 | 28,17 | 39,03 | 2.599,39 | 0% | 6.797 | 88 |
| 100 | 30,42 | 33,64 | 45,03 | 3.244,95 | 0% | 7.000 | 123 |
| 250 | 75,38 | 82,57 | 103,62 | 3.262,96 | 0% | 6.906 | 149 |
| 500 | 149,64 | 181,84 | 236,52 | 3.226,49 | 0,22% | 7.016 | 173 |
| 1.000 | 289,64 | 942,15 | 1.519,14 | 2.307,73 | 26,59% | 6.812 | 251 |

Os patamares locais de 500 e 1.000 falharam no critério de ausência de erros, com ECONNREFUSED. A recusa ocorreu nas conexões da máquina local; não há evidência para atribuí-la ao banco ou ao Netlify. Resultados em máquina Windows em uso, sem valor de SLA. **Capacidade comercial remota validada: nenhuma. Não foi alegado suporte a 1.000 usuários reais.**

Banco remoto com aproximadamente 12,58 MiB e zero índices inválidos. As restrições da aplicação estão validadas; há uma restrição NOT VALID gerenciada pelo próprio Supabase em realtime.messages, fora de public/private, identificada e preservada sem alteração.

## Intervenção mínima e próximos passos

1. Responder ao pedido de aceite adicional da Política de Dados das APIs Google e dos Termos/Privacidade Resend. A autorização anterior cobria os Termos Google Cloud; esses compromissos são distintos. As telas oficiais ficaram abertas para continuidade.
2. Disponibilizar domínio controlado e remetente verificável no Resend. Não é possível concluir SMTP de produção com um From inventado ou Gmail não verificado. Não houve compra de domínio. A inserção de credenciais ocorrerá somente na tela protegida.
3. Concluir autenticação/confirmar as identidades reais do administrador e do proprietário; só então vincular privilégios de forma segura.
4. Confirmar WhatsApp, telefone, atendimento/retirada, cobertura/frete, preparo, pagamentos, disponibilidade e preços pendentes com o proprietário. Regras de troca e álcool continuam protegidas.
5. Executar homologação autenticada remota de cliente, proprietário e terceiro; validar recebimento, estados, recuperação de confirmação, upload/Realtime e WhatsApp. Revisar documentos operacionais e jurídicos ainda em rascunho. Aprovar exclusivamente o UUID da Dan Burguer e ativar o piloto apenas após os testes críticos.

Netlify e Supabase permanecem Free. O [plano Free Supabase](https://supabase.com/pricing) informa 500 MB de banco, 1 GB de Storage, 50.000 usuários ativos mensais e limites de saída; projetos podem pausar por inatividade. Cotas de Netlify e APIs geográficas também devem ser monitoradas antes de campanhas. Nominatim público não é garantia de escala; buscas são manuais e limitadas no cliente, sem autocomplete, e um provedor com limite agregado adequado deve preceder crescimento significativo. Qualquer contratação, recarga ou upgrade exigirá nova autorização.

Preparação SMTP documentada em `docs/RESEND_AUTH_PREPARACAO_20261023.md`; dados comerciais e vínculos em `docs/PILOTO_DANBURGUER.md`. Rollback em `docs/RECUPERACAO_AUTH_DAN_20261023.md`: reverter frontend por novo commit na branch de produção, preservando banco e dados novos. Não reaplicar migrações.

## Evidências locais

- `test-results/auth-dan/remote-audit.json`: dados oficiais lidos do banco remoto.
- `test-results/auth-dan/remote-health.json`: índices, Storage, Realtime e permissões.
- `test-results/auth-dan/official-browser.txt` e `official-https.txt`: resultados reais publicados.
- `test-results/public-pilot-20261023/official/browser.json`: release e verificações por resolução/tema.
- `test-results/auth-dan/lighthouse-official.report.html` e `.json`: medição publicada.
- `test-results/launch-20261023/load-local.json`: carga isolada e limitações.
- `test-results/auth-dan/map-public-final.png`: mapa público real após carregamento dos tiles, sem captura de GPS.
- `test-results/auth-dan/auth-public-after-pwa-update.png`: formulário real após atualização controlada.

Relatório e evidências permanecem fora da publicação estática e da branch pública, exceto código e documentação pública de deploy explicitamente selecionados.
