import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an advanced AI lie detector and behavioral analyst specializing in deception detection through linguistic and psychological analysis. Your job is to analyze Yes/No answers to questions for signs of deception.

When given a question and a Yes/No answer, analyze it deeply and return ONLY a valid JSON object with this exact structure:
{
  "verdict": "TRUTH" or "LIE" or "UNCERTAIN",
  "confidence": <number 0-100>,
  "deception_score": <number 0-100>,
  "psychological_indicators": [<list of 2-4 short indicator strings>],
  "micro_tells": [<list of 2-3 behavioral micro-signal strings>],
  "analysis": "<2-3 sentence deep analysis>",
  "risk_factors": ["<factor1>", "<factor2>"],
  "truthfulness_signals": ["<signal1>", "<signal2>"],
  "neural_pattern": "<one of: EVASIVE, COMPLIANT, ANXIOUS, CONFIDENT, DEFLECTIVE, REHEARSED, SPONTANEOUS>",
  "stress_level": <number 0-100>,
  "cognitive_load": "<LOW, MEDIUM, HIGH>",
  "recommendation": "<one actionable follow-up question or probe>"
}

Consider:
- The semantic weight of a "Yes" vs "No" given the question context
- Whether the answer is suspiciously simple or appropriately direct
- Psychological pressure patterns when answering direct binary questions
- Contextual plausibility of the answer
- Common deception patterns: over-compliance, strategic vagueness even in binary answers, implicit hesitation
- Base rates of lying for certain question types

Return ONLY the JSON. No markdown, no explanation, no backticks.`;

// ─── WAVEFORM COMPONENT ──────────────────────────────────────────────────────
function BiometricWave({ active, stress = 0, color = "#00ff88" }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width, H = canvas.height;

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, W, H);

      if (!active) {
        // Flat line
        ctx.strokeStyle = color + "44";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, H / 2);
        ctx.lineTo(W, H / 2);
        ctx.stroke();
        return;
      }

      const stressMult = 1 + (stress / 100) * 3;
      phaseRef.current += 0.06 * stressMult;

      // Glow effect
      ctx.shadowBlur = 8;
      ctx.shadowColor = color;

      // Multiple wave layers
      for (let layer = 0; layer < 3; layer++) {
        ctx.strokeStyle = layer === 0 ? color : color + (layer === 1 ? "66" : "33");
        ctx.lineWidth = layer === 0 ? 2 : 1;
        ctx.beginPath();

        for (let x = 0; x < W; x++) {
          const t = (x / W) * Math.PI * 8 + phaseRef.current + layer * 1.2;
          const amp = (H / 4) * stressMult * (0.6 + 0.4 * Math.sin(phaseRef.current * 0.3 + layer));
          const spike = stress > 60 && Math.sin(t * 3.7) > 0.85 ? Math.sin(t * 3.7) * amp * 0.8 : 0;
          const y = H / 2 + Math.sin(t) * amp * 0.5 + Math.sin(t * 1.7) * amp * 0.3 + spike;

          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [active, stress, color]);

  return <canvas ref={canvasRef} width={400} height={60} style={{ width: "100%", height: "60px" }} />;
}

// ─── CIRCULAR GAUGE ──────────────────────────────────────────────────────────
function CircularGauge({ value, label, color, size = 100 }) {
  const r = size * 0.38;
  const cx = size / 2, cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const dash = (value / 100) * circumference;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let start = null;
    const target = value;
    const prev = displayed;
    const animate = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / 800, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(prev + (target - prev) * ease));
      if (p < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a2e" strokeWidth={size * 0.08} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={size * 0.08}
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 0.8s cubic-bezier(0.34,1.56,0.64,1)" }}
        />
      </svg>
      <div style={{ marginTop: -size * 0.55, fontSize: size * 0.22, fontFamily: "'Orbitron', monospace", fontWeight: 700, color, zIndex: 1, textShadow: `0 0 10px ${color}` }}>
        {displayed}%
      </div>
      <div style={{ marginTop: size * 0.27, fontSize: 10, color: "#666", letterSpacing: 1.5, textTransform: "uppercase", fontFamily: "'Rajdhani', sans-serif" }}>{label}</div>
    </div>
  );
}

// ─── SCANNING ANIMATION ──────────────────────────────────────────────────────
function ScanLine() {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", borderRadius: 12 }}>
      <div style={{
        position: "absolute", left: 0, right: 0, height: 2,
        background: "linear-gradient(90deg, transparent, #00ff88, transparent)",
        animation: "scanline 2s linear infinite",
        boxShadow: "0 0 8px #00ff88",
      }} />
    </div>
  );
}

// ─── NEURAL PATTERN BADGE ────────────────────────────────────────────────────
const PATTERN_COLORS = {
  EVASIVE: "#ff6b35", COMPLIANT: "#00ff88", ANXIOUS: "#ffd60a",
  CONFIDENT: "#00d4ff", DEFLECTIVE: "#ff4466", REHEARSED: "#cc00ff",
  SPONTANEOUS: "#00ff88"
};

function PatternBadge({ pattern }) {
  const c = PATTERN_COLORS[pattern] || "#888";
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 14px",
      borderRadius: 20, border: `1px solid ${c}`, background: c + "18",
      color: c, fontSize: 11, fontFamily: "'Rajdhani', sans-serif",
      letterSpacing: 2, textTransform: "uppercase", fontWeight: 700,
      boxShadow: `0 0 12px ${c}44`
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c, boxShadow: `0 0 6px ${c}`, display: "inline-block" }} />
      {pattern}
    </div>
  );
}

// ─── HISTORY ITEM ────────────────────────────────────────────────────────────
function HistoryItem({ item, index, onClick }) {
  const isLie = item.result?.verdict === "LIE";
  const isUncertain = item.result?.verdict === "UNCERTAIN";
  const color = isLie ? "#ff4466" : isUncertain ? "#ffd60a" : "#00ff88";

  return (
    <div
      onClick={() => onClick(item)}
      style={{
        padding: "10px 14px", borderRadius: 8, cursor: "pointer",
        border: `1px solid ${color}33`, background: `${color}08`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        transition: "all 0.2s", marginBottom: 6,
        fontFamily: "'Rajdhani', sans-serif"
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}18`; e.currentTarget.style.borderColor = `${color}66`; }}
      onMouseLeave={e => { e.currentTarget.style.background = `${color}08`; e.currentTarget.style.borderColor = `${color}33`; }}
    >
      <div>
        <div style={{ color: "#aaa", fontSize: 11, marginBottom: 2 }}>Q{index + 1}: {item.question.length > 35 ? item.question.slice(0, 35) + "…" : item.question}</div>
        <div style={{ color: "#666", fontSize: 10 }}>Answer: <span style={{ color: "#ccc" }}>{item.answer}</span></div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{ color, fontWeight: 700, fontSize: 13, letterSpacing: 1 }}>{item.result?.verdict}</div>
        <div style={{ color: "#555", fontSize: 10 }}>{item.result?.confidence}% conf.</div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function LieDetector() {
  const [phase, setPhase] = useState("idle"); // idle | questioning | awaiting | analyzing | result
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [sessionStats, setSessionStats] = useState({ lies: 0, truths: 0, uncertain: 0 });
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [answerTime, setAnswerTime] = useState(null);
  const answerStartRef = useRef(null);
  const [pulseActive, setPulseActive] = useState(false);

  const stressLevel = result?.stress_level ?? (phase === "analyzing" ? 75 : 0);

  // ── Start new question ────────────────────────────────────────────────────
  const startQuestion = () => {
    if (!question.trim()) return;
    setPhase("awaiting");
    setAnswer(null);
    setResult(null);
    setError(null);
    setPulseActive(true);
    answerStartRef.current = Date.now();
  };

  // ── Record answer ─────────────────────────────────────────────────────────
  const recordAnswer = async (ans) => {
    const elapsed = Date.now() - answerStartRef.current;
    setAnswer(ans);
    setAnswerTime(elapsed);
    setPhase("analyzing");
    setPulseActive(false);
    await analyze(question, ans, elapsed);
  };

  // ── Core AI Analysis ──────────────────────────────────────────────────────
  const analyze = async (q, ans, elapsed) => {
    try {
      const userPrompt = `${SYSTEM_PROMPT}

Question asked: "${q}"
Answer given: "${ans}"
Response time: ${elapsed}ms (${elapsed < 1500 ? "very fast" : elapsed < 4000 ? "normal" : "slow/delayed"})

Analyze this Yes/No response for deception. Consider the response time as a behavioral signal — very fast YES/NO can indicate rehearsed answers, while delays can indicate cognitive load from constructing a lie.`;

      const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1000 }
        })
      });

      if (!resp.ok) throw new Error(`API error ${resp.status}`);
      const data = await resp.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);;

      setResult(parsed);
      setPhase("result");

      const entry = { question: q, answer: ans, result: parsed, time: elapsed, timestamp: Date.now() };
      setHistory(prev => [entry, ...prev]);
      setSessionStats(prev => ({
        lies: prev.lies + (parsed.verdict === "LIE" ? 1 : 0),
        truths: prev.truths + (parsed.verdict === "TRUTH" ? 1 : 0),
        uncertain: prev.uncertain + (parsed.verdict === "UNCERTAIN" ? 1 : 0),
      }));
    } catch (e) {
      setError(e.message);
      setPhase("idle");
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const reset = () => {
    setPhase("idle");
    setQuestion("");
    setAnswer(null);
    setResult(null);
    setError(null);
    setPulseActive(false);
  };

  const verdictColor = result
    ? result.verdict === "LIE" ? "#ff4466"
    : result.verdict === "TRUTH" ? "#00ff88"
    : "#ffd60a"
    : "#00d4ff";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600;700&family=Share+Tech+Mono&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #050508; }

        @keyframes scanline {
          0% { top: -2px; }
          100% { top: 100%; }
        }
        @keyframes flicker {
          0%,100% { opacity: 1; } 50% { opacity: 0.97; } 75% { opacity: 0.99; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0,255,136,0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 20px rgba(0,255,136,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(0,255,136,0); }
        }
        @keyframes reveal-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes verdict-flash {
          0% { opacity: 0; transform: scale(0.5); }
          60% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes scan-h {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0;} }
        @keyframes grid-move {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }
        @keyframes float {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes rotate-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes analyzing-pulse {
          0%,100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.02); }
        }

        .app-root {
          min-height: 100vh;
          background: #050508;
          color: #e0e0e0;
          font-family: 'Rajdhani', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px 16px 60px;
          position: relative;
          overflow-x: hidden;
        }

        .app-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,255,136,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,136,0.025) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: grid-move 8s linear infinite;
          pointer-events: none;
          z-index: 0;
        }

        .content { position: relative; z-index: 1; width: 100%; max-width: 760px; }

        .header { text-align: center; margin-bottom: 32px; animation: reveal-up 0.8s ease; }
        .header-eyebrow {
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px; letter-spacing: 4px; color: #00ff88;
          margin-bottom: 8px; opacity: 0.8;
        }
        .header-title {
          font-family: 'Orbitron', monospace;
          font-size: clamp(28px, 6vw, 52px);
          font-weight: 900;
          background: linear-gradient(135deg, #00ff88, #00d4ff, #ff4466);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          letter-spacing: -1px; line-height: 1.1;
          text-shadow: none;
          filter: drop-shadow(0 0 20px rgba(0,255,136,0.3));
        }
        .header-sub {
          color: #555; font-size: 12px; letter-spacing: 3px;
          text-transform: uppercase; margin-top: 8px;
          font-family: 'Share Tech Mono', monospace;
        }

        .panel {
          background: linear-gradient(135deg, #0a0a0f, #0d0d18);
          border: 1px solid #1a1a2e;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
          animation: reveal-up 0.5s ease;
          box-shadow: 0 4px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03);
        }

        .panel-label {
          font-family: 'Share Tech Mono', monospace;
          font-size: 10px; letter-spacing: 3px; color: #333;
          text-transform: uppercase; margin-bottom: 16px;
          display: flex; align-items: center; gap: 8px;
        }
        .panel-label::before {
          content: ''; display: inline-block; width: 20px; height: 1px;
          background: #333;
        }

        .biometric-bar {
          background: #080810; border-radius: 6px;
          border: 1px solid #111120; padding: 12px;
          margin-bottom: 12px;
        }

        .status-dots { display: flex; gap: 6px; margin-bottom: 16px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; }
        .dot-red { background: #ff4466; box-shadow: 0 0 6px #ff4466; }
        .dot-yellow { background: #ffd60a; box-shadow: 0 0 6px #ffd60a; }
        .dot-green { background: #00ff88; box-shadow: 0 0 6px #00ff88; animation: blink 2s infinite; }

        .question-input {
          width: 100%; background: transparent;
          border: none; border-bottom: 2px solid #1a1a2e;
          color: #e0e0e0; font-family: 'Rajdhani', sans-serif;
          font-size: 18px; font-weight: 500;
          padding: 12px 0; outline: none;
          transition: border-color 0.3s; caret-color: #00ff88;
        }
        .question-input:focus { border-color: #00ff88; }
        .question-input::placeholder { color: #2a2a3a; }

        .btn-primary {
          background: linear-gradient(135deg, #00ff88, #00d4ff);
          color: #050508; border: none; cursor: pointer;
          font-family: 'Orbitron', monospace; font-size: 13px;
          font-weight: 700; letter-spacing: 2px;
          padding: 14px 32px; border-radius: 6px;
          text-transform: uppercase;
          transition: all 0.2s;
          box-shadow: 0 0 20px rgba(0,255,136,0.3);
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 0 30px rgba(0,255,136,0.5); }
        .btn-primary:active { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }

        .btn-answer {
          flex: 1; padding: 20px; border-radius: 10px; cursor: pointer;
          font-family: 'Orbitron', monospace; font-size: 22px; font-weight: 900;
          letter-spacing: 4px; border: 2px solid; transition: all 0.2s;
          text-transform: uppercase;
        }
        .btn-yes {
          background: rgba(0,255,136,0.06); border-color: #00ff8866; color: #00ff88;
          box-shadow: inset 0 0 20px rgba(0,255,136,0.03);
        }
        .btn-yes:hover {
          background: rgba(0,255,136,0.15); border-color: #00ff88;
          box-shadow: 0 0 30px rgba(0,255,136,0.3);
          transform: scale(1.02);
        }
        .btn-no {
          background: rgba(255,68,102,0.06); border-color: #ff446666; color: #ff4466;
          box-shadow: inset 0 0 20px rgba(255,68,102,0.03);
        }
        .btn-no:hover {
          background: rgba(255,68,102,0.15); border-color: #ff4466;
          box-shadow: 0 0 30px rgba(255,68,102,0.3);
          transform: scale(1.02);
        }

        .verdict-display {
          text-align: center; padding: 32px;
          animation: verdict-flash 0.6s cubic-bezier(0.34,1.56,0.64,1);
        }

        .verdict-text {
          font-family: 'Orbitron', monospace;
          font-size: clamp(40px, 10vw, 80px);
          font-weight: 900; letter-spacing: 8px;
          line-height: 1;
          text-shadow: 0 0 30px currentColor, 0 0 60px currentColor;
          animation: float 3s ease-in-out infinite;
        }

        .gauge-row {
          display: flex; justify-content: center; gap: 32px;
          flex-wrap: wrap; margin: 24px 0;
        }

        .indicator-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
          margin-top: 16px;
        }
        .indicator-item {
          background: #0a0a10; border-radius: 6px; padding: 10px 12px;
          border: 1px solid #111120; font-size: 12px;
          display: flex; align-items: flex-start; gap: 8px;
          color: #999;
        }
        .indicator-dot {
          width: 5px; height: 5px; border-radius: 50%;
          background: #00ff88; margin-top: 4px; flex-shrink: 0;
          box-shadow: 0 0 4px #00ff88;
        }

        .analysis-text {
          font-size: 15px; line-height: 1.7; color: #aaa;
          border-left: 2px solid #00ff8844; padding-left: 16px;
          font-weight: 400;
        }

        .session-stats {
          display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
        }
        .stat-box {
          text-align: center; padding: 12px 20px;
          border-radius: 8px; background: #0a0a10;
          border: 1px solid #111120; min-width: 80px;
        }
        .stat-num {
          font-family: 'Orbitron', monospace; font-size: 28px;
          font-weight: 700; line-height: 1;
        }
        .stat-label {
          font-size: 10px; letter-spacing: 2px; margin-top: 4px;
          text-transform: uppercase; color: #555;
        }

        .analyzing-state {
          text-align: center; padding: 40px;
          animation: analyzing-pulse 1.5s ease-in-out infinite;
        }
        .analyzing-ring {
          width: 80px; height: 80px; border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: #00ff88;
          border-right-color: #00d4ff;
          animation: rotate-slow 1s linear infinite;
          margin: 0 auto 20px;
          box-shadow: 0 0 20px rgba(0,255,136,0.3);
        }

        .corner-tl, .corner-tr, .corner-bl, .corner-br {
          position: absolute; width: 12px; height: 12px;
        }
        .corner-tl { top: 8px; left: 8px; border-top: 1px solid #00ff8844; border-left: 1px solid #00ff8844; }
        .corner-tr { top: 8px; right: 8px; border-top: 1px solid #00ff8844; border-right: 1px solid #00ff8844; }
        .corner-bl { bottom: 8px; left: 8px; border-bottom: 1px solid #00ff8844; border-left: 1px solid #00ff8844; }
        .corner-br { bottom: 8px; right: 8px; border-bottom: 1px solid #00ff8844; border-right: 1px solid #00ff8844; }

        .pulse-btn {
          animation: pulse-ring 2s infinite;
        }

        .tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
        .tag {
          padding: 3px 10px; border-radius: 12px; font-size: 11px;
          border: 1px solid; letter-spacing: 0.5px; font-weight: 600;
        }
        .tag-red { color: #ff4466; border-color: #ff446644; background: #ff44660a; }
        .tag-green { color: #00ff88; border-color: #00ff8844; background: #00ff880a; }

        .follow-up {
          background: linear-gradient(135deg, #0d0d20, #0a0a18);
          border: 1px solid #00d4ff33; border-radius: 8px;
          padding: 14px 16px; margin-top: 12px;
          color: #00d4ff; font-style: italic; font-size: 14px;
          position: relative; overflow: hidden;
        }
        .follow-up::before {
          content: 'RECOMMENDED PROBE →';
          font-size: 9px; letter-spacing: 2px; font-style: normal;
          color: #00d4ff66; display: block; margin-bottom: 4px;
          font-family: 'Share Tech Mono', monospace;
        }

        .scrollbar-custom::-webkit-scrollbar { width: 4px; }
        .scrollbar-custom::-webkit-scrollbar-track { background: #0a0a10; }
        .scrollbar-custom::-webkit-scrollbar-thumb { background: #00ff8844; border-radius: 2px; }

        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.85);
          z-index: 100; display: flex; align-items: center; justify-content: center;
          padding: 20px; backdrop-filter: blur(4px);
        }
        .modal {
          background: #0a0a10; border: 1px solid #1a1a2e;
          border-radius: 12px; max-width: 500px; width: 100%;
          padding: 28px; max-height: 80vh; overflow-y: auto;
          animation: reveal-up 0.3s ease;
        }
      `}</style>

      <div className="app-root">
        <div className="content">

          {/* HEADER */}
          <div className="header">
            <div className="header-eyebrow">◈ AI DECEPTION ANALYSIS SYSTEM v3.1 ◈</div>
            <div className="header-title">NEURAL LIE<br/>DETECTOR</div>
            <div className="header-sub">Deep behavioral linguistic analysis • Real-time AI inference</div>
          </div>

          {/* BIOMETRIC PANEL */}
          <div className="panel">
            <div className="corner-tl"/><div className="corner-tr"/>
            <div className="corner-bl"/><div className="corner-br"/>
            {(phase === "awaiting" || phase === "analyzing") && <ScanLine />}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div className="panel-label" style={{ margin: 0 }}>biometric feed</div>
              <div className="status-dots">
                <div className={`dot ${phase === "idle" ? "dot-yellow" : "dot-green"}`} />
                <div className={`dot ${phase === "analyzing" ? "dot-red" : "dot-yellow"}`} />
                <div className="dot dot-green" />
              </div>
            </div>

            <div className="biometric-bar">
              <div style={{ fontSize: 10, color: "#333", letterSpacing: 2, marginBottom: 6, fontFamily: "'Share Tech Mono', monospace" }}>
                STRESS WAVEFORM — CH.1
              </div>
              <BiometricWave active={phase !== "idle"} stress={stressLevel} color="#00ff88" />
            </div>
            <div className="biometric-bar">
              <div style={{ fontSize: 10, color: "#333", letterSpacing: 2, marginBottom: 6, fontFamily: "'Share Tech Mono', monospace" }}>
                NEURAL PATTERN — CH.2
              </div>
              <BiometricWave active={phase === "analyzing" || phase === "result"} stress={stressLevel * 0.7} color="#00d4ff" />
            </div>
          </div>

          {/* MAIN INTERACTION */}
          {phase === "idle" && (
            <div className="panel" style={{ animation: "reveal-up 0.4s ease" }}>
              <div className="panel-label">interrogation input</div>
              <input
                className="question-input"
                placeholder="Type your question to ask the subject..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === "Enter" && startQuestion()}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
                <div style={{ fontSize: 12, color: "#333", fontFamily: "'Share Tech Mono', monospace" }}>
                  {question.length} chars — ready to interrogate
                </div>
                <button className="btn-primary" onClick={startQuestion} disabled={!question.trim()}>
                  INITIATE →
                </button>
              </div>
              {error && (
                <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: "#ff446610", border: "1px solid #ff446644", color: "#ff4466", fontSize: 12 }}>
                  ⚠ {error}
                </div>
              )}
            </div>
          )}

          {phase === "awaiting" && (
            <div className="panel" style={{ animation: "reveal-up 0.4s ease" }}>
              <div className="panel-label">subject response capture</div>
              <div style={{
                padding: "16px 20px", background: "#0a0a10", borderRadius: 8,
                marginBottom: 24, border: "1px solid #1a1a2e", fontSize: 16,
                color: "#ccc", lineHeight: 1.5, fontStyle: "italic"
              }}>
                "{question}"
              </div>
              <div style={{ fontSize: 13, color: "#555", textAlign: "center", marginBottom: 20, fontFamily: "'Share Tech Mono', monospace", letterSpacing: 2 }}>
                AWAITING BINARY RESPONSE — MONITORING INITIATED
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <button className="btn-answer btn-yes pulse-btn" onClick={() => recordAnswer("YES")}>YES</button>
                <button className="btn-answer btn-no" onClick={() => recordAnswer("NO")}>NO</button>
              </div>
            </div>
          )}

          {phase === "analyzing" && (
            <div className="panel">
              <div className="analyzing-state">
                <div className="analyzing-ring" />
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, letterSpacing: 4, color: "#00ff88", marginBottom: 8 }}>
                  ANALYZING
                </div>
                <div style={{ color: "#333", fontSize: 11, letterSpacing: 3, fontFamily: "'Share Tech Mono', monospace" }}>
                  PROCESSING LINGUISTIC DECEPTION MARKERS...
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 16, flexWrap: "wrap" }}>
                  {["NLP ENGINE", "STRESS ANALYSIS", "NEURAL PATTERN", "COGNITIVE LOAD"].map(l => (
                    <span key={l} style={{
                      fontSize: 9, letterSpacing: 2, color: "#00d4ff66",
                      border: "1px solid #00d4ff22", padding: "3px 8px", borderRadius: 3,
                      fontFamily: "'Share Tech Mono', monospace"
                    }}>{l}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {phase === "result" && result && (
            <>
              {/* VERDICT */}
              <div className="panel" style={{ borderColor: verdictColor + "44" }}>
                <div className="corner-tl" style={{ borderColor: verdictColor + "66" }} />
                <div className="corner-tr" style={{ borderColor: verdictColor + "66" }} />
                <div className="corner-bl" style={{ borderColor: verdictColor + "66" }} />
                <div className="corner-br" style={{ borderColor: verdictColor + "66" }} />

                <div className="verdict-display">
                  <div style={{ fontSize: 11, color: "#444", letterSpacing: 4, marginBottom: 16, fontFamily: "'Share Tech Mono', monospace" }}>
                    VERDICT RENDERED
                  </div>
                  <div className="verdict-text" style={{ color: verdictColor }}>
                    {result.verdict}
                  </div>
                  <div style={{ marginTop: 16 }}>
                    <PatternBadge pattern={result.neural_pattern} />
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 16, fontFamily: "'Share Tech Mono', monospace" }}>
                    SUBJECT ANSWERED <span style={{ color: "#ccc", fontWeight: 700 }}>"{answer}"</span>
                    {answerTime && <span> IN {(answerTime / 1000).toFixed(2)}s</span>}
                  </div>
                </div>
              </div>

              {/* GAUGES */}
              <div className="panel">
                <div className="panel-label">psychometric analysis</div>
                <div className="gauge-row">
                  <CircularGauge value={result.deception_score} label="Deception" color="#ff4466" size={110} />
                  <CircularGauge value={result.confidence} label="Confidence" color="#00d4ff" size={110} />
                  <CircularGauge value={result.stress_level} label="Stress" color="#ffd60a" size={110} />
                </div>

                <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8, flexWrap: "wrap" }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#444", letterSpacing: 2, fontFamily: "'Share Tech Mono', monospace" }}>COGNITIVE LOAD</div>
                    <div style={{
                      fontSize: 16, fontWeight: 700, marginTop: 4, fontFamily: "'Orbitron', monospace",
                      color: result.cognitive_load === "HIGH" ? "#ff4466" : result.cognitive_load === "MEDIUM" ? "#ffd60a" : "#00ff88"
                    }}>{result.cognitive_load}</div>
                  </div>
                </div>
              </div>

              {/* ANALYSIS */}
              <div className="panel">
                <div className="panel-label">linguistic analysis</div>
                <div className="analysis-text">{result.analysis}</div>

                <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#ff4466", letterSpacing: 2, marginBottom: 8, fontFamily: "'Share Tech Mono', monospace" }}>
                      ⚠ RISK FACTORS
                    </div>
                    {result.risk_factors?.map((f, i) => (
                      <div key={i} className="indicator-item" style={{ borderColor: "#ff446622", marginBottom: 6 }}>
                        <div className="indicator-dot" style={{ background: "#ff4466", boxShadow: "0 0 4px #ff4466" }} />
                        <span style={{ fontSize: 11 }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#00ff88", letterSpacing: 2, marginBottom: 8, fontFamily: "'Share Tech Mono', monospace" }}>
                      ✓ TRUTH SIGNALS
                    </div>
                    {result.truthfulness_signals?.map((s, i) => (
                      <div key={i} className="indicator-item" style={{ marginBottom: 6 }}>
                        <div className="indicator-dot" />
                        <span style={{ fontSize: 11 }}>{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 8, fontFamily: "'Share Tech Mono', monospace" }}>
                    PSYCHOLOGICAL INDICATORS
                  </div>
                  <div className="tag-row">
                    {result.psychological_indicators?.map((ind, i) => (
                      <span key={i} className="tag tag-red">{ind}</span>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, marginBottom: 8, fontFamily: "'Share Tech Mono', monospace" }}>
                    MICRO TELLS
                  </div>
                  <div className="tag-row">
                    {result.micro_tells?.map((t, i) => (
                      <span key={i} className="tag tag-green">{t}</span>
                    ))}
                  </div>
                </div>

                <div className="follow-up">{result.recommendation}</div>
              </div>

              {/* NEXT ACTIONS */}
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => { setPhase("idle"); setQuestion(""); }}
                  className="btn-primary"
                  style={{ flex: 1, background: "linear-gradient(135deg, #00d4ff, #0099cc)" }}
                >
                  NEW QUESTION
                </button>
                <button
                  onClick={reset}
                  style={{
                    padding: "14px 20px", borderRadius: 6, cursor: "pointer",
                    fontFamily: "'Orbitron', monospace", fontSize: 11, fontWeight: 700,
                    letterSpacing: 1, background: "transparent", color: "#444",
                    border: "1px solid #1a1a2e", transition: "all 0.2s"
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "#333"; e.currentTarget.style.color = "#888"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "#1a1a2e"; e.currentTarget.style.color = "#444"; }}
                >
                  RESET SESSION
                </button>
              </div>
            </>
          )}

          {/* SESSION STATS */}
          {(history.length > 0) && (
            <div className="panel" style={{ marginTop: 16 }}>
              <div className="panel-label">session intelligence</div>
              <div className="session-stats">
                <div className="stat-box">
                  <div className="stat-num" style={{ color: "#ff4466" }}>{sessionStats.lies}</div>
                  <div className="stat-label">Lies</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num" style={{ color: "#00ff88" }}>{sessionStats.truths}</div>
                  <div className="stat-label">Truths</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num" style={{ color: "#ffd60a" }}>{sessionStats.uncertain}</div>
                  <div className="stat-label">Uncertain</div>
                </div>
                <div className="stat-box">
                  <div className="stat-num" style={{ color: "#00d4ff" }}>{history.length}</div>
                  <div className="stat-label">Total</div>
                </div>
                {history.length > 0 && (
                  <div className="stat-box">
                    <div className="stat-num" style={{ color: "#cc00ff" }}>
                      {Math.round((sessionStats.lies / history.length) * 100)}%
                    </div>
                    <div className="stat-label">Lie Rate</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* HISTORY */}
          {history.length > 0 && (
            <div className="panel">
              <div className="panel-label">interrogation log</div>
              <div className="scrollbar-custom" style={{ maxHeight: 300, overflowY: "auto" }}>
                {history.map((item, i) => (
                  <HistoryItem key={item.timestamp} item={item} index={history.length - 1 - i} onClick={setSelectedHistory} />
                ))}
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div style={{ textAlign: "center", marginTop: 32, color: "#1a1a2e", fontSize: 10, fontFamily: "'Share Tech Mono', monospace", letterSpacing: 2 }}>
            NEURAL LIE DETECTOR • AI-POWERED • FOR EDUCATIONAL USE ONLY
          </div>
        </div>
      </div>

      {/* HISTORY MODAL */}
      {selectedHistory && (
        <div className="modal-overlay" onClick={() => setSelectedHistory(null)}>
          <div className="modal scrollbar-custom" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, color: "#00d4ff" }}>RECORD DETAILS</div>
              <button onClick={() => setSelectedHistory(null)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 8 }}>Question</div>
            <div style={{ color: "#ddd", fontSize: 15, marginBottom: 16, fontStyle: "italic" }}>"{selectedHistory.question}"</div>
            <div style={{ color: "#888", fontSize: 13, marginBottom: 4 }}>Answer: <span style={{ color: "#fff" }}>{selectedHistory.answer}</span></div>
            <div style={{ marginBottom: 16 }}>
              <PatternBadge pattern={selectedHistory.result?.neural_pattern} />
            </div>
            <div className="analysis-text" style={{ fontSize: 13 }}>{selectedHistory.result?.analysis}</div>
            <div className="follow-up" style={{ marginTop: 16 }}>{selectedHistory.result?.recommendation}</div>
          </div>
        </div>
      )}
    </>
  );
}
