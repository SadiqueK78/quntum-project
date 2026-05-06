import React from 'react'
import { motion } from 'framer-motion'
import { useCircuitStore } from '../store/useCircuitStore'
import { useAI } from '../hooks/useAI'
import axios from 'axios'
import { API_ENDPOINTS } from '../config/api'

const ALGORITHM_TEMPLATES = [
  {
    id: 'grover-2q',
    name: 'Grover Search (2-Qubit)',
    description: 'Single-iteration Grover search marking |11> with oracle + diffusion.',
    qubits: 2,
    gates: [
      { id: 'h0', qubit: 0, step: 0, type: 'H' },
      { id: 'h1', qubit: 1, step: 0, type: 'H' },
      { id: 'oh', qubit: 1, step: 1, type: 'H' },
      { id: 'ocx', qubit: 1, step: 2, type: 'CNOT', controlQubit: 0 },
      { id: 'oh2', qubit: 1, step: 3, type: 'H' },
      { id: 'dh0', qubit: 0, step: 4, type: 'H' },
      { id: 'dh1', qubit: 1, step: 4, type: 'H' },
      { id: 'dx0', qubit: 0, step: 5, type: 'X' },
      { id: 'dx1', qubit: 1, step: 5, type: 'X' },
      { id: 'doh', qubit: 1, step: 6, type: 'H' },
      { id: 'docx', qubit: 1, step: 7, type: 'CNOT', controlQubit: 0 },
      { id: 'doh2', qubit: 1, step: 8, type: 'H' },
      { id: 'dx0b', qubit: 0, step: 9, type: 'X' },
      { id: 'dx1b', qubit: 1, step: 9, type: 'X' },
      { id: 'dh0b', qubit: 0, step: 10, type: 'H' },
      { id: 'dh1b', qubit: 1, step: 10, type: 'H' },
    ],
  },
  {
    id: 'qft-3q',
    name: 'QFT (3-Qubit Native Approx)',
    description: 'QFT-style transform using native H, RZ, CNOT, and SWAP decomposition.',
    qubits: 3,
    gates: [
      { id: 'h2', qubit: 2, step: 0, type: 'H' },
      { id: 'rz1a', qubit: 1, step: 1, type: 'RZ', theta: 0.7853981634 },
      { id: 'cx21a', qubit: 1, step: 2, type: 'CNOT', controlQubit: 2 },
      { id: 'rz1b', qubit: 1, step: 3, type: 'RZ', theta: -0.7853981634 },
      { id: 'cx21b', qubit: 1, step: 4, type: 'CNOT', controlQubit: 2 },
      { id: 'rz0a', qubit: 0, step: 5, type: 'RZ', theta: 0.3926990817 },
      { id: 'cx20a', qubit: 0, step: 6, type: 'CNOT', controlQubit: 2 },
      { id: 'rz0b', qubit: 0, step: 7, type: 'RZ', theta: -0.3926990817 },
      { id: 'cx20b', qubit: 0, step: 8, type: 'CNOT', controlQubit: 2 },
      { id: 'h1', qubit: 1, step: 9, type: 'H' },
      { id: 'rz0c', qubit: 0, step: 10, type: 'RZ', theta: 0.7853981634 },
      { id: 'cx10a', qubit: 0, step: 11, type: 'CNOT', controlQubit: 1 },
      { id: 'rz0d', qubit: 0, step: 12, type: 'RZ', theta: -0.7853981634 },
      { id: 'cx10b', qubit: 0, step: 13, type: 'CNOT', controlQubit: 1 },
      { id: 'h0', qubit: 0, step: 14, type: 'H' },
      { id: 'swap02', qubit: 0, step: 15, type: 'SWAP', swapQubit: 2 },
    ],
  },
  {
    id: 'teleport-3q',
    name: 'Quantum Teleportation',
    description: 'Teleportation flow with Bell pair, Bell-basis measurement, and correction stage.',
    qubits: 3,
    gates: [
      { id: 'prep', qubit: 0, step: 0, type: 'RY', theta: 1.0471975512 },
      { id: 'h1', qubit: 1, step: 1, type: 'H' },
      { id: 'cx12', qubit: 2, step: 2, type: 'CNOT', controlQubit: 1 },
      { id: 'cx01', qubit: 1, step: 3, type: 'CNOT', controlQubit: 0 },
      { id: 'h0', qubit: 0, step: 4, type: 'H' },
      { id: 'm0', qubit: 0, step: 5, type: 'Measure' },
      { id: 'm1', qubit: 1, step: 5, type: 'Measure' },
      { id: 'bar', qubit: 1, step: 6, type: 'Barrier' },
      { id: 'corrx', qubit: 2, step: 7, type: 'X' },
      { id: 'corrz', qubit: 2, step: 8, type: 'Z' },
    ],
  },
  {
    id: 'superdense-2q',
    name: 'Superdense Coding',
    description: 'Encodes two classical bits onto one qubit with shared entanglement.',
    qubits: 2,
    gates: [
      { id: 'h0', qubit: 0, step: 0, type: 'H' },
      { id: 'cx01', qubit: 1, step: 1, type: 'CNOT', controlQubit: 0 },
      { id: 'x0', qubit: 0, step: 2, type: 'X' },
      { id: 'z0', qubit: 0, step: 3, type: 'Z' },
      { id: 'cx01d', qubit: 1, step: 4, type: 'CNOT', controlQubit: 0 },
      { id: 'h0d', qubit: 0, step: 5, type: 'H' },
    ],
  },
  {
    id: 'bitflip-5q',
    name: '3-Qubit Bit-Flip Code',
    description: 'Encode, inject bit-flip, and extract syndrome via ancilla qubits.',
    qubits: 5,
    gates: [
      { id: 'prep', qubit: 0, step: 0, type: 'RY', theta: 0.9 },
      { id: 'enc01', qubit: 1, step: 1, type: 'CNOT', controlQubit: 0 },
      { id: 'enc02', qubit: 2, step: 2, type: 'CNOT', controlQubit: 0 },
      { id: 'err', qubit: 1, step: 3, type: 'X' },
      { id: 's30', qubit: 3, step: 4, type: 'CNOT', controlQubit: 0 },
      { id: 's31', qubit: 3, step: 5, type: 'CNOT', controlQubit: 1 },
      { id: 's41', qubit: 4, step: 6, type: 'CNOT', controlQubit: 1 },
      { id: 's42', qubit: 4, step: 7, type: 'CNOT', controlQubit: 2 },
      { id: 'm3', qubit: 3, step: 8, type: 'Measure' },
      { id: 'm4', qubit: 4, step: 8, type: 'Measure' },
    ],
  },
  {
    id: 'deutsch-jozsa',
    name: 'Deutsch-Jozsa (Balanced Oracle)',
    description: 'Determines oracle balance in one query for a 1-bit function.',
    qubits: 2,
    gates: [
      { id: 'ancx', qubit: 1, step: 0, type: 'X' },
      { id: 'h0', qubit: 0, step: 1, type: 'H' },
      { id: 'h1', qubit: 1, step: 1, type: 'H' },
      { id: 'oracle', qubit: 1, step: 2, type: 'CNOT', controlQubit: 0 },
      { id: 'h0f', qubit: 0, step: 3, type: 'H' },
      { id: 'm0', qubit: 0, step: 4, type: 'Measure' },
    ],
  },
]

function ControlPanel() {
  const {
    qubits,
    setQubits,
    steps,
    setSteps,
    circuit,
    gates,
    resetCircuit,
    undo,
    redo,
    saveCircuit,
    loadCircuit,
    circuitCollection,
    circuitCollectionIndex,
    activeCircuitMeta,
    goToNextLoadedCircuit,
    goToPreviousLoadedCircuit,
    goToLoadedCircuitIndex,
    setSimulationResult,
    setIsSimulating,
    isSimulating,
    history,
    historyIndex,
    // AI state
    beginnerMode,
    toggleBeginnerMode,
    stepExplainMode,
    toggleStepExplainMode,
    highlightedStep,
    setHighlightedStep,
    isAILoading,
    toggleAIPanel,
  } = useCircuitStore()

  const { handleExplainCircuit, handleExplainStep } = useAI()

  const [error, setError] = React.useState(null)
  const [success, setSuccess] = React.useState(null)
  const fileInputRef = React.useRef(null)

  // Convert circuit to API format
  const circuitToGates = () => {
    const apiGates = []
    circuit.forEach((qubitRow, qubitIdx) => {
      qubitRow.forEach((gate, stepIdx) => {
        if (gate) {
          apiGates.push({
            type: gate.type,
            target: qubitIdx,
            step: stepIdx,
            ...(gate.type === 'CNOT' && {
              control: gate.controlQubit !== undefined ? gate.controlQubit : 0,
            }),
            ...(gate.type === 'CCNOT' && {
              control: gate.controlQubit,
              control2: gate.controlQubit2,
            }),
            ...(gate.type === 'SWAP' && {
              swap_with: gate.swapQubit,
            }),
            ...(gate.theta !== undefined && { theta: gate.theta }),
          })
        }
      })
    })
    return apiGates
  }

  const runSimulation = async () => {
    if (gates.length === 0) {
      setError('Please add some gates to the circuit first')
      setTimeout(() => setError(null), 3000)
      return
    }

    setIsSimulating(true)
    setError(null)

    try {
      const response = await axios.post(API_ENDPOINTS.SIMULATE, {
        qubits,
        gates: circuitToGates(),
      })

      setSimulationResult(response.data)
      setSuccess('Simulation complete!')
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError('Simulation failed: ' + (err.response?.data?.error || err.message))
      setIsSimulating(false)
    }
  }

  const handleAddQubit = () => {
    if (qubits < 5) {
      setQubits(qubits + 1)
    }
  }

  const handleRemoveQubit = () => {
    if (qubits > 1) {
      setQubits(qubits - 1)
    }
  }

  const handleLoadCircuit = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result)
          loadCircuit(data)
          const count = Array.isArray(data.circuits) ? data.circuits.length : 1
          setSuccess(`Loaded ${count} circuit${count > 1 ? 's' : ''} successfully`)
          setTimeout(() => setSuccess(null), 3000)
        } catch (err) {
          setError('Invalid circuit file: ' + (err.message || 'Unknown format'))
          setTimeout(() => setError(null), 3000)
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    }
  }

  const handleLoadTemplate = (template) => {
    loadCircuit({
      name: template.name,
      description: template.description,
      qubits: template.qubits,
      gates: template.gates,
    })
    setSuccess(`Loaded template: ${template.name}`)
    setTimeout(() => setSuccess(null), 3000)
  }

  const handleLoadMarketplacePack = () => {
    loadCircuit({
      circuits: ALGORITHM_TEMPLATES.map((template) => ({
        name: template.name,
        description: template.description,
        data: {
          qubits: template.qubits,
          gates: template.gates,
        },
      })),
    })

    setSuccess(`Loaded Algorithm Marketplace (${ALGORITHM_TEMPLATES.length} templates)`)
    setTimeout(() => setSuccess(null), 3000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass rounded-2xl p-6"
    >
      <h2 className="text-xl font-bold mb-4 gradient-text">Controls</h2>

      {/* Simulation button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={runSimulation}
        disabled={isSimulating}
        className={`
          w-full btn-quantum mb-4
          ${isSimulating ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isSimulating ? (
          <span className="flex items-center justify-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
            />
            Simulating...
          </span>
        ) : (
          '▶️ Run Simulation'
        )}
      </motion.button>

      {/* AI Learning Section */}
      <div className="mb-4 p-3 bg-gradient-to-br from-quantum-purple/5 to-quantum-blue/5 rounded-lg border border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <span>🤖</span> AI Learning
          </h3>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={toggleAIPanel}
            className="text-xs px-2 py-1 rounded-md bg-quantum-purple/15 border border-quantum-purple/30 text-quantum-purple hover:bg-quantum-purple/25 transition-all"
          >
            Panel
          </motion.button>
        </div>

        {/* Beginner Mode toggle */}
        <div className="flex items-center justify-between mb-2 py-1.5">
          <span className="text-xs text-white/60 flex items-center gap-1.5">
            🎓 Beginner Mode
          </span>
          <button
            onClick={toggleBeginnerMode}
            className={`
              w-9 h-5 rounded-full relative transition-all duration-200
              ${beginnerMode ? 'bg-green-500/40 border-green-400/40' : 'bg-white/10 border-white/15'}
              border
            `}
          >
            <span
              className={`
                absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200
                ${beginnerMode ? 'right-0.5 bg-green-400' : 'left-0.5 bg-white/40'}
              `}
            />
          </button>
        </div>

        {/* Explain Circuit button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleExplainCircuit}
          disabled={isAILoading || gates.length === 0}
          className="w-full bg-quantum-blue/15 hover:bg-quantum-blue/25 border border-quantum-blue/30
            rounded-lg py-2 mb-2 text-sm font-semibold text-quantum-blue
            disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isAILoading ? '⏳ Analyzing...' : '🔗 Explain Circuit'}
        </motion.button>

        {/* Step-by-Step Explain toggle */}
        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-white/60 flex items-center gap-1.5">
            👣 Step-by-Step
          </span>
          <button
            onClick={toggleStepExplainMode}
            className={`
              w-9 h-5 rounded-full relative transition-all duration-200
              ${stepExplainMode ? 'bg-quantum-purple/50 border-quantum-purple/40' : 'bg-white/10 border-white/15'}
              border
            `}
          >
            <span
              className={`
                absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200
                ${stepExplainMode ? 'right-0.5 bg-quantum-purple' : 'left-0.5 bg-white/40'}
              `}
            />
          </button>
        </div>

        {/* Step navigator — visible when step explain mode is on */}
        {stepExplainMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 p-2.5 bg-dark-800/60 rounded-lg border border-white/10"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-white/50">
                Step: {highlightedStep !== null ? highlightedStep : '—'} / {steps - 1}
              </span>
            </div>
            <div className="flex gap-1.5">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const prev = highlightedStep !== null ? Math.max(0, highlightedStep - 1) : 0
                  setHighlightedStep(prev)
                  handleExplainStep(prev)
                }}
                disabled={isAILoading}
                className="flex-1 bg-quantum-purple/15 hover:bg-quantum-purple/25 border border-quantum-purple/30
                  rounded-md py-1.5 text-xs font-semibold text-quantum-purple disabled:opacity-40 transition-all"
              >
                ◀ Prev
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const next = highlightedStep !== null ? Math.min(steps - 1, highlightedStep + 1) : 0
                  setHighlightedStep(next)
                  handleExplainStep(next)
                }}
                disabled={isAILoading}
                className="flex-1 bg-quantum-purple/15 hover:bg-quantum-purple/25 border border-quantum-purple/30
                  rounded-md py-1.5 text-xs font-semibold text-quantum-purple disabled:opacity-40 transition-all"
              >
                Next ▶
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Qubit controls */}
      <div className="mb-4 p-3 bg-dark-700/50 rounded-lg">
        <label className="text-sm text-white/60 mb-2 block">Qubits: {qubits}</label>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleRemoveQubit}
            disabled={qubits <= 1}
            className="flex-1 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 
              rounded-lg py-2 text-sm disabled:opacity-50"
          >
            −
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleAddQubit}
            disabled={qubits >= 5}
            className="flex-1 bg-green-600/30 hover:bg-green-600/50 border border-green-500/50
              rounded-lg py-2 text-sm disabled:opacity-50"
          >
            +
          </motion.button>
        </div>
      </div>

      {/* Steps control */}
      <div className="mb-4 p-3 bg-dark-700/50 rounded-lg">
        <label className="text-sm text-white/60 mb-2 block">Steps: {steps}</label>
        <input
          type="range"
          min="5"
          max="20"
          value={steps}
          onChange={(e) => setSteps(parseInt(e.target.value))}
          className="w-full"
        />
      </div>

      {/* Reset button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={resetCircuit}
        className="w-full bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500/50
          rounded-lg py-2 mb-4 text-sm font-semibold"
      >
        🔄 Reset Circuit
      </motion.button>

      {/* Undo/Redo */}
      <div className="flex gap-2 mb-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={undo}
          disabled={historyIndex <= 0}
          className="flex-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50
            rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
        >
          ↶
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={redo}
          disabled={historyIndex >= history.length - 1}
          className="flex-1 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/50
            rounded-lg py-2 text-sm font-semibold disabled:opacity-50"
        >
          ↷
        </motion.button>
      </div>

      {/* Save/Load */}
      <div className="flex gap-2 mb-4">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={saveCircuit}
          className="flex-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50
            rounded-lg py-2 text-sm font-semibold"
        >
          💾 Save
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/50
            rounded-lg py-2 text-sm font-semibold"
        >
          📂 Load
        </motion.button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleLoadCircuit}
          className="hidden"
        />
      </div>

      {/* Loaded circuit navigator */}
      {activeCircuitMeta && (
        <div className="mb-4 p-3 bg-dark-700/50 rounded-lg border border-white/10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs text-white/60">Loaded Circuit</span>
            <span className="text-xs text-quantum-blue">
              {circuitCollection.length > 0 ? `${circuitCollectionIndex + 1} / ${circuitCollection.length}` : '1 / 1'}
            </span>
          </div>

          <div className="text-sm font-semibold text-white mb-1 truncate">
            {activeCircuitMeta.name || 'Loaded Circuit'}
          </div>
          {activeCircuitMeta.description && (
            <p className="text-xs text-white/60 mb-3 line-clamp-2">{activeCircuitMeta.description}</p>
          )}

          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={goToPreviousLoadedCircuit}
              disabled={circuitCollection.length <= 1 || circuitCollectionIndex === 0}
              className="flex-1 bg-slate-600/30 hover:bg-slate-600/50 border border-slate-400/40
                rounded-lg py-2 text-sm font-semibold disabled:opacity-40"
            >
              ◀ Previous
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={goToNextLoadedCircuit}
              disabled={
                circuitCollection.length <= 1 ||
                circuitCollectionIndex >= circuitCollection.length - 1
              }
              className="flex-1 bg-slate-600/30 hover:bg-slate-600/50 border border-slate-400/40
                rounded-lg py-2 text-sm font-semibold disabled:opacity-40"
            >
              Next ▶
            </motion.button>
          </div>

          {circuitCollection.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <p className="text-xs text-white/60 mb-2">Circuit Tabs</p>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto pr-1">
                {circuitCollection.map((entry, idx) => (
                  <motion.button
                    key={`${entry.name || 'Circuit'}-${idx}`}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => goToLoadedCircuitIndex(idx)}
                    className={`
                      px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                      ${
                        idx === circuitCollectionIndex
                          ? 'bg-quantum-blue/25 border-quantum-blue text-quantum-blue shadow-md shadow-quantum-blue/20'
                          : 'bg-slate-700/30 border-slate-400/30 text-white/75 hover:border-quantum-blue/50 hover:text-white'
                      }
                    `}
                    title={entry.description || entry.name || `Circuit ${idx + 1}`}
                  >
                    {entry.name || `Circuit ${idx + 1}`}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Algorithm Template Marketplace */}
      <div className="mb-4 p-3 bg-dark-700/50 rounded-lg border border-white/10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-white">Algorithm Template Marketplace</h3>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLoadMarketplacePack}
            className="rounded-md border border-quantum-blue/40 bg-quantum-blue/10 px-2.5 py-1 text-xs font-semibold text-quantum-blue hover:bg-quantum-blue/20"
          >
            Load All
          </motion.button>
        </div>

        <p className="mb-3 text-xs text-white/60">
          One-click templates for Grover, QFT, Teleportation, Superdense Coding, Bit-Flip Code, and Deutsch-Jozsa.
        </p>

        <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {ALGORITHM_TEMPLATES.map((template) => (
            <motion.button
              key={template.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => handleLoadTemplate(template)}
              className="w-full rounded-lg border border-white/10 bg-slate-800/45 p-3 text-left transition-all hover:border-quantum-blue/40 hover:bg-slate-800/70"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-white">{template.name}</span>
                <span className="rounded-full border border-white/20 bg-white/5 px-2 py-0.5 text-[10px] text-white/70">
                  {template.qubits}q
                </span>
              </div>
              <p className="text-[11px] text-white/60">{template.description}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Status messages */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-3 bg-red-600/20 border border-red-500/50 rounded-lg text-red-300 text-sm mb-4"
        >
          ✕ {error}
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="p-3 bg-green-600/20 border border-green-500/50 rounded-lg text-green-300 text-sm"
        >
          ✓ {success}
        </motion.div>
      )}
    </motion.div>
  )
}

export default ControlPanel
