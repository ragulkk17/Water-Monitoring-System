const channelID = "2926323";
const apiKey = "KC08K0UW0RWOH7XN";
const url = `https://api.thingspeak.com/channels/${channelID}/feeds.json?api_key=${apiKey}&results=10`;

let isMuted = false;
window.isMuted = () => isMuted;

document.addEventListener("DOMContentLoaded", function () {
    prefillHistoricalData();
    setupCharts();
    fetchData();
    setInterval(fetchData, 10000);

    const muteBtn = document.getElementById("muteButton");
    const alertSound = document.getElementById("alertSound");

    muteBtn.addEventListener("click", () => {
        isMuted = !isMuted;
        const payBtn = document.getElementById("payButton");
        payBtn.addEventListener("click", () => {
            alert("💳 Payment gateway coming soon!\nThis is a placeholder for future integration.");
        });
    
        if (isMuted) {
            muteBtn.textContent = "🔇 Mute";
            alertSound.pause();
            alertSound.currentTime = 0;
        } else {
            muteBtn.textContent = "🔊 Unmute";
        }
    });
});

let lineChart, barChart, pieChart;

const historicalData = {
    temperature: [],
    waterConsumed: [],
    pH: [],
    tds: [],
    turbidity: [],
    chlorine: [],
    labels: []
};

const paramNames = {
    temperature: "Temperature (°C)",
    waterConsumed: "Water Consumed (L)",
    pH: "pH Level",
    tds: "TDS (ppm)",
    turbidity: "Turbidity (NTU)",
    chlorine: "Chlorine (ppm)"
};

const chartParams = ["temperature", "pH", "tds", "turbidity", "chlorine"];

function prefillHistoricalData() {
    const time = new Date().toLocaleTimeString();
    historicalData.labels.push(time);
    for (let key in historicalData) {
        if (key !== "labels") historicalData[key].push(0);
    }
}

function setupCharts() {
    const ctxLine = document.getElementById("dataChart").getContext("2d");
    lineChart = new Chart(ctxLine, {
        type: "line",
        data: {
            labels: historicalData.labels,
            datasets: [{
                label: paramNames.temperature,
                data: historicalData.temperature,
                borderColor: "red",
                fill: false
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    const ctxBar = document.getElementById("barChart").getContext("2d");
    barChart = new Chart(ctxBar, {
        type: "bar",
        data: {
            labels: chartParams.map(key => paramNames[key]),
            datasets: [{
                data: chartParams.map(key => historicalData[key][0]),
                backgroundColor: ["red", "green", "orange", "purple", "teal"]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: {
                    display: true,
                    text: "Water Quality Parameters",
                    font: { size: 12, weight: "normal" }
                }
            },
            scales: {
                x: { title: { display: true, text: "Parameters" }},
                y: { beginAtZero: true, title: { display: true, text: "Values" }}
            }
        }
    });

    const ctxPie = document.getElementById("pieChart").getContext("2d");
    pieChart = new Chart(ctxPie, {
        type: "pie",
        data: {
            labels: chartParams.map(key => paramNames[key]),
            datasets: [{
                data: chartParams.map(key => historicalData[key][0]),
                backgroundColor: ["red", "green", "orange", "purple", "teal"]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

document.getElementById("parameterSelect").addEventListener("change", updateLineChart);

function updateLineChart() {
    const param = document.getElementById("parameterSelect").value;
    lineChart.data.labels = historicalData.labels;
    lineChart.data.datasets[0].label = paramNames[param];
    lineChart.data.datasets[0].data = historicalData[param];
    lineChart.update();
}

async function fetchData() {
    try {
        const res = await fetch(url);
        const json = await res.json();
        const feeds = json.feeds;
        if (!feeds || feeds.length === 0) throw new Error("No data");

        const latest = feeds[feeds.length - 1];
        const time = new Date().toLocaleTimeString();

        const temperature = parseFloat(latest.field1) || 0;
        const waterConsumed = parseFloat(latest.field2) || 0;
        const pH = parseFloat(latest.field3) || 0;
        const tds = parseFloat(latest.field4) || 0;
        const turbidity = parseFloat(latest.field5) || 0;
        const chlorine = parseFloat(latest.field6) || 0;
        const safety = parseInt(latest.field7);
        const tank = parseInt(latest.field8);

        document.getElementById("temperature").textContent = temperature;
        document.getElementById("waterConsumed").textContent = waterConsumed;
        document.getElementById("pH").textContent = pH;
        document.getElementById("tds").textContent = tds;
        document.getElementById("turbidity").textContent = turbidity;
        document.getElementById("chlorine").textContent = chlorine;

        document.getElementById("totalWater").textContent = waterConsumed.toFixed(2);
        const bill = (waterConsumed / 100) * 5;
        document.getElementById("billAmount").textContent = bill.toFixed(2);

        const safetyBox = document.getElementById("safetyStatusBox");
        const tankBox = document.getElementById("tankLevelBox");

        const statusText = safety === 1 ? "Safe ✅" : "Unsafe ❌";
        const levelText = tank === 0 ? "Empty" : tank === 1 ? "Half" : "Full";

        safetyBox.className = "live-box " + (safety === 1 ? "safe" : "unsafe");
        tankBox.className = "live-box " + (tank === 0 ? "empty" : tank === 1 ? "half" : "full");

        document.getElementById("safetyStatus").textContent = statusText;
        document.getElementById("tankLevel").textContent = levelText;

        // 🔊 AUDIO ALERT IF UNSAFE
        if (safety === 0 && !isMuted) {
            const alertSound = document.getElementById("alertSound");
            if (alertSound) {
                alertSound.play().catch(err => {
                    console.warn("Autoplay blocked or audio error:", err);
                });
            }
        }

        if (historicalData.labels.length > 10) {
            for (let key in historicalData) {
                if (Array.isArray(historicalData[key])) historicalData[key].shift();
            }
        }

        historicalData.labels.push(time);
        historicalData.temperature.push(temperature);
        historicalData.waterConsumed.push(waterConsumed);
        historicalData.pH.push(pH);
        historicalData.tds.push(tds);
        historicalData.turbidity.push(turbidity);
        historicalData.chlorine.push(chlorine);

        updateCharts();
    } catch (err) {
        console.error("Fetch error:", err);
    }
}

function updateCharts() {
    updateLineChart();
    const latest = chartParams.map(key => historicalData[key].at(-1));
    barChart.data.datasets[0].data = latest;
    pieChart.data.datasets[0].data = latest;
    barChart.update();
    pieChart.update();
}
