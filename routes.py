"""
API Routes untuk Shop Floor Dashboard.
Menyediakan REST API endpoints untuk machines dan production orders.
"""
from flask import Blueprint, request, jsonify
from datetime import date
from database import SessionLocal
from models import Machine, ProductionOrder
from services import ValidationService

# Buat blueprint untuk API routes
api_bp = Blueprint('api', __name__, url_prefix='/api')


# ============================================================================
# MACHINE ENDPOINTS
# ============================================================================

@api_bp.route('/machines', methods=['GET'])
def get_machines():
    """
    GET /api/machines
    
    Mengambil daftar semua mesin yang aktif.
    
    Returns:
        JSON: Array of machine objects
        Status: 200 OK
    
    Example Response:
        [
            {
                "id": 1,
                "machine_code": "CNC-001",
                "machine_name": "CNC Milling Machine 1",
                "is_active": true
            }
        ]
    """
    db = SessionLocal()
    try:
        # Query semua mesin yang aktif
        machines = db.query(Machine).filter_by(is_active=True).all()
        
        # Serialize ke JSON
        result = [machine.to_dict() for machine in machines]
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500
    
    finally:
        db.close()


# ============================================================================
# PRODUCTION ORDER ENDPOINTS - READ
# ============================================================================

@api_bp.route('/production-orders', methods=['GET'])
def get_production_orders():
    """
    GET /api/production-orders
    
    Mengambil daftar semua production orders dengan calculated fields
    (pending_qty dan efficiency_percent).
    
    Query Parameters:
        - machine_id (optional): Filter by machine ID
        - shift_name (optional): Filter by shift name
        - order_date (optional): Filter by order date (YYYY-MM-DD)
    
    Returns:
        JSON: Array of production order objects dengan calculated fields
        Status: 200 OK
    
    Example Response:
        [
            {
                "id": 1,
                "machine_id": 1,
                "machine_name": "CNC Milling Machine 1",
                "shift_name": "Morning",
                "order_date": "2024-01-15",
                "target_qty": 500,
                "completed_qty": 450,
                "wip_qty": 30,
                "pending_qty": 20,
                "efficiency_percent": 90.0,
                "created_at": "2024-01-15T08:00:00"
            }
        ]
    """
    db = SessionLocal()
    try:
        # Base query
        query = db.query(ProductionOrder)
        
        # Apply filters jika ada query parameters
        machine_id = request.args.get('machine_id', type=int)
        if machine_id:
            query = query.filter_by(machine_id=machine_id)
        
        shift_name = request.args.get('shift_name')
        if shift_name:
            query = query.filter_by(shift_name=shift_name)
        
        order_date_str = request.args.get('order_date')
        if order_date_str:
            try:
                order_date_obj = date.fromisoformat(order_date_str)
                query = query.filter_by(order_date=order_date_obj)
            except ValueError:
                return jsonify({
                    'error': 'Invalid date format',
                    'message': 'Use YYYY-MM-DD format for order_date'
                }), 400
        
        # Execute query dan order by created_at descending
        orders = query.order_by(ProductionOrder.created_at.desc()).all()
        
        # Serialize ke JSON dengan calculated fields
        result = [order.to_dict() for order in orders]
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500
    
    finally:
        db.close()


@api_bp.route('/production-orders/<int:order_id>', methods=['GET'])
def get_production_order(order_id):
    """
    GET /api/production-orders/<id>
    
    Mengambil detail satu production order berdasarkan ID.
    
    Args:
        order_id (int): ID production order
    
    Returns:
        JSON: Production order object dengan calculated fields
        Status: 200 OK atau 404 Not Found
    
    Example Response:
        {
            "id": 1,
            "machine_id": 1,
            "machine_name": "CNC Milling Machine 1",
            "shift_name": "Morning",
            "order_date": "2024-01-15",
            "target_qty": 500,
            "completed_qty": 450,
            "wip_qty": 30,
            "pending_qty": 20,
            "efficiency_percent": 90.0,
            "created_at": "2024-01-15T08:00:00"
        }
    """
    db = SessionLocal()
    try:
        # Query production order by ID
        order = db.query(ProductionOrder).filter_by(id=order_id).first()
        
        if not order:
            return jsonify({
                'error': 'Production order not found',
                'message': f'Production order dengan ID {order_id} tidak ditemukan'
            }), 404
        
        # Serialize ke JSON dengan calculated fields
        return jsonify(order.to_dict()), 200
    
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500
    
    finally:
        db.close()


# ============================================================================
# PRODUCTION ORDER ENDPOINTS - WRITE
# ============================================================================

@api_bp.route('/production-orders', methods=['POST'])
def create_production_order():
    """
    POST /api/production-orders
    
    Membuat production order baru.
    
    Request Body (JSON):
        {
            "machine_id": 1,
            "shift_name": "Morning",
            "order_date": "2024-01-15",
            "target_qty": 500,
            "completed_qty": 0,
            "wip_qty": 0
        }
    
    Returns:
        JSON: Created production order object
        Status: 201 Created atau 400 Bad Request
    """
    db = SessionLocal()
    try:
        # Parse request body
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'Bad request',
                'message': 'Request body harus berupa JSON'
            }), 400
        
        # Validasi data
        is_valid, errors = ValidationService.validate_production_order_data(data, db)
        if not is_valid:
            return jsonify({
                'error': 'Validation failed',
                'details': errors
            }), 400
        
        # Parse order_date jika string
        order_date_value = data['order_date']
        if isinstance(order_date_value, str):
            order_date_value = date.fromisoformat(order_date_value)
        
        # Buat production order baru
        new_order = ProductionOrder(
            machine_id=data['machine_id'],
            shift_name=data['shift_name'],
            order_date=order_date_value,
            target_qty=data['target_qty'],
            completed_qty=data['completed_qty'],
            wip_qty=data['wip_qty']
        )
        
        db.add(new_order)
        db.commit()
        db.refresh(new_order)
        
        # Return created object dengan status 201
        return jsonify(new_order.to_dict()), 201
    
    except Exception as e:
        db.rollback()
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500
    
    finally:
        db.close()


@api_bp.route('/production-orders/<int:order_id>', methods=['PUT'])
def update_production_order(order_id):
    """
    PUT /api/production-orders/<id>
    
    Update production order yang sudah ada.
    Mendukung partial update (tidak semua field wajib dikirim).
    
    Args:
        order_id (int): ID production order yang akan diupdate
    
    Request Body (JSON) - semua field optional:
        {
            "completed_qty": 480,
            "wip_qty": 15
        }
    
    Returns:
        JSON: Updated production order object
        Status: 200 OK, 400 Bad Request, atau 404 Not Found
    """
    db = SessionLocal()
    try:
        # Query production order by ID
        order = db.query(ProductionOrder).filter_by(id=order_id).first()
        
        if not order:
            return jsonify({
                'error': 'Production order not found',
                'message': f'Production order dengan ID {order_id} tidak ditemukan'
            }), 404
        
        # Parse request body
        data = request.get_json()
        
        if not data:
            return jsonify({
                'error': 'Bad request',
                'message': 'Request body harus berupa JSON'
            }), 400
        
        # Validasi data untuk partial update
        is_valid, errors = ValidationService.validate_partial_update_data(data)
        if not is_valid:
            return jsonify({
                'error': 'Validation failed',
                'details': errors
            }), 400
        
        # Update fields yang ada di request
        if 'machine_id' in data:
            # Validasi machine exists
            machine = db.query(Machine).filter_by(id=data['machine_id']).first()
            if not machine:
                return jsonify({
                    'error': 'Validation failed',
                    'details': {'machine_id': f"Machine dengan ID {data['machine_id']} tidak ditemukan"}
                }), 400
            order.machine_id = data['machine_id']
        
        if 'shift_name' in data:
            order.shift_name = data['shift_name']
        
        if 'order_date' in data:
            order_date_value = data['order_date']
            if isinstance(order_date_value, str):
                order_date_value = date.fromisoformat(order_date_value)
            order.order_date = order_date_value
        
        if 'target_qty' in data:
            order.target_qty = data['target_qty']
        
        if 'completed_qty' in data:
            order.completed_qty = data['completed_qty']
        
        if 'wip_qty' in data:
            order.wip_qty = data['wip_qty']
        
        # Commit changes
        db.commit()
        db.refresh(order)
        
        # Return updated object
        return jsonify(order.to_dict()), 200
    
    except Exception as e:
        db.rollback()
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500
    
    finally:
        db.close()


# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@api_bp.route('/health', methods=['GET'])
def health_check():
    """
    GET /api/health
    
    Health check endpoint untuk monitoring.
    
    Returns:
        JSON: Status object
        Status: 200 OK
    
    Example Response:
        {
            "status": "ok",
            "message": "Shop Floor Dashboard API is healthy"
        }
    """
    return jsonify({
        'status': 'ok',
        'message': 'Shop Floor Dashboard API is healthy'
    }), 200
