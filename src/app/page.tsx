"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button, Select, MenuItem, Input, Table, TableHead, TableRow, TableCell, TableBody, Paper } from "@mui/material";


class Process {
  pid: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  color: string;
  currentExecutionTime: number;

  constructor(pid: string, arrivalTime: number, burstTime: number, priority: number, color: string, currentExecutionTime: number) {
    this.pid = pid;
    this.arrivalTime = arrivalTime;
    this.burstTime = burstTime;
    this.priority = priority;
    this.color = color;
    this.currentExecutionTime = currentExecutionTime;
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
  const [currentClock, setCurrentClock] = useState(0);
  const [currentWaiting, setCurrentWaiting] = useState([]);
  const colorPalette = ["#FF5733", "#33FF57", "#3357FF", "#FF33A1", "#A133FF", "#33FFF9"];
  
  const fileInputRef = useRef(null);
  const stopRef = useRef(false);

  const handleFileUpload = (event) => {
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
    stopRef.current = false;
    setRunning(true);
    setSimulationData([]);
    setLog([]);
    setCurrentRunning(null);
    setCurrentQueue([]);
    setCurrentWaiting([]);
    setCurrentClock(0);
    const totalBurstTime = processData.reduce((sum, process) => sum + process.burstTime, 0);
    let clockCount = 0;
    let remainingProcessesData: Process[] = processData.map(data => 
      new Process(data.pid, data.arrivalTime, data.burstTime, data.priority, data.color, 0)
    );    
    remainingProcessesData.sort((a, b) => a.arrivalTime - b.arrivalTime);
    let waitingQueue: Process[] = [];
    let readyProcess: Process | null = null;
    let currentRunning: Process | null = null;
    let scheduledProcess : Process[] = [];
  
    while (clockCount <= totalBurstTime) {
      await sleep(1000);
      if (remainingProcessesData.length > 0) {
        let nextIncommingProcess = remainingProcessesData[0];
        if (nextIncommingProcess.arrivalTime == clockCount) {
          let currentProcess = remainingProcessesData[0]; // Update currentProcess here
          remainingProcessesData.shift();
  
          waitingQueue.push(currentProcess);
          if (algorithm === "Priority") {
            waitingQueue.sort((a, b) => {
                return a.priority - b.priority;
            });
            setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${currentProcess.pid} pushed to waiting queue by priority`);
          }else {
            setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${currentProcess.pid} pushed to waiting queue`);
          }
          setCurrentWaiting(waitingQueue);
         
          continue;
        }
      }
  
      if (currentRunning == null) {
        if (readyProcess == null) { 
          readyProcess = waitingQueue.shift();
          if (readyProcess) { // Ensure readyProcess is not null
            setCurrentWaiting(waitingQueue);
            setCurrentQueue([readyProcess]);
            setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${readyProcess.pid} pushed to ready queue from waiting queue`);
            continue;
          }
        } else {
          currentRunning = readyProcess;
          readyProcess = null
          setCurrentQueue([]);
          setCurrentRunning(currentRunning);
          setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${currentRunning.pid} pushed to running`);
          continue;
        }
      } else {
        if (currentRunning.burstTime > 0) {
          switch (algorithm) {
            case "FCFS" :
            case "Priority":
              setCurrentRunning(currentRunning);
              setCurrentQueue([]);
              readyProcess = null
              scheduledProcess.push(currentRunning)
              setSimulationData(scheduledProcess)
              setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${currentRunning.pid} is running & remaining task ${currentRunning.burstTime}`);
              currentRunning.burstTime -= 1;
              clockCount++;
              currentRunning.currentExecutionTime += 1
              continue;
            case "RoundRobin" :
              if (currentRunning.currentExecutionTime < 2) {
                currentRunning.currentExecutionTime += 1
                currentRunning.burstTime -= 1;
                clockCount++;
                simulationData.push(currentRunning)
                scheduledProcess.push(currentRunning)
                setSimulationData(scheduledProcess)
                setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${currentRunning.pid} is running`);
              }else {
                let pid = currentRunning.pid;
                currentRunning.currentExecutionTime = 0
                waitingQueue.push(currentRunning)
                currentRunning = null
                setCurrentRunning(null);
                setCurrentWaiting(waitingQueue)
                setLoggger(currentRunning, clockCount, readyProcess, waitingQueue, `${pid} is going to waiting queue`);
              }
          }

        } else {
          currentRunning = null;
          setCurrentRunning(null);
          continue;
        }
      }
    }
  };
  
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  function setLoggger(currentRunning: Process | null, clock: number, ready: Process | null, waiting: Process[], event: string) {
    let waitingString = waiting.map((p) => p.pid).join(", ");
  
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    stopRef.current = false;
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">CPU Scheduler Visualizer</h1>
      <Button variant="contained" component="label" className="mb-4">
        Upload CSV
        <Input 
          type="file" 
          accept=".csv" 
          hidden 
          onChange={handleFileUpload} 
          inputRef={fileInputRef}
        />
      </Button>

      {processData.length > 0 && (
        <Paper className="mt-6 p-4">
          <h2 className="text-lg font-semibold mb-2">Uploaded Process Data</h2>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Process</TableCell>
                <TableCell>Arrival Time</TableCell>
                <TableCell>Burst Time</TableCell>
                <TableCell>Priority</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {processData.map((process, index) => (
                <TableRow key={index}>
                  <TableCell>{process.pid}</TableCell>
                  <TableCell>{process.arrivalTime}</TableCell>
                  <TableCell>{process.burstTime}</TableCell>
                  <TableCell>{process.priority}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      <div className="mt-4 flex items-center gap-4">
        <Select value={algorithm} onChange={(e) => setAlgorithm(e.target.value)} className="mr-4">
          <MenuItem value="FCFS">FCFS</MenuItem>
          <MenuItem value="RoundRobin">Round Robin (Quantum 2ms)</MenuItem>
          <MenuItem value="Priority">Priority-Based Scheduling</MenuItem>
        </Select>
        <div className="flex gap-2">
          <Button variant="contained" color="primary" onClick={runSimulation2} disabled={running}>
            {running ? "Running..." : "Run Simulation"}
          </Button>
          <Button variant="contained" color="secondary" onClick={handleStop} disabled={!running}>
            Stop
          </Button>
          <Button variant="contained" color="error" onClick={handleClear} disabled={running}>
            Clear
          </Button>
        </div>
      </div>

      <Paper className="mt-6 p-4">
        <h2 className="text-lg font-semibold mb-2">Queue Status</h2>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>State</TableCell>
              <TableCell>Processes</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Running</TableCell>
              <TableCell>
                {currentRunning ? (
                  <span style={{ color: currentRunning.color }}>{currentRunning.pid}</span>
                ) : "None"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Ready Queue</TableCell>
              <TableCell>
                {currentQueue.map((process, index) => (
                  <span key={index} style={{ color: process.color, marginRight: "8px" }}>
                    {process.pid}
                  </span>
                ))}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Waiting Processes</TableCell>
              <TableCell>
                {currentWaiting.map((process, index) => (
                  <span key={index} style={{ color: process.color, marginRight: "8px" }}>
                    {process.pid}
                  </span>
                ))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Paper className="mt-6 p-4">
        <h2 className="text-lg font-semibold mb-2">Transaction Log</h2>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Running Process</TableCell>
              <TableCell>Ready Processes</TableCell>
              <TableCell>Waiting Processes</TableCell>
              <TableCell>Event</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {log.map((entry, index) => (
              <TableRow key={index}>
                <TableCell>{entry.time}</TableCell>
                <TableCell>{entry.running}</TableCell>
                <TableCell>{entry.ready}</TableCell>
                <TableCell>{entry.waiting}</TableCell>
                <TableCell>{entry.event}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Paper className="mt-6 p-4">
        <h2 className="text-lg font-semibold mb-2">Gantt Chart</h2>
        <div className="flex border w-full">
          {simulationData.map((data, index) => (
            <motion.div
              key={index}
              style={{ width: `${data.duration * 40}px`, backgroundColor: data.color }}
              className="text-center p-2 border-r relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <span className="absolute -top-5 text-xs font-bold">{data.startTime}</span>
              {data.pid}
            </motion.div>
          ))}
        </div>
      </Paper>
    </div>
  );
};

export default ProcessSimulator;