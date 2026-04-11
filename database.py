"""
Modul untuk inisialisasi dan manajemen koneksi database.
Menyediakan engine dan session factory untuk SQLAlchemy.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from config import Config
from models import Base


# Buat engine database dengan connection string dari config
engine = create_engine(
    Config.SQLALCHEMY_DATABASE_URI,
    echo=True if Config.FLASK_ENV == 'development' else False,
    pool_pre_ping=True  # Verifikasi koneksi sebelum digunakan
)

# Buat session factory dengan scoped_session untuk thread-safety
SessionLocal = scoped_session(
    sessionmaker(autocommit=False, autoflush=False, bind=engine)
)


def init_db():
    """
    Inisialisasi database dengan membuat semua tabel yang didefinisikan di models.
    Fungsi ini akan membuat tabel jika belum ada (idempotent).
    """
    Base.metadata.create_all(bind=engine)
    print("✓ Database tables created successfully")


def get_db():
    """
    Dependency function untuk mendapatkan database session.
    Digunakan dalam context manager untuk auto-cleanup.
    
    Yields:
        Session: SQLAlchemy database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
