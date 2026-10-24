# Recuperação incremental dos cadastros

Checkpoint `checkpoint/recuperacao-cadastros-20261024` → `0a44afb`.
Produção Netlify atual: `61011c4`; correção anterior pública: `30afe84`.
Destino Supabase exclusivo: `zwkhqahivthzivmuirjr`.

Inspeção do inventário do repositório, histórico, módulos de Auth, endereços,
checkout, migrações 001–010, testes e relatórios concluída antes de editar.

Migração 011: aditiva e transacional. Registrar definições anteriores das funções,
RLS e cópia JSON verificável das lojas, produtos, grupos, opções, categorias e convites
em test-results/recovery-20261024 antes de executar no remoto. Não reaplicar 001–010.
Verificar hash, integridade JSON, contagens e ausência de duplicatas no backup.
Em erro, rollback da transação. Após commit, usar correção incremental compatível;
não restaurar banco inteiro nem apagar registros criados após o checkpoint.

Dados de cadastro pendentes de confirmação: armazenar somente campos não secretos,
com prazo e vínculo à identidade, fora de caches PWA. Senhas nunca são persistidas
pelo aplicativo. O endereço definitivo só é gravado após sessão Supabase autenticada.
Uma confirmação em outro navegador pode exigir concluir os dados ainda não salvos.

Cloudflare Pages é alternativa de hospedagem do mesmo build e Supabase. Preparar
pacote separado, sem mudar DNS ou substituir o endereço oficial, e verificar prévia
antes de qualquer adoção. Não ativar cobrança. Netlify fica preservado.
