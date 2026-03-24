import React, { useState, useEffect, useRef } from 'react';
import { Gauge, Play, RotateCcw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import './BenchmarkPage.css';

const COLOR = '#f97316';

function runBenchmark(onProgress) {
  return new Promise((resolve) => {
    const results = [];
    let frame = 0;
    const TOTAL_FRAMES = 300;
    let last = performance.now();
    let dropped = 0;

    const tick = () => {
      const now = performance.now();
      const delta = now - last;
      last = now;

      const fps = 1000 / delta;
      results.push(fps);
      if (delta > 33) dropped++;

      frame++;
      onProgress(Math.round((frame / TOTAL_FRAMES) * 100), fps);

      if (frame < TOTAL_FRAMES) {
        requestAnimationFrame(tick);
      } else {
        const avg = results.reduce((a, b) => a + b, 0) / results.length;
        const min = Math.min(...results);
        const max = Math.max(...results);
        const p1 = results.slice().sort((a, b) => a - b)[Math.floor(results.length * 0.01)];
        resolve({ avg, min, max, p1, dropped, samples: results });
      }
    };

    requestAnimationFrame(tick);
  });
}

const SCORE_LABEL = (avg) => {
  if (avg >= 200) return { label: 'Excellent', color: '#22c55e' };
  if (avg >= 120) return { label: 'Great', color: '#84cc16' };
  if (avg >= 60)  return { label: 'Good', color: '#f59e0b' };
  if (avg >= 30)  return { label: 'Poor', color: '#f97316' };
  return { label: 'Bad', color: '#ef4444' };
};

export default function BenchmarkPage({ addToast }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [liveFps, setLiveFps] = useState(null);
  const [result, setResult] = useState(null);
  const canvasRef = useRef(null);

  const drawGraph = (samples) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const max = Math.max(...samples);
    const step = w / samples.length;

    ctx.beginPath();
    ctx.strokeStyle = COLOR;
    ctx.lineWidth = 1.5;
    samples.forEach((v, i) => {
      const x = i * step;
      const y = h - (v / max) * (h - 8) - 4;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill under
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = `${COLOR}18`;
    ctx.fill();

    // 60fps line
    const y60 = h - (60 / max) * (h - 8) - 4;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(0, y60);
    ctx.lineTo(w, y60);
    ctx.stroke();
    ctx.setLineDash([]);
  };

  const start = async () => {
    setRunning(true);
    setResult(null);
    setProgress(0);
    setLiveFps(null);

    const res = await runBenchmark((pct, fps) => {
      setProgress(pct);
      setLiveFps(Math.round(fps));
    });

    setRunning(false);
    setResult(res);
    setTimeout(() => drawGraph(res.samples), 50);
    addToast(`Benchmark complete — Avg ${Math.round(res.avg)} FPS`, 'success');
  };

  const reset = () => {
    setResult(null);
    setProgress(0);
    setLiveFps(null);
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  };

  const score = result ? SCORE_LABEL(result.avg) : null;

  return (
    <div className="bench-page">
      <PageHeader icon={Gauge} title="FPS Benchmark" subtitle="Measure your system's frame rendering performance" iconColor={COLOR} />

      <div className="bench-body">
        <div className="bench-controls">
          {!running && !result && (
            <button className="bench-start-btn" onClick={start}>
              <Play size={16} />
              Run Benchmark
            </button>
          )}
          {running && (
            <div className="bench-running">
              <div className="bench-running-spinner" />
              <span>Benchmarking... {progress}%</span>
              <span className="bench-live-fps">{liveFps} FPS</span>
            </div>
          )}
          {result && (
            <button className="bench-reset-btn" onClick={reset}>
              <RotateCcw size={14} />
              Run Again
            </button>
          )}
        </div>

        {running && (
          <div className="bench-progress-wrap">
            <div className="bench-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        )}

        {result && (
          <>
            <div className="bench-score-row">
              <div className="bench-score-card main">
                <div className="bench-score-val" style={{ color: score.color }}>
                  {Math.round(result.avg)}
                </div>
                <div className="bench-score-unit">AVG FPS</div>
                <div className="bench-score-label" style={{ color: score.color }}>{score.label}</div>
              </div>
              <div className="bench-metrics">
                <div className="bench-metric">
                  <span className="bench-metric-val" style={{ color: '#22c55e' }}>{Math.round(result.max)}</span>
                  <span className="bench-metric-label">Max FPS</span>
                </div>
                <div className="bench-metric">
                  <span className="bench-metric-val" style={{ color: '#f87171' }}>{Math.round(result.min)}</span>
                  <span className="bench-metric-label">Min FPS</span>
                </div>
                <div className="bench-metric">
                  <span className="bench-metric-val" style={{ color: '#fb923c' }}>{Math.round(result.p1)}</span>
                  <span className="bench-metric-label">1% Low</span>
                </div>
                <div className="bench-metric">
                  <span className="bench-metric-val" style={{ color: '#a78bfa' }}>{result.dropped}</span>
                  <span className="bench-metric-label">Dropped</span>
                </div>
              </div>
            </div>

            <div className="bench-graph-card">
              <div className="bench-graph-title">FPS Over Time</div>
              <canvas ref={canvasRef} className="bench-canvas" width={700} height={120} />
              <div className="bench-graph-labels">
                <span>0s</span>
                <span>60fps ─ ─</span>
                <span>{(result.samples.length / 60).toFixed(1)}s</span>
              </div>
            </div>

            <div className="bench-note">
              This benchmark measures your browser/renderer frame rate — not GPU game FPS. Results reflect CPU performance, background load, and system responsiveness.
            </div>
          </>
        )}

        {!running && !result && (
          <div className="bench-idle">
            <Gauge size={48} style={{ color: '#2a2a2a' }} />
            <p>Press "Run Benchmark" to measure your system's frame rendering performance.</p>
            <p className="bench-idle-sub">The test runs {300 / 60} seconds of frame timing and reports average, min, max and 1% low FPS.</p>
          </div>
        )}
      </div>
    </div>
  );
}
