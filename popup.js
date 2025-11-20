const api = typeof chrome !== "undefined" ? chrome : browser;
const KWH_PER_PROMPT = 0.0005;   // 0.5 Wh per prompt
const CO2_PER_KWH = 0.4;         // kg CO2 per kWh

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

function formatPrompts(n) {
  return `${n} prompt${n === 1 ? "" : "s"}`;
}

function computeDayEnergy(prompts) {
  const kwh = prompts * KWH_PER_PROMPT;
  const co2 = kwh * CO2_PER_KWH;
  return { kwh, co2 };
}

function computeMonthAverage(dailyUsage) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  let totalPrompts = 0;
  let daysWithData = 0;

  Object.entries(dailyUsage).forEach(([dayKey, dayData]) => {
    const parts = dayKey.split("-");
    if (parts.length !== 3) return;
    const y = Number(parts[0]);
    const m = Number(parts[1]);
    if (y === year && m === month) {
      const dayPrompts = dayData.prompts || 0;
      if (dayPrompts > 0) {
        totalPrompts += dayPrompts;
        daysWithData += 1;
      }
    }
  });

  if (daysWithData === 0) {
    return { avgPrompts: 0, kwh: 0, co2: 0 };
  }

  const avgPrompts = totalPrompts / daysWithData;
  const { kwh, co2 } = computeDayEnergy(avgPrompts);
  return { avgPrompts, kwh, co2 };
}

function renderStats(dailyUsage) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayData = dailyUsage[todayKey] || { prompts: 0 };

  const todayPrompts = todayData.prompts || 0;
  const { kwh: todayKwh, co2: todayCo2 } = computeDayEnergy(todayPrompts);

  let totalPrompts = 0;
  Object.values(dailyUsage).forEach(dayData => {
    totalPrompts += dayData.prompts || 0;
  });

  const { kwh: totalKwh, co2: totalCo2 } = computeDayEnergy(totalPrompts);
  const monthStats = computeMonthAverage(dailyUsage);

  const todayPromptText = formatPrompts(todayPrompts);
  const totalPromptText = formatPrompts(totalPrompts);
  const avgPromptText = formatPrompts(Math.round(monthStats.avgPrompts));

  document.getElementById("today-time").textContent =
    `Prompts: ${todayPromptText}`;
  document.getElementById("today-kwh").textContent =
    `Energy: ${formatKwh(todayKwh)}`;
  document.getElementById("today-co2").textContent =
    `Emissions: ${formatKg(todayCo2)}`;

  document.getElementById("total-time").textContent =
    `Prompts: ${totalPromptText}`;
  document.getElementById("total-kwh").textContent =
    `Energy: ${formatKwh(totalKwh)}`;
  document.getElementById("total-co2").textContent =
    `Emissions: ${formatKg(totalCo2)}`;

  document.getElementById("month-kwh").textContent =
    `Energy: ${formatKwh(monthStats.kwh)} per day`;
  document.getElementById("month-co2").textContent =
    `Emissions: ${formatKg(monthStats.co2)} per day`;

  const assumptionsEl = document.getElementById("assumptions");
  assumptionsEl.textContent =
    `Assumptions. ${KWH_PER_PROMPT} kWh per prompt. ${CO2_PER_KWH} kg CO₂ per kWh.`;
}

function initPopup() {
  api.storage.local.get(["dailyUsage"], data => {
    const dailyUsage = data.dailyUsage || {};
    renderStats(dailyUsage);
  });
}

document.addEventListener("DOMContentLoaded", initPopup);
