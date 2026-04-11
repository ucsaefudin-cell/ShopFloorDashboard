"""
Business logic services untuk Shop Floor Dashboard.
Menyediakan calculation dan validation services yang reusable.
"""
from datetime import date
from models import Machine, ProductionOrder


class CalculationService:
    """
    Service untuk kalkulasi business logic terkait production orders.
    Semua method adalah static untuk kemudahan penggunaan.
    """
    
    @staticmethod
    def calculate_pending_qty(target_qty, completed_qty, wip_qty):
        """
        Hitung pending quantity berdasarkan formula:
        pending_qty = target_qty - completed_qty - wip_qty
        
        Args:
            target_qty (int): Target quantity yang harus diproduksi
            completed_qty (int): Quantity yang sudah selesai
            wip_qty (int): Quantity yang sedang dalam proses (Work In Progress)
        
        Returns:
            int: Jumlah quantity yang masih pending/belum dikerjakan
        
        Example:
            >>> CalculationService.calculate_pending_qty(500, 300, 150)
            50
        """
        return target_qty - completed_qty - wip_qty
    
    @staticmethod
    def calculate_efficiency_percent(completed_qty, target_qty):
        """
        Hitung persentase efisiensi produksi berdasarkan formula:
        efficiency_percent = (completed_qty / target_qty) * 100
        
        Jika target_qty adalah 0, return 0.0 untuk menghindari division by zero.
        Hasil dibulatkan hingga 2 desimal.
        
        Args:
            completed_qty (int): Quantity yang sudah selesai diproduksi
            target_qty (int): Target quantity yang harus diproduksi
        
        Returns:
            float: Persentase efisiensi (0.00 - 100.00+), bisa lebih dari 100 jika over-achieve
        
        Examples:
            >>> CalculationService.calculate_efficiency_percent(450, 500)
            90.0
            >>> CalculationService.calculate_efficiency_percent(550, 500)
            110.0
            >>> CalculationService.calculate_efficiency_percent(100, 0)
            0.0
        """
        if target_qty == 0:
            return 0.0
        return round((completed_qty / target_qty) * 100, 2)


class ValidationService:
    """
    Service untuk validasi data production order sebelum disimpan ke database.
    Memastikan data integrity dan business rules terpenuhi.
    """
    
    @staticmethod
    def validate_production_order_data(data, db_session):
        """
        Validasi data production order sebelum create atau update.
        
        Args:
            data (dict): Dictionary berisi field production order
            db_session: SQLAlchemy database session untuk query validasi
        
        Returns:
            tuple: (is_valid: bool, errors: dict)
                - is_valid: True jika semua validasi pass
                - errors: Dictionary berisi field name dan error message
        
        Example:
            >>> is_valid, errors = ValidationService.validate_production_order_data(data, db)
            >>> if not is_valid:
            ...     return {'error': 'Validation failed', 'details': errors}, 400
        """
        errors = {}
        
        # Validasi required fields
        required_fields = ['machine_id', 'shift_name', 'order_date', 'target_qty', 'completed_qty', 'wip_qty']
        for field in required_fields:
            if field not in data or data[field] is None:
                errors[field] = f"Field '{field}' wajib diisi"
        
        # Jika ada required field yang missing, return early
        if errors:
            return False, errors
        
        # Validasi machine_id exists
        machine = db_session.query(Machine).filter_by(id=data['machine_id']).first()
        if not machine:
            errors['machine_id'] = f"Machine dengan ID {data['machine_id']} tidak ditemukan"
        elif not machine.is_active:
            errors['machine_id'] = f"Machine '{machine.machine_name}' tidak aktif"
        
        # Validasi shift_name
        valid_shifts = ['Morning', 'Afternoon', 'Night']
        if data['shift_name'] not in valid_shifts:
            errors['shift_name'] = f"Shift harus salah satu dari: {', '.join(valid_shifts)}"
        
        # Validasi order_date format
        try:
            if isinstance(data['order_date'], str):
                # Parse string date ke date object
                date.fromisoformat(data['order_date'])
        except (ValueError, TypeError):
            errors['order_date'] = "Format tanggal tidak valid, gunakan format YYYY-MM-DD"
        
        # Validasi quantities adalah non-negative integers
        quantity_fields = ['target_qty', 'completed_qty', 'wip_qty']
        for field in quantity_fields:
            try:
                value = int(data[field])
                if value < 0:
                    errors[field] = f"{field} tidak boleh negatif"
            except (ValueError, TypeError):
                errors[field] = f"{field} harus berupa angka integer"
        
        # Validasi business rule: completed_qty + wip_qty tidak boleh melebihi target_qty
        # (kecuali untuk over-achievement dimana completed bisa > target)
        try:
            target = int(data['target_qty'])
            completed = int(data['completed_qty'])
            wip = int(data['wip_qty'])
            
            # Pending qty tidak boleh negatif (kecuali over-achievement)
            pending = target - completed - wip
            if pending < 0 and completed <= target:
                errors['quantities'] = (
                    f"Total completed_qty ({completed}) + wip_qty ({wip}) = {completed + wip} "
                    f"melebihi target_qty ({target})"
                )
        except (ValueError, TypeError, KeyError):
            # Skip validasi ini jika ada error di validasi sebelumnya
            pass
        
        is_valid = len(errors) == 0
        return is_valid, errors
    
    @staticmethod
    def validate_partial_update_data(data):
        """
        Validasi data untuk partial update (PUT request).
        Hanya validasi field yang ada di request, tidak require semua field.
        
        Args:
            data (dict): Dictionary berisi field yang akan diupdate
        
        Returns:
            tuple: (is_valid: bool, errors: dict)
        """
        errors = {}
        
        # Validasi quantities jika ada
        quantity_fields = ['target_qty', 'completed_qty', 'wip_qty']
        for field in quantity_fields:
            if field in data:
                try:
                    value = int(data[field])
                    if value < 0:
                        errors[field] = f"{field} tidak boleh negatif"
                except (ValueError, TypeError):
                    errors[field] = f"{field} harus berupa angka integer"
        
        # Validasi shift_name jika ada
        if 'shift_name' in data:
            valid_shifts = ['Morning', 'Afternoon', 'Night']
            if data['shift_name'] not in valid_shifts:
                errors['shift_name'] = f"Shift harus salah satu dari: {', '.join(valid_shifts)}"
        
        # Validasi order_date jika ada
        if 'order_date' in data:
            try:
                if isinstance(data['order_date'], str):
                    date.fromisoformat(data['order_date'])
            except (ValueError, TypeError):
                errors['order_date'] = "Format tanggal tidak valid, gunakan format YYYY-MM-DD"
        
        is_valid = len(errors) == 0
        return is_valid, errors
