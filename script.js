const canvas = document.getElementById('heartCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let formHeart = false;
let formX = canvas.width / 2;
let formY = canvas.height / 2;

const scale = 10;
const particleCount = 150;
let particles = [];
let shockwave = null;
let exploded = false;
let respawning = false;
let respawnTimer = 0;

function heartFunction(t, pulse = 1) {
  const x = 16 * Math.pow(Math.sin(t), 3);
  const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t)
          - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  return {
    x: formX + x * scale * pulse,
    y: formY - y * scale * pulse
  };
}

function getGradientRGB(t) {
  const r = Math.floor(200 + 55 * Math.abs(Math.sin(t)));
  const g = 0;
  const b = Math.floor(200 + 55 * Math.abs(Math.cos(t)));
  return { r, g, b };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function rgbToString(rgb, alpha = 1) {
  return `rgba(${Math.floor(rgb.r)}, ${Math.floor(rgb.g)}, ${Math.floor(rgb.b)}, ${alpha})`;
}

class Particle {
  constructor(i, x = null, y = null, fresh = false) {
    this.x = x !== null ? x : Math.random() * canvas.width;
    this.y = y !== null ? y : Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 1.5;
    this.vy = (Math.random() - 0.5) * 1.5;
    this.size = 2;
    this.scale = fresh ? 0.2 : 1;
    this.opacity = fresh ? 0 : 1;
    this.colorTime = Math.random() * 1000;
    this.index = i;
    this.inHeartMode = false;
    this.exploding = false;
    this.color = { r: 255, g: 255, b: 255 };
    this.fresh = fresh;
    this.spawnDelay = fresh ? Math.floor(Math.random() * 30 + 20) : 0; // 20–50 Frames (~0.3–0.8s)
  }

  update(time) {
    if (respawning && this.fresh) {
      if (this.spawnDelay > 0) {
        this.spawnDelay--;
        return;
      }
      this.opacity = lerp(this.opacity, 1, 0.05);
      this.scale = lerp(this.scale, 1, 0.05);
      this.vx += (Math.random() - 0.5) * 0.1;
      this.vy += (Math.random() - 0.5) * 0.1;
      this.vx *= 0.94;
      this.vy *= 0.94;
    }

    if (this.exploding) {
      this.x += this.vx;
      this.y += this.vy;
      this.scale += 0.05;
      return;
    }

    if (formHeart) {
      const t = (Math.PI * 2 / particleCount) * this.index;
      const pulse = 1 + Math.sin(time / 1000) * 0.05;
      const target = heartFunction(t, pulse);
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      this.vx = dx * 0.015;
      this.vy = dy * 0.015;
      this.inHeartMode = true;

      const targetColor = getGradientRGB(time / 1000 + this.colorTime);
      this.color.r = lerp(this.color.r, targetColor.r, 0.01);
      this.color.g = lerp(this.color.g, targetColor.g, 0.03);
      this.color.b = lerp(this.color.b, targetColor.b, 0.03);

    } else if (!this.fresh) {
      this.vx += (Math.random() - 0.5) * 0.1;
      this.vy += (Math.random() - 0.5) * 0.1;
      this.vx *= 0.94;
      this.vy *= 0.94;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
  }

  draw(time) {
    if (this.spawnDelay > 0 && this.fresh) return;
    ctx.beginPath();
    ctx.fillStyle = rgbToString(this.color, this.opacity);
    ctx.arc(this.x, this.y, this.size * this.scale, 0, Math.PI * 2);
    ctx.fill();
  }
}

class Shockwave {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 0;
    this.opacity = 0.4;
    this.alive = true;
  }

  update() {
    this.radius += 8;
    this.opacity -= 0.01;
    if (this.opacity <= 0) this.alive = false;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity})`;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function createParticles(fresh = false) {
  particles = [];
  for (let i = 0; i < particleCount; i++) {
    particles.push(new Particle(i, null, null, fresh));
  }
}

createParticles();

function animate(time) {
  ctx.fillStyle = exploded && !respawning ? 'rgba(0, 0, 0, 1)' : 'rgba(0, 0, 0, 0.07)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let p of particles) {
    p.update(time);
    p.draw(time);
  }

  if (shockwave) {
    shockwave.update();
    shockwave.draw();
    if (!shockwave.alive) shockwave = null;
  }

  if (exploded && !respawning) {
    respawnTimer++;
    if (respawnTimer > 40) {
      respawning = true;
      createParticles(true);
      respawnTimer = 0;
    }
  }

  requestAnimationFrame(animate);
}

function startHeart(x, y) {
  formX = x;
  formY = y;
  formHeart = true;
  exploded = false;
  respawning = false;
  respawnTimer = 0;
}

function stopHeart() {
  formHeart = false;
  exploded = true;
  shockwave = new Shockwave(formX, formY);

  for (let p of particles) {
    const dx = p.x - formX;
    const dy = p.y - formY;
    const angle = Math.atan2(dy, dx);
    const speed = 15 + Math.random() * 5;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed;
    p.exploding = true;
  }
}

window.addEventListener('mousedown', e => startHeart(e.clientX, e.clientY));
window.addEventListener('mouseup', stopHeart);

window.addEventListener('touchstart', e => {
  const touch = e.touches[0];
  if (touch) startHeart(touch.clientX, touch.clientY);
});
window.addEventListener('touchend', stopHeart);

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

requestAnimationFrame(animate);

// script.js (zusätzlicher Code zum bestehenden)

let lastColor = { r: 255, g: 255, b: 255 };

function updateTextShadowColor() {
  const h1 = document.querySelector(".text-overlay h1");
  if (!h1) return;

  let targetColor;
  if (formHeart) {
    targetColor = getGradientRGB(performance.now() / 1000);
  } else {
    targetColor = { r: 255, g: 255, b: 255 };
  }

  lastColor.r = lerp(lastColor.r, targetColor.r, 0.05);
  lastColor.g = lerp(lastColor.g, targetColor.g, 0.05);
  lastColor.b = lerp(lastColor.b, targetColor.b, 0.05);

  const shadow = `0 0 20px rgb(${Math.round(lastColor.r)}, ${Math.round(lastColor.g)}, ${Math.round(lastColor.b)})`;
  h1.style.textShadow = shadow;
}

function animate(time) {
  ctx.fillStyle = exploded && !respawning ? 'rgba(0, 0, 0, 1)' : 'rgba(0, 0, 0, 0.07)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let p of particles) {
    p.update(time);
    p.draw(time);
  }

  updateTextShadowColor();

  if (shockwave) {
    shockwave.update();
    shockwave.draw();
    if (!shockwave.alive) shockwave = null;
  }

  if (exploded && !respawning) {
    respawnTimer++;
    if (respawnTimer > 40) {
      respawning = true;
      createParticles(true);
      respawnTimer = 0;
    }
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);