// ===== DASHBOARD VARIABLES =====

let simulationMode = true;

const energyElement = document.getElementById('totalEnergy');
const powerElement = document.getElementById('currentPower');
const stepsElement = document.getElementById('totalSteps');

// ===== CHART DATA =====

const labels = ['1','2','3','4','5','6','7','8'];

let energyData = [12,18,15,22,28,25,31,36];
let powerData = [0.10,0.15,0.12,0.18,0.22,0.19,0.24,0.20];

// ===== ENERGY CHART =====

const energyCtx = document
.getElementById('energyChart')
.getContext('2d');

const energyChart = new Chart(energyCtx, {

    type: 'line',

    data: {
        labels: labels,

        datasets: [{
            label: 'Energy',

            data: energyData,

            borderColor: '#667eea',

            backgroundColor:
            'rgba(102,126,234,0.15)',

            borderWidth: 3,

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
        }
    }
});

// ===== POWER CHART =====

const powerCtx = document
.getElementById('powerChart')
.getContext('2d');

const powerChart = new Chart(powerCtx, {

    type: 'line',

    data: {
        labels: labels,

        datasets: [{
            label: 'Power',

            data: powerData,

            borderColor: '#764ba2',

            backgroundColor:
            'rgba(118,75,162,0.15)',

            borderWidth: 3,

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
        }
    }
});

// ===== SIMULATION MODE =====

function updateSimulationData() {

    const energy =
    (Math.random() * 50 + 20).toFixed(2);

    const power =
    (Math.random() * 0.5).toFixed(3);

    const steps =
    Math.floor(Math.random() * 1000 + 400);

    energyElement.innerText = energy;
    powerElement.innerText = power;
    stepsElement.innerText = steps;

    updateCharts(
        parseFloat(energy),
        parseFloat(power)
    );
}

// ===== LIVE ARDUINO MODE =====

function updateArduinoData(sensorData) {

    energyElement.innerText =
    sensorData.energy;

    powerElement.innerText =
    sensorData.power;

    stepsElement.innerText =
    sensorData.steps;

    updateCharts(
        parseFloat(sensorData.energy),
        parseFloat(sensorData.power)
    );
}

// ===== UPDATE CHARTS =====

function updateCharts(energy,power){

    energyData.push(energy);
    powerData.push(power);

    // keep only 8 points
    if(energyData.length > 8){
        energyData.shift();
    }

    if(powerData.length > 8){
        powerData.shift();
    }

    energyChart.data.datasets[0].data =
    energyData;

    powerChart.data.datasets[0].data =
    powerData;

    energyChart.update('none');
    powerChart.update('none');
}

// ===== MAIN UPDATE LOOP =====

setInterval(() => {

    if(simulationMode){

        updateSimulationData();

    } else {

        // Example Arduino data
        const liveSensorData = {

            energy: 42.5,

            power: 0.31,

            steps: 620
        };

        updateArduinoData(liveSensorData);
    }

}, 5000);

// ===== MODE TOGGLE BUTTON =====

const modeButton = document.createElement('button');

modeButton.innerText = 'Toggle Mode';

modeButton.style.position = 'fixed';
modeButton.style.bottom = '20px';
modeButton.style.right = '20px';
modeButton.style.padding = '12px 18px';
modeButton.style.border = 'none';
modeButton.style.borderRadius = '10px';
modeButton.style.background =
'linear-gradient(135deg,#667eea,#764ba2)';
modeButton.style.color = 'white';
modeButton.style.cursor = 'pointer';
modeButton.style.fontWeight = 'bold';

document.body.appendChild(modeButton);

// ===== TOGGLE FUNCTION =====

modeButton.onclick = () => {

    simulationMode = !simulationMode;

    const status =
    document.getElementById('systemStatus');

    if(simulationMode){

        status.innerText = 'Simulation';

        console.log('Simulation Mode');

    } else {

        status.innerText = 'Arduino Live';

        console.log('Arduino Mode');
    }
};

console.log('Dashboard Loaded Successfully');
