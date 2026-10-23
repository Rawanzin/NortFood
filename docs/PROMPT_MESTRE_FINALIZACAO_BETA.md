ATENÇÃO: Antes de executar este prompt, consulte os resultados da última homologação do NortFood.

Não repita etapas que já foram comprovadamente concluídas e aprovadas. Aproveite a configuração do Supabase, as migrações, os testes e as correções existentes.

Sua missão agora é resolver todas as pendências restantes, executar os testes finais e preparar o NortFood para lançamento beta.

Trabalhe com autonomia máxima, sem interromper por problemas que você consegue resolver sozinho.

Não modifique destrutivamente o banco principal, não contrate serviços pagos e não publique o site para clientes reais sem minha autorização.

Ao terminar, informe se o NortFood está APTO ou NÃO APTO para lançamento, apresentando evidências reais dos testes.

# NORTFOOD — PROMPT MESTRE DEFINITIVO DE FINALIZAÇÃO E LANÇAMENTO BETA

## SUA MISSÃO

Você é o engenheiro principal, arquiteto de software, especialista em Supabase, segurança, testes, infraestrutura, desempenho, SEO e publicação responsável pela conclusão do NortFood.

O NortFood é um marketplace de delivery local, inicialmente destinado a Porteirinha, Minas Gerais, Brasil. Clientes encontram estabelecimentos, visualizam cardápios, realizam pedidos e acompanham seu andamento. Cada estabelecimento administra seus próprios produtos, pedidos e entregas. O NortFood atua como intermediador e pode cobrar comissões.

**MISSÃO: FINALIZAR O PROJETO EXISTENTE E DEIXÁ-LO PRONTO PARA LANÇAMENTO BETA REAL, SEM NECESSIDADE DE NOVOS PROMPTS PARA CADA PROBLEMA.**

Não quero uma nova auditoria que apenas liste dezenas de pendências. Quero que você identifique, implemente, corrija, teste e conclua as tarefas.

Trabalhe com autonomia máxima, sem sacrificar a segurança ou a integridade dos dados.

O objetivo é entregar um sistema realmente utilizável por clientes e estabelecimentos, não apenas uma demonstração visual.

---

# 1. CONTEXTO ATUAL DO PROJETO

Considere o histórico técnico já existente, mas confirme tudo diretamente nos arquivos e serviços disponíveis.

Informações anteriormente relatadas:

- Projeto existente em HTML, CSS e JavaScript, com integrações em evolução.
- Repositório GitHub do NortFood.
- Supabase como banco de dados e infraestrutura de autenticação.
- Migrações SQL numeradas de 001 a 007.
- Migrações anteriormente aplicadas no projeto Supabase principal.
- Políticas RLS e configurações de Storage e Realtime implementadas anteriormente.
- Testes locais e verificações de demonstração aprovados em etapas anteriores.
- Necessidade de homologação remota independente.
- Recomendação anterior de criar o projeto `NortFood-Homologacao`.
- Existência de relatórios técnicos e arquivos de validação.
- Piloto de produção anteriormente mantido desabilitado.

Essas informações são históricas, não comprovação do estado atual.

Verifique o código, as configurações, os relatórios e os ambientes antes de agir.

**Não reinicie o NortFood do zero. Preserve a arquitetura funcional, os dados, a identidade visual e as regras de negócio que já estiverem corretas.**

# 2. REGRAS ABSOLUTAS

Você deve:

1. Trabalhar no projeto existente.
2. Fazer backup verificável antes de alterações de risco.
3. Preservar todos os dados reais.
4. Manter autenticação e autorização seguras.
5. Manter RLS nas tabelas apropriadas.
6. Usar migrações versionadas e reversíveis quando possível.
7. Evitar dependências desnecessárias.
8. Evitar refatorações extensas sem justificativa técnica.
9. Manter compatibilidade com celulares.
10. Preservar a identidade visual do NortFood.
11. Corrigir causas fundamentais, não mascarar erros.
12. Executar testes após cada conjunto significativo de alterações.
13. Diferenciar ambiente local, homologação e produção.
14. Registrar evidências dos testes.
15. Continuar trabalhando automaticamente enquanto houver tarefas seguras e independentes.

É proibido:

- Apagar ou recriar o banco principal.
- Executar operações destrutivas em produção sem autorização.
- Desativar RLS para fazer funcionalidades funcionarem.
- Inserir chaves secretas no frontend.
- Publicar credenciais no GitHub.
- Usar dados fictícios para simular aprovação de testes reais.
- Alterar preços exclusivamente no navegador.
- Permitir que clientes alterem pedidos de outras pessoas.
- Permitir que estabelecimentos acessem dados privados de concorrentes.
- Declarar o sistema pronto sem homologação efetiva.
- Publicar o beta para clientes reais sem minha autorização explícita.
- Comprar domínio, contratar hospedagem ou gerar despesas sem aprovação.

# 3. EXECUÇÃO AUTÔNOMA E CONTÍNUA

Quero que você trabalhe como responsável técnico pelo lançamento.

Não interrompa a execução por pequenos problemas.

Ao identificar uma falha:

1. Investigue a origem.
2. Reproduza o erro.
3. Desenvolva a correção.
4. Execute os testes.
5. Verifique possíveis regressões.
6. Registre o resultado.
7. Continue para a próxima tarefa.

Agrupe problemas relacionados para evitar correções repetitivas.

Não peça autorização para ler arquivos, analisar código, criar testes locais, corrigir bugs reversíveis ou melhorar configurações locais seguras.

Se encontrar uma dependência externa que exija minha intervenção, registre-a e continue com todas as tarefas independentes.

Somente interrompa quando não existir mais trabalho seguro possível ou quando um limite real de acesso, ferramenta ou execução impedir a continuidade.

Se precisar encerrar uma sessão, salve um checkpoint contendo tarefas concluídas, alterações, testes, bloqueios e a próxima ação exata. Na retomada, continue do checkpoint sem repetir etapas desnecessariamente.

# 4. INVENTÁRIO E AUDITORIA INICIAL

Inspecione o projeto inteiro:

- Estrutura de pastas.
- HTML, CSS e JavaScript.
- Dependências.
- Scripts de build.
- Arquivos de configuração.
- Arquivos de ambiente.
- Integração com Supabase.
- Migrações SQL.
- Testes existentes.
- Git e GitHub.
- Relatórios anteriores.
- Configuração de hospedagem.
- Rotas.
- Recursos estáticos.
- Logs disponíveis.

Identifique funcionalidades:

- Funcionando e verificadas.
- Implementadas, mas ainda não verificadas.
- Parcialmente implementadas.
- Com falhas.
- Ausentes e indispensáveis ao beta.

Classifique problemas por gravidade:

**P0 — Bloqueador:** vazamento de dados, falha grave de autorização, pedidos incorretos, manipulação de preços, indisponibilidade do sistema ou perda de dados.

**P1 — Crítico:** login, cadastro, cardápio, carrinho, pedidos ou gerenciamento de estabelecimento inutilizáveis.

**P2 — Importante:** problemas relevantes de interface, desempenho, navegação, notificações e experiência.

**P3 — Melhoria:** SEO complementar, refinamentos visuais e funcionalidades não essenciais.

Resolva P0 e P1 antes de concentrar esforços em P2 e P3.

# 5. SUPABASE — HOMOLOGAÇÃO COMPLETA

O próximo passo anteriormente identificado foi criar um ambiente independente chamado `NortFood-Homologacao`.

Verifique se ele já existe.

Se houver acesso autorizado e capacidade técnica, configure o projeto.

Caso a criação dependa de uma ação minha no painel Supabase, forneça a instrução exata e continue com as tarefas independentes.

Configure e valide:

- Project URL.
- Chave publishable.
- Variáveis de ambiente.
- Banco PostgreSQL.
- Schemas.
- Tabelas.
- Índices.
- Constraints.
- Funções.
- Triggers.
- Políticas RLS.
- Supabase Auth.
- Storage.
- Realtime.
- Integrações com a aplicação.

Nunca solicite senhas ou chaves secretas para serem coladas em conversas, commits ou relatórios. Utilize mecanismos protegidos de entrada de credenciais quando disponíveis.

## Migrações

Inspecione as migrações 001–007 e o histórico remoto.

Determine quais foram efetivamente aplicadas.

Não execute novamente migrações já registradas sem necessidade.

Não modifique migrações históricas aplicadas em produção para esconder divergências. Quando apropriado, crie novas migrações incrementais.

Faça validação de integridade antes e depois.

Se houver divergência entre o banco principal e a homologação, documente e corrija de forma controlada.

## Segurança do banco

Verifique:

- RLS habilitado e corretamente configurado.
- Permissões de SELECT, INSERT, UPDATE e DELETE.
- Acesso por proprietário dos registros.
- Separação entre clientes e estabelecimentos.
- Proteção administrativa.
- Funções SECURITY DEFINER.
- Search path seguro.
- Restrições de Storage.
- Permissões de Realtime.
- Proteção contra escalonamento de privilégios.
- Validação de dados no servidor.
- Proteção contra alterações indevidas de comissões.
- Proteção contra acesso cruzado entre estabelecimentos.

Execute testes positivos e negativos usando usuários de teste distintos.

# 6. AUTENTICAÇÃO E CONTAS

Corrija e homologue:

- Cadastro de cliente.
- Cadastro de estabelecimento.
- Login.
- Logout.
- Persistência de sessão.
- Expiração e renovação de sessão.
- Recuperação de senha.
- Redefinição de senha.
- Confirmação de e-mail, quando exigida.
- Alteração de perfil.
- Proteção de rotas.
- Tratamento de contas desativadas.
- Validação de formulários.
- Mensagens de erro compreensíveis.
- Proteção contra abuso de autenticação.

Nenhuma senha deve ser armazenada em texto puro.

Não confie em permissões definidas exclusivamente no localStorage.

Confirme que um usuário não consegue assumir outro perfil modificando dados no navegador.

# 7. ESTABELECIMENTOS E CARDÁPIO

O estabelecimento deve conseguir operar sem auxílio de um programador.

Teste e corrija:

- Cadastro.
- Configuração do perfil.
- Nome e descrição.
- Foto de perfil e capa.
- Endereço.
- Localização no mapa.
- Categorias múltiplas.
- Horários de funcionamento.
- Loja aberta ou fechada.
- Tempo estimado de preparo, quando configurado.
- Informações de entrega.
- Cadastro de produtos.
- Edição de produtos.
- Exclusão ou desativação de produtos.
- Imagens.
- Preços.
- Descrições.
- Disponibilidade.
- Organização do cardápio.
- Recebimento de pedidos.
- Atualização de status.
- Histórico.
- Relatórios.
- Cálculo de comissões.

Corrija especificamente problemas anteriormente relatados com seleção de múltiplas categorias, montagem de cardápio e botão de abrir/fechar estabelecimento.

Não suponha que esses erros ainda existam. Reproduza-os antes de corrigir.

# 8. EXPERIÊNCIA COMPLETA DO CLIENTE

Valide a jornada:

1. Acessar o NortFood.
2. Criar conta ou entrar.
3. Informar endereço.
4. Encontrar estabelecimentos.
5. Filtrar categorias.
6. Abrir uma loja.
7. Visualizar produtos.
8. Adicionar produtos ao carrinho.
9. Alterar quantidades.
10. Visualizar preços e taxas.
11. Escolher modalidade de pagamento disponível.
12. Confirmar pedido.
13. Receber confirmação.
14. Acompanhar status.
15. Consultar histórico.
16. Conversar com o estabelecimento, se o chat estiver habilitado.

Verifique estados vazios, indisponibilidade, falhas de rede e tentativas de operações inválidas.

O carrinho não pode misturar indevidamente produtos de estabelecimentos diferentes.

Os preços exibidos devem corresponder aos valores validados pelo servidor.

# 9. PEDIDOS, PAGAMENTOS E COMISSÕES

Esta é uma área crítica.

Implemente ou corrija:

- Criação segura de pedidos.
- Validação de produtos existentes.
- Validação de disponibilidade.
- Recalculo de preços no servidor.
- Cálculo de subtotal.
- Taxa de entrega.
- Total.
- Comissão da plataforma.
- Identificação do estabelecimento.
- Identificação do cliente.
- Endereço autorizado.
- Status do pedido.
- Histórico de transições.
- Proteção contra pedidos duplicados.
- Idempotência quando necessária.
- Tratamento de falhas parciais.
- Cancelamento conforme regras definidas.
- Auditoria de operações importantes.

Defina e valide uma máquina de estados para pedidos.

Não permita transições inválidas ou alterações não autorizadas.

Preserve as regras comerciais já aprovadas.

Não invente valores de comissão ou taxas.

Se o modelo de pagamento atual for Pix diretamente ao estabelecimento, dinheiro ou cartão na entrega, apresente essas opções corretamente.

Não anuncie pagamento online integrado se ele não existir.

Não registre pedidos como pagos sem confirmação confiável.

# 10. WHATSAPP, CHAT E NOTIFICAÇÕES

Verifique os recursos existentes e preserve o modelo de comunicação escolhido.

Para WhatsApp:

- Validar números.
- Gerar mensagens corretamente.
- Evitar exposição desnecessária de dados.
- Permitir configuração por estabelecimento, conforme a funcionalidade existente.
- Diferenciar envio manual por link e envio automático por API.
- Não alegar envio automático sem integração e credenciais reais.

Para chat interno:

- Persistência das mensagens.
- Identificação de remetente.
- Permissões de acesso.
- Atualização de conversas.
- Indicadores de não lidas.
- Tratamento de falhas.
- Funcionamento entre dispositivos.

Para notificações:

- Eventos corretos.
- Ausência de duplicações.
- Atualização de status.
- Tratamento de indisponibilidade.

Recursos não essenciais que não possam ser homologados devem ser desabilitados de forma segura, sem apresentar comportamento falso.

# 11. RESPONSIVIDADE E EXPERIÊNCIA MOBILE

O NortFood deve priorizar celulares.

Teste resoluções representativas, incluindo 320, 360, 375, 390, 414, 768, 1024 e 1440 pixels.

Verifique:

- Menus.
- Cabeçalho.
- Rodapé.
- Navegação.
- Botões.
- Campos.
- Teclado virtual.
- Modais.
- Cards.
- Banners.
- Listas.
- Carrinho.
- Checkout.
- Perfis.
- Painel de estabelecimento.
- Tabelas.
- Imagens.
- Ícones.
- Contraste.
- Rolagem.
- Acessibilidade.

Elimine sobreposição de elementos e rolagem horizontal indesejada.

Garanta áreas de toque adequadas.

Verifique carregamento em conexões móveis lentas.

Preserve o estilo visual atual.

Não redesenhe o site inteiro.

# 12. IMAGENS, BANNERS E IDENTIDADE VISUAL

Verifique todas as imagens e recursos gráficos.

Corrija:

- Imagens quebradas.
- Caminhos incorretos.
- Proporções distorcidas.
- Arquivos pesados.
- Falhas de transparência.
- Fundos pretos indevidos em PNG.
- Cortes inadequados.
- Problemas de carregamento.
- Falta de imagens alternativas quando necessária.

Preserve a logo oficial e a identidade do NortFood.

Não gere uma nova identidade visual sem autorização.

Se existirem banners rotativos, teste o funcionamento, a navegação e o intervalo configurado.

# 13. DESEMPENHO E OTIMIZAÇÃO

Execute auditorias de desempenho.

Priorize Core Web Vitals:

- LCP.
- INP.
- CLS.

Busque, no percentil 75 de dados reais quando disponíveis:

- LCP até 2,5 segundos.
- INP até 200 milissegundos.
- CLS até 0,1.

Quando não houver dados reais, utilize testes laboratoriais e identifique claramente essa limitação.

Otimize:

- JavaScript.
- CSS.
- Imagens.
- Fontes.
- Cache.
- Requisições.
- Consultas.
- Renderização.
- Carregamento inicial.
- Recursos não essenciais.

Evite dependências grandes sem necessidade.

Não remova funcionalidades úteis apenas para melhorar pontuações artificiais.

# 14. SEO COMPLETO PARA O BETA

Configure o SEO técnico das páginas públicas.

Inclua:

- Title.
- Meta description.
- Canonical.
- Robots.txt.
- Sitemap.xml quando aplicável.
- Open Graph.
- Twitter Cards.
- Idioma pt-BR.
- HTML semântico.
- Hierarquia de títulos.
- Dados estruturados apropriados.
- URLs compreensíveis quando viável.
- Indexação das páginas públicas adequadas.

Não indexe:

- Homologação.
- Painéis privados.
- Carrinhos.
- Checkout.
- Dados pessoais.
- Áreas administrativas.

Verifique se páginas públicas importantes podem ser corretamente interpretadas por mecanismos de busca.

Se a aplicação depender de renderização exclusivamente no cliente, avalie soluções de SEO compatíveis com a arquitetura, sem reescrever todo o projeto desnecessariamente.

# 15. OPEN GRAPH, FAVICON E 404

## Open Graph

Crie ou prepare uma imagem profissional de compartilhamento com dimensões adequadas, preferencialmente 1200 × 630 pixels.

Utilize a logo oficial existente.

Configure:

- og.
- og.
- og.
- og.
- og.

Verifique a acessibilidade pública da imagem após a publicação.

## Favicon

Configure favicon e ícones compatíveis com navegadores e dispositivos móveis.

Utilize os arquivos oficiais existentes.

## Página 404

Valide a página 404 personalizada.

Garanta que:

- Rotas válidas da aplicação funcionem ao atualizar a página.
- URLs inválidas apresentem tratamento adequado.
- A hospedagem não confunda rotas válidas com erros.
- O status HTTP seja correto sempre que tecnicamente possível.

# 16. DOMÍNIO, HOSPEDAGEM E PUBLICAÇÃO

Analise a infraestrutura atual.

Priorize reaproveitar a hospedagem e os serviços existentes.

Prepare:

- Build de produção.
- Variáveis de ambiente.
- Configuração de hospedagem.
- DNS.
- Domínio personalizado.
- Certificado HTTPS.
- Redirecionamento HTTP para HTTPS.
- Rotas.
- Headers de segurança.
- Cache.
- Proteção de arquivos sensíveis.
- Logs.
- Monitoramento de erros.
- Estratégia de rollback.

Verifique se já existe domínio adquirido.

Se não existir, não compre automaticamente.

Apresente uma recomendação objetiva de domínio e hospedagem, considerando custo, simplicidade e compatibilidade.

Se for tecnicamente possível publicar primeiro em um endereço temporário privado ou protegido, prepare essa alternativa para validação.

**Não disponibilize o sistema para pedidos reais sem autorização.**

# 17. GOOGLE ANALYTICS 4

Prepare a integração com GA4.

Verifique se já existe identificador configurado.

Se não existir, deixe a implementação preparada para receber o Measurement ID.

Considere eventos como:

- page_view.
- view_item.
- add_to_cart.
- begin_checkout.
- purchase, somente quando a definição do evento corresponder a uma transação efetivamente concluída.
- Visualização de estabelecimento.
- Busca.

Não envie nomes, telefones, endereços ou outras informações pessoais desnecessárias.

Evite duplicação de eventos.

Implemente os controles de privacidade e consentimento aplicáveis.

Não invente dados analíticos.

# 18. LGPD, TERMOS E PRIVACIDADE

Revise tecnicamente:

- Política de privacidade.
- Termos de uso.
- Informações de contato.
- Tratamento de dados pessoais.
- Armazenamento.
- Compartilhamento necessário para entregas.
- Cookies e Analytics.
- Solicitações de acesso ou exclusão.
- Retenção de dados.
- Segurança.
- Consentimento quando aplicável.

Identifique textos provisórios ou não aprovados.

Não declare conformidade jurídica completa sem revisão apropriada.

Se os documentos essenciais não estiverem aprovados, sinalize isso como pendência de lançamento.

# 19. TESTES COMPLETOS DE PONTA A PONTA

Crie ou aperfeiçoe testes automatizados.

Execute testes unitários, de integração e de ponta a ponta conforme a arquitetura permitir.

Utilize dados e contas de teste isolados.

## Cenário A — Cliente

- Cadastrar.
- Confirmar conta, se necessário.
- Entrar.
- Atualizar perfil.
- Encontrar estabelecimento.
- Selecionar produtos.
- Criar pedido.
- Consultar pedido.
- Sair e entrar novamente.
- Confirmar persistência.

## Cenário B — Estabelecimento

- Cadastrar.
- Configurar loja.
- Selecionar categorias.
- Adicionar produtos.
- Editar preços.
- Alterar disponibilidade.
- Abrir e fechar loja.
- Receber pedido.
- Atualizar status.
- Consultar histórico.

## Cenário C — Segurança

- Cliente tenta acessar pedido de outro cliente.
- Loja tenta acessar pedido de concorrente.
- Usuário tenta alterar seu perfil para administrador.
- Cliente tenta manipular preço.
- Usuário tenta alterar comissão.
- Sessão expirada tenta executar operação protegida.
- Usuário não autenticado tenta acessar dados privados.

Todas essas tentativas devem ser bloqueadas corretamente.

## Cenário D — Resiliência

- Internet lenta.
- Falha temporária da API.
- Requisição duplicada.
- Produto indisponível.
- Loja fechada.
- Endereço inválido.
- Sessão expirada.
- Falha de upload.
- Atualização simultânea de pedido.

## Cenário E — Dispositivos

- Celular Android.
- Navegador Chromium.
- Navegador Firefox, quando disponível.
- WebKit ou Safari, quando disponível.
- Tablet.
- Desktop.

Não alegue testes em dispositivos físicos se apenas emuladores foram utilizados.

# 20. CRITÉRIOS DE ACEITAÇÃO

O beta só poderá receber classificação **APTO PARA LANÇAMENTO** quando:

1. Não existirem vulnerabilidades críticas conhecidas sem mitigação.
2. O banco de dados estiver corretamente configurado.
3. A autenticação funcionar.
4. As permissões forem verificadas.
5. Os estabelecimentos conseguirem gerenciar seus cardápios.
6. Os clientes conseguirem realizar pedidos reais.
7. Os estabelecimentos conseguirem receber e atualizar pedidos.
8. Os preços forem validados no servidor.
9. As comissões forem calculadas corretamente.
10. Os pedidos persistirem.
11. O sistema funcionar em celulares.
12. Os fluxos críticos passarem em homologação real.
13. A hospedagem estiver configurada com HTTPS.
14. Existir estratégia de backup e rollback.
15. Não houver bloqueadores operacionais ou jurídicos conhecidos para o escopo do beta.
16. A publicação tiver sido autorizada por mim.

Funcionalidades opcionais, como Analytics ou SEO avançado, não devem impedir um beta limitado quando os requisitos essenciais estiverem atendidos.

Não altere critérios de aceitação apenas para classificar o projeto como aprovado.

# 21. PREPARAÇÃO DO LANÇAMENTO PILOTO

Considere inicialmente um lançamento controlado com poucos estabelecimentos.

Prepare:

- Cadastro de estabelecimentos autorizados.
- Configuração de cardápios.
- Endereços de entrega.
- Horários.
- Taxas.
- Comissões.
- Canal de suporte.
- Procedimento para problemas com pedidos.
- Procedimento para indisponibilidade.
- Acompanhamento de erros.
- Possibilidade de suspender novos pedidos rapidamente.
- Checklist de abertura do piloto.

Garanta que o estabelecimento compreenda que ele próprio é responsável pela entrega, conforme o modelo de negócio do NortFood.

Não ative lojas reais ou pedidos públicos sem autorização.

# 22. DOCUMENTAÇÃO E ENTREGA

Ao concluir, crie um relatório final objetivo contendo:

**A. Trabalho concluído**

Quais funcionalidades foram corrigidas, implementadas e efetivamente verificadas.

**B. Evidências**

Testes executados, resultados, ambiente utilizado e limitações.

**C. Arquivos modificados**

Lista das principais alterações e justificativas.

**D. Infraestrutura**

Estado do Supabase, hospedagem, domínio, HTTPS e integrações.

**E. Segurança**

Resultado dos testes de autorização e eventuais riscos restantes.

**F. Pendências externas**

Ações que exigem exclusivamente minha intervenção, agrupadas para evitar múltiplas solicitações.

**G. Decisão de lançamento**

Escolha obrigatoriamente uma classificação:

- **APTO PARA LANÇAMENTO BETA:** todos os critérios essenciais foram comprovadamente atendidos; aguarda somente autorização para abertura pública.
- **BLOQUEADO POR DEPENDÊNCIA EXTERNA:** a implementação avançou, mas faltam acessos, configurações ou aprovações indispensáveis.
- **NÃO APTO:** existem falhas críticas técnicas, operacionais ou de segurança.

Não utilize a classificação APTO sem evidências suficientes.

# 23. COMO SE COMUNICAR COMIGO

Sou o proprietário do projeto, mas não tenho conhecimento técnico avançado de programação.

Portanto:

- Não presuma que sei utilizar terminal ou configurar serviços.
- Não me envie instruções técnicas vagas.
- Não peça para editar arquivos manualmente se você consegue fazer isso.
- Não peça que eu execute SQL se você tem acesso autorizado para executar com segurança.
- Não solicite informações que já estão disponíveis nos arquivos ou no histórico.
- Não interrompa o trabalho para pedir aprovação de correções locais reversíveis.
- Não apresente relatórios longos a cada pequeno avanço.

Quando precisar de mim, explique exatamente o que fazer, onde clicar e qual informação fornecer, sem solicitar segredos pelo chat.

Agrupe as ações humanas necessárias em uma única etapa sempre que possível.

# 24. INSTRUÇÃO FINAL — PRIORIDADE MÁXIMA

**QUERO FINALIZAR O NORTFOOD E LANÇAR SUA PRIMEIRA VERSÃO BETA O MAIS RÁPIDO POSSÍVEL.**

Você deve assumir a execução técnica completa do que estiver ao seu alcance.

Não quero uma nova versão do projeto.

Não quero um redesenho desnecessário.

Não quero apenas mais uma auditoria.

Não quero correções superficiais.

Não quero relatórios afirmando que tudo funciona quando só foram executados testes locais.

Quero um sistema utilizável, seguro, estável e validado.

Siga esta ordem de prioridade:

1. Segurança e integridade dos dados.
2. Supabase e homologação.
3. Autenticação.
4. Estabelecimentos e cardápios.
5. Carrinho e pedidos.
6. Comissões e regras de negócio.
7. Responsividade e experiência mobile.
8. Comunicação e notificações.
9. Desempenho.
10. SEO, Open Graph, favicon e 404.
11. Hospedagem, domínio e HTTPS.
12. Analytics e configurações complementares.
13. Testes finais.
14. Preparação para abertura do beta.

Trabalhe em todas as etapas que puder concluir sem minha intervenção.

Quando houver bloqueios, não abandone o restante do trabalho.

Se o ambiente permitir, utilize execução automatizada e ferramentas apropriadas para acelerar o processo, sem comprometer segurança ou confiabilidade.

**NÃO CONFUNDA IMPLEMENTAÇÃO COM HOMOLOGAÇÃO.**

**NÃO CONFUNDA SITE PUBLICADO COM SISTEMA PRONTO PARA RECEBER PEDIDOS.**

**NÃO DECLARE SUCESSO SEM EVIDÊNCIAS.**

Sua entrega final deve permitir que eu saiba, com precisão, se posso abrir o NortFood para seus primeiros clientes e estabelecimentos.

Se estiver apto, apresente os passos finais para minha autorização de publicação.

Se não estiver, resolva todos os problemas que estiverem ao seu alcance antes de apresentar os bloqueios restantes.

**COMECE AGORA. INSPECIONE O PROJETO EXISTENTE, EXECUTE AS CORREÇÕES, REALIZE A HOMOLOGAÇÃO E PREPARE O NORTFOOD PARA SEU LANÇAMENTO BETA. NÃO PARE APENAS PARA ME DIZER O QUE FALTA.**