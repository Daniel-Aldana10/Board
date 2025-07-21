import { useEffect, useRef, useState, useCallback } from 'react';
import p5 from 'p5';

const WS_URL = 'wss://boardbackend-fca7gde4f6eagrfm.canadacentral-01.azurewebsites.net/bbService';
const RECONNECT_INTERVAL = 3000;

function BoardPage({ user, ticket }) {
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

  useEffect(() => { brushColorRef.current = brushColor; }, [brushColor]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);

  const sendMessage = useCallback((message) => {
    const msgString = typeof message === 'string' ? message : JSON.stringify(message);
    if (wsReady && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(msgString);
    } else {
      messageQueue.current.push(msgString);
    }
  }, [wsReady]);

  const connectWebSocket = useCallback(() => {
    if (!ticket) return;
    
    // Cerrar conexión existente si existe
    if (socketRef.current) {
      socketRef.current.close();
    }

    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('Conectado al servidor WebSocket');
      setWsReady(true);
      ws.send(JSON.stringify({ ticket }));
      
      // Enviar mensajes pendientes
      while (messageQueue.current.length > 0) {
        const msg = messageQueue.current.shift();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(msg);
        }
      }
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
      } catch (e) {
        console.error('Error parseando mensaje:', e, event.data);
      }
    };

    ws.onclose = (event) => {
      console.log('WebSocket cerrado:', event.code, event.reason);
      setWsReady(false);
      
      // Solo reconectar si no fue un cierre manual
      if (event.code !== 1000) {
        if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = setTimeout(() => {
          connectWebSocket();
        }, RECONNECT_INTERVAL);
      }
    };

    ws.onerror = (error) => {
      console.error('Error WebSocket:', error);
      setWsReady(false);
    };
  }, [ticket]);

  useEffect(() => {
    if (!ticket) return;
    connectWebSocket();
    
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
    };
  }, [ticket, connectWebSocket]);

  useEffect(() => {
    // Limpiar instancia anterior si existe
    if (p5Instance.current) {
      p5Instance.current.remove();
      p5Instance.current = null;
    }

    if (!sketchRef.current) return;

    const sketch = (p) => {
      p.setup = () => {
        // Usar P2D renderer para mejor rendimiento y menos problemas WebGL
        const canvas = p.createCanvas(1080, 500, p.P2D);
        canvas.parent(sketchRef.current);
        p.background(255);
      };

      p.draw = () => {
        // Solo dibujar si el mouse está presionado y dentro del canvas
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

      // Prevenir scroll cuando se dibuja
      p.mousePressed = () => {
        if (p.mouseX >= 0 && p.mouseX <= p.width && 
            p.mouseY >= 0 && p.mouseY <= p.height) {
          return false; // Previene el comportamiento por defecto
        }
      };
    };

    try {
      p5Instance.current = new p5(sketch);
    } catch (error) {
      console.error('Error creando instancia p5:', error);
    }

    return () => {
      if (p5Instance.current) {
        try {
          p5Instance.current.remove();
        } catch (e) {
          console.error('Error removiendo p5:', e);
        }
        p5Instance.current = null;
      }
    };
  }, []); // Solo ejecutar una vez

  const handleClear = useCallback(() => {
    if (p5Instance.current) {
      p5Instance.current.background(255);
    }
    sendMessage({ type: 'clear' });
  }, [sendMessage]);

  return (
    <div className="centered-container" style={{ textAlign: 'center', marginTop: '20px' }}>
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
          {wsReady ? 'Conectado' : 'Desconectado'}
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
  );
}

export default BoardPage;