> Atualização de 23/10/2026: [NortFood público](https://nortfood.netlify.app) e PWA publicados no Netlify Free. Cadastros e pedidos reais continuam bloqueados. Consulte o [relatório atual de lançamento](LANCAMENTO_OFICIAL_20261023.md); afirmações anteriores sobre ausência de hospedagem são históricas.

# Pendências para lançamento — 20/10/2026

**NO-GO para beta público.** Não habilitar pedidos reais, indexação ou exposição da homologação. Continuação privada é permitida, sem promessa de operação comercial aprovada.

## Eliminação dos bloqueios

1. **E-mail externo:** responsável precisa disponibilizar conta/provedor de envio e identidade remetente autorizada/verificada. Não enviar senha/token no chat; utilizar campos protegidos do provedor/Supabase. A caixa Ethereal atual apenas captura. Depois disso, testar recebimento externo, confirmação, recuperação e limites/abuso, primeiro em homologação. Não comprar domínio ou contratar plano sem autorização; domínio próprio não foi exigido para continuar os testes atuais.
2. **Hospedagem operacional:** entrar na aba protegida da Hostinger se esse for o destino desejado. Sem login não há como conhecer plano/servidor/diretório/SSL. Não é necessário enviar links ou colar comandos. Após acesso, a configuração técnica pode continuar automaticamente; escolher origem HTTPS existente e testar retorno Auth, CORS de upload, arquivos privados/cache/404. Origem da versão principal ainda é localhost na configuração auditada: gate impede tratá-la como publicação pronta. Preservar Netlify privada até validação da substituta.
3. **Decisões da operação:** fornecer identificação e contato oficial do operador, responsáveis por suporte/incidentes, termos/privacidade e contrato de comissão revisados, lojas/zonas/horários reais e contingência. O código não pode inventar essas informações nem declarar aprovação jurídica.
4. **Aceite final:** concluir ensaio operacional na origem definitiva com sessões independentes, aparelhos Android/iPhone e tecnologia assistiva; validar confirmação/recuperação externa e administração pelo fluxo escolhido. Só então solicitar autorização explícita do proprietário para liberar piloto e público. Testes anteriores da prévia não aprovam outra hospedagem ou produção.

## Pendências adicionais sem bloquear a conta por e-mail

- Google: provedor desativado. Para oferecê-lo, titular precisa decidir sobre o aceite inicial de termos do Google Cloud e eventuais consentimentos pessoais; não foi aceito automaticamente. Depois configurar cliente OAuth/retornos com segredo somente no servidor e testar consentimento real. Enquanto isso, manter Google explicitamente indisponível, sem prometer funcionamento.
- owner/staff: atualmente mesmas permissões de membro da própria loja. Definir distinção somente se desejada, sem retirar poderes silenciosamente.
- LCP laboratorial 3,916 s em uma amostra restrita; medir em aparelhos e rede reais, sem afirmar SLA ou aprovação de Core Web Vitals.
- Backup de arquivos binários Storage/configuração gerenciada e procedimento completo de recuperação operacional precisam complementar o dump PostgreSQL.
- Planejar retenção/limpeza autorizada de mídias e reservas, métricas e alerta de abuso/capacidade; não apagar histórico financeiro.

## O que NÃO precisa ser feito novamente

Não reaplicar 001–007. Não desativar RLS. Não liberar escrita direta do bucket ou tornar bucket público. Não conceder cargo administrativo para testar leitura de conta comum. Não comprar domínio agora. Não repetir concessão administrativa histórica como se ainda estivesse ativa. Não inserir usuários/pedidos fictícios no principal.

Nenhuma nova concessão administrativa foi realizada nesta tarefa. A autorização temporária anterior já terminou com revogação. Os testes positivos locais usam identidades isoladas; os positivos remotos anteriores estão separados na validação.
