// src/components/AIAssistant.tsx
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OllamaService } from '../lib/ollama';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '¡Hola! Soy tu asistente clínico inteligente. ¿En qué te puedo ayudar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama3');
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOllama = async () => {
      const ok = await OllamaService.checkConnection();
      setIsConnected(ok);
      if (ok) {
        const availableModels = await OllamaService.getModels();
        setModels(availableModels);
        if (availableModels.length > 0 && !availableModels.includes(selectedModel)) {
          setSelectedModel(availableModels[0]);
        }
      }
    };
    checkOllama();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      let fullResponse = '';
      const contextMessages = messages.slice(-5); // Enviar últimos 5 mensajes para contexto rápido
      
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      await OllamaService.chat(
        selectedModel,
        [
          { role: 'system', content: 'Eres un asistente experto para una clínica odontológica llamada ErgoDentalve. Ayudas con resúmenes clínicos, administración y dudas técnicas.' },
          ...contextMessages,
          userMessage
        ],
        (chunk) => {
          fullResponse += chunk;
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1].content = fullResponse;
            return next;
          });
        }
      );
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: No pude conectarme con Ollama. Asegúrate de que esté corriendo con OLLAMA_ORIGINS habilitado.' }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* FAB Button */}
      <motion.button 
        className="ai-assistant-fab"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
        <span style={{ fontSize: '1.4rem' }}>🤖</span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="ai-chat-panel"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
          >
            {/* Header */}
            <div className="ai-chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="ai-icon">AI</div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Asistente ErgoDental</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
                    <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                      {isConnected ? 'Conectado a Ollama' : 'Ollama Desconectado'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <select 
                  className="model-selector"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  {models.length > 0 ? (
                    models.map(m => <option key={m} value={m}>{m}</option>)
                  ) : (
                    <option value="llama3">llama3</option>
                  )}
                </select>
                <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>✕</button>
              </div>
            </div>

            {/* Messages */}
            <div className="ai-messages" ref={scrollRef}>
              {messages.map((msg, i) => (
                <div key={i} className={`message-bubble ${msg.role}`}>
                  <div className="sender">{msg.role === 'assistant' ? 'Asistente' : 'Tú'}</div>
                  <div className="content">{msg.content}</div>
                </div>
              ))}
              {isTyping && (
                <div className="message-bubble assistant">
                  <div className="typing-indicator">
                    <span></span><span></span><span></span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="ai-input-area">
              <input 
                type="text" 
                placeholder={isConnected ? "Escribe tu consulta clínica..." : "Esperando conexión con Ollama..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={!isConnected || isTyping}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!isConnected || isTyping || !input.trim()}
              >
                ➔
              </button>
            </div>
            
            {!isConnected && isConnected !== null && (
              <div className="connection-overlay">
                <p>⚠️ Ollama no está detectado en localhost:11434</p>
                <code style={{ fontSize: '0.7rem', background: '#000', padding: '4px', borderRadius: '4px' }}>
                  set OLLAMA_ORIGINS=* && ollama serve
                </code>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .ai-assistant-fab {
          position: fixed;
          bottom: 24px;
          right: 96px;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--bg-sidebar);
          color: white;
          border: 1px solid var(--border);
          box-shadow: var(--shadow-sm);
          cursor: pointer;
          z-index: 10001;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: var(--transition);
          backdrop-filter: blur(var(--glass-blur));
        }

        .ai-assistant-fab:hover {
          border-color: var(--primary);
          box-shadow: 0 0 20px var(--primary-glow);
          transform: translateY(-2px);
        }

        .status-dot {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid var(--bg-dark);
        }
        .status-dot.online { background: var(--success); box-shadow: 0 0 10px var(--success-glow); }
        .status-dot.offline { background: var(--danger); }

        .ai-chat-panel {
          position: fixed;
          bottom: 96px;
          right: 24px;
          width: 420px;
          max-width: calc(100vw - 48px);
          height: 600px;
          max-height: calc(100vh - 140px);
          background: var(--bg-sidebar);
          backdrop-filter: blur(var(--glass-blur));
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow-lg);
          z-index: 10001;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          color: var(--text-primary);
          animation: modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ai-chat-header {
          padding: 20px;
          background: rgba(255,255,255,0.02);
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border);
        }

        .ai-icon {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 0.75rem;
          color: #fff;
          box-shadow: 0 4px 12px var(--primary-dim);
        }

        .model-selector {
          background: rgba(0,0,0,0.2);
          color: var(--text-secondary);
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 0.75rem;
          padding: 4px 8px;
          outline: none;
          cursor: pointer;
        }

        .ai-messages {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: rgba(0,0,0,0.05);
        }

        .message-bubble {
          max-width: 85%;
          padding: 14px 18px;
          border-radius: 18px;
          font-size: 0.92rem;
          line-height: 1.5;
          position: relative;
        }

        .message-bubble.user {
          align-self: flex-end;
          background: var(--primary);
          color: #000;
          font-weight: 600;
          border-bottom-right-radius: 4px;
          box-shadow: 0 4px 15px var(--primary-dim);
        }

        .message-bubble.assistant {
          align-self: flex-start;
          background: var(--bg-card);
          border: 1px solid var(--border);
          color: var(--text-primary);
          border-bottom-left-radius: 4px;
        }

        .sender {
          font-size: 0.65rem;
          opacity: 0.5;
          margin-bottom: 6px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .ai-input-area {
          padding: 20px;
          display: flex;
          gap: 12px;
          background: rgba(255,255,255,0.01);
          border-top: 1px solid var(--border);
        }

        .ai-input-area input {
          flex: 1;
          background: rgba(0,0,0,0.2);
          border: 1.5px solid var(--border);
          border-radius: 14px;
          padding: 12px 18px;
          color: var(--text-primary);
          outline: none;
          font-size: 0.95rem;
          transition: var(--transition);
        }

        .ai-input-area input:focus {
          border-color: var(--primary);
          background: rgba(0,0,0,0.3);
          box-shadow: 0 0 0 4px var(--primary-dim);
        }

        .ai-input-area button {
          width: 48px;
          height: 48px;
          background: var(--primary);
          border: none;
          border-radius: 14px;
          color: #000;
          cursor: pointer;
          font-weight: bold;
          transition: var(--transition);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .ai-input-area button:hover:not(:disabled) {
          transform: scale(1.05);
          box-shadow: 0 4px 15px var(--primary-dim);
        }

        .ai-input-area button:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .connection-overlay {
          position: absolute;
          inset: 0;
          background: rgba(4, 6, 16, 0.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 40px;
          z-index: 10;
          backdrop-filter: blur(10px);
        }

        .typing-indicator {
          display: flex;
          gap: 5px;
          padding: 4px 0;
        }

        .typing-indicator span {
          width: 7px;
          height: 7px;
          background: var(--primary);
          border-radius: 50%;
          animation: typ 1s infinite alternate;
        }
        .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
        .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes typ {
          from { opacity: 0.3; transform: translateY(0); }
          to { opacity: 1; transform: translateY(-5px); }
        }

        @media (max-width: 768px) {
          .ai-assistant-fab { right: 20px; bottom: 85px; width: 50px; height: 50px; }
          .ai-chat-panel { 
            right: 12px; 
            bottom: 150px; 
            width: calc(100vw - 24px); 
            height: 500px;
            border-radius: 24px;
          }
        }
      `}</style>
    </>
  );
};

export default AIAssistant;
