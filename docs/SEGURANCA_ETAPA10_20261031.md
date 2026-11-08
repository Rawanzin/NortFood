# Auditoria de segurança NortFood — 31/10/2026

Rodada final concluída em 01/11/2026, depois da suíte funcional aprovada: **52/52 testes de segurança aprovados**, zero falhas e zero testes ignorados. São 23 verificações SQL adversariais, um teste de XSS em Chrome e 28 verificações complementares de autenticação, sessões, autorização e uploads. As duas falhas encontradas foram reproduzidas antes da migração e retestadas corrigidas no banco descartável. **Não há aprovação comercial ou de produção.**

## Escopo e limites

Revisão do código existente, histórico incremental SQL, RLS/ACL, funções `SECURITY DEFINER`, Storage, autenticação, entrada/saída de dados e regras de pedidos/comissões. A execução adversarial usa somente PostgreSQL WASM descartável (PGlite), usuários `example.test`, catálogo sintético e Chrome contra HTTP local com solicitações externas bloqueadas. Não usa `.env`, tokens reais, contas reais nem banco remoto. Não realiza força bruta, DDoS ou testes da infraestrutura compartilhada.

Referências de organização da cobertura: [OWASP Top 10 2025](https://top10.owasp.org/2025/0x00_2025-Introduction/) e [OWASP ASVS 5.0](https://asvs.owasp.org/). Esta auditoria não representa certificação ASVS nem garantia de ausência de vulnerabilidades.

## Matriz de cobertura e limites

O mapeamento abaixo relaciona os ensaios executados/preparados aos objetivos das [dez categorias OWASP 2025](https://top10.owasp.org/2025/) e dos [capítulos ASVS v5.0.0](https://github.com/OWASP/ASVS/tree/v5.0.0/5.0/en). Não é uma declaração de cumprimento de todos os requisitos, de nível ASVS ou de certificação.

| Categoria OWASP 2025 | Objetivos ASVS v5.0.0 relacionados | Evidência local e resultado final | Limite / pendência |
| --- | --- | --- | --- |
| A01 — Controle de acesso | V4 API, V8 Autorização, V14 Proteção de dados | SQL com dois clientes e dois vendedores; IDOR, RLS/ACL, administração, produtos, relatórios, endereços, chat e Storage negados a terceiros. Migração 015 corrige os dois achados da tabela. | Não demonstra RLS positiva/negativa do Supabase hospedado, ACL do gateway ou canais Realtime reais. |
| A02 — Configuração de segurança | V3 Frontend, V13 Configuração | Revisão de CSP, origem exata de upload, variáveis de servidor, buckets privados, privilégios SQL e `search_path` fixo. | Configuração hospedada pode divergir. Preflight de upload Pages continua 403 na consulta remota somente leitura de 01/11; avatar RPC retorna 404. |
| A03 — Cadeia de fornecimento | V13 Configuração, V15 Código e arquitetura | Rodada final geral: `pnpm audit` sem advisory reportado em 121 dependências; busca de segredos em 311 arquivos sem ocorrência classificada como segredo. | Zero advisory/achado é limitado às bases de dados e padrões consultados; não prova integridade de todo fornecedor ou ativo vendorizado. Semgrep e ZAP não disponíveis e não executados. |
| A04 — Criptografia | V7 Sessão, V9 Tokens, V11 Criptografia, V12 Comunicação | Revisão de uso do SDK Supabase e de Bearer tokens; não foi encontrado algoritmo próprio de validação JWT no cliente tratado como autoridade SQL. | Não houve auditoria da criptografia/infraestrutura de terceiros nem teste remoto de assinatura, expiração, revogação ou rotação de tokens. |
| A05 — Injeção | V1 Codificação e sanitização, V2 Validação, V3 Frontend | SQL/HTML inofensivo tratado como dados; identificador SQL malicioso rejeitado sem pedido; Chrome confirma escape de loja/produto/busca e rejeição de imagens executáveis. | Ensaios representativos locais; não cobrem todas as entradas possíveis ou extensões futuras. |
| A06 — Projeto inseguro | V2 Regras de negócio, V8 Autorização, V15 Arquitetura | Total, descontos, frete, comissão, idempotência, modalidade ativa, bloqueio do piloto, rollback e preservação de registros verificados em SQL. | Cupons promocionais não são implementados; campo de cupom não concede desconto. Não foi simulada uma operação comercial real. |
| A07 — Autenticação | V6 Autenticação, V7 Sessão, V9 Tokens, V10 OAuth/OIDC | Metadados `admin` não elevam papel. Suites locais de callback, sessão e SDK usam transporte controlado; entrar, recuperar e sair exigem respostas de servidor simuladas. | Não homologa SMTP, confirmação de e-mail, troca efetiva de senha ou OAuth remoto. Em 01/11, Google permanece desativado no principal e na homologação. |
| A08 — Integridade de software e dados | V2 Negócio, V5 Arquivos, V15 Arquitetura | Snapshot financeiro e remetente do chat definidos no banco; comparação integral antes/depois da migração; upload exige decode e reencode reais, valida MIME/tamanho/pixels e remove metadados. | Edge Function, Storage e backup de banco remoto não foram alterados/testados positivamente nesta rodada. |
| A09 — Registro e alertas | V16 Logs e erros | Revisão de trilha administrativa e histórico append-only; testes existentes verificam comissão, transições e ações administrativas auditadas. | Sem ensaio de alerta operacional, SIEM, retenção, investigação ou resposta a incidente em produção. |
| A10 — Condições excepcionais | V15 Código e arquitetura, V16 Logs e erros | Rejeição de carrinho/quantidade/UUID inválidos sem resíduo; manutenção de sessão/carrinho diante de resposta tardia; falhas de upload tratadas sem gravar caminho alheio. | Sem teste destrutivo, exaustão de recursos, caos ou carga em serviços compartilhados. |

## Achados e correções

| Vulnerabilidade | Gravidade | Área afetada | Correção | Reteste | Risco residual |
| --- | --- | --- | --- | --- | --- |
| RPC legado de cadastro não aplica a reserva de nome usada pelo cadastro atual; permite loja homônima de marca reservada sem comprovar propriedade. Não concede vínculo com a loja verdadeira. | Média | `nf_request_store` | Migração `202610310015_security_audit.sql` aplica a mesma comparação normalizada de nomes contra convites reservados; resgate legítimo continua pela função de convite com e-mail confirmado. | Aprovado local, rodada final | Correção precisa ser aplicada ao Supabase remoto após backup e validação. O banco remoto não foi modificado. |
| Verificação de versão ocorre antes da autorização na mudança de status e permite distinguir UUID de pedido existente por mensagens de erro. | Baixa | `nf_transition` | A mesma migração exige cliente titular ou membro da loja antes de comparar a versão, retornando `ORDER_FORBIDDEN` para pedidos alheios/inexistentes. | Aprovado local, rodada final | Correção precisa ser aplicada remotamente. Não foi demonstrada leitura dos detalhes nem mudança de pedidos alheios pela falha. |

As alterações são aditivas ao histórico e modificam somente definições de funções/ACL. Não atualizam registros comerciais, usuários, lojas, convites, pedidos, produtos, comissão ou habilitação do piloto.

## Evidências e cobertura executada localmente

Rodada preparatória: `test-results/etapa10-20261031/security/adversarial-initial.log` (22 aprovados, 0 falhas) e `xss-browser-initial.log` (1 aprovado, 0 falhas). O arquivo `local-security-inventory.json` registra 35 tabelas (28 públicas, 6 privadas e `storage.objects`), todas com RLS, 39 políticas, 80 funções e dois buckets privados. Há 77 funções `SECURITY DEFINER`, todas com `search_path` fixo. As únicas RPCs públicas executáveis por `anon` são `nf_catalog`, `nf_operating_status` e `nf_table_context`. Não foram encontrados novos achados críticos/altos neste alcance local; isso não atesta o estado remoto.

Rodada **final**, executada após os 228 testes funcionais e 107 verificações demonstrativas aprovados: `test-results/etapa10-20261031/security/security-final-after-functional.tap` e `final-results.json` registram **52 aprovados / 0 falhas / 0 ignorados**, em 30,2 segundos. O código foi mantido congelado durante essa rodada. O manifesto `tested-source-hashes.json`, coletado ao concluir os testes, registra SHA-256 de 49 arquivos de código/configuração de segurança e a release local `c64b4e442beb444a7d7e`; a conferência posterior ao snapshot confirmou os mesmos hashes. O screenshot `xss-local-chrome.png` contém somente dados e payloads sintéticos.

Comando reproduzível (PowerShell, a partir do checkout existente):

```powershell
$env:NORTFOOD_SECURITY_EVIDENCE='test-results/etapa10-20261031/security'
node --test --test-concurrency=1 --test-reporter=tap tests/security-adversarial.test.cjs tests/security-browser.test.cjs tests/auth-confirmation-callback.test.cjs tests/auth-recovery-callback.test.cjs tests/auth-callback-order.test.cjs tests/auth-sdk.test.cjs tests/session-isolation.test.cjs tests/admin-authorization.test.cjs tests/media-upload.test.cjs tests/avatar-storage.test.cjs tests/auth-onboarding.test.cjs
```

- `tests/security-adversarial.test.cjs`: reproduz as duas falhas antes da migração no banco descartável, aplica a correção e verifica igualdade integral dos registros; retesta reserva de nome e autorização anterior à versão.
- Inventário de todas as tabelas públicas/privadas e objetos Storage com RLS; todas as políticas existentes; todas as funções públicas/privadas com ACL e configuração de `search_path`; buckets e limites. O inventário não contém registros de pessoas.
- Acesso anônimo, escalada via metadados, escrita em ACL/settings, IDOR de endereços/pedidos, acesso cruzado entre vendedores, catálogo, taxas, modalidades, relatórios, administração e financeiro.
- Preços, frete, descontos, comissão e confirmação de pagamento manipulados no JSON; dados financeiros são recalculados/definidos pelo servidor. Quantidade e identificadores inválidos, idempotência e rollback de pedidos rejeitados.
- Cupom: o checkout atual não implementa concessão de desconto por cupom. Campos extras não reduzem o preço; reutilização da mesma chave não duplica o pedido. Isso não homologa um mecanismo futuro de cupons.
- Chat SQL/HTML como texto e autor obtido da identidade do servidor; leitura e envio por terceiros rejeitados. A consulta parametrizada com identificador SQL malicioso deve falhar sem criar pedido.
- Storage: bucket de loja aprovada versus rascunho e avatar próprio versus alheio; escrita direta negada inclusive diante de uma política permissiva sintética adicional; reservas de upload exclusivas do servidor.
- Upload inofensivo: `tests/media-upload.test.cjs` e `tests/avatar-storage.test.cjs` usam PNG/JPEG/WebP gerados localmente, metadados sintéticos e bytes inválidos/truncados. O decoder WASM real valida e recodifica imagens; MIME trocado, SVG/GIF não permitido, limites de dimensões/pixels/multipart e caminhos cruzados são rejeitados. Não há malware, envio a terceiros ou arquivo carregado no Storage remoto.
- Sessão/tokens: `tests/auth-confirmation-callback.test.cjs`, `tests/auth-recovery-callback.test.cjs`, `tests/auth-callback-order.test.cjs`, `tests/auth-sdk.test.cjs` e `tests/session-isolation.test.cjs` cobrem retorno de confirmação/recuperação, token/sessão divergentes, identidade alterada e estado privado tardio. Tokens são sintéticos; transporte Auth é interceptado e respostas de erro/sucesso são locais. A validação criptográfica real do Supabase continua fora deste alcance.
- `tests/security-browser.test.cjs`: payload HTML/JavaScript inofensivo persistido em campos sintéticos de loja/produto, URLs executáveis e busca; Chrome verifica texto escapado, ausência de tags/handlers injetados e nenhuma execução.

## Limites de interpretação

A identidade SQL nos ensaios PGlite simula claims para testar políticas e funções com papéis `anon`/`authenticated`. Isso não testa assinatura/revogação real de JWT, gateway PostgREST, SMTP, confirmação de e-mail, recuperação efetiva de senha, OAuth Google, Edge Runtime remoto, instalação Android ou ciclo de atualização HTTPS do PWA. Esses fluxos exigem contas fictícias e configuração válida em homologação.

Revisão independente e reteste final da correção local de recuperação: `src/application/auth-recovery.js` captura o token antes de o SDK consumir o callback e só recompõe o estado de recuperação quando `getUser(token)` confirma usuário, o token da sessão ativa é exatamente o do callback e os IDs/revisão de identidade continuam iguais. A indicação `type=recovery` sozinha não concede esse estado. O token é descartado após a verificação; falhas retornam negativo sem devolver detalhes privados. O resultado é consumido uma vez, impedindo que reinicialização posterior reative a recuperação após uma troca de senha. A troca da senha continua dependendo da autorização do serviço Auth, não dessa indicação de interface. As condições negativas e o fluxo com SDK real/transportes controlados passaram na rodada final.

No cliente atual, as operações Supabase exigem Bearer token; cookies de autenticação automática não são usados como autoridade para alterações comerciais. Isso reduz a superfície clássica de CSRF. A camada de upload também valida origem exata e identidade; a configuração remota precisa ser confirmada, pois CORS sozinho não substitui autorização. Não foi executado teste de CSRF contra produção.

Semgrep/ZAP, auditoria de dependências, busca de segredos, build, suíte funcional e publicação são consolidados no relatório geral desta etapa, com seus comandos e limites reais. Nenhuma dessas ferramentas será declarada executada sem evidência.

Consulta remota somente leitura de 01/11/2026 informada no relatório geral: 18 de 21 verificações esperadas aprovadas em cada ambiente (principal e homologação). Piloto desativado, catálogo vazio e Google desativado; as três verificações pendentes são RPC de avatar ausente (404), preflight de upload Pages bloqueado (403) e Edge Function de avatar ausente (404). Não há acesso CLI Supabase autenticado disponível para migração. Nenhuma mutação remota de banco, estabelecimento ou pedido foi feita durante os ensaios deste relatório.

**Gate comercial:** manter pedidos comerciais bloqueados enquanto houver falha crítica/alta sem tratamento, migração obrigatória não aplicada ou fluxos críticos de autenticação/pedido não homologados. Aprovação local não equivale a aprovação de produção.

### Última confirmação após HTTPS

Depois dos testes de publicação e da repetição completa do ciclo de atualização em alias HTTPS isolado, a mesma seleção de segurança foi executada novamente como última rodada: **52/52 aprovados**, zero falhas/ignorados, em 60,5 segundos. Evidência: `test-results/etapa10-20261031/security/security-final-after-https.tap`. Os 49 arquivos do snapshot de segurança continuaram idênticos, confirmado em `frozen-source-verification.json`. Não houve mudança de runtime nem de banco nessa confirmação. O ensaio original de atualização no principal ficou parcial por erro do contador do teste; o reteste HTTPS isolado e seus limites estão discriminados no relatório geral, sem afirmar Android físico ou homologação comercial.
