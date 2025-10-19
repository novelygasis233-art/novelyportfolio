// ==================== Data Storage ====================
const Storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

// ==================== State Management ====================
const state = {
  tasks: Storage.get('tasks') || [],
  habits: Storage.get('habits') || [],
  waterCount: Storage.get('waterCount') || 0,
  mood: Storage.get('mood') || null,
  notes: Storage.get('notes') || '',
  theme: Storage.get('theme') || 'light',
  lastDate: Storage.get('lastDate') || getTodayDate()
};

// ==================== Utility Functions ====================
function getTodayDate() {
  return new Date().toLocaleDateString('en-US');
}

function checkNewDay() {
  const today = getTodayDate();
  if (state.lastDate !== today) {
    // Reset daily data
    state.waterCount = 0;
    state.mood = null;
    state.lastDate = today;
    
    // Reset habit completion
    state.habits.forEach(habit => habit.completedToday = false);
    
    // Save new state
    Storage.set('waterCount', 0);
    Storage.set('mood', null);
    Storage.set('lastDate', today);
    Storage.set('habits', state.habits);
    
    return true;
  }
  return false;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning! ☀️';
  if (hour < 18) return 'Good Afternoon! 🌤️';
  return 'Good Evening! 🌙';
}

function formatDate() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  return new Date().toLocaleDateString('en-US', options);
}

// ==================== Theme Toggle ====================
function initTheme() {
  if (state.theme === 'dark') {
    document.body.classList.add('dark-theme');
    document.getElementById('theme-toggle').querySelector('.theme-icon').textContent = '☀️';
  }
}

document.getElementById('theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  state.theme = isDark ? 'dark' : 'light';
  Storage.set('theme', state.theme);
  document.getElementById('theme-toggle').querySelector('.theme-icon').textContent = isDark ? '☀️' : '🌙';
});

// ==================== Tasks Management ====================
function renderTasks() {
  const taskList = document.getElementById('task-list');
  const completedCount = state.tasks.filter(t => t.completed).length;
  const totalCount = state.tasks.length;
  
  document.getElementById('task-counter').textContent = `${completedCount} / ${totalCount}`;
  document.getElementById('tasks-completed').textContent = completedCount;
  
  if (state.tasks.length === 0) {
    taskList.innerHTML = '<li class="empty-state">No tasks yet. Add one to get started! 📝</li>';
    return;
  }
  
  taskList.innerHTML = state.tasks.map((task, index) => `
    <li class="task-item ${task.completed ? 'completed' : ''}">
      <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} 
             onchange="toggleTask(${index})">
      <span class="task-text">${task.text}</span>
      <button class="task-delete" onclick="deleteTask(${index})">🗑️</button>
    </li>
  `).join('');
}

function addTask() {
  const input = document.getElementById('task-input');
  const text = input.value.trim();
  
  if (!text) return;
  
  state.tasks.push({ text, completed: false, createdAt: Date.now() });
  Storage.set('tasks', state.tasks);
  input.value = '';
  renderTasks();
}

function toggleTask(index) {
  state.tasks[index].completed = !state.tasks[index].completed;
  Storage.set('tasks', state.tasks);
  renderTasks();
}

function deleteTask(index) {
  state.tasks.splice(index, 1);
  Storage.set('tasks', state.tasks);
  renderTasks();
}

document.getElementById('add-task-btn').addEventListener('click', addTask);
document.getElementById('task-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addTask();
});

// ==================== Water Tracker ====================
function renderWater() {
  const waterGoal = 8;
  const progress = Math.min((state.waterCount / waterGoal) * 100, 100);
  
  document.getElementById('water-progress').style.width = `${progress}%`;
  document.getElementById('water-count').textContent = state.waterCount;
  
  const glassesContainer = document.getElementById('water-glasses');
  glassesContainer.innerHTML = Array(waterGoal).fill(0).map((_, i) => 
    `<span class="water-glass ${i < state.waterCount ? 'filled' : ''}">💧</span>`
  ).join('');
}

document.getElementById('add-water').addEventListener('click', () => {
  if (state.waterCount < 8) {
    state.waterCount++;
    Storage.set('waterCount', state.waterCount);
    renderWater();
  }
});

document.getElementById('remove-water').addEventListener('click', () => {
  if (state.waterCount > 0) {
    state.waterCount--;
    Storage.set('waterCount', state.waterCount);
    renderWater();
  }
});

document.getElementById('reset-water').addEventListener('click', () => {
  if (confirm('Reset water tracker for today?')) {
    state.waterCount = 0;
    Storage.set('waterCount', 0);
    renderWater();
  }
});

// ==================== Mood Tracker ====================
function renderMood() {
  const moodIcon = document.getElementById('mood-icon');
  if (state.mood) {
    moodIcon.textContent = state.mood;
    document.querySelectorAll('.mood-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.mood === state.mood);
    });
  }
}

document.querySelectorAll('.mood-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.mood = btn.dataset.mood;
    Storage.set('mood', state.mood);
    renderMood();
  });
});

// ==================== Habits Tracker ====================
function renderHabits() {
  const habitsList = document.getElementById('habits-list');
  
  if (state.habits.length === 0) {
    habitsList.innerHTML = '<li class="empty-state">No habits tracked yet. Start building good habits! 🌱</li>';
    document.getElementById('habit-streak').textContent = '0';
    return;
  }
  
  const maxStreak = Math.max(...state.habits.map(h => h.streak || 0), 0);
  document.getElementById('habit-streak').textContent = maxStreak;
  
  habitsList.innerHTML = state.habits.map((habit, index) => `
    <li class="habit-item">
      <div class="habit-info">
        <div class="habit-name">${habit.name}</div>
        <div class="habit-streak">🔥 ${habit.streak || 0} day streak</div>
      </div>
      <div class="habit-actions">
        <button class="habit-check ${habit.completedToday ? 'done' : ''}" 
                onclick="completeHabit(${index})"
                ${habit.completedToday ? 'disabled' : ''}>
          ${habit.completedToday ? '✓ Done' : 'Complete'}
        </button>
        <button class="habit-delete" onclick="deleteHabit(${index})">🗑️</button>
      </div>
    </li>
  `).join('');
}

function addHabit() {
  const input = document.getElementById('habit-input');
  const name = input.value.trim();
  
  if (!name) return;
  
  state.habits.push({ 
    name, 
    streak: 0, 
    completedToday: false,
    lastCompleted: null,
    createdAt: Date.now()
  });
  Storage.set('habits', state.habits);
  input.value = '';
  renderHabits();
}

function completeHabit(index) {
  const habit = state.habits[index];
  if (habit.completedToday) return;
  
  habit.completedToday = true;
  habit.streak = (habit.streak || 0) + 1;
  habit.lastCompleted = getTodayDate();
  
  Storage.set('habits', state.habits);
  renderHabits();
}

function deleteHabit(index) {
  if (confirm('Delete this habit?')) {
    state.habits.splice(index, 1);
    Storage.set('habits', state.habits);
    renderHabits();
  }
}

document.getElementById('add-habit-btn').addEventListener('click', addHabit);
document.getElementById('habit-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') addHabit();
});

// ==================== Notes ====================
const notesArea = document.getElementById('notes-area');
notesArea.value = state.notes;

notesArea.addEventListener('input', (e) => {
  state.notes = e.target.value;
  Storage.set('notes', state.notes);
});

document.getElementById('clear-notes').addEventListener('click', () => {
  if (confirm('Clear all notes?')) {
    notesArea.value = '';
    state.notes = '';
    Storage.set('notes', '');
  }
});

// ==================== Inspirational Quotes ====================
const quotes = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Believe in yourself. You are braver than you think, more talented than you know, and capable of more than you imagine.", author: "Roy T. Bennett" },
  { text: "I learned that courage was not the absence of fear, but the triumph over it.", author: "Nelson Mandela" },
  { text: "The only impossible journey is the one you never begin.", author: "Tony Robbins" },
  { text: "Your limitation—it's only your imagination.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
  { text: "The harder you work for something, the greater you'll feel when you achieve it.", author: "Unknown" },
  { text: "Don't stop when you're tired. Stop when you're done.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "Do something today that your future self will thank you for.", author: "Unknown" },
  { text: "Little things make big days.", author: "Unknown" },
  { text: "It's going to be hard, but hard does not mean impossible.", author: "Unknown" },
  { text: "Don't wait for opportunity. Create it.", author: "Unknown" }
];

function displayRandomQuote() {
  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
  document.getElementById('quote-text').textContent = randomQuote.text;
  document.getElementById('quote-author').textContent = `— ${randomQuote.author}`;
}

document.getElementById('new-quote').addEventListener('click', displayRandomQuote);

// ==================== Initialization ====================
function init() {
  // Check if it's a new day
  checkNewDay();
  
  // Initialize theme
  initTheme();
  
  // Set date and greeting
  document.getElementById('current-date').textContent = formatDate();
  document.getElementById('greeting').textContent = getGreeting();
  document.getElementById('year').textContent = new Date().getFullYear();
  
  // Render all components
  renderTasks();
  renderWater();
  renderMood();
  renderHabits();
  displayRandomQuote();
}

// Start the app
init();

// Check for new day every minute
setInterval(() => {
  if (checkNewDay()) {
    init();
  }
}, 60000);
