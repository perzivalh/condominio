from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL("ALTER TABLE django_admin_log ALTER COLUMN user_id TYPE integer USING (user_id::text::integer);"),
        migrations.RunSQL("TRUNCATE TABLE django_admin_log;"),
        migrations.RunSQL("ALTER TABLE django_admin_log ADD CONSTRAINT django_admin_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth_user(id) DEFERRABLE INITIALLY DEFERRED;"),
    ]
