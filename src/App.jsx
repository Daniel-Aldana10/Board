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

  useEffect(() => {
    brushColorRef.current = brushColor;
  }, [brushColor]);

  useEffect(() => {
    brushSizeRef.current = brushSize;
  }, [brushSize]);

  useEffect(() => {
    const sketch = (p) => {
      p.setup = () => {
        p.createCanvas(1080, 500);
        p.background(255);
      };

      p.draw = () => {
        if (p.mouseIsPressed) {
          p.noStroke();
          p.fill(brushColorRef.current);
          p.ellipse(p.mouseX, p.mouseY, brushSizeRef.current, brushSizeRef.current);
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
