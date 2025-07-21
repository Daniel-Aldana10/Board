import { useEffect, useRef, useState, useCallback } from 'react';
import p5 from 'p5';
import './index.css';
const WS_URL = 'wss://' + import.meta.env.VITE_WS + '/bbService';
console.log(WS_URL);
const RECONNECT_INTERVAL = 3000;

async function fetchNewTicket(idToken) {
  const response = await fetch(import.meta.env.VITE_BACK + '/api/ws-ticket', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + idToken,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) throw new Error('No autorizado');
  const data = await response.json();
  return data.ticket;
}

function BoardPage({ user, idToken, ticket, setTicket }) {
  const sketchRef = useRef();
  const p5Instance = useRef(null);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(20);
  const brushColorRef = useRef(brushColor);
  const brushSizeRef = useRef(brushSize);
  const socketRef = useRef(null);
  const [wsReady, setWsReady] = useState(false);
  const messageQueue = useRef([]);
  const reconnectTimeout = useRef(null);
  const isDrawing = useRef(false);
  const isAuthenticated = useRef(false);

  // Chat states
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => { brushColorRef.current = brushColor; }, [brushColor]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);


  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  const sendMessage = useCallback((message) => {
    const msgString = typeof message === 'string' ? message : JSON.stringify(message);
    if (socketRef.current?.readyState === WebSocket.OPEN && isAuthenticated.current) {
      socketRef.current.send(msgString);
    } else {
      messageQueue.current.push(msgString);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!ticket) {
      console.error('No hay ticket disponible para conectar WebSocket');
      return;
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
    setWsReady(false);
    isAuthenticated.current = false;

    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      const authMessage = JSON.stringify({ ticket: ticket });
      ws.send(authMessage);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'draw' && p5Instance.current) {
          const { x, y, color, size } = msg;
          const p = p5Instance.current;
          p.noStroke();
          p.fill(color);
          p.ellipse(x, y, size, size);
        }
        if (msg.type === 'clear' && p5Instance.current) {
          p5Instance.current.background(255);
        }
        if (msg.type === 'info' && msg.message === 'Authenticated.') {
          isAuthenticated.current = true;
          setWsReady(true);
          while (messageQueue.current.length > 0) {
            const pendingMsg = messageQueue.current.shift();
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(pendingMsg);
            }
          }
          return;
        }
        // CHAT: solo después de autenticación
        if (msg.type === 'chat' && isAuthenticated.current) {
          setChatMessages(prev => [...prev, msg]);
        }
      } catch (e) {
        if (!isAuthenticated.current) {
          isAuthenticated.current = true;
          setWsReady(true);
          while (messageQueue.current.length > 0) {
            const pendingMsg = messageQueue.current.shift();
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(pendingMsg);
            }
          }
        }
      }
    };

    ws.onclose = async (event) => {
      setWsReady(false);
      isAuthenticated.current = false;
      if (event.code === 1008) {
        alert('Sesión expirada. Obteniendo un ticket nuevo...');
        try {
          const newTicket = await fetchNewTicket(idToken);
          setTicket(newTicket);
        } catch (err) {
          alert('No se pudo obtener un ticket nuevo. Intenta recargar la página.');
        }
      } else if (event.code !== 1000) {
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket();
        }, RECONNECT_INTERVAL);
      }
    };

    ws.onerror = (error) => {
      setWsReady(false);
      isAuthenticated.current = false;
    };
  }, [ticket, idToken, setTicket]);

  useEffect(() => {
    if (!ticket) return;
    connectWebSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounting');
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [ticket, connectWebSocket]);

  useEffect(() => {
    if (p5Instance.current) {
      p5Instance.current.remove();
      p5Instance.current = null;
    }
    if (!sketchRef.current) return;
    const sketch = (p) => {
      p.setup = () => {
        const canvas = p.createCanvas(1080, 500, p.P2D);
        canvas.parent(sketchRef.current);
        p.background(255);
      };
      p.draw = () => {
        if (p.mouseIsPressed && 
            p.mouseX >= 0 && p.mouseX <= p.width && 
            p.mouseY >= 0 && p.mouseY <= p.height) {
          if (!isDrawing.current) {
            isDrawing.current = true;
          }
          const x = p.mouseX;
          const y = p.mouseY;
          const color = brushColorRef.current;
          const size = brushSizeRef.current;
          p.noStroke();
          p.fill(color);
          p.ellipse(x, y, size, size);
          sendMessage({ type: 'draw', x, y, color, size });
        } else if (isDrawing.current) {
          isDrawing.current = false;
        }
      };
      p.mousePressed = () => {
        if (p.mouseX >= 0 && p.mouseX <= p.width && 
            p.mouseY >= 0 && p.mouseY <= p.height) {
          return false;
        }
      };
    };
    try {
      p5Instance.current = new p5(sketch);
    } catch (error) {}
    return () => {
      if (p5Instance.current) {
        try {
          p5Instance.current.remove();
        } catch (e) {}
        p5Instance.current = null;
      }
    };
  }, []);

  const handleClear = useCallback(() => {
    if (p5Instance.current) {
      p5Instance.current.background(255);
    }
    sendMessage({ type: 'clear' });
  }, [sendMessage]);

  // CHAT: enviar mensaje
  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !wsReady) return;
    const newMsg = {
      type: 'chat',
      message: chatInput,
      user: user?.name || 'Anónimo',
      timestamp: new Date().toISOString(),
      isOwn: true 
    };
    setChatMessages(prev => [...prev, newMsg]); 
    const msgToSend = { ...newMsg };
    delete msgToSend.isOwn; 
    sendMessage(msgToSend);
    setChatInput('');
  };

  return (
    <div className="centered-container" style={{
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'flex-start',
      height: '100vh',
      overflow: 'hidden',
      gap: '32px',
      padding: 0,
      margin: 0,
      flexWrap: 'wrap'
    }}>


      
      <div>
        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            Color pincel:
            <input
              type="color"
              value={brushColor}
              onChange={(e) => setBrushColor(e.target.value)}
              style={{ width: '40px', height: '30px' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            Grosor pincel:
            <input
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              style={{ width: '100px' }}
            />
            <span style={{ minWidth: '35px', textAlign: 'right' }}>{brushSize}px</span>
          </label>
          <button 
            onClick={handleClear}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Borrar
          </button>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '5px',
            fontSize: '12px',
            color: wsReady ? '#28a745' : '#dc3545'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: wsReady ? '#28a745' : '#dc3545'
            }}></div>
            {wsReady ? 'Conectado y Autenticado' : 'Desconectado'}
          </div>
        </div>
        <div 
          ref={sketchRef} 
          style={{ 
            display: 'inline-block',
            border: '1px solid #ccc',
            borderRadius: '4px',
            overflow: 'hidden'
          }} 
        />
      </div>
    
      <div style={{
        width: 320,
        minWidth: 220,
        maxWidth: 400,
        height: 520,
        background: '#f8f9fa',
        border: '1px solid #ccc',
        borderRadius: '8px',
        marginLeft: 24,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #ddd', fontWeight: 'bold', fontSize: 18, color:'#252850' }}>
          Chat en vivo
        </div>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          fontSize: 15,
          background: '#fff'
        }}>
          {chatMessages.length === 0 && (
            <div style={{ color: '#888', textAlign: 'center', marginTop: 40 }}>No hay mensajes aún.</div>
          )}
          {chatMessages.map((msg, idx) => {
            const isOwn = !!msg.isOwn;
            return (
              <div 
                key={idx} 
                style={{ 
                  marginBottom: 10, 
                  background: isOwn ? '#e6f0ff' : 'transparent', 
                  borderRadius: 4, 
                  padding: isOwn ? '4px 8px' : 0 
                }}
              >
                <span style={{ fontWeight: 'bold', color: isOwn ? '#0056b3' : '#007bff' }}>
                  {isOwn ? 'Tú' : (msg.user || 'Anónimo')}:
                </span>{' '}
                
                <span style={{ color: '#222'}}>
                  {msg.message}
                </span>

                <div style={{ fontSize: 11, color: '#252850', marginLeft: 4 }}>
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                </div>
              </div>

            );
          })}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={handleSendChat} style={{ display: 'flex', borderTop: '1px solid #ddd', padding: 8, background: '#f8f9fa' }}>
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            placeholder={wsReady ? "Escribe un mensaje..." : "Conéctate para chatear"}
            disabled={!wsReady}
            style={{
              flex: 1,
              border: '1px solid #ccc',
              borderRadius: 4,
              padding: 8,
              fontSize: 15,
              marginRight: 8
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) handleSendChat(e);
            }}
          />
          <button
            type="submit"
            disabled={!wsReady || !chatInput.trim()}
            style={{
              background: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              padding: '8px 16px',
              fontWeight: 'bold',
              cursor: wsReady && chatInput.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
}

export default BoardPage; 