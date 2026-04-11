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
    app = Flask(__name__, static_folder='static', static_url_path='')
    
    # Load konfigurasi dari Config class
    app.config.from_object(Config)
    
    # Setup CORS untuk mengizinkan request dari frontend
    # Dalam development: allow all origins (*)
    # Dalam production: batasi ke domain spesifik
    CORS(app, 
         origins=Config.CORS_ORIGINS,
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'],
         supports_credentials=True)
    
    # Inisialisasi database (buat tabel jika belum ada)
    with app.app_context():
        init_db()
    
    # Register API routes blueprint
    from routes import api_bp
    app.register_blueprint(api_bp)
    
    @app.route('/')
    def index():
        """Route root untuk health check sederhana"""
        return {
            'status': 'ok',
            'message': 'Shop Floor Dashboard API is running',
            'version': '1.0.0',
            'endpoints': {
                'machines': '/api/machines',
                'production_orders': '/api/production-orders',
                'health': '/api/health'
            }
        }
    
    # Error handlers untuk response yang konsisten
    @app.errorhandler(404)
    def not_found(error):
        """Handler untuk 404 Not Found"""
        return {
            'error': 'Not found',
            'message': 'Endpoint yang diminta tidak ditemukan'
        }, 404
    
    @app.errorhandler(500)
    def internal_error(error):
        """Handler untuk 500 Internal Server Error"""
        return {
            'error': 'Internal server error',
            'message': 'Terjadi kesalahan pada server'
        }, 500
    
    return app


if __name__ == '__main__':
    app = create_app()
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=Config.FLASK_ENV == 'development'
    )
