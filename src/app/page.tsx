"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Button, Select, MenuItem, Input, Table, TableHead, TableRow, TableCell, TableBody, Paper } from "@mui/material";

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

  const runSimulation = async () => {
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
  
    let scheduledProcesses = [];
    let queue = [];
    let clock = 0;
    let runningProcess = null;
    let remainingProcesses = [...processData];
    let readyQueue  = [];
    let watingQueue = [];
  
    while (!stopRef.current && (remainingProcesses.length > 0 || queue.length > 0 || runningProcess)) {
      let hasActivity = false; // Track if any processing occurred in this iteration
  
      const newArrivals = remainingProcesses.filter((p) => p.arrivalTime <= clock);
      if (newArrivals.length > 0) {
        if (runningProcess) {
          newArrivals.forEach((process) => {
            queue.push(process);
            remainingProcesses = remainingProcesses.filter((p) => !newArrivals.includes(p));
            watingQueue = [...queue]
            let rQStr = readyQueue.map((p) => p.pid).join(", ");
            let wQStr = watingQueue.map((p) => p.pid).join(", ");
            setCurrentWaiting(watingQueue);
            setLog((prevLog) => [
              ...prevLog,
              {
                time: clock,
                running: runningProcess.pid,
                ready: rQStr,
                waiting: wQStr,
                event: `Process ${process.pid} arrived and added to Waiting Queue`,
              },
            ]);
          });
        }else {
          newArrivals.forEach((process) => {
            queue.push(process);
            remainingProcesses = remainingProcesses.filter((p) => !newArrivals.includes(p));
            readyQueue = [process]
            let rQStr = readyQueue.map((p) => p.pid).join(", ");
            let wQStr = watingQueue.map((p) => p.pid).join(", ");
            setCurrentQueue(readyQueue);
            setLog((prevLog) => [
              ...prevLog,
              {
                time: clock,
                running: currentRunning ? currentRunning.pid : "None",
                ready: rQStr,
                waiting: wQStr,
                event: `Process ${process.pid} arrived and added to Ready Queue`,
              },
            ]);
          });
        }
        hasActivity = true;
      }
  
      if (!runningProcess && queue.length > 0) {
        let selectedProcess;
        switch (algorithm) {
          case "FCFS":
            selectedProcess = queue.shift();
            break;
          case "RoundRobin":
            selectedProcess = queue.shift();
            if (selectedProcess.burstTime > 2) {
              queue.push({ ...selectedProcess, burstTime: selectedProcess.burstTime - 2 });
              selectedProcess = { ...selectedProcess, burstTime: 2 };
            }
            break;
          case "Priority":
            queue.sort((a, b) => a.priority - b.priority);
            selectedProcess = queue.shift();
            break;
          default:
            selectedProcess = queue.shift();
        }
        runningProcess = selectedProcess;
        readyQueue = [...queue];
        setCurrentQueue(readyQueue);
        setCurrentRunning(runningProcess);
        let rQStr = readyQueue.map((p) => p.pid).join(", ");
        let wQStr = watingQueue.map((p) => p.pid).join(", ");
        setLog((prevLog) => [
          ...prevLog,
          {
            time: clock,
            running: runningProcess.pid,
            ready: rQStr,
            waiting: wQStr,
            event: `Process ${runningProcess.pid} moved from Ready Queue to Running`,
          },
        ]);
        hasActivity = true;
      }
  
      if (runningProcess) {
        runningProcess.burstTime--;
        scheduledProcesses.push({
          pid: runningProcess.pid,
          startTime: clock,
          duration: 1,
          color: runningProcess.color,
        });
        hasActivity = true;
  
        if (runningProcess.burstTime === 0) {
          let pid = runningProcess.pid;
          let rQStr = readyQueue.map((p) => p.pid).join(", ");
          let wQStr = watingQueue.map((p) => p.pid).join(", ")
          setLog((prevLog) => [
            ...prevLog,
            {
              time: clock,
              running: pid,
              ready: rQStr,
              waiting: wQStr,
              event: `Process ${pid} completed execution and terminated`,
            },
          ]);
          runningProcess = null;
          setCurrentRunning(null);
          
        }else {
          let rQStr = readyQueue.map((p) => p.pid).join(", ");
          let wQStr = watingQueue.map((p) => p.pid).join(", ");
          setLog((prevLog) => [
            ...prevLog,
            {
              time: clock,
              running: runningProcess ? runningProcess.pid : "None",
              ready: rQStr,
              waiting: wQStr,
              event: `State at Time ${clock} RP`,
            },
          ]);
        }
      }else{
        let rQStr = readyQueue.map((p) => p.pid).join(", ");
        let wQStr = watingQueue.map((p) => p.pid).join(", ")
        setLog((prevLog) => [
          ...prevLog,
          {
            time: clock,
            running: runningProcess ? runningProcess.pid : "None",
            ready: rQStr,
            waiting: wQStr,
            event: `State at Time ${clock} NRP`,
          },
        ]);
      }

      
  
      // Increment clock only if there was activity or forced by termination
      if (hasActivity || runningProcess) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        clock++;
        setCurrentClock(clock);
      } else {
        const nextArrival = remainingProcesses.reduce((min, p) => p.arrivalTime < min ? p.arrivalTime : min, Infinity);
        if (nextArrival !== Infinity) {
          clock += 1;
          setCurrentClock(clock);
        } else {
          break; // No more processes
        }
      }
      watingQueue = remainingProcesses.filter((p) => p.arrivalTime <= clock);
      setCurrentWaiting(watingQueue);
      setSimulationData([...scheduledProcesses]);
    }
  
    setRunning(false);
    stopRef.current = false;
  };

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
          <Button variant="contained" color="primary" onClick={runSimulation} disabled={running}>
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