import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getDatabase, ref, onValue, push, set, serverTimestamp, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// DOM Elements
const clockEl = document.getElementById('clock');
const connectionDot = document.getElementById('connection-dot');
const connectionText = document.getElementById('connection-text');
const alertBanner = document.getElementById('alert-banner');
const alertMessage = document.getElementById('alert-message');
const alertLog = document.getElementById('alert-log');

// Status Card Elements
const statusCard = document.getElementById('system-status-card');
const statusGlow = document.getElementById('status-glow');
const statusText = document.getElementById('status-text');

// Gauge Elements
const rainVal = document.getElementById('rain-val');
const rainGauge = document.getElementById('rain-gauge');
const soilVal = document.getElementById('soil-val');
const soilGauge = document.getElementById('soil-gauge');
const tempVal = document.getElementById('temp-val');
const tempNeedle = document.getElementById('temp-needle');
const humVal = document.getElementById('hum-val');
const humGauge = document.getElementById('hum-gauge');
const ldrVal = document.getElementById('ldr-val');

// Clock Update
setInterval(() => {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
}, 1000);

// Setup Charts
Chart.defaults.color = '#8f9ba8';
Chart.defaults.font.family = "'Rajdhani', sans-serif";

const envCtx = document.getElementById('envChart').getContext('2d');
const envChart = new Chart(envCtx, {
  type: 'line',
  data: {
    labels: Array(20).fill(''),
    datasets: [
      {
        label: 'Temperature (°C)',
        borderColor: '#ff003c',
        backgroundColor: 'rgba(255, 0, 60, 0.1)',
        data: Array(20).fill(null),
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0
      },
      {
        label: 'Humidity (%)',
        borderColor: '#b537f2',
        backgroundColor: 'rgba(181, 55, 242, 0.1)',
        data: Array(20).fill(null),
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 0
      }
    ]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 }, // Disable animation for performance on updates
    scales: {
      y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { grid: { display: false } }
    },
    plugins: { legend: { position: 'top' } }
  }
});

const lightCtx = document.getElementById('lightChart').getContext('2d');
const lightChart = new Chart(lightCtx, {
  type: 'bar',
  data: {
    labels: Array(15).fill(''),
    datasets: [{
      label: 'Light Level',
      backgroundColor: '#ffea00',
      data: Array(15).fill(null),
      borderRadius: 4
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    scales: {
      y: { min: 0, max: 1024, grid: { color: 'rgba(255,255,255,0.05)' } },
      x: { grid: { display: false } }
    },
    plugins: { legend: { display: false } }
  }
});

// Helper: Animate Number
function animateValue(obj, start, end, duration) {
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    obj.innerHTML = Math.floor(progress * (end - start) + start);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

// Alert System Logic
let activeAlerts = new Set();
let lastLogTime = 0;

function evaluateAlerts(data) {
  activeAlerts.clear();
  
  if (data.rain < 700) activeAlerts.add({ id: 'rain', msg: "CRITICAL: Rain Detected", type: "critical" });
  if (data.soil < 700) activeAlerts.add({ id: 'soil', msg: "WARNING: Soil Wet", type: "warning" });
  if (data.temp > 40) activeAlerts.add({ id: 'temp', msg: "CRITICAL: High Temperature", type: "critical" });

  updateStatusPanel();
}

function updateStatusPanel() {
  if (activeAlerts.size === 0) {
    alertBanner.classList.add('hidden');
    
    // System Status Update
    statusCard.className = 'glass-card status-card';
    statusText.textContent = 'NORMAL';
    statusText.style.color = 'var(--neon-green)';
    statusText.style.textShadow = '0 0 15px var(--neon-green)';
    statusGlow.style.background = 'var(--neon-green)';
    statusGlow.style.boxShadow = '0 0 20px var(--neon-green)';
  } else {
    // Show Alerts
    alertBanner.classList.remove('hidden');
    let isCritical = false;
    let messages = [];
    
    activeAlerts.forEach(alert => {
      if (alert.type === 'critical') isCritical = true;
      messages.push(alert.msg);
      logAlert(alert);
    });
    
    alertMessage.textContent = messages.join(' | ');

    // System Status Update
    if (isCritical) {
      statusCard.className = 'glass-card status-card critical';
      statusText.textContent = 'CRITICAL';
      statusText.style.color = 'var(--neon-red)';
      statusText.style.textShadow = '0 0 15px var(--neon-red)';
      statusGlow.style.background = 'var(--neon-red)';
      statusGlow.style.boxShadow = '0 0 20px var(--neon-red)';
    } else {
      statusCard.className = 'glass-card status-card warning';
      statusText.textContent = 'WARNING';
      statusText.style.color = 'var(--neon-yellow)';
      statusText.style.textShadow = '0 0 15px var(--neon-yellow)';
      statusGlow.style.background = 'var(--neon-yellow)';
      statusGlow.style.boxShadow = '0 0 20px var(--neon-yellow)';
    }
  }
}

// Listen to Alert History from Firebase
const alertsRef = query(ref(database, 'alerts'), orderByChild('timestamp'), limitToLast(50));
onValue(alertsRef, (snapshot) => {
  alertLog.innerHTML = ''; // clear current log
  const alerts = [];
  snapshot.forEach(childSnap => {
    alerts.push(childSnap.val());
  });
  // Reverse to show newest at top
  alerts.reverse().forEach(alert => {
    const el = document.createElement('div');
    el.className = `log-item ${alert.type}`;
    const timeStr = alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
    el.innerHTML = `<span>${alert.msg}</span><span class="log-time">${timeStr}</span>`;
    alertLog.appendChild(el);
  });
});

function logAlert(alert) {
  const now = Date.now();
  if (now - lastLogTime < 5000) return; // Prevent log spamming (1 log per 5s)
  
  lastLogTime = now;
  
  // Push to Firebase
  const newAlertRef = push(ref(database, 'alerts'));
  set(newAlertRef, {
    msg: alert.msg,
    type: alert.type,
    timestamp: serverTimestamp()
  });
}

// Update UI
let prevData = { rain: 0, soil: 0, temp: 0, hum: 0, ldr: 0 };

function updateDashboard(data) {
  // Rain Gauge (0-1024, Lower is wetter. Let's invert for UI: 1024-val)
  // Assuming 251.2 is full circle circumference.
  let currentRain = parseInt(data.rain || 0);
  animateValue(rainVal, prevData.rain, currentRain, 500);
  let rainPercent = Math.max(0, Math.min(100, ((1024 - currentRain) / 1024) * 100));
  rainGauge.style.strokeDashoffset = 251.2 - (251.2 * rainPercent) / 100;
  rainGauge.style.stroke = currentRain < 700 ? 'var(--neon-red)' : 'var(--neon-blue)';

  // Soil Gauge (0-1024)
  let currentSoil = parseInt(data.soil || 0);
  animateValue(soilVal, prevData.soil, currentSoil, 500);
  // Half circle length is roughly 125.6
  // But we used radius 40, so full circle is 251.2. Semi is 125.6
  let soilPercent = Math.max(0, Math.min(100, ((1024 - currentSoil) / 1024) * 100));
  soilGauge.style.strokeDasharray = 125.6;
  soilGauge.style.strokeDashoffset = 125.6 - (125.6 * soilPercent) / 100;
  soilGauge.style.stroke = currentSoil < 700 ? 'var(--neon-yellow)' : 'var(--neon-green)';

  // Temp Gauge (Dial: -20 to 60 deg C) -> rotation -90 to 90
  let currentTemp = parseFloat(data.temp || 0).toFixed(1);
  tempVal.innerHTML = currentTemp;
  let tempRot = -90 + ((currentTemp + 20) / 80) * 180;
  tempRot = Math.max(-90, Math.min(90, tempRot)); // Clamp
  tempNeedle.style.transform = `rotate(${tempRot}deg)`;
  tempNeedle.style.background = currentTemp > 40 ? 'var(--neon-red)' : 'var(--neon-blue)';
  tempNeedle.style.boxShadow = currentTemp > 40 ? '0 0 10px var(--neon-red)' : '0 0 10px var(--neon-blue)';

  // Humidity (0-100%)
  let currentHum = parseInt(data.hum || 0);
  animateValue(humVal, prevData.hum, currentHum, 500);
  // Semi circle path length approx 110 for rx=35
  let humCircumference = Math.PI * 35; // 109.9
  humGauge.style.strokeDasharray = humCircumference;
  humGauge.style.strokeDashoffset = humCircumference - (humCircumference * currentHum) / 100;

  // LDR Update
  let currentLdr = parseInt(data.ldr || 0);
  animateValue(ldrVal, prevData.ldr, currentLdr, 500);

  // Update Charts
  envChart.data.datasets[0].data.push(currentTemp);
  envChart.data.datasets[0].data.shift();
  envChart.data.datasets[1].data.push(currentHum);
  envChart.data.datasets[1].data.shift();
  envChart.update();

  lightChart.data.datasets[0].data.push(currentLdr);
  lightChart.data.datasets[0].data.shift();
  lightChart.update();

  // Evaluate Alerts
  evaluateAlerts({
    rain: currentRain,
    soil: currentSoil,
    temp: currentTemp
  });

  // Save prev state
  prevData = { rain: currentRain, soil: currentSoil, temp: currentTemp, hum: currentHum, ldr: currentLdr };
}

// Listen to Firebase
const sensorsRef = ref(database, 'sensor');

// Setup connection status
const connectedRef = ref(database, '.info/connected');
onValue(connectedRef, (snap) => {
  if (snap.val() === true) {
    connectionDot.className = 'pulse-dot connected';
    connectionText.textContent = 'SYSTEM ONLINE';
    connectionText.style.color = 'var(--neon-green)';
  } else {
    connectionDot.className = 'pulse-dot disconnected';
    connectionText.textContent = 'SYSTEM OFFLINE';
    connectionText.style.color = 'var(--neon-red)';
  }
});

// Throttle updates (user requested every 2 seconds roughly, or live)
// Firebase triggers live, we'll process it immediately for best real-time feel
onValue(sensorsRef, (snapshot) => {
  if (snapshot.exists()) {
    const data = snapshot.val();
    updateDashboard(data);
  } else {
    console.log("No data available");
  }
});
