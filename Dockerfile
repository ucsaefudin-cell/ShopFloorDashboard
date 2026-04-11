# Dockerfile untuk Shop Floor Dashboard
# Production-ready container dengan Gunicorn WSGI server

# Gunakan Python 3.11 slim sebagai base image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8080

# Set working directory
WORKDIR /app

# Install system dependencies yang diperlukan untuk psycopg2
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements dan install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Gunicorn untuk production WSGI server
RUN pip install --no-cache-dir gunicorn==21.2.0

# Copy seluruh aplikasi ke container
COPY . .

# Buat user non-root untuk security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app
USER appuser

# Expose port yang akan digunakan Cloud Run
EXPOSE 8080

# Health check untuk memastikan aplikasi berjalan
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8080/api/health', timeout=5)"

# Command untuk menjalankan aplikasi dengan Gunicorn
# - bind ke 0.0.0.0:8080 (Cloud Run requirement)
# - 4 worker processes untuk handle concurrent requests
# - timeout 120 detik untuk long-running requests
# - access log ke stdout untuk Cloud Logging
CMD exec gunicorn --bind :$PORT \
    --workers 4 \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    "app:create_app()"
