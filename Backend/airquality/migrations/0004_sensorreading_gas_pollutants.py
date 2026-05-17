from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('airquality', '0003_profile_email_verified'),
    ]

    operations = [
        migrations.AddField(
            model_name='sensorreading',
            name='carbon_monoxide',
            field=models.FloatField(
                default=0,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
        migrations.AddField(
            model_name='sensorreading',
            name='nitrogen_oxide',
            field=models.FloatField(
                default=0,
                validators=[django.core.validators.MinValueValidator(0)],
            ),
        ),
    ]
