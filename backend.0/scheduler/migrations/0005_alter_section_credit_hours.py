# Generated by Django 5.0.7 on 2024-08-05 23:59

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scheduler', '0004_alter_section_capacity'),
    ]

    operations = [
        migrations.AlterField(
            model_name='section',
            name='credit_hours',
            field=models.CharField(max_length=100),
        ),
    ]
