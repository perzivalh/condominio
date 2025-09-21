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

## Usar SendGrid en lugar de Gmail

Si prefieres delegar el envío en SendGrid (por ejemplo, porque el contenedor de Railway no puede hablar con `smtp.gmail.com`), crea una API Key con permisos de "Full Access" y define estas variables de entorno:

```bash
export SENDGRID_API_KEY="SG.xxxxxx"          # tu API key completa
export EMAIL_HOST_USER="apikey"              # obligatorio en SMTP de SendGrid
export DEFAULT_FROM_EMAIL="Condominio <notificaciones@tudominio.com>"
# Opcional: personaliza el remitente y el link del correo
export PASSWORD_RESET_URL_TEMPLATE="https://tudominio.com/reset-password?email={email}&token={token}"
```

El backend detecta automáticamente `SENDGRID_API_KEY` y configura `smtp.sendgrid.net` con TLS en el puerto 587. No es necesario indicar `EMAIL_HOST` ni `EMAIL_PORT`, aunque puedes sobreescribirlos si quieres usar otro puerto (por ejemplo 465 con SSL).

## Probar el envío en local

Para comprobar que tu configuración SMTP está correcta puedes usar el comando de Django:

```bash
python manage.py sendtestemail "destinatario@correo.com"
```

Si recibes el correo, la recuperación de contraseña funcionará también.

## CORS en desarrollo local

Cuando ejecutas el backend con `DEBUG=True` (valor por defecto), se permiten automáticamente las peticiones provenientes de
`http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173` y `http://127.0.0.1:5173`. Si necesitas autorizar
otros orígenes adicionales sin habilitar `CORS_ALLOW_ALL_ORIGINS`, puedes definir variables de entorno con listas separadas por
comas:

```bash
export CORS_EXTRA_ORIGINS="https://mi-frontend-adicional.com,https://panel.otrodominio.com"
export CSRF_EXTRA_TRUSTED_ORIGINS="https://mi-frontend-adicional.com"
```

De esta manera puedes ajustar los orígenes permitidos tanto en local como en producción sin modificar el código fuente.
