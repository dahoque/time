class TimeTracker {
    constructor() {
        this.tasks = this.loadTasks();
        this.currentTask = null;
        this.startTime = null;
        this.timerInterval = null;
        this.elapsedTime = 0;
        this.todaySessions = this.loadTodaySessions();
        
        this.init();
    }

    init() {
        this.updateDate();
        this.renderTasks();
        this.renderStats();
        this.renderHistory();
        this.setupEventListeners();
        this.loadCurrentTask();
    }

    // Default tasks
    getDefaultTasks() {
        return [
            { id: 1, name: "Sleep", color: "#2196F3", icon: "fas fa-bed", time: 0 },
            { id: 2, name: "Office", color: "#4CAF50", icon: "fas fa-briefcase", time: 0 },
            { id: 3, name: "Play", color: "#FF9800", icon: "fas fa-gamepad", time: 0 },
            { id: 4, name: "Study", color: "#9C27B0", icon: "fas fa-book", time: 0 },
            { id: 5, name: "Cook", color: "#F44336", icon: "fas fa-utensils", time: 0 }
        ];
    }

    // Data persistence
    loadTasks() {
        const saved = localStorage.getItem('timeTrackerTasks');
        return saved ? JSON.parse(saved) : this.getDefaultTasks();
    }

    saveTasks() {
        localStorage.setItem('timeTrackerTasks', JSON.stringify(this.tasks));
    }

    loadTodaySessions() {
        const today = new Date().toDateString();
        const saved = localStorage.getItem(`timeTrackerSessions_${today}`);
        return saved ? JSON.parse(saved) : [];
    }

    saveTodaySessions() {
        const today = new Date().toDateString();
        localStorage.setItem(`timeTrackerSessions_${today}`, JSON.stringify(this.todaySessions));
    }

    loadCurrentTask() {
        const saved = localStorage.getItem('currentTask');
        if (saved) {
            const data = JSON.parse(saved);
            this.currentTask = this.tasks.find(t => t.id === data.id);
            this.elapsedTime = data.elapsedTime;
            this.startTimer();
        }
    }

    saveCurrentTask() {
        if (this.currentTask) {
            const data = {
                id: this.currentTask.id,
                elapsedTime: this.elapsedTime,
                startTime: this.startTime
            };
            localStorage.setItem('currentTask', JSON.stringify(data));
        }
    }

    // Task management
    addTask(name, color) {
        if (!name.trim()) return;
        
        const newTask = {
            id: Date.now(),
            name: name.trim(),
            color,
            icon: "fas fa-tasks",
            time: 0
        };
        
        this.tasks.push(newTask);
        this.saveTasks();
        this.renderTasks();
        this.selectTask(newTask.id);
    }

    selectTask(taskId) {
        if (this.currentTask && this.currentTask.id === taskId) return;
        
        this.stopTimer();
        this.currentTask = this.tasks.find(t => t.id === taskId);
        this.elapsedTime = 0;
        this.startTimer();
        this.renderTasks();
        this.updateCurrentTaskDisplay();
    }

    // Timer functionality
    startTimer() {
        if (!this.currentTask || this.timerInterval) return;
        
        if (!this.startTime) {
            this.startTime = Date.now() - this.elapsedTime;
        }
        
        this.timerInterval = setInterval(() => {
            this.elapsedTime = Date.now() - this.startTime;
            this.updateTimerDisplay();
            this.saveCurrentTask();
        }, 1000);
        
        this.updateButtons(true);
    }

    stopTimer() {
        if (!this.timerInterval) return;
        
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        
        if (this.currentTask && this.elapsedTime > 0) {
            this.saveSession();
        }
        
        this.updateButtons(false);
    }

    resetTimer() {
        this.stopTimer();
        this.elapsedTime = 0;
        this.startTime = null;
        this.currentTask = null;
        localStorage.removeItem('currentTask');
        this.updateCurrentTaskDisplay();
        this.updateTimerDisplay();
    }

    // Session management
    saveSession() {
        if (!this.currentTask || this.elapsedTime < 1000) return;
        
        const session = {
            taskId: this.currentTask.id,
            taskName: this.currentTask.name,
            taskColor: this.currentTask.color,
            duration: this.elapsedTime,
            startTime: this.startTime,
            endTime: Date.now()
        };
        
        this.todaySessions.push(session);
        
        // Update task total time
        const taskIndex = this.tasks.findIndex(t => t.id === this.currentTask.id);
        if (taskIndex !== -1) {
            this.tasks[taskIndex].time += this.elapsedTime;
        }
        
        this.saveTasks();
        this.saveTodaySessions();
        this.renderStats();
        this.renderHistory();
    }

    // Display updates
    updateDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
    }

    updateTimerDisplay() {
        const timerElement = document.getElementById('currentTimer');
        const hours = Math.floor(this.elapsedTime / 3600000);
        const minutes = Math.floor((this.elapsedTime % 3600000) / 60000);
        const seconds = Math.floor((this.elapsedTime % 60000) / 1000);
        
        timerElement.textContent = 
            `${hours.toString().padStart(2, '0')}:` +
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}`;
    }

    updateCurrentTaskDisplay() {
        const taskNameElement = document.getElementById('currentTaskName');
        taskNameElement.textContent = this.currentTask ? 
            this.currentTask.name : 'No active task';
        taskNameElement.style.color = this.currentTask ? 
            this.currentTask.color : '#4CAF50';
    }

    updateButtons(isRunning) {
        const startBtn = document.getElementById('startBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        startBtn.disabled = isRunning || !this.currentTask;
        stopBtn.disabled = !isRunning;
        
        if (isRunning) {
            startBtn.innerHTML = '<i class="fas fa-pause"></i> Pause';
        } else {
            startBtn.innerHTML = '<i class="fas fa-play"></i> Start';
        }
    }

    // Render methods
    renderTasks() {
        const container = document.getElementById('taskButtons');
        container.innerHTML = '';
        
        this.tasks.forEach(task => {
            const button = document.createElement('button');
            button.className = `task-btn ${this.currentTask && this.currentTask.id === task.id ? 'active' : ''}`;
            button.style.background = task.color;
            button.innerHTML = `
                <i class="${task.icon}"></i>
                <span>${task.name}</span>
            `;
            button.onclick = () => this.selectTask(task.id);
            container.appendChild(button);
        });
    }

    renderStats() {
        const container = document.getElementById('statsGrid');
        container.innerHTML = '';
        
        this.tasks.forEach(task => {
            const totalMs = this.todaySessions
                .filter(s => s.taskId === task.id)
                .reduce((sum, s) => sum + s.duration, 0) + task.time;
            
            const hours = Math.floor(totalMs / 3600000);
            const minutes = Math.floor((totalMs % 3600000) / 60000);
            
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <div class="stat-color" style="background: ${task.color}"></div>
                <div class="stat-info">
                    <h4>${task.name}</h4>
                    <p>${hours}h ${minutes}m</p>
                </div>
            `;
            container.appendChild(card);
        });
        
        this.updateTotalTime();
    }

    updateTotalTime() {
        const totalMs = this.todaySessions.reduce((sum, s) => sum + s.duration, 0);
        const hours = Math.floor(totalMs / 3600000);
        const minutes = Math.floor((totalMs % 3600000) / 60000);
        const seconds = Math.floor((totalMs % 60000) / 1000);
        
        document.getElementById('totalTime').textContent = 
            `${hours.toString().padStart(2, '0')}:` +
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}`;
    }

    renderHistory() {
        const container = document.getElementById('historyList');
        container.innerHTML = '';
        
        const sortedSessions = [...this.todaySessions].sort((a, b) => b.endTime - a.endTime);
        
        sortedSessions.slice(0, 10).forEach(session => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            const durationHours = Math.floor(session.duration / 3600000);
            const durationMinutes = Math.floor((session.duration % 3600000) / 60000);
            const durationSeconds = Math.floor((session.duration % 60000) / 1000);
            
            const startTime = new Date(session.startTime);
            const timeString = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            item.innerHTML = `
                <div class="history-task">
                    <div class="history-color" style="background: ${session.taskColor}"></div>
                    <span>${session.taskName}</span>
                </div>
                <div class="history-details">
                    <span class="history-time">${timeString}</span>
                    <span class="history-duration">
                        ${durationHours}h ${durationMinutes}m ${durationSeconds}s
                    </span>
                </div>
            `;
            container.appendChild(item);
        });
        
        if (sortedSessions.length === 0) {
            container.innerHTML = '<p class="no-history">No sessions recorded today.</p>';
        }
    }

    // Event listeners
    setupEventListeners() {
        // Start/Stop buttons
        document.getElementById('startBtn').addEventListener('click', () => {
            if (!this.currentTask) return;
            if (this.timerInterval) {
                this.stopTimer();
            } else {
                this.startTimer();
            }
        });
        
        document.getElementById('stopBtn').addEventListener('click', () => this.stopTimer());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetTimer());
        
        // Add task button
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            const nameInput = document.getElementById('newTaskName');
            const colorInput = document.getElementById('newTaskColor');
            this.addTask(nameInput.value, colorInput.value);
            nameInput.value = '';
            colorInput.value = '#4CAF50';
        });
        
        // Enter key for adding task
        document.getElementById('newTaskName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('addTaskBtn').click();
            }
        });
        
        // Save data before page unload
        window.addEventListener('beforeunload', () => {
            this.saveCurrentTask();
        });
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    new TimeTracker();
});
