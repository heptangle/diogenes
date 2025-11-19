// Default model parameters
const ENERGY_PER_HOUR_KWH = 0.1;  // kWh per hour of AI use
const CO2_PER_KWH = 0.4;          // kg CO2 per kWh

function secondsToHuman(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }
  return `${minutes} min`;
}

function energyFromSeconds(seconds) {
  const hours = seconds / 3600;
  return hours * ENERGY_PER_HOUR_KWH;
}

function formatKwh(kwh) {
  if (kwh < 0.01) {
    return `${(kwh * 1000).toFixed(1)} Wh`;
  }
  return `${kwh.toFixed(3)} kWh`;
}

function formatKg(kg) {
  if (kg < 0.01) {
    return `${(kg * 1000).toFixed(1)} g`;
  }
  return `${kg.toFixed(3)} kg`;
}

function computeMonthStats(dailyUsage) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-11

  let monthSeconds = 0;
  let daysWithData = 0;

  Object.entries(dailyUsage).forEach(([dayKey, dayData]) => {
    const [y, m, d] = dayKey.split("-").map(Number);
    if (y === year && m === month + 1) {
      const secs = dayData.seconds || 0;
      if (secs > 0) {
        monthSeconds += secs;
        daysWithData += 1;
      }
    }
  });

  if (daysWithData === 0) {
    return { avgSeconds: 0 };
  }

  const avgSeconds = monthSeconds / daysWithData;
  return { avgSeconds };
}

function renderStats(dailyUsage) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayData = dailyUsage[todayKey] || { seconds: 0 };
  const todaySeconds = todayData.seconds || 0;

  let totalSeconds = 0;
  Object.values(dailyUsage).forEach(dayData => {
    totalSeconds += dayData.seconds || 0;
  });

  const monthStats = computeMonthStats(dailyUsage);

  const todayKwh = energyFromSeconds(todaySeconds);
  const totalKwh = energyFromSeconds(totalSeconds);
  const monthKwh = energyFromSeconds(monthStats.avgSeconds);

  const todayCo2 = todayKwh * CO2_PER_KWH;
  const totalCo2 = totalKwh * CO2_PER_KWH;
  const monthCo2 = monthKwh * CO2_PER_KWH;

  document.getElementById("today-time").textContent =
    `Time: ${secondsToHuman(todaySeconds)}`;
  document.getElementById("today-kwh").textContent =
    `Energy: ${formatKwh(todayKwh)}`;
  document.getElementById("today-co2").textContent =
    `Emissions: ${formatKg(todayCo2)}`;

  document.getElementById("total-time").textContent =
    `Time: ${secondsToHuman(totalSeconds)}`;
  document.getElementById("total-kwh").textContent =
    `Energy: ${formatKwh(totalKwh)}`;
  document.getElementById("total-co2").textContent =
    `Emissions: ${formatKg(totalCo2)}`;

  document.getElementById("month-kwh").textContent =
    `Energy: ${formatKwh(monthKwh)} per day`;
  document.getElementById("month-co2").textContent =
    `Emissions: ${formatKg(monthCo2)} per day`;
}

function initPopup() {
  chrome.storage.local.get(["dailyUsage"], data => {
    const dailyUsage = data.dailyUsage || {};
    renderStats(dailyUsage);
  });
}

document.addEventListener("DOMContentLoaded", initPopup);
