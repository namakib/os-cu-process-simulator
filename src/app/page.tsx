"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";

class Process {
  pid: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  color: string;
  currentExecutionTime: number;
  completionTime: number;


  constructor(pid: string, arrivalTime: number, burstTime: number, priority: number, color: string, currentExecutionTime: number, completionTime: number) {
    this.pid = pid;
    this.arrivalTime = arrivalTime;
    this.burstTime = burstTime;
    this.priority = priority;
    this.color = color;
    this.currentExecutionTime = currentExecutionTime;
    this.completionTime = completionTime;
  }
}

const ProcessSimulator = () => {
  const [csvFile, setCsvFile] = useState(null);
  const [processData, setProcessData] = useState([]);
  const [simulationData, setSimulationData] = useState([]);
  const [algorithm, setAlgorithm] = useState("FCFS");
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [currentRunning, setCurrentRunning] = useState(null);
  const [currentQueue, setCurrentQueue] = useState([]);
  const [currentWaiting, setCurrentWaiting] = useState([]);
  const [averageWaitTime, setAverageWaitTime] = useState(0);
  const [averageResponseTime, setAverageResponseTime] = useState(0);
  const [averageTurnaroundTime, setAverageTurnaroundTime] = useState(0);
  const [hasRunBefore, setHasRunBefore] = useState(false); // Track if simulation has run before
  const colorPalette = ["#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#A133FF", "#33FFF9"];
  
  const fileInputRef = useRef(null);
  const stopRef = useRef(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files[0];
    setCsvFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const rows = text.split("\n").slice(1);
      const parsedData = rows.map((row, index) => {
        const cols = row.split(",");
        return {
          pid: `P${cols[0]}`,
          arrivalTime: parseInt(cols[1]) || 0,
          burstTime: parseInt(cols[2]) || 0,
          priority: cols[5] ? parseInt(cols[5]) : Infinity,
          color: colorPalette[index % colorPalette.length],
        };
      });
      setProcessData(parsedData);
    };
    reader.readAsText(file);
  };

  const runSimulation2 = async () => {
    if (!csvFile) {
      alert("Please upload a CSV file first.");
      return;
    }
  
    if (hasRunBefore) {
      const shouldRestart = window.confirm("The simulation has already run. Do you want to start over?");
      if (!shouldRestart) {
        return;
      }
    }
  
    // Reset state if starting over
    if (hasRunBefore) {
      resetSimulation();
    }
  
    stopRef.current = false;
    setRunning(true);
    setHasRunBefore(true); // Mark that the simulation has run before
    setSimulationData([]);
    setLog([]);
    setCurrentRunning(null);
    setCurrentQueue([]);
    setCurrentWaiting([]);
    setCurrentClock(0);
    setAverageWaitTime(0);
    setAverageResponseTime(0);
    setAverageTurnaroundTime(0);
  
    const totalBurstTime = processData.reduce((sum, process) => sum + process.burstTime, 0);
    let clockCount = 0;
    const remainingProcessesData = processData.map(data => 
      new Process(data.pid, data.arrivalTime, data.burstTime, data.priority, data.color, 0, 0)
    );
    remainingProcessesData.sort((a, b) => a.arrivalTime - b.arrivalTime);
    const waitingQueue = [];
    let readyProcess = null;
    let currentRunning = null;
    const scheduledProcess = [];
    const firstResponse = {}; // Track the first response time for each process
    const completionTimes = {}; // Track completion time for each process
  
    while (clockCount <= totalBurstTime) {
      if (stopRef.current) {
        setRunning(false);
        return;
      }
  
      await sleep(1000); // Simulate time passing
  
      // Handle incoming processes
      if (remainingProcessesData.length > 0) {
        const nextIncommingProcess = remainingProcessesData[0];
        if (nextIncommingProcess.arrivalTime === clockCount) {
          const currentProcess = remainingProcessesData.shift();
          waitingQueue.push(currentProcess);
          if (algorithm === "Priority") {
            waitingQueue.sort((a, b) => a.priority - b.priority);
            setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${currentProcess.pid} pushed to waiting queue by priority`);
          } else {
            setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${currentProcess.pid} pushed to waiting queue`);
          }
          setCurrentWaiting(waitingQueue);
          continue;
        }
      }
  
      // Handle process scheduling
      if (currentRunning == null) {
        if (readyProcess == null) {
          readyProcess = waitingQueue.shift();
          if (readyProcess) {
            setCurrentWaiting(waitingQueue);
            setCurrentQueue([readyProcess]);
            setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${readyProcess.pid} pushed to ready queue from waiting queue`);
            continue;
          }
        } else {
          currentRunning = readyProcess;
          readyProcess = null;
          setCurrentQueue([]);
          setCurrentRunning(currentRunning);
          setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${currentRunning.pid} pushed to running`);
  
          // Track first response time
          if (!firstResponse[currentRunning.pid]) {
            firstResponse[currentRunning.pid] = clockCount;
          }
          continue;
        }
      } else {
        if (currentRunning.burstTime > 0) {
          switch (algorithm) {
            case "FCFS":
            case "Priority":
              setCurrentRunning(currentRunning);
              setCurrentQueue([]);
              readyProcess = null;
              scheduledProcess.push(currentRunning);
              setSimulationData(scheduledProcess);
              setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${currentRunning.pid} is running & remaining task ${currentRunning.burstTime}`);
              currentRunning.burstTime -= 1;
              clockCount++;
              currentRunning.currentExecutionTime += 1;
              continue;
            case "RoundRobin":
              if (currentRunning.currentExecutionTime < 2) {
                currentRunning.currentExecutionTime += 1;
                currentRunning.burstTime -= 1;
                clockCount++;
                simulationData.push(currentRunning);
                scheduledProcess.push(currentRunning);
                setSimulationData(scheduledProcess);
                setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${currentRunning.pid} is running`);
              } else {
                const pid = currentRunning.pid;
                currentRunning.currentExecutionTime = 0;
                waitingQueue.push(currentRunning);
                currentRunning = null;
                setCurrentRunning(null);
                setCurrentWaiting(waitingQueue);
                setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${pid} is going to waiting queue`);
              }
          }
        } else {
          // Process completed
          completionTimes[currentRunning.pid] = clockCount; // Store completion time
          currentRunning = null;
          setCurrentRunning(null);
          continue;
        }
      }
      if (algorithm == "FCFS" || algorithm == "FCFS") {
        clockCount++;
      }

      if (Object.keys(completionTimes).length == processData.length ) {
        break
      }
      
    }
  
    // Simulation completed
    console.log("Process completed");
  
    // Calculate metrics after simulation ends
    const processes = processData.map((process) => {
      const completionTime = completionTimes[process.pid] || 0;
      const turnaroundTime = completionTime - process.arrivalTime;
      const waitTime = turnaroundTime - process.burstTime;
      const responseTime = firstResponse[process.pid] - process.arrivalTime;
  
      return {
        pid: process.pid,
        turnaroundTime,
        waitTime,
        responseTime,
      };
    });
  
    const totalWaitTime = processes.reduce((sum, process) => sum + process.waitTime, 0);
    const totalResponseTime = processes.reduce((sum, process) => sum + process.responseTime, 0);
    const totalTurnaroundTime = processes.reduce((sum, process) => sum + process.turnaroundTime, 0);
  
    setAverageWaitTime(totalWaitTime / processData.length);
    setAverageResponseTime(totalResponseTime / processData.length);
    setAverageTurnaroundTime(totalTurnaroundTime / processData.length);
  
    // Reset the button state
    setRunning(false);
  };
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function setLoggger(currentRunning: Process | null, clock: number, ready: Process | null, waiting: Process[], event: string) {
    const waitingString = waiting.map((p) => p.pid).join(", ");
  
    setLog((prevLog) => [
      ...prevLog,
      {
        time: clock,
        running: currentRunning ? currentRunning.pid : null,
        ready: ready ? ready.pid : null,
        waiting: waitingString,
        event: event,
      },
    ]);
  }

  const handleStop = () => {
    stopRef.current = true;
    setRunning(false);
  };

  const handleClear = () => {
    setCsvFile(null);
    setProcessData([]);
    setSimulationData([]);
    setAlgorithm("FCFS");
    setLog([]);
    setRunning(false);
    setCurrentRunning(null);
    setCurrentQueue([]);
    setCurrentClock(0);
    setCurrentWaiting([]);
    setHasRunBefore(false); // Reset the hasRunBefore state
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    stopRef.current = false;
  };

  const resetSimulation = () => {
    setCsvFile(null);
    setSimulationData([]);
    setAlgorithm("FCFS");
    setLog([]);
    setRunning(false);
    setCurrentRunning(null);
    setCurrentQueue([]);
    setCurrentClock(0);
    setCurrentWaiting([]);
    setHasRunBefore(false); // Reset the hasRunBefore state
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    stopRef.current = false;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">CPU Scheduler Visualizer</h1>
        <p className="mt-2 text-gray-600">Interactive process scheduling simulation</p>
      </header>

      <div className="mb-8 space-y-6">
        <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm">
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 sm:px-6 py-2 sm:py-4 transition-colors hover:border-blue-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="font-medium text-gray-700">Upload CSV</span>
              <input 
                type="file" 
                accept=".csv" 
                className="hidden" 
                onChange={handleFileUpload} 
                ref={fileInputRef}
              />
            </label>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Algorithm:</span>
              <select 
                value={algorithm} 
                onChange={(e) => setAlgorithm(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm 
                          focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                          transition-all duration-200 hover:border-gray-400"
              >
                <option value="FCFS" className="text-gray-900">First Come First Serve (FCFS)</option>
                <option value="RoundRobin" className="text-gray-900">Round Robin (Quantum 2ms)</option>
                <option value="Priority" className="text-gray-900">Priority-Based Scheduling</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={runSimulation2}
                disabled={running}
                className={`rounded-lg px-4 sm:px-6 py-2 font-medium text-white transition-colors ${running ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {running ? 'Running...' : 'Start Simulation'}
              </button>
              <button
                onClick={handleStop}
                disabled={!running}
                className="rounded-lg bg-red-600 px-4 sm:px-6 py-2 font-medium text-white transition-colors hover:bg-red-700 disabled:bg-red-300"
              >
                Stop
              </button>
              <button
                onClick={handleClear}
                className="rounded-lg bg-gray-200 px-4 sm:px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-300"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {processData.length > 0 && (
          <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold text-gray-800">Process Overview</h2>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm font-medium text-gray-500">Process</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm font-medium text-gray-500">Arrival</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm font-medium text-gray-500">Burst</th>
                    <th className="px-4 sm:px-6 py-3 text-left text-sm font-medium text-gray-500">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {processData.map((process, index) => (
                    <tr key={index}>
                      <td className="whitespace-nowrap px-4 sm:px-6 py-4 font-medium text-gray-900">{process.pid}</td>
                      <td className="px-4 sm:px-6 py-4 text-gray-700">{process.arrivalTime}</td>
                      <td className="px-4 sm:px-6 py-4 text-gray-700">{process.burstTime}</td>
                      <td className="px-4 sm:px-6 py-4 text-gray-700">{process.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-medium text-gray-800">Queue Status</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-600">Running</h4>
                <div className="mt-2 min-h-[40px] rounded-lg bg-gray-50 p-3">
                  {currentRunning ? (
                    <span 
                      className="inline-block rounded-full px-3 py-1 text-sm font-medium"
                      style={{ backgroundColor: currentRunning.color, color: 'white' }}
                    >
                      {currentRunning.pid}
                    </span>
                  ) : (
                    <span className="text-gray-400">Idle</span>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600">Ready Queue</h4>
                <div className="mt-2 min-h-[80px] rounded-lg bg-gray-50 p-3">
                  {currentQueue.map((process, index) => (
                    <span
                      key={index}
                      className="mr-2 inline-block rounded-full px-3 py-1 text-sm font-medium"
                      style={{ backgroundColor: process.color, color: 'white' }}
                    >
                      {process.pid}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-600">Waiting Processes</h4>
                <div className="mt-2 min-h-[80px] rounded-lg bg-gray-50 p-3">
                  {currentWaiting.map((process, index) => (
                    <span
                      key={index}
                      className="mr-2 inline-block rounded-full px-3 py-1 text-sm font-medium"
                      style={{ backgroundColor: process.color, color: 'white' }}
                    >
                      {process.pid}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm md:col-span-2">
            <h3 className="mb-4 text-lg font-medium text-gray-800">Gantt Chart</h3>
            <div className="overflow-x-auto">
              <div className="flex border-b border-gray-200" style={{ minWidth: `${simulationData.length * 40}px` }}>
                {simulationData.map((data, index) => (
                  <motion.div
                    key={index}
                    style={{ 
                      width: `${40}px`,
                      backgroundColor: data.color
                    }}
                    className="relative flex h-12 items-center justify-center border-r border-white text-sm font-medium text-white"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    {data.pid}
                  </motion.div>
                ))}
              </div>

              <div 
                className="relative mt-2 h-6 pl-[20px]"
                style={{ width: `${simulationData.length * 40}px` }}
              >
                {Array.from({ length: simulationData.length + 1 }).map((_, index) => (
                  <div
                    key={index}
                    className="absolute top-0 text-xs text-gray-500"
                    style={{ 
                      left: `${index * 40}px`,
                      transform: index === 0 ? 'translateX(0)' : 'translateX(-50%)'
                    }}
                  >
                    {index}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-gray-800">Performance Metrics</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <dt className="text-sm font-medium text-blue-600">Avg Wait Time</dt>
              <dd className="mt-1 text-2xl font-semibold text-blue-700">{averageWaitTime.toFixed(2)}</dd>
            </div>
            <div className="rounded-lg bg-green-50 p-4">
              <dt className="text-sm font-medium text-green-600">Avg Response Time</dt>
              <dd className="mt-1 text-2xl font-semibold text-green-700">{averageResponseTime.toFixed(2)}</dd>
            </div>
            <div className="rounded-lg bg-purple-50 p-4">
              <dt className="text-sm font-medium text-purple-600">Avg Turnaround Time</dt>
              <dd className="mt-1 text-2xl font-semibold text-purple-700">{averageTurnaroundTime.toFixed(2)}</dd>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-white p-4 sm:p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-medium text-gray-800">Simulation Log</h3>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-left text-sm font-medium text-gray-500">Time</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-sm font-medium text-gray-500">Event</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-sm font-medium text-gray-500">Running</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-sm font-medium text-gray-500">Ready</th>
                  <th className="px-4 sm:px-6 py-3 text-left text-sm font-medium text-gray-500">Waiting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {log.map((entry, index) => (
                  <tr key={index}>
                    <td className="whitespace-nowrap px-4 sm:px-6 py-4 font-mono text-sm text-gray-600">{entry.time}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-900">{entry.event}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{entry.running || '-'}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{entry.ready || '-'}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-600">{entry.waiting || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProcessSimulator;