# Checkpoint e recuperação da autenticação

Checkpoint Git: `checkpoint/auth-definitivo-20261023`, commit `f773103`.
Produção anterior: `61011c4fc95b637c550b6d78a86ba2571bc9eed8`, site Netlify NortFood
`3bca8094-c54e-416c-89d8-bec51a3d252e`, branch `release/nortfood`.
Destino do banco: exclusivamente `zwkhqahivthzivmuirjr`.

Antes da migração 010: auditar versões registradas e definições das funções afetadas;
preservar a evidência em test-results (ignorado). Não reaplicar 001–009.
A migração será aditiva, transacional, sem apagar usuários, lojas ou catálogo.
Em falha, ROLLBACK integral da transação. Após commit, preferir correção incremental;
o frontend anterior continua compatível com as funções existentes.

Para recuperar o frontend: preparar commit revisado na branch pública a partir dos
arquivos do checkpoint, preservando o histórico privado fora do repositório público;
publicar pelo Git CD e verificar HTTPS e atualização controlada do PWA.
Não usar reset destrutivo, não limpar sessões/carrinhos e não restaurar banco inteiro.
Não habilitar cadastro público sem envio de confirmação validado e não habilitar pedidos.
