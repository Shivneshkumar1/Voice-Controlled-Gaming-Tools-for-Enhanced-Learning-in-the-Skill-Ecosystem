export function initAudioVisualizer(stream, audioContext) {
  const canvas = document.getElementById('mic-visualizer');
  const dbIndicator = document.getElementById('mic-db-indicator');
  if (!canvas || !dbIndicator) return;

  const canvasCtx = canvas.getContext('2d');
  
  // Set logical sizing
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  canvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  
  source.connect(analyser);
  
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  
  const width = rect.width;
  const height = rect.height;

  function draw() {
    requestAnimationFrame(draw);
    
    analyser.getByteTimeDomainData(dataArray);
    
    // Smooth trail clear
    canvasCtx.fillStyle = 'rgba(5, 6, 8, 0.2)';
    canvasCtx.fillRect(0, 0, width, height);
    
    // Draw grid lines
    canvasCtx.strokeStyle = 'rgba(0, 242, 254, 0.05)';
    canvasCtx.lineWidth = 1;
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, height / 2);
    canvasCtx.lineTo(width, height / 2);
    canvasCtx.stroke();
    
    // Wave configuration
    canvasCtx.lineWidth = 2.5;
    canvasCtx.strokeStyle = '#00f2fe';
    
    // Add neon glow to the canvas path
    canvasCtx.shadowBlur = 8;
    canvasCtx.shadowColor = 'rgba(0, 242, 254, 0.6)';
    
    canvasCtx.beginPath();
    
    const sliceWidth = width / bufferLength;
    let x = 0;
    
    let sumSquares = 0;
    
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0; // Normalized -1.0 to 1.0
      const y = v * (height / 2);
      
      // Calculate RMS for decibel estimation
      const deviation = v - 1.0;
      sumSquares += deviation * deviation;
      
      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    canvasCtx.lineTo(width, height / 2);
    canvasCtx.stroke();
    
    // Reset shadow
    canvasCtx.shadowBlur = 0;
    
    // Calculate DB value
    const rms = Math.sqrt(sumSquares / bufferLength);
    const db = rms > 0 ? Math.round(20 * Math.log10(rms) + 40) : 0; // scaled offset
    
    if (db < 5) {
      dbIndicator.textContent = 'SILENT';
      dbIndicator.style.color = 'var(--text-muted)';
    } else if (db < 20) {
      dbIndicator.textContent = 'LOW';
      dbIndicator.style.color = 'var(--accent-purple)';
    } else if (db < 38) {
      dbIndicator.textContent = 'GOOD';
      dbIndicator.style.color = 'var(--accent-cyan)';
    } else {
      dbIndicator.textContent = 'PEAK';
      dbIndicator.style.color = 'var(--accent-pink)';
    }
  }
  
  draw();
}
