# Configuração de Email - SMTP

Este documento explica como configurar o envio de emails usando SMTP (suporta Hostinger e outros provedores SMTP).

## Configuração no arquivo `.env`

Adicione ou atualize as seguintes variáveis de ambiente no arquivo `.env`:

### Configurações SMTP

```env
# Configurações SMTP
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true

# Credenciais de email
EMAIL_USERNAME=seu-email@seudominio.com
EMAIL_PASSWORD=sua-senha-do-email

# Email que aparecerá como remetente
EMAIL_FROM=seu-email@seudominio.com
```

### Configurações SMTP Hostinger

- **SMTP Host**: `smtp.hostinger.com`
- **Porta SSL**: `465` (recomendado, com `SMTP_SECURE=true`)
- **Porta TLS**: `587` (alternativa, com `SMTP_SECURE=false`)
- **Usuário**: Seu endereço de email completo (ex: `contato@seudominio.com`)
- **Senha**: A senha da sua conta de email

### Exemplo completo para Hostinger

```env
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
EMAIL_USERNAME=noreply@seudominio.com
EMAIL_PASSWORD=Su@Senh@Segur@123
EMAIL_FROM=noreply@seudominio.com
```

## Notas Importantes

1. **Segurança**: Nunca commite o arquivo `.env` no repositório Git. Ele já deve estar no `.gitignore`.

2. **Teste**: Após configurar, teste o envio de email fazendo uma solicitação de reset de senha ou criando um novo usuário.

3. **Porta 465 vs 587**:
   - Porta 465: Usa SSL/TLS (recomendado para Hostinger)
   - Porta 587: Usa STARTTLS (alternativa)

4. **Desenvolvimento**: Em ambiente de desenvolvimento (`APP_ENV=dev`), os emails não são enviados, apenas logados no console.

## Solução de Problemas

### Erro: "Invalid login"
- Verifique se o `EMAIL_USERNAME` está com o email completo
- Confirme que a senha (`EMAIL_PASSWORD`) está correta
- Certifique-se de que a conta de email está ativa

### Erro: "Connection timeout"
- Verifique se a porta está correta (465 ou 587)
- Confirme que `SMTP_SECURE` está configurado corretamente
- Verifique se há firewall bloqueando a conexão

### Erro: "Authentication failed"
- Verifique as credenciais SMTP
- Alguns provedores podem exigir "senhas de aplicativo" em vez da senha normal
- Verifique se a autenticação de dois fatores está desabilitada ou use uma senha de aplicativo

## Suporte

Para mais informações sobre configuração SMTP da Hostinger, consulte:
- [Documentação Hostinger - Configuração SMTP](https://www.hostinger.com.br/tutoriais/como-configurar-smtp)

