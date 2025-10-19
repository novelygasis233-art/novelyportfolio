// Personal Life Management Dashboard - JavaScript
class LifeManagementDashboard {
    constructor() {
        this.data = {
            habits: [],
            goals: [],
            transactions: [],
            healthData: [],
            tasks: [],
            milestones: []
        };
        
        this.charts = {};
        this.currentTab = 'dashboard';
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateCurrentDate();
        this.renderDashboard();
        this.setupCharts();
    }

    // Data Management
    loadData() {
        const savedData = localStorage.getItem('lifeManagementData');
        if (savedData) {
            this.data = { ...this.data, ...JSON.parse(savedData) };
        }
    }

    saveData() {
        localStorage.setItem('lifeManagementData', JSON.stringify(this.data));
    }

    // Event Listeners
    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Theme toggle
        document.getElementById('themeBtn').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) {
                this.closeModal();
            }
        });

        // Add buttons
        document.getElementById('addHabitBtn').addEventListener('click', () => {
            this.showAddHabitModal();
        });

        document.getElementById('addGoalBtn').addEventListener('click', () => {
            this.showAddGoalModal();
        });

        document.getElementById('addTransactionBtn').addEventListener('click', () => {
            this.showAddTransactionModal();
        });

        document.getElementById('addHealthEntryBtn').addEventListener('click', () => {
            this.showAddHealthEntryModal();
        });

        document.getElementById('addTaskBtn').addEventListener('click', () => {
            this.showAddTaskModal();
        });

        document.getElementById('addMilestoneBtn').addEventListener('click', () => {
            this.showAddMilestoneModal();
        });

        // Task input
        document.getElementById('addTaskButton').addEventListener('click', () => {
            this.addTask();
        });

        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTask();
            }
        });

        // Health save
        document.getElementById('saveHealthBtn').addEventListener('click', () => {
            this.saveHealthData();
        });
    }

    // Tab Management
    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update active content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tabName).classList.add('active');

        this.currentTab = tabName;
        this.renderCurrentTab();
    }

    renderCurrentTab() {
        switch (this.currentTab) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'habits':
                this.renderHabits();
                break;
            case 'goals':
                this.renderGoals();
                break;
            case 'finance':
                this.renderFinance();
                break;
            case 'health':
                this.renderHealth();
                break;
            case 'tasks':
                this.renderTasks();
                break;
            case 'milestones':
                this.renderMilestones();
                break;
        }
    }

    // Theme Management
    toggleTheme() {
        document.body.classList.toggle('dark-theme');
        const themeBtn = document.getElementById('themeBtn');
        const icon = themeBtn.querySelector('i');
        
        if (document.body.classList.contains('dark-theme')) {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }

    // Date Management
    updateCurrentDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
    }

    // Dashboard Rendering
    renderDashboard() {
        this.updateDashboardStats();
        this.updateCharts();
    }

    updateDashboardStats() {
        // Calculate streak
        const streak = this.calculateStreak();
        document.getElementById('streakCount').textContent = streak;

        // Calculate completed goals
        const completedGoals = this.data.goals.filter(goal => goal.completed).length;
        document.getElementById('goalsCompleted').textContent = completedGoals;

        // Calculate monthly savings
        const monthlySavings = this.calculateMonthlySavings();
        document.getElementById('monthlySavings').textContent = `$${monthlySavings}`;

        // Calculate health score
        const healthScore = this.calculateHealthScore();
        document.getElementById('healthScore').textContent = `${healthScore}%`;
    }

    calculateStreak() {
        if (this.data.habits.length === 0) return 0;
        
        let maxStreak = 0;
        this.data.habits.forEach(habit => {
            if (habit.streak > maxStreak) {
                maxStreak = habit.streak;
            }
        });
        return maxStreak;
    }

    calculateMonthlySavings() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyTransactions = this.data.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
        });

        const income = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        return Math.max(0, income - expenses);
    }

    calculateHealthScore() {
        if (this.data.healthData.length === 0) return 0;
        
        const today = new Date().toDateString();
        const todayData = this.data.healthData.find(data => 
            new Date(data.date).toDateString() === today
        );

        if (!todayData) return 0;

        let score = 0;
        if (todayData.sleep >= 7 && todayData.sleep <= 9) score += 25;
        if (todayData.exercise >= 30) score += 25;
        if (todayData.water >= 8) score += 25;
        if (todayData.weight > 0) score += 25;

        return score;
    }

    // Charts Setup
    setupCharts() {
        this.setupHabitsChart();
        this.setupExpensesChart();
        this.setupHealthChart();
    }

    setupHabitsChart() {
        const ctx = document.getElementById('habitsChart');
        if (!ctx) return;

        const last7Days = this.getLast7Days();
        const habitData = this.getHabitProgressData(last7Days);

        this.charts.habits = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days.map(day => day.toLocaleDateString('en-US', { weekday: 'short' })),
                datasets: habitData
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: false
                    },
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }

    setupExpensesChart() {
        const ctx = document.getElementById('expensesChart');
        if (!ctx) return;

        const expenseData = this.getExpenseData();

        this.charts.expenses = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: expenseData.labels,
                datasets: [{
                    data: expenseData.values,
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    setupHealthChart() {
        const ctx = document.getElementById('healthChart');
        if (!ctx) return;

        const healthData = this.getHealthTrendData();

        this.charts.health = new Chart(ctx, {
            type: 'line',
            data: {
                labels: healthData.labels,
                datasets: [{
                    label: 'Sleep Hours',
                    data: healthData.sleep,
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Exercise Minutes',
                    data: healthData.exercise,
                    borderColor: '#4BC0C0',
                    backgroundColor: 'rgba(75, 192, 192, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    updateCharts() {
        if (this.charts.habits) {
            const last7Days = this.getLast7Days();
            const habitData = this.getHabitProgressData(last7Days);
            this.charts.habits.data.datasets = habitData;
            this.charts.habits.update();
        }

        if (this.charts.expenses) {
            const expenseData = this.getExpenseData();
            this.charts.expenses.data.labels = expenseData.labels;
            this.charts.expenses.data.datasets[0].data = expenseData.values;
            this.charts.expenses.update();
        }

        if (this.charts.health) {
            const healthData = this.getHealthTrendData();
            this.charts.health.data.labels = healthData.labels;
            this.charts.health.data.datasets[0].data = healthData.sleep;
            this.charts.health.data.datasets[1].data = healthData.exercise;
            this.charts.health.update();
        }
    }

    getLast7Days() {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            days.push(date);
        }
        return days;
    }

    getHabitProgressData(days) {
        const datasets = [];
        const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];

        this.data.habits.forEach((habit, index) => {
            const data = days.map(day => {
                const dayStr = day.toDateString();
                const completed = habit.completedDays.includes(dayStr);
                return completed ? 100 : 0;
            });

            datasets.push({
                label: habit.title,
                data: data,
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '20',
                tension: 0.4
            });
        });

        return datasets;
    }

    getExpenseData() {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyTransactions = this.data.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear &&
                   transaction.type === 'expense';
        });

        const categories = {};
        monthlyTransactions.forEach(transaction => {
            const category = transaction.category || 'Other';
            categories[category] = (categories[category] || 0) + transaction.amount;
        });

        return {
            labels: Object.keys(categories),
            values: Object.values(categories)
        };
    }

    getHealthTrendData() {
        const last7Days = this.getLast7Days();
        const labels = last7Days.map(day => day.toLocaleDateString('en-US', { weekday: 'short' }));
        
        const sleep = last7Days.map(day => {
            const dayStr = day.toDateString();
            const dayData = this.data.healthData.find(data => 
                new Date(data.date).toDateString() === dayStr
            );
            return dayData ? dayData.sleep : 0;
        });

        const exercise = last7Days.map(day => {
            const dayStr = day.toDateString();
            const dayData = this.data.healthData.find(data => 
                new Date(data.date).toDateString() === dayStr
            );
            return dayData ? dayData.exercise : 0;
        });

        return { labels, sleep, exercise };
    }

    // Habits Management
    renderHabits() {
        const container = document.getElementById('habitsGrid');
        container.innerHTML = '';

        this.data.habits.forEach((habit, index) => {
            const habitCard = this.createHabitCard(habit, index);
            container.appendChild(habitCard);
        });
    }

    createHabitCard(habit, index) {
        const card = document.createElement('div');
        card.className = 'habit-card fade-in';
        
        const today = new Date().toDateString();
        const isCompletedToday = habit.completedDays.includes(today);
        const progress = (habit.completedDays.length / 30) * 100; // 30-day progress

        card.innerHTML = `
            <div class="habit-header">
                <h3 class="habit-title">${habit.title}</h3>
                <span class="habit-streak">${habit.streak} days</span>
            </div>
            <div class="habit-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="habit-actions">
                <div class="habit-check ${isCompletedToday ? 'checked' : ''}" 
                     onclick="dashboard.toggleHabit(${index})">
                    ${isCompletedToday ? '<i class="fas fa-check"></i>' : ''}
                </div>
                <button class="btn btn-danger" onclick="dashboard.deleteHabit(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        return card;
    }

    toggleHabit(index) {
        const habit = this.data.habits[index];
        const today = new Date().toDateString();
        
        if (habit.completedDays.includes(today)) {
            habit.completedDays = habit.completedDays.filter(day => day !== today);
            habit.streak = Math.max(0, habit.streak - 1);
        } else {
            habit.completedDays.push(today);
            habit.streak += 1;
        }

        this.saveData();
        this.renderHabits();
        this.renderDashboard();
    }

    deleteHabit(index) {
        if (confirm('Are you sure you want to delete this habit?')) {
            this.data.habits.splice(index, 1);
            this.saveData();
            this.renderHabits();
        }
    }

    showAddHabitModal() {
        this.showModal('Add New Habit', `
            <div class="form-group">
                <label for="habitTitle">Habit Title</label>
                <input type="text" id="habitTitle" placeholder="e.g., Drink 8 glasses of water">
            </div>
            <div class="form-group">
                <label for="habitDescription">Description (Optional)</label>
                <textarea id="habitDescription" placeholder="Describe your habit..."></textarea>
            </div>
            <div class="form-group">
                <button class="btn btn-primary" onclick="dashboard.addHabit()">Add Habit</button>
            </div>
        `);
    }

    addHabit() {
        const title = document.getElementById('habitTitle').value.trim();
        if (!title) return;

        const description = document.getElementById('habitDescription').value.trim();

        const habit = {
            id: Date.now(),
            title,
            description,
            streak: 0,
            completedDays: [],
            createdAt: new Date().toISOString()
        };

        this.data.habits.push(habit);
        this.saveData();
        this.closeModal();
        this.renderHabits();
    }

    // Goals Management
    renderGoals() {
        const container = document.getElementById('goalsContainer');
        container.innerHTML = '';

        this.data.goals.forEach((goal, index) => {
            const goalCard = this.createGoalCard(goal, index);
            container.appendChild(goalCard);
        });
    }

    createGoalCard(goal, index) {
        const card = document.createElement('div');
        card.className = 'goal-card fade-in';
        
        const progress = goal.completed ? 100 : (goal.progress || 0);
        const deadline = new Date(goal.deadline);
        const isOverdue = !goal.completed && deadline < new Date();

        card.innerHTML = `
            <div class="goal-header">
                <div>
                    <h3 class="goal-title">${goal.title}</h3>
                    <span class="goal-category">${goal.category}</span>
                </div>
                <button class="btn ${goal.completed ? 'btn-secondary' : 'btn-success'}" 
                        onclick="dashboard.toggleGoal(${index})">
                    ${goal.completed ? 'Completed' : 'Mark Complete'}
                </button>
            </div>
            <p class="goal-description">${goal.description}</p>
            <div class="goal-progress">
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <span>${progress}% Complete</span>
            </div>
            <div class="goal-deadline ${isOverdue ? 'overdue' : ''}">
                Deadline: ${deadline.toLocaleDateString()}
            </div>
            <div class="goal-actions">
                <button class="btn btn-danger" onclick="dashboard.deleteGoal(${index})">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        return card;
    }

    toggleGoal(index) {
        const goal = this.data.goals[index];
        goal.completed = !goal.completed;
        goal.progress = goal.completed ? 100 : (goal.progress || 0);
        
        this.saveData();
        this.renderGoals();
        this.renderDashboard();
    }

    deleteGoal(index) {
        if (confirm('Are you sure you want to delete this goal?')) {
            this.data.goals.splice(index, 1);
            this.saveData();
            this.renderGoals();
        }
    }

    showAddGoalModal() {
        this.showModal('Add New Goal', `
            <div class="form-group">
                <label for="goalTitle">Goal Title</label>
                <input type="text" id="goalTitle" placeholder="e.g., Learn Spanish">
            </div>
            <div class="form-group">
                <label for="goalDescription">Description</label>
                <textarea id="goalDescription" placeholder="Describe your goal..."></textarea>
            </div>
            <div class="form-group">
                <label for="goalCategory">Category</label>
                <select id="goalCategory">
                    <option value="Personal">Personal</option>
                    <option value="Career">Career</option>
                    <option value="Health">Health</option>
                    <option value="Education">Education</option>
                    <option value="Financial">Financial</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label for="goalDeadline">Deadline</label>
                <input type="date" id="goalDeadline">
            </div>
            <div class="form-group">
                <button class="btn btn-primary" onclick="dashboard.addGoal()">Add Goal</button>
            </div>
        `);
    }

    addGoal() {
        const title = document.getElementById('goalTitle').value.trim();
        const description = document.getElementById('goalDescription').value.trim();
        const category = document.getElementById('goalCategory').value;
        const deadline = document.getElementById('goalDeadline').value;

        if (!title || !deadline) return;

        const goal = {
            id: Date.now(),
            title,
            description,
            category,
            deadline,
            completed: false,
            progress: 0,
            createdAt: new Date().toISOString()
        };

        this.data.goals.push(goal);
        this.saveData();
        this.closeModal();
        this.renderGoals();
    }

    // Finance Management
    renderFinance() {
        this.updateFinanceStats();
        this.renderTransactions();
    }

    updateFinanceStats() {
        const monthlySavings = this.calculateMonthlySavings();
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyTransactions = this.data.transactions.filter(transaction => {
            const transactionDate = new Date(transaction.date);
            return transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
        });

        const income = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        document.getElementById('monthlyIncome').textContent = `$${income}`;
        document.getElementById('monthlyExpenses').textContent = `$${expenses}`;
        document.getElementById('monthlySavingsAmount').textContent = `$${monthlySavings}`;
    }

    renderTransactions() {
        const container = document.getElementById('transactionsList');
        container.innerHTML = '';

        const recentTransactions = this.data.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);

        recentTransactions.forEach(transaction => {
            const transactionItem = document.createElement('div');
            transactionItem.className = 'transaction-item';
            
            transactionItem.innerHTML = `
                <div>
                    <strong>${transaction.description}</strong>
                    <div style="font-size: 0.9rem; color: #666;">${transaction.category}</div>
                </div>
                <div class="transaction-amount ${transaction.type}">
                    ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount}
                </div>
            `;

            container.appendChild(transactionItem);
        });
    }

    showAddTransactionModal() {
        this.showModal('Add Transaction', `
            <div class="form-group">
                <label for="transactionDescription">Description</label>
                <input type="text" id="transactionDescription" placeholder="e.g., Grocery shopping">
            </div>
            <div class="form-group">
                <label for="transactionAmount">Amount</label>
                <input type="number" id="transactionAmount" placeholder="0.00" step="0.01">
            </div>
            <div class="form-group">
                <label for="transactionType">Type</label>
                <select id="transactionType">
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                </select>
            </div>
            <div class="form-group">
                <label for="transactionCategory">Category</label>
                <select id="transactionCategory">
                    <option value="Food">Food</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Bills">Bills</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education">Education</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Other">Other</option>
                </select>
            </div>
            <div class="form-group">
                <label for="transactionDate">Date</label>
                <input type="date" id="transactionDate" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <button class="btn btn-primary" onclick="dashboard.addTransaction()">Add Transaction</button>
            </div>
        `);
    }

    addTransaction() {
        const description = document.getElementById('transactionDescription').value.trim();
        const amount = parseFloat(document.getElementById('transactionAmount').value);
        const type = document.getElementById('transactionType').value;
        const category = document.getElementById('transactionCategory').value;
        const date = document.getElementById('transactionDate').value;

        if (!description || !amount || !date) return;

        const transaction = {
            id: Date.now(),
            description,
            amount,
            type,
            category,
            date,
            createdAt: new Date().toISOString()
        };

        this.data.transactions.push(transaction);
        this.saveData();
        this.closeModal();
        this.renderFinance();
        this.renderDashboard();
    }

    // Health Management
    renderHealth() {
        // Health data is already loaded from localStorage
        this.updateHealthChart();
    }

    saveHealthData() {
        const weight = parseFloat(document.getElementById('weightInput').value) || 0;
        const sleep = parseFloat(document.getElementById('sleepInput').value) || 0;
        const exercise = parseFloat(document.getElementById('exerciseInput').value) || 0;
        const water = parseFloat(document.getElementById('waterInput').value) || 0;

        const today = new Date().toISOString().split('T')[0];
        
        // Remove existing entry for today
        this.data.healthData = this.data.healthData.filter(data => data.date !== today);
        
        // Add new entry
        this.data.healthData.push({
            id: Date.now(),
            date: today,
            weight,
            sleep,
            exercise,
            water,
            createdAt: new Date().toISOString()
        });

        this.saveData();
        this.renderDashboard();
        this.updateHealthChart();
        
        // Clear inputs
        document.getElementById('weightInput').value = '';
        document.getElementById('sleepInput').value = '';
        document.getElementById('exerciseInput').value = '';
        document.getElementById('waterInput').value = '';

        alert('Health data saved successfully!');
    }

    updateHealthChart() {
        if (this.charts.health) {
            const healthData = this.getHealthTrendData();
            this.charts.health.data.labels = healthData.labels;
            this.charts.health.data.datasets[0].data = healthData.sleep;
            this.charts.health.data.datasets[1].data = healthData.exercise;
            this.charts.health.update();
        }
    }

    showAddHealthEntryModal() {
        this.showModal('Add Health Entry', `
            <div class="form-group">
                <label for="healthWeight">Weight (kg)</label>
                <input type="number" id="healthWeight" placeholder="70.5" step="0.1">
            </div>
            <div class="form-group">
                <label for="healthSleep">Sleep Hours</label>
                <input type="number" id="healthSleep" placeholder="8" step="0.5">
            </div>
            <div class="form-group">
                <label for="healthExercise">Exercise Minutes</label>
                <input type="number" id="healthExercise" placeholder="30">
            </div>
            <div class="form-group">
                <label for="healthWater">Water Glasses</label>
                <input type="number" id="healthWater" placeholder="8">
            </div>
            <div class="form-group">
                <button class="btn btn-primary" onclick="dashboard.addHealthEntry()">Add Entry</button>
            </div>
        `);
    }

    addHealthEntry() {
        const weight = parseFloat(document.getElementById('healthWeight').value) || 0;
        const sleep = parseFloat(document.getElementById('healthSleep').value) || 0;
        const exercise = parseFloat(document.getElementById('healthExercise').value) || 0;
        const water = parseFloat(document.getElementById('healthWater').value) || 0;

        const today = new Date().toISOString().split('T')[0];
        
        this.data.healthData = this.data.healthData.filter(data => data.date !== today);
        
        this.data.healthData.push({
            id: Date.now(),
            date: today,
            weight,
            sleep,
            exercise,
            water,
            createdAt: new Date().toISOString()
        });

        this.saveData();
        this.closeModal();
        this.renderHealth();
        this.renderDashboard();
    }

    // Task Management
    renderTasks() {
        const container = document.getElementById('tasksContainer');
        container.innerHTML = '';

        this.data.tasks.forEach((task, index) => {
            const taskItem = this.createTaskItem(task, index);
            container.appendChild(taskItem);
        });
    }

    createTaskItem(task, index) {
        const item = document.createElement('div');
        item.className = `task-item ${task.completed ? 'completed' : ''} fade-in`;
        
        item.innerHTML = `
            <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
                   onchange="dashboard.toggleTask(${index})">
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                <span class="task-priority ${task.priority}">${task.priority}</span>
            </div>
            <div class="task-actions">
                <button class="btn btn-danger" onclick="dashboard.deleteTask(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        return item;
    }

    addTask() {
        const title = document.getElementById('taskInput').value.trim();
        const priority = document.getElementById('taskPriority').value;

        if (!title) return;

        const task = {
            id: Date.now(),
            title,
            priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.data.tasks.push(task);
        this.saveData();
        
        document.getElementById('taskInput').value = '';
        this.renderTasks();
    }

    toggleTask(index) {
        this.data.tasks[index].completed = !this.data.tasks[index].completed;
        this.saveData();
        this.renderTasks();
    }

    deleteTask(index) {
        if (confirm('Are you sure you want to delete this task?')) {
            this.data.tasks.splice(index, 1);
            this.saveData();
            this.renderTasks();
        }
    }

    showAddTaskModal() {
        this.showModal('Add New Task', `
            <div class="form-group">
                <label for="modalTaskTitle">Task Title</label>
                <input type="text" id="modalTaskTitle" placeholder="Enter task title...">
            </div>
            <div class="form-group">
                <label for="modalTaskPriority">Priority</label>
                <select id="modalTaskPriority">
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                </select>
            </div>
            <div class="form-group">
                <button class="btn btn-primary" onclick="dashboard.addTaskFromModal()">Add Task</button>
            </div>
        `);
    }

    addTaskFromModal() {
        const title = document.getElementById('modalTaskTitle').value.trim();
        const priority = document.getElementById('modalTaskPriority').value;

        if (!title) return;

        const task = {
            id: Date.now(),
            title,
            priority,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.data.tasks.push(task);
        this.saveData();
        this.closeModal();
        this.renderTasks();
    }

    // Milestones Management
    renderMilestones() {
        const container = document.getElementById('milestonesContainer');
        container.innerHTML = '';

        this.data.milestones.forEach((milestone, index) => {
            const milestoneCard = this.createMilestoneCard(milestone, index);
            container.appendChild(milestoneCard);
        });
    }

    createMilestoneCard(milestone, index) {
        const card = document.createElement('div');
        card.className = `milestone-card ${milestone.achieved ? 'achieved' : ''} fade-in`;
        
        const date = new Date(milestone.date);
        
        card.innerHTML = `
            <h3 class="milestone-title">${milestone.title}</h3>
            <p class="milestone-description">${milestone.description}</p>
            <div class="milestone-date">Date: ${date.toLocaleDateString()}</div>
            <div class="milestone-actions">
                <button class="btn ${milestone.achieved ? 'btn-secondary' : 'btn-success'}" 
                        onclick="dashboard.toggleMilestone(${index})">
                    ${milestone.achieved ? 'Achieved' : 'Mark as Achieved'}
                </button>
                <button class="btn btn-danger" onclick="dashboard.deleteMilestone(${index})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        return card;
    }

    toggleMilestone(index) {
        this.data.milestones[index].achieved = !this.data.milestones[index].achieved;
        this.saveData();
        this.renderMilestones();
    }

    deleteMilestone(index) {
        if (confirm('Are you sure you want to delete this milestone?')) {
            this.data.milestones.splice(index, 1);
            this.saveData();
            this.renderMilestones();
        }
    }

    showAddMilestoneModal() {
        this.showModal('Add New Milestone', `
            <div class="form-group">
                <label for="milestoneTitle">Milestone Title</label>
                <input type="text" id="milestoneTitle" placeholder="e.g., Graduated from University">
            </div>
            <div class="form-group">
                <label for="milestoneDescription">Description</label>
                <textarea id="milestoneDescription" placeholder="Describe this milestone..."></textarea>
            </div>
            <div class="form-group">
                <label for="milestoneDate">Date</label>
                <input type="date" id="milestoneDate" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
                <button class="btn btn-primary" onclick="dashboard.addMilestone()">Add Milestone</button>
            </div>
        `);
    }

    addMilestone() {
        const title = document.getElementById('milestoneTitle').value.trim();
        const description = document.getElementById('milestoneDescription').value.trim();
        const date = document.getElementById('milestoneDate').value;

        if (!title || !date) return;

        const milestone = {
            id: Date.now(),
            title,
            description,
            date,
            achieved: false,
            createdAt: new Date().toISOString()
        };

        this.data.milestones.push(milestone);
        this.saveData();
        this.closeModal();
        this.renderMilestones();
    }

    // Modal Management
    showModal(title, content) {
        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalBody').innerHTML = content;
        document.getElementById('modalOverlay').classList.add('active');
    }

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new LifeManagementDashboard();
});