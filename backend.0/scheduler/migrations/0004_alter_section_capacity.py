# Generated by Django 5.0.7 on 2024-08-05 23:46

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduler', '0003_section_title'),
    ]

    operations = [
        migrations.AlterField(
            model_name='section',
            name='capacity',
            field=models.CharField(max_length=100),
        ),
    ]