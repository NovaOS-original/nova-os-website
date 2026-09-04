(() => {
  const root = document.documentElement;
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  const header = document.querySelector('.site-header');

  // Mobile navigation
  menu?.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('is-open', open);
  });
  document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    menu?.classList.remove('is-open');
    menu?.setAttribute('aria-expanded', 'false');
  }));

  // Header depth on scroll
  const updateHeader = () => header?.classList.toggle('scrolled', window.scrollY > 18);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  // Active section navigation
  const sections = [...document.querySelectorAll('main section[id]')];
  const links = [...document.querySelectorAll('.nav a[href^="#"]')];
  const sectionObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(link => link.classList.toggle('active', link.getAttribute('href') === `#${entry.target.id}`));
      }
    });
  }, { rootMargin: '-38% 0px -55% 0px', threshold: 0 });
  sections.forEach(section => sectionObserver.observe(section));

  // Scroll reveal with staggered timing
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const delay = entry.target.dataset.delay || 0;
      entry.target.style.setProperty('--reveal-delay', `${delay}ms`);
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });
  document.querySelectorAll('.reveal').forEach((el, index) => {
    if (!el.dataset.delay) el.dataset.delay = (index % 6) * 70;
    revealObserver.observe(el);
  });

  // Animated counters
  const counters = document.querySelectorAll('[data-count]');
  const countObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      const duration = 1200;
      const start = performance.now();
      const tick = now => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = `${Math.round(target * eased)}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      countObserver.unobserve(el);
    });
  }, { threshold: .7 });
  counters.forEach(counter => countObserver.observe(counter));

  // Pointer glow / subtle parallax
  const glow = document.querySelector('.pointer-glow');
  const laptop = document.querySelector('.laptop');
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  if (finePointer) {
    window.addEventListener('pointermove', e => {
      root.style.setProperty('--pointer-x', `${e.clientX}px`);
      root.style.setProperty('--pointer-y', `${e.clientY}px`);
      if (glow) glow.style.opacity = '1';
    }, { passive: true });

    document.querySelectorAll('.magnetic').forEach(button => {
      button.addEventListener('pointermove', e => {
        const r = button.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * .08;
        const y = (e.clientY - r.top - r.height / 2) * .08;
        button.style.transform = `translate(${x}px, ${y}px)`;
      });
      button.addEventListener('pointerleave', () => button.style.transform = '');
    });

    document.querySelectorAll('.card, .doc, .person').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top) / r.height - .5;
        card.style.setProperty('--rx', `${-y * 4}deg`);
        card.style.setProperty('--ry', `${x * 5}deg`);
        card.style.setProperty('--mx', `${(x + .5) * 100}%`);
        card.style.setProperty('--my', `${(y + .5) * 100}%`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });

    document.querySelector('.hero')?.addEventListener('pointermove', e => {
      if (!laptop) return;
      const r = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      laptop.style.transform = `perspective(1100px) rotateY(${x * 3}deg) rotateX(${-y * 2}deg) translateY(-4px)`;
    });
    document.querySelector('.hero')?.addEventListener('pointerleave', () => {
      if (laptop) laptop.style.transform = '';
    });
  }

  // Terminal typing cursor
  const terminalCursor = document.querySelector('.terminal-cursor');
  if (terminalCursor) setInterval(() => terminalCursor.classList.toggle('blink'), 520);

  // Background star field
  const canvas = document.querySelector('#starfield');
  if (canvas && finePointer) {
    const ctx = canvas.getContext('2d');
    const stars = [];
    let width = 0, height = 0, dpr = 1;
    const count = Math.min(120, Math.floor(window.innerWidth / 12));
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth; height = window.innerHeight;
      canvas.width = width * dpr; canvas.height = height * dpr;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    for (let i = 0; i < count; i++) stars.push({
      x: Math.random() * width, y: Math.random() * height,
      r: Math.random() * 1.3 + .25, a: Math.random() * .55 + .15,
      v: Math.random() * .12 + .02, phase: Math.random() * Math.PI * 2
    });
    const draw = time => {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        s.y += s.v; if (s.y > height + 2) s.y = -2;
        const alpha = s.a * (.65 + .35 * Math.sin(time * .001 + s.phase));
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(164, 143, 255, ${alpha})`; ctx.fill();
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(draw);
    window.addEventListener('resize', resize, { passive: true });
  }

  // Smooth scrolling for internal anchors
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
})();
