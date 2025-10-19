// Personal Life Dashboard JavaScript

class LifeDashboard {
    constructor() {
        this.data = {
            health: {
                steps: 0,
                water: 0,
                sleep: 0,
                mood: []
            },
            finance: {
                expenses: [],
                budget: {
                    total: 2000,
                    categories: {
                        food: { limit: 500, spent: 0 },
                        transport: { limit: 300, spent: 0 },
                        entertainment: { limit: 200, spent: 0 },
                        utilities: { limit: 400, spent: 0 },
                        other: { limit: 600, spent: 0 }
                    }
                }
            },
            goals: [],
            habits: [],
            schedule: [],
            activities: []
        };
        
        this.init();
    }

    init() {
        this.loadData();
        this.setupEventListeners();
        this.updateCurrentDate();
        this.renderDashboard();
        this.renderAllSections();
        
        // Set default theme
        if (!localStorage.getItem('theme')) {
            localStorage.setItem('theme', 'light');
        }
        this.applyTheme(localStorage.getItem('theme'));
    }

    // Data Management
    loadData() {
        const savedData = localStorage.getItem('lifeDashboardData');
        if (savedData) {
            this.data = { ...this.data, ...JSON.parse(savedData) };
        }
        
        // Add sample data if none exists
        if (this.data.expenses.length === 0) {
            this.addSampleData();
        }
    }

    saveData() {
        localStorage.setItem('lifeDashboardData', JSON.stringify(this.data));
    }

    addSampleData() {
        // Sample expenses
        this.data.finance.expenses = [
            {
                id: Date.now() - 86400000,
                description: 'Groceries',
                amount: 85,
                category: 'food',
                date: new Date(Date.now() - 86400000).toISOString().split('T')[0]
            },
            {
                id: Date.now() - 172800000,
                description: 'Gas',
                amount: 45,
                category: 'transport',
                date: new Date(Date.now() - 172800000).toISOString().split('T')[0]
            }
        ];

        // Sample goals
        this.data.goals = [
            {
                id: Date.now() - 1000,
                title: 'Read 12 books this year',
                description: 'Improve knowledge and reading habits',
                category: 'personal',
                deadline: '2024-12-31',
                progress: 25,
                completed: false,
                createdAt: new Date().toISOString()
            },
            {
                id: Date.now() - 2000,
                title: 'Save $5000 for vacation',
                description: 'Build emergency fund for travel',
                category: 'financial',
                deadline: '2024-08-15',
                progress: 60,
                completed: false,
                createdAt: new Date().toISOString()
            }
        ];

        // Sample habits
        this.data.habits = [
            {
                id: Date.now() - 3000,
                name: 'Morning Exercise',
                frequency: 'daily',
                streak: 12,
                completedToday: false,
                createdAt: new Date().toISOString()
            },
            {
                id: Date.now() - 4000,
                name: 'Read for 30 minutes',
                frequency: 'daily',
                streak: 8,
                completedToday: false,
                createdAt: new Date().toISOString()
            }
        ];

        // Update budget spent amounts
        this.updateBudgetSpent();
        this.saveData();
    }

    // Event Listeners
    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.showSection(section);
            });
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Mood selector
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.recordMood(parseInt(e.target.dataset.mood));
            });
        });

        // Form submissions
        this.setupFormListeners();
    }

    setupFormListeners() {
        // Health metrics update buttons
        document.querySelectorAll('.metric-input button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const input = e.target.previousElementSibling;
                const metric = input.id.replace('Input', '');
                this.updateMetric(metric, parseFloat(input.value) || 0);
            });
        });
    }

    // Navigation
    showSection(sectionId) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionId}"]`).classList.add('active');

        // Show section
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.getElementById(sectionId).classList.add('active');
    }

    // Theme Management
    toggleTheme() {
        const currentTheme = localStorage.getItem('theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeIcon = document.querySelector('#themeToggle i');
        themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // Dashboard Updates
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

    renderDashboard() {
        this.updateHealthScore();
        this.updateBudgetDisplay();
        this.updateGoalsProgress();
        this.updateHabitStreak();
        this.renderRecentActivities();
    }

    updateHealthScore() {
        // Simple health score calculation based on steps, water, sleep
        const steps = this.data.health.steps;
        const water = this.data.health.water;
        const sleep = this.data.health.sleep;
        
        let score = 0;
        if (steps >= 8000) score += 30;
        else score += (steps / 8000) * 30;
        
        if (water >= 8) score += 30;
        else score += (water / 8) * 30;
        
        if (sleep >= 7 && sleep <= 9) score += 40;
        else if (sleep >= 6 && sleep <= 10) score += 30;
        else score += 20;
        
        document.getElementById('healthScore').textContent = Math.round(score);
    }

    updateBudgetDisplay() {
        const totalSpent = this.data.finance.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const budgetTotal = this.data.finance.budget.total;
        
        document.getElementById('budgetSpent').textContent = totalSpent.toLocaleString();
        document.getElementById('budgetTotal').textContent = budgetTotal.toLocaleString();
        
        const progressPercent = (totalSpent / budgetTotal) * 100;
        document.getElementById('budgetProgress').style.width = `${Math.min(progressPercent, 100)}%`;
    }

    updateGoalsProgress() {
        const completedGoals = this.data.goals.filter(goal => goal.completed).length;
        const activeGoals = this.data.goals.filter(goal => !goal.completed).length;
        
        document.getElementById('completedGoals').textContent = completedGoals;
        document.getElementById('activeGoals').textContent = activeGoals;
    }

    updateHabitStreak() {
        const maxStreak = Math.max(...this.data.habits.map(habit => habit.streak), 0);
        document.getElementById('habitStreak').textContent = maxStreak;
    }

    renderRecentActivities() {
        const activityList = document.getElementById('activityList');
        const activities = this.getRecentActivities();
        
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <i class="${activity.icon} activity-icon"></i>
                <span>${activity.text}</span>
                <span class="activity-time">${activity.time}</span>
            </div>
        `).join('');
    }

    getRecentActivities() {
        const activities = [];
        
        // Recent expenses
        const recentExpenses = this.data.finance.expenses
            .slice(-3)
            .reverse()
            .map(expense => ({
                icon: 'fas fa-dollar-sign',
                text: `Added expense: ${expense.description} $${expense.amount}`,
                time: this.getRelativeTime(expense.date),
                timestamp: new Date(expense.date).getTime()
            }));
        
        // Recent goals
        const recentGoals = this.data.goals
            .filter(goal => goal.completed)
            .slice(-2)
            .map(goal => ({
                icon: 'fas fa-check',
                text: `Completed goal: ${goal.title}`,
                time: this.getRelativeTime(goal.completedAt || goal.createdAt),
                timestamp: new Date(goal.completedAt || goal.createdAt).getTime()
            }));
        
        activities.push(...recentExpenses, ...recentGoals);
        
        // Add sample activities if none exist
        if (activities.length === 0) {
            activities.push(
                {
                    icon: 'fas fa-running',
                    text: 'Completed 30-minute workout',
                    time: '2 hours ago',
                    timestamp: Date.now() - 7200000
                },
                {
                    icon: 'fas fa-book',
                    text: 'Read for 45 minutes',
                    time: 'Yesterday',
                    timestamp: Date.now() - 86400000
                }
            );
        }
        
        return activities.sort((a, b) => b.timestamp - a.timestamp).slice(0, 5);
    }

    getRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);
        
        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
        if (diffInHours < 48) return 'Yesterday';
        return `${Math.floor(diffInHours / 24)} days ago`;
    }

    // Health Functions
    updateMetric(metric, value) {
        this.data.health[metric] = value;
        this.saveData();
        this.updateHealthScore();
        this.addActivity(`Updated ${metric}: ${value}`);
        
        // Clear input
        document.getElementById(`${metric}Input`).value = '';
    }

    recordMood(moodValue) {
        const today = new Date().toISOString().split('T')[0];
        const existingMoodIndex = this.data.health.mood.findIndex(m => m.date === today);
        
        if (existingMoodIndex >= 0) {
            this.data.health.mood[existingMoodIndex].value = moodValue;
        } else {
            this.data.health.mood.push({ date: today, value: moodValue });
        }
        
        this.saveData();
        this.renderMoodHistory();
        this.updateMoodButtons(moodValue);
    }

    updateMoodButtons(activeMood) {
        document.querySelectorAll('.mood-btn').forEach(btn => {
            btn.classList.remove('active');
            if (parseInt(btn.dataset.mood) === activeMood) {
                btn.classList.add('active');
            }
        });
    }

    renderMoodHistory() {
        const moodHistory = document.getElementById('moodHistory');
        const last30Days = this.data.health.mood.slice(-30);
        
        moodHistory.innerHTML = last30Days.map(mood => {
            const moodEmojis = ['😢', '😕', '😐', '😊', '😄'];
            return `<div class="mood-day" title="${mood.date}">${moodEmojis[mood.value - 1]}</div>`;
        }).join('');
    }

    // Finance Functions
    addExpense() {
        const description = document.getElementById('expenseDescription').value;
        const amount = parseFloat(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        
        if (!description || !amount) {
            alert('Please fill in all fields');
            return;
        }
        
        const expense = {
            id: Date.now(),
            description,
            amount,
            category,
            date: new Date().toISOString().split('T')[0]
        };
        
        this.data.finance.expenses.push(expense);
        this.updateBudgetSpent();
        this.saveData();
        this.renderExpenses();
        this.updateBudgetDisplay();
        this.renderBudgetCategories();
        
        // Clear form
        document.getElementById('expenseDescription').value = '';
        document.getElementById('expenseAmount').value = '';
        
        this.addActivity(`Added expense: ${description} $${amount}`);
    }

    updateBudgetSpent() {
        // Reset spent amounts
        Object.keys(this.data.finance.budget.categories).forEach(category => {
            this.data.finance.budget.categories[category].spent = 0;
        });
        
        // Calculate spent amounts
        this.data.finance.expenses.forEach(expense => {
            if (this.data.finance.budget.categories[expense.category]) {
                this.data.finance.budget.categories[expense.category].spent += expense.amount;
            }
        });
    }

    renderExpenses() {
        const expenseList = document.getElementById('expenseList');
        const recentExpenses = this.data.finance.expenses.slice(-10).reverse();
        
        expenseList.innerHTML = recentExpenses.map(expense => `
            <div class="expense-item">
                <div class="expense-info">
                    <div class="expense-description">${expense.description}</div>
                    <div class="expense-category">${expense.category} • ${expense.date}</div>
                </div>
                <div class="expense-amount">$${expense.amount}</div>
            </div>
        `).join('');
    }

    renderBudgetCategories() {
        const budgetCategories = document.getElementById('budgetCategories');
        const categories = this.data.finance.budget.categories;
        
        budgetCategories.innerHTML = Object.entries(categories).map(([category, data]) => `
            <div class="budget-category">
                <span class="category-name">${category}</span>
                <span class="category-amount">$${data.spent} / $${data.limit}</span>
            </div>
        `).join('');
    }

    // Goals Functions
    addGoal() {
        const title = document.getElementById('goalTitle').value;
        const description = document.getElementById('goalDescription').value;
        const deadline = document.getElementById('goalDeadline').value;
        const category = document.getElementById('goalCategory').value;
        
        if (!title || !deadline) {
            alert('Please fill in title and deadline');
            return;
        }
        
        const goal = {
            id: Date.now(),
            title,
            description,
            category,
            deadline,
            progress: 0,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        this.data.goals.push(goal);
        this.saveData();
        this.renderGoals();
        this.updateGoalsProgress();
        
        // Clear form
        document.getElementById('goalTitle').value = '';
        document.getElementById('goalDescription').value = '';
        document.getElementById('goalDeadline').value = '';
        
        this.addActivity(`Added new goal: ${title}`);
    }

    renderGoals() {
        const goalsList = document.getElementById('goalsList');
        
        goalsList.innerHTML = this.data.goals.map(goal => `
            <div class="goal-item">
                <div class="goal-info">
                    <div class="goal-title">${goal.title}</div>
                    <div class="goal-category">${goal.category} • Due: ${goal.deadline}</div>
                    <div class="goal-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${goal.progress}%"></div>
                        </div>
                        <span>${goal.progress}% complete</span>
                    </div>
                </div>
                <div class="goal-actions">
                    <button onclick="dashboard.updateGoalProgress(${goal.id}, ${Math.min(goal.progress + 10, 100)})">+10%</button>
                    ${!goal.completed ? `<button onclick="dashboard.completeGoal(${goal.id})">Complete</button>` : '<span>✓ Done</span>'}
                </div>
            </div>
        `).join('');
    }

    updateGoalProgress(goalId, newProgress) {
        const goal = this.data.goals.find(g => g.id === goalId);
        if (goal) {
            goal.progress = Math.min(newProgress, 100);
            if (goal.progress === 100) {
                goal.completed = true;
                goal.completedAt = new Date().toISOString();
            }
            this.saveData();
            this.renderGoals();
            this.updateGoalsProgress();
        }
    }

    completeGoal(goalId) {
        const goal = this.data.goals.find(g => g.id === goalId);
        if (goal) {
            goal.completed = true;
            goal.progress = 100;
            goal.completedAt = new Date().toISOString();
            this.saveData();
            this.renderGoals();
            this.updateGoalsProgress();
            this.addActivity(`Completed goal: ${goal.title}`);
        }
    }

    // Habits Functions
    addHabit() {
        const name = document.getElementById('habitName').value;
        const frequency = document.getElementById('habitFrequency').value;
        
        if (!name) {
            alert('Please enter a habit name');
            return;
        }
        
        const habit = {
            id: Date.now(),
            name,
            frequency,
            streak: 0,
            completedToday: false,
            createdAt: new Date().toISOString()
        };
        
        this.data.habits.push(habit);
        this.saveData();
        this.renderHabits();
        this.updateHabitStreak();
        
        // Clear form
        document.getElementById('habitName').value = '';
        
        this.addActivity(`Added new habit: ${name}`);
    }

    renderHabits() {
        const habitsList = document.getElementById('habitsList');
        
        habitsList.innerHTML = this.data.habits.map(habit => `
            <div class="habit-item">
                <div class="habit-info">
                    <div class="habit-name">${habit.name}</div>
                    <div class="habit-frequency">${habit.frequency} • ${habit.streak} day streak</div>
                </div>
                <div class="habit-checkbox ${habit.completedToday ? 'completed' : ''}" 
                     onclick="dashboard.toggleHabit(${habit.id})">
                    ${habit.completedToday ? '✓' : ''}
                </div>
            </div>
        `).join('');
    }

    toggleHabit(habitId) {
        const habit = this.data.habits.find(h => h.id === habitId);
        if (habit) {
            habit.completedToday = !habit.completedToday;
            if (habit.completedToday) {
                habit.streak++;
                this.addActivity(`Completed habit: ${habit.name}`);
            } else {
                habit.streak = Math.max(0, habit.streak - 1);
            }
            this.saveData();
            this.renderHabits();
            this.updateHabitStreak();
        }
    }

    // Schedule Functions
    addEvent() {
        const title = document.getElementById('eventTitle').value;
        const time = document.getElementById('eventTime').value;
        const date = document.getElementById('eventDate').value;
        const description = document.getElementById('eventDescription').value;
        
        if (!title || !time || !date) {
            alert('Please fill in title, time, and date');
            return;
        }
        
        const event = {
            id: Date.now(),
            title,
            time,
            date,
            description,
            createdAt: new Date().toISOString()
        };
        
        this.data.schedule.push(event);
        this.saveData();
        this.renderSchedule();
        
        // Clear form
        document.getElementById('eventTitle').value = '';
        document.getElementById('eventTime').value = '';
        document.getElementById('eventDate').value = '';
        document.getElementById('eventDescription').value = '';
        
        this.addActivity(`Added event: ${title}`);
    }

    renderSchedule() {
        const scheduleList = document.getElementById('scheduleList');
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = this.data.schedule
            .filter(event => event.date === today)
            .sort((a, b) => a.time.localeCompare(b.time));
        
        if (todayEvents.length === 0) {
            scheduleList.innerHTML = '<p>No events scheduled for today</p>';
            return;
        }
        
        scheduleList.innerHTML = todayEvents.map(event => `
            <div class="event-item">
                <div class="event-info">
                    <div class="event-title">${event.title}</div>
                    <div class="event-time">${event.time} ${event.description ? '• ' + event.description : ''}</div>
                </div>
            </div>
        `).join('');
    }

    // Utility Functions
    addActivity(text) {
        this.data.activities.unshift({
            text,
            timestamp: Date.now(),
            time: 'Just now'
        });
        
        // Keep only last 50 activities
        this.data.activities = this.data.activities.slice(0, 50);
        this.saveData();
    }

    renderAllSections() {
        this.renderExpenses();
        this.renderBudgetCategories();
        this.renderGoals();
        this.renderHabits();
        this.renderSchedule();
        this.renderMoodHistory();
        
        // Set today's date as default for event form
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('eventDate').value = today;
    }
}

// Global functions for onclick handlers
let dashboard;

function updateMetric(metric) {
    const input = document.getElementById(`${metric}Input`);
    dashboard.updateMetric(metric, parseFloat(input.value) || 0);
}

function addExpense() {
    dashboard.addExpense();
}

function addGoal() {
    dashboard.addGoal();
}

function addHabit() {
    dashboard.addHabit();
}

function addEvent() {
    dashboard.addEvent();
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    dashboard = new LifeDashboard();
});