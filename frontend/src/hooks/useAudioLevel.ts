import { useCallback, useEffect, useRef, useState } from "react";

export function useAudioLevel() {
  const levelRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const rafRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    ctxRef.current?.close();
    streamRef.current = null;
    ctxRef.current = null;
    analyserRef.current = null;
    levelRef.current = 0;
    setReady(false);
  }, []);

  const start = useCallback(async () => {
    stop();
    try {
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);

      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b) / data.length;
        const norm = Math.min(1, Math.max(0, (avg - 20) / 90));
        levelRef.current += (norm - levelRef.current) * 0.15;
        rafRef.current = requestAnimationFrame(tick);
      };

      tick();
      setReady(true);
    } catch (e: any) {
      setError(e.message);
    }
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { levelRef, ready, error, start, stop };
}
