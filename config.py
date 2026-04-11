"""
Konfigurasi aplikasi Flask untuk Shop Floor Dashboard.
Menggunakan environment variables untuk fleksibilitas deployment.
"""
import os
from dotenv import load_dotenv

# Muat environment variables dari file .env
load_dotenv()


class Config:
    """Kelas konfigurasi utama untuk aplikasi Flask"""
    
    # Konfigurasi database PostgreSQL
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'postgresql://postgres:password@localhost:5432/shopfloor_db'
    )
    
    # Nonaktifkan track modifications untuk performa
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Secret key untuk session management
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Konfigurasi CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*')
    
    # Environment mode
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
