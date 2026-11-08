# Supabase — conclusão pelo operador autenticado

> Atualização de 02/11/2026: as pendências de migrações 013–016 foram aplicadas em homologação e produção após backup privado e validação; `upload-media` e seu CORS foram corrigidos e testados com uma loja fictícia. O piloto continua desligado. O roteiro abaixo é histórico e não deve ser reaplicado. Consulte [CONTAS_COMERCIAIS_20261102.md](CONTAS_COMERCIAIS_20261102.md) para evidências, limites e pendências atuais, inclusive SMTP da homologação e `profile-avatar`.

Roteiro preparado em 01/11/2026; **nenhuma operação remota foi executada por este roteiro**. Consulta pública desta etapa: Google desativado, piloto desligado, avatar indisponível (404) e preflight de upload Pages bloqueado (403). Isso não comprova quais migrações estão registradas. CLI sem sessão administrativa; a tentativa de verificar o navegador foi interrompida pelo Computer Use por não conseguir identificar a URL com segurança.

## 1. Confirmar destino e ponto de recuperação

1. Conferir no painel já autenticado o projeto, a URL e o papel do operador: **homologação `zrczgghucwsaxqnyaapk`**; **principal `zwkhqahivthzivmuirjr`**. Não criar projeto, conta, token ou administrador para contornar ausência de acesso. Segredos ficam no fluxo protegido do provedor, nunca no chat, comandos, Git ou frontend.
2. Obter inventário somente de leitura: versões de `supabase_migrations.schema_migrations`, objetos/assinaturas existentes, RLS/ACL, buckets, publicação Realtime e estado comercial. Os checks `supabase/checks/modernization-history-readonly.sql` e `final_launch_readonly_20261028.sql` são referências; este último consulta exclusivamente o principal e inclui verificações agregadas da Dan Burguer. Não retornar registros pessoais nem o campo `statements` do histórico.
3. Fazer **backup novo do destino confirmado** antes de qualquer DDL/configuração. Usar `scripts/Backup-NortFood.ps1`, com Host/User copiados de **Connect → Session pooler**. Informar ambos explicitamente para não reutilizar `backups/connection.json` de outro ambiente. A senha é digitada somente no prompt protegido do script. Exemplo, substituindo os dois campos públicos pelo destino conferido:

```powershell
powershell.exe -NoProfile -File .\scripts\Backup-NortFood.ps1 -DatabaseHost '<HOST_SESSION_POOLER>' -DatabaseUser 'postgres.<REF_CONFIRMADO>'
```

Exigir relatório `VALIDADO` ou `VALIDADO_COM_AVISOS` com todos os avisos resolvidos/aceitos: identidade, dump não vazio, leitura integral, índice e SHA-256. `-ConnectionTestOnly` **não faz backup**. Conferir o hash novamente; guardar dump/inventário em área privada protegida e cópia externa criptografada. Snapshot de código ou pacote Pages não substitui backup do banco. Inventariar separadamente objetos binários Storage, configuração Auth/SMTP/OAuth, templates, segredos e versões das Edge Functions; o dump não contém esses serviços. Ver limites de recuperação em [BACKUP.md](BACKUP.md); não restaurar dados reais em homologação compartilhada.

## 2. Aplicar somente pendências comprovadas

Primeiro homologação; somente depois de validação, repetir inventário e backup fresco no principal. Se houver lacuna anterior, divergência de definição ou histórico incoerente, parar para revisão. **Não executar bootstrap, reset, replay de 001–012 nem push genérico sem conferir o plano.** Os geradores antigos `prepare-supabase-deployment.cjs`, `prepare-migration-history.cjs` e `prepare-homologation.cjs` foram escritos para 001–007/projeto vazio; não são o aplicador destas pendências.

| Ordem | Arquivo, caso realmente pendente | Conferência |
| --- | --- | --- |
| 1 | `supabase/migrations/202610290013_profile_avatars.sql` | Coluna/path privado, bucket privado de 1 MB, políticas restritivas, RPCs e quota somente servidor. Não converter bucket conflitante. |
| 2 | `supabase/migrations/202610310014_fulfillment_controls.sql` | RPC autorizada de modalidades, ambas desativadas bloqueiam novos pedidos e publicação Realtime limitada a `stores`/`delivery_zones`. |
| 3 | `supabase/migrations/202610310015_security_audit.sql` | Reserva de nome na RPC legada e autorização antes da verificação de versão do pedido. |

Cada arquivo já possui `BEGIN/COMMIT`: aplicar a versão exata revisada em transação, com parada em erro e registro correto da versão no histórico pelo mecanismo de migração. Se usar SQL Editor, preparar previamente o registro de histórico dentro da mesma transação; não apenas colar SQL e deixar a versão sem registro. Não marcar como aplicada uma operação que falhou. `PROFILE_AVATAR_BUCKET_CONFIG_CONFLICT`, `REALTIME_PUBLICATION_SCOPE_CONFLICT` ou `TRANSITION_SECURITY_ANCHOR_MISMATCH` exigem investigação, sem retirar guards ou editar migrações antigas para forçar passagem.

Comparar inventário/contagens antes e depois e confirmar `pilot_enabled=false`, permissões e configurações das lojas preservadas. Não aprovar, abrir, pausar, editar ou alterar modalidades da Dan Burguer durante a implantação. Não restaurar banco para reverter uma publicação do frontend; preferir correção aditiva revisada quando houver falha de esquema.

## 3. Edge Functions, origem e Auth

- Implantar **`upload-media` e `profile-avatar`** no projeto confirmado, incluindo módulos compartilhados de `supabase/functions/upload-media/` e o decoder WASM. Preservar validação interna `auth.getUser()`, vínculo/identidade, quotas e decode/reencode: a configuração `verify_jwt=false` do gateway não autoriza remover autenticação interna. Chaves privilegiadas permanecem exclusivamente no servidor.
- Configurar allowlist exata `APP_ORIGINS=https://nortfood.pages.dev`; homologação recebe somente sua origem QA autorizada. Inventariar consumidores legados antes de retirar uma origem existente, sem publicar no Netlify. Não usar `*`, URL de preview curinga ou origem intrusa. `APP_ORIGIN` legado permanece fallback apenas quando não há `APP_ORIGINS`.
- Auth principal: Site URL/retornos exatos do Pages, confirmação de e-mail obrigatória e SMTP com remetente autorizado/verificado. Aplicar os modelos revisados de `supabase/templates/confirmation.html`, `recovery.html` e `email_change.html`, conservando `{{ .ConfirmationURL }}`; o arquivo `config.toml` local não comprova atualização do painel remoto. Registrar a versão anterior para reversão de configuração.
- Google: revisar cliente OAuth já existente e habilitar o provedor no projeto correto. Conferir origem `https://nortfood.pages.dev`, callback principal `https://zwkhqahivthzivmuirjr.supabase.co/auth/v1/callback` e callback separado da homologação, consentimento e usuários QA permitidos. Usar somente escopos necessários de identidade; não criar credenciais nem contratar recursos neste roteiro.

## 4. Aceitação e gate comercial

Executar primeiro com contas e lojas **fictícias de homologação**, em sessões independentes. Os scripts `test:live`/`test:homologation` criam fixtures e alteram gates de teste: revisar destino e efeitos antes de usá-los; nunca apontar ao principal ou habilitar piloto/loja comercial para fazer teste passar. Pedidos positivos exigem ambiente de teste explicitamente isolado; se indisponível, manter esse resultado pendente.

- **Auth:** cadastro, recebimento/consumo de confirmação, login/logout e sessão; recuperação com nova senha realmente gravada, senha antiga rejeitada e nova aceita; OAuth Google positivo. Não registrar senha/token ou considerar apenas a chegada do e-mail como aprovação.
- **RLS/autorizações:** cliente A/B e vendedor A/B; leituras e alterações cruzadas negadas em perfis, endereços, pedidos, chat, produtos, taxas, relatórios, comissão, Storage e administração. Retestar reserva de nome e erro de pedido alheio sem revelar sua existência. Testes locais não substituem essas sessões hospedadas.
- **Uploads:** preflight Pages 200 com origem exata e intrusa 403; anônimo na origem permitida 401. JPG/PNG/WebP inofensivos próprios aceitos, tamanho/MIME inválidos rejeitados, imagem alheia e gravação direta negadas; conferir assinatura/leitura e avatar isolado por identidade.
- **Modalidades/eventos:** quatro combinações; bloqueio por RPC direta das modalidades desligadas, inclusive ambas; atualização em outra sessão, carrinho/observação mantidos e pedidos antigos ainda gerenciáveis. Verificar publicação/entrega real de eventos `stores` e `delivery_zones`; visitante usa polling de até 60 s, com reconferência explícita no checkout.
- **Preservação:** comparar com o inventário fresco a Dan Burguer, seus produtos/adicionais, vínculos, pedidos e comissões, usando contagens/indicadores sanitizados. Contagens históricas são referência, não substituem o estado anterior desta operação.

Registrar data, projeto, versões/hash, checks aprovados/reprovados/pendentes e evidências sem dados pessoais. **Manter o principal com pedidos bloqueados** até concluir migrações, fluxos obrigatórios e tratar achados críticos/altos. A liberação comercial é uma decisão separada; este roteiro não a executa.
