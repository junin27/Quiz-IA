import React, { useEffect, useRef } from 'react';

export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rotation: number;
      vRotation: number;
    }> = [];

    const resizeCanvas = () => {
      const prevW = canvas.width;
      const prevH = canvas.height;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      if (particles.length === 0) {
        initParticles();
      } else {
        // Redimensiona mantendo a posição das partículas existentes proporcionalmente
        const scaleX = canvas.width / (prevW || canvas.width);
        const scaleY = canvas.height / (prevH || canvas.height);
        particles.forEach((p) => {
          p.x *= scaleX;
          p.y *= scaleY;
        });
      }
    };

    const initParticles = () => {
      particles = [];
      const cols = 6; // Reduzido de 7 para 5
      const rows = 5; // Reduzido para 4 para manter a quantidade baixa
      const cellWidth = canvas.width / cols;
      const cellHeight = canvas.height / rows;

      // Cores calibradas com opacidades visíveis (11% a 15%)
      const colors = [
        'rgba(244, 63, 94, 0.15)',  // rose-500 com 15%
        'rgba(249, 115, 22, 0.11)',  // orange-500 com 11%
        'rgba(239, 68, 68, 0.14)',   // red-500 com 14%
      ];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // Posição central da célula na grade
          let x = (c + 0.5) * cellWidth;
          let y = (r + 0.5) * cellHeight;

          // Adiciona perturbação (jitter) aleatória para espalhar de forma natural e evitar grid rígido
          x += (Math.random() - 0.5) * cellWidth * 0.7;
          y += (Math.random() - 0.5) * cellHeight * 0.7;

          // Velocidade aumentada (entre 0.4 e 0.8 pixels por frame) para ficar visível sem ser frenético
          const speed = Math.random() * 0.4 + 0.4;
          const angle = Math.random() * Math.PI * 2;
          const vx = Math.cos(angle) * speed;
          const vy = Math.sin(angle) * speed;

          particles.push({
            x,
            y,
            vx,
            vy,
            size: Math.random() * 24 + 16, // Tamanho entre 16px e 40px
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * Math.PI * 2,
            vRotation: (Math.random() - 0.5) * 0.006, // Rotação ligeiramente mais perceptível
          });
        }
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRotation;

        // Comportamento de wrap-around suave (reentra na tela quando sai das bordas)
        const margin = p.size;
        if (p.x < -margin) p.x = canvas.width + margin;
        if (p.x > canvas.width + margin) p.x = -margin;
        if (p.y < -margin) p.y = canvas.height + margin;
        if (p.y > canvas.height + margin) p.y = -margin;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);

        ctx.fillStyle = p.color;
        ctx.font = `800 ${p.size}px Outfit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText('?', 0, 0);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none -z-10 bg-dark-900 blur-[1px]"
    />
  );
};

export default ParticleBackground;
