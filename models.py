"""
Model database untuk Shop Floor Dashboard.
Menggunakan SQLAlchemy ORM untuk interaksi dengan PostgreSQL.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Date, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class Machine(Base):
    """
    Model untuk tabel master mesin (mst_machine).
    Menyimpan informasi mesin produksi yang tersedia di shop floor.
    """
    __tablename__ = 'mst_machine'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_code = Column(String(50), unique=True, nullable=False)
    machine_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Relasi one-to-many dengan ProductionOrder
    production_orders = relationship(
        'ProductionOrder',
        back_populates='machine',
        cascade='all, delete-orphan'
    )
    
    def to_dict(self):
        """
        Konversi instance model ke dictionary untuk serialisasi JSON.
        
        Returns:
            dict: Dictionary berisi semua field model
        """
        return {
            'id': self.id,
            'machine_code': self.machine_code,
            'machine_name': self.machine_name,
            'is_active': self.is_active
        }
    
    def __repr__(self):
        return f"<Machine(id={self.id}, code='{self.machine_code}', name='{self.machine_name}')>"


class ProductionOrder(Base):
    """
    Model untuk tabel transaksi production order (trx_production_order).
    Menyimpan data order produksi untuk setiap mesin dan shift.
    """
    __tablename__ = 'trx_production_order'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(
        Integer,
        ForeignKey('mst_machine.id', ondelete='CASCADE'),
        nullable=False
    )
    shift_name = Column(String(20), nullable=False)
    order_date = Column(Date, nullable=False)
    target_qty = Column(Integer, nullable=False)
    completed_qty = Column(Integer, nullable=False)
    wip_qty = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Constraint untuk memastikan quantity tidak negatif
    __table_args__ = (
        CheckConstraint('target_qty >= 0', name='check_target_qty_positive'),
        CheckConstraint('completed_qty >= 0', name='check_completed_qty_positive'),
        CheckConstraint('wip_qty >= 0', name='check_wip_qty_positive'),
    )
    
    # Relasi many-to-one dengan Machine
    machine = relationship('Machine', back_populates='production_orders')
    
    def calculate_pending_qty(self):
        """
        Hitung pending quantity berdasarkan formula:
        pending_qty = target_qty - completed_qty - wip_qty
        
        Returns:
            int: Jumlah quantity yang masih pending
        """
        return self.target_qty - self.completed_qty - self.wip_qty
    
    def calculate_efficiency_percent(self):
        """
        Hitung persentase efisiensi berdasarkan formula:
        efficiency_percent = (completed_qty / target_qty) * 100
        
        Jika target_qty adalah 0, return 0 untuk menghindari division by zero.
        
        Returns:
            float: Persentase efisiensi (0-100+), dibulatkan 2 desimal
        """
        if self.target_qty == 0:
            return 0.0
        return round((self.completed_qty / self.target_qty) * 100, 2)
    
    def to_dict(self):
        """
        Konversi instance model ke dictionary untuk serialisasi JSON.
        Termasuk field calculated: pending_qty dan efficiency_percent.
        
        Returns:
            dict: Dictionary berisi semua field model dan calculated fields
        """
        return {
            'id': self.id,
            'machine_id': self.machine_id,
            'machine_name': self.machine.machine_name if self.machine else None,
            'shift_name': self.shift_name,
            'order_date': self.order_date.isoformat() if self.order_date else None,
            'target_qty': self.target_qty,
            'completed_qty': self.completed_qty,
            'wip_qty': self.wip_qty,
            'pending_qty': self.calculate_pending_qty(),
            'efficiency_percent': self.calculate_efficiency_percent(),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return (f"<ProductionOrder(id={self.id}, machine_id={self.machine_id}, "
                f"shift='{self.shift_name}', date='{self.order_date}')>")
