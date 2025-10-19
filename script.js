// Life Cycle Companion - Vanilla JS SPA
"use strict";

(function () {
  const STORAGE_KEY = "lcc_v1";

  const DEFAULT_STATE = {
    theme: "light",
    lastView: "today",
    habits: [], // {id, name, icon, records: {"YYYY-MM-DD": true}}
    tasks: [], // {id, title, dueDate, priority, done, createdAt}
    budget: { transactions: [], currency: "USD" }, // txn: {id, type, amount, category, date, note}
    wellness: {
      waterGoal: 8,
      water: {}, // {"YYYY-MM-DD": cups}
      sleep: {}, // {"YYYY-MM-DD": {bed:"HH:MM", wake:"HH:MM", hours:number}}
      mood: {} // {"YYYY-MM-DD": {value:1-5, note?:string}}
    },
    journal: [] // {id, title, content, tsISO}
  };

  // Utilities
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const todayStr = () => new Date().toISOString().slice(0, 10);
  const fmtDate = (s) => {
    if (!s) return "";
    const d = new Date(s);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  };
  const id = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}_${Date.now().toString(36)}`;

  const clamp = (n, a, b) => Math.min(Math.max(n, a), b);

  function getWeekDates(baseDateStr) {
    const base = baseDateStr ? new Date(baseDateStr) : new Date();
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    const day = d.getDay(); // 0 Sun ... 6 Sat
    const start = new Date(d);
    start.setDate(d.getDate() - day); // week starting Sunday
    const days = [];
    for (let i = 0; i < 7; i++) {
      const x = new Date(start);
      x.setDate(start.getDate() + i);
      days.push(x.toISOString().slice(0, 10));
    }
    return days;
  }

  // Simple data store
  class Store {
    constructor() {
      this.state = this.load();
    }
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return structuredClone(DEFAULT_STATE);
        const parsed = JSON.parse(raw);
        return mergeDeep(structuredClone(DEFAULT_STATE), parsed);
      } catch (e) {
        console.error("Failed to load state", e);
        return structuredClone(DEFAULT_STATE);
      }
    }
    save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (e) {
        console.error("Failed to save state", e);
      }
    }

    // Theme
    setTheme(theme) {
      this.state.theme = theme;
      this.save();
    }

    // View
    setLastView(view) {
      this.state.lastView = view;
      this.save();
    }

    // Habits
    addHabit(name, icon) {
      this.state.habits.push({ id: id("hab"), name, icon: icon || "✅", records: {} });
      this.save();
    }
    removeHabit(habitId) {
      this.state.habits = this.state.habits.filter((h) => h.id !== habitId);
      this.save();
    }
    toggleHabitOnDate(habitId, dateStr) {
      const h = this.state.habits.find((x) => x.id === habitId);
      if (!h) return;
      h.records[dateStr] = !h.records[dateStr];
      this.save();
    }

    // Tasks
    addTask(title, dueDate, priority) {
      this.state.tasks.push({ id: id("tsk"), title, dueDate: dueDate || "", priority: priority || "medium", done: false, createdAt: new Date().toISOString() });
      this.save();
    }
    toggleTask(taskId) {
      const t = this.state.tasks.find((x) => x.id === taskId);
      if (!t) return;
      t.done = !t.done;
      this.save();
    }
    removeTask(taskId) {
      this.state.tasks = this.state.tasks.filter((x) => x.id !== taskId);
      this.save();
    }

    // Budget
    addTxn(type, amount, category, date, note) {
      const a = Number(amount);
      if (!isFinite(a) || a <= 0) return;
      this.state.budget.transactions.push({ id: id("txn"), type, amount: a, category: category || "-", date: date || todayStr(), note: note || "" });
      this.save();
    }
    removeTxn(txnId) {
      this.state.budget.transactions = this.state.budget.transactions.filter((t) => t.id !== txnId);
      this.save();
    }
    setCurrency(ccy) {
      this.state.budget.currency = (ccy || "USD").slice(0, 8);
      this.save();
    }

    // Wellness
    setWaterGoal(goal) {
      this.state.wellness.waterGoal = clamp(Number(goal) || 8, 1, 30);
      this.save();
    }
    addWater(amount, dateStr = todayStr()) {
      const v = Number(amount) || 0;
      const cur = this.state.wellness.water[dateStr] || 0;
      this.state.wellness.water[dateStr] = clamp(cur + v, 0, 200);
      this.save();
    }
    setSleep(dateStr, bed, wake) {
      const hours = computeSleepHours(bed, wake);
      this.state.wellness.sleep[dateStr] = { bed, wake, hours };
      this.save();
    }
    setMood(dateStr, value, note) {
      this.state.wellness.mood[dateStr] = { value: Number(value), note: note || "" };
      this.save();
    }

    // Journal
    addEntry(title, content) {
      this.state.journal.unshift({ id: id("jr"), title, content, tsISO: new Date().toISOString() });
      this.save();
    }
    removeEntry(entryId) {
      this.state.journal = this.state.journal.filter((e) => e.id !== entryId);
      this.save();
    }

    // Backup
    export() {
      return JSON.stringify(this.state, null, 2);
    }
    import(json) {
      const parsed = JSON.parse(json);
      // shallow validation
      if (!parsed || typeof parsed !== "object" || !("habits" in parsed && "tasks" in parsed)) {
        throw new Error("Invalid data");
      }
      this.state = mergeDeep(structuredClone(DEFAULT_STATE), parsed);
      this.save();
    }
    clear() {
      this.state = structuredClone(DEFAULT_STATE);
      this.save();
    }
  }

  function mergeDeep(target, source) {
    if (typeof target !== "object" || target === null) return source;
    if (typeof source !== "object" || source === null) return target;
    for (const key of Object.keys(source)) {
      if (Array.isArray(source[key])) {
        target[key] = source[key].slice();
      } else if (typeof source[key] === "object") {
        target[key] = mergeDeep(target[key] ?? {}, source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  function computeSleepHours(bed, wake) {
    // times like "23:00" and "07:30"; handle crossing midnight
    if (!bed || !wake) return 0;
    const [bh, bm] = bed.split(":" ).map(Number);
    const [wh, wm] = wake.split(":" ).map(Number);
    const b = bh * 60 + bm;
    const w = wh * 60 + wm;
    let diff = w - b;
    if (diff < 0) diff += 24 * 60;
    return Math.round((diff / 60) * 10) / 10;
  }

  // Global store
  const store = new Store();

  // Theme init
  function applyTheme() {
    const theme = store.state.theme || "light";
    document.body.setAttribute("data-theme", theme);
    const pressed = theme === "dark";
    const btn = $("#themeToggle");
    if (btn) btn.setAttribute("aria-pressed", String(pressed));
  }

  // Router
  function switchView(view) {
    store.setLastView(view);
    $$(".view").forEach((v) => v.classList.remove("active"));
    $$(".tab").forEach((t) => { t.classList.remove("active"); t.setAttribute("aria-selected", "false"); });
    const vp = $(`#view-${view}`);
    const tb = $(`#tab-${view}`);
    if (vp) vp.classList.add("active");
    if (tb) { tb.classList.add("active"); tb.setAttribute("aria-selected", "true"); }

    // Render on view change
    render(view);
  }

  function render(view) {
    switch (view) {
      case "today": renderToday(); break;
      case "habits": renderHabits(); break;
      case "tasks": renderTasks(); break;
      case "budget": renderBudget(); break;
      case "wellness": renderWellness(); break;
      case "journal": renderJournal(); break;
      case "settings": renderSettings(); break;
    }
  }

  // Toast
  let toastTimer;
  function showToast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2000);
  }

  // Today
  function renderToday() {
    const datePill = $("#todayDate");
    datePill.textContent = new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

    // Tasks due today
    const list = $("#todayTasksList");
    list.innerHTML = "";
    const tdy = todayStr();
    const tasks = store.state.tasks
      .filter((t) => !t.done && t.dueDate && t.dueDate === tdy)
      .sort((a,b) => (a.priority > b.priority ? -1 : 1));

    if (tasks.length === 0) {
      const li = document.createElement("li");
      li.className = "muted";
      li.textContent = "No tasks due today.";
      list.appendChild(li);
    } else {
      for (const t of tasks) {
        const li = document.createElement("li");
        li.className = "list-item task-row";
        const title = document.createElement("div");
        title.className = "task-title title";
        title.textContent = t.title;
        const badge = document.createElement("span");
        badge.className = `badge ${t.priority}`;
        badge.textContent = t.priority;
        const btn = document.createElement("button");
        btn.className = "btn";
        btn.textContent = "Done";
        btn.addEventListener("click", () => { store.toggleTask(t.id); renderToday(); renderTasks(); });
        li.append(title, badge, btn);
        list.appendChild(li);
      }
    }

    // Quick add task
    $("#addQuickTaskBtn").onclick = () => {
      const title = prompt("Quick task title?");
      if (!title) return;
      store.addTask(title, tdy, "medium");
      renderToday();
      renderTasks();
      showToast("Task added for today");
    };

    // Habits quick toggle
    const hl = $("#todayHabitsList");
    hl.innerHTML = "";
    if (store.state.habits.length === 0) {
      const li = document.createElement("li");
      li.className = "muted";
      li.textContent = "No habits yet.";
      hl.appendChild(li);
    } else {
      for (const h of store.state.habits) {
        const li = document.createElement("li");
        li.className = "list-item";
        const ch = document.createElement("input");
        ch.type = "checkbox";
        ch.checked = !!h.records[todayStr()];
        ch.addEventListener("change", () => { store.toggleHabitOnDate(h.id, todayStr()); renderToday(); renderHabits(); });
        const name = document.createElement("div");
        name.className = "title";
        name.textContent = `${h.icon || "✅"} ${h.name}`;
        li.append(ch, name);
        hl.appendChild(li);
      }
    }

    // Wellness quicks
    const wc = store.state.wellness.water[todayStr()] || 0;
    $("#waterCount").textContent = String(wc);
    $("#waterGoal").textContent = `of ${store.state.wellness.waterGoal}`;
    $("#waterPlus").onclick = () => { store.addWater(1); renderToday(); renderWellness(); };
    $("#waterMinus").onclick = () => { store.addWater(-1); renderToday(); renderWellness(); };

    // Mood picker inline
    renderMoodPicker($("#moodPicker"), (val) => { store.setMood(todayStr(), val, ""); renderToday(); renderWellness(); showToast("Mood saved"); }, store.state.wellness.mood[todayStr()]?.value);

    // Sleep inline
    const sleepForm = $("#todaySleepForm");
    sleepForm.onsubmit = (e) => {
      e.preventDefault();
      const bed = $("#sleepBed").value;
      const wake = $("#sleepWake").value;
      store.setSleep(todayStr(), bed, wake);
      $("#sleepHours").textContent = `${store.state.wellness.sleep[todayStr()].hours}h`;
      renderWellness();
      showToast("Sleep logged");
      sleepForm.reset();
    };
    const sh = store.state.wellness.sleep[todayStr()]?.hours;
    $("#sleepHours").textContent = sh ? `${sh}h` : "";
  }

  // Habits
  function renderHabits() {
    const form = $("#habitForm");
    form.onsubmit = (e) => {
      e.preventDefault();
      const name = $("#habitName").value.trim();
      const icon = $("#habitIcon").value.trim();
      if (!name) return;
      store.addHabit(name, icon);
      form.reset();
      renderHabits();
      renderToday();
      showToast("Habit added");
    };

    const container = $("#habitsContainer");
    container.innerHTML = "";

    if (store.state.habits.length === 0) {
      const div = document.createElement("div");
      div.className = "muted";
      div.textContent = "Add your first habit above.";
      container.appendChild(div);
      return;
    }

    const week = getWeekDates();
    for (const h of store.state.habits) {
      const card = document.createElement("div");
      card.className = "habit";
      const icon = document.createElement("div");
      icon.textContent = h.icon || "✅";
      const body = document.createElement("div");
      const name = document.createElement("div");
      name.className = "name";
      name.textContent = h.name;
      const weekEl = document.createElement("div");
      weekEl.className = "week";
      for (const d of week) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "day";
        btn.setAttribute("aria-pressed", String(!!h.records[d]));
        btn.classList.toggle("done", !!h.records[d]);
        const ds = new Date(d);
        btn.title = `${ds.toLocaleDateString(undefined, { weekday: 'short' })} ${ds.getDate()}`;
        btn.textContent = ds.toLocaleDateString(undefined, { weekday: 'narrow' });
        btn.addEventListener("click", () => { store.toggleHabitOnDate(h.id, d); renderHabits(); renderToday(); });
        weekEl.appendChild(btn);
      }
      const actions = document.createElement("div");
      actions.className = "habit-actions";
      const del = document.createElement("button");
      del.className = "text-btn";
      del.textContent = "Remove";
      del.addEventListener("click", () => {
        if (confirm("Remove habit?")) { store.removeHabit(h.id); renderHabits(); renderToday(); }
      });
      actions.appendChild(del);
      body.append(name, weekEl, actions);
      card.append(icon, body);
      container.appendChild(card);
    }
  }

  // Tasks
  let currentTaskFilter = "all"; // all | today | overdue | completed
  function renderTasks() {
    const form = $("#taskForm");
    form.onsubmit = (e) => {
      e.preventDefault();
      const title = $("#taskTitle").value.trim();
      const due = $("#taskDue").value;
      const prio = $("#taskPriority").value;
      if (!title) return;
      store.addTask(title, due, prio);
      form.reset();
      renderTasks();
      renderToday();
      showToast("Task added");
    };

    // Filters
    $$(".filters .chip").forEach((c) => c.onclick = () => { $$(".filters .chip").forEach(x => x.classList.remove("active")); c.classList.add("active"); currentTaskFilter = c.dataset.filter; renderTasks(); });
    const prFilt = $("#priorityFilter");
    prFilt.onchange = () => renderTasks();

    const list = $("#tasksList");
    list.innerHTML = "";
    let tasks = store.state.tasks.slice();

    // Apply filters
    const tdy = todayStr();
    if (currentTaskFilter === "today") tasks = tasks.filter((t) => t.dueDate === tdy);
    if (currentTaskFilter === "overdue") tasks = tasks.filter((t) => t.dueDate && t.dueDate < tdy && !t.done);
    if (currentTaskFilter === "completed") tasks = tasks.filter((t) => t.done);

    const pf = prFilt.value;
    if (pf !== "any") tasks = tasks.filter((t) => t.priority === pf);

    // Sort: undone first, then dueDate asc, then priority high->low, then created desc
    const prRank = { high: 3, medium: 2, low: 1 };
    tasks.sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const ad = a.dueDate || "9999-12-31";
      const bd = b.dueDate || "9999-12-31";
      if (ad !== bd) return ad < bd ? -1 : 1;
      if (a.priority !== b.priority) return prRank[b.priority] - prRank[a.priority];
      return b.createdAt.localeCompare(a.createdAt);
    });

    if (tasks.length === 0) {
      const li = document.createElement("li");
      li.className = "muted";
      li.textContent = "No tasks match the filter.";
      list.appendChild(li);
      return;
    }

    for (const t of tasks) {
      const li = document.createElement("li");
      li.className = `list-item task-row ${t.done ? "done" : ""}`;
      const cb = document.createElement("input");
      cb.type = "checkbox"; cb.checked = t.done;
      cb.addEventListener("change", () => { store.toggleTask(t.id); renderTasks(); renderToday(); });
      const title = document.createElement("div");
      title.className = "task-title";
      title.textContent = t.title;
      const due = document.createElement("div");
      due.className = "muted";
      due.textContent = t.dueDate ? fmtDate(t.dueDate) : "No due";
      const badge = document.createElement("span");
      badge.className = `badge ${t.priority}`;
      badge.textContent = t.priority;
      const del = document.createElement("button");
      del.className = "icon-btn";
      del.textContent = "✕";
      del.title = "Delete";
      del.addEventListener("click", () => { if (confirm("Delete task?")) { store.removeTask(t.id); renderTasks(); renderToday(); } });
      li.append(cb, title, due, badge, del);
      list.appendChild(li);
    }
  }

  // Budget
  function renderBudget() {
    const monthEl = $("#budgetMonth");
    const currencyEl = $("#budgetCurrency");
    const now = new Date();
    const curMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (!monthEl.value) monthEl.value = curMonth;
    if (!currencyEl.value) currencyEl.value = store.state.budget.currency || "USD";

    currencyEl.onchange = () => { store.setCurrency(currencyEl.value); renderBudget(); };
    monthEl.onchange = () => renderBudget();

    const [year, month] = monthEl.value.split("-").map(Number);
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const txns = store.state.budget.transactions.filter((t) => {
      const d = new Date(t.date);
      return d >= start && d <= end;
    });

    const income = txns.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = txns.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;

    const fmt = (n) => new Intl.NumberFormat(undefined, { style: "currency", currency: store.state.budget.currency || "USD" }).format(n || 0);
    $("#sumIncome").textContent = fmt(income);
    $("#sumExpenses").textContent = fmt(expense);
    $("#sumBalance").textContent = fmt(balance);

    // Add transaction form
    const f = $("#txnForm");
    if (!$("#txnDate").value) $("#txnDate").value = todayStr();
    f.onsubmit = (e) => {
      e.preventDefault();
      const type = $("#txnType").value;
      const amount = $("#txnAmount").value;
      const cat = $("#txnCategory").value;
      const date = $("#txnDate").value || todayStr();
      const note = $("#txnNote").value;
      store.addTxn(type, amount, cat, date, note);
      f.reset();
      renderBudget();
      showToast("Transaction added");
    };

    // List
    const list = $("#txnList");
    list.innerHTML = "";
    if (txns.length === 0) {
      const li = document.createElement("li");
      li.className = "muted";
      li.textContent = "No transactions for this month.";
      list.appendChild(li);
      return;
    }

    txns.sort((a,b) => a.date.localeCompare(b.date));
    for (const t of txns) {
      const li = document.createElement("li");
      li.className = `list-item txn ${t.type}`;
      const left = document.createElement("div");
      left.className = "title";
      left.textContent = `${t.category || "-"} · ${t.note || ""}`.trim();
      const date = document.createElement("div");
      date.className = "muted";
      date.textContent = fmtDate(t.date);
      const amt = document.createElement("div");
      amt.className = "amount";
      amt.textContent = (t.type === "expense" ? "−" : "+") + new Intl.NumberFormat(undefined, { style: "currency", currency: store.state.budget.currency || "USD" }).format(t.amount);
      const del = document.createElement("button");
      del.className = "icon-btn";
      del.textContent = "✕";
      del.addEventListener("click", () => { if (confirm("Delete transaction?")) { store.removeTxn(t.id); renderBudget(); } });
      li.append(left, date, amt, del);
      list.appendChild(li);
    }
  }

  // Wellness
  function renderWellness() {
    const goalEl = $("#waterGoalInput");
    if (!goalEl.value) goalEl.value = String(store.state.wellness.waterGoal);
    goalEl.onchange = () => { store.setWaterGoal(goalEl.value); renderWellness(); renderToday(); };

    const wc = store.state.wellness.water[todayStr()] || 0;
    $("#waterCount2").textContent = String(wc);
    $("#waterPlus2").onclick = () => { store.addWater(1); renderWellness(); renderToday(); };
    $("#waterMinus2").onclick = () => { store.addWater(-1); renderWellness(); renderToday(); };

    // Sleep
    if (!$("#sleepDate").value) $("#sleepDate").value = todayStr();
    const sf = $("#sleepForm");
    sf.onsubmit = (e) => {
      e.preventDefault();
      store.setSleep($("#sleepDate").value || todayStr(), $("#sleepBed2").value, $("#sleepWake2").value);
      sf.reset();
      renderWellness();
      showToast("Sleep saved");
    };

    const sleepList = $("#sleepList");
    sleepList.innerHTML = "";
    const entries = Object.entries(store.state.wellness.sleep)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a,b) => b.date.localeCompare(a.date))
      .slice(0, 10);
    for (const s of entries) {
      const li = document.createElement("li");
      li.className = "list-item";
      li.innerHTML = `<div class="title">${fmtDate(s.date)} · ${s.hours}h</div><div class="muted">${s.bed} → ${s.wake}</div>`;
      sleepList.appendChild(li);
    }

    // Mood
    if (!$("#moodDate").value) $("#moodDate").value = todayStr();
    renderMoodPicker($("#moodPicker2"), null, null); // ensure picker exists
    const mf = $("#moodForm");
    mf.onsubmit = (e) => {
      e.preventDefault();
      const date = $("#moodDate").value || todayStr();
      const val = $("#moodPicker2").querySelector('[aria-checked="true"]')?.dataset.value;
      if (!val) { alert("Pick a mood"); return; }
      const note = $("#moodNote").value;
      store.setMood(date, val, note);
      mf.reset();
      renderWellness();
      renderToday();
      showToast("Mood saved");
    };

    const moodList = $("#moodList");
    moodList.innerHTML = "";
    const moods = Object.entries(store.state.wellness.mood)
      .map(([date, v]) => ({ date, ...v }))
      .sort((a,b) => b.date.localeCompare(a.date))
      .slice(0, 14);
    for (const m of moods) {
      const li = document.createElement("li");
      li.className = "list-item";
      li.innerHTML = `<div class="title">${fmtDate(m.date)} · ${"😞😐🙂😄🤩"[m.value-1]}</div><div class="muted">${m.note || ""}</div>`;
      moodList.appendChild(li);
    }
  }

  function renderMoodPicker(rootEl, onPick, selectedValue) {
    if (!rootEl) return;
    rootEl.innerHTML = "";
    const moods = [
      { v: 1, e: "😞", l: "Very low" },
      { v: 2, e: "😐", l: "Low" },
      { v: 3, e: "🙂", l: "Neutral" },
      { v: 4, e: "😄", l: "Good" },
      { v: 5, e: "🤩", l: "Great" }
    ];
    for (const m of moods) {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "mood-btn"; btn.textContent = m.e;
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-label", m.l);
      btn.dataset.value = String(m.v);
      const sel = selectedValue ?? store.state.wellness.mood[todayStr()]?.value;
      btn.setAttribute("aria-checked", String(sel === m.v));
      btn.addEventListener("click", () => {
        $$(".mood-btn", rootEl).forEach(x => x.setAttribute("aria-checked", "false"));
        btn.setAttribute("aria-checked", "true");
        if (onPick) onPick(m.v);
      });
      rootEl.appendChild(btn);
    }
  }

  // Journal
  function renderJournal() {
    const form = $("#journalForm");
    form.onsubmit = (e) => {
      e.preventDefault();
      const title = $("#journalTitle").value.trim();
      const content = $("#journalContent").value.trim();
      if (!title || !content) return;
      store.addEntry(title, content);
      form.reset();
      renderJournal();
      showToast("Entry added");
    };

    const list = $("#journalList");
    list.innerHTML = "";
    if (store.state.journal.length === 0) {
      const li = document.createElement("li");
      li.className = "muted";
      li.textContent = "No entries yet.";
      list.appendChild(li);
      return;
    }

    for (const e of store.state.journal) {
      const li = document.createElement("li");
      li.className = "entry";
      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = new Date(e.tsISO).toLocaleString();
      const title = document.createElement("div"); title.className = "title"; title.textContent = e.title;
      const content = document.createElement("div"); content.textContent = e.content;
      const del = document.createElement("button"); del.className = "text-btn"; del.textContent = "Delete";
      del.addEventListener("click", () => { if (confirm("Delete entry?")) { store.removeEntry(e.id); renderJournal(); } });
      li.append(meta, title, content, del);
      list.appendChild(li);
    }
  }

  // Settings
  function renderSettings() {
    $("#themeToggle2").onclick = toggleTheme;

    $("#exportBtn").onclick = () => {
      const blob = new Blob([store.export()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `life-cycle-companion-${todayStr()}.json`; a.click();
      URL.revokeObjectURL(url);
      showToast("Exported JSON");
    };

    $("#importBtn").onclick = () => { $("#importFile").click(); };
    $("#importFile").onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          store.import(String(reader.result));
          applyTheme();
          render(store.state.lastView || "today");
          showToast("Import successful");
        } catch (err) {
          alert("Import failed: " + err.message);
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    };

    $("#clearBtn").onclick = () => {
      if (confirm("This will delete all your data. Continue?")) {
        store.clear();
        applyTheme();
        render(store.state.lastView || "today");
        showToast("All data cleared");
      }
    };
  }

  function toggleTheme() {
    const next = (store.state.theme === "dark") ? "light" : "dark";
    store.setTheme(next);
    applyTheme();
  }

  // App init
  function init() {
    // Theme
    applyTheme();

    // Footer year
    $("#year").textContent = String(new Date().getFullYear());

    // Tabs
    $$(".tab").forEach((btn) => btn.addEventListener("click", () => switchView(btn.dataset.view)));

    // Theme toggle
    $("#themeToggle").onclick = toggleTheme;

    // Jump manage link
    $$('[data-goto="habits"]').forEach((b) => b.addEventListener("click", () => switchView("habits")));

    // First render
    const initial = store.state.lastView || "today";
    switchView(initial);
  }

  // Start
  document.addEventListener("DOMContentLoaded", init);
})();
