# NortFood — revisão complementar e publicação verificada

Data: 24 de outubro de 2026. Site principal temporário: https://nortfood.pages.dev/.

## Publicação

- Versão HTTPS: `c84ee831f956d663d6ae`.
- Fonte pública: `1502cefad93d9078ed71525acf9be3bbe47e32d8`, branch `release/nortfood`.
- Deploy do projeto existente: `cbe1d113-6201-4795-96ef-d5f065670c33`.
- URL imutável: https://cbe1d113.nortfood.pages.dev/.
- Pacote auditado: 102 arquivos, 23.200.229 bytes. Os 101 arquivos servidos responderam HTTP 200 com SHA-256 idêntico ao pacote; `_headers` é configuração do Pages.
- Sete caminhos internos/inexistentes responderam 404. HTTPS, CSP, HSTS, MIME e cache foram verificados.
- Nenhuma publicação no Netlify, contratação, domínio, upgrade ou serviço pago.

## Causas e correções

O cadastro conservava campos apenas na interface ou após o primeiro envio. Fechar, recarregar ou alternar para login podia perder o preenchimento. Agora oferece **Retomar/Recomeçar**, usando a mesma chave de sessão e prazo de 24 horas. Os rascunhos são separados por tipo de conta e e-mail, com limites de seis formulários, oito recibos Auth e 64 KiB. Senha, confirmação e aceite da interface não são armazenados. O recibo de uma operação já enviada conserva seu vínculo Auth e o consentimento daquele envio; não marca novamente o checkbox da interface.

A revisão também corrigiu quatro casos de privacidade: recibo vinculado inacessível a UID diferente/ausente; filtro de tipo antes de preencher a conclusão de cadastro; retomada explícita após login/troca de e-mail; e prevenção de sobrescrita de rascunho existente por formulário novo. Encerrar sessão limpa os rascunhos. Concluir uma conta remove apenas o recibo correspondente.

O botão “Voltar ao carrinho” priorizava o contexto do perfil e abria o destino errado. O retorno agora reabre o carrinho com os itens preservados; endereços abertos pelo perfil retornam ao perfil, e visitantes retornam ao início.

O mapa de descoberta herdava controles grandes e busca sem acabamento. A tela “Explorar lojas” recebeu busca com ícone, fonte de 16 px, GPS de 44 px e mapa de 270 px no celular, reduzido a 150 px em altura curta. A seleção de **Endereço de entrega** permanece separada, com mapa secundário e confirmação explícita. Não há lojas fictícias ou liberação de lojas pendentes.

Os formulários completos em três etapas continuam publicados: nome, contato, e-mail, endereço, número, bairro, cidade/UF, CEP, complemento/referência opcionais, senha, confirmação e aceite. Vendedores informam também estabelecimento e categoria. A senha mínima permanece em oito caracteres, sem composição obrigatória.

## Validação

| Verificação executada | Resultado e limite |
|---|---|
| Suíte local final | **APROVADO — 170/170**, sem falhas ou skips; inclui navegador e PostgreSQL isolado. |
| Navegação da demonstração local | **APROVADO — 107 verificações**, inclusive painéis e páginas em seis larguras. Dados sintéticos não comprovam operação remota. |
| Sintaxe e arquitetura | **APROVADO — 137 arquivos**, 19 módulos, zero ciclos/violações. |
| Build e auditoria do pacote | **APROVADO** para Pages e Supabase principal. |
| Navegador público | **APROVADO — 45 verificações principais:** 19 de interface Auth, oito de endereços/formulários, 18 de apresentação/piloto. Sem erros JavaScript. |
| Retomada pública adicional | **APROVADO** em Chrome/HTTPS: fechar/reabrir, recarregar, login→cadastro, troca A/B, isolamento cliente/vendedor e ausência de senha/aceite salvos. Nenhum cadastro enviado pelo auditor. |
| Responsividade | **APROVADO** nos checks publicados de 320 a 1.365 px; altura reduzida de 360×420 verificada. Teclado físico e aparelhos reais permanecem **NÃO TESTADOS**. |
| Pesquisa geográfica real | **APROVADO** para Porteirinha/MG: HTTP 200, um resultado e cidade/UF preenchidas. Rua/número continuam exigindo confirmação. Não comprova indexação de todos os endereços. |
| Mapa publicado | **APROVADO**: blocos reais carregados; dimensões verificadas em 390×844, 360×420 e 430×844; nenhum marcador de loja pendente. |
| GPS | **APROVADO** em testes controlados de sucesso/negação/erro; GPS físico **NÃO TESTADO**. Nenhuma localização real do usuário solicitada nesta atualização. |
| Atualização real do PWA | **APROVADO**: Chrome passou de `6af307dd6c0ecc08559c` para `c84ee831f956d663d6ae` após confirmação. Campo digitado preservado antes da aprovação; caches antigos removidos, sem Auth/REST/Supabase/config no cache público. |
| Senha no Supabase real | **APROVADO — teste negativo:** sete caracteres recusados com HTTP 422, `weak_password`, motivo `length`. |
| Onboarding anônimo real | **APROVADO — acesso negado:** HTTP 401, código `42501`. Não substitui teste entre duas contas reais. |
| Cadastro confirmado, login positivo, logout autenticado e recuperação recebida | **PENDENTE** — confirmação de e-mail/SMTP ainda sem prova de entrega; nenhum sucesso autenticado foi inventado. |
| Ciclo Google completo | **REPROVADO na configuração atual:** HTTP 400 real, provedor Google desativado. Sessão Google válida **NÃO TESTADA**. |
| Pedidos comerciais | **BLOQUEADOS no servidor**. Nenhum pedido real enviado ou loja liberada. |

## Preservação e recuperação

Consultas somente leitura, antes e depois, confirmaram uma Dan Burguer, **46 produtos, 20 grupos e 220 opções**. As assinaturas de loja, produtos, grupos, opções e configuração comercial permaneceram idênticas. Usuários, perfis e as 12 versões de migrações também permaneceram iguais. Não houve DDL, DML ou reaplicação de migração nesta atualização complementar.

Checkpoint Git anterior às edições: `checkpoint/ux-revisao-20261024-e68b619`. Para reverter apenas o frontend, republicar `.build/nortfood-pages-ux-20261024-v2.zip`, versão anterior `6af307dd6c0ecc08559c`, deploy `332a778b-0dda-4284-9c26-d3ed0084f2c3`. O banco não deve ser restaurado para reverter estas alterações de interface. O novo pacote está em `.build/nortfood-pages-ux-20261024-followup.zip`.

Arquivos alterados: `app.js`; módulos de endereço, mapa e cadastro em `assets/`; `refinements.css`; `src/backend.js`; `src/platform/onboarding-draft.js`; scripts de build/sintaxe e verificação pública; testes de cadastro, onboarding, mapa e checkout; documentação. O bundle `assets/nortfood-backend.js` foi regenerado da fonte atual.

## Intervenções ainda necessárias

1. **Brevo:** o usuário informou que preencherá o endereço autorizado da organização na aba protegida. Aguardar sua confirmação antes de avançar. Depois será possível continuar o plano gratuito, a verificação do remetente e o fluxo protegido de credencial SMTP. Não foi usado endereço da Dan Burguer ou remetente inventado.
2. **Google/Supabase:** a aba do provedor permanece aberta para concluir a entrada protegida do Client ID/Secret do cliente existente NortFood Web, habilitar o provedor e salvar. Manter verificações de nonce e exigência de e-mail. A API ainda informa `google:false`; salvar uma configuração sem sessão real não contará como aprovação.
3. Após essas etapas: testar entrega de confirmação/recuperação e sessão real de cliente/vendedor, persistência remota e ciclo OAuth completo. A publicação comercial de pedidos continua dependendo da homologação crítica e dos dados operacionais da Dan Burguer.

Evidências desta atualização: `test-results/ux-followup-20261024/`. Relatórios privados e backups não foram incluídos no pacote ou na branch pública.
