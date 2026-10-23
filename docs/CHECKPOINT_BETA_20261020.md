# Checkpoint da continuação — 20/10/2026

## Autenticação/interface — última atualização

Deploy privado `6ad7d58da165f7c1c4db882e`: cadastro principal, login fecha modal, confirmação explícita, navbar branca na base sem recorte, atalhos iniciais removidos. 97/97 locais, 107 demo e ensaios reais SMTP/sessão aprovados conforme `CORRECOES_AUTH_INTERFACE_20261020.md`. Google desativado (settings/authorize conferidos), Google Cloud autenticado parado em Termos; aguardar decisão humana, não aceitar por conta própria. Piloto continua bloqueado, sem alterações no banco principal ou privilégios.

## Tema escuro revertido — atualização posterior

O proprietário solicitou retirar a implementação de tema. Aparência clara restaurada, sem botão lua/sol, controlador, CSS adicional ou persistência. `REVERSAO_TEMA_20261020.md` e `test-results/theme-revert/` prevalecem sobre o relatório histórico TEMAS. Não reabrir piloto nem reprovisionar administradores para testar aparência; banco não foi alterado.

## Último fechamento — prevalece sobre registros anteriores

- Prévia PRIVADA Free publicada: https://lucky-lamington-022ea1.netlify.app. Deploy atual `6ad7c1c15e120a6330e97211`. Cinco caminhos anônimos recusados 401 na origem e permalink; noindex/banner conferidos. Não clicar em Make public.
- 89/89 locais finais aprovados; 12/12 regressões posteriores. Gate administrativo RPC remoto exit 0; cargo sintético revogado. Seis checks SMTP de captura passaram, repetidos com destino HTTPS. Nove asserts de UI HTTPS aprovados nos recortes documentados.
- Corrigidos retorno de recuperação (raiz, sem #settings) e preservação de drawer durante POLL. Correções implantadas.
- Encerramento: piloto false, admins 0, aprovadas 0, pedidos 34, cobranças 19, ajustes 2, quitações 2, due_errors 0, RLS ativo, bucket privado. Sessões de teste encerradas; dados preservados. Fixture-request marcada cleanup após execução confirmada.
- SMTP Ethereal ativo SOMENTE homologação, templates aplicados. Não é entrega externa nem configuração de produção. Site URL/redirect da prévia exatos; retornos locais mantidos. Upload APP_ORIGIN agora somente HTTPS; gate deve receber NORTFOOD_TEST_APP_ORIGIN explicitamente para testar essa origem.
- Não reaplicar migrações; não tocar principal/Rawanzin. NÃO APTO a beta real: falta provedor/remetente para entrega externa, destino operacional e aceites/ensaios finais. Relatório `RESULTADO_PREVIA_HTTPS_20261020.md`.

## Estado mais recente — prévia protegida

- Prévia gratuita protegida autorizada; não há autorização para deploy público anônimo. Não houve upload. Aba Netlify aberta para login/aceite pessoal dos termos; depois verificar Free e visibilidade privada antes de enviar arquivos.
- 87/87 testes locais passaram (`protected-preview-tests.txt`); posteriormente os 2 testes administrativos passaram isoladamente após nova trava. Nenhum teste de deploy HTTPS concluído.
- Aguardam respostas: login Netlify, concessão temporária ao UUID sintético exato e SMTP de captura. Nenhum cargo concedido ou SMTP aplicado; não repetir perguntas já pendentes.
- Build recusa outro banco. Verificador de bloqueio anônimo e templates preparados. Relatório novo `PREVIA_PROTEGIDA_20261020.md` prevalece sobre as linhas históricas abaixo.

## Registro anterior

- Correção real de corrida BOOT/INITIAL_SESSION implementada e regressão antes/depois registrada.
- 84/84 testes locais, UI remota ampliada 11 checks e tokens Auth reais 5 checks aprovados.
- Homologação encerrada: 27 contas sintéticas, 14 lojas, 29 pedidos, 16 cobranças, 6 mídias; 0 admins, 0 lojas aprovadas, piloto desligado; nenhuma cobrança duplicada ou vencimento incorreto.
- Principal e Rawanzin intactos. Nenhuma migração reaplicada ou editada.
- E-mail recebido em caixa postal ainda pendente de SMTP/remetente e caixa controlada. Tokens sem envio não substituem isso.
- Administração positiva continua pendente por decisão do responsável. Não executar SQL preparado de concessão de cargo.
- HTTPS local validado. Pacote isolado em dist-homologacao/ e ZIP privado pronto. Pergunta de autorização de preview público gratuito Netlify enviada; aguardar resposta antes de upload. Preview não significa liberar piloto ou publicar para clientes.
- Relatório consolidado atualizado: FINALIZACAO_BETA_20261020.md. Não repetir os recortes aprovados sem motivo.
