import { useEffect, useRef } from "react";

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  rotation: number;
  rotationSpeed: number;
  shape: "circle" | "star" | "diamond" | "confetti";
  gravity?: number;
}

export interface ParticleConfig {
  count: number;
  colors: string[];
  shapes?: Particle["shape"][];
  speed?: number;
  spread?: number;
  gravity?: number;
  decay?: number;
  size?: number;
}

export class GiftParticleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationId: number = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private drawStar(x: number, y: number, size: number, rotation: number) {
    const ctx = this.ctx;
    const spikes = 5;
    const outerRadius = size;
    const innerRadius = size * 0.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes;
      if (i === 0)
        ctx.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
      else ctx.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawDiamond(x: number, y: number, size: number, rotation: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.6, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  private drawConfetti(x: number, y: number, size: number, rotation: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    ctx.restore();
  }

  private drawParticle(p: Particle) {
    const ctx = this.ctx;
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    switch (p.shape) {
      case "star":
        this.drawStar(p.x, p.y, p.size, p.rotation);
        break;
      case "diamond":
        this.drawDiamond(p.x, p.y, p.size, p.rotation);
        break;
      case "confetti":
        this.drawConfetti(p.x, p.y, p.size, p.rotation);
        break;
      default:
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private tick() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles = this.particles.filter((p) => p.alpha > 0.01);

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity ?? 0.1;
      p.alpha -= p.decay;
      p.rotation += p.rotationSpeed;
      this.drawParticle(p);
    }

    if (this.running) {
      this.animationId = requestAnimationFrame(() => this.tick());
    }
  }

  emitBurst(x: number, y: number, config: ParticleConfig) {
    const {
      count,
      colors,
      shapes = ["circle"],
      speed = 8,
      spread = Math.PI * 2,
      gravity = 0.15,
      decay = 0.015,
      size = 6,
    } = config;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * spread - spread / 2;
      const vel = speed * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * vel,
        vy: Math.sin(angle) * vel,
        size: size * (0.5 + Math.random() * 0.8),
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: decay * (0.5 + Math.random()),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        shape: shapes[Math.floor(Math.random() * shapes.length)],
        gravity,
      });
    }
  }

  emitConfetti(count: number) {
    const colors = [
      "#ff6b6b",
      "#ffd93d",
      "#6bcb77",
      "#4d96ff",
      "#c77dff",
      "#ff9f1c",
      "#e63946",
    ];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: -20,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 3 + 2,
        size: 8 + Math.random() * 6,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.005,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.2,
        shape: "confetti",
        gravity: 0.05,
      });
    }
  }

  emitFireworks(x: number, y: number, colors: string[]) {
    this.emitBurst(x, y, {
      count: 60,
      colors,
      shapes: ["star", "circle", "diamond"],
      speed: 10,
      spread: Math.PI * 2,
      gravity: 0.2,
      decay: 0.01,
      size: 5,
    });
  }

  emitRain(count: number, shape: Particle["shape"], colors: string[]) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: -20,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 4 + 3,
          size: 10 + Math.random() * 15,
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.9,
          decay: 0.006,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.15,
          shape,
          gravity: 0.08,
        });
      }, i * 50);
    }
  }

  start() {
    this.running = true;
    this.tick();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animationId);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.particles = [];
  }

  clear() {
    this.particles = [];
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

// React hook for easy use
export function useParticleEngine(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
) {
  const engineRef = useRef<GiftParticleEngine | null>(null);

  useEffect(() => {
    if (canvasRef.current && !engineRef.current) {
      engineRef.current = new GiftParticleEngine(canvasRef.current);
      engineRef.current.start();

      const onResize = () => engineRef.current?.resize();
      window.addEventListener("resize", onResize);
      return () => {
        window.removeEventListener("resize", onResize);
        engineRef.current?.stop();
        engineRef.current = null;
      };
    }
  }, [canvasRef]);

  return engineRef;
}
