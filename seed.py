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
    Seed data master mesin untuk Paper/Packaging Manufacturing Plant.
    PT Papertech / Sonoco - Mesin produksi kertas dan packaging.
    
    Args:
        db: SQLAlchemy database session
    
    Returns:
        list: List of Machine objects yang telah dibuat
    """
    print("Seeding data mesin (Paper/Packaging Manufacturing)...")
    
    machines = [
        Machine(machine_code='PM-001', machine_name='Paper Machine 1', is_active=True),
        Machine(machine_code='SR-002', machine_name='Slitter Rewinder 2', is_active=True),
        Machine(machine_code='CW-003', machine_name='Core Winder 3', is_active=True),
        Machine(machine_code='EXT-004', machine_name='Extruder Line 4', is_active=True),
        Machine(machine_code='PS-005', machine_name='Pulping Station 5', is_active=True),
    ]
    
    db.add_all(machines)
    db.commit()
    
    # Refresh untuk mendapatkan ID yang di-generate
    for machine in machines:
        db.refresh(machine)
    
    print(f"✓ {len(machines)} mesin Paper/Packaging berhasil dibuat")
    return machines


def seed_production_orders(db, machines):
    """
    Seed data production orders untuk Paper/Packaging Manufacturing.
    Target quantities disesuaikan dengan kapasitas mesin paper/packaging.
    Membuat 20+ orders dengan berbagai skenario efisiensi.
    
    Args:
        db: SQLAlchemy database session
        machines: List of Machine objects untuk referensi
    """
    print("Seeding data production orders (Paper/Packaging)...")
    
    shifts = ['Morning', 'Afternoon', 'Night']
    today = date.today()
    
    orders = []
    
    # Skenario 1: Paper Machine 1 - High volume production (efisiensi tinggi >90%)
    orders.extend([
        ProductionOrder(
            machine_id=machines[0].id,  # Paper Machine 1
            shift_name='Morning',
            order_date=today,
            target_qty=5000,  # 5000 reams kertas
            completed_qty=4800,
            wip_qty=150
        ),
        ProductionOrder(
            machine_id=machines[0].id,
            shift_name='Afternoon',
            order_date=today,
            target_qty=5200,
            completed_qty=4950,
            wip_qty=200
        ),
    ])
    
    # Skenario 2: Slitter Rewinder - Medium volume (efisiensi sedang 70-90%)
    orders.extend([
        ProductionOrder(
            machine_id=machines[1].id,  # Slitter Rewinder 2
            shift_name='Morning',
            order_date=today,
            target_qty=3000,  # 3000 rolls
            completed_qty=2400,
            wip_qty=450
        ),
        ProductionOrder(
            machine_id=machines[1].id,
            shift_name='Afternoon',
            order_date=today,
            target_qty=3200,
            completed_qty=2560,
            wip_qty=500
        ),
        ProductionOrder(
            machine_id=machines[1].id,
            shift_name='Night',
            order_date=today,
            target_qty=2800,
            completed_qty=2100,
            wip_qty=600
        ),
    ])
    
    # Skenario 3: Core Winder - High efficiency
    orders.extend([
        ProductionOrder(
            machine_id=machines[2].id,  # Core Winder 3
            shift_name='Morning',
            order_date=today,
            target_qty=2500,  # 2500 cores
            completed_qty=2350,
            wip_qty=120
        ),
        ProductionOrder(
            machine_id=machines[2].id,
            shift_name='Afternoon',
            order_date=today,
            target_qty=2600,
            completed_qty=2470,
            wip_qty=100
        ),
    ])
    
    # Skenario 4: Extruder Line - Variable efficiency
    orders.extend([
        ProductionOrder(
            machine_id=machines[3].id,  # Extruder Line 4
            shift_name='Morning',
            order_date=today,
            target_qty=1800,  # 1800 kg plastic coating
            completed_qty=1440,
            wip_qty=300
        ),
        ProductionOrder(
            machine_id=machines[3].id,
            shift_name='Afternoon',
            order_date=today,
            target_qty=2000,
            completed_qty=1500,
            wip_qty=400
        ),
        ProductionOrder(
            machine_id=machines[3].id,
            shift_name='Night',
            order_date=today,
            target_qty=1900,
            completed_qty=1330,
            wip_qty=450
        ),
    ])
    
    # Skenario 5: Pulping Station - Low efficiency (maintenance issues)
    orders.extend([
        ProductionOrder(
            machine_id=machines[4].id,  # Pulping Station 5
            shift_name='Morning',
            order_date=today,
            target_qty=4000,  # 4000 kg pulp
            completed_qty=2400,
            wip_qty=1200
        ),
        ProductionOrder(
            machine_id=machines[4].id,
            shift_name='Afternoon',
            order_date=today,
            target_qty=4200,
            completed_qty=2520,
            wip_qty=1400
        ),
    ])
    
    # Skenario 6: Orders dari hari kemarin (completed)
    yesterday = today - timedelta(days=1)
    orders.extend([
        ProductionOrder(
            machine_id=machines[0].id,  # Paper Machine 1
            shift_name='Night',
            order_date=yesterday,
            target_qty=5000,
            completed_qty=5000,
            wip_qty=0
        ),
        ProductionOrder(
            machine_id=machines[1].id,  # Slitter Rewinder 2
            shift_name='Night',
            order_date=yesterday,
            target_qty=3000,
            completed_qty=2850,
            wip_qty=150
        ),
        ProductionOrder(
            machine_id=machines[2].id,  # Core Winder 3
            shift_name='Night',
            order_date=yesterday,
            target_qty=2500,
            completed_qty=2500,
            wip_qty=0
        ),
    ])
    
    # Skenario 7: Orders baru yang baru dimulai
    orders.extend([
        ProductionOrder(
            machine_id=machines[3].id,  # Extruder Line 4
            shift_name='Night',
            order_date=today,
            target_qty=1800,
            completed_qty=360,
            wip_qty=900
        ),
        ProductionOrder(
            machine_id=machines[4].id,  # Pulping Station 5
            shift_name='Night',
            order_date=today,
            target_qty=4000,
            completed_qty=800,
            wip_qty=2400
        ),
    ])
    
    # Skenario 8: Over-achievement (>100% efficiency)
    orders.extend([
        ProductionOrder(
            machine_id=machines[0].id,  # Paper Machine 1
            shift_name='Morning',
            order_date=yesterday,
            target_qty=5000,
            completed_qty=5250,  # Over-achievement
            wip_qty=0
        ),
        ProductionOrder(
            machine_id=machines[2].id,  # Core Winder 3
            shift_name='Afternoon',
            order_date=yesterday,
            target_qty=2500,
            completed_qty=2625,  # Over-achievement
            wip_qty=0
        ),
    ])
    
    # Skenario 9: Mixed efficiency dari 2 hari lalu
    two_days_ago = today - timedelta(days=2)
    orders.extend([
        ProductionOrder(
            machine_id=machines[1].id,  # Slitter Rewinder 2
            shift_name='Morning',
            order_date=two_days_ago,
            target_qty=3000,
            completed_qty=3000,
            wip_qty=0
        ),
        ProductionOrder(
            machine_id=machines[3].id,  # Extruder Line 4
            shift_name='Afternoon',
            order_date=two_days_ago,
            target_qty=2000,
            completed_qty=1900,
            wip_qty=100
        ),
    ])
    
    db.add_all(orders)
    db.commit()
    
    print(f"✓ {len(orders)} production orders Paper/Packaging berhasil dibuat")
    print(f"  - Paper Machine 1: High volume (5000+ units)")
    print(f"  - Slitter Rewinder: Medium volume (3000 rolls)")
    print(f"  - Core Winder: Precision work (2500 cores)")
    print(f"  - Extruder Line: Coating process (1800-2000 kg)")
    print(f"  - Pulping Station: Raw material (4000 kg pulp)")


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
