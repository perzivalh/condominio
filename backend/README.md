# Backend Condominio

## Configuración de correo para recuperación de contraseña

El backend ya está listo para enviar correos reales usando SMTP. Para utilizar la cuenta de Gmail creada para el condominio sigue estos pasos **antes** de levantar el servidor (`python manage.py runserver`):

1. Asegúrate de que la cuenta de Gmail tenga activada la verificación en dos pasos y una **contraseña de aplicación** de 16 caracteres.
2. Crea las siguientes variables de entorno (puedes definirlas en tu terminal antes de ejecutar `runserver` o configurarlas en el panel de Railway/Render/Heroku):

   ```bash
   export EMAIL_HOST_USER="condominiocolinasdelurubo2@gmail.com"
   export EMAIL_HOST_PASSWORD="auukukxcdpyelbgt"  # sin espacios
   export DEFAULT_FROM_EMAIL="Condominio Colinas <condominiocolinasdelurubo2@gmail.com>"
   export PASSWORD_RESET_EMAIL_SUBJECT="Instrucciones para restablecer tu contraseña"
   # Opcional: si quieres que el correo incluya el link directo al formulario web
   export PASSWORD_RESET_URL_TEMPLATE="https://tudominio.com/reset-password?email={email}&token={token}"
   ```

   > En Windows PowerShell utiliza `setx VARIABLE "valor"`. Si prefieres dejarlo temporalmente para una sesión usa:
   > ```powershell
   > $Env:EMAIL_HOST_USER = "condominiocolinasdelurubo2@gmail.com"
   > $Env:EMAIL_HOST_PASSWORD = "auukukxcdpyelbgt"
   > ```

3. No es necesario definir `EMAIL_HOST` ni `EMAIL_PORT`: cuando se detecta una cuenta `@gmail.com` se usa automáticamente `smtp.gmail.com` con TLS en el puerto `587`.
4. Si copias la contraseña tal como la muestra Google con espacios, el backend la limpiará automáticamente, así que puedes pegarla con o sin separadores.

Con esa configuración cualquier solicitud a `/api/recuperar-password/` enviará el token al correo del usuario usando la cuenta de Gmail indicada. Si algo falla en el envío el backend devolverá un error claro y no dejará tokens huérfanos.

## Probar el envío en local

Para comprobar que tu configuración SMTP está correcta puedes usar el comando de Django:

```bash
python manage.py sendtestemail "destinatario@correo.com"
```

Si recibes el correo, la recuperación de contraseña funcionará también.
