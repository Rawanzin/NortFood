# Recuperação da configuração de autenticação e Dan Burguer

Checkpoint anterior: tag `checkpoint/auth-map-dan-burguer-20261023`, commit `4b80309`.
Auditoria remota antes de alterações: migrações 001–008 registradas; zero usuários, perfis e lojas; piloto desativado.

Mudanças de esquema serão aditivas, transacionais e testadas em PostgreSQL isolado antes da aplicação. Não reaplicar versões existentes. O cadastro comercial é separado da migração e identifica a loja pelo nome normalizado, interrompendo em caso de ambiguidade. Guardar recibo e ID real após execução. Repetir a importação não deve substituir edições posteriores do proprietário.

Recuperação: manter piloto desativado e loja pausada. Reverter o commit de aplicação pela branch de publicação para restaurar o frontend. Preservar colunas e dados novos; não executar DROP nem excluir produtos/usuários. Corrigir o esquema com nova migração se necessário. Antes de conceder admin ou vincular proprietário, verificar a conta e confirmação do e-mail no Auth; nenhuma atribuição automática por texto de e-mail no navegador.

SMTP: não habilitar envio público sem remetente verificado. Google: não iniciar faturamento. Credenciais são inseridas somente no fluxo protegido do provedor.
