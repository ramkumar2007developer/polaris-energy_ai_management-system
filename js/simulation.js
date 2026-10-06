/* ==========================================================================
   POLARIS ENERGY AI - SIMULATION & DECISION ENGINE (js/simulation.js)
   ========================================================================== */

const SimulationEngine = {
  // State variables
  state: {
    weatherCondition: 'Normal', // Normal, Snow, Blizzard, Clear Sky
    demandLevel: 'Normal',       // Low, Normal, High, Extreme
    batterySOC: 78,              // Percentage 0-100
    fuelReserve: 64,             // Percentage 0-100
    loadSheddingActive: false,
    optimizedMode: true,
    emergencyMode: false,
    systemReliability: 99.4
  },

  // Environmental presets
  weatherPresets: {
    'Normal': { temp: -28, wind: 42, solarRad: 180, visibility: 4.2, solarCap: 1.21, risk: 'MEDIUM', impactMsg: 'Low solar availability expected during the next 6 hours.' },
    'Snow': { temp: -34, wind: 58, solarRad: 110, visibility: 2.1, solarCap: 0.85, risk: 'HIGH', impactMsg: 'Heavy snowfall reducing solar absorption. Wind turbines active.' },
    'Blizzard': { temp: -42, wind: 88, solarRad: 30, visibility: 0.4, solarCap: 0.25, risk: 'CRITICAL', impactMsg: 'Severe blizzard! Solar offline. Critical heating loads prioritized.' },
    'Clear Sky': { temp: -18, wind: 18, solarRad: 340, visibility: 15.0, solarCap: 1.95, risk: 'LOW', impactMsg: 'Optimal solar radiation. Battery fast-charging operational.' }
  },

  // Base Demand levels in MW
  demandPresets: {
    'Low': 1.25,
    'Normal': 1.82,
    'High': 2.35,
    'Extreme': 2.85
  },

  // Load management database
  loads: [
    { id: 'med-1', name: 'Medical Equipment', power: 0.35, priority: 'CRITICAL', status: true, note: 'Life support systems active' },
    { id: 'comm-1', name: 'Communication Systems', power: 0.20, priority: 'CRITICAL', status: true, note: 'Satellite link & radar active' },
    { id: 'heat-1', name: 'Heating Safety Systems', power: 0.45, priority: 'CRITICAL', status: true, note: 'Core habitat thermal loop' },
    { id: 'res-1', name: 'Research Equipment', power: 0.25, priority: 'CRITICAL', status: true, note: 'Ice core analytics sensor array' },
    { id: 'rec-1', name: 'Recreation Facilities', power: 0.12, priority: 'LOW', status: true, note: 'Gym & lounge heating/power' },
    { id: 'light-1', name: 'Auxiliary Lighting', power: 0.08, priority: 'LOW', status: true, note: 'Exterior perimeter lighting' },
    { id: 'heat-2', name: 'Non-essential Heating', power: 0.15, priority: 'LOW', status: true, note: 'Storage hangar climate control' },
    { id: 'lab-1', name: 'Laboratory Support', power: 0.10, priority: 'LOW', status: true, note: 'Auxiliary sample freezer B' }
  ],

  evaluate() {
    const weather = this.weatherPresets[this.state.weatherCondition];
    let baseDemand = this.demandPresets[this.state.demandLevel];

    // Calculate actual active demand from load switches
    let activeLoadDemand = 0;
    this.loads.forEach(l => {
      if (l.status) activeLoadDemand += l.power;
    });

    // Use active load demand if available, scaled by weather severity
    let currentDemand = Math.round((activeLoadDemand * (1 + (Math.abs(weather.temp) - 28) * 0.01)) * 100) / 100;
    if (this.state.loadSheddingActive) {
      currentDemand = Math.max(0.9, currentDemand - 0.27);
    }

    const renewableGen = weather.solarCap;
    let batteryOutput = 0;
    let generatorOutput = 0;
    let generatorStatus = 'STANDBY';
    let aiDecision = '';
    let aiReason = '';
    let recommendedAction = '';

    // Decision Logic Algorithm
    if (renewableGen >= currentDemand) {
      // 1. Renewable covers everything
      batteryOutput = 0;
      generatorOutput = 0;
      generatorStatus = 'STANDBY';
      aiDecision = 'Use 100% Renewable Energy';
      aiReason = `Solar generation (${renewableGen} MW) exceeds station demand (${currentDemand} MW). Excess power is charging battery reserve.`;
      recommendedAction = 'Use renewable energy → charge battery → generator standby.';
    } else if (renewableGen + (this.state.batterySOC > 25 ? 1.5 : 0.4) >= currentDemand) {
      // 2. Renewable + Battery covers demand
      batteryOutput = Math.round((currentDemand - renewableGen) * 100) / 100;
      generatorOutput = 0;
      generatorStatus = 'STANDBY';
      aiDecision = 'Use Solar + Battery Storage';
      aiReason = `Renewable generation (${renewableGen} MW) covers partial load. Battery reserve (${this.state.batterySOC}%) supplying ${batteryOutput} MW balance.`;
      recommendedAction = 'Use renewable energy → drain battery reserve → generator standby.';
    } else {
      // 3. Must start Generator
      let remaining = currentDemand - renewableGen;
      batteryOutput = this.state.batterySOC > 20 ? 0.4 : 0;
      generatorOutput = Math.round(Math.max(0.5, remaining - batteryOutput) * 100) / 100;
      generatorStatus = 'ACTIVE';
      aiDecision = 'Activate Generator Backup';
      aiReason = `Renewable energy (${renewableGen} MW) & battery depleted. Generator engaged at ${generatorOutput} MW to preserve vital habitat heating.`;
      recommendedAction = 'Use renewable → battery minimum reserve → activate diesel generator.';
    }

    // Battery warnings & safeguards
    if (this.state.batterySOC < 30) {
      aiReason += ' WARNING: Battery reserve under 30%! Safeguards active.';
    }
    if (this.state.fuelReserve < 20) {
      aiReason += ' CRITICAL: Fuel reserve under 20%! Aggressive load shedding recommended.';
    }

    // Calculate Fuel Rates
    const baselineFuelRate = 42.0; // Baseline non-AI continuous diesel burn L/hr
    const optimizedFuelRate = generatorStatus === 'ACTIVE' ? Math.round((12 + generatorOutput * 18) * 10) / 10 : 0;
    const fuelSaved = Math.max(0, Math.round((baselineFuelRate - optimizedFuelRate) * 10) / 10);
    const dailySaving = Math.round(fuelSaved * 24 * 10) / 10;
    const monthlySaving = Math.round(dailySaving * 30);

    const calculatedData = {
      demand: currentDemand,
      renewable: renewableGen,
      batteryOut: batteryOutput,
      batterySOC: this.state.batterySOC,
      generatorOut: generatorOutput,
      generatorStatus: generatorStatus,
      fuelRemaining: this.state.fuelReserve,
      reliability: this.state.systemReliability,
      weather: weather,
      aiDecision: aiDecision,
      aiReason: aiReason,
      recommendedAction: recommendedAction,
      confidence: generatorStatus === 'STANDBY' ? 94 : 88,
      fuelRateBaseline: baselineFuelRate,
      fuelRateOptimized: optimizedFuelRate,
      fuelSavedHourly: fuelSaved,
      fuelSavedDaily: dailySaving,
      fuelSavedMonthly: monthlySaving
    };

    // Update UI components
    if (window.DashboardUI) {
      window.DashboardUI.updateAll(calculatedData);
    }

    return calculatedData;
  },

  setWeather(weatherName) {
    this.state.weatherCondition = weatherName;
    this.evaluate();
    if (window.ToastManager) {
      window.ToastManager.show(`Weather simulation updated: ${weatherName}`, 'info');
    }
  },

  setDemandLevel(level) {
    this.state.demandLevel = level;
    this.evaluate();
    if (window.ToastManager) {
      window.ToastManager.show(`Demand level set to ${level}`, 'info');
    }
  },

  setBattery(soc) {
    this.state.batterySOC = soc;
    this.evaluate();
    if (window.ToastManager) {
      window.ToastManager.show(`Battery State of Charge set to ${soc}%`, 'info');
    }
  },

  setFuel(fuelPct) {
    this.state.fuelReserve = fuelPct;
    this.evaluate();
    if (window.ToastManager) {
      window.ToastManager.show(`Fuel Reserve level set to ${fuelPct}%`, 'info');
    }
  },

  toggleLoad(loadId) {
    const load = this.loads.find(l => l.id === loadId);
    if (load) {
      load.status = !load.status;
      this.evaluate();
      if (window.ToastManager) {
        window.ToastManager.show(`${load.name} set to ${load.status ? 'ON' : 'OFF'}`, load.status ? 'info' : 'warning');
      }
    }
  },

  runAILoadShedding() {
    let count = 0;
    let reducedPower = 0;
    this.loads.forEach(l => {
      if (l.priority === 'LOW' && l.status) {
        l.status = false;
        count++;
        reducedPower += l.power;
      }
    });
    this.state.loadSheddingActive = true;
    this.evaluate();

    if (window.ToastManager) {
      window.ToastManager.show(`AI Shedding: ${count} non-critical loads turned OFF (${Math.round(reducedPower*100)/100} MW reduced)`, 'success');
    }
  },

  runOptimization() {
    this.state.optimizedMode = true;
    const data = this.evaluate();
    if (window.ToastManager) {
      window.ToastManager.show(`AI Optimization Completed: +14% Renewable utilization, -${data.fuelSavedHourly} L/hr fuel reduction`, 'success');
    }
  }
};

window.SimulationEngine = SimulationEngine;
