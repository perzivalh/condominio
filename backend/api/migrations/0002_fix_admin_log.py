from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        migrations.RunSQL(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'django_admin_log'
                      AND column_name = 'user_id'
                      AND data_type <> 'integer'
                ) THEN
                    ALTER TABLE django_admin_log
                    ALTER COLUMN user_id TYPE integer USING (user_id::text::integer);
                END IF;
            END
            $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            "TRUNCATE TABLE django_admin_log;",
            reverse_sql=migrations.RunSQL.noop,
        ),
        migrations.RunSQL(
            """
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints tc
                    WHERE tc.table_name = 'django_admin_log'
                      AND tc.constraint_name = 'django_admin_log_user_id_fkey'
                ) THEN
                    ALTER TABLE django_admin_log
                    ADD CONSTRAINT django_admin_log_user_id_fkey
                    FOREIGN KEY (user_id) REFERENCES auth_user(id)
                    DEFERRABLE INITIALLY DEFERRED;
                END IF;
            END
            $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
