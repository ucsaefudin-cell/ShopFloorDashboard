"""
Konfigurasi aplikasi Flask untuk Shop Floor Dashboard.
Menggunakan environment variables untuk fleksibilitas deployment.
Support untuk GCP Cloud SQL via Unix Socket dan local PostgreSQL.
"""
import os
from dotenv import load_dotenv

# Muat environment variables dari file .env (hanya untuk local development)
load_dotenv()


class Config:
    """Kelas konfigurasi utama untuk aplikasi Flask"""
    
    # Konfigurasi database PostgreSQL
    # Support untuk GCP Cloud SQL (Unix Socket) dan local PostgreSQL
    @staticmethod
    def get_database_uri():
        """
        Mendapatkan database URI berdasarkan environment.
        
        Untuk GCP Cloud Run:
        - Gunakan Unix Socket: /cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
        - Set environment variable: CLOUD_SQL_CONNECTION_NAME
        
        Untuk local development:
        - Gunakan standard PostgreSQL connection string
        - Set environment variable: DATABASE_URL
        
        Returns:
            str: Database connection URI
        """
        # Check apakah running di GCP Cloud Run (via Cloud SQL Unix Socket)
        cloud_sql_connection_name = os.getenv('CLOUD_SQL_CONNECTION_NAME')
        
        if cloud_sql_connection_name:
            # GCP Cloud SQL via Unix Socket
            # Format: /cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
            db_user = os.getenv('DB_USER', 'postgres')
            db_pass = os.getenv('DB_PASS', '')
            db_name = os.getenv('DB_NAME', 'shopfloor_db')
            
            # Connection string untuk Cloud SQL Unix Socket
            return f'postgresql+psycopg2://{db_user}:{db_pass}@/{db_name}?host=/cloudsql/{cloud_sql_connection_name}'
        else:
            # Local development atau standard PostgreSQL connection
            return os.getenv(
                'DATABASE_URL',
                'postgresql://postgres:password@localhost:5432/shopfloor_db'
            )
    
    SQLALCHEMY_DATABASE_URI = get_database_uri.__func__()
    
    # Nonaktifkan track modifications untuk performa
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Secret key untuk session management
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Konfigurasi CORS
    # Untuk production, set ke domain spesifik (e.g., 'https://yourdomain.com')
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
    
    # Environment mode
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    
    # Port untuk Cloud Run (default 8080)
    PORT = int(os.getenv('PORT', 8080))
