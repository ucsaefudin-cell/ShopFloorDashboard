/**
 * Charts Module untuk Shop Floor Dashboard
 * Menggunakan Chart.js untuk visualisasi data produksi
 */

// Chart instances
let efficiencyChart = null;
let progressChart = null;

/**
 * Get color berdasarkan efficiency level
 * @param {number} efficiency - Persentase efisiensi
 * @returns {string} Color code
 */
function getEfficiencyColor(efficiency) {
    if (efficiency >= 90) {
        return '#22c55e'; // Green
    } else if (efficiency >= 70) {
        return '#eab308'; // Yellow
    } else {
        return '#ef4444'; // Red
    }
}

/**
 * Initialize atau update Efficiency Bar Chart
 * Menampilkan perbandingan efisiensi antar production orders
 */
function updateEfficiencyChart() {
    const ctx = document.getElementById('efficiency-chart');
    if (!ctx) return;
    
    // Ambil data dari currentOrders (global variable dari supervisor-mode.js)
    if (typeof currentOrders === 'undefined' || currentOrders.length === 0) {
        return;
    }
    
    // Prepare data - ambil max 10 orders terbaru
    const orders = currentOrders.slice(0, 10);
    const labels = orders.map(order => `${order.machine_name}\n${order.shift_name}`);
    const data = orders.map(order => order.efficiency_percent);
    const colors = data.map(eff => getEfficiencyColor(eff));
    
    // Destroy existing chart jika ada
    if (efficiencyChart) {
        efficiencyChart.destroy();
    }
    
    // Create new chart
    efficiencyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Efficiency (%)',
                data: data,
                backgroundColor: colors,
                borderColor: colors,
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return 'Efficiency: ' + context.parsed.y.toFixed(1) + '%';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 120,
                    ticks: {
                        callback: function(value) {
                            return value + '%';
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        }
    });
}

/**
 * Initialize atau update Progress Doughnut Chart
 * Menampilkan total completed vs pending vs wip
 */
function updateProgressChart() {
    const ctx = document.getElementById('progress-chart');
    if (!ctx) return;
    
    // Ambil data dari currentOrders
    if (typeof currentOrders === 'undefined' || currentOrders.length === 0) {
        return;
    }
    
    // Calculate totals
    const totalCompleted = currentOrders.reduce((sum, order) => sum + order.completed_qty, 0);
    const totalWip = currentOrders.reduce((sum, order) => sum + order.wip_qty, 0);
    const totalPending = currentOrders.reduce((sum, order) => sum + order.pending_qty, 0);
    
    // Destroy existing chart jika ada
    if (progressChart) {
        progressChart.destroy();
    }
    
    // Create new chart
    progressChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Completed', 'WIP', 'Pending'],
            datasets: [{
                data: [totalCompleted, totalWip, totalPending],
                backgroundColor: [
                    '#84cc16', // Sonoco green untuk completed
                    '#eab308', // Yellow untuk WIP
                    '#6b7280'  // Gray untuk pending
                ],
                borderWidth: 3,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return label + ': ' + value.toLocaleString('id-ID') + ' (' + percentage + '%)';
                        }
                    }
                }
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            }
        }
    });
}

/**
 * Update semua charts
 * Dipanggil dari supervisor-mode.js setelah data di-fetch
 */
function updateCharts() {
    updateEfficiencyChart();
    updateProgressChart();
}

// Export function untuk digunakan di module lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateCharts,
        updateEfficiencyChart,
        updateProgressChart
    };
}
