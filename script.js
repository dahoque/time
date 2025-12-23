class TimeTracker {
    constructor() {
        this.tasks = this.loadTasks();
        this.timeEntries = this.loadAllTimeEntries();
        this.currentTask = null;
        this.startTime = null;
        this.timerInterval = null;
        this.elapsedTime = 0;
        this.todaySessions = this.loadTodaySessions();
        
        // Log viewer state
        this.currentFilter = {
            dateFrom: null,
            dateTo: null,
            taskId: 'all'
        };
        this.currentPage = 1;
        this.entriesPerPage = 10;
        
        this.init();
    }

    init() {
        this.updateDate();
        this.renderTasks();
        this.renderTaskDropdowns();
        this.renderStats();
        this.renderHistory();
        this.setupEventListeners();
        this.loadCurrentTask();
        this.renderLog();
        this.setDefaultFilterDates();
    }

    // Default tasks
    getDefaultTasks() {
        return [
            { id: 1, name: "Sleep", color: "#2196F50", icon: "fas fa-bed", time: 0 },
            { id: 2, name: "Office", color: "#4CAF50", icon: "fas fa-briefcase", time: 0 },
            { id: 3, name: "Play", color: "#FF9800", icon: "fas fa-gamepad", time: 0 },
            { id: 4, name: "Study", color: "#9C27B0", icon: "fas fa-book", time: 0 },
            { id: 5, name: "Cook", color: "#F44336", icon: "fas fa-utensils", time: 0 }
        ];
    }

    // Data persistence for manual entries
    loadAllTimeEntries() {
        const saved = localStorage.getItem('timeTrackerAllEntries');
        return saved ? JSON.parse(saved) : [];
    }

    saveAllTimeEntries() {
        localStorage.setItem('timeTrackerAllEntries', JSON.stringify(this.timeEntries));
        this.calculateTaskTotals(); // Recalculate task totals
    }

    calculateTaskTotals() {
        // Reset all task times
        this.tasks.forEach(task => task.time = 0);
        
        // Calculate from manual entries
        this.timeEntries.forEach(entry => {
            const task = this.tasks.find(t => t.id === entry.taskId);
            if (task) {
                task.time += entry.duration;
            }
        });
        
        // Calculate from today's sessions
        const today = new Date().toDateString();
        const todaySessions = this.loadTodaySessions();
        todaySessions.forEach(session => {
            const task = this.tasks.find(t => t.id === session.taskId);
            if (task) {
                task.time += session.duration;
            }
        });
        
        this.saveTasks();
    }

    // Load/save tasks (existing)
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

    // Manual time entry methods
    addManualEntry() {
        const taskId = parseInt(document.getElementById('manualTask').value);
        const date = document.getElementById('manualDate').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        const durationHours = parseInt(document.getElementById('durationHours').value) || 0;
        const durationMinutes = parseInt(document.getElementById('durationMinutes').value) || 0;
        const notes = document.getElementById('manualNotes').value.trim();
        
        if (!taskId || !date) {
            alert('Please select a task and date.');
            return;
        }

        // Calculate duration from start/end time OR direct duration input
        let duration;
        if (startTime && endTime) {
            const startDateTime = new Date(`${date}T${startTime}`);
            const endDateTime = new Date(`${date}T${endTime}`);
            duration = endDateTime - startDateTime;
            
            if (duration <= 0) {
                alert('End time must be after start time.');
                return;
            }
        } else if (durationHours > 0 || durationMinutes > 0) {
            duration = (durationHours * 3600000) + (durationMinutes * 60000);
        } else {
            alert('Please enter either start/end time OR duration.');
            return;
        }

        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const entry = {
            id: Date.now(),
            taskId: taskId,
            taskName: task.name,
            taskColor: task.color,
            date: date,
            startTime: startTime,
            endTime: endTime,
            duration: duration,
            notes: notes,
            createdAt: new Date().toISOString(),
            type: 'manual'
        };

        this.timeEntries.push(entry);
        this.saveAllTimeEntries();
        this.renderLog();
        this.renderStats();
        
        // Reset form
        document.getElementById('manualDate').value = '';
        document.getElementById('manualNotes').value = '';
        document.getElementById('durationHours').value = '';
        document.getElementById('durationMinutes').value = '';
        
        alert('Time entry saved successfully!');
    }

    deleteTimeEntry(entryId) {
        if (confirm('Are you sure you want to delete this time entry?')) {
            this.timeEntries = this.timeEntries.filter(entry => entry.id !== entryId);
            this.saveAllTimeEntries();
            this.renderLog();
            this.renderStats();
        }
    }

    editTimeEntry(entryId) {
        const entry = this.timeEntries.find(e => e.id === entryId);
        if (!entry) return;

        // Populate manual entry form with entry data
        document.getElementById('manualTask').value = entry.taskId;
        document.getElementById('manualDate').value = entry.date;
        document.getElementById('startTime').value = entry.startTime || '';
        document.getElementById('endTime').value = entry.endTime || '';
        
        const hours = Math.floor(entry.duration / 3600000);
        const minutes = Math.floor((entry.duration % 3600000) / 60000);
        document.getElementById('durationHours').value = hours;
        document.getElementById('durationMinutes').value = minutes;
        
        document.getElementById('manualNotes').value = entry.notes || '';
        
        // Change save button to update
        const saveBtn = document.getElementById('saveManualEntry');
        saveBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Update Entry';
        saveBtn.onclick = () => this.updateManualEntry(entryId);
        
        // Scroll to manual entry section
        document.querySelector('.manual-entry').scrollIntoView({ behavior: 'smooth' });
    }

    updateManualEntry(entryId) {
        // Similar to addManualEntry but updates existing entry
        const taskId = parseInt(document.getElementById('manualTask').value);
        const date = document.getElementById('manualDate').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        const durationHours = parseInt(document.getElementById('durationHours').value) || 0;
        const durationMinutes = parseInt(document.getElementById('durationMinutes').value) || 0;
        const notes = document.getElementById('manualNotes').value.trim();
        
        if (!taskId || !date) {
            alert('Please select a task and date.');
            return;
        }

        let duration;
        if (startTime && endTime) {
            const startDateTime = new Date(`${date}T${startTime}`);
            const endDateTime = new Date(`${date}T${endTime}`);
            duration = endDateTime - startDateTime;
            
            if (duration <= 0) {
                alert('End time must be after start time.');
                return;
            }
        } else if (durationHours > 0 || durationMinutes > 0) {
            duration = (durationHours * 3600000) + (durationMinutes * 60000);
        } else {
            alert('Please enter either start/end time OR duration.');
            return;
        }

        const entryIndex = this.timeEntries.findIndex(e => e.id === entryId);
        if (entryIndex === -1) return;

        const task = this.tasks.find(t => t.id === taskId);
        
        this.timeEntries[entryIndex] = {
            ...this.timeEntries[entryIndex],
            taskId: taskId,
            taskName: task.name,
            taskColor: task.color,
            date: date,
            startTime: startTime,
            endTime: endTime,
            duration: duration,
            notes: notes,
            updatedAt: new Date().toISOString()
        };

        this.saveAllTimeEntries();
        this.renderLog();
        this.renderStats();
        
        // Reset form and button
        this.resetManualForm();
        alert('Time entry updated successfully!');
    }

    resetManualForm() {
        document.getElementById('manualDate').value = '';
        document.getElementById('startTime').value = '09:00';
        document.getElementById('endTime').value = '17:00';
        document.getElementById('durationHours').value = '';
        document.getElementById('durationMinutes').value = '';
        document.getElementById('manualNotes').value = '';
        
        const saveBtn = document.getElementById('saveManualEntry');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Save Time Entry';
        saveBtn.onclick = () => this.addManualEntry();
    }

    // Log viewer methods
    setDefaultFilterDates() {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        
        document.getElementById('filterDateFrom').value = this.formatDateForInput(firstDay);
        document.getElementById('filterDateTo').value = this.formatDateForInput(today);
        
        this.currentFilter.dateFrom = firstDay;
        this.currentFilter.dateTo = today;
    }

    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    applyFilter() {
        const dateFrom = document.getElementById('filterDateFrom').value;
        const dateTo = document.getElementById('filterDateTo').value;
        const taskId = document.getElementById('filterTask').value;
        
        this.currentFilter = {
            dateFrom: dateFrom ? new Date(dateFrom) : null,
            dateTo: dateTo ? new Date(dateTo) : null,
            taskId: taskId
        };
        
        this.currentPage = 1;
        this.renderLog();
    }

    clearFilter() {
        this.setDefaultFilterDates();
        document.getElementById('filterTask').value = 'all';
        this.applyFilter();
    }

    getFilteredEntries() {
        return this.timeEntries.filter(entry => {
            // Filter by date
            const entryDate = new Date(entry.date);
            
            if (this.currentFilter.dateFrom && entryDate < this.currentFilter.dateFrom) {
                return false;
            }
            
            if (this.currentFilter.dateTo) {
                const filterEndDate = new Date(this.currentFilter.dateTo);
                filterEndDate.setHours(23, 59, 59, 999);
                if (entryDate > filterEndDate) {
                    return false;
                }
            }
            
            // Filter by task
            if (this.currentFilter.taskId !== 'all' && entry.taskId !== parseInt(this.currentFilter.taskId)) {
                return false;
            }
            
            return true;
        });
    }

    renderLog() {
        const filteredEntries = this.getFilteredEntries();
        const totalEntries = filteredEntries.length;
        const totalPages = Math.ceil(totalEntries / this.entriesPerPage);
        
        // Update page info
        document.getElementById('totalEntries').textContent = totalEntries;
        document.getElementById('pageInfo').textContent = `Page ${this.currentPage} of ${totalPages}`;
        
        // Calculate total time
        const totalDuration = filteredEntries.reduce((sum, entry) => sum + entry.duration, 0);
        const totalHours = Math.floor(totalDuration / 3600000);
        const totalMinutes = Math.floor((totalDuration % 3600000) / 60000);
        document.getElementById('totalFilteredTime').textContent = `${totalHours}h ${totalMinutes}m`;
        
        // Pagination
        const startIndex = (this.currentPage - 1) * this.entriesPerPage;
        const endIndex = startIndex + this.entriesPerPage;
        const pageEntries = filteredEntries.slice(startIndex, endIndex);
        
        // Render table
        const tbody = document.getElementById('logTableBody');
        
        if (pageEntries.length === 0) {
            tbody.innerHTML = `
                <tr class="empty-log">
                    <td colspan="7">
                        <i class="fas fa-clock"></i>
                        <p>No time entries found for the selected filter.</p>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = pageEntries.map(entry => {
                const hours = Math.floor(entry.duration / 3600000);
                const minutes = Math.floor((entry.duration % 3600000) / 60000);
                
                const formattedDate = new Date(entry.date).toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
                return `
                    <tr>
                        <td>${formattedDate}</td>
                        <td class="task-cell">
                            <span class="task-color" style="background: ${entry.taskColor}"></span>
                            ${entry.taskName}
                        </td>
                        <td>${entry.startTime || 'N/A'}</td>
                        <td>${entry.endTime || 'N/A'}</td>
                        <td class="duration-cell">${hours}h ${minutes}m</td>
                        <td class="notes-cell">${entry.notes || '-'}</td>
                        <td class="actions-cell">
                            <button class="btn-edit" onclick="timeTracker.editTimeEntry(${entry.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-delete" onclick="timeTracker.deleteTimeEntry(${entry.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
        
        // Enable/disable pagination buttons
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === totalPages || totalPages === 0;
    }

    // Export methods
    exportToCSV() {
        const filteredEntries = this.getFilteredEntries();
        
        if (filteredEntries.length === 0) {
            alert('No data to export.');
            return;
        }
        
        const headers = ['Date', 'Task', 'Start Time', 'End Time', 'Duration (hours)', 'Notes'];
        const csvData = filteredEntries.map(entry => {
            const hours = (entry.duration / 3600000).toFixed(2);
            return [
                `"${entry.date}"`,
                `"${entry.taskName}"`,
                `"${entry.startTime || ''}"`,
                `"${entry.endTime || ''}"`,
                hours,
                `"${entry.notes || ''}"`
            ];
        });
        
        const csvContent = [
            headers.join(','),
            ...csvData.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `time-log-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
    }

    exportToJSON() {
        const data = {
            exportDate: new Date().toISOString(),
            tasks: this.tasks,
            timeEntries: this.timeEntries,
            totalEntries: this.timeEntries.length,
            totalDuration: this.timeEntries.reduce((sum, entry) => sum + entry.duration, 0)
        };
        
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `time-log-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    }

    // Task management (existing methods)
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
        this.renderTaskDropdowns();
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

    // Timer functionality (existing)
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
        this.saveTodaySessions();
        
        // Update task total time
        const taskIndex = this.tasks.findIndex(t => t.id === this.currentTask.id);
        if (taskIndex !== -1) {
            this.tasks[taskIndex].time += this.elapsedTime;
        }
        
        this.saveTasks();
        this.renderStats();
        this.renderHistory();
    }

    // Display updates (existing)
    updateDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', options);
        
        // Set today's date in manual entry form
        document.getElementById('manualDate').value = this.formatDateForInput(now);
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

    renderTaskDropdowns() {
        const manualSelect = document.getElementById('manualTask');
        const filterSelect = document.getElementById('filterTask');
        
        // Clear existing options (except "All" for filter)
        manualSelect.innerHTML = '<option value="">Select a task...</option>';
        filterSelect.innerHTML = '<option value="all">All Tasks</option>';
        
        this.tasks.forEach(task => {
            const option1 = document.createElement('option');
            option1.value = task.id;
            option1.textContent = task.name;
            manualSelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = task.id;
            option2.textContent = task.name;
            filterSelect.appendChild(option2);
        });
    }

    renderStats() {
        this.calculateTaskTotals(); // Recalculate from all entries
        
        const container = document.getElementById('statsGrid');
        container.innerHTML = '';
        
        this.tasks.forEach(task => {
            const totalHours = Math.floor(task.time / 3600000);
            const totalMinutes = Math.floor((task.time % 3600000) / 60000);
            
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <div class="stat-color" style="background: ${task.color}"></div>
                <div class="stat-info">
                    <h4>${task.name}</h4>
                    <p>${totalHours}h ${totalMinutes}m</p>
                </div>
            `;
            container.appendChild(card);
        });
        
        this.updateTotalTime();
    }

    updateTotalTime() {
        const totalMs = this.timeEntries.reduce((sum, entry) => sum + entry.duration, 0) +
                       this.todaySessions.reduce((sum, session) => sum + session.duration, 0);
        
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
        const allSessions = [
            ...this.timeEntries.map(entry => ({
                ...entry,
                type: 'manual'
            })),
            ...this.todaySessions.map(session => ({
                ...session,
                date: new Date(session.startTime).toLocaleDateString('en-US'),
                type: 'timer'
            }))
        ];
        
        const sortedSessions = allSessions.sort((a, b) => {
            const dateA = a.type === 'manual' ? new Date(a.date) : new Date(a.startTime);
            const dateB = b.type === 'manual' ? new Date(b.date) : new Date(b.startTime);
            return dateB - dateA;
        });
        
        container.innerHTML = '';
        
        sortedSessions.slice(0, 10).forEach(session => {
            const item = document.createElement('div');
            item.className = 'history-item';
            
            const durationHours = Math.floor(session.duration / 3600000);
            const durationMinutes = Math.floor((session.duration % 3600000) / 60000);
            const durationSeconds = Math.floor((session.duration % 60000) / 1000);
            
            const dateStr = session.type === 'manual' 
                ? new Date(session.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                })
                : new Date(session.startTime).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            
            item.innerHTML = `
                <div class="history-task">
                    <div class="history-color" style="background: ${session.taskColor}"></div>
                    <span>${session.taskName}</span>
                    <span class="history-type">${session.type === 'manual' ? '(Manual)' : ''}</span>
                </div>
                <div class="history-details">
                    <span class="history-time">${dateStr}</span>
                    <span class="history-duration">
                        ${durationHours}h ${durationMinutes}m
                    </span>
                </div>
            `;
            container.appendChild(item);
        });
        
        if (sortedSessions.length === 0) {
            container.innerHTML = '<p class="no-history">No sessions recorded yet.</p>';
        }
    }

    // Event listeners
    setupEventListeners() {
        // Timer controls
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
        
        // Manual entry
        document.getElementById('saveManualEntry').addEventListener('click', () => this.addManualEntry());
        
        // Log viewer controls
        document.getElementById('applyFilter').addEventListener('click', () => this.applyFilter());
        document.getElementById('clearFilter').addEventListener('click', () => this.clearFilter());
        document.getElementById('prevPage').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderLog();
            }
        });
        document.getElementById('nextPage').addEventListener('click', () => {
            const totalPages = Math.ceil(this.getFilteredEntries().length / this.entriesPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.renderLog();
            }
        });
        
        // Export controls
        document.getElementById('exportCSV').addEventListener('click', () => this.exportToCSV());
        document.getElementById('exportJSON').addEventListener('click', () => this.exportToJSON());
        document.getElementById('printLog').addEventListener('click', () => window.print());
        
        // Enter key for adding task
        document.getElementById('newTaskName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                document.getElementById('addTaskBtn').click();
            }
        });
        
        // Auto-calculate duration from start/end time
        document.getElementById('startTime').addEventListener('change', () => this.calculateDuration());
        document.getElementById('endTime').addEventListener('change', () => this.calculateDuration());
        
        // Auto-fill end time when duration is entered
        document.getElementById('durationHours').addEventListener('input', () => this.updateEndTimeFromDuration());
        document.getElementById('durationMinutes').addEventListener('input', () => this.updateEndTimeFromDuration());
        
        // Save data before page unload
        window.addEventListener('beforeunload', () => {
            this.saveCurrentTask();
        });
    }

    calculateDuration() {
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        const date = document.getElementById('manualDate').value;
        
        if (startTime && endTime && date) {
            const startDateTime = new Date(`${date}T${startTime}`);
            const endDateTime = new Date(`${date}T${endTime}`);
            
            if (endDateTime > startDateTime) {
                const duration = endDateTime - startDateTime;
                const hours = Math.floor(duration / 3600000);
                const minutes = Math.floor((duration % 3600000) / 60000);
                
                document.getElementById('durationHours').value = hours;
                document.getElementById('durationMinutes').value = minutes;
            }
        }
    }

    updateEndTimeFromDuration() {
        const startTime = document.getElementById('startTime').value;
        const date = document.getElementById('manualDate').value;
        const hours = parseInt(document.getElementById('durationHours').value) || 0;
        const minutes = parseInt(document.getElementById('durationMinutes').value) || 0;
        
        if (startTime && date && (hours > 0 || minutes > 0)) {
            const startDateTime = new Date(`${date}T${startTime}`);
            const endDateTime = new Date(startDateTime.getTime() + (hours * 3600000) + (minutes * 60000));
            
            const endTimeStr = endDateTime.toTimeString().slice(0, 5);
            document.getElementById('endTime').value = endTimeStr;
        }
    }
}

// Initialize the app
let timeTracker;
document.addEventListener('DOMContentLoaded', () => {
    timeTracker = new TimeTracker();
});
