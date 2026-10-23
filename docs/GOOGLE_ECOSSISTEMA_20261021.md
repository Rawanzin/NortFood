# Ecossistema Google do NortFood — 21/10/2026

## Resultado desta execução

Configuração **PARCIAL**. Foi verificada no navegador a sessão de `kevenrawan@gmail.com`. Os serviços usam a mesma identidade Google; não foram criadas senhas separadas, trocada a senha da conta ou gravadas credenciais no projeto. A conta é pessoal, do proprietário, e não uma nova caixa dedicada à marca.

| Serviço | Estado | Evidência e limite |
| --- | --- | --- |
| Conta Google existente | CONCLUÍDO | Conta do proprietário identificada no painel autenticado. Recuperação e 2FA não foram alteradas. |
| Google Analytics 4 | PENDENTE | Iniciado cadastro de conta NortFood e propriedade NortFood - Homologacao. Brasil, fuso São Paulo e BRL preparados; compartilhamento opcional desmarcado. Formulário exige faixa de funcionários ainda não informada. Não existe ID obtido nem propriedade confirmada como criada nesta execução. Aceite de termos solicitado ao proprietário. |
| Google Tag Manager | PENDENTE | Conta NortFood, país Brasil, contêiner NortFood - Homologacao, plataforma Web preparados. Sem compartilhamento anônimo. Modal de termos em português aberto, aguardando autorização do titular. Não existe ID GTM obtido nem criação confirmada. |
| Search Console | BLOQUEADO | Painel autenticado ainda na tela inicial de adicionar site. Domínio oficial não definido. Não foi cadastrada a prévia privada como domínio comercial nem solicitada indexação. |
| Perfil da Empresa | NÃO APLICÁVEL ao modelo descrito | Marketplace somente digital não satisfaz, por si, a elegibilidade para atendimento presencial. Nenhum endereço, fachada ou atendimento foi inventado. Reavaliar somente se existir operação presencial real elegível. |
| Google Ads | BLOQUEADO | Após acessar a conta, o Google exigiu Verificação em duas etapas. A página de segurança exige reautenticação pessoal; deixada para o titular. Sem campanha, promoção, orçamento, cartão, faturamento ou despesa criada. Estrutura offline em `docs/google/ads-draft.json`. |
| Google Cloud / Maps APIs | NÃO APLICÁVEL à navegação atual | O aplicativo usa Leaflet e links oficiais do Google Maps para rota. Maps URLs não exige chave de API; não há necessidade técnica de ativar Google Maps Platform/faturamento para isso. Nenhum projeto Cloud novo ou API paga foi criado. Isso não significa Google OAuth configurado. |

## Projeto preservado e integração existente

Inspecionados configuração pública, geração de metadados, runtime de consentimento, localização, testes e relatórios de hospedagem. Nenhum AGENTS.md foi encontrado no projeto ou nos diretórios pais conferidos. A árvore Git já possuía alterações; estado anterior desta execução salvo em `test-results/google-20261021/status-before.txt`. Foram acrescentados somente documentos e rascunho offline, sem alterar código funcional, ambientes, Supabase ou publicação.

- `scripts/public-config.cjs`: já aceita `NORTFOOD_GA4_MEASUREMENT_ID`, condicionado à origem HTTPS real e à confirmação de medição automática desativada. ID ainda não configurado por esta tarefa.
- `assets/site-runtime.js`: GA4 direto opcional, carregado somente após consentimento e em HTTPS não local; sem nomes, e-mails, endereços ou termos de busca nos parâmetros definidos pelo app. Há revogação de consentimento e limpeza de cookies. Isso é uma medida técnica, não certificação jurídica de LGPD.
- `scripts/site-artifacts.cjs`: gera título, descrição, canonical, Open Graph, robots e sitemap. Por padrão não indexa; homologação força robots bloqueado e sitemap sem URLs. Não foram removidas essas proteções.
- Os links de Maps são gerados em `assets/store-location.js`, sem solicitar posição do cliente e sem chave de API. Não foi alterado o provedor de tiles existente nem prometida cota ilimitada.
- A prévia conhecida é `https://lucky-lamington-022ea1.netlify.app`, destinada à homologação. Não é domínio oficial de produção; esta execução não auditou ou republicou hospedagem.

### Eventos: estado real, sem prometer cobertura inexistente

| Evento | Estado no código inspecionado |
| --- | --- |
| page_view / view_store | Runtime preparado com páginas permitidas e parâmetros de URL sanitizados. Sem validação no GA4 remoto nesta execução. |
| view_item | Gatilho de clique em produto preparado; não equivale a e-commerce completo com items/valores. |
| add_to_cart / begin_checkout | Chamadas no app e allowlist no runtime existentes. Não validados no DebugView. |
| search | Nome permitido, mas não foi comprovado disparo completo no fluxo de busca; não enviar o texto digitado. |
| sign_up / login | Não presentes na allowlist atual. Integração de eventos de sucesso ainda necessária; nunca emitir no mero clique ou incluir identidade. |
| purchase | Não implementado no runtime atual. Não gerar para carrinho, botão de confirmar, erro, demonstração ou pagamento bancário não realizado. Definir gatilho somente após confirmação real no servidor, com deduplicação e sem chamar declaração de pagamento de pagamento processado. |

Ainda não foi instalado GTM. O GA4 direto existente deve ser substituído de forma coordenada quando o contêiner for configurado e validado; instalar ambos simultaneamente duplicaria medição. Não adicionar tags de HTML personalizado, variáveis que leiam formulários ou acionadores automáticos de URL sem revisão. Antes de uso real, validar também o comportamento do SDK remoto, pois testes do runtime local não comprovam ausência de coleta automática do serviço.

## Testes executados

Comando: `node --test tests/beta-release.test.cjs tests/store-location.test.cjs`.

**8 aprovados, zero falhas**, em `test-results/google-20261021/initial-tests.txt`. Incluem consentimento sem carregamento antecipado, parâmetros privados ausentes na fila, recusa/remoção da medição, canonical, noindex, build isolado e navegação de mapas. As chamadas do SDK Analytics nesses testes são interceptadas: **não comprovam recebimento pelo Google, DebugView, publicação GTM ou indexação**. As verificações de conta, formulários e bloqueio 2FA foram reais no navegador.

Captura do aceite pendente: `test-results/google-20261021/gtm-terms-pending.png`. Nenhum formulário de senha foi preenchido ou salvo.

## Intervenções mínimas e continuação

1. Informar a faixa real de funcionários exigida pelo GA4: 1–10, 11–100, 101–500 ou mais de 500; autorizar ou realizar pessoalmente o aceite dos termos padrão gratuitos de Analytics e GTM. Os formulários foram preparados e não devem ser recriados se ainda estiverem abertos.
2. Para Ads, concluir pessoalmente a reautenticação e Verificação em duas etapas com o próprio dispositivo. Não enviar senha, códigos ou chaves de recuperação no chat. O acesso será reavaliado depois, sem criar despesas.
3. Quando o proprietário definir um domínio oficial, utilizá-lo no Search Console, GA4 de produção e configurações de publicação. Não é necessário comprar domínio agora; homologação permanece privada e sem indexação.

Depois dos itens 1–2: concluir recursos gratuitos, obter IDs reais, preparar contêiner e integração exclusiva, testar consentimento e eventos no Preview/DebugView antes de publicar qualquer versão. Analytics de homologação deverá usar propriedade/fluxo separado da produção; não enviar links de confirmação/recuperação, dados reais, segredos nem relatórios privados ao Google. A ausência de domínio não exige desbloquear a prévia para rastreamento.

## Custos e fontes oficiais

Nenhum serviço pago, API faturada, campanha ou domínio contratado. Ads e APIs faturadas exigem autorização separada; créditos promocionais podem exigir gastos e não foram resgatados.

- [Conta Google e verificação pessoal](https://myaccount.google.com/security).
- [Painel Analytics](https://analytics.google.com/) e [configuração oficial de conta, propriedade e fluxo](https://support.google.com/analytics/answer/9304153).
- [Painel Tag Manager](https://tagmanager.google.com/) e [termos do serviço](https://support.google.com/tagmanager/answer/7157428).
- [Search Console](https://search.google.com/search-console/).
- [Google Ads](https://ads.google.com/) e [proteção da conta](https://support.google.com/google-ads/answer/2375456).
- [Elegibilidade do Perfil da Empresa](https://support.google.com/business/answer/13763036): negócios exclusivamente on-line não são elegíveis.
- [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started): navegação por URL não exige API key.

**Não há liberação de beta público nem integração Google declarada concluída sem os testes remotos pendentes.**
