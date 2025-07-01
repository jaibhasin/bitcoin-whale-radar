// Global variables
let isLoading = false;
let volumeChart = null;
let chartData = [];
let currentPeriod = '1y';

// DOM elements
const chartPeriodButtons = document.querySelectorAll('.btn-chart');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners for chart period buttons
    chartPeriodButtons.forEach(button => {
        button.addEventListener('click', function() {
            const period = this.getAttribute('data-period');
            setChartPeriod(period);
        });
    });

    // Initial data fetch
    fetchData();

    // Set up auto-refresh every 2 minutes
    setInterval(fetchData, 120000);
});

/**
 * Fetch all Bitcoin data from the API
 */
async function fetchData() {
    if (isLoading) return;
    isLoading = true;

    // Show loading states
    showLoading('transactions-container', 'transactions-loading');
    showLoading('rich-list-container', 'wallets-loading');
    document.getElementById('btc-price').textContent = 'Loading...';

    try {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('Failed to fetch data');
        
        const data = await response.json();
        
        // Update Bitcoin price
        updateBitcoinPrice(data.current_btc_price);
        
        // Update Bitcoin stats
        updateBitcoinStats();
        
        // Update transaction volume chart
        updateVolumeChart(data.historical_volume);
        
        // Update largest transactions
        updateTransactions(data.transactions);
        
        // Update rich list
        updateRichList(data.rich_list);
        
    } catch (error) {
        console.error('Failed to fetch data:', error);
        showError('transactions-container', 'transactions-loading', 'Failed to load transaction data');
        showError('rich-list-container', 'wallets-loading', 'Failed to load wallet data');
        document.getElementById('btc-price').textContent = 'Error loading price';
    } finally {
        isLoading = false;
    }
}

/**
 * Update Bitcoin price display
 */
function updateBitcoinPrice(price) {
    document.getElementById('btc-price').textContent = `$${price}`;
    document.getElementById('price-updated').textContent = `Last updated: ${formatDateTime(new Date())}`;
}

/**
 * Update Bitcoin network stats
 * This uses hardcoded values for now, but could be updated to use real API data
 */
function updateBitcoinStats() {
    document.getElementById('market-cap').textContent = '$1.2T';
    document.getElementById('volume').textContent = '$32.5B';
    document.getElementById('dominance').textContent = '52.3%';
    document.getElementById('supply').textContent = '19.5M BTC';
}

/**
 * Update the volume chart with historical data
 */
function updateVolumeChart(data) {
    if (!data || data.length === 0) {
        showError('volumeChart', 'chart-loading', 'No historical volume data available');
        return;
    }

    // Store the full chart data
    chartData = data.map(item => ({
        x: new Date(item.x * 1000),
        y: item.y
    }));

    // Initialize or update chart
    initVolumeChart();
    
    // Show chart and hide loading
    document.getElementById('chart-loading').style.display = 'none';
    document.getElementById('volumeChart').style.display = 'block';
}

/**
 * Initialize or update the volume chart
 */
function initVolumeChart() {
    // Filter data based on selected period
    const filteredData = filterChartDataByPeriod(chartData, currentPeriod);
    
    // If chart already exists, destroy it
    if (volumeChart) {
        volumeChart.destroy();
    }

    // Create new chart
    const ctx = document.getElementById('volumeChart').getContext('2d');
    volumeChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Transaction Volume (USD)',
                data: filteredData,
                borderColor: '#f7931a',
                backgroundColor: 'rgba(247, 147, 26, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: '#f7931a'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            animation: {
                duration: 1000
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                tooltip: {
                    backgroundColor: '#121722',
                    titleColor: '#8b9ab4',
                    bodyColor: '#ffffff',
                    borderColor: '#1e2130',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            const value = context.raw.y;
                            return `Volume: $${formatNumber(value)}`;
                        },
                        title: function(context) {
                            return formatDate(new Date(context[0].parsed.x));
                        }
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: getTimeUnit(currentPeriod),
                        displayFormats: {
                            day: 'MMM d',
                            week: 'MMM d',
                            month: 'MMM yyyy'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#8b9ab4',
                        maxRotation: 45,
                        minRotation: 45
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#8b9ab4',
                        callback: function(value) {
                            return '$' + formatNumber(value);
                        }
                    }
                }
            }
        }
    });
}

/**
 * Filter chart data based on selected time period
 */
function filterChartDataByPeriod(data, period) {
    if (!data || data.length === 0) return [];
    
    const now = new Date();
    let cutoffDate;
    
    switch (period) {
        case '1m':
            cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        case '3m':
            cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
            break;
        case '6m':
            cutoffDate = new Date(now.setMonth(now.getMonth() - 6));
            break;
        case '1y':
            cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
            break;
        case '2y':
            cutoffDate = new Date(now.setFullYear(now.getFullYear() - 2));
            break;
        default:
            cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
    }
    
    return data.filter(item => item.x >= cutoffDate);
}

/**
 * Get appropriate time unit for chart based on period
 */
function getTimeUnit(period) {
    switch (period) {
        case '1m':
            return 'day';
        case '3m':
            return 'week';
        case '6m':
            return 'week';
        case '1y':
            return 'month';
        case '2y':
            return 'month';
        default:
            return 'month';
    }
}

/**
 * Set the chart period and update the chart
 */
function setChartPeriod(period) {
    // Update active button
    chartPeriodButtons.forEach(button => {
        if (button.getAttribute('data-period') === period) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
    
    // Update current period and redraw chart
    currentPeriod = period;
    if (chartData.length > 0) {
        initVolumeChart();
    }
}

/**
 * Update the transactions list
 */
function updateTransactions(transactions) {
    const container = document.getElementById('transactions-container');
    const loadingElement = document.getElementById('transactions-loading');
    
    if (!transactions || transactions.length === 0) {
        showError('transactions-container', 'transactions-loading', 'No recent large transactions found');
        return;
    }
    
    // Generate HTML for transactions
    const html = transactions.map(tx => `
        <li class="list-item fade-in">
            <div class="tx-amount">${tx.amount_btc} BTC</div>
            <div class="tx-value">${tx.amount_usd}</div>
            <div class="tx-hash">
                <i class="fas fa-hashtag"></i> ${tx.hash.substring(0, 20)}...
            </div>
            <div class="tx-time">
                <i class="far fa-clock"></i> ${tx.time}
            </div>
            <div class="tx-details">
                <div class="tx-detail-item">
                    <i class="fas fa-sign-in-alt"></i> ${tx.inputs} inputs
                </div>
                <div class="tx-detail-item">
                    <i class="fas fa-sign-out-alt"></i> ${tx.outputs} outputs
                </div>
            </div>
            <a href="https://blockchain.info/tx/${tx.hash}" target="_blank" class="tx-link">
                <i class="fas fa-external-link-alt"></i> View on Blockchain.info
            </a>
        </li>
    `).join('');
    
    // Update container and hide loading
    container.innerHTML = html;
    container.style.display = 'block';
    loadingElement.style.display = 'none';
}

/**
 * Update the rich list
 */
function updateRichList(wallets) {
    const container = document.getElementById('rich-list-container');
    const loadingElement = document.getElementById('wallets-loading');
    
    if (!wallets || wallets.length === 0) {
        showError('rich-list-container', 'wallets-loading', 'Failed to load wallet data');
        return;
    }
    
    // Generate HTML for wallets
    const html = wallets.map((wallet, index) => `
        <li class="list-item fade-in">
            <div class="wallet-balance">#${index + 1} ${wallet.balance_btc} BTC</div>
            <div class="wallet-value">${wallet.balance_usd}</div>
            <div class="wallet-type">
                <i class="fas fa-tag"></i> ${wallet.type}
            </div>
            <div class="wallet-address">
                <i class="fas fa-wallet"></i> ${wallet.address.substring(0, 20)}...
            </div>
            <a href="https://blockchain.info/address/${wallet.address}" target="_blank" class="tx-link">
                <i class="fas fa-external-link-alt"></i> View on Blockchain.info
            </a>
        </li>
    `).join('');
    
    // Update container and hide loading
    container.innerHTML = html;
    container.style.display = 'block';
    loadingElement.style.display = 'none';
}

/**
 * Show loading state
 */
function showLoading(containerId, loadingId) {
    const container = document.getElementById(containerId);
    const loadingElement = document.getElementById(loadingId);
    
    if (container && loadingElement) {
        container.style.display = 'none';
        loadingElement.style.display = 'flex';
    }
}

/**
 * Show error message
 */
function showError(containerId, loadingId, message) {
    const container = document.getElementById(containerId);
    const loadingElement = document.getElementById(loadingId);
    
    if (loadingElement) {
        loadingElement.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-triangle"></i>
                <div>${message}</div>
                <button class="btn-refresh mt-3" onclick="fetchData()">
                    <i class="fas fa-sync-alt me-2"></i>Retry
                </button>
            </div>
        `;
    }
}

/**
 * Format number with commas and abbreviations
 */
function formatNumber(number) {
    if (number >= 1_000_000_000) {
        return (number / 1_000_000_000).toFixed(2) + 'B';
    } else if (number >= 1_000_000) {
        return (number / 1_000_000).toFixed(2) + 'M';
    } else if (number >= 1_000) {
        return (number / 1_000).toFixed(2) + 'K';
    }
    return number.toFixed(2);
}

/**
 * Format date for display
 */
function formatDate(date) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

/**
 * Format date and time for display
 */
function formatDateTime(date) {
    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return date.toLocaleString(undefined, options);
}
