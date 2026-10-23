# Lançamento e recuperação — 23/10/2026

Checkpoint local: `1bb5b75` (tag `checkpoint/launch-source-20261023`). Inclui o estado existente antes das correções desta missão. Não contém ambientes privados nem backups. O checkpoint permanece local: relatórios internos não devem ser enviados ao repositório público.

Antes de recuperar, preservar alterações posteriores com um novo commit ou cópia verificada. Consultar `git diff checkpoint/launch-source-20261023 -- <arquivo>` e recuperar somente arquivos necessários com `git restore --source=checkpoint/launch-source-20261023 -- <arquivo>`. Não executar reset/clean no checkout.

A publicação usa exclusivamente `dist`, gerado por `pnpm build`. A produção fica em branch dedicada `release/nortfood`; branches experimentais não autorizam publicação comercial. Se uma versão publicada apresentar regressão, reverter o commit na branch de publicação, aguardar o novo build automático e conferir HTTPS, release.json, configuração e bloqueio comercial. Um deploy com falha não substitui a versão pública anterior. Reversão de frontend não reverte banco.

Correções visuais/piloto: checkpoint local `efdd0a8`, tag `checkpoint/visual-pilot-20261023`, criado antes das alterações desta etapa. Recuperar somente os arquivos necessários após preservar trabalho posterior; não usar reset/clean. As alterações desta etapa não migram nem recriam o banco. O nome DanBurguer e o e-mail informado são uma indicação comercial; não autorizam inventar cardápio, telefone, frete ou credenciais.

As migrações 001–007 foram confirmadas no principal por consulta `begin read only` em 23/10. Não reaplicar, reparar histórico ou restaurar dumps para realizar este lançamento. Nenhuma mudança destrutiva de banco faz parte deste plano.

Portões independentes: (A) site público/PWA com pedidos bloqueados; (B) operação comercial exige loja nominal autorizada, Auth/e-mail real, testes autenticados de isolamento, checkout e recebimento confirmados. Publicação A não autoriza B.
