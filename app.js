(function(){
  const STORAGE_KEY = 'lifecycle_planner_state_v1';

  function getTodayKey(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function parseDateToKey(dateStr){
    if(!dateStr) return null;
    try{ const d = new Date(dateStr); if(Number.isNaN(d.getTime())) return null; }catch{ return null }
    return dateStr; // already yyyy-mm-dd from <input type="date">
  }
  function formatDateHuman(dateStr){
    if(!dateStr) return '';
    try{
      const d = new Date(dateStr+'T00:00:00');
      return d.toLocaleDateString(undefined, { month:'short', day:'numeric'});
    }catch{ return dateStr }
  }

  const DefaultState = () => ({
    tasks: [],
    habits: [],
    wellness: {
      moodByDate: {},
      waterByDate: {},
      sleepHoursByDate: {}
    },
    today: { notes: '', focusTaskId: null },
    settings: {
      darkMode: null, // null = follow system
      pomodoro: { focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, longBreakEvery: 4, autoStartNext: false },
      dailyWaterGoal: 8
    },
    focus: {
      phase: 'focus', // focus|break|longBreak
      remainingMs: 25*60*1000,
      running: false,
      lastTickTs: null,
      completedFocusSessions: 0
    },
    version: 1
  });

  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw){
        return DefaultState();
      }
      const parsed = JSON.parse(raw);
      return migrateState(parsed);
    }catch{
      return DefaultState();
    }
  }
  function migrateState(state){
    if(!state || typeof state !== 'object') return DefaultState();
    // shallow normalization
    state.version ||= 1;
    state.tasks ||= [];
    state.habits ||= [];
    state.wellness ||= { moodByDate:{}, waterByDate:{}, sleepHoursByDate:{} };
    state.wellness.moodByDate ||= {};
    state.wellness.waterByDate ||= {};
    state.wellness.sleepHoursByDate ||= {};
    state.today ||= { notes:'', focusTaskId: null };
    state.settings ||= { darkMode:null, pomodoro:{ focusMinutes:25, breakMinutes:5, longBreakMinutes:15, longBreakEvery:4, autoStartNext:false }, dailyWaterGoal:8 };
    state.settings.pomodoro ||= { focusMinutes:25, breakMinutes:5, longBreakMinutes:15, longBreakEvery:4, autoStartNext:false };
    state.focus ||= { phase:'focus', remainingMs:25*60*1000, running:false, lastTickTs:null, completedFocusSessions:0 };
    return state;
  }

  let state = loadState();
  let saveTimer = null;
  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(()=>{
      try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch{}
    }, 200);
  }

  function uid(){ return Math.random().toString(36).slice(2, 10); }
  function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }

  // Appearance
  function applyTheme(){
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    const { darkMode } = state.settings;
    const body = document.body;
    body.classList.remove('dark','light');
    if(darkMode === true){ body.classList.add('dark'); }
    else if(darkMode === false){ body.classList.add('light'); }
    else { // follow system
      if(prefersLight){ body.classList.add('light'); } else { body.classList.add('dark'); }
    }
  }

  // Navigation
  const views = ['today','habits','tasks','focus','wellness','settings'];
  function switchView(view){
    for(const v of views){
      const section = document.getElementById(`view-${v}`);
      const btn = document.querySelector(`.tab-button[data-view="${v}"]`);
      if(!section || !btn) continue;
      const active = v === view;
      section.hidden = !active;
      section.classList.toggle('active', active);
      btn.classList.toggle('active', active);
    }
  }

  // RENDERERS
  function renderToday(){
    const todayKey = getTodayKey();
    document.getElementById('today-date').textContent = new Date().toLocaleDateString(undefined,{weekday:'long', month:'long', day:'numeric'});

    const list = document.getElementById('today-task-list');
    list.innerHTML = '';
    const todays = state.tasks.filter(t => (t.isToday === true || t.dueDate === todayKey) && t.status !== 'done');
    if(todays.length === 0){
      const li = document.createElement('li');
      li.className = 'muted';
      li.textContent = 'No tasks for today — add one!';
      list.appendChild(li);
    }else{
      for(const t of todays){
        const li = document.createElement('li');
        li.dataset.id = t.id;
        const checkbox = document.createElement('input'); checkbox.type='checkbox'; checkbox.checked = t.status==='done'; checkbox.setAttribute('aria-label','Mark done');
        const title = document.createElement('div'); title.className='title'; title.textContent = t.title;
        const meta = document.createElement('div'); meta.className='meta';
        if(t.priority && t.priority!=='normal'){
          const p = document.createElement('span'); p.className='tag'; p.textContent = t.priority==='high' ? 'High' : 'Low'; meta.appendChild(p);
        }
        if(t.dueDate){ const d = document.createElement('span'); d.className='tag'; d.textContent = formatDateHuman(t.dueDate); meta.appendChild(d); }
        const removeToday = document.createElement('button'); removeToday.className='btn'; removeToday.textContent='− Today'; removeToday.title='Remove from Today';
        const del = document.createElement('button'); del.className='btn danger'; del.textContent='Delete';
        li.append(checkbox, title, meta, removeToday, del);
        list.appendChild(li);
      }
    }

    // Notes
    const notes = document.getElementById('today-notes');
    notes.value = state.today.notes || '';

    // Water
    renderWater('water', 'water-count', 'water-progress', 'water-minus', 'water-plus');

    // Mood
    renderMood('mood-picker');

    // Mini timer mirrors focus timer
    updateTimerDisplays();
  }

  function renderHabits(){
    const headerWeek = document.getElementById('habit-week-label');
    const weekDates = getCurrentWeekDates();
    headerWeek.textContent = `${formatDateHuman(weekDates[0])} – ${formatDateHuman(weekDates[6])}`;

    const rows = document.getElementById('habit-rows');
    rows.innerHTML = '';
    for(const h of state.habits){
      const row = document.createElement('div');
      row.className = 'habit-row';

      const name = document.createElement('div'); name.textContent = h.name;
      const streak = document.createElement('div'); streak.className='tag'; streak.textContent = `Streak ${computeStreak(h)}`;

      const week = document.createElement('div'); week.className='week';
      for(const d of weekDates){
        const btn = document.createElement('button');
        btn.dataset.habitId = h.id;
        btn.dataset.date = d;
        const done = !!(h.history && h.history[d]);
        btn.className = done ? 'done' : '';
        btn.textContent = done ? '✓' : '';
        if(h.frequency==='weekly' && Array.isArray(h.daysOfWeek)){
          const dow = new Date(d+'T00:00:00').getDay();
          if(!h.daysOfWeek.includes(dow)){
            btn.disabled = true; btn.title='Not scheduled';
          }
        }
        week.appendChild(btn);
      }

      row.append(name, streak, week);
      rows.appendChild(row);
    }
  }

  function renderTasks(){
    const list = document.getElementById('task-list');
    const search = (document.getElementById('task-search').value || '').toLowerCase();
    const filter = document.getElementById('task-filter').value;

    const filtered = state.tasks.filter(t => {
      if(filter==='active' && t.status==='done') return false;
      if(filter==='done' && t.status!=='done') return false;
      if(search && !(`${t.title} ${t.notes||''}`).toLowerCase().includes(search)) return false;
      return true;
    });

    list.innerHTML = '';
    if(filtered.length===0){
      const li = document.createElement('li'); li.className='muted'; li.textContent='No tasks'; list.appendChild(li);
      return;
    }

    for(const t of filtered){
      const li = document.createElement('li'); li.dataset.id = t.id;
      const checkbox = document.createElement('input'); checkbox.type='checkbox'; checkbox.checked = t.status==='done'; checkbox.setAttribute('aria-label','Mark done');
      const title = document.createElement('div'); title.className='title'; title.textContent = t.title;
      const meta = document.createElement('div'); meta.className='meta';
      if(t.priority && t.priority!=='normal'){
        const p = document.createElement('span'); p.className='tag'; p.textContent = t.priority==='high' ? 'High' : 'Low'; meta.appendChild(p);
      }
      if(t.dueDate){ const d = document.createElement('span'); d.className='tag'; d.textContent = formatDateHuman(t.dueDate); meta.appendChild(d); }
      if(t.isToday){ const s = document.createElement('span'); s.className='tag'; s.textContent = 'Today'; meta.appendChild(s); }
      const toToday = document.createElement('button'); toToday.className='btn'; toToday.textContent = t.isToday ? '− Today' : '+ Today';
      const del = document.createElement('button'); del.className='btn danger'; del.textContent='Delete';
      li.append(checkbox, title, meta, toToday, del);
      list.appendChild(li);
    }
  }

  function renderFocus(){
    const select = document.getElementById('focus-task-select');
    const activeTasks = state.tasks.filter(t=>t.status!=='done');
    select.innerHTML = '<option value="">— No focus task —</option>' + activeTasks.map(t=>`<option value="${t.id}">${escapeHtml(t.title)}</option>`).join('');
    select.value = state.today.focusTaskId || '';

    updateTimerDisplays();
  }

  function renderWellness(){
    renderMood('wellness-mood-picker');
    renderWater('wellness-water', 'wellness-water-count', 'wellness-water-progress', 'wellness-water-minus', 'wellness-water-plus');

    const todayKey = getTodayKey();
    const input = document.getElementById('sleep-hours');
    input.value = state.wellness.sleepHoursByDate[todayKey] ?? '';
    const note = document.getElementById('sleep-note');
    const v = state.wellness.sleepHoursByDate[todayKey];
    note.textContent = v != null ? `${v} hours saved` : 'Not set';
  }

  function renderSettings(){
    document.getElementById('toggle-dark').checked = state.settings.darkMode === true;

    const p = state.settings.pomodoro;
    document.getElementById('set-focus-min').value = p.focusMinutes;
    document.getElementById('set-break-min').value = p.breakMinutes;
    document.getElementById('set-longbreak-min').value = p.longBreakMinutes;
    document.getElementById('set-longbreak-every').value = p.longBreakEvery;
    document.getElementById('set-auto-next').checked = !!p.autoStartNext;
  }

  function renderMood(pickerId){
    const todayKey = getTodayKey();
    const picker = document.getElementById(pickerId);
    if(!picker) return;
    const moods = [
      {v:1,l:'😞'},
      {v:2,l:'🙁'},
      {v:3,l:'😐'},
      {v:4,l:'🙂'},
      {v:5,l:'😄'},
    ];
    picker.innerHTML = '';
    for(const m of moods){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = m.l;
      btn.setAttribute('role','radio');
      btn.setAttribute('aria-checked', String(state.wellness.moodByDate[todayKey]===m.v));
      btn.dataset.mood = String(m.v);
      picker.appendChild(btn);
    }
  }

  function renderWater(prefix, countId, barId, minusId, plusId){
    const todayKey = getTodayKey();
    const goal = state.settings.dailyWaterGoal || 8;
    const current = clamp(Number(state.wellness.waterByDate[todayKey]||0), 0, 99);
    const pct = Math.min(100, Math.round((current/goal)*100));
    document.getElementById(countId).textContent = `${current} / ${goal} cups`;
    const bar = document.getElementById(barId); if(bar) bar.style.width = pct + '%';
    const minus = document.getElementById(minusId); const plus = document.getElementById(plusId);
    if(minus){ minus.onclick = ()=>{ state.wellness.waterByDate[todayKey] = clamp(current-1, 0, 999); scheduleSave(); renderToday(); renderWellness(); }}
    if(plus){ plus.onclick = ()=>{ state.wellness.waterByDate[todayKey] = clamp(current+1, 0, 999); scheduleSave(); renderToday(); renderWellness(); }}
  }

  // Focus timer
  let intervalId = null;
  function msForPhase(phase){
    const p = state.settings.pomodoro;
    if(phase==='focus') return p.focusMinutes*60*1000;
    if(phase==='longBreak') return p.longBreakMinutes*60*1000;
    return p.breakMinutes*60*1000; // break
  }
  function ensureTimerDefaults(){
    if(state.focus.remainingMs == null){ state.focus.remainingMs = msForPhase(state.focus.phase); }
  }
  function startTimer(){
    ensureTimerDefaults();
    if(state.focus.running) return;
    state.focus.running = true;
    state.focus.lastTickTs = Date.now();
    scheduleSave();
    runInterval();
  }
  function pauseTimer(){
    if(!state.focus.running) return;
    state.focus.running = false;
    scheduleSave();
    clearInterval(intervalId); intervalId = null;
  }
  function resetTimer(){
    state.focus.remainingMs = msForPhase(state.focus.phase);
    state.focus.running = false;
    state.focus.lastTickTs = null;
    scheduleSave();
    updateTimerDisplays();
  }
  function nextPhase(){
    if(state.focus.phase==='focus'){
      state.focus.completedFocusSessions = (state.focus.completedFocusSessions||0) + 1;
      const every = clamp(Number(state.settings.pomodoro.longBreakEvery||4), 2, 12);
      const nextIsLong = state.focus.completedFocusSessions % every === 0;
      state.focus.phase = nextIsLong ? 'longBreak' : 'break';
    }else{
      state.focus.phase = 'focus';
    }
    state.focus.remainingMs = msForPhase(state.focus.phase);
    state.focus.running = !!state.settings.pomodoro.autoStartNext;
    state.focus.lastTickTs = state.focus.running ? Date.now() : null;
    scheduleSave();
    if(state.focus.running) runInterval(); else clearInterval(intervalId), intervalId=null;
    beep();
    updateTimerDisplays();
  }
  function runInterval(){
    clearInterval(intervalId);
    intervalId = setInterval(()=>{
      if(!state.focus.running) return;
      const now = Date.now();
      const dt = now - (state.focus.lastTickTs || now);
      state.focus.lastTickTs = now;
      state.focus.remainingMs = Math.max(0, state.focus.remainingMs - dt);
      if(state.focus.remainingMs === 0){
        state.focus.running = false; // stop before switching
        nextPhase();
      }
      updateTimerDisplays();
    }, 500);
  }
  function mmss(ms){
    const total = Math.ceil(ms/1000);
    const m = Math.floor(total/60); const s = total % 60; return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  function updateTimerDisplays(){
    ensureTimerDefaults();
    const phaseLabel = state.focus.phase==='focus' ? 'Focus' : (state.focus.phase==='break' ? 'Break' : 'Long break');
    const big = document.getElementById('focus-timer'); if(big) big.textContent = mmss(state.focus.remainingMs);
    const mini = document.getElementById('mini-timer'); if(mini) mini.textContent = mmss(state.focus.remainingMs);
    const phase = document.getElementById('focus-phase'); if(phase) phase.textContent = phaseLabel;
    const sessionInfo = document.getElementById('session-info'); if(sessionInfo) sessionInfo.textContent = `Session ${state.focus.completedFocusSessions}`;
  }

  function beep(){
    try{
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type='sine'; o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      o.start(); o.stop(ctx.currentTime + 0.3);
    }catch{}
  }

  // UTIL
  function escapeHtml(s){
    return String(s).replace(/[&<>"]+/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }

  function computeStreak(habit){
    const today = new Date(getTodayKey()+"T00:00:00");
    let streak = 0;
    for(let i=0;i<365;i++){
      const d = new Date(today); d.setDate(today.getDate()-i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if(habit.frequency==='weekly' && Array.isArray(habit.daysOfWeek)){
        const dow = d.getDay();
        if(!habit.daysOfWeek.includes(dow)) continue; // skip non-scheduled
      }
      if(habit.history && habit.history[key]) streak++; else break;
    }
    return streak;
  }

  function getCurrentWeekDates(){
    const today = new Date(getTodayKey()+"T00:00:00");
    const day = today.getDay(); // 0 Sun .. 6 Sat
    const mondayOffset = day === 0 ? -6 : 1 - day; // to Monday
    const monday = new Date(today); monday.setDate(today.getDate()+mondayOffset);
    const days = [];
    for(let i=0;i<7;i++){
      const d = new Date(monday); d.setDate(monday.getDate()+i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      days.push(key);
    }
    return days;
  }

  // EVENT WIRING
  function wireNav(){
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.addEventListener('click', ()=>{
        switchView(btn.dataset.view);
      });
    });
  }

  function wireToday(){
    document.getElementById('today-quick-add').addEventListener('submit', e => {
      e.preventDefault();
      const title = document.getElementById('today-quick-title').value.trim();
      if(!title) return;
      state.tasks.unshift({ id: uid(), title, notes:'', dueDate: getTodayKey(), priority:'normal', status:'todo', isToday:true, createdAt: Date.now(), updatedAt: Date.now() });
      document.getElementById('today-quick-title').value = '';
      scheduleSave();
      renderToday(); renderTasks();
    });

    document.getElementById('today-task-list').addEventListener('click', e => {
      const li = e.target.closest('li'); if(!li) return;
      const id = li.dataset.id; const task = state.tasks.find(t=>t.id===id); if(!task) return;
      if(e.target.matches('input[type="checkbox"]')){
        task.status = e.target.checked ? 'done' : 'todo'; task.updatedAt = Date.now();
        scheduleSave(); renderToday(); renderTasks();
      }else if(e.target.matches('.btn.danger')){
        state.tasks = state.tasks.filter(t=>t.id!==id); scheduleSave(); renderToday(); renderTasks();
      }else if(e.target.matches('.btn')){
        task.isToday = false; scheduleSave(); renderToday(); renderTasks();
      }
    });

    document.getElementById('today-notes').addEventListener('input', e => {
      state.today.notes = e.target.value; scheduleSave();
    });

    document.getElementById('mini-start').addEventListener('click', ()=> startTimer());
    document.getElementById('mini-pause').addEventListener('click', ()=> pauseTimer());
    document.getElementById('mini-open').addEventListener('click', ()=> { switchView('focus'); });

    document.getElementById('mood-picker').addEventListener('click', e => {
      const btn = e.target.closest('button'); if(!btn) return;
      const v = Number(btn.dataset.mood);
      const todayKey = getTodayKey();
      state.wellness.moodByDate[todayKey] = v; scheduleSave(); renderToday(); renderWellness();
    });
  }

  function wireHabits(){
    const freq = document.getElementById('habit-frequency');
    const dow = document.getElementById('habit-dow');
    freq.addEventListener('change', ()=>{
      dow.hidden = freq.value !== 'weekly';
    });

    document.getElementById('habit-form').addEventListener('submit', e => {
      e.preventDefault();
      const name = document.getElementById('habit-name').value.trim(); if(!name) return;
      const frequency = document.getElementById('habit-frequency').value;
      const daysOfWeek = Array.from(dow.querySelectorAll('input:checked')).map(i=>Number(i.value));
      state.habits.push({ id: uid(), name, frequency, daysOfWeek, history:{} });
      document.getElementById('habit-name').value=''; dow.querySelectorAll('input').forEach(i=>i.checked=false);
      scheduleSave(); renderHabits();
    });

    document.getElementById('habit-rows').addEventListener('click', e => {
      const btn = e.target.closest('button'); if(!btn) return;
      const id = btn.dataset.habitId; const date = btn.dataset.date;
      const habit = state.habits.find(h=>h.id===id); if(!habit) return;
      habit.history ||= {};
      habit.history[date] = !habit.history[date];
      scheduleSave(); renderHabits();
    });
  }

  function wireTasks(){
    document.getElementById('task-form').addEventListener('submit', e => {
      e.preventDefault();
      const title = document.getElementById('task-title').value.trim(); if(!title) return;
      const dueDate = parseDateToKey(document.getElementById('task-due').value);
      const priority = document.getElementById('task-priority').value;
      const isToday = document.getElementById('task-today').checked;
      state.tasks.unshift({ id: uid(), title, notes:'', dueDate, priority, status:'todo', isToday, createdAt: Date.now(), updatedAt: Date.now() });
      e.target.reset();
      scheduleSave(); renderTasks(); renderToday(); renderFocus();
    });

    document.getElementById('task-search').addEventListener('input', ()=> renderTasks());
    document.getElementById('task-filter').addEventListener('change', ()=> renderTasks());

    document.getElementById('task-list').addEventListener('click', e => {
      const li = e.target.closest('li'); if(!li) return; const id = li.dataset.id; const task = state.tasks.find(t=>t.id===id); if(!task) return;
      if(e.target.matches('input[type="checkbox"]')){
        task.status = e.target.checked ? 'done' : 'todo'; task.updatedAt = Date.now();
        scheduleSave(); renderTasks(); renderToday(); renderFocus();
      }else if(e.target.matches('.btn.danger')){
        state.tasks = state.tasks.filter(t=>t.id!==id); scheduleSave(); renderTasks(); renderToday(); renderFocus();
      }else if(e.target.matches('.btn')){
        task.isToday = !task.isToday; scheduleSave(); renderTasks(); renderToday();
      }
    });
  }

  function wireFocus(){
    document.getElementById('focus-start').addEventListener('click', ()=> startTimer());
    document.getElementById('focus-pause').addEventListener('click', ()=> pauseTimer());
    document.getElementById('focus-reset').addEventListener('click', ()=> resetTimer());
    document.getElementById('focus-next').addEventListener('click', ()=> nextPhase());
    document.getElementById('focus-task-select').addEventListener('change', e => {
      state.today.focusTaskId = e.target.value || null; scheduleSave();
    });
  }

  function wireWellness(){
    document.getElementById('wellness-mood-picker').addEventListener('click', e => {
      const btn = e.target.closest('button'); if(!btn) return; const v = Number(btn.dataset.mood);
      const todayKey = getTodayKey(); state.wellness.moodByDate[todayKey] = v; scheduleSave(); renderWellness(); renderToday();
    });
    document.getElementById('wellness-water-minus').addEventListener('click', ()=>{}); // handlers bound in renderWater
    document.getElementById('wellness-water-plus').addEventListener('click', ()=>{});
    document.getElementById('save-sleep').addEventListener('click', ()=>{
      const v = Number(document.getElementById('sleep-hours').value);
      const todayKey = getTodayKey();
      if(!Number.isNaN(v)){
        state.wellness.sleepHoursByDate[todayKey] = clamp(v, 0, 24);
        scheduleSave(); renderWellness();
      }
    });
  }

  function wireSettings(){
    document.getElementById('toggle-dark').addEventListener('change', e => {
      state.settings.darkMode = e.target.checked ? true : null; // checked=true forces dark; unchecked=follow system
      scheduleSave(); applyTheme();
    });
    const ids = ['set-focus-min','set-break-min','set-longbreak-min','set-longbreak-every','set-auto-next'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener(el.type==='checkbox'?'change':'input', ()=>{
        const p = state.settings.pomodoro;
        p.focusMinutes = clamp(Number(document.getElementById('set-focus-min').value||25), 1, 240);
        p.breakMinutes = clamp(Number(document.getElementById('set-break-min').value||5), 1, 120);
        p.longBreakMinutes = clamp(Number(document.getElementById('set-longbreak-min').value||15), 1, 180);
        p.longBreakEvery = clamp(Number(document.getElementById('set-longbreak-every').value||4), 2, 24);
        p.autoStartNext = !!document.getElementById('set-auto-next').checked;
        // Reset the remaining time for current phase when settings change
        state.focus.remainingMs = msForPhase(state.focus.phase);
        scheduleSave(); updateTimerDisplays();
      });
    });

    document.getElementById('export-data').addEventListener('click', ()=>{
      const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download=`lifecycle-planner-${getTodayKey()}.json`; a.click();
      setTimeout(()=>URL.revokeObjectURL(url), 3000);
    });

    document.getElementById('import-data').addEventListener('change', async (e)=>{
      const file = e.target.files && e.target.files[0]; if(!file) return;
      try{
        const text = await file.text();
        const imported = JSON.parse(text);
        state = migrateState(imported);
        scheduleSave();
        applyTheme(); renderAll();
        alert('Import complete');
      }catch(err){ alert('Invalid file'); }
      e.target.value = '';
    });

    document.getElementById('reset-data').addEventListener('click', ()=>{
      if(confirm('Reset all data? This cannot be undone.')){
        state = DefaultState(); scheduleSave(); applyTheme(); renderAll();
      }
    });
  }

  function renderAll(){
    renderToday(); renderHabits(); renderTasks(); renderFocus(); renderWellness(); renderSettings();
  }

  function init(){
    applyTheme();
    wireNav(); wireToday(); wireHabits(); wireTasks(); wireFocus(); wireWellness(); wireSettings();
    renderAll();
    if(state.focus.running){ runInterval(); }
  }
  document.addEventListener('DOMContentLoaded', init);
})();
