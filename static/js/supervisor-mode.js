/**
 * Supervisor Mode untuk Shop Floor Dashboard
 * Interactive dashboard dengan CRUD operations dan analytics
 */

// State management
let currentOrders = [];
let machines = [];
let selectedOrderId = null;

/**
 * Show toast notification
 * @param {string} message - Pesan yang akan ditampilkan
 * @param {string} type - Tipe notifikasi (success/error/info)
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    const messageEl = document.getElementById('toast-message');
    
    // Set icon berdasarkan type
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };
    icon.textContent = icons[type] || icons.info;
    
    // Set message
    messageEl.textContent = message;
    
    // Show toast
    toast.classList.remove('hidden');
    
    // Hide setelah 3 detik
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

/**
 * Update statistics cards
 */
function updateStats() {
    if (currentOrders.length === 0) {
        document.getElementById('stat-total').textContent = '0';
        document.getElementById('stat-efficiency').textContent = '0%';
        document.getElementById('stat-target').textContent = '0';
        document.getElementById('stat-completed').textContent = '0';
        return;
    }
    
    const totalOrders = currentOrders.length;
    const avgEfficiency = currentOrders.reduce((sum, order) => sum + order.efficiency_percent, 0) / totalOrders;
    const totalTarget = currentOrders.reduce((sum, order) => sum + order.target_qty, 0);
    const totalCompleted = currentOrders.reduce((sum, order) => sum + order.completed_qty, 0);
    
    document.getElementById('stat-total').textContent = totalOrders;
    document.getElementById('stat-efficiency').textContent = avgEfficiency.toFixed(1) + '%';
    document.getElementById('stat-target').textContent = totalTarget.toLocaleString('id-ID');
    document.getElementById('stat-completed').textContent = totalCompleted.toLocaleString('id-ID');
}

/**
 * Get efficiency badge color
 */
function getEfficiencyBadge(efficiency) {
    if (efficiency >= 90) {
        return '<span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">' + efficiency.toFixed(1) + '%</span>';
    } else if (efficiency >= 70) {
        return '<span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">' + efficiency.toFixed(1) + '%</span>';
    } else {
        return '<span class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">' + efficiency.toFixed(1) + '%</span>';
    }
}

/**
 * Render production orders table
 */
function renderTable() {
    const loadingEl = document.getElementById('table-loading');
    const containerEl = document.getElementById('table-container');
    const emptyEl = document.getElementById('table-empty');
    const bodyEl = document.getElementById('table-body');
    
    // Hide loading
    loadingEl.classList.add('hidden');
    
    if (currentOrders.length === 0) {
        containerEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
        return;
    }
    
    // Show table
    emptyEl.classList.add('hidden');
    containerEl.classList.remove('hidden');
    
    // Render rows
    bodyEl.innerHTML = currentOrders.map(order => `
        <tr class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">#${order.id}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${order.machine_name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${order.shift_name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">${order.order_date}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.target_qty}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.completed_qty}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.wip_qty}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${order.pending_qty}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">${getEfficiencyBadge(order.efficiency_percent)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm">
                <button onclick="editOrder(${order.id})" class="text-sonoco-blue hover:text-sonoco-blue-dark font-semibold mr-3">
                    ✏️ Edit
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Fetch data dari API
 */
async function fetchData() {
    try {
        // Fetch orders dan machines secara parallel
        const [orders, machinesData] = await Promise.all([
            API.fetchProductionOrders(),
            API.fetchMachines()
        ]);
        
        currentOrders = orders;
        machines = machinesData;
        
        // Update UI
        renderTable();
        updateStats();
        updateCharts();
        
    } catch (error) {
        console.error('Error fetching data:', error);
        showToast('Gagal memuat data: ' + error.message, 'error');
    }
}

/**
 * Show modal untuk create/edit
 * @param {number|null} orderId - ID order untuk edit, null untuk create
 */
async function showModal(orderId = null) {
    const modal = document.getElementById('order-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('order-form');
    const machineSelect = document.getElementById('machine-id');
    
    // Populate machine options
    machineSelect.innerHTML = '<option value="">Pilih Machine...</option>' +
        machines.map(m => `<option value="${m.id}">${m.machine_name}</option>`).join('');
    
    if (orderId) {
        // Edit mode
        title.textContent = 'Edit Production Order';
        selectedOrderId = orderId;
        
        try {
            const order = await API.fetchProductionOrder(orderId);
            
            // Fill form dengan data existing
            document.getElementById('order-id').value = order.id;
            document.getElementById('machine-id').value = order.machine_id;
            document.getElementById('shift-name').value = order.shift_name;
            document.getElementById('order-date').value = order.order_date;
            document.getElementById('target-qty').value = order.target_qty;
            document.getElementById('completed-qty').value = order.completed_qty;
            document.getElementById('wip-qty').value = order.wip_qty;
            
        } catch (error) {
            showToast('Gagal memuat data order: ' + error.message, 'error');
            return;
        }
    } else {
        // Create mode
        title.textContent = 'Create Production Order';
        selectedOrderId = null;
        form.reset();
        
        // Set default date ke hari ini
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('order-date').value = today;
    }
    
    // Hide error
    document.getElementById('form-error').classList.add('hidden');
    
    // Show modal
    modal.classList.add('active');
}

/**
 * Hide modal
 */
function hideModal() {
    const modal = document.getElementById('order-modal');
    modal.classList.remove('active');
    selectedOrderId = null;
}

/**
 * Handle form submit
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = {
        machine_id: parseInt(document.getElementById('machine-id').value),
        shift_name: document.getElementById('shift-name').value,
        order_date: document.getElementById('order-date').value,
        target_qty: parseInt(document.getElementById('target-qty').value),
        completed_qty: parseInt(document.getElementById('completed-qty').value),
        wip_qty: parseInt(document.getElementById('wip-qty').value)
    };
    
    const submitBtn = document.getElementById('btn-submit');
    const errorEl = document.getElementById('form-error');
    
    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';
    errorEl.classList.add('hidden');
    
    try {
        if (selectedOrderId) {
            // Update existing order
            await API.updateProductionOrder(selectedOrderId, formData);
            showToast('Production order berhasil diupdate!', 'success');
        } else {
            // Create new order
            await API.createProductionOrder(formData);
            showToast('Production order berhasil dibuat!', 'success');
        }
        
        // Refresh data dan close modal
        await fetchData();
        hideModal();
        
    } catch (error) {
        // Show error
        errorEl.textContent = error.message;
        errorEl.classList.remove('hidden');
        showToast('Gagal menyimpan: ' + error.message, 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save';
    }
}

/**
 * Edit order (dipanggil dari table row)
 */
window.editOrder = function(orderId) {
    showModal(orderId);
};

/**
 * Initialize Supervisor Mode
 */
async function initSupervisorMode() {
    console.log('🚀 Initializing Supervisor Mode...');
    
    // Initial fetch
    await fetchData();
    
    // Setup event listeners
    document.getElementById('btn-refresh').addEventListener('click', fetchData);
    document.getElementById('btn-create').addEventListener('click', () => showModal());
    document.getElementById('btn-cancel').addEventListener('click', hideModal);
    document.getElementById('order-form').addEventListener('submit', handleFormSubmit);
    
    // Close modal saat click outside
    document.getElementById('order-modal').addEventListener('click', (e) => {
        if (e.target.id === 'order-modal') {
            hideModal();
        }
    });
    
    console.log('✅ Supervisor Mode initialized successfully');
}

// Initialize saat DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSupervisorMode);
} else {
    initSupervisorMode();
}
