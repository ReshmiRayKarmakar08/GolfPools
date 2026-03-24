import { useRef, useEffect } from 'react';
import gsap from 'gsap';

export default function MagneticButton({ children, className = '', strength = 0.3, ...props }) {
  const btnRef = useRef(null);
  const glowRef = useRef(null);

  useEffect(() => {
    const btn = btnRef.current;
    if (!btn) return;

    const handleMouseMove = (e) => {
      const rect = btn.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const deltaX = e.clientX - centerX;
      const deltaY = e.clientY - centerY;
      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const threshold = Math.max(rect.width, rect.height) * 1.5;

      if (dist < threshold) {
        const pullX = deltaX * strength;
        const pullY = deltaY * strength;

        gsap.to(btn, {
          x: pullX,
          y: pullY,
          duration: 0.4,
          ease: 'power2.out',
        });

        // Glow follows cursor position
        if (glowRef.current) {
          gsap.to(glowRef.current, {
            opacity: 0.6,
            x: deltaX * 0.15,
            y: deltaY * 0.15,
            duration: 0.3,
          });
        }
      }
    };

    const handleMouseLeave = () => {
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 0.6,
        ease: 'elastic.out(1, 0.4)',
      });
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          opacity: 0,
          x: 0,
          y: 0,
          duration: 0.5,
        });
      }
    };

    btn.addEventListener('mousemove', handleMouseMove);
    btn.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      btn.removeEventListener('mousemove', handleMouseMove);
      btn.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [strength]);

  return (
    <div ref={btnRef} className={`magnetic-btn-wrapper ${className}`} {...props}>
      <div ref={glowRef} className="magnetic-glow" />
      {children}
    </div>
  );
}
