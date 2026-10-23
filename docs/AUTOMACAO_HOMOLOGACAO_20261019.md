# Automação da criação de homologação — 19/10/2026

**Status: PARCIAL — formulário preparado; criação aguarda a definição/confirmação humana da nova credencial do banco.** Não existe ainda um projeto NortFood-Homologacao criado por esta execução. Este documento complementa [o guia](HOMOLOGACAO.md) e [a preparação dos testes](HOMOLOGACAO_RESULTADO_20261019.md).

## Acessos verificados

| Item | Resultado efetivamente observado |
|---|---|
| Supabase CLI | Versão **2.120.0**, executável local disponível no cache de ferramentas; nenhuma dependência adicionada ao aplicativo |
| Autenticação da CLI | **Ausente**: `projects list --output json` encerrou com `Access token not provided` |
| Token de gerenciamento no ambiente/arquivos usuais | Não encontrado; nenhuma credencial foi impressa ou extraída da sessão do navegador |
| Conector Supabase disponível | Nenhum encontrado entre as ferramentas habilitadas |
| Painel web | Sessão autenticada, com acesso à organização NortFood e ao formulário de criação |

O acesso ao painel não foi tratado como token da CLI. Não extraímos cookies, tokens internos ou armazenamento de autenticação do navegador para contornar essa separação. Não foi solicitada senha ou chave secreta pelo chat.

## Plano e cota

O painel mostra duas organizações no plano **Free**. Entre os projetos visíveis da conta:

- Organização NortFood: projeto NortFood ativo; outro projeto pausado.
- Outra organização: um projeto pausado.

Isso representa **um ativo e dois pausados** nas organizações visíveis. A [documentação oficial de cobrança](https://supabase.com/docs/guides/platform/billing-on-supabase) informa limite de dois projetos gratuitos ativos entre organizações em que o usuário é Owner/Administrator, sem contar os pausados. Portanto há indicação de vaga para um segundo projeto ativo gratuito. A aceitação final da criação ainda depende do Supabase; não houve upgrade, inclusão de cartão, adicional pago ou contratação de recursos.

Os projetos existentes foram somente identificados por seus cartões na lista das organizações. Nenhum projeto Rawanzin foi aberto para uso, retomado, modificado ou escolhido como destino de homologação. O projeto principal não foi modificado.

## Proposta preparada no painel

O formulário de criação, ainda não submetido, está preenchido com:

- Organização **NortFood FREE**.
- Nome **NortFood-Homologacao**.
- Região **South America (São Paulo), sa-east-1**.
- Data API habilitada, necessária ao frontend.
- **Automatically expose new tables** desmarcada, para usar os grants explícitos das migrações.
- **Enable automatic RLS** marcada. As migrações também habilitam RLS explicitamente.
- Nenhuma integração GitHub ou recurso pago selecionado.

Durante o preenchimento um clique acionou a geração de senha no formulário. O campo permaneceu mascarado; a senha não foi lida, copiada, registrada ou submetida. O projeto não foi criado. O controle de navegação exige intervenção humana para a entrada/confirmação de novas credenciais; por isso a etapa foi entregue ao responsável antes da submissão.

**Única intervenção imediata:** na aba New Project preparada, definir/substituir a senha no campo protegido, guardá-la com segurança e concluir em **Create new project**, mantendo NortFood FREE. Se surgir cobrança, exigência de upgrade ou bloqueio de cota, parar. Não enviar a senha pelo chat. Depois basta avisar que o painel do novo projeto abriu.

O painel também exibe aviso geral de incidente técnico do provedor. Isso não foi interpretado como falha do NortFood, nem como confirmação de que a criação está indisponível. Se houver falha no provisionamento, deve ser investigada antes de repetir a criação.

## Preparação independente concluída

- As sete migrações foram novamente lidas para gerar o bootstrap local protegido, sem executar SQL remoto e sem importar dados do banco principal.
- `node --test tests/homologation.test.cjs`: **3 testes aprovados**, incluindo configuração segregada/bloqueio do principal, imagem sintética e aplicação 001–007 em PGlite vazio, com recusa de reaplicação e preservação da loja existente.
- O SQL de referência foi atualizado em `test-results/homologation/bootstrap-template.sql`; os hashes dos arquivos foram registrados no inventário privado dessa execução.
- O gerador não abre conexão SQL. O fluxo está preparado para receber a URL real de homologação em `.env.homologacao`, sem alterar `.env` do principal.

Esses testes são **locais**. Não comprovam Auth, Storage, Realtime ou pedidos em um Supabase remoto novo.

## Etapas dependentes ainda não executadas

| Etapa | Estado |
|---|---|
| Criação gratuita do projeto novo | PENDENTE — finalização da credencial/formulário |
| Identificação e configuração da URL/chaves exclusivas de testes | PENDENTE — projeto ainda não provisionado |
| Aplicação 001–007 no novo projeto | PENDENTE — compatibilidade testada localmente; nenhuma aplicação remota nesta execução |
| Implantação de upload-media e configuração de Auth/Storage/Realtime | PENDENTE |
| Provisionamento do operador exclusivo de testes | PENDENTE |
| Gate de integração/segurança remoto que independe de SMTP | PENDENTE |
| Cadastro público, confirmação e recuperação por e-mail | PENDENTE também de SMTP/remetente de testes |

Depois da criação, o agente pode conferir o identificador novo, aplicar o bootstrap nesse destino vazio, implantar a função com origem exata `http://localhost:4174`, configurar os retornos Auth e preparar credenciais por mecanismo protegido para o gate. Nenhum comando será apontado ao principal. A ordem é **001 → 002 → 003 → 004 → 005 → 006 → 007 somente no novo projeto**.

Não foram apagados dados, executadas migrações remotas, reinicializados projetos, desativado RLS, publicado o aplicativo ou criados recursos pagos. Não há novo fluxo remoto APROVADO nesta execução; as etapas dependentes permanecem PENDENTES.

Evidências privadas, ignoradas pelo Git: `test-results/homologation/automacao-acessos.json` e `criacao-proposta.png`. A imagem mostra o formulário proposto, não comprova um projeto criado.

## Retomada em 20/10/2026

A sessão autenticada abriu novamente o formulário New Project, ainda sem confirmação de criação. O nome e as opções de região/segurança estavam nos padrões iniciais; foram preparados novamente: NortFood-Homologacao, organização NortFood FREE, São Paulo, Data API ativa, concessões automáticas desativadas e RLS automático ativo. O campo de senha permanece mascarado e não foi lido, copiado, alterado ou submetido nesta retomada.

A política da ferramenta de navegação exige que a definição e a submissão de nova credencial sejam concluídas pelo usuário. O formulário foi deixado aberto para essa única intervenção: definir/substituir e guardar a senha e clicar em Create new project, interrompendo se aparecer cobrança/upgrade. Nenhum projeto foi criado pelo agente, nenhum SQL remoto foi executado e nenhuma configuração do principal ou dos projetos Rawanzin foi modificada. Migrações e testes remotos continuam PENDENTES até a identificação do novo projeto. Os resultados locais acima são da execução anterior; não foram repetidos nesta retomada.

Evidência atual privada: `test-results/homologation/criacao-20261020.png` (formulário preparado, não projeto provisionado).

### Conferência após confirmação do usuário

O usuário informou que criou gratuitamente o projeto e abriu seu painel. Entretanto, a única aba acessível ao agente ainda estava no formulário New Project. Ao abrir a organização NortFood FREE e recarregar a página, a lista carregada mostrou somente NortFood (`zwkhqahivthzivmuirjr`) e Rawanzin's Project (`pnbvtlcnhyzbparyzvbj`). Não há identificação verificável do novo destino nessa sessão. Foi solicitado somente o link não secreto do painel novo, sem pedir outra criação nem credenciais. Até essa identificação, não foram executados SQL, configurações ou testes remotos. Evidência privada: `test-results/homologation/projetos-20261020.png`.

### Projeto localizado e configuração aplicada em 20/10/2026

Na sessão atual foi confirmado **NortFood-Homologacao**, ref `zrczgghucwsaxqnyaapk`, NortFood FREE, São Paulo. Foram obtidas URL/chave publishable, configurado `.env.homologacao`, aplicadas 001–007 com trava de banco vazio e histórico, implantada `upload-media` e configurados Auth/origem local. Não reaplicar o bootstrap. Resultados efetivos e bloqueios restantes estão em [HOMOLOGACAO_RESULTADO_20261020.md](HOMOLOGACAO_RESULTADO_20261020.md). Os registros anteriores descrevem as sessões anteriores, não o estado atual. Testes autenticados ainda aguardam entrada protegida; nenhum projeto principal ou Rawanzin foi modificado.
