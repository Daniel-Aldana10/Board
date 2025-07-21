import { useEffect, useRef, useState } from 'react';
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

  useEffect(() => { brushColorRef.current = brushColor; }, [brushColor]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);

  const connectWebSocket = () => {
    if (!ticket) return;
    const ws = new WebSocket(WS_URL);
    socketRef.current = ws;

    ws.onopen = () => {
      setWsReady(true);
      ws.send(JSON.stringify({ ticket }));
      while (messageQueue.current.length > 0) {
        ws.send(messageQueue.current.shift());
      }
      console.log('Conectado al servidor WebSocket');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'draw') {
          const { x, y, color, size } = msg;
          p5Instance.current?.noStroke();
          p5Instance.current?.fill(color);
          p5Instance.current?.ellipse(x, y, size, size);
        }
        if (msg.type === 'clear') {
          p5Instance.current?.background(255);
        }
      } catch (e) {
        console.error('Mensaje no JSON:', event.data);
      }
    };

    ws.onclose = () => {
      setWsReady(false);
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = setTimeout(() => {
        connectWebSocket();
      }, RECONNECT_INTERVAL);
    };

    ws.onerror = () => {
      setWsReady(false);
      ws.close();
    };
  };

  useEffect(() => {
    if (!ticket) return;
    connectWebSocket();
    return () => {
      socketRef.current?.close();
      if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
    };
  }, [ticket]);

  useEffect(() => {
    const sketch = (p) => {
      p.setup = () => {
        p.createCanvas(1080, 500);
        p.background(255);
      };
      p.draw = () => {
        if (p.mouseIsPressed) {
          const x = p.mouseX;
          const y = p.mouseY;
          const color = brushColorRef.current;
          const size = brushSizeRef.current;
          p.noStroke();
          p.fill(color);
          p.ellipse(x, y, size, size);
          const message = JSON.stringify({ type: 'draw', x, y, color, size });
          if (wsReady && socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(message);
          } else {
            messageQueue.current.push(message);
          }
        }
      };
    };
    p5Instance.current = new p5(sketch, sketchRef.current);
    return () => {
      p5Instance.current?.remove();
      p5Instance.current = null;
    };
  }, [wsReady]);

  const handleClear = () => {
    p5Instance.current?.background(255);
    const message = JSON.stringify({ type: 'clear' });
    if (wsReady && socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(message);
    } else {
      messageQueue.current.push(message);
    }
  };

  return (
    <div className="centered-container" style={{ textAlign: 'center', marginTop: '20px' }}>
      <div style={{ marginBottom: '10px' }}>
        <label>
          Color pincel:{' '}
          <input
            type="color"
            value={brushColor}
            onChange={(e) => setBrushColor(e.target.value)}
          />
        </label>
        <label style={{ marginLeft: '20px' }}>
          Grosor pincel:{' '}
          <input
            type="range"
            min="1"
            max="100"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
          />
          {' '}{brushSize}px
        </label>
        <button onClick={handleClear} style={{ marginLeft: '20px' }}>
          Borrar
        </button>
      </div>
      <div ref={sketchRef} />
    </div>
  );
}

export default BoardPage;
