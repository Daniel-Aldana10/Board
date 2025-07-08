import { useEffect, useRef, useState } from 'react';
import "./index.css"
import p5 from 'p5';

function App() {
  const sketchRef = useRef();
  const p5Instance = useRef(null);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(20);
  const brushColorRef = useRef(brushColor);
  const brushSizeRef = useRef(brushSize);
  const socketRef = useRef(null);


  useEffect(() => {
    brushColorRef.current = brushColor;
  }, [brushColor]);

  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);
  useEffect(() => {
    socketRef.current = new WebSocket('wss://boardbackend-fca7gde4f6eagrfm.canadacentral-01.azurewebsites.net/bbService'); // cambia por tu URL real
  
    socketRef.current.onopen = () => {
      console.log('Conectado al servidor WebSocket');
    };
  
    socketRef.current.onmessage = (event) => {
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
    
  
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

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
      
    
          if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
            const message = {
              type: 'draw',
              x,
              y,
              color,
              size
            };
            socketRef.current.send(JSON.stringify(message));
          }
        }
      };
      
    };

    p5Instance.current = new p5(sketch, sketchRef.current);

    return () => {
      if (p5Instance.current) {
        p5Instance.current.remove();
        p5Instance.current = null;
      }
    };
  }, []);

 
  const handleClear = () => {
   
    if (p5Instance.current) {
      p5Instance.current.background(255);
    }
  
   
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'clear' }));
    }
  };

  return (
    <div className="centered-container" style={{ textAlign: 'center', marginTop: '20px' }}>
      <div style={{ marginBottom: '10px'}}>
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
      <div  ref={sketchRef} />
    </div>
  );
}

export default App;
