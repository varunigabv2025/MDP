/*
 * Serial Port Server for Piezoelectric Energy Harvesting System
 * 
 * This Node.js server reads data from Arduino via USB serial connection
 * and provides real-time WebSocket communication to the web dashboard.
 * 
 * Requirements:
 * - Node.js installed on your system
 * - Arduino connected via USB
 * - Serial port libraries installed
 * 
 * Installation:
 * npm install serialport ws express
 * 
 * Usage:
 * node serial_server.js
 * Then open index.html in your browser
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');
const express = require('express');
const path = require('path');

// Configuration
const BAUD_RATE = 115200;
const WEBSOCKET_PORT = 8080;
const HTTP_PORT = 3000;

// Global variables
let arduinoPort = null;
let parser = null;
let connectedClients = new Set();
let deviceInfo = {};
let lastDataTime = 0;
let connectionStatus = 'disconnected';

// Express server for serving web files
const app = express();
const server = require('http').createServer(app);

// Serve static files
app.use(express.static(__dirname));
app.use(express.json());

// WebSocket server
const wss = new WebSocket.Server({ port: WEBSOCKET_PORT });

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('New dashboard client connected');
    connectedClients.add(ws);
    
    // Send current status to new client
    sendStatusToClient(ws);
    
    ws.on('close', () => {
        console.log('Dashboard client disconnected');
        connectedClients.delete(ws);
    });
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            handleClientCommand(data, ws);
        } catch (error) {
            console.error('Invalid message from client:', error);
        }
    });
});

// HTTP routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/status', (req, res) => {
    res.json({
        status: connectionStatus,
        deviceInfo: deviceInfo,
        connectedClients: connectedClients.size,
        lastDataTime: lastDataTime
    });
});

app.post('/api/command', (req, res) => {
    const command = req.body.command;
    if (arduinoPort && arduinoPort.isOpen) {
        arduinoPort.write(command + '\n');
        res.json({ success: true, command: command });
    } else {
        res.json({ success: false, error: 'Arduino not connected' });
    }
});

// Find and connect to Arduino
async function connectToArduino() {
    try {
        console.log('Scanning for serial ports...');
        
        // List available ports
        const ports = await SerialPort.list();
        console.log('Available ports:', ports.map(p => p.path));
        
        // Try to find Arduino (common patterns)
        let arduinoPath = null;
        
        // Common Arduino port patterns
        const arduinoPatterns = [
            /usb/i,
            /arduino/i,
            /ch340/i,
            /cp210/i,
            /ftdi/i,
            /COM\d+/i,  // Windows
            /tty\.usb/i, // macOS/Linux
            /tty\.ACM/i, // Linux
            /tty\.USB/i  // macOS
        ];
        
        for (const port of ports) {
            for (const pattern of arduinoPatterns) {
                if (pattern.test(port.path) || pattern.test(port.manufacturer || '') || 
                    pattern.test(port.serialNumber || '') || pattern.test(port.pnpId || '')) {
                    arduinoPath = port.path;
                    console.log(`Found potential Arduino at: ${arduinoPath}`);
                    break;
                }
            }
            if (arduinoPath) break;
        }
        
        // If no Arduino found, try first available port
        if (!arduinoPath && ports.length > 0) {
            arduinoPath = ports[0].path;
            console.log(`No Arduino detected, trying first port: ${arduinoPath}`);
        }
        
        if (!arduinoPath) {
            console.log('No serial ports found. Please check Arduino connection.');
            setTimeout(connectToArduino, 5000); // Retry in 5 seconds
            return;
        }
        
        // Connect to the port
        console.log(`Connecting to Arduino at ${arduinoPath}...`);
        
        arduinoPort = new SerialPort({
            path: arduinoPath,
            baudRate: BAUD_RATE,
            autoOpen: false
        });
        
        // Set up parser
        parser = arduinoPort.pipe(new ReadlineParser({ delimiter: '\n' }));
        
        // Event handlers
        arduinoPort.on('open', () => {
            console.log('Connected to Arduino successfully!');
            connectionStatus = 'connected';
            broadcastStatus();
            
            // Request system info
            setTimeout(() => {
                sendCommandToArduino('INFO');
            }, 1000);
        });
        
        arduinoPort.on('error', (err) => {
            console.error('Serial port error:', err.message);
            connectionStatus = 'error';
            broadcastStatus();
        });
        
        arduinoPort.on('close', () => {
            console.log('Arduino connection closed');
            connectionStatus = 'disconnected';
            broadcastStatus();
            
            // Try to reconnect
            setTimeout(connectToArduino, 3000);
        });
        
        parser.on('data', (data) => {
            handleArduinoData(data);
        });
        
        // Open the port
        arduinoPort.open((err) => {
            if (err) {
                console.error('Failed to open serial port:', err.message);
                connectionStatus = 'error';
                broadcastStatus();
                
                // Try next port
                setTimeout(connectToArduino, 3000);
            }
        });
        
    } catch (error) {
        console.error('Error connecting to Arduino:', error);
        connectionStatus = 'error';
        broadcastStatus();
        setTimeout(connectToArduino, 5000);
    }
}

// Handle data from Arduino
function handleArduinoData(data) {
    try {
        const trimmedData = data.trim();
        lastDataTime = Date.now();
        
        // Try to parse as JSON
        try {
            const jsonData = JSON.parse(trimmedData);
            
            // Handle different message types
            if (jsonData.type === 'systemInfo') {
                deviceInfo = jsonData;
                console.log('Device info received:', deviceInfo);
                broadcastToClients({ type: 'deviceInfo', data: jsonData });
            } else if (jsonData.type === 'stepEvent') {
                console.log('Step detected:', jsonData.totalSteps);
                broadcastToClients({ type: 'stepEvent', data: jsonData });
            } else if (jsonData.type === 'resetEvent') {
                console.log('Energy counter reset');
                broadcastToClients({ type: 'resetEvent', data: jsonData });
            } else if (jsonData.type === 'calibration') {
                console.log('Calibration completed:', jsonData);
                broadcastToClients({ type: 'calibration', data: jsonData });
            } else if (jsonData.type === 'status') {
                // Regular status update
                broadcastToClients({ type: 'energyData', data: jsonData });
            } else {
                // Regular energy data
                broadcastToClients({ type: 'energyData', data: jsonData });
            }
            
        } catch (jsonError) {
            // Not JSON, might be human-readable or CSV
            if (trimmedData.includes('Energy Harvesting Status')) {
                // Human readable format - parse manually
                broadcastToClients({ type: 'logMessage', data: trimmedData });
            } else if (trimmedData.includes('\t')) {
                // CSV format - parse and convert
                const parts = trimmedData.split('\t');
                if (parts.length >= 5) {
                    const csvData = {
                        timestamp: parseInt(parts[0]) * 1000,
                        voltage: parseFloat(parts[1]),
                        power: parseFloat(parts[2]) / 1000, // Convert mW to W
                        energy: parseFloat(parts[3]) / 1000, // Convert mJ to J
                        steps: parseInt(parts[4])
                    };
                    broadcastToClients({ type: 'energyData', data: csvData });
                }
            } else {
                // Just a log message
                console.log('Arduino:', trimmedData);
                broadcastToClients({ type: 'logMessage', data: trimmedData });
            }
        }
        
    } catch (error) {
        console.error('Error processing Arduino data:', error);
    }
}

// Handle commands from web clients
function handleClientCommand(command, ws) {
    console.log('Received command from client:', command);
    
    switch (command.type) {
        case 'sendCommand':
            sendCommandToArduino(command.command);
            break;
        case 'getStatus':
            sendStatusToClient(ws);
            break;
        case 'reset':
            sendCommandToArduino('RESET');
            break;
        case 'calibrate':
            sendCommandToArduino('CALIBRATE');
            break;
        case 'test':
            sendCommandToArduino('TEST');
            break;
        default:
            console.log('Unknown command type:', command.type);
    }
}

// Send command to Arduino
function sendCommandToArduino(command) {
    if (arduinoPort && arduinoPort.isOpen) {
        console.log('Sending command to Arduino:', command);
        arduinoPort.write(command + '\n');
    } else {
        console.log('Arduino not connected, cannot send command:', command);
    }
}

// Broadcast data to all connected clients
function broadcastToClients(data) {
    const message = JSON.stringify(data);
    connectedClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Broadcast status to all clients
function broadcastStatus() {
    const statusData = {
        type: 'connectionStatus',
        data: {
            status: connectionStatus,
            deviceInfo: deviceInfo,
            connectedClients: connectedClients.size,
            lastDataTime: lastDataTime
        }
    };
    broadcastToClients(statusData);
}

// Send status to specific client
function sendStatusToClient(ws) {
    if (ws.readyState === WebSocket.OPEN) {
        const statusData = {
            type: 'connectionStatus',
            data: {
                status: connectionStatus,
                deviceInfo: deviceInfo,
                connectedClients: connectedClients.size,
                lastDataTime: lastDataTime
            }
        };
        ws.send(JSON.stringify(statusData));
    }
}

// Start servers
console.log('Starting Piezoelectric Energy Harvesting Serial Server...');
console.log(`WebSocket server will run on port ${WEBSOCKET_PORT}`);
console.log(`HTTP server will run on port ${HTTP_PORT}`);

// Start HTTP server
server.listen(HTTP_PORT, () => {
    console.log(`HTTP server running at http://localhost:${HTTP_PORT}`);
    console.log('Open this URL in your browser to access the dashboard');
});

// Start Arduino connection
connectToArduino();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    
    if (arduinoPort && arduinoPort.isOpen) {
        arduinoPort.close(() => {
            console.log('Serial port closed');
        });
    }
    
    // Close WebSocket server
    wss.close(() => {
        console.log('WebSocket server closed');
    });
    
    // Close HTTP server
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});

console.log('Server started successfully!');
console.log('Waiting for Arduino connection...');
