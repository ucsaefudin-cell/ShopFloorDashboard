"""
Script untuk seeding database dengan data dummy yang realistis.
Menghapus data existing dan mengisi ulang dengan data fresh.
"""
from datetime import date, timedelta
from database import SessionLocal, init_db
from models import Machine, ProductionOrder


def clear_data(db):
    """
    Hapus semua data existing dari database.
    Cascade delete akan otomatis menghapus production orders terkait.
    
    Args:
        db: SQLAlchemy database session
    """
    print("Menghapus data existing...")
    db.query(ProductionOrder).delete()
    db.query(Machine).delete()
    db.commit()
    print("✓ Data lama berhasil dihapus")


def seed_machines(db):
    """
    Seed data master mesin dengan 5 mesin berbeda.
    
    Args:
        db: SQLAlchemy database session
    
    Returns:
        list: List of Machine objects yang telah dibuat
    """
    print("Seeding data mesin...")
    
    machines = [
        Machine(machine_code='CNC-001', machine_name='CNC Milling Machine 1', is_active=True),
        Machine(machine_code='PRESS-002', machine_name='Hydraulic Press 2', is_active=True),
        Machine(machine_code='WELD-003', machine_name='Welding Station 3', is_active=True),
        Machine(machine_code='PACK-004', machine_name='Packaging Line 4', is_active=True),
        Machine(machine_code='QC-005', machine_name='Quality Control Station 5', is_active=True),
    ]
    
    db.add_all(machines)
    db.commit()
    
    # Refresh untuk mendapatkan ID yang di-generate
    for machine in machines:
        db.refresh(machine)
    
    print(f"✓ {len(machines)} mesin berhasil dibuat")
    return machines


def seed_production_orders(db, machines):
    """
    Seed data production orders dengan variasi efisiensi.
    Membuat 20+ orders dengan berbagai skenario:
    - Below target (efisiensi < 70%)
    - On target (efisiensi 70-90%)
    - Above target (efisiensi > 90%)
    
    Args:
        db: SQLAlchemy database session
        machines: List of Machine objects untuk referensi
    """
    print("Seeding data production orders...")
    
    shifts = ['Morning', 'Afternoon', 'Night']
    today = date.today()
    
    orders = []
    
    # Skenario 1: Orders dengan efisiensi tinggi (>90%)
    orders.extend([
        ProductionOrder(
            machine_id=machines[0].id,
            shift_name='Morning',
            order_date=today,
            target_qty=500,
            completed_qty=480,
            wip_qty=15
        ),
        ProductionOrder(
            machine_id=machines[1].id,
            shift_name='Morning',
            order_date=today,
            target_qty=800,
            completed_qty=750,
            wip_qty=40
        ),
        ProductionOrder(
            machine_id=machines[2].id,
            shift_name='Afternoon',
            order_date=today,
            target_qty=600,
            completed_qty=580,
            wip_qty=10
        ),
    ])
    
    # Skenario 2: Orders dengan efisiensi sedang (70-90%)
    orders.extend([
        ProductionOrder(
            machine_id=machines[0].id,
            shift_name='Afternoon',
            order_date=today,
            target_qty=500,
            completed_qty=400,
            wip_qty=80
        ),
        ProductionOrder(
            machine_id=machines[3].id,
            shift_name='Morning',
            order_date=today,
            target_qty=1000,
            completed_qty=750,
            wip_qty=200
        ),
        ProductionOrder(
            machine_id=machines[4].id,
            shift_name='Afternoon',
            order_date=today,
            target_qty=300,
            completed_qty=240,
            wip_qty=50
        ),
    ])
    
    # Skenario 3: Orders dengan efisiensi rendah (<70%)
    orders.extend([
        ProductionOrder(
            machine_id=machines[1].id,
            shift_name='Night',
            order_date=today,
            target_qty=700,
            completed_qty=350,
            wip_qty=250
        ),
        ProductionOrder(
            machine_id=machines[2].id,
            shift_name='Morning',
            order_date=today,
            target_qty=400,
            completed_qty=200,
            wip_qty=150
        ),
    ])
    
    # Skenario 4: Orders dari hari kemarin
    yesterday = today - timedelta(days=1)
    orders.extend([
        ProductionOrder(
            machine_id=machines[0].id,
            shift_name='Night',
            order_date=yesterday,
            target_qty=500,
            completed_qty=500,
            wip_qty=0
        ),
        ProductionOrder(
            machine_id=machines[3].id,
            shift_name='Afternoon',
            order_date=yesterday,
            target_qty=900,
            completed_qty=850,
            wip_qty=50
        ),
    ])
    
    # Skenario 5: Orders baru yang baru dimulai
    orders.extend([
        ProductionOrder(
            machine_id=machines[4].id,
            shift_name='Morning',
            order_date=today,
            target_qty=250,
            completed_qty=50,
            wip_qty=100
        ),
        ProductionOrder(
            machine_id=machines[3].id,
            shift_name='Night',
            order_date=today,
            target_qty=600,
            completed_qty=100,
            wip_qty=300
        ),
    ])
    
    # Skenario 6: Orders dengan over-achievement (>100%)
    orders.extend([
        ProductionOrder(
            machine_id=machines[1].id,
            shift_name='Afternoon',
            order_date=yesterday,
            target_qty=500,
            completed_qty=550,
            wip_qty=0
        ),
        ProductionOrder(
            machine_id=machines[2].id,
            shift_name='Night',
            order_date=yesterday,
            target_qty=400,
            completed_qty=420,
            wip_qty=0
        ),
    ])
    
    # Skenario 7: Orders dengan berbagai shift untuk variasi
    two_days_ago = today - timedelta(days=2)
    orders.extend([
        ProductionOrder(
            machine_id=machines[0].id,
            shift_name='Night',
            order_date=two_days_ago,
            target_qty=450,
            completed_qty=450,
            wip_qty=0
        ),
        ProductionOrder(
            machine_id=machines[4].id,
            shift_name='Night',
            order_date=today,
            target_qty=200,
            completed_qty=150,
            wip_qty=40
        ),
        ProductionOrder(
            machine_id=machines[3].id,
            shift_name='Afternoon',
            order_date=today,
            target_qty=850,
            completed_qty=700,
            wip_qty=100
        ),
        ProductionOrder(
            machine_id=machines[2].id,
            shift_name='Night',
            order_date=today,
            target_qty=550,
            completed_qty=400,
            wip_qty=120
        ),
        ProductionOrder(
            machine_id=machines[1].id,
            shift_name='Morning',
            order_date=yesterday,
            target_qty=750,
            completed_qty=720,
            wip_qty=30
        ),
        ProductionOrder(
            machine_id=machines[0].id,
            shift_name='Morning',
            order_date=yesterday,
            target_qty=500,
            completed_qty=480,
            wip_qty=20
        ),
    ])
    
    db.add_all(orders)
    db.commit()
    
    print(f"✓ {len(orders)} production orders berhasil dibuat")


def run_seeder():
    """
    Fungsi utama untuk menjalankan seeding process.
    Menghapus data lama dan mengisi dengan data baru.
    """
    print("\n" + "="*50)
    print("SHOP FLOOR DASHBOARD - DATABASE SEEDER")
    print("="*50 + "\n")
    
    # Inisialisasi database (buat tabel jika belum ada)
    init_db()
    
    # Buat database session
    db = SessionLocal()
    
    try:
        # Hapus data existing
        clear_data(db)
        
        # Seed machines
        machines = seed_machines(db)
        
        # Seed production orders
        seed_production_orders(db, machines)
        
        print("\n" + "="*50)
        print("✓ SEEDING SELESAI!")
        print("="*50 + "\n")
        
    except Exception as e:
        print(f"\n✗ Error saat seeding: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == '__main__':
    run_seeder()
