/**
 * Theme Switcher untuk Shop Floor Dashboard
 * Mengatur tema dark/light berdasarkan waktu (day/night cycle)
 */

/**
 * Konstanta untuk jam transisi tema
 */
const THEME_CONFIG = {
    NIGHT_START: 18,  // 6 PM - mulai dark theme
    NIGHT_END: 6,     // 6 AM - mulai light theme
};

/**
 * Mendapatkan jam saat ini (0-23)
 * @returns {number} Jam saat ini
 */
function getCurrentHour() {
    return new Date().getHours();
}

/**
 * Menentukan apakah saat ini adalah waktu malam (dark theme)
 * Dark theme: 18:00 - 05:59 (6 PM - 6 AM)
 * Light theme: 06:00 - 17:59 (6 AM - 6 PM)
 * 
 * @returns {boolean} True jika dark theme, false jika light theme
 */
function isDarkTime() {
    const hour = getCurrentHour();
    return hour >= THEME_CONFIG.NIGHT_START || hour < THEME_CONFIG.NIGHT_END;
}

/**
 * Apply tema ke HTML element
 * Menambahkan atau menghapus class 'dark' pada root element
 */
function applyTheme() {
    const isDark = isDarkTime();
    const htmlElement = document.documentElement;
    
    if (isDark) {
        htmlElement.classList.add('dark');
        console.log('🌙 Dark theme applied (Night mode)');
    } else {
        htmlElement.classList.remove('dark');
        console.log('☀️ Light theme applied (Day mode)');
    }
    
    return isDark;
}

/**
 * Mendapatkan nama tema saat ini
 * @returns {string} 'dark' atau 'light'
 */
function getCurrentTheme() {
    return isDarkTime() ? 'dark' : 'light';
}

/**
 * Mendapatkan waktu hingga tema berikutnya berubah
 * @returns {Object} Object dengan hours dan minutes
 */
function getTimeUntilNextThemeChange() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    let targetHour;
    if (currentHour >= THEME_CONFIG.NIGHT_START || currentHour < THEME_CONFIG.NIGHT_END) {
        // Saat ini dark theme, next change ke light theme di jam 6 AM
        targetHour = THEME_CONFIG.NIGHT_END;
    } else {
        // Saat ini light theme, next change ke dark theme di jam 6 PM
        targetHour = THEME_CONFIG.NIGHT_START;
    }
    
    // Hitung selisih waktu
    let hoursDiff = targetHour - currentHour;
    let minutesDiff = -currentMinute;
    
    if (hoursDiff < 0) {
        hoursDiff += 24;
    }
    
    if (minutesDiff < 0) {
        minutesDiff += 60;
        hoursDiff -= 1;
    }
    
    return {
        hours: hoursDiff,
        minutes: minutesDiff
    };
}

/**
 * Setup auto theme checking
 * Check setiap menit untuk memastikan tema selalu sesuai dengan waktu
 */
function setupAutoThemeCheck() {
    // Apply tema saat pertama kali load
    applyTheme();
    
    // Check setiap 1 menit
    setInterval(() => {
        applyTheme();
    }, 60000); // 60 detik
    
    console.log('✓ Auto theme checker initialized');
}

/**
 * Initialize theme switcher saat DOM ready
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAutoThemeCheck);
} else {
    setupAutoThemeCheck();
}

// Export functions untuk digunakan di module lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        applyTheme,
        getCurrentTheme,
        isDarkTime,
        getCurrentHour,
        getTimeUntilNextThemeChange,
        THEME_CONFIG
    };
}
