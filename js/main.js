/* ============================================================
   CYBERPUNK PORTFOLIO — main.js
   A single, modular, 60-fps-optimised JavaScript file.
   Each feature is wrapped in its own function / IIFE.
   ============================================================ */

/* ============================================
   0. GLOBAL UTILITIES
   ============================================ */
const Utils = (() => {
  /**
   * Linear interpolation — used everywhere for smooth following.
   * @param {number} a  Start value
   * @param {number} b  End value
   * @param {number} t  Interpolant (0-1)
   */
  const lerp = (a, b, t) => a + (b - a) * t;

  /** Clamp a number between min and max. */
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  /** Returns a random float in [min, max). */
  const rand = (min, max) => Math.random() * (max - min) + min;

  /** Returns a random integer in [min, max]. */
  const randInt = (min, max) => Math.floor(rand(min, max + 1));

  /** EaseOutExpo curve for counter animations. */
  const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  /**
   * Throttle via requestAnimationFrame — ensures the callback
   * runs at most once per frame (~16 ms at 60 fps).
   */
  const rafThrottle = (fn) => {
    let ticking = false;
    return (...args) => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          fn(...args);
          ticking = false;
        });
      }
    };
  };

  /** Simple debounce. */
  const debounce = (fn, ms = 200) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };

  return { lerp, clamp, rand, randInt, easeOutExpo, rafThrottle, debounce };
})();


/* ============================================
   1. LOADING SCREEN
   ============================================ */
const LoadingScreen = (() => {
  const lines = [
    '> Initializing Sunil.exe...',
    '> Loading neural interface...',
    '> Connecting to mainframe...',
    '> Decrypting portfolio data...',
    '> Calibrating holographic display...',
    '> System ready.',
  ];

  const DELAY_PER_LINE  = 400;   // ms between lines
  const CHAR_SPEED      = 20;    // ms per character typing

  /**
   * Simulate a typing effect for a single line.
   * Returns a Promise that resolves when the line is fully typed.
   */
  const typeLine = (container, text) =>
    new Promise((resolve) => {
      const lineEl = document.createElement('p');
      lineEl.classList.add('boot-line');
      container.appendChild(lineEl);

      let i = 0;
      const interval = setInterval(() => {
        lineEl.textContent += text[i];
        i++;
        if (i >= text.length) {
          clearInterval(interval);
          resolve();
        }
      }, CHAR_SPEED);
    });

  /** Run the full boot sequence. */
  const init = () =>
    new Promise(async (resolve) => {
      const screen   = document.getElementById('loading-screen');
      const output   = document.getElementById('boot-text');
      const bar      = document.getElementById('progress-bar');
      const pct      = document.getElementById('progress-percent');

      if (!screen || !output) { resolve(); return; }

      for (let idx = 0; idx < lines.length; idx++) {
        await typeLine(output, lines[idx]);

        // Update progress
        const progress = Math.round(((idx + 1) / lines.length) * 100);
        if (bar)  bar.style.width = `${progress}%`;
        if (pct)  pct.textContent = `${progress}%`;

        // Pause between lines (skip after last)
        if (idx < lines.length - 1) {
          await new Promise((r) => setTimeout(r, DELAY_PER_LINE));
        }
      }

      // Fade-out after a short breath
      await new Promise((r) => setTimeout(r, 500));
      screen.classList.add('fade-out');

      // Wait for CSS transition then remove
      screen.addEventListener('transitionend', () => {
        screen.style.display = 'none';
        document.body.classList.remove('no-scroll');
        document.body.classList.add('loaded');
        resolve();
      }, { once: true });

      // Fallback in case transitionend doesn't fire
      setTimeout(() => {
        screen.style.display = 'none';
        document.body.classList.remove('no-scroll');
        document.body.classList.add('loaded');
        resolve();
      }, 1200);
    });

  return { init };
})();


/* ============================================
   2. CUSTOM CURSOR
   ============================================ */
const CustomCursor = (() => {
  let dotX = 0, dotY = 0;
  let outX = 0, outY = 0;
  let mouseX = 0, mouseY = 0;
  let rafId = null;
  let trailThrottleTimer = 0;

  const OUTLINE_LERP = 0.15;          // smooth-follow speed
  const TRAIL_INTERVAL = 40;          // ms between trail particles

  const init = () => {
    const dot     = document.querySelector('.cursor-dot');
    const outline = document.querySelector('.cursor-outline');
    if (!dot || !outline) return;

    // Interactive elements that trigger "hover" state
    const hoverSelector = 'a, button, input, textarea, .project-card, .achievement-card';

    /* — Mouse move — */
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;

      // Immediate dot position
      dotX = mouseX;
      dotY = mouseY;
      dot.style.transform = `translate(${dotX}px, ${dotY}px)`;

      // Trail particle (throttled)
      const now = performance.now();
      if (now - trailThrottleTimer > TRAIL_INTERVAL) {
        trailThrottleTimer = now;
        spawnTrail(mouseX, mouseY);
      }
    }, { passive: true });

    /* — Outline smooth follow loop — */
    const animateOutline = () => {
      outX = Utils.lerp(outX, mouseX, OUTLINE_LERP);
      outY = Utils.lerp(outY, mouseY, OUTLINE_LERP);
      outline.style.transform = `translate(${outX}px, ${outY}px)`;
      rafId = requestAnimationFrame(animateOutline);
    };
    rafId = requestAnimationFrame(animateOutline);

    /* — Hover state — */
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverSelector)) {
        dot.classList.add('hover');
        outline.classList.add('hover');
      }
    }, { passive: true });

    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverSelector)) {
        dot.classList.remove('hover');
        outline.classList.remove('hover');
      }
    }, { passive: true });

    /* — Hide when leaving window — */
    document.addEventListener('mouseleave', () => {
      dot.style.opacity = '0';
      outline.style.opacity = '0';
    });
    document.addEventListener('mouseenter', () => {
      dot.style.opacity = '1';
      outline.style.opacity = '1';
    });
  };

  /** Spawn a tiny trail particle at (x, y). */
  const spawnTrail = (x, y) => {
    const el = document.createElement('div');
    el.className = 'cursor-trail';
    el.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--primary, #00f0ff);
      pointer-events: none;
      z-index: 10000;
      opacity: 0.7;
      transition: opacity 0.5s ease, transform 0.5s ease;
    `;
    document.body.appendChild(el);

    // Trigger fade
    requestAnimationFrame(() => {
      el.style.opacity = '0';
      el.style.transform = 'scale(0)';
    });

    setTimeout(() => el.remove(), 500);
  };

  return { init };
})();


/* ============================================
   3. PARTICLE SYSTEM (Hero Background)
   ============================================ */
const ParticleSystem = (() => {
  const PARTICLE_COUNT  = 100;
  const CONNECT_DIST    = 150;
  const MOUSE_RADIUS    = 120;
  const MOUSE_FORCE     = 0.8;

  let canvas, ctx, particles, w, h;
  let mouseHeroX = -9999, mouseHeroY = -9999;
  let rafId = null;
  let isVisible = true;

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x  = Utils.rand(0, w);
      this.y  = Utils.rand(0, h);
      this.vx = Utils.rand(-0.4, 0.4);
      this.vy = Utils.rand(-0.4, 0.4);
      this.r  = Utils.rand(1, 3);
      this.o  = Utils.rand(0.3, 0.8);
      // Colour: cyan or purple
      this.color = Math.random() > 0.5 ? '0, 240, 255' : '176, 38, 255';
    }
  }

  const initParticles = () => {
    particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
  };

  const resize = () => {
    const hero = document.getElementById('hero');
    if (!hero) return;
    w = canvas.width  = hero.offsetWidth;
    h = canvas.height = hero.offsetHeight;
  };

  const draw = () => {
    if (!isVisible) { rafId = requestAnimationFrame(draw); return; }

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Mouse repulsion
      const dx = p.x - mouseHeroX;
      const dy = p.y - mouseHeroY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MOUSE_RADIUS && dist > 0) {
        const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS * MOUSE_FORCE;
        p.vx += (dx / dist) * force;
        p.vy += (dy / dist) * force;
      }

      // Damping
      p.vx *= 0.99;
      p.vy *= 0.99;

      // Move
      p.x += p.vx;
      p.y += p.vy;

      // Wrap
      if (p.x < -p.r) p.x = w + p.r;
      if (p.x > w + p.r) p.x = -p.r;
      if (p.y < -p.r) p.y = h + p.r;
      if (p.y > h + p.r) p.y = -p.r;

      // Draw particle
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${p.o})`;
      ctx.fill();

      // Connections (only check subsequent particles to avoid doubles)
      for (let j = i + 1; j < particles.length; j++) {
        const q  = particles[j];
        const cx = p.x - q.x;
        const cy = p.y - q.y;
        const cd = Math.sqrt(cx * cx + cy * cy);
        if (cd < CONNECT_DIST) {
          const alpha = (1 - cd / CONNECT_DIST) * 0.25;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(0, 240, 255, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    rafId = requestAnimationFrame(draw);
  };

  const init = () => {
    canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resize();
    initParticles();

    // Mouse tracking within hero
    const hero = document.getElementById('hero');
    if (hero) {
      hero.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseHeroX = e.clientX - rect.left;
        mouseHeroY = e.clientY - rect.top;
      }, { passive: true });

      hero.addEventListener('mouseleave', () => {
        mouseHeroX = -9999;
        mouseHeroY = -9999;
      }, { passive: true });
    }

    window.addEventListener('resize', Utils.debounce(resize, 250));

    // Visibility gating via IntersectionObserver
    if ('IntersectionObserver' in window && hero) {
      const obs = new IntersectionObserver(
        ([entry]) => { isVisible = entry.isIntersecting; },
        { threshold: 0 }
      );
      obs.observe(hero);
    }

    rafId = requestAnimationFrame(draw);
  };

  return { init };
})();


/* ============================================
   4. TYPING EFFECT
   ============================================ */
const TypingEffect = (() => {
  const roles = [
    'Java Developer',
    'Frontend Developer',
    'DevOps Learner',
    'Full Stack Developer',
  ];

  const TYPE_SPEED   = 100;  // ms per char
  const DELETE_SPEED = 50;
  const PAUSE_AFTER  = 2000;

  let roleIdx = 0;
  let charIdx = 0;
  let isDeleting = false;
  let el = null;

  const tick = () => {
    if (!el) return;

    const current = roles[roleIdx];

    if (isDeleting) {
      charIdx--;
      el.textContent = current.substring(0, charIdx);
      if (charIdx === 0) {
        isDeleting = false;
        roleIdx = (roleIdx + 1) % roles.length;
        setTimeout(tick, 300);
        return;
      }
      setTimeout(tick, DELETE_SPEED);
    } else {
      charIdx++;
      el.textContent = current.substring(0, charIdx);
      if (charIdx === current.length) {
        isDeleting = true;
        setTimeout(tick, PAUSE_AFTER);
        return;
      }
      setTimeout(tick, TYPE_SPEED);
    }
  };

  const init = () => {
    el = document.querySelector('.typing-text');
    if (el) tick();
  };

  return { init };
})();


/* ============================================
   5. NAVBAR
   ============================================ */
const Navbar = (() => {
  const init = () => {
    const nav       = document.querySelector('.navbar');
    const links     = document.querySelectorAll('.nav-link');
    const hamburger = document.querySelector('.hamburger');
    const navLinks  = document.querySelector('.nav-links');
    const sections  = document.querySelectorAll('section[id]');

    if (!nav) return;

    /* — Scroll class — */
    const onScroll = Utils.rafThrottle(() => {
      nav.classList.toggle('scrolled', window.scrollY > 50);
    });
    window.addEventListener('scroll', onScroll, { passive: true });

    /* — Active section highlighting — */
    if ('IntersectionObserver' in window) {
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = entry.target.id;
              links.forEach((link) => {
                link.classList.toggle(
                  'active',
                  link.getAttribute('href') === `#${id}`
                );
              });
            }
          });
        },
        { rootMargin: '-40% 0px -55% 0px' }
      );
      sections.forEach((s) => obs.observe(s));
    }

    /* — Smooth scroll — */
    links.forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }

        // Close mobile menu
        hamburger?.classList.remove('active');
        navLinks?.classList.remove('active');
      });
    });

    /* — Hamburger toggle — */
    if (hamburger && navLinks) {
      hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navLinks.classList.toggle('active');
      });
    }
  };

  return { init };
})();


/* ============================================
   6. SCROLL REVEAL ANIMATIONS
   ============================================ */
const ScrollReveal = (() => {
  const init = () => {
    const revealEls = document.querySelectorAll(
      '[data-reveal], .section-header, .about-content, .project-card, .achievement-card, .timeline-item, .stat-card, .contact-form'
    );

    if (!revealEls.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            // Stagger children if present
            const children = el.querySelectorAll('[data-reveal-child]');
            if (children.length) {
              children.forEach((child, i) => {
                child.style.transitionDelay = `${i * 100}ms`;
                child.classList.add('revealed');
              });
            }
            el.classList.add('revealed');
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.1 }
    );

    revealEls.forEach((el) => obs.observe(el));
  };

  return { init };
})();


/* ============================================
   7. STAT COUNTER (About Section)
   ============================================ */
const StatCounter = (() => {
  let triggered = false;

  const animateValue = (el, target, duration = 2000) => {
    const isDecimal = String(target).includes('.');
    const decimals  = isDecimal ? String(target).split('.')[1].length : 0;
    const start     = performance.now();

    const step = (now) => {
      const elapsed  = now - start;
      const progress = Utils.clamp(elapsed / duration, 0, 1);
      const value    = Utils.easeOutExpo(progress) * target;

      el.textContent = isDecimal ? value.toFixed(decimals) : Math.round(value);

      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const init = () => {
    const about = document.getElementById('about');
    if (!about) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !triggered) {
          triggered = true;
          document.querySelectorAll('.stat-card').forEach((card) => {
            const target = parseFloat(card.dataset.target);
            const numEl  = card.querySelector('.stat-number') || card.querySelector('h3');
            if (numEl && !isNaN(target)) animateValue(numEl, target);
          });
          obs.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    obs.observe(about);
  };

  return { init };
})();


/* ============================================
   8. SKILLS SOLAR SYSTEM
   ============================================ */
const SolarSystem = (() => {
  let rafId = null;
  let paused = false;
  let isVisible = false;
  let isDragging = false;
  let dragStartX = 0;
  let rotationOffset = 0;
  let lastDragX = 0;

  const init = () => {
    const container = document.querySelector('.solar-system');
    if (!container) return;

    const planets = container.querySelectorAll('.planet');
    const orbits  = container.querySelectorAll('.orbit');

    // Give each planet an angle and speed
    const planetData = [];
    planets.forEach((planet, i) => {
      const orbit = planet.closest('.orbit') || orbits[i];
      const orbitRadius = orbit ? orbit.offsetWidth / 2 : (i + 1) * 70;
      const speed = 0.003 + (planets.length - i) * 0.002; // inner = faster

      planetData.push({
        el: planet,
        orbit,
        orbitRadius,
        angle: (Math.PI * 2 * i) / planets.length,
        speed,
        paused: false,
      });
    });

    /* — Hover: pause individual planet, show tooltip — */
    planets.forEach((planet, i) => {
      planet.addEventListener('mouseenter', () => {
        planetData[i].paused = true;
      });
      planet.addEventListener('mouseleave', () => {
        planetData[i].paused = false;
      });

      // Click pulse
      planet.addEventListener('click', () => {
        planet.classList.add('pulse');
        planet.addEventListener('animationend', () => planet.classList.remove('pulse'), { once: true });
      });
    });

    /* — Drag to rotate — */
    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragStartX = e.clientX;
      lastDragX  = e.clientX;
    });
    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      const delta = e.clientX - lastDragX;
      rotationOffset += delta * 0.005;
      lastDragX = e.clientX;
    }, { passive: true });
    window.addEventListener('mouseup', () => { isDragging = false; });

    /* — Animation loop — */
    const animate = () => {
      if (isVisible) {
        planetData.forEach((p) => {
          if (!p.paused && !paused) {
            p.angle += p.speed;
          }
          const a = p.angle + rotationOffset;
          const x = Math.cos(a) * p.orbitRadius;
          const y = Math.sin(a) * p.orbitRadius * 0.4; // elliptical
          p.el.style.transform = `translate(${x}px, ${y}px) scale(${1 + y / (p.orbitRadius * 3)})`;
          p.el.style.zIndex    = Math.round(y + p.orbitRadius);
        });
      }
      rafId = requestAnimationFrame(animate);
    };

    // Visibility gating
    const section = container.closest('section') || container;
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        ([entry]) => { isVisible = entry.isIntersecting; },
        { threshold: 0 }
      ).observe(section);
    } else {
      isVisible = true;
    }

    rafId = requestAnimationFrame(animate);
  };

  return { init };
})();


/* ============================================
   9. PROJECT CARDS 3D EFFECT
   ============================================ */
const ProjectCards3D = (() => {
  const MAX_TILT = 15; // degrees

  const init = () => {
    document.querySelectorAll('.project-card').forEach((card) => {
      let ticking = false;

      card.addEventListener('mousemove', (e) => {
        if (ticking) return;
        ticking = true;

        requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const x    = e.clientX - rect.left;
          const y    = e.clientY - rect.top;
          const cx   = rect.width / 2;
          const cy   = rect.height / 2;

          const rotateY = ((x - cx) / cx) * MAX_TILT;
          const rotateX = ((cy - y) / cy) * MAX_TILT;

          card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;

          // Dynamic shine
          const shine = card.querySelector('.card-shine') || createShine(card);
          shine.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(0,240,255,0.15) 0%, transparent 60%)`;

          ticking = false;
        });
      }, { passive: true });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1,1,1)';
        card.style.transition = 'transform 0.5s ease';
        const shine = card.querySelector('.card-shine');
        if (shine) shine.style.background = 'transparent';
        setTimeout(() => { card.style.transition = ''; }, 500);
      });
    });
  };

  /** Lazily create a shine overlay inside the card. */
  const createShine = (card) => {
    const shine = document.createElement('div');
    shine.className = 'card-shine';
    shine.style.cssText = `
      position: absolute; inset: 0;
      pointer-events: none;
      border-radius: inherit;
      z-index: 2;
    `;
    card.style.position = 'relative';
    card.appendChild(shine);
    return shine;
  };

  return { init };
})();


/* ============================================
   10. INTERACTIVE TERMINAL
   ============================================ */
const Terminal = (() => {
  const commands = {
    help:     'Available commands: help, about, skills, projects, contact, clear, sudo, hack',
    about:    'Sunil Kumar — B.Tech IT student, full-stack developer, and DevOps enthusiast. Passionate about building scalable applications and learning new technologies.',
    skills:   'Java ████████░░ 90% | JavaScript ████████░░ 85% | React ███████░░░ 75% | Node.js ██████░░░░ 70% | Docker █████░░░░░ 60% | AWS █████░░░░░ 55%',
    projects: '1. Freequo — Freelance Marketplace\n2. DevOps Dashboard — Infrastructure Monitoring\n3. CodeArena — Competitive Coding Platform\n4. PortfolioOS — This Website',
    contact:  'Email: sunilkumar@example.com | GitHub: github.com/sunil | LinkedIn: linkedin.com/in/sunil',
    sudo:     "Nice try! You don't have root access 😄",
    hack:     'Initiating hack sequence... Just kidding! 🔒',
  };

  const init = () => {
    const input  = document.getElementById('terminal-input');
    const output = document.getElementById('terminal-output');
    if (!input || !output) return;

    // Auto-focus when visible
    if ('IntersectionObserver' in window) {
      const section = input.closest('section');
      if (section) {
        new IntersectionObserver(
          ([entry]) => { if (entry.isIntersecting) input.focus(); },
          { threshold: 0.5 }
        ).observe(section);
      }
    }

    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const cmd = input.value.trim().toLowerCase();
      if (!cmd) return;

      // Echo the command
      appendLine(output, `<span class="terminal-prompt">visitor@portfolio:~$</span> <span class="terminal-cmd">${escapeHtml(cmd)}</span>`);

      if (cmd === 'clear') {
        output.innerHTML = '';
      } else {
        const response = commands[cmd] || `Command not found: "${escapeHtml(cmd)}". Type "help" for available commands.`;
        // Typing effect for response
        typeResponse(output, response);
      }

      input.value = '';
      // Scroll output to bottom
      output.scrollTop = output.scrollHeight;
    });
  };

  const appendLine = (container, html) => {
    const p = document.createElement('p');
    p.innerHTML = html;
    container.appendChild(p);
  };

  /** Type out a response character-by-character. */
  const typeResponse = (container, text) => {
    const p = document.createElement('p');
    p.classList.add('terminal-response');
    container.appendChild(p);

    let i = 0;
    const interval = setInterval(() => {
      // Respect newlines
      if (text[i] === '\n') {
        p.appendChild(document.createElement('br'));
      } else {
        p.textContent += text[i];
      }
      i++;
      container.scrollTop = container.scrollHeight;
      if (i >= text.length) clearInterval(interval);
    }, 15);
  };

  const escapeHtml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return { init };
})();


/* ============================================
   11. CERTIFICATES INFINITE SCROLL
   ============================================ */
const CertificatesScroll = (() => {
  const init = () => {
    const track = document.querySelector('.certificates-track');
    if (!track) return;

    // Pause on hover
    track.addEventListener('mouseenter', () => {
      track.style.animationPlayState = 'paused';
    });
    track.addEventListener('mouseleave', () => {
      track.style.animationPlayState = 'running';
    });

    // Touch drag support for mobile
    let startX = 0, scrollLeft = 0, isTouching = false;

    track.addEventListener('touchstart', (e) => {
      isTouching = true;
      startX = e.touches[0].pageX;
      scrollLeft = track.scrollLeft;
      track.style.animationPlayState = 'paused';
    }, { passive: true });

    track.addEventListener('touchmove', (e) => {
      if (!isTouching) return;
      const dx = e.touches[0].pageX - startX;
      track.scrollLeft = scrollLeft - dx;
    }, { passive: true });

    track.addEventListener('touchend', () => {
      isTouching = false;
      track.style.animationPlayState = 'running';
    });
  };

  return { init };
})();


/* ============================================
   12. CONTACT FORM
   ============================================ */
const ContactForm = (() => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const init = () => {
    const form = document.getElementById('contact-form');
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const name    = form.querySelector('[name="name"]');
      const email   = form.querySelector('[name="email"]');
      const message = form.querySelector('[name="message"]');
      const btn     = form.querySelector('button[type="submit"]');

      // Simple validation
      if (!name?.value.trim() || !email?.value.trim() || !message?.value.trim()) {
        showToast('Please fill in all fields.', 'error');
        return;
      }
      if (!emailRegex.test(email.value.trim())) {
        showToast('Please enter a valid email address.', 'error');
        return;
      }

      // Rocket launch animation
      if (btn) {
        btn.classList.add('launched');
        btn.disabled = true;
      }

      // Simulate send
      setTimeout(() => {
        showToast('Message sent successfully! 🚀', 'success');
        form.reset();
        if (btn) {
          btn.classList.remove('launched');
          btn.disabled = false;
        }
      }, 2000);
    });
  };

  /** Quick toast notification. */
  const showToast = (msg, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    toast.style.cssText = `
      position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
      padding: 14px 28px; border-radius: 8px; z-index: 99999;
      font-family: 'JetBrains Mono', monospace; font-size: 0.9rem;
      color: #fff;
      background: ${type === 'success' ? 'rgba(0,240,255,0.2)' : 'rgba(255,60,60,0.2)'};
      border: 1px solid ${type === 'success' ? 'var(--primary,#00f0ff)' : '#ff3c3c'};
      backdrop-filter: blur(10px);
      opacity: 0; transition: opacity 0.4s ease;
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 3000);
  };

  return { init, showToast };
})();


/* ============================================
   13. MATRIX RAIN EFFECT
   ============================================ */
const MatrixRain = (() => {
  let canvas, ctx, columns, drops;
  let rafId = null;
  let enabled = true; // only in dark mode

  const FONT_SIZE = 14;
  const CHARS =
    'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  const init = () => {
    canvas = document.getElementById('matrix-canvas');
    if (!canvas) {
      // Create one dynamically
      canvas = document.createElement('canvas');
      canvas.id = 'matrix-canvas';
      canvas.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        pointer-events: none; z-index: -1; opacity: 0.04;
      `;
      document.body.prepend(canvas);
    }
    ctx = canvas.getContext('2d');

    resize();
    window.addEventListener('resize', Utils.debounce(resize, 300));
    rafId = requestAnimationFrame(draw);
  };

  const resize = () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.floor(canvas.width / FONT_SIZE);
    drops   = new Array(columns).fill(1).map(() => Utils.randInt(-canvas.height / FONT_SIZE, 0));
  };

  const draw = () => {
    if (!enabled || document.body.classList.contains('light-mode')) {
      // In light mode, just clear and idle
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rafId = requestAnimationFrame(draw);
      return;
    }

    // Semi-transparent black to create fade trail
    ctx.fillStyle = 'rgba(10, 10, 30, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#00ff41';
    ctx.font = `${FONT_SIZE}px monospace`;

    for (let i = 0; i < columns; i++) {
      const char = CHARS[Utils.randInt(0, CHARS.length - 1)];
      ctx.fillText(char, i * FONT_SIZE, drops[i] * FONT_SIZE);

      // Reset when off-screen (random threshold for varied speeds)
      if (drops[i] * FONT_SIZE > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    }

    rafId = requestAnimationFrame(draw);
  };

  /** Allow toggling from dark mode switch. */
  const setEnabled = (state) => { enabled = state; };

  return { init, setEnabled };
})();


/* ============================================
   14. SHOOTING STARS
   ============================================ */
const ShootingStars = (() => {
  let timer = null;

  const spawn = () => {
    const star = document.createElement('div');
    star.className = 'shooting-star';

    const startX = Utils.rand(0, window.innerWidth * 0.8);
    const startY = Utils.rand(0, window.innerHeight * 0.3);
    const length = Utils.rand(80, 200);
    const angle  = Utils.rand(30, 60);

    star.style.cssText = `
      position: fixed;
      left: ${startX}px;
      top: ${startY}px;
      width: ${length}px;
      height: 2px;
      background: linear-gradient(90deg, rgba(0,240,255,0), rgba(0,240,255,0.8), #fff);
      border-radius: 2px;
      transform: rotate(${angle}deg);
      pointer-events: none;
      z-index: 0;
      opacity: 0;
      animation: shootingStar 1s ease-in forwards;
    `;

    document.body.appendChild(star);
    setTimeout(() => star.remove(), 1200);

    // Schedule next
    scheduleNext();
  };

  const scheduleNext = () => {
    const delay = Utils.rand(3000, 8000);
    timer = setTimeout(spawn, delay);
  };

  const init = () => {
    // Inject keyframe if missing
    if (!document.getElementById('shooting-star-keyframes')) {
      const style = document.createElement('style');
      style.id = 'shooting-star-keyframes';
      style.textContent = `
        @keyframes shootingStar {
          0%   { opacity: 0; transform: rotate(var(--angle, 45deg)) translateX(0); }
          10%  { opacity: 1; }
          100% { opacity: 0; transform: rotate(var(--angle, 45deg)) translateX(600px); }
        }
      `;
      document.head.appendChild(style);
    }
    scheduleNext();
  };

  return { init };
})();


/* ============================================
   15. PARALLAX EFFECTS
   ============================================ */
const Parallax = (() => {
  const init = () => {
    const hero = document.getElementById('hero');
    const parallaxEls = document.querySelectorAll('[data-parallax]');

    const onScroll = Utils.rafThrottle(() => {
      const scrollY = window.scrollY;

      // Hero particles canvas moves slower
      if (hero) {
        const canvas = hero.querySelector('canvas');
        if (canvas) {
          canvas.style.transform = `translateY(${scrollY * 0.3}px)`;
        }
      }

      // Generic parallax elements
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax) || 0.2;
        const rect  = el.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          el.style.transform = `translateY(${scrollY * speed}px)`;
        }
      });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
  };

  return { init };
})();


/* ============================================
   16. MOUSE GLOW EFFECT
   ============================================ */
const MouseGlow = (() => {
  let glowX = 0, glowY = 0;
  let targetX = 0, targetY = 0;
  let el = null;
  let rafId = null;

  const init = () => {
    el = document.createElement('div');
    el.className = 'mouse-glow';
    el.style.cssText = `
      position: fixed; top: 0; left: 0;
      width: 350px; height: 350px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0,240,255,0.06) 0%, transparent 70%);
      pointer-events: none;
      z-index: 0;
      transform: translate(-175px, -175px);
      will-change: transform;
    `;
    document.body.appendChild(el);

    document.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    }, { passive: true });

    const animate = () => {
      glowX = Utils.lerp(glowX, targetX, 0.08);
      glowY = Utils.lerp(glowY, targetY, 0.08);
      el.style.transform = `translate(${glowX - 175}px, ${glowY - 175}px)`;
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);
  };

  return { init };
})();


/* ============================================
   17. MAGNETIC BUTTONS
   ============================================ */
const MagneticButtons = (() => {
  const MAX_PULL = 10; // px

  const init = () => {
    document.querySelectorAll('.magnetic').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const cx   = rect.left + rect.width / 2;
        const cy   = rect.top  + rect.height / 2;
        const dx   = (e.clientX - cx) * 0.3;
        const dy   = (e.clientY - cy) * 0.3;

        const x = Utils.clamp(dx, -MAX_PULL, MAX_PULL);
        const y = Utils.clamp(dy, -MAX_PULL, MAX_PULL);

        btn.style.transform = `translate(${x}px, ${y}px)`;
      }, { passive: true });

      btn.addEventListener('mouseleave', () => {
        btn.style.transition = 'transform 0.4s cubic-bezier(.25,.46,.45,.94)';
        btn.style.transform  = 'translate(0, 0)';
        btn.addEventListener('transitionend', () => { btn.style.transition = ''; }, { once: true });
      });
    });
  };

  return { init };
})();


/* ============================================
   18. DARK MODE TOGGLE
   ============================================ */
const DarkModeToggle = (() => {
  const STORAGE_KEY = 'portfolio-theme';

  const init = () => {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    // Load preference
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light') {
      document.body.classList.add('light-mode');
      toggle.textContent = '☀️';
    }

    toggle.addEventListener('click', () => {
      const isLight = document.body.classList.toggle('light-mode');
      toggle.textContent = isLight ? '☀️' : '🌙';
      localStorage.setItem(STORAGE_KEY, isLight ? 'light' : 'dark');

      // Notify matrix rain
      MatrixRain.setEnabled(!isLight);
    });
  };

  return { init };
})();


/* ============================================
   19. BACKGROUND MUSIC TOGGLE
   ============================================ */
const BackgroundMusic = (() => {
  let audioCtx = null;
  let masterGain = null;
  let isPlaying = false;
  let oscillators = [];

  /**
   * Build a simple ambient synth drone with two detuned oscillators
   * and a low-pass filter for warmth.
   */
  const createDrone = () => {
    audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.06; // very subtle
    masterGain.connect(audioCtx.destination);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    filter.connect(masterGain);

    // Two oscillators slightly detuned
    [0, 5].forEach((detune) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 55; // A1
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start();
      oscillators.push(osc);
    });

    // Add a softer pad on the fifth
    const pad = audioCtx.createOscillator();
    pad.type = 'triangle';
    pad.frequency.value = 82.41; // E2
    const padGain = audioCtx.createGain();
    padGain.gain.value = 0.03;
    pad.connect(padGain);
    padGain.connect(masterGain);
    pad.start();
    oscillators.push(pad);
  };

  const init = () => {
    const btn = document.getElementById('music-toggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
      if (!audioCtx) createDrone();

      if (isPlaying) {
        audioCtx.suspend();
        btn.classList.remove('playing');
        btn.textContent = '🔇';
      } else {
        audioCtx.resume();
        btn.classList.add('playing');
        btn.textContent = '🔊';
      }
      isPlaying = !isPlaying;
    });
  };

  return { init };
})();


/* ============================================
   20. EASTER EGGS
   ============================================ */
const EasterEggs = (() => {
  /* ---- a) Konami Code ---- */
  const KONAMI = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'b', 'a',
  ];
  let konamiIdx  = 0;
  let devMode    = false;

  /* ---- b) Logo click counter ---- */
  let logoClicks = 0;

  const init = () => {
    /* — Konami Code Listener — */
    document.addEventListener('keydown', (e) => {
      if (e.key === KONAMI[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) {
          activateDevMode();
          konamiIdx = 0;
        }
      } else {
        konamiIdx = 0;
      }
    });

    /* — Logo click — */
    const logo = document.querySelector('.logo');
    if (logo) {
      logo.addEventListener('click', (e) => {
        logoClicks++;
        if (logoClicks === 5) {
          showDevStats();
          logoClicks = 0;
        }
      });
    }
  };

  /** Konami activation: flash + toast + spaceship cursor. */
  const activateDevMode = () => {
    if (devMode) return;
    devMode = true;

    // Screen flash
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed; inset: 0; background: rgba(0,240,255,0.3);
      z-index: 999999; pointer-events: none;
      animation: flashFade 0.6s ease forwards;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 700);

    // Inject flash keyframe
    if (!document.getElementById('flash-keyframe')) {
      const s = document.createElement('style');
      s.id = 'flash-keyframe';
      s.textContent = `@keyframes flashFade { to { opacity: 0; } }`;
      document.head.appendChild(s);
    }

    // Toast
    ContactForm.showToast('🚀 Developer Mode Activated!', 'success');

    // Spaceship cursor trail
    enableSpaceshipCursor();
  };

  /** Spaceship that follows the cursor with a star trail. */
  const enableSpaceshipCursor = () => {
    const ship = document.createElement('div');
    ship.textContent = '🚀';
    ship.style.cssText = `
      position: fixed; font-size: 24px; pointer-events: none;
      z-index: 100001; transition: transform 0.08s linear;
    `;
    document.body.appendChild(ship);

    let sx = 0, sy = 0;
    document.addEventListener('mousemove', (e) => {
      sx = Utils.lerp(sx, e.clientX, 0.2);
      sy = Utils.lerp(sy, e.clientY, 0.2);
      ship.style.transform = `translate(${sx + 20}px, ${sy - 20}px)`;

      // Star trail
      if (Math.random() > 0.6) {
        const star = document.createElement('div');
        star.textContent = '✦';
        star.style.cssText = `
          position: fixed; left: ${sx + 20}px; top: ${sy - 20}px;
          color: #ffdf00; font-size: ${Utils.rand(8, 14)}px;
          pointer-events: none; z-index: 100000;
          opacity: 1; transition: all 0.6s ease;
        `;
        document.body.appendChild(star);
        requestAnimationFrame(() => {
          star.style.opacity   = '0';
          star.style.transform = `translate(${Utils.rand(-30, 30)}px, ${Utils.rand(-30, 30)}px) scale(0)`;
        });
        setTimeout(() => star.remove(), 700);
      }
    }, { passive: true });
  };

  /** Hidden overlay with fun dev stats on 5× logo click. */
  const showDevStats = () => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(10,10,30,0.95);
      z-index: 999998; display: flex; align-items: center; justify-content: center;
      cursor: pointer;
    `;
    overlay.innerHTML = `
      <div style="color:#00f0ff; font-family:'JetBrains Mono',monospace; text-align:center; max-width:500px; padding:2rem;">
        <h2 style="font-size:1.8rem; margin-bottom:1rem;">🕹️ Dev Stats Unlocked</h2>
        <p>☕ Coffees Consumed: 1,247</p>
        <p>🐛 Bugs Squashed: 9,042</p>
        <p>⌨️ Lines of Code: 128,403</p>
        <p>🎮 Hours Procrastinated: ∞</p>
        <p>🔥 Current Streak: ${new Date().getDate()} days</p>
        <br><p style="opacity:0.5; font-size:0.8rem;">Click anywhere to close</p>
      </div>
    `;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  };

  return { init };
})();


/* ============================================
   21. FOOTER STARS
   ============================================ */
const FooterStars = (() => {
  const STAR_COUNT = 200;
  let canvas, ctx, stars;
  let rafId = null;
  let isVisible = false;

  class Star {
    constructor(w, h) {
      this.x = Utils.rand(0, w);
      this.y = Utils.rand(0, h);
      this.r = Utils.rand(0.3, 1.8);
      this.baseAlpha = Utils.rand(0.3, 1);
      this.alpha = this.baseAlpha;
      this.twinkleSpeed = Utils.rand(0.005, 0.03);
      this.twinklePhase = Utils.rand(0, Math.PI * 2);
    }
  }

  const init = () => {
    canvas = document.getElementById('stars-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    const footer = canvas.closest('footer') || canvas.parentElement;

    const resize = () => {
      canvas.width  = footer.offsetWidth;
      canvas.height = footer.offsetHeight;
      stars = Array.from({ length: STAR_COUNT }, () => new Star(canvas.width, canvas.height));
    };
    resize();
    window.addEventListener('resize', Utils.debounce(resize, 300));

    // Visibility gating
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        ([entry]) => { isVisible = entry.isIntersecting; },
        { threshold: 0 }
      ).observe(footer);
    } else {
      isVisible = true;
    }

    const draw = (time) => {
      if (isVisible) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach((s) => {
          s.alpha = s.baseAlpha + Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.3;
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${Utils.clamp(s.alpha, 0, 1)})`;
          ctx.fill();
        });
      }
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
  };

  return { init };
})();


/* ============================================
   22. PERFORMANCE OPTIMIZATION
   ============================================ */
const Performance = (() => {
  /**
   * Master visibility manager — pauses heavy canvas work
   * for sections that are completely off-screen.
   * Individual modules already use their own IntersectionObservers;
   * this is a safety net for any generic animated elements.
   */
  const init = () => {
    // Pause CSS animations on invisible elements
    if ('IntersectionObserver' in window) {
      const animatedEls = document.querySelectorAll('.animate-on-visible');
      const obs = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            entry.target.style.animationPlayState = entry.isIntersecting
              ? 'running'
              : 'paused';
          });
        },
        { threshold: 0 }
      );
      animatedEls.forEach((el) => obs.observe(el));
    }

    // Log performance metrics (development aid — silent in production)
    if (window.PerformanceObserver) {
      try {
        const lcp = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length) {
            console.log(`[Perf] LCP: ${Math.round(entries[entries.length - 1].startTime)}ms`);
          }
        });
        lcp.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (_) {
        // Not supported — ignore.
      }
    }
  };

  return { init };
})();


/* ============================================
   23. INITIALIZATION
   ============================================ */
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Run the boot / loading sequence first
  await LoadingScreen.init();

  // 2. Initialize all modules after loading completes
  CustomCursor.init();
  ParticleSystem.init();
  TypingEffect.init();
  Navbar.init();
  ScrollReveal.init();
  StatCounter.init();
  SolarSystem.init();
  ProjectCards3D.init();
  Terminal.init();
  CertificatesScroll.init();
  ContactForm.init();
  MatrixRain.init();
  ShootingStars.init();
  Parallax.init();
  MouseGlow.init();
  MagneticButtons.init();
  DarkModeToggle.init();
  BackgroundMusic.init();
  EasterEggs.init();
  FooterStars.init();
  Performance.init();

  console.log('%c🚀 Portfolio loaded', 'color:#00f0ff; font-size:14px; font-weight:bold;');
});

/* — Final optimisation pass after all assets are loaded — */
window.addEventListener('load', () => {
  // Force a reflow so browsers can optimise the composited layers
  document.body.offsetHeight; // eslint-disable-line no-unused-expressions
});
