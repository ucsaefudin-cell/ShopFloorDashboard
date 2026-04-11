"""
Aplikasi Flask utama untuk Shop Floor Dashboard.
Entry point untuk backend API server.
"""
from flask import Flask
from flask_cors import CORS
from config import Config
from database import init_db


def create_app():
    """
    Factory function untuk membuat dan mengkonfigurasi Flask application.
    
    Returns:
        Flask: Configured Flask application instance
    """
    app = Flask(__name__)
    
    # Load konfigurasi dari Config class
    app.config.from_object(Config)
    
    # Setup CORS untuk mengizinkan request dari frontend
    CORS(app, origins=Config.CORS_ORIGINS)
    
    # Inisialisasi database (buat tabel jika belum ada)
    with app.app_context():
        init_db()
    
    # Register blueprints/routes akan ditambahkan di task berikutnya
    # TODO: Register API routes
    
    @app.route('/')
    def index():
        """Route root untuk health check sederhana"""
        return {
            'status': 'ok',
            'message': 'Shop Floor Dashboard API is running',
            'version': '1.0.0'
        }
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=Config.FLASK_ENV == 'development'
    )
