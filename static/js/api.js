/**
 * API Client untuk Shop Floor Dashboard
 * Menyediakan fungsi-fungsi untuk berkomunikasi dengan backend REST API
 */

const API_BASE_URL = '/api';
const REQUEST_TIMEOUT = 10000; // 10 detik
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 detik untuk retry pertama

/**
 * Utility function untuk delay (digunakan untuk retry dengan exponential backoff)
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wrapper untuk fetch dengan timeout
 */
async function fetchWithTimeout(url, options = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error('Request timeout - server tidak merespon dalam 10 detik');
        }
        throw error;
    }
}

/**
 * Wrapper untuk fetch dengan retry logic (exponential backoff)
 */
async function fetchWithRetry(url, options = {}, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetchWithTimeout(url, options);
            
            // Jika response OK, return langsung
            if (response.ok) {
                return response;
            }
            
            // Jika error 4xx (client error), jangan retry
            if (response.status >= 400 && response.status < 500) {
                return response;
            }
            
            // Jika error 5xx (server error), retry
            if (i < retries - 1) {
                const delayTime = RETRY_DELAY * Math.pow(2, i); // Exponential backoff
                console.warn(`Request gagal (attempt ${i + 1}/${retries}), retry dalam ${delayTime}ms...`);
                await delay(delayTime);
                continue;
            }
            
            return response;
            
        } catch (error) {
            // Network error, retry jika masih ada kesempatan
            if (i < retries - 1) {
                const delayTime = RETRY_DELAY * Math.pow(2, i);
                console.warn(`Network error (attempt ${i + 1}/${retries}), retry dalam ${delayTime}ms...`);
                await delay(delayTime);
                continue;
            }
            throw error;
        }
    }
}

/**
 * API Client object dengan semua method untuk berkomunikasi dengan backend
 */
const API = {
    /**
     * GET /api/machines
     * Mengambil daftar semua mesin yang aktif
     * 
     * @returns {Promise<Array>} Array of machine objects
     * @throws {Error} Jika request gagal
     */
    async fetchMachines() {
        try {
            const response = await fetchWithRetry(`${API_BASE_URL}/machines`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Gagal mengambil data mesin');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching machines:', error);
            throw error;
        }
    },

    /**
     * GET /api/production-orders
     * Mengambil daftar semua production orders dengan calculated fields
     * 
     * @param {Object} filters - Optional filters (machine_id, shift_name, order_date)
     * @returns {Promise<Array>} Array of production order objects
     * @throws {Error} Jika request gagal
     */
    async fetchProductionOrders(filters = {}) {
        try {
            // Build query string dari filters
            const queryParams = new URLSearchParams();
            if (filters.machine_id) queryParams.append('machine_id', filters.machine_id);
            if (filters.shift_name) queryParams.append('shift_name', filters.shift_name);
            if (filters.order_date) queryParams.append('order_date', filters.order_date);
            
            const queryString = queryParams.toString();
            const url = queryString 
                ? `${API_BASE_URL}/production-orders?${queryString}`
                : `${API_BASE_URL}/production-orders`;
            
            const response = await fetchWithRetry(url);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Gagal mengambil data production orders');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching production orders:', error);
            throw error;
        }
    },

    /**
     * GET /api/production-orders/{id}
     * Mengambil detail satu production order
     * 
     * @param {number} id - Production order ID
     * @returns {Promise<Object>} Production order object
     * @throws {Error} Jika request gagal atau order tidak ditemukan
     */
    async fetchProductionOrder(id) {
        try {
            const response = await fetchWithRetry(`${API_BASE_URL}/production-orders/${id}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || `Production order dengan ID ${id} tidak ditemukan`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Error fetching production order ${id}:`, error);
            throw error;
        }
    },

    /**
     * POST /api/production-orders
     * Membuat production order baru
     * 
     * @param {Object} data - Production order data
     * @param {number} data.machine_id - Machine ID
     * @param {string} data.shift_name - Shift name (Morning/Afternoon/Night)
     * @param {string} data.order_date - Order date (YYYY-MM-DD)
     * @param {number} data.target_qty - Target quantity
     * @param {number} data.completed_qty - Completed quantity
     * @param {number} data.wip_qty - Work in progress quantity
     * @returns {Promise<Object>} Created production order object
     * @throws {Error} Jika validasi gagal atau request gagal
     */
    async createProductionOrder(data) {
        try {
            const response = await fetchWithRetry(`${API_BASE_URL}/production-orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                // Jika ada validation errors, format error message
                if (result.details) {
                    const errorMessages = Object.entries(result.details)
                        .map(([field, message]) => `${field}: ${message}`)
                        .join('\n');
                    throw new Error(errorMessages);
                }
                throw new Error(result.message || 'Gagal membuat production order');
            }
            
            return result;
        } catch (error) {
            console.error('Error creating production order:', error);
            throw error;
        }
    },

    /**
     * PUT /api/production-orders/{id}
     * Update production order yang sudah ada
     * 
     * @param {number} id - Production order ID
     * @param {Object} data - Data yang akan diupdate (partial update)
     * @returns {Promise<Object>} Updated production order object
     * @throws {Error} Jika validasi gagal atau request gagal
     */
    async updateProductionOrder(id, data) {
        try {
            const response = await fetchWithRetry(`${API_BASE_URL}/production-orders/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                // Jika ada validation errors, format error message
                if (result.details) {
                    const errorMessages = Object.entries(result.details)
                        .map(([field, message]) => `${field}: ${message}`)
                        .join('\n');
                    throw new Error(errorMessages);
                }
                throw new Error(result.message || 'Gagal mengupdate production order');
            }
            
            return result;
        } catch (error) {
            console.error(`Error updating production order ${id}:`, error);
            throw error;
        }
    },

    /**
     * GET /api/health
     * Health check endpoint
     * 
     * @returns {Promise<Object>} Health status object
     */
    async healthCheck() {
        try {
            const response = await fetchWithTimeout(`${API_BASE_URL}/health`);
            
            if (!response.ok) {
                throw new Error('Health check failed');
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error checking health:', error);
            throw error;
        }
    }
};

// Export API object untuk digunakan di module lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = API;
}
