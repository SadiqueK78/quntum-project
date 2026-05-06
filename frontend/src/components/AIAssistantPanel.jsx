/**
 * AIAssistantPanel — Right-side collapsible panel that displays AI-powered
 * explanations of gates, circuits, and simulation steps.
 *
 * Features:
 * - Glassmorphism design with smooth Framer Motion animations
 * - Gate explanation on click
 * - Full circuit explanation
 * - Step-by-step simulation walkthrough
 * - Loading states with animated skeleton
 * - Error handling with fallback messages
 * - Markdown-style rendering for AI responses
 */

import React, { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCircuitStore } from '../store/useCircuitStore'
import { useAI } from '../hooks/useAI'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

// ---------------------------------------------------------------------------
// Markdown + Math renderer
// ---------------------------------------------------------------------------
const markdownComponents = {
  h1: ({node, ...props}) => <h2 className="text-lg font-bold gradient-text mt-4 mb-2 break-words" {...props} />,
  h2: ({node, ...props}) => <h3 className="text-base font-bold text-white mt-4 mb-1 break-words" {...props} />,
  h3: ({node, ...props}) => <h4 className="text-sm font-bold text-quantum-blue mt-3 mb-1 break-words" {...props} />,
  p: ({node, ...props}) => <p className="text-sm text-white/80 leading-relaxed mb-2 break-words overflow-hidden" {...props} />,
  ul: ({node, ...props}) => <ul className="space-y-1 mb-2" {...props} />,
  li: ({node, ...props}) => (
    <li className="flex gap-2 text-sm text-white/80 pl-2 break-words">
      <span className="text-quantum-blue mt-0.5 shrink-0">•</span>
      <span className="break-words">{props.children}</span>
    </li>
  ),
  code: ({node, className, children, ...props}) => {
    const isInline = !className || !className.includes('language-')
    if (isInline) {
      return (
        <code className="px-1.5 py-0.5 bg-quantum-blue/10 border border-quantum-blue/20 rounded text-quantum-blue text-xs font-mono break-words overflow-x-auto" {...props}>
          {children}
        </code>
      )
    }
    return (
      <div className="my-2 p-2 bg-black/30 border border-white/10 rounded-lg overflow-x-auto max-w-full">
        <code className={`text-xs font-mono text-white/80 break-words whitespace-pre-wrap ${className || ''}`} {...props}>
          {children}
        </code>
      </div>
    )
  },
  strong: ({node, ...props}) => <strong className="text-white font-semibold break-words" {...props} />,
}

function MarkdownRenderer({ content }) {
  if (!content) return null

  return (
    <div className="ai-markdown w-full max-w-full overflow-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function LoadingSkeleton() {
  return (
    <div className="space-y-3 py-2">
      {/* Animated typing dots */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-quantum-blue"
              animate={{
                scale: [1, 1.4, 1],
                opacity: [0.4, 1, 0.4],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>
        <span className="text-sm text-white/50">AI is thinking...</span>
      </div>

      {/* Shimmer lines */}
      {[1, 0.85, 1, 0.7, 0.9, 0.6].map((width, i) => (
        <motion.div
          key={i}
          className="h-3 rounded-full bg-white/5"
          style={{ width: `${width * 100}%` }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mode badge component
// ---------------------------------------------------------------------------
function ModeBadge({ mode }) {
  const config = {
    gate: { label: 'Gate Explanation', color: 'quantum-pink', icon: '🔬' },
    circuit: { label: 'Circuit Explanation', color: 'quantum-blue', icon: '🔗' },
    step: { label: 'Step-by-Step', color: 'quantum-purple', icon: '👣' },
  }

  const { label, icon } = config[mode] || { label: 'Explanation', icon: '💡' }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/70">
      <span>{icon}</span>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function AIAssistantPanel() {
  const {
    aiResponse,
    isAILoading,
    isAIPanelOpen,
    aiError,
    explanationMode,
    selectedGateForAI,
    beginnerMode,
    toggleAIPanel,
    toggleBeginnerMode,
  } = useCircuitStore()

  const { handleExplainCircuit, handleClearAI } = useAI()
  const scrollRef = useRef(null)
  const [isSpeaking, setIsSpeaking] = useState(false)

  // Stop speaking when component unmounts
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  // Stop speaking when response changes
  useEffect(() => {
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [aiResponse])

  const handleToggleSpeech = () => {
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
    } else {
      if (!aiResponse) return
      
      // Basic cleanup of markdown and math for speech
      let textToSpeak = aiResponse
        .replace(/```[\s\S]*?```/g, ' Code snippet omitted. ')
        .replace(/([_*~`#])/g, '')
        .replace(/\\\[|\\\]|\\\(|\\\)/g, '')
        .replace(/\\frac{([^}]+)}{([^}]+)}/g, '$1 over $2')
        .replace(/\^\{([^}]+)\}/g, ' to the power of $1 ')
        .replace(/\\theta/g, 'theta')
        .replace(/\\pi/g, 'pi')
        .replace(/\\sqrt{([^}]+)}/g, ' square root of $1 ')

      const utterance = new SpeechSynthesisUtterance(textToSpeak)
      
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      setIsSpeaking(true)
      window.speechSynthesis.speak(utterance)
    }
  }

  // Auto-scroll to bottom when new content arrives
  useEffect(() => {
    if (scrollRef.current && aiResponse) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      })
    }
  }, [aiResponse])

  return (
    <>
      {/* Toggle button — always visible */}
      <motion.button
        onClick={toggleAIPanel}
        className={`
          fixed right-4 top-1/2 -translate-y-1/2 z-50
          w-12 h-12 rounded-full flex items-center justify-center
          border border-white/20 shadow-lg shadow-quantum-purple/20
          transition-all duration-300 hover:scale-110
          ${isAIPanelOpen
            ? 'bg-quantum-purple/30 border-quantum-purple/50'
            : 'bg-dark-800/80 backdrop-blur-md hover:bg-quantum-purple/20'
          }
          ${isAILoading ? 'animate-pulse' : ''}
        `}
        whileTap={{ scale: 0.9 }}
        title={isAIPanelOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
      >
        <span className="text-lg">{isAIPanelOpen ? '✕' : '⚛️'}</span>
      </motion.button>

      {/* Panel */}
      <AnimatePresence>
        {isAIPanelOpen && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-40 w-[400px] max-w-[90vw]
              bg-dark-900/85 backdrop-blur-2xl border-l border-white/10
              shadow-2xl shadow-black/40 flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-quantum-purple to-quantum-pink
                    flex items-center justify-center shadow-lg shadow-quantum-purple/30">
                    <span className="text-base">⚛️</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">AI Tutor</h2>
                    <p className="text-[11px] text-white/40">Quantum Learning Assistant</p>
                  </div>
                </div>
                <motion.button
                  onClick={toggleAIPanel}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
                  whileTap={{ scale: 0.9 }}
                >
                  ✕
                </motion.button>
              </div>

              {/* Actions row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Beginner mode toggle */}
                <button
                  onClick={toggleBeginnerMode}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                    border transition-all duration-200
                    ${beginnerMode
                      ? 'bg-green-500/15 border-green-400/40 text-green-300'
                      : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70 hover:border-white/20'
                    }
                  `}
                >
                  🎓 Beginner
                  <span className={`w-6 h-3.5 rounded-full relative transition-all ${beginnerMode ? 'bg-green-500/40' : 'bg-white/10'}`}>
                    <span className={`absolute top-0.5 w-2.5 h-2.5 rounded-full transition-all ${beginnerMode ? 'right-0.5 bg-green-400' : 'left-0.5 bg-white/40'}`} />
                  </span>
                </button>

                {/* Explain circuit button */}
                <motion.button
                  onClick={handleExplainCircuit}
                  disabled={isAILoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                    bg-quantum-blue/10 border border-quantum-blue/30 text-quantum-blue
                    hover:bg-quantum-blue/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  whileTap={{ scale: 0.95 }}
                >
                  🔗 Explain Circuit
                </motion.button>

                {/* Voice button */}
                {aiResponse && (
                  <motion.button
                    onClick={handleToggleSpeech}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs transition-all border
                      ${isSpeaking 
                        ? 'bg-quantum-pink/20 border-quantum-pink/40 text-quantum-pink' 
                        : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20'
                      }
                    `}
                    whileTap={{ scale: 0.95 }}
                    title={isSpeaking ? "Stop Speaking" : "Read Aloud"}
                  >
                    {isSpeaking ? '⏹ Stop' : '🔊 Listen'}
                  </motion.button>
                )}

                {/* Clear button */}
                {aiResponse && (
                  <motion.button
                    onClick={handleClearAI}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs
                      bg-white/5 border border-white/10 text-white/40 hover:text-white/70 hover:border-white/20 transition-all"
                    whileTap={{ scale: 0.95 }}
                  >
                    🗑 Clear
                  </motion.button>
                )}
              </div>
            </div>

            {/* Content area */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-5 space-y-4 w-full max-w-full"
            >
              {/* Mode badge */}
              {explanationMode && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <ModeBadge mode={explanationMode} />
                </motion.div>
              )}

              {/* Selected gate info */}
              {selectedGateForAI && explanationMode === 'gate' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-quantum-pink/5 border border-quantum-pink/20"
                >
                  <p className="text-xs text-quantum-pink font-semibold mb-1">Selected Gate</p>
                  <p className="text-sm text-white font-mono">
                    {selectedGateForAI.type}
                    {selectedGateForAI.qubit !== undefined && ` on q${selectedGateForAI.qubit}`}
                    {selectedGateForAI.step !== undefined && ` @ step ${selectedGateForAI.step}`}
                    {selectedGateForAI.controlQubit !== undefined && ` (ctrl: q${selectedGateForAI.controlQubit})`}
                    {selectedGateForAI.theta !== undefined && ` θ=${Number(selectedGateForAI.theta).toFixed(4)}`}
                  </p>
                </motion.div>
              )}

              {/* Loading state */}
              {isAILoading && <LoadingSkeleton />}

              {/* Error state */}
              {aiError && !isAILoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-red-500/10 border border-red-500/30"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">⚠️</span>
                    <div>
                      <p className="text-sm font-semibold text-red-300 mb-1">AI Unavailable</p>
                      <p className="text-xs text-red-300/70">{aiError}</p>
                      <p className="text-xs text-white/40 mt-2">
                        Make sure your OpenRouter API key is configured in the backend
                        <code className="ml-1 px-1 py-0.5 bg-white/5 rounded text-[10px]">.env</code> file.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* AI Response */}
              {aiResponse && !isAILoading && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="ai-response-content"
                >
                  <MarkdownRenderer content={aiResponse} />
                </motion.div>
              )}

              {/* Empty state */}
              {!aiResponse && !isAILoading && !aiError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-quantum-purple/20 to-quantum-blue/20
                    border border-white/10 flex items-center justify-center mb-4">
                    <span className="text-2xl">✨</span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">Ready to Learn</h3>
                  <p className="text-sm text-white/50 max-w-[260px] leading-relaxed">
                    Click any gate in the circuit to get an explanation, or use the
                    <strong className="text-quantum-blue"> Explain Circuit </strong>
                    button above.
                  </p>

                  <div className="mt-6 space-y-2 text-left w-full max-w-[260px]">
                    <p className="text-xs text-white/30 uppercase tracking-wider font-semibold">Try this:</p>
                    {[
                      { icon: '🖱️', text: 'Right-click a gate → Explain' },
                      { icon: '🔗', text: 'Click "Explain Circuit" above' },
                      { icon: '👣', text: 'Enable step-by-step in Controls' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/40">
                        <span>{item.icon}</span>
                        <span>{item.text}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-white/10 text-center">
              <p className="text-[10px] text-white/25">
                Powered by OpenRouter AI • Model: {import.meta.env.VITE_AI_MODEL || 'gpt-4o-mini'}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default AIAssistantPanel
