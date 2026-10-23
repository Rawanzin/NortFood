# Lançamento e recuperação — 23/10/2026

Checkpoint local: `1bb5b75` (tag `checkpoint/launch-source-20261023`). Inclui o estado existente antes das correções desta missão. Não contém ambientes privados nem backups. O checkpoint permanece local: relatórios internos não devem ser enviados ao repositório público.

Antes de recuperar, preservar alterações posteriores com um novo commit ou cópia verificada. Consultar `git diff checkpoint/launch-source-20261023 -- <arquivo>` e recuperar somente arquivos necessários com `git restore --source=checkpoint/launch-source-20261023 -- <arquivo>`. Não executar reset/clean no checkout.

A publicação usa exclusivamente `dist`, gerado por `pnpm build`. A produção fica em branch dedicada `release/nortfood`; branches experimentais não autorizam publicação comercial. Uma reversão no Netlify deve republicar um deploy conhecido e verificado pelo painel, sem apagar históricos. Para manter a reversão após novos builds, reverter o commit na branch de publicação e conferir novamente HTTPS, release.json, configuração e bloqueio comercial. Reversão de frontend não reverte banco.

As migrações 001–007 foram confirmadas no principal por consulta `begin read only` em 23/10. Não reaplicar, reparar histórico ou restaurar dumps para realizar este lançamento. Nenhuma mudança destrutiva de banco faz parte deste plano.

Portões independentes: (A) site público/PWA com pedidos bloqueados; (B) operação comercial exige loja nominal autorizada, Auth/e-mail real, testes autenticados de isolamento, checkout e recebimento confirmados. Publicação A não autoriza B.
