// Energy Harvesting Dashboard JavaScript
class EnergyDashboard {
    constructor() {
        this.users = [];
        this.totalEnergy = 0;
        this.currentPower = 0;
        this.totalSteps = 0;
        this.energyHistory = [];
        this.powerHistory = [];
        this.startTime = Date.now();
        this.simulationMode = false;
        this.arduinoConnected = false;
        this.connectionType = 'simulation'; // 'simulation', 'usb', 'wifi', 'ethernet'
        this.wsConnection = null;
        this.deviceInfo = {};
        
        this.initializeCharts();
        this.bindEvents();
        this.loadStoredData();
        this.startDataUpdates();
        this.initializeWebSocketConnection();
        this.initializeSimulationData();
    }

    // Initialize Chart.js charts
    initializeCharts() {
        // Energy Generation Chart
        const energyCtx = document.getElementById('energyChart').getContext('2d');
        this.energyChart = new Chart(energyCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Energy Generated (J)',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(2) + ' J';
                            }
                        }
                    }
                }
            }
        });

        // Power Output Chart
        const powerCtx = document.getElementById('powerChart').getContext('2d');
        this.powerChart = new Chart(powerCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Power Output (W)',
                    data: [],
                    borderColor: '#764ba2',
                    backgroundColor: 'rgba(118, 75, 162, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(3) + ' W';
                            }
                        }
                    }
                }
            }
        });
    }

    // Initialize WebSocket connection for USB serial communication
    initializeWebSocketConnection() {
        try {
            // Connect to WebSocket server
            this.wsConnection = new WebSocket('ws://localhost:8080');
            
            this.wsConnection.onopen = () => {
                console.log('WebSocket connection established');
                this.addActivityLog('Connected to Arduino via USB');
                this.connectionType = 'usb';
                this.updateConnectionStatus();
            };
            
            this.wsConnection.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleWebSocketMessage(data);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
            
            this.wsConnection.onclose = () => {
                console.log('WebSocket connection closed');
                this.addActivityLog('Arduino connection lost');
                this.arduinoConnected = false;
                this.connectionType = 'simulation';
                this.updateConnectionStatus();
                
                // Try to reconnect after 3 seconds
                setTimeout(() => {
                    this.initializeWebSocketConnection();
                }, 3000);
            };
            
            this.wsConnection.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.addActivityLog('WebSocket connection error');
            };
            
        } catch (error) {
            console.log('WebSocket server not available, using simulation mode');
            this.addActivityLog('WebSocket server not found - using simulation mode');
        }
    }

    // Handle WebSocket messages from Arduino
    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'deviceInfo':
                this.deviceInfo = data.data;
                this.addActivityLog(`Connected to: ${data.data.deviceName}`);
                break;
                
            case 'energyData':
                this.processArduinoData(data.data);
                break;
                
            case 'stepEvent':
                this.addActivityLog(`Step detected! Total: ${data.data.totalSteps}`);
                break;
                
            case 'resetEvent':
                this.addActivityLog('Energy counter reset');
                break;
                
            case 'calibration':
                this.addActivityLog(`Calibration complete: ${data.data.baselineVoltage}V`);
                break;
                
            case 'connectionStatus':
                this.updateConnectionStatus(data.data);
                break;
                
            case 'logMessage':
                this.addActivityLog(data.data);
                break;
                
            default:
                console.log('Unknown message type:', data.type);
        }
    }

    // Update connection status display
    updateConnectionStatus(statusData = null) {
        const statusElement = document.getElementById('systemStatus');
        const sensorStatusElement = document.getElementById('sensorStatus');
        
        if (statusData) {
            this.arduinoConnected = statusData.status === 'connected';
            statusElement.textContent = statusData.status === 'connected' ? 'Connected' : 'Disconnected';
            statusElement.className = 'stat-value ' + (statusData.status === 'connected' ? 'status-active' : '');
            
            if (sensorStatusElement) {
                sensorStatusElement.textContent = statusData.status === 'connected' ? 'Connected' : 'Disconnected';
                sensorStatusElement.className = 'info-value ' + (statusData.status === 'connected' ? 'status-good' : '');
            }
        } else {
            statusElement.textContent = this.arduinoConnected ? 'Connected' : 'Simulation';
            statusElement.className = 'stat-value ' + (this.arduinoConnected ? 'status-active' : '');
            
            if (sensorStatusElement) {
                sensorStatusElement.textContent = this.arduinoConnected ? 'Connected' : 'Simulated';
                sensorStatusElement.className = 'info-value ' + (this.arduinoConnected ? 'status-good' : '');
            }
        }
    }

    // Send command to Arduino via WebSocket
    sendCommandToArduino(command) {
        if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
            this.wsConnection.send(JSON.stringify({
                type: 'sendCommand',
                command: command
            }));
        } else {
            this.showNotification('Arduino not connected', 'error');
        }
    }

    // Bind event listeners
    bindEvents() {
        // Add User button
        document.getElementById('addUserBtn').addEventListener('click', () => {
            this.showAddUserModal();
        });

        // Simulation Mode button
        document.getElementById('simulationBtn').addEventListener('click', () => {
            this.toggleSimulationMode();
        });

        // Arduino control buttons
        document.getElementById('calibrateBtn').addEventListener('click', () => {
            this.sendCommandToArduino('CALIBRATE');
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset the energy counter?')) {
                this.sendCommandToArduino('RESET');
            }
        });

        document.getElementById('testBtn').addEventListener('click', () => {
            this.sendCommandToArduino('TEST');
        });

        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideAddUserModal();
        });

        document.getElementById('cancelAddUser').addEventListener('click', () => {
            this.hideAddUserModal();
        });

        // Add User form
        document.getElementById('addUserForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addUser();
        });

        // Chart range buttons
        document.querySelectorAll('.chart-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleChartRangeChange(e.target);
            });
        });

        // Close modal on outside click
        document.getElementById('addUserModal').addEventListener('click', (e) => {
            if (e.target.id === 'addUserModal') {
                this.hideAddUserModal();
            }
        });
    }

    // Initialize with sample data for demonstration
    initializeSimulationData() {
        const sampleUsers = [
            { id: 1, name: 'Alice Johnson', email: 'alice@example.com', energy: 12.5, steps: 156, active: true, lastActive: Date.now() },
            { id: 2, name: 'Bob Smith', email: 'bob@example.com', energy: 8.3, steps: 98, active: true, lastActive: Date.now() - 300000 },
            { id: 3, name: 'Carol Davis', email: 'carol@example.com', energy: 15.7, steps: 234, active: false, lastActive: Date.now() - 3600000 }
        ];

        sampleUsers.forEach(user => {
            this.users.push(user);
        });

        this.totalEnergy = sampleUsers.reduce((sum, user) => sum + user.energy, 0);
        this.totalSteps = sampleUsers.reduce((sum, user) => sum + user.steps, 0);
        
        this.updateDisplay();
        this.addActivityLog('System initialized with sample data');
    }

    // Add new user
    addUser() {
        const userName = document.getElementById('userName').value.trim();
        const userEmail = document.getElementById('userEmail').value.trim();
        const initialEnergy = parseFloat(document.getElementById('initialEnergy').value) || 0;

        if (!userName) {
            this.showNotification('Please enter a user name', 'error');
            return;
        }

        const newUser = {
            id: Date.now(),
            name: userName,
            email: userEmail,
            energy: initialEnergy,
            steps: 0,
            active: true,
            lastActive: Date.now(),
            joinDate: Date.now()
        };

        this.users.push(newUser);
        this.totalEnergy += initialEnergy;
        
        this.updateDisplay();
        this.saveData();
        this.hideAddUserModal();
        this.addActivityLog(`New user added: ${userName}`);
        this.showNotification(`User "${userName}" added successfully`, 'success');

        // Reset form
        document.getElementById('addUserForm').reset();
    }

    // Toggle simulation mode
    toggleSimulationMode() {
        this.simulationMode = !this.simulationMode;
        const btn = document.getElementById('simulationBtn');
        
        if (this.simulationMode) {
            btn.textContent = 'Stop Simulation';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
            this.startSimulation();
            this.addActivityLog('Simulation mode started');
        } else {
            btn.textContent = 'Simulation Mode';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
            this.addActivityLog('Simulation mode stopped');
        }
    }

    // Start simulation data generation
    startSimulation() {
        if (!this.simulationMode) return;

        const simulateData = () => {
            if (!this.simulationMode) return;

            // Simulate random energy generation
            const energyIncrement = Math.random() * 0.5 + 0.1;
            const powerIncrement = Math.random() * 0.02 + 0.005;
            const stepIncrement = Math.random() > 0.7 ? 1 : 0;

            this.totalEnergy += energyIncrement;
            this.currentPower = powerIncrement;
            this.totalSteps += stepIncrement;

            // Distribute energy to random active users
            const activeUsers = this.users.filter(user => user.active);
            if (activeUsers.length > 0) {
                const randomUser = activeUsers[Math.floor(Math.random() * activeUsers.length)];
                randomUser.energy += energyIncrement;
                randomUser.steps += stepIncrement;
                randomUser.lastActive = Date.now();
            }

            this.updateDisplay();
            this.updateCharts();

            // Continue simulation
            setTimeout(simulateData, 2000 + Math.random() * 3000);
        };

        simulateData();
    }

    // Update display elements
    updateDisplay() {
        // Update main statistics
        document.getElementById('totalEnergy').textContent = this.totalEnergy.toFixed(2);
        document.getElementById('currentPower').textContent = this.currentPower.toFixed(3);
        document.getElementById('totalSteps').textContent = this.totalSteps;

        // Update energy rate (Joules per minute)
        const energyRate = this.calculateEnergyRate();
        document.getElementById('energyRate').textContent = energyRate.toFixed(2);

        // Update step rate
        const stepRate = this.calculateStepRate();
        document.getElementById('stepRate').textContent = stepRate.toFixed(1);

        // Update user statistics
        document.getElementById('totalUsers').textContent = this.users.length;
        document.getElementById('activeUsers').textContent = this.users.filter(u => u.active).length;
        
        const avgContribution = this.users.length > 0 ? this.totalEnergy / this.users.length : 0;
        document.getElementById('avgContribution').textContent = avgContribution.toFixed(2) + ' J';

        // Update user list
        this.updateUserList();

        // Update system info
        this.updateSystemInfo();
    }

    // Update user list display
    updateUserList() {
        const userList = document.getElementById('userList');
        userList.innerHTML = '';

        const sortedUsers = [...this.users].sort((a, b) => b.energy - a.energy);

        sortedUsers.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card fade-in';
            
            const contributionPercentage = this.totalEnergy > 0 ? (user.energy / this.totalEnergy * 100) : 0;
            const isActive = user.active && (Date.now() - user.lastActive < 300000); // Active in last 5 minutes

            userCard.innerHTML = `
                <div class="user-card-header">
                    <div class="user-name">${user.name}</div>
                    <div class="user-status" style="background: ${isActive ? '#10b981' : '#6b7280'}"></div>
                </div>
                <div class="user-stats-row">
                    <span class="user-stat-label">Energy:</span>
                    <span class="user-stat-value">${user.energy.toFixed(2)} J</span>
                </div>
                <div class="user-stats-row">
                    <span class="user-stat-label">Steps:</span>
                    <span class="user-stat-value">${user.steps}</span>
                </div>
                <div class="user-stats-row">
                    <span class="user-stat-label">Contribution:</span>
                    <span class="user-stat-value">${contributionPercentage.toFixed(1)}%</span>
                </div>
                <div class="user-contribution-bar">
                    <div class="user-contribution-fill" style="width: ${contributionPercentage}%"></div>
                </div>
            `;

            userList.appendChild(userCard);
        });
    }

    // Update system information
    updateSystemInfo() {
        // Update sensor status
        document.getElementById('sensorStatus').textContent = this.arduinoConnected ? 'Connected' : 'Simulated';
        document.getElementById('sensorStatus').className = 'info-value ' + (this.arduinoConnected ? 'status-good' : '');

        // Update storage level (simulated)
        const storageLevel = Math.min((this.totalEnergy / 100) * 100, 100);
        document.getElementById('storageLevel').textContent = storageLevel.toFixed(1) + '%';

        // Update efficiency (simulated)
        const efficiency = Math.min(85 + Math.random() * 10, 95);
        document.getElementById('efficiency').textContent = efficiency.toFixed(1) + '%';

        // Update uptime
        const uptime = Date.now() - this.startTime;
        const hours = Math.floor(uptime / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        const seconds = Math.floor((uptime % 60000) / 1000);
        document.getElementById('uptime').textContent = 
            `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    // Update charts with new data
    updateCharts() {
        const now = new Date();
        const timeLabel = now.toLocaleTimeString();

        // Update energy chart
        if (this.energyChart.data.labels.length > 20) {
            this.energyChart.data.labels.shift();
            this.energyChart.data.datasets[0].data.shift();
        }
        this.energyChart.data.labels.push(timeLabel);
        this.energyChart.data.datasets[0].data.push(this.totalEnergy);
        this.energyChart.update('none');

        // Update power chart
        if (this.powerChart.data.labels.length > 20) {
            this.powerChart.data.labels.shift();
            this.powerChart.data.datasets[0].data.shift();
        }
        this.powerChart.data.labels.push(timeLabel);
        this.powerChart.data.datasets[0].data.push(this.currentPower);
        this.powerChart.update('none');
    }

    // Calculate energy rate (Joules per minute)
    calculateEnergyRate() {
        if (this.energyHistory.length < 2) return 0;
        
        const recent = this.energyHistory.slice(-2);
        const timeDiff = (recent[1].time - recent[0].time) / 60000; // Convert to minutes
        const energyDiff = recent[1].energy - recent[0].energy;
        
        return timeDiff > 0 ? energyDiff / timeDiff : 0;
    }

    // Calculate step rate (steps per minute)
    calculateStepRate() {
        if (this.energyHistory.length < 2) return 0;
        
        const recent = this.energyHistory.slice(-2);
        const timeDiff = (recent[1].time - recent[0].time) / 60000; // Convert to minutes
        const stepDiff = recent[1].steps - recent[0].steps;
        
        return timeDiff > 0 ? stepDiff / timeDiff : 0;
    }

    // Start data updates
    startDataUpdates() {
        setInterval(() => {
            // Store history for rate calculations
            this.energyHistory.push({
                time: Date.now(),
                energy: this.totalEnergy,
                steps: this.totalSteps
            });

            // Keep only last 10 entries
            if (this.energyHistory.length > 10) {
                this.energyHistory.shift();
            }

            // Auto-save data
            this.saveData();
        }, 5000);

        // Update charts periodically
        setInterval(() => {
            if (this.simulationMode || this.arduinoConnected) {
                this.updateCharts();
            }
        }, 3000);
    }

    // Modal functions
    showAddUserModal() {
        document.getElementById('addUserModal').classList.add('active');
    }

    hideAddUserModal() {
        document.getElementById('addUserModal').classList.remove('active');
    }

    // Handle chart range changes
    handleChartRangeChange(button) {
        // Remove active class from all buttons in the same group
        button.parentElement.querySelectorAll('.chart-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');

        // Here you would typically filter the chart data based on the selected range
        // For this demo, we'll just show a notification
        const range = button.dataset.range || button.dataset.type;
        this.addActivityLog(`Chart range changed to: ${range}`);
    }

    // Add activity log entry
    addActivityLog(message) {
        const activityLog = document.getElementById('activityLog');
        const time = new Date().toLocaleTimeString();
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item fade-in';
        activityItem.innerHTML = `
            <span class="activity-time">${time}</span>
            <span class="activity-message">${message}</span>
        `;

        activityLog.insertBefore(activityItem, activityLog.firstChild);

        // Keep only last 10 entries
        while (activityLog.children.length > 10) {
            activityLog.removeChild(activityLog.lastChild);
        }
    }

    // Show notification
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type} fade-in`;
        notification.textContent = message;

        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '9999',
            maxWidth: '300px'
        });

        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            info: '#3b82f6',
            warning: '#f59e0b'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // Save data to localStorage
    saveData() {
        const data = {
            users: this.users,
            totalEnergy: this.totalEnergy,
            totalSteps: this.totalSteps,
            startTime: this.startTime
        };
        localStorage.setItem('energyHarvestingData', JSON.stringify(data));
    }

    // Load stored data from localStorage
    loadStoredData() {
        const storedData = localStorage.getItem('energyHarvestingData');
        if (storedData) {
            try {
                const data = JSON.parse(storedData);
                this.users = data.users || [];
                this.totalEnergy = data.totalEnergy || 0;
                this.totalSteps = data.totalSteps || 0;
                this.startTime = data.startTime || Date.now();
                
                this.updateDisplay();
                this.addActivityLog('Data loaded from storage');
            } catch (error) {
                console.error('Error loading stored data:', error);
            }
        }
    }

    // Arduino data integration (for future implementation)
    connectToArduino() {
        // This would implement WebSocket or HTTP connection to Arduino/ESP8266
        // For now, it's a placeholder for the advanced version
        this.addActivityLog('Arduino connection not implemented in this version');
    }

    // Process Arduino data
    processArduinoData(data) {
        try {
            const parsedData = this.parseArduinoData(data);
            
            this.totalEnergy = parsedData.energy;
            this.currentPower = parsedData.power;
            this.totalSteps = parsedData.steps;
            
            this.updateDisplay();
            this.updateCharts();
            
            this.arduinoConnected = true;
        } catch (error) {
            console.error('Error processing Arduino data:', error);
            this.arduinoConnected = false;
        }
    }

    // Parse Arduino data string
    parseArduinoData(dataString) {
        // Expected format: "voltage:0.123,power:0.001234,energy:12.345,steps:156,time:3600"
        const data = {};
        const pairs = dataString.split(',');
        
        pairs.forEach(pair => {
            const [key, value] = pair.split(':');
            data[key] = parseFloat(value);
        });
        
        return {
            voltage: data.voltage || 0,
            power: data.power || 0,
            energy: data.energy || 0,
            steps: parseInt(data.steps) || 0,
            time: parseInt(data.time) || 0
        };
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new EnergyDashboard();
    
    // Make dashboard globally available for debugging
    window.energyDashboard = dashboard;
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'n':
                    e.preventDefault();
                    dashboard.showAddUserModal();
                    break;
                case 's':
                    e.preventDefault();
                    dashboard.toggleSimulationMode();
                    break;
            }
        }
    });
    
    console.log('Energy Harvesting Dashboard initialized');
    console.log('Keyboard shortcuts: Ctrl+N (Add User), Ctrl+S (Toggle Simulation)');
});
