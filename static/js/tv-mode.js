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
const HANDOVER_MINUTES_BEFORE = 10; // Trigger 10 menit sebelum shift berakhir (Phase A)
const HANDOVER_MINUTES_AFTER = 10;  // Durasi 10 menit setelah shift mulai (Phase B)
const MESSAGE_ROTATION_INTERVAL = 10000; // 10 detik per pesan

// State management
let currentOrders = [];
let allOrders = []; // Simpan semua orders untuk filtering
let availableMachines = []; // List mesin yang tersedia
let selectedMachineId = 'all'; // 'all' atau machine_id spesifik
let currentMachineIndex = -1; // Index untuk prev/next navigation
let isHandoverActive = false;
let currentHandoverPhase = null; // 'A' atau 'B'
let refreshIntervalId = null;
let handoverCheckIntervalId = null;
let messageRotationIntervalId = null;
let currentMessageIndex = 0;

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
 * Mendapatkan tanggal hari ini dalam format YYYY-MM-DD
 * @returns {string} Tanggal hari ini
 */
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
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
 * Check apakah saat ini adalah waktu handover dan tentukan phase-nya
 * @returns {Object|null} { phase: 'A' atau 'B', shift: nama shift } atau null
 */
function getHandoverStatus() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;
    
    // Define shift transition times
    const transitions = [
        { hour: 6, shift: 'Morning', prevShift: 'Night' },
        { hour: 14, shift: 'Afternoon', prevShift: 'Morning' },
        { hour: 22, shift: 'Night', prevShift: 'Afternoon' }
    ];
    
    for (const transition of transitions) {
        const transitionMinutes = transition.hour * 60;
        const phaseAStart = transitionMinutes - HANDOVER_MINUTES_BEFORE;
        const phaseAEnd = transitionMinutes;
        const phaseBStart = transitionMinutes;
        const phaseBEnd = transitionMinutes + HANDOVER_MINUTES_AFTER;
        
        // Check Phase A (10 menit sebelum shift berakhir)
        if (totalMinutes >= phaseAStart && totalMinutes < phaseAEnd) {
            return {
                phase: 'A',
                shift: transition.prevShift,
                nextShift: transition.shift
            };
        }
        
        // Check Phase B (10 menit setelah shift mulai)
        if (totalMinutes >= phaseBStart && totalMinutes < phaseBEnd) {
            return {
                phase: 'B',
                shift: transition.shift,
                prevShift: transition.prevShift
            };
        }
    }
    
    // Special case untuk Night shift (melewati midnight)
    // Phase A: 21:50 - 22:00 (10 menit sebelum 22:00)
    if (hour === 21 && minute >= 50) {
        return {
            phase: 'A',
            shift: 'Afternoon',
            nextShift: 'Night'
        };
    }
    
    // Phase B untuk Night: 22:00 - 22:10
    if (hour === 22 && minute < 10) {
        return {
            phase: 'B',
            shift: 'Night',
            prevShift: 'Afternoon'
        };
    }
    
    // Phase A untuk Morning: 05:50 - 06:00
    if (hour === 5 && minute >= 50) {
        return {
            phase: 'A',
            shift: 'Night',
            nextShift: 'Morning'
        };
    }
    
    // Phase B untuk Morning: 06:00 - 06:10
    if (hour === 6 && minute < 10) {
        return {
            phase: 'B',
            shift: 'Morning',
            prevShift: 'Night'
        };
    }
    
    return null;
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
 * Render satu production order card (Horizontal Layout untuk TV Display)
 * Layout: 2 kolom (Info Kiri + Efficiency Kanan) + KPI Grid Horizontal di bawah
 * @param {Object} order - Production order object
 * @returns {string} HTML string untuk single large card dengan horizontal layout
 */
function renderSingleOrderCard(order) {
    const efficiencyColor = getEfficiencyColor(order.efficiency_percent);
    
    return `
        <div class="single-card bg-white/10 backdrop-blur-lg rounded-3xl p-6 border-4 border-sonoco-green/50 shadow-2xl">
            <!-- Top Section: 2 Kolom Horizontal (Info Kiri + Efficiency Kanan) -->
            <div class="card-top-section">
                <!-- LEFT COLUMN: Machine Info (Compact) -->
                <div class="card-left-info">
                    <h2 class="tv-machine-name font-bold text-white">${order.machine_name}</h2>
                    <p class="tv-shift-name text-sonoco-green font-semibold">Shift ${order.shift_name}</p>
                    <p class="tv-date text-gray-300">${order.order_date}</p>
                    <p class="tv-order-info text-gray-400">Order #${order.id} | Created: ${new Date(order.created_at).toLocaleString('id-ID')}</p>
                </div>
                
                <!-- RIGHT COLUMN: Efficiency Badge (Dominant) -->
                <div class="card-right-efficiency">
                    <div class="${efficiencyColor} rounded-2xl tv-efficiency-badge text-center">
                        <div class="font-bold">${order.efficiency_percent.toFixed(1)}%</div>
                        <div class="tv-efficiency-label">Efficiency</div>
                    </div>
                </div>
            </div>
            
            <!-- Bottom Section: KPI Grid (4 Kolom Horizontal) -->
            <div class="kpi-grid">
                <div class="kpi-box bg-black/30">
                    <div class="kpi-label text-gray-400">Target</div>
                    <div class="kpi-value text-white">${order.target_qty.toLocaleString('id-ID')}</div>
                </div>
                <div class="kpi-box bg-black/30">
                    <div class="kpi-label text-gray-400">Completed</div>
                    <div class="kpi-value text-sonoco-green">${order.completed_qty.toLocaleString('id-ID')}</div>
                </div>
                <div class="kpi-box bg-black/30">
                    <div class="kpi-label text-gray-400">WIP</div>
                    <div class="kpi-value text-yellow-400">${order.wip_qty.toLocaleString('id-ID')}</div>
                </div>
                <div class="kpi-box bg-black/30">
                    <div class="kpi-label text-gray-400">Pending</div>
                    <div class="kpi-value text-gray-300">${order.pending_qty.toLocaleString('id-ID')}</div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render production order ke display
 * REAL-TIME LOGIC: Hanya tampilkan 1 order yang aktif untuk shift dan tanggal saat ini
 */
function renderOrders() {
    const loadingEl = document.getElementById('loading');
    const singleCardContainer = document.getElementById('single-card-container');
    const emptyEl = document.getElementById('empty-state');
    const emptyInfoEl = document.getElementById('empty-state-info');
    
    // Hide loading
    loadingEl.classList.add('hidden');
    
    // Get current shift dan today's date
    const currentShift = getCurrentShift();
    const todayDate = getTodayDate();
    
    // Filter orders: hanya yang sesuai shift saat ini dan tanggal hari ini
    const activeOrders = currentOrders.filter(order => {
        return order.shift_name === currentShift && order.order_date === todayDate;
    });
    
    if (activeOrders.length === 0) {
        // Show empty state
        singleCardContainer.classList.add('hidden');
        emptyEl.classList.remove('hidden');
        
        // Update empty state info
        const machineName = selectedMachineId === 'all' 
            ? 'semua mesin' 
            : availableMachines.find(m => m.id === parseInt(selectedMachineId))?.name || 'mesin terpilih';
        
        emptyInfoEl.textContent = `${machineName} | Shift ${currentShift} | ${todayDate}`;
        
    } else {
        // Show single card (ambil order pertama jika ada multiple)
        // Dalam real scenario, seharusnya hanya ada 1 order per machine per shift per date
        const activeOrder = activeOrders[0];
        
        emptyEl.classList.add('hidden');
        singleCardContainer.classList.remove('hidden');
        
        // Render single large card
        singleCardContainer.innerHTML = renderSingleOrderCard(activeOrder);
    }
    
    // Update last update time
    const now = new Date().toLocaleTimeString('id-ID');
    document.getElementById('last-update').textContent = now;
    
    console.log(`✓ Display updated: ${activeOrders.length} active order(s) for ${currentShift} shift on ${todayDate}`);
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
        // Tampilkan error state dengan viewport units
        document.getElementById('loading').innerHTML = `
            <div class="text-center">
                <div class="loading-icon">⚠️</div>
                <p class="loading-text text-white mb-4">Gagal memuat data</p>
                <p class="text-gray-400" style="font-size: 2vh;">${error.message}</p>
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
 * Generate messages untuk Phase A (Shift berakhir)
 * @param {string} shiftName - Nama shift yang berakhir
 * @param {Object} stats - Statistik shift
 * @returns {Array} Array of message objects
 */
function generatePhaseAMessages(shiftName, stats) {
    return [
        {
            type: 'summary',
            html: `
                <div class="carousel-message message-summary">
                    <h3 class="message-title text-sonoco-green font-bold">Ringkasan Produksi Shift ${shiftName}</h3>
                    <div class="message-stats-grid">
                        <div class="message-stat-item">
                            <div class="message-stat-label text-gray-400">Total Orders</div>
                            <div class="message-stat-value text-white">${stats.totalOrders}</div>
                        </div>
                        <div class="message-stat-item">
                            <div class="message-stat-label text-gray-400">Avg Efficiency</div>
                            <div class="message-stat-value text-sonoco-green">${stats.avgEfficiency}%</div>
                        </div>
                        <div class="message-stat-item">
                            <div class="message-stat-label text-gray-400">Total Target</div>
                            <div class="message-stat-value text-white">${stats.totalTarget.toLocaleString('id-ID')}</div>
                        </div>
                        <div class="message-stat-item">
                            <div class="message-stat-label text-gray-400">Total Completed</div>
                            <div class="message-stat-value text-sonoco-green">${stats.totalCompleted.toLocaleString('id-ID')}</div>
                        </div>
                    </div>
                    <p class="message-subtitle text-white font-semibold">Terima kasih atas kerja keras Anda! 💪</p>
                </div>
            `
        },
        {
            type: 'kaizen',
            html: `
                <div class="carousel-message">
                    <div class="handover-icon">🧹</div>
                    <h3 class="message-title text-white font-bold">Kaizen & 5S</h3>
                    <p class="message-text text-gray-300">
                        Pastikan area kerja dirapikan kembali (5S/Kaizen)<br>
                        & Sampah produksi dibuang dengan benar
                    </p>
                </div>
            `
        },
        {
            type: 'safety',
            html: `
                <div class="carousel-message">
                    <div class="handover-icon">🔧</div>
                    <h3 class="message-title text-white font-bold">Safety Check</h3>
                    <p class="message-text text-gray-300">
                        Cek kembali alat kerja dan pastikan<br>
                        mesin aman untuk regu berikutnya
                    </p>
                </div>
            `
        }
    ];
}

/**
 * Generate messages untuk Phase B (Shift baru dimulai)
 * @param {string} shiftName - Nama shift yang baru dimulai
 * @returns {Array} Array of message objects
 */
function generatePhaseBMessages(shiftName) {
    return [
        {
            type: 'welcome',
            html: `
                <div class="carousel-message">
                    <div class="handover-icon">🎉</div>
                    <h3 class="message-title text-sonoco-green font-bold">Selamat Datang Shift ${shiftName}!</h3>
                    <p class="message-text text-white">
                        Mari kita capai target produksi hari ini! 💪
                    </p>
                </div>
            `
        },
        {
            type: 'apd',
            html: `
                <div class="carousel-message">
                    <div class="handover-icon">🦺</div>
                    <h3 class="message-title text-white font-bold">Safety APD</h3>
                    <p class="message-text text-gray-300">
                        Gunakan APD lengkap<br>
                        sebelum memulai bekerja
                    </p>
                </div>
            `
        },
        {
            type: 'safety-first',
            html: `
                <div class="carousel-message">
                    <div class="handover-icon">⚠️</div>
                    <h3 class="message-title text-white font-bold">Safety First</h3>
                    <p class="message-text text-gray-300">
                        Utamakan Keselamatan Kerja<br>
                        Target tercapai, pulang dengan selamat!
                    </p>
                </div>
            `
        }
    ];
}

/**
 * Rotate ke message berikutnya dalam carousel
 */
function rotateMessage() {
    const carousel = document.getElementById('message-carousel');
    const indicators = document.getElementById('carousel-indicators');
    const messages = carousel.querySelectorAll('.carousel-message');
    const dots = indicators.querySelectorAll('.carousel-dot');
    
    if (messages.length === 0) return;
    
    // Hide current message
    messages[currentMessageIndex].classList.remove('active');
    dots[currentMessageIndex].classList.remove('active');
    
    // Move to next message (loop)
    currentMessageIndex = (currentMessageIndex + 1) % messages.length;
    
    // Show next message
    messages[currentMessageIndex].classList.add('active');
    dots[currentMessageIndex].classList.add('active');
}

/**
 * Start message rotation
 */
function startMessageRotation() {
    // Stop existing rotation if any
    if (messageRotationIntervalId) {
        clearInterval(messageRotationIntervalId);
    }
    
    // Reset to first message
    currentMessageIndex = 0;
    const carousel = document.getElementById('message-carousel');
    const indicators = document.getElementById('carousel-indicators');
    const messages = carousel.querySelectorAll('.carousel-message');
    const dots = indicators.querySelectorAll('.carousel-dot');
    
    if (messages.length > 0) {
        messages[0].classList.add('active');
        dots[0].classList.add('active');
    }
    
    // Start rotation every 10 seconds
    messageRotationIntervalId = setInterval(rotateMessage, MESSAGE_ROTATION_INTERVAL);
    console.log('✓ Message rotation started (10s interval)');
}

/**
 * Stop message rotation
 */
function stopMessageRotation() {
    if (messageRotationIntervalId) {
        clearInterval(messageRotationIntervalId);
        messageRotationIntervalId = null;
        console.log('✓ Message rotation stopped');
    }
}

/**
 * Hitung statistik shift untuk handover summary
 * @param {string} shiftName - Nama shift
 * @returns {Object} Statistik shift
 */
function calculateShiftStats(shiftName) {
    const shiftOrders = allOrders.filter(order => order.shift_name === shiftName);
    
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
 * Show shift handover overlay dengan phase tertentu
 * @param {string} phase - 'A' atau 'B'
 * @param {string} shift - Nama shift
 * @param {string} otherShift - Shift lainnya (nextShift untuk Phase A, prevShift untuk Phase B)
 */
function showHandoverOverlay(phase = 'A', shift = null, otherShift = null) {
    if (isHandoverActive && currentHandoverPhase === phase) return; // Sudah aktif dengan phase yang sama
    
    isHandoverActive = true;
    currentHandoverPhase = phase;
    
    // Determine shifts
    const currentShift = shift || getCurrentShift();
    const nextShift = otherShift || getNextShift(currentShift);
    
    const overlay = document.getElementById('handover-overlay');
    const iconEl = document.getElementById('handover-icon');
    const titleEl = document.getElementById('handover-title');
    const phaseEl = document.getElementById('handover-phase');
    const carousel = document.getElementById('message-carousel');
    const indicators = document.getElementById('carousel-indicators');
    
    let messages = [];
    
    if (phase === 'A') {
        // Phase A: Shift berakhir
        const stats = calculateShiftStats(currentShift);
        messages = generatePhaseAMessages(currentShift, stats);
        
        iconEl.textContent = '👋';
        titleEl.textContent = `Shift ${currentShift} Berakhir`;
        phaseEl.textContent = `Phase A: Persiapan Handover ke Shift ${nextShift}`;
        
    } else {
        // Phase B: Shift baru dimulai
        messages = generatePhaseBMessages(currentShift);
        
        iconEl.textContent = '🎉';
        titleEl.textContent = `Shift ${currentShift} Dimulai`;
        phaseEl.textContent = `Phase B: Selamat Datang!`;
    }
    
    // Render messages
    carousel.innerHTML = messages.map(msg => msg.html).join('');
    
    // Render indicators
    indicators.innerHTML = messages.map((_, index) => 
        `<div class="carousel-dot ${index === 0 ? 'active' : ''}"></div>`
    ).join('');
    
    // Show overlay
    overlay.classList.add('active');
    
    // Start message rotation
    startMessageRotation();
    
    console.log(`🎉 Shift handover Phase ${phase}: ${currentShift} ${phase === 'A' ? '→' : '←'} ${nextShift}`);
}

/**
 * Hide shift handover overlay
 */
function hideHandoverOverlay() {
    const overlay = document.getElementById('handover-overlay');
    overlay.classList.remove('active');
    isHandoverActive = false;
    currentHandoverPhase = null;
    stopMessageRotation();
    console.log('✓ Handover overlay hidden');
}

/**
 * Check handover status dan show/hide overlay dengan automatic phase transition
 */
function checkHandover() {
    const handoverStatus = getHandoverStatus();
    
    if (handoverStatus) {
        // Ada handover aktif
        if (!isHandoverActive || currentHandoverPhase !== handoverStatus.phase) {
            // Show atau update phase
            if (handoverStatus.phase === 'A') {
                showHandoverOverlay('A', handoverStatus.shift, handoverStatus.nextShift);
            } else {
                showHandoverOverlay('B', handoverStatus.shift, handoverStatus.prevShift);
            }
        }
    } else {
        // Tidak ada handover, hide jika sedang aktif
        if (isHandoverActive) {
            hideHandoverOverlay();
        }
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
    
    // Setup event listener untuk Test Handover button
    document.getElementById('btn-test-handover').addEventListener('click', () => {
        console.log('🧪 Test Handover button clicked - Starting simulation');
        
        const currentShift = getCurrentShift();
        const nextShift = getNextShift(currentShift);
        
        // Phase A: 10 detik (3 messages × 10 detik = 30 detik total, tapi kita paksa 10 detik untuk testing)
        showHandoverOverlay('A', currentShift, nextShift);
        
        // Setelah 10 detik, otomatis pindah ke Phase B
        setTimeout(() => {
            console.log('🧪 Transitioning to Phase B');
            showHandoverOverlay('B', nextShift, currentShift);
            
            // Setelah 10 detik lagi, hide overlay
            setTimeout(() => {
                console.log('🧪 Test simulation complete');
                hideHandoverOverlay();
            }, 10000);
        }, 10000);
    });
    console.log('✓ Test Handover button initialized');
    
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
    if (messageRotationIntervalId) clearInterval(messageRotationIntervalId);
});
