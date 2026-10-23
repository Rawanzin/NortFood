Checkpoint antes das alterações: `checkpoint/public-pilot-20261023-14b02b2` (14b02b2).

Recuperação da interface: reverter os commits desta entrega em novo commit da branch pública e publicar pelo mesmo fluxo GitHub–Netlify. Não usar reset destrutivo nem publicar o histórico de desenvolvimento.

A migração 008 é aditiva: categorias editoriais, estado rascunho, rascunhos privados e limite administrativo de lojas. Não habilita pedidos, não cadastra contas ou lojas e não concede administradores. Aplicar somente após conferir 001–007 remotas e executar testes PostgreSQL locais. Registrar versão e DDL na mesma transação. Em falha, rollback da transação. Após sucesso, preferir correção aditiva: preservar categorias, vínculos e rascunhos; bloquear novos pedidos por nf_admin_pilot(false) se necessário. Não apagar migrações ou dados para recuperar a interface.
