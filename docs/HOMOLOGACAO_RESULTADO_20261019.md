# Preparação e resultado da homologação — 19/10/2026

**Resultado: correções locais concluídas; homologação remota PENDENTE. Não aprovado para beta controlado com clientes reais.** Referência de origem: [auditoria da integração](AUDITORIA_INTEGRACAO_20261019.md).

## Correções concluídas

- O botão **Termos de uso** abre `#legal`, reutilizando a página comercial do NortFood e eliminando o texto antigo que descrevia dados apenas locais. A página identifica **“Rascunho para revisão — não aprovado juridicamente”** e descreve marketplace local, pedido por loja, pagamento direto ao estabelecimento, entrega própria da loja, dados, localização e comissões. Contato, responsável e regras de suporte/cancelamento/reembolso permanecem explicitamente pendentes de revisão. Não existe documento jurídico definitivo aprovado.
- Rotas protegidas sem sessão, incluindo `#settings`, são normalizadas para `#home` com atualização da URL e do estado do histórico. Voltar/avançar não reabre a tela protegida. Cliente identificado mantém acesso às configurações e pode voltar dos termos.
- Novas regressões de navegador cobrem os dois comportamentos e ausência de overflow dos termos em 390 e 1365 px. A identidade desses testes é controlada localmente; não é prova de sessão Supabase real.

## Ambiente separado

Não há variáveis/credenciais de homologação configuradas. No painel existem NortFood e “Rawanzin's Project” pausado; o responsável informou que **não é ambiente descartável do NortFood e solicitou projeto novo**. Não retomamos nem alteramos nenhum deles.

Preparados:

- `.env.homologacao` como configuração isolada, a partir de `supabase/homologacao.env.example`; sem leitura de `.env` do principal pelo novo fluxo.
- `pnpm start:homologation` na porta 4174, com somente campos públicos no navegador e recusa da URL principal.
- `pnpm prepare:homologation`: gera, sem executar, schema 001–007 e histórico para projeto novo. Guardas recusam banco ocupado, usuários/objetos existentes e reaplicação. Template local disponível em `test-results/homologation/bootstrap-template.sql`.
- `pnpm test:homologation` e `scripts/Test-Homologacao.ps1`: destino descartável obrigatório, credenciais privadas por ambiente/entrada protegida, resultado separado em JSON. Sem configuração, encerram como PENDENTE antes de iniciar testes remotos.
- Gate real de API ampliado para chat, mensagens/notificações autenticadas por Realtime, imagens sintéticas e URL assinada, bloqueio de upload sem vínculo/escrita direta, edição de produto preservando histórico, relatórios, vencimento e saída/reentrada, além dos pedidos e permissões existentes. **Essas adições ainda não foram executadas contra um Supabase de homologação.** Cadastro público, confirmação de e-mail e recuperação não são aprovados por contas administrativamente confirmadas.

O passo a passo completo, implantação de Storage/Edge/Auth, obtenção segura de credenciais e critérios de evidência estão em [HOMOLOGACAO.md](HOMOLOGACAO.md). Nenhuma migração nova é necessária para estas correções.

## Testes efetivamente executados nesta etapa

| Verificação | Resultado e alcance |
|---|---|
| Suíte automatizada | **76 testes locais aprovados, 0 falhas**; cinco testes adicionados |
| Demonstração preservada | **107 verificações aprovadas**, sem erro JS observado; não é backend remoto |
| Regressões de termos/rotas | 2 aprovadas em Chrome headless, com identidade local controlada |
| Configuração de homologação | Recusa principal, destino inválido, ausência de confirmação e chave administrativa no campo público; só quatro campos públicos exportados |
| Bootstrap das sete migrações | Aplicado em PGlite local vazio, sete versões registradas, piloto desabilitado, nenhum usuário; segunda aplicação recusada e loja anterior preservada |
| Imagem de upload | PNG sintético 8×6 validado pelo verificador real; sem dados pessoais e abaixo dos limites |
| Build | Sucesso; artefatos locais atualizados, sem publicação |
| Sintaxe | JavaScript dos novos scripts/gate verificado; PowerShell analisado pelo parser, sem executar prompts |
| Executor remoto | **PENDENTE**, saída 2 esperada por configuração ausente; não fez chamadas de teste ao principal |
| SQL em produção | Nenhum executado nesta etapa; migrações 001–007 não editadas/reaplicadas |

O primeiro teste dos termos tinha uma expectativa de URL incompatível com a query da própria fixture; foi corrigido para comparar o fragmento. O gerador inicialmente recusou o comentário de cabeçalho da 001; passou a tratar o comentário antes de validar a transação, preservando a migração original. Depois dessas correções, os testes acima passaram.

## Classificação dos fluxos completos em homologação remota

**APROVADA** exige comprovação remota do fluxo correspondente. **REPROVADA** exige erro remoto reproduzível. Teste local aprovado não altera esta classificação.

| Funcionalidade | Classificação | O que falta |
|---|---|---|
| Termos comerciais e redirecionamento protegido | PENDENTE | Correções validadas localmente; não publicadas nem homologadas em frontend conectado ao novo projeto |
| Cadastro público de cliente | PENDENTE | Projeto isolado, SMTP e conta criada pela UI |
| Confirmação de e-mail | PENDENTE | Receber e consumir mensagem real de teste |
| Login e logout | PENDENTE | Sessão real e saída pela UI no novo ambiente |
| Recuperação de senha | PENDENTE | Entrega e consumo do e-mail, senha nova aceita/anterior recusada |
| Cadastro e aprovação de estabelecimento | PENDENTE | Operador/administrador exclusivo de teste e fluxo completo |
| Cadastro e edição de produtos | PENDENTE | Executar API e UI no projeto novo |
| Upload e leitura de imagens | PENDENTE | Edge implantada no projeto novo; upload válido e restrições remotas |
| Carrinho e finalização | PENDENTE | Frontend sem demo, pedido persistido e total validado no servidor |
| Recebimento e atualização pelo vendedor | PENDENTE | Duas sessões reais e transições do mesmo pedido |
| Chat | PENDENTE | Mensagens persistidas e recebidas em sessões distintas |
| Notificações Realtime autenticadas | PENDENTE | Eventos postgres_changes de contas reais, sem contar polling/broadcast anônimo |
| Relatórios e comissões | PENDENTE | Pedidos sintéticos concluídos e conferência dos relatórios/lançamentos |
| Isolamento entre contas | PENDENTE | Clientes A/B e lojas A/B com JWTs reais no ambiente isolado |
| Operações não autorizadas | PENDENTE | Tentativas remotas autenticadas e anônimas no projeto de testes |

Não houve nova funcionalidade APROVADA remotamente nesta etapa. Não foi diagnosticada REPROVAÇÃO remota em homologação, pois o ambiente ainda não está disponível. As leituras e bloqueios remotos limitados da auditoria anterior continuam sendo evidências históricas daquele escopo, não aprovação destes fluxos completos.

## Arquivos criados/modificados

- `app.js`: termos e normalização de rotas, preservando a arquitetura existente.
- `tests/legal-navigation.test.cjs`, `tests/homologation.test.cjs`, `tests/helpers/upload-fixture.cjs`: regressões locais, bootstrap/segurança de destino e imagem sintética.
- `scripts/homologation-config.cjs`, `scripts/prepare-homologation.cjs`, `scripts/run-homologation.cjs`, `scripts/Test-Homologacao.ps1`: configuração, preparação e execução segregadas.
- `scripts/serve.cjs`, `package.json`: novos comandos/porta de homologação; fluxo habitual preservado.
- `tests/supabase-live.cjs`: ampliação do gate real, preflight anterior às fixtures, verificação de saída e encerramento de conexões; não executado remotamente.
- `supabase/homologacao.env.example`: modelo sem credenciais reais.
- `docs/HOMOLOGACAO.md`, este relatório e aviso na auditoria: instruções e evidências atualizadas.

Logs e resultados locais estão em `test-results/homologation/`, ignorados pelo Git. Arquivos anteriores do usuário foram preservados. Não foi usado backup de produção para construir o novo ambiente, importado dado pessoal, criada conta externa, habilitado piloto principal, desligado RLS ou publicado o aplicativo.

## Próximo passo e veredito

Você precisa criar o projeto **NortFood-Homologacao** e informar somente URL/chave pública; segredos serão recebidos por terminal protegido. O agente poderá então aplicar o schema/Edge nesse destino novo, preparar o operador e executar a parte independente de SMTP. Para concluir os testes de e-mail será necessário escolher SMTP e remetente verificado.

**Preparado para iniciar a homologação após criar o ambiente. Ainda não preparado para iniciar um beta com clientes reais.** Bloqueios: ambiente remoto isolado, SMTP, fluxos completos com contas reais de teste, domínio HTTPS para publicação, preparação operacional/catálogo e revisão dos termos. A página de rascunho é uma correção de transparência, não aprovação jurídica.
