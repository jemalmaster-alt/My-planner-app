document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const daySelector = document.getElementById('day-selector');
    const currentDayTitle = document.getElementById('current-day-title');
    const taskList = document.getElementById('task-list');
    const addTaskForm = document.getElementById('add-task-form');
    const taskTextInput = document.getElementById('task-text-input');
    const taskTimeInput = document.getElementById('task-time-input');
    const mainContent = document.getElementById('main-content');

    // Settings Panel
    const settingsBtn = document.getElementById('settings-btn');
    const settingsPanel = document.getElementById('settings-panel');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const selectSoundBtn = document.getElementById('select-sound-btn');
    const alarmSoundPicker = document.getElementById('alarm-sound-picker');
    const currentAlarmSoundEl = document.getElementById('current-alarm-sound');

    // Alarm Modal
    const alarmModalOverlay = document.getElementById('alarm-modal-overlay');
    const alarmModal = document.getElementById('alarm-modal');
    const alarmTaskText = document.getElementById('alarm-task-text');
    const dismissAlarmBtn = document.getElementById('dismiss-alarm-btn');

    // App State
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let currentDay;
    let tasks = {};
    let alarmInterval;
    let customAlarmSound = null;
    let audioContext = new (window.AudioContext || window.webkitAudioContext)();

    // --- Core Functions ---
    function init() {
        const todayIndex = new Date().getDay();
        currentDay = daysOfWeek[todayIndex];
        loadData();
        renderDayTabs();
        renderTasks(true); // Initial render without animation
        setupEventListeners();
        startAlarmChecker();
        lucide.createIcons();
    }

    function renderDayTabs() {
        daySelector.innerHTML = '';
        daysOfWeek.forEach(day => {
            const isActive = day === currentDay;
            const button = document.createElement('button');
            button.textContent = day.substring(0, 3);
            button.className = `px-4 py-2 rounded-lg font-bold text-sm transition-all duration-300 transform hover:scale-105 ${
                isActive 
                ? 'bg-indigo-600 text-white shadow-lg' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`;
            button.onclick = () => changeDay(day);
            daySelector.appendChild(button);
        });
    }

    function renderTasks(isInitial = false) {
        currentDayTitle.textContent = `${currentDay}'s Plan`;
        if (!isInitial) {
            currentDayTitle.classList.add('content-enter');
            setTimeout(() => currentDayTitle.classList.remove('content-enter'), 400);
        }

        taskList.innerHTML = '';
        const dayTasks = tasks[currentDay] || [];

        if (dayTasks.length === 0) {
            taskList.innerHTML = `<div class="text-center py-16 px-4 task-enter"><i data-lucide="sunrise" class="mx-auto h-16 w-16 text-slate-500"></i><p class="mt-4 text-slate-400">A fresh start. Add a task to begin.</p></div>`;
        } else {
            dayTasks.sort((a, b) => a.time.localeCompare(b.time));
            dayTasks.forEach((task, index) => {
                const taskEl = document.createElement('div');
                taskEl.className = `task-item bg-slate-800/50 p-4 rounded-lg flex items-center gap-4 border-l-4 transition-all duration-300 ${task.isComplete ? 'border-green-500 opacity-50' : 'border-slate-700'}`;
                if (!isInitial) {
                    taskEl.classList.add('task-enter');
                    taskEl.style.animationDelay = `${index * 50}ms`;
                }

                taskEl.innerHTML = `
                    <div class="flex-grow cursor-pointer" onclick="toggleComplete('${currentDay}', ${task.id})">
                        <p class="font-semibold text-slate-100 ${task.isComplete ? 'line-through' : ''}">${task.text}</p>
                        <p class="text-sm text-slate-400">${formatTime(task.time)}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="toggleAlarm('${currentDay}', ${task.id})" class="${task.alarmSet ? 'text-indigo-400' : 'text-slate-500'} hover:text-indigo-400 p-2 rounded-full hover:bg-slate-700 transition-colors">
                            <i data-lucide="bell" class="${task.alarmSet ? 'fill-current' : ''}"></i>
                        </button>
                        <button onclick="deleteTask('${currentDay}', ${task.id})" class="text-slate-500 hover:text-red-400 p-2 rounded-full hover:bg-slate-700 transition-colors">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>`;
                taskList.appendChild(taskEl);
            });
        }
        lucide.createIcons();
    }

    // --- Data Persistence ---
    function saveData() {
        localStorage.setItem('plannerTasks', JSON.stringify(tasks));
        if (customAlarmSound) {
            localStorage.setItem('plannerAlarmSound', JSON.stringify({ name: customAlarmSound.name, data: customAlarmSound.data }));
        }
    }

    function loadData() {
        const savedTasks = localStorage.getItem('plannerTasks');
        tasks = savedTasks ? JSON.parse(savedTasks) : daysOfWeek.reduce((acc, day) => ({ ...acc, [day]: [] }), {});

        const savedSound = localStorage.getItem('plannerAlarmSound');
        if (savedSound) {
            customAlarmSound = JSON.parse(savedSound);
            currentAlarmSoundEl.textContent = customAlarmSound.name;
        }
    }

    // --- Event Handlers & Actions ---
    function setupEventListeners() {
        addTaskForm.addEventListener('submit', (e) => { e.preventDefault(); addTask(); });
        
        // Settings Panel Logic
        settingsBtn.onclick = () => settingsPanel.classList.remove('translate-x-full');
        closeSettingsBtn.onclick = () => settingsPanel.classList.add('translate-x-full');
        selectSoundBtn.onclick = () => alarmSoundPicker.click();
        alarmSoundPicker.onchange = handleSoundFile;
        
        // Modal Logic
        dismissAlarmBtn.onclick = hideAlarmModal;
        alarmModalOverlay.onclick = (e) => { if (e.target === alarmModalOverlay) hideAlarmModal(); };
    }

    async function changeDay(day) {
        if (day === currentDay) return;
        currentDayTitle.classList.add('content-exit');
        taskList.classList.add('content-exit');
        await new Promise(resolve => setTimeout(resolve, 300));
        currentDay = day;
        renderDayTabs();
        renderTasks();
    }
    
    // Make functions global for inline HTML onclick
    window.toggleComplete = (day, taskId) => {
        const task = tasks[day].find(t => t.id === taskId);
        if (task) {
            task.isComplete = !task.isComplete;
            saveData();
            const taskEl = event.target.closest('.task-item');
            taskEl.classList.toggle('border-green-500');
            taskEl.classList.toggle('border-slate-700');
            taskEl.classList.toggle('opacity-50');
            taskEl.querySelector('p:first-child').classList.toggle('line-through');
        }
    };
    
    window.toggleAlarm = (day, taskId) => {
        const task = tasks[day].find(t => t.id === taskId);
        if (task) {
            task.alarmSet = !task.alarmSet;
            saveData();
            renderTasks(); // Re-render for simplicity
        }
    };
    
    window.deleteTask = async (day, taskId) => {
        const taskEl = event.target.closest('.task-item');
        taskEl.classList.add('task-exit');
        await new Promise(resolve => setTimeout(resolve, 400));
        tasks[day] = tasks[day].filter(t => t.id !== taskId);
        saveData();
        renderTasks();
    };


    function addTask() {
        const text = taskTextInput.value.trim();
        const time = taskTimeInput.value;
        if (!text || !time) return;
        const newTask = { id: Date.now(), text, time, isComplete: false, alarmSet: true };
        if (!tasks[currentDay]) tasks[currentDay] = [];
        tasks[currentDay].push(newTask);
        saveData();
        renderTasks();
        addTaskForm.reset();
        taskTextInput.focus();
    }

    function handleSoundFile(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            customAlarmSound = {
                name: file.name,
                data: e.target.result,
            };
            currentAlarmSoundEl.textContent = file.name;
            saveData();
        };
        reader.readAsDataURL(file);
    }

    // --- Alarm & Modal Logic ---
    function startAlarmChecker() {
        if (alarmInterval) clearInterval(alarmInterval);
        alarmInterval = setInterval(checkAlarms, 10000); // Check every 10 seconds
    }

    function checkAlarms() {
        const now = new Date();
        const currentDayName = daysOfWeek[now.getDay()];
        const currentTime = now.toTimeString().substring(0, 5);
        (tasks[currentDayName] || []).forEach(task => {
            if (task.alarmSet && !task.isComplete && task.time === currentTime) {
                triggerAlarm(task);
                task.alarmSet = false;
                saveData();
                if (currentDay === currentDayName) renderTasks();
            }
        });
    }

    async function triggerAlarm(task) {
        if (customAlarmSound) {
            const response = await fetch(customAlarmSound.data);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start(0);
        } else {
            // Fallback beep
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            oscillator.start();
            oscillator.stop(audioContext.currentTime + 0.5);
        }
        showAlarmModal(task.text);
    }
    
    function showAlarmModal(taskText) {
        alarmTaskText.textContent = taskText;
        alarmModalOverlay.classList.remove('pointer-events-none');
        alarmModalOverlay.classList.add('opacity-100');
        alarmModal.classList.add('scale-100');
    }

    function hideAlarmModal() {
        alarmModalOverlay.classList.remove('opacity-100');
        alarmModal.classList.remove('scale-100');
        alarmModalOverlay.classList.add('pointer-events-none');
    }

    // --- Utility Functions ---
    function formatTime(timeString) {
        const [hourString, minute] = timeString.split(":");
        const hour = +hourString % 24;
        return `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"}`;
    }

    // --- App Start ---
    init();
});
