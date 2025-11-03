// DOM elements
const usernameInput = document.getElementById('username');
const descriptionInput = document.getElementById('expence-description');
const amountInput = document.getElementById('expence-amount');
const categoryInput = document.getElementById('expence-category'); // New
const dateInput = document.getElementById('expence-date');
const addExpenceButton = document.getElementById('add-expence');
const totalExpencesSpan = document.getElementById('total-expences');
const expenceListBody = document.getElementById('expence-list');

// Chart elements
const timeExpenceChartCanvas = document.getElementById('time-expence-chart').getContext('2d');
const categoryExpenceChartCanvas = document.getElementById('category-expence-chart').getContext('2d'); // New
const chartViewSelect = document.getElementById('chart-view'); 

let expenses = [];
let timeExpenseChart; // First chart instance
let categoryExpenseChart; // Second chart instance
let currentView = 'month'; // Default view

// --- Local Storage Functions ---

/**
 * Loads expenses array and username from Local Storage.
 */
function loadData() {
    const storedExpenses = localStorage.getItem('expenses');
    if (storedExpenses) {
        expenses = JSON.parse(storedExpenses);
    }
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
        usernameInput.value = storedUsername;
    }
}

/**
 * Saves the current expenses array and username to Local Storage.
 */
function saveData() {
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('username', usernameInput.value);
}

// --- Expense Management ---

/**
 * Adds a new expense to the array.
 */
function addExpense() {
    const description = descriptionInput.value.trim();
    const amount = parseFloat(amountInput.value);
    const category = categoryInput.value; // Get category value
    const date = dateInput.value;

    // Validation - now includes category check
    if (description && amount > 0 && category && date) {
        const newExpense = {
            id: Date.now(),
            description,
            amount,
            category, // Storing category
            date,
        };
        expenses.push(newExpense);
        saveData();
        renderExpenses();
        updateCharts(); // Call the combined update function
        clearForm();
    } else {
        alert('Please enter a valid description, amount, category, and date.');
    }
}

/**
 * Deletes an expense by its ID.
 * @param {number} id - The ID of the expense to delete.
 */
function deleteExpense(id) {
    expenses = expenses.filter(expense => expense.id !== id);
    saveData();
    renderExpenses();
    updateCharts(); // Call the combined update function
}

/**
 * Clears the expense input form fields.
 */
function clearForm() {
    descriptionInput.value = '';
    amountInput.value = '';
    categoryInput.value = ''; // Reset category dropdown
    dateInput.value = '';
}

// --- Rendering and UI Updates ---

/**
 * Calculates and updates the total expenses display using PKR formatting.
 */
function updateTotalExpenses() {
    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    totalExpencesSpan.textContent = total.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Renders the expenses into the HTML table.
 */
function renderExpenses() {
    expenceListBody.innerHTML = '';
    expenses.forEach(expense => {
        const formattedAmount = expense.amount.toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        
        const row = expenceListBody.insertRow();
        row.innerHTML = `
            <td>${expense.description}</td>
            <td>PKR ${formattedAmount}</td>
            <td>${expense.category}</td> <td>${expense.date}</td>
            <td><button class="delete-btn" data-id="${expense.id}">Delete</button></td>
        `;
    });

    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = parseInt(e.target.dataset.id);
            deleteExpense(id);
        });
    });

    updateTotalExpenses();
}

// --- Chart.js Integration for Time-Series (Bar Chart) ---

/**
 * Aggregates expenses based on the selected time period (day, month, or year).
 */
function getTimeSeriesData(period) {
    const aggregatedData = expenses.reduce((acc, expense) => {
        let key;
        if (period === 'day') {
            key = expense.date; // YYYY-MM-DD
        } else if (period === 'month') {
            key = expense.date.substring(0, 7); // YYYY-MM
        } else if (period === 'year') {
            key = expense.date.substring(0, 4); // YYYY
        }
        acc[key] = (acc[key] || 0) + expense.amount;
        return acc;
    }, {});

    const sortedKeys = Object.keys(aggregatedData).sort();

    return {
        labels: sortedKeys,
        data: sortedKeys.map(key => aggregatedData[key]),
        title: `Expenses Over Time (${period.charAt(0).toUpperCase() + period.slice(1)} View)`
    };
}

/**
 * Initializes or updates the Time-Series Bar Chart.
 */
function updateTimeSeriesChart() {
    const chartData = getTimeSeriesData(currentView);
    const labelText = `Total Expenses (PKR)`;

    if (timeExpenseChart) {
        timeExpenseChart.data.labels = chartData.labels;
        timeExpenseChart.data.datasets[0].data = chartData.data;
        timeExpenseChart.options.plugins.title.text = chartData.title;
        timeExpenseChart.update();
    } else {
        timeExpenseChart = new Chart(timeExpenceChartCanvas, {
            type: 'bar',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: labelText,
                    data: chartData.data,
                    backgroundColor: 'rgba(0, 123, 255, 0.7)',
                    borderColor: 'rgba(0, 123, 255, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Amount (PKR)'
                        }
                    }
                },
                plugins: {
                    legend: { display: true, position: 'top' },
                    title: { display: true, text: chartData.title }
                }
            }
        });
    }
}


// --- Chart.js Integration for Categories (Pie Chart) ---

const CHART_COLORS = [
    '#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6610f2', '#fd7e14'
];

/**
 * Aggregates expenses by category for the Pie Chart.
 */
function getCategoryData() {
    const aggregatedData = expenses.reduce((acc, expense) => {
        const key = expense.category;
        acc[key] = (acc[key] || 0) + expense.amount;
        return acc;
    }, {});

    const labels = Object.keys(aggregatedData);
    const data = labels.map(key => aggregatedData[key]);

    return { labels, data };
}

/**
 * Initializes or updates the Category Breakdown Pie Chart.
 */
function updateCategoryChart() {
    const chartData = getCategoryData();

    if (categoryExpenseChart) {
        categoryExpenseChart.data.labels = chartData.labels;
        categoryExpenseChart.data.datasets[0].data = chartData.data;
        categoryExpenseChart.update();
    } else {
        categoryExpenseChart = new Chart(categoryExpenceChartCanvas, {
            type: 'doughnut', // Use doughnut chart for better visual
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Expense Breakdown (PKR)',
                    data: chartData.data,
                    backgroundColor: CHART_COLORS,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' },
                    title: { display: false }
                }
            }
        });
    }
}

// Combined function to update both charts
function updateCharts() {
    updateTimeSeriesChart();
    updateCategoryChart();
}

// --- Initialization and Event Listeners ---

// Event listener to change the Time Chart view
chartViewSelect.addEventListener('change', (e) => {
    currentView = e.target.value;
    updateTimeSeriesChart();
});

// Event listener for adding an expense
addExpenceButton.addEventListener('click', addExpense);

// Event listener to save username on input change
usernameInput.addEventListener('input', saveData);

// Set current year in footer
document.getElementById('current-year').textContent = new Date().getFullYear();

// Load existing data and render on page load
loadData();
renderExpenses();
updateCharts(); // Initialize both charts on load