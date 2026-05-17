from django.db import migrations, models


def make_existing_device_names_unique(apps, _schema_editor):
    Device = apps.get_model('airquality', 'Device')

    seen = set()
    for device in Device.objects.order_by('user_id', 'device_name', 'id'):
        key = (device.user_id, device.device_name)
        if key not in seen:
            seen.add(key)
            continue

        suffix = device.device_id or device.id
        base_name = device.device_name[:80].rstrip()
        new_name = f'{base_name} ({suffix})'[:100]
        counter = 2

        while (device.user_id, new_name) in seen or Device.objects.filter(
            user_id=device.user_id,
            device_name=new_name,
        ).exclude(pk=device.pk).exists():
            trimmed_base = base_name[: max(1, 100 - len(f' ({suffix}-{counter})'))].rstrip()
            new_name = f'{trimmed_base} ({suffix}-{counter})'
            counter += 1

        device.device_name = new_name
        device.save(update_fields=['device_name'])
        seen.add((device.user_id, new_name))


class Migration(migrations.Migration):

    dependencies = [
        ('airquality', '0004_sensorreading_gas_pollutants'),
    ]

    operations = [
        migrations.RunPython(make_existing_device_names_unique, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='device',
            constraint=models.UniqueConstraint(
                fields=('user', 'device_name'),
                name='unique_device_name_per_user',
            ),
        ),
    ]
