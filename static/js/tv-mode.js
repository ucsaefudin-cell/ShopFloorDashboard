/**
 * TV Mode untuk Shop Floor Dashboard
 * Zero-touch display dengan auto-refresh, shift handover event, dan machine filtering
 */

// Konstanta konfigurasi
const REFRESH_INTERVAL = 30000; // 30 detik
const SHIFT_TIMES = {
    Morning: { start: 6, end: 14 },      // 6 AM - 2 PM
    Afternoon: { start: 14, end: 22 },   // 2 PM - 10 PM
    Night: { start: 22, end: 6 }         // 10 PM - 6 AM (next day)
};
const HANDOVER_MINUTES_BEFORE = 15; // Trigger 15 menit sebelum shift berakhir

// State management
let currentOrders = [];
let allOrders = []; // Simpan semua orders untuk filtering
let availableMachines = []; // List mesin yang tersedia
let selectedMachineId = 'all'; // 'all' atau machine_id spesifik
let currentMachineIndex = -1; // Index untuk prev/next navigation
let isHandoverActive = false;
let refreshIntervalId = null;
let handoverCheckIntervalId = null;

/**
 * Mendapatkan shift saat ini berdasarkan jam
 * @returns {string} Nama shift (Morning/Afternoon/Night)
 */
function getCurrentShift() {
    const hour = new Date().getHours();
    
    if (hour >= SHIFT_TIMES.Morning.start && hour < SHIFT_TIMES.Morning.end) {
        return 'Morning';
    } else if (hour >= SHIFT_TIMES.Afternoon.start && hour < SHIFT_TIMES.Afternoon.end) {
        return 'Afternoon';
    } else {
        return 'Night';
    }
}

/**
 * Mendapatkan shift berikutnya
 * @param {string} currentShift - Shift saat ini
 * @returns {string} Shift berikutnya
 */
function getNextShift(currentShift) {
    const shifts = ['Morning', 'Afternoon', 'Night'];
    const currentIndex = shifts.indexOf(currentShift);
    return shifts[(currentIndex + 1) % 3];
}

/**
 * Check apakah saat ini adalah waktu handover (15 menit sebelum shift berakhir)
 * @returns {boolean} True jika dalam window handover
 */
function isHandoverTime() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;
    
    // Hitung waktu handover untuk setiap shift
    const handoverTimes = [
        { shift: 'Morning', time: (SHIFT_TIMES.Morning.end * 60) - HANDOVER_MINUTES_BEFORE },    // 1:45 PM
        { shift: 'Afternoon', time: (SHIFT_TIMES.Afternoon.end * 60) - HANDOVER_MINUTES_BEFORE }, // 9:45 PM
        { shift: 'Night', time: (SHIFT_TIMES.Night.start * 60) - HANDOVER_MINUTES_BEFORE }        // 5:45 AM (next day)
    ];
    
    // Check untuk Night shift (special case karena melewati midnight)
    if (hour >= 5 && hour < 6) {
        const nightHandoverStart = (6 * 60) - HANDOVER_MINUTES_BEFORE; // 5:45 AM
        if (totalMinutes >= nightHandoverStart && totalMinutes < 6 * 60) {
            return true;
        }
    }
    
    // Check untuk Morning dan Afternoon shift
    for (const handover of handoverTimes) {
        const handoverStart = handover.time;
        const handoverEnd = handover.time + HANDOVER_MINUTES_BEFORE;
        
        if (totalMinutes >= handoverStart && totalMinutes < handoverEnd) {
            return true;
        }
    }
    
    return false;
}

/**
 * Update clock dan shift display di header
 */
function updateClock() {
    const now = new Date();
    
    // Format waktu
    const timeString = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    // Format tanggal
    const dateString = now.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Update DOM
    document.getElementById('current-time').textContent = timeString;
    document.getElementById('current-date').textContent = dateString;
    document.getElementById('current-shift').textContent = `Shift: ${getCurrentShift()}`;
}

/**
 * Mendapatkan warna badge berdasarkan efficiency
 * @param {number} efficiency - Persentase efisiensi
 * @returns {string} Tailwind CSS classes untuk warna
 */
function getEfficiencyColor(efficiency) {
    if (efficiency >= 90) {
        return 'bg-green-500 text-white';
    } else if (efficiency >= 70) {
        return 'bg-yellow-500 text-white';
    } else {
        return 'bg-red-500 text-white';
    }
}

/**
 * Render satu production order card
 * @param {Object} order - Production order object
 * @returns {string} HTML string untuk card
 */
function renderOrderCard(order) {
    const efficiencyColor = getEfficiencyColor(order.efficiency_percent);
    
    return `
        <div class="bg-white/10 backdrop-blur-lg rounded-xl p-6 border-2 border-sonoco-green/30 hover:border-sonoco-green transition-all">
            <!-- Header -->
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h3 class="text-2xl font-bold text-white">${order.machine_name}</h3>
                    <p class="text-sonoco-green text-lg">${order.shift_name} Shift</p>
                </div>
                <div class="text-right">
                    <div class="text-gray-400 text-sm">Order #${order.id}</div>
                    <div class="text-gray-300 text-sm">${order.order_date}</div>
                </div>
            </div>
            
            <!-- Efficiency Badge -->
            <div class="mb-6">
                <div class="inline-block ${efficiencyColor} px-6 py-3 rounded-lg">
                    <div class="text-4xl font-bold">${order.efficiency_percent.toFixed(1)}%</div>
                    <div class="text-sm">Efficiency</div>
                </div>
            </div>
            
            <!-- Quantities Grid -->
            <div class="grid grid-cols-2 gap-4">
                <div class="bg-black/20 rounded-lg p-4">
                    <div class="text-gray-400 text-sm mb-1">Target</div>
                    <div class="text-3xl font-bold text-white">${order.target_qty}</div>
                </div>
                <div class="bg-black/20 rounded-lg p-4">
                    <div class="text-gray-400 text-sm mb-1">Completed</div>
                    <div class="text-3xl font-bold text-sonoco-green">${order.completed_qty}</div>
                </div>
                <div class="bg-black/20 rounded-lg p-4">
                    <div class="text-gray-400 text-sm mb-1">WIP</div>
                    <div class="text-3xl font-bold text-yellow-400">${order.wip_qty}</div>
                </div>
                <div class="bg-black/20 rounded-lg p-4">
                    <div class="text-gray-400 text-sm mb-1">Pending</div>
                    <div class="text-3xl font-bold text-gray-300">${order.pending_qty}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render semua production orders ke grid
 */
function renderOrders() {
    const loadingEl = document.getElementById('loading');
    const gridEl = document.getElementById('orders-grid');
    const emptyEl = document.getElementById('empty-state');
    
    // Hide loading
    loadingEl.classList.add('hidden');
    
    if (currentOrders.length === 0) {
        // Show empty state
        gridEl.classList.add('hidden');
        emptyEl.classList.remove('hidden');
    } else {
        // Show grid dengan orders
        emptyEl.classList.add('hidden');
        gridEl.classList.remove('hidden');
        
        // Render cards
        gridEl.innerHTML = currentOrders.map(order => renderOrderCard(order)).join('');
    }
    
    // Update last update time
    const now = new Date().toLocaleTimeString('id-ID');
    document.getElementById('last-update').textContent = now;
}

/**
 * Fetch production orders dari API
 */
async function fetchOrders() {
    try {
        const orders = await API.fetchProductionOrders();
        allOrders = orders; // Simpan semua orders
        
        // Extract unique machines dari orders
        const machineMap = new Map();
        orders.forEach(order => {
            if (!machineMap.has(order.machine_id)) {
                machineMap.set(order.machine_id, {
                    id: order.machine_id,
                    name: order.machine_name
                });
            }
        });
        availableMachines = Array.from(machineMap.values());
        
        // Populate machine filter dropdown
        populateMachineFilter();
        
        // Apply filter
        applyMachineFilter();
        
    } catch (error) {
        console.error('Error fetching orders:', error);
        // Tampilkan error state
        document.getElementById('loading').innerHTML = `
            <div class="text-center py-20">
                <div class="text-6xl mb-4">⚠️</div>
                <p class="text-2xl text-white mb-4">Gagal memuat data</p>
                <p class="text-lg text-gray-400">${error.message}</p>
            </div>
        `;
    }
}

/**
 * Populate machine filter dropdown dengan available machines
 */
function populateMachineFilter() {
    const filterSelect = document.getElementById('machine-filter');
    
    // Clear existing options (kecuali "Semua Mesin")
    filterSelect.innerHTML = '<option value="all">Semua Mesin</option>';
    
    // Add machine options
    availableMachines.forEach(machine => {
        const option = document.createElement('option');
        option.value = machine.id;
        option.textContent = machine.name;
        filterSelect.appendChild(option);
    });
    
    // Set selected value
    filterSelect.value = selectedMachineId;
}

/**
 * Apply machine filter ke orders
 */
function applyMachineFilter() {
    if (selectedMachineId === 'all') {
        // Show all orders
        currentOrders = allOrders;
    } else {
        // Filter by selected machine
        currentOrders = allOrders.filter(order => order.machine_id === parseInt(selectedMachineId));
    }
    
    renderOrders();
}

/**
 * Handle machine filter change
 */
function handleMachineFilterChange(event) {
    selectedMachineId = event.target.value;
    
    // Update current machine index untuk prev/next navigation
    if (selectedMachineId === 'all') {
        currentMachineIndex = -1;
    } else {
        currentMachineIndex = availableMachines.findIndex(m => m.id === parseInt(selectedMachineId));
    }
    
    applyMachineFilter();
}

/**
 * Navigate ke machine sebelumnya
 */
function navigateToPrevMachine() {
    if (availableMachines.length === 0) return;
    
    if (currentMachineIndex === -1) {
        // Dari "all", pindah ke machine terakhir
        currentMachineIndex = availableMachines.length - 1;
    } else {
        // Pindah ke machine sebelumnya (circular)
        currentMachineIndex = (currentMachineIndex - 1 + availableMachines.length) % availableMachines.length;
    }
    
    selectedMachineId = availableMachines[currentMachineIndex].id.toString();
    document.getElementById('machine-filter').value = selectedMachineId;
    applyMachineFilter();
}

/**
 * Navigate ke machine berikutnya
 */
function navigateToNextMachine() {
    if (availableMachines.length === 0) return;
    
    if (currentMachineIndex === -1) {
        // Dari "all", pindah ke machine pertama
        currentMachineIndex = 0;
    } else {
        // Pindah ke machine berikutnya (circular)
        currentMachineIndex = (currentMachineIndex + 1) % availableMachines.length;
    }
    
    selectedMachineId = availableMachines[currentMachineIndex].id.toString();
    document.getElementById('machine-filter').value = selectedMachineId;
    applyMachineFilter();
}

/**
 * Hitung statistik shift untuk handover summary
 * @param {string} shiftName - Nama shift
 * @returns {Object} Statistik shift
 */
function calculateShiftStats(shiftName) {
    const shiftOrders = currentOrders.filter(order => order.shift_name === shiftName);
    
    if (shiftOrders.length === 0) {
        return {
            totalOrders: 0,
            totalTarget: 0,
            totalCompleted: 0,
            avgEfficiency: 0
        };
    }
    
    const totalTarget = shiftOrders.reduce((sum, order) => sum + order.target_qty, 0);
    const totalCompleted = shiftOrders.reduce((sum, order) => sum + order.completed_qty, 0);
    const avgEfficiency = shiftOrders.reduce((sum, order) => sum + order.efficiency_percent, 0) / shiftOrders.length;
    
    return {
        totalOrders: shiftOrders.length,
        totalTarget,
        totalCompleted,
        avgEfficiency: avgEfficiency.toFixed(1)
    };
}

/**
 * Show shift handover overlay
 */
function showHandoverOverlay() {
    if (isHandoverActive) return; // Sudah aktif, skip
    
    isHandoverActive = true;
    const currentShift = getCurrentShift();
    const nextShift = getNextShift(currentShift);
    const stats = calculateShiftStats(currentShift);
    
    const overlay = document.getElementById('handover-overlay');
    const content = document.getElementById('handover-content');
    
    // Generate handover content
    content.innerHTML = `
        <div class="mb-8">
            <p class="text-5xl font-bold text-sonoco-green mb-4">Shift ${currentShift} Berakhir</p>
            <p class="text-2xl text-gray-400">Terima kasih atas kerja keras Anda!</p>
        </div>
        
        <div class="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
            <h3 class="text-4xl font-bold text-white mb-6">Ringkasan Produksi</h3>
            <div class="grid grid-cols-2 gap-6 text-left">
                <div>
                    <div class="text-gray-400 text-xl mb-2">Total Orders</div>
                    <div class="text-5xl font-bold text-white">${stats.totalOrders}</div>
                </div>
                <div>
                    <div class="text-gray-400 text-xl mb-2">Avg Efficiency</div>
                    <div class="text-5xl font-bold text-sonoco-green">${stats.avgEfficiency}%</div>
                </div>
                <div>
                    <div class="text-gray-400 text-xl mb-2">Total Target</div>
                    <div class="text-5xl font-bold text-white">${stats.totalTarget}</div>
                </div>
                <div>
                    <div class="text-gray-400 text-xl mb-2">Total Completed</div>
                    <div class="text-5xl font-bold text-sonoco-green">${stats.totalCompleted}</div>
                </div>
            </div>
        </div>
        
        <div class="mb-8">
            <p class="text-4xl font-bold text-white mb-4">Selamat Datang</p>
            <p class="text-5xl font-bold text-sonoco-green">Shift ${nextShift}!</p>
            <p class="text-2xl text-gray-400 mt-4">Mari kita capai target produksi hari ini 💪</p>
        </div>
    `;
    
    // Show overlay
    overlay.classList.add('active');
    
    console.log(`🎉 Shift handover: ${currentShift} → ${nextShift}`);
}

/**
 * Hide shift handover overlay
 */
function hideHandoverOverlay() {
    const overlay = document.getElementById('handover-overlay');
    overlay.classList.remove('active');
    isHandoverActive = false;
    console.log('✓ Handover overlay hidden');
}

/**
 * Check handover status dan show/hide overlay
 */
function checkHandover() {
    const shouldShowHandover = isHandoverTime();
    
    if (shouldShowHandover && !isHandoverActive) {
        showHandoverOverlay();
    } else if (!shouldShowHandover && isHandoverActive) {
        hideHandoverOverlay();
    }
}

/**
 * Initialize TV Mode
 */
async function initTVMode() {
    console.log('🚀 Initializing TV Mode...');
    
    // Update clock setiap detik
    updateClock();
    setInterval(updateClock, 1000);
    
    // Initial fetch
    await fetchOrders();
    
    // Setup auto-refresh setiap 30 detik
    refreshIntervalId = setInterval(fetchOrders, REFRESH_INTERVAL);
    console.log(`✓ Auto-refresh enabled (${REFRESH_INTERVAL / 1000}s interval)`);
    
    // Setup handover check setiap 1 menit
    handoverCheckIntervalId = setInterval(checkHandover, 60000);
    checkHandover(); // Check immediately
    console.log('✓ Shift handover checker enabled');
    
    // Setup event listeners untuk machine filter
    document.getElementById('machine-filter').addEventListener('change', handleMachineFilterChange);
    document.getElementById('btn-prev-machine').addEventListener('click', navigateToPrevMachine);
    document.getElementById('btn-next-machine').addEventListener('click', navigateToNextMachine);
    console.log('✓ Machine filter controls initialized');
    
    console.log('✅ TV Mode initialized successfully');
}

// Initialize saat DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTVMode);
} else {
    initTVMode();
}

// Cleanup saat page unload
window.addEventListener('beforeunload', () => {
    if (refreshIntervalId) clearInterval(refreshIntervalId);
    if (handoverCheckIntervalId) clearInterval(handoverCheckIntervalId);
});
