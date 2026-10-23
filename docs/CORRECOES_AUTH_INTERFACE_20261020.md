# Correções de autenticação e interface — 20/10/2026

## Problemas encontrados e correções

1. **Google:** botão permanentemente desabilitado, sem chamada OAuth. A configuração pública remota da homologação confirmou `external.google=false`; iniciar `/auth/v1/authorize?provider=google` retorna HTTP 400. Portanto, não se trata de login Google funcional com uma falha somente visual. Foi preparado o fluxo `signInWithOAuth`, retorno para a origem raiz, persistência pelo SDK, mensagens seguras e disponibilidade consultada no próprio Supabase. O botão só fica habilitado quando o provedor realmente estiver ativo. Não foi inventado Client ID, Secret ou sucesso de login.
2. **Login por senha:** o submit comercial autenticava mas não fechava o modal. Agora fecha após o sucesso, carrega o contexto autorizado e navega para a área correta. Erros mantêm formulário e feedback; confirmação pendente recebe mensagem específica. O login aceita a senha existente sem impor novamente a regra de tamanho de cadastro; novos cadastros continuam exigindo 12 caracteres. Submit bloqueia repetição e informa `aria-busy`.
3. **Cadastro:** a entrada inicial agora prioriza Criar conta, com Já tenho uma conta — Entrar como opção secundária. Quando o servidor devolve sessão válida, ela é usada imediatamente. Sem sessão, há um diálogo persistente e explícito de confirmação. O evento SIGNED_IN fecha o diálogo e conclui a entrada após retorno válido, sem guardar ou reapresentar a senha. Confirmação obrigatória permanece habilitada. Cadastro/OAuth escolhem persistência do SDK; Lembrar de mim do login continua sendo respeitado.
4. **Retorno OAuth/confirmação/recuperação:** SDK continua consumindo tokens e recuperando sessão. Erros são capturados antes de o SDK limpar a URL, traduzidos sem reproduzir descrição arbitrária e removidos da URL. A regressão encontrou uma colisão com a função existente `history`; a chamada foi corrigida para `window.history` antes da publicação. Um ensaio real adicional encontrou recuperação que chegava às Configurações sem abrir o formulário. Agora o retorno abre **Definir nova senha** automaticamente, sem pedir senha antiga. O formulário não é remontado se o evento de recuperação se repetir durante o BOOT, preservando valores provisórios. Nenhum token, senha ou Client Secret é gravado em relatório.
5. **Barra inferior:** removidos SVG de recorte, indicador saliente, deslocamento da aba ativa e regras de placa flutuante. Barra branca rente à base, cinco itens por área existente, linha superior discreta, ícones consistentes de 22 px, botões de 64 px, área segura e cor da marca na aba ativa. Configurações/detalhes mapeiam para a seção adequada. Conteúdo e toast reservam espaço. Recolhimento quando teclado reduz a área visível e um campo está ativo, com listeners instalados uma vez.
6. **Início:** removido somente o bloco Buscar produtos/Favoritos/Ofertas/Como funciona, sem contêiner vazio. Busca continua no campo e na barra; favoritos e ajuda permanecem no perfil; rotas e funcionalidades correspondentes preservadas. Banners, categorias, lojas e acesso ao mapa mantidos.
7. **Tema:** permanece exclusivamente claro. Não foi reintroduzido controlador, preferência ou CSS escuro. Fotos, logos e favicons não foram redesenhados.
8. **Avisos:** Supabase configurado e piloto não autorizado é estado legítimo da homologação. Falta de configuração e erros de conexão continuam aparecendo como erros. Não foram escondidos nem liberados pedidos reais.

As duas capturas mencionadas no pedido não estavam disponíveis como imagens nos anexos acessíveis. O trabalho usou inspeção do código, testes e a prévia real; não se afirma análise de imagens ausentes.

## Arquivos

- `src/backend.js`: erros Auth, persistência no cadastro, leitura da disponibilidade Google, chamada OAuth e captura de erro de retorno.
- `src/commercial.js`: encerramento do login, diálogo/entrada após confirmação, validação e ação Google.
- `app.js`: cadastro principal, diálogo, estado Google, tratamento seguro de retorno, barra convencional e retirada dos atalhos.
- `styles.css`, `refinements.css`: retirada das regras de barra flutuante; estilo convencional, safe-area, toast e disponibilidade Google. Paleta clara preservada.
- `assets/ui-runtime.js`, `index.html`: resposta à redução da área útil por teclado.
- `assets/nortfood-backend.js`: bundle gerado pelo build.
- `tests/auth-ui.test.cjs`, `tests/auth-lifecycle.test.cjs`: regressões de cadastro com/sem sessão, confirmação, login negativo/positivo, OAuth disponível/desativado/offline, retorno com erro, barra, remoção de atalhos e teclado simulado.
- `tests/flows.cjs`, `tests/commercial.test.cjs`, `tests/homologation-browser-live.cjs`, `tests/helpers/authenticated-ui.cjs`: testes usam a opção explícita Entrar e os caminhos preservados, em vez dos atalhos removidos.
- `tests/helpers/auth-session-live.cjs`: teste remoto opt-in com conta comum sintética, sem credenciais em disco.
- `package.json`: nova regressão incluída na suíte. Nenhuma dependência adicionada.

Não foram modificados SQL, RLS, bucket, privilégios, piloto, configurações OAuth/SMTP remotas, DNS, ambiente principal ou plano de hospedagem.

## Testes locais

**97/97 testes automatizados finais aprovados**, 0 falhas, 73,39 s: `test-results/auth-ui/full-final-recovery.txt`. **11/11 regressões afetadas aprovadas** após o ajuste de recuperação: `recovery-regression.txt`. **107 verificações finais da demonstração aprovadas**, nenhum erro JavaScript: `demo-final-recovery.txt`. Tempos incluem execução concorrente com navegador de ensaio real.

O primeiro ensaio novo de callback falhou; o diagnóstico identificou a chamada ao `history` local, corrigida e coberta antes da publicação. A demonstração inicialmente ainda buscava os atalhos retirados; foi atualizada para navegar pela barra/perfil, mantendo as verificações de busca, favoritos e isolamento. Não se contou falha como aprovação.

Navegador Chrome local em 320, 360, 390, 430, 768 e 1365 px: sem overflow, barra encostada nas bordas/base, cinco botões, nenhum SVG de placa, banner/categorias preservados e zero atalhos removidos. Teclado: redução de visualViewport simulada com foco em campo esconde a barra; restauração da área mostra a barra. **Não comprova teclado físico de Android/iPhone**, ainda pendente. Testes comerciais controlados mantêm pedidos, chat, paginação, localização e relatórios; não substituem ensaio remoto dessas jornadas.

## Ensaios reais contra Supabase-Homologacao

Somente `zrczgghucwsaxqnyaapk`. Conta comum sintética criada pelo cadastro público; nenhum administrador provisionado, nenhuma Secret Key ou senha de banco necessária. Credenciais e links ficaram apenas em memória.

| Verificação | Resultado | Evidência |
|---|---|---|
| Configuração pública Auth e provedor Google | PENDENTE GOOGLE | `provider-live.json`: settings 200, Google false, authorize 400, e-mail ativo, confirmação obrigatória, cadastro permitido |
| Cadastro público e recusa antes de confirmar | APROVADO REMOTO API | `smtp-live.json` |
| E-mail de confirmação recebido e conta comum confirmada | APROVADO REMOTO SMTP DE CAPTURA | Mesma evidência; link real e identidade/ausência de admin conferidas |
| Login/logout com credencial confirmada | APROVADO REMOTO API | Mesma evidência |
| Recuperação, troca e rejeição da senha anterior | APROVADO REMOTO SMTP DE CAPTURA | Mesma evidência; links consumidos não criam segunda sessão |
| Login pela interface local, SDK real, modal fecha e identidade correta | APROVADO REMOTO + UI LOCAL | `session-live.json` |
| Reload mantém usuário e não abre login | APROVADO REMOTO + UI LOCAL | Mesma evidência |
| Novo contexto de navegador com estado SDK persistido retoma sessão sem senha | APROVADO REMOTO + UI LOCAL | Mesma evidência; estado só em memória, sem arquivo de tokens |
| Logout continua encerrado após reload | APROVADO REMOTO + UI LOCAL | Mesma evidência |
| Cadastro pela interface e diálogo de confirmação pendente | APROVADO REMOTO + UI LOCAL + SMTP | `email-ui-live.json`, sem transporte simulado |
| Abrir e-mail real conclui a entrada na interface sem reenviar senha | APROVADO REMOTO + UI LOCAL + SMTP | Mesma evidência; identidade conferida pelo SDK real |
| Solicitar recuperação na UI e abrir o formulário pelo e-mail real | APROVADO REMOTO + UI LOCAL + SMTP | Mesma evidência; formulário real, mínimo de 12 caracteres; sessão encerrada sem trocar senha pela UI neste ensaio. A troca real foi comprovada separadamente pela API em `smtp-live.json` |
| Login Google com consentimento/conta Google real | PENDENTE | Provedor desativado; não pode ser considerado aprovado pelos testes controlados |
| Entrega de e-mail a clientes externos | PENDENTE | Ethereal captura; não entrega mensagens a clientes reais |

SMTP permaneceu na caixa gratuita de captura já configurada. Não houve troca de provedor/senha ou alteração de templates nesta etapa. O Chrome do ensaio isolado precisou do caminho explícito da instalação existente; nenhuma ferramenta foi instalada para contornar isso. Testar novo contexto persistido não equivale a fechar toda a instância pessoal do navegador do proprietário.

O primeiro ensaio completo de e-mail pela UI aprovou cadastro/entrada automática e **reprovou a abertura do formulário de recuperação**. Evidência original preservada em `email-ui-first.json`. Após a correção, os quatro recortes de `email-ui-live.json` passaram com uma nova conta sintética. Nenhuma conta/histórico anterior foi apagado.

## Configuração externa mínima ainda necessária

Google: obter um cliente OAuth de aplicativo Web no Google Cloud da operação, configurar tela de consentimento e contas de teste conforme o modo escolhido; callback autorizado exato **`https://zrczgghucwsaxqnyaapk.supabase.co/auth/v1/callback`**. Inserir Client ID/Client Secret **somente nos campos protegidos do provedor Google no Supabase-Homologacao** e ativá-lo. Não colocar o Secret no frontend ou enviá-lo no chat. Conferir retorno exato da aplicação `https://lucky-lamington-022ea1.netlify.app` na allowlist Supabase, sem wildcard. O retorno HTTPS já foi comprovado com links de e-mail nesta etapa; isso não comprova configuração Google. Consentimento/login real Google exige a participação do titular da conta quando solicitado pelo Google.

**Intervenção atual mínima:** o Console Google foi acessado automaticamente e está autenticado, mas bloqueado pela aceitação inicial de Termos de Serviço. A aba foi deixada para o titular decidir, sem aceitar acordos nem configurar cobrança. A ferramenta de navegação exige confirmação para acordos legais. A lista técnica acima não é um pedido para o proprietário executar toda a configuração manualmente: após essa decisão, a investigação/configuração gratuita pode continuar automaticamente, respeitando eventuais consentimentos específicos. Captura: `google-terms-handoff.png`.

E-mail de produção: provedor de entrega e remetente verificado/autorizado; a captura não atende clientes. Não foi contratado serviço ou comprado domínio.

Fontes oficiais: [Google no Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google), [retornos Auth](https://supabase.com/docs/guides/auth/redirect-urls), [cadastro e confirmação](https://supabase.com/docs/reference/javascript/auth-signup). As configurações são distintas por projeto; não copiar credenciais nem alterar o principal para testar.

## Publicação HTTPS

Build isolado validado, sem chaves privadas, apontando somente para a homologação, com banner/noindex e pedidos reais bloqueados. A prévia privada Netlify foi mantida como destino porque a Hostinger continua sem hospedagem autenticada/origem validada. Não houve upload à Hostinger nem alteração de DNS.

**Prévia final:** https://lucky-lamington-022ea1.netlify.app, deploy **`6ad7d58da165f7c1c4db882e`**, privado. O primeiro deploy desta etapa, `6ad7d2cdfd8e0b5c27c82952`, já teve login real com modal encerrado, reload, nova aba HTTPS recuperando a sessão e logout refletido nas duas abas. O último acrescenta a correção de recuperação comprovada em `email-ui-live.json`, sem mudanças de segurança ou hospedagem.

Na URL publicada, conferidos cadastro como opção principal, Google desativado com explicação, cinco botões em barra branca rente à base, ausência dos quatro atalhos e de recorte SVG, ausência de overflow e preservação do noindex/banner/piloto bloqueado. **0 erros de console capturados.** Origem e permalink final recusam **10/10 acessos anônimos com 401**, incluindo configuração, HTML, app e SDK. Provas: `https-result.json`, `protection-final.json` e `https-home-final.png`, em `test-results/auth-ui/`.

**35 arquivos protegidos mantiveram seus hashes**, incluindo configurações, migrações, funções Supabase, ambientes, scripts de publicação, identidade e favicons (`protected-configs.json`). Arquivo final de publicação: `nortfood-auth-recovery-final-20261020.zip`, **21.698.493 bytes**, SHA-256 `6a5ad4037df3a8f66100cf0d48026786f969a4a743f2df2eb4c45b16edf3572a`. Não contém relatórios, capturas, ambientes, credenciais privadas ou fontes de servidor.

As aprovações de SMTP/UI local usam o Supabase real, mas são distintas da inspeção HTTPS e dos testes com transporte controlado. Nenhum fluxo Google real foi aprovado. Teste de teclado físico e entrega externa de e-mail continuam pendentes.

**Não liberar beta público:** Google real e entrega externa de e-mail continuam pendentes. A aprovação dos recortes acima não aprova os fluxos operacionais/jurídicos restantes já documentados.
