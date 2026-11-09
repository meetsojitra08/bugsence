web: cd backend && DJANGO_SETTINGS_MODULE=config.settings.prod gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
release: cd backend && DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py migrate && DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py collectstatic --noinput
