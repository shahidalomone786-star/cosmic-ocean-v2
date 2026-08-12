/**
 * ═══════════════════════════════════════════════════════════════
 * COSMIC RUN — 3D Parkour Game
 * A standalone, premium-quality browser parkour experience
 * ═══════════════════════════════════════════════════════════════
 */

// ─── Configuration ───
const CONFIG = {
  gravity: -35,
  moveSpeed: 12,
  sprintSpeed: 20,
  jumpForce: 14,
  airControl: 0.35,
  coyoteTime: 0.12,
  jumpBuffer: 0.1,
  wallSlideGravity: -8,
  wallJumpForce: 16,
  slideDuration: 0.8,
  slideSpeedBoost: 1.4,
  cameraDistance: 8,
  cameraHeight: 4,
  cameraLookAhead: 3,
  fovNormal: 70,
  fovSprint: 85,
  starCount: 1500,
  drawDistance: 120,
};

const COLORS = {
  background: 0x0a0e27,
  fog: 0x0a0e27,
  platform: 0xe8eaf6,
  platformEdge: 0x00e5ff,
  platformAccent: 0x7c4dff,
  obstacle: 0xff5252,
  obstacleWarning: 0xffab40,
  collectible: 0xffd740,
  checkpoint: 0x69f0ae,
  finish: 0x00e676,
  player: 0xffffff,
  playerGlow: 0x00e5ff,
};

// ─── Utilities ───
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const rand = (min, max) => Math.random() * (max - min) + min;
const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;

// Simple seeded random for deterministic elements
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// AABB collision
function aabbIntersect(a, b) {
  return (
    a.min.x <= b.max.x && a.max.x >= b.min.x &&
    a.min.y <= b.max.y && a.max.y >= b.min.y &&
    a.min.z <= b.max.z && a.max.z >= b.min.z
  );
}

// ─── Audio Manager ───
class AudioManager {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.sounds = {};
    this.masterGain = null;
    this.init();
  }

  init() {
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.4;
      this.masterGain.connect(this.ctx.destination);
      this.enabled = true;
      this._generateSounds();
    } catch (e) {
      console.warn('Audio not available:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  _generateSounds() {
    const createTone = (freq, duration, type = 'sine', vol = 0.3) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.masterGain);
      return { osc, gain };
    };

    this.sounds.jump = () => {
      const { osc, gain } = createTone(400, 0.15, 'sine', 0.25);
      osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
      osc.start(); osc.stop(this.ctx.currentTime + 0.15);
    };

    this.sounds.land = () => {
      const { osc, gain } = createTone(200, 0.1, 'triangle', 0.2);
      osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.1);
      osc.start(); osc.stop(this.ctx.currentTime + 0.1);
    };

    this.sounds.slide = () => {
      const { osc, gain } = createTone(150, 0.3, 'sawtooth', 0.08);
      osc.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.3);
      osc.start(); osc.stop(this.ctx.currentTime + 0.3);
    };

    this.sounds.checkpoint = () => {
      [523, 659, 784].forEach((f, i) => {
        const { osc } = createTone(f, 0.2, 'sine', 0.15);
        osc.start(this.ctx.currentTime + i * 0.08);
        osc.stop(this.ctx.currentTime + i * 0.08 + 0.2);
      });
    };

    this.sounds.collectible = () => {
      const { osc } = createTone(880, 0.15, 'sine', 0.2);
      osc.frequency.exponentialRampToValueAtTime(1320, this.ctx.currentTime + 0.1);
      osc.start(); osc.stop(this.ctx.currentTime + 0.15);
    };

    this.sounds.fail = () => {
      [400, 350, 300, 200].forEach((f, i) => {
        const { osc } = createTone(f, 0.3, 'sawtooth', 0.15);
        osc.start(this.ctx.currentTime + i * 0.1);
        osc.stop(this.ctx.currentTime + i * 0.1 + 0.3);
      });
    };

    this.sounds.complete = () => {
      [523, 659, 784, 1047].forEach((f, i) => {
        const { osc } = createTone(f, 0.3, 'sine', 0.2);
        osc.start(this.ctx.currentTime + i * 0.12);
        osc.stop(this.ctx.currentTime + i * 0.12 + 0.4);
      });
    };

    this.sounds.ui = () => {
      const { osc } = createTone(600, 0.08, 'sine', 0.1);
      osc.start(); osc.stop(this.ctx.currentTime + 0.08);
    };
  }

  play(name) {
    if (this.enabled && this.sounds[name]) {
      try { this.sounds[name](); } catch (e) {}
    }
  }
}

// ─── Input Manager ───
class InputManager {
  constructor() {
    this.keys = {};
    this.touch = { active: false, dx: 0, dy: 0, jump: false, sprint: false, slide: false };
    this.mouse = { x: 0, y: 0, locked: false };
    this._setupKeyboard();
    this._touchSetup = false;
  }

  setupTouch() {
    if (this._touchSetup) return;
    this._touchSetup = true;
    this._setupTouch();
  }

  _setupKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });
  }

  _setupTouch() {
    // Virtual joystick zone (left side)
    const joystickZone = document.getElementById('touch-joystick');
    const jumpBtn = document.getElementById('touch-jump');
    const sprintBtn = document.getElementById('touch-sprint');
    const slideBtn = document.getElementById('touch-slide');

    if (!joystickZone) return;

    let joystickOrigin = null;
    let joystickCurrent = null;
    const maxDist = 50;

    joystickZone.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      joystickOrigin = { x: t.clientX, y: t.clientY };
      joystickCurrent = { x: t.clientX, y: t.clientY };
      this.touch.active = true;
    }, { passive: false });

    joystickZone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (!joystickOrigin) return;
      const t = e.touches[0];
      joystickCurrent = { x: t.clientX, y: t.clientY };
      const dx = joystickCurrent.x - joystickOrigin.x;
      const dy = joystickCurrent.y - joystickOrigin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist > maxDist ? maxDist / dist : 1;
      this.touch.dx = (dx * scale) / maxDist;
      this.touch.dy = (dy * scale) / maxDist;
    }, { passive: false });

    const endJoystick = (e) => {
      e.preventDefault();
      joystickOrigin = null;
      joystickCurrent = null;
      this.touch.dx = 0;
      this.touch.dy = 0;
      this.touch.active = false;
    };
    joystickZone.addEventListener('touchend', endJoystick);
    joystickZone.addEventListener('touchcancel', endJoystick);

    // Action buttons
    const bindBtn = (btn, key) => {
      if (!btn) return;
      btn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.touch[key] = true;
        btn.classList.add('active');
      }, { passive: false });
      const endBtn = (e) => {
        e.preventDefault();
        this.touch[key] = false;
        btn.classList.remove('active');
      };
      btn.addEventListener('touchend', endBtn);
      btn.addEventListener('touchcancel', endBtn);
    };

    bindBtn(jumpBtn, 'jump');
    bindBtn(sprintBtn, 'sprint');
    bindBtn(slideBtn, 'slide');
  }

  get forward() {
    return this.keys['KeyW'] || this.keys['ArrowUp'] || (this.touch.active && this.touch.dy < -0.3);
  }
  get backward() {
    return this.keys['KeyS'] || this.keys['ArrowDown'] || (this.touch.active && this.touch.dy > 0.3);
  }
  get left() {
    return this.keys['KeyA'] || this.keys['ArrowLeft'] || (this.touch.active && this.touch.dx < -0.3);
  }
  get right() {
    return this.keys['KeyD'] || this.keys['ArrowRight'] || (this.touch.active && this.touch.dx > 0.3);
  }
  get jump() {
    return this.keys['Space'] || this.touch.jump;
  }
  get sprint() {
    return this.keys['ShiftLeft'] || this.keys['ShiftRight'] || this.touch.sprint;
  }
  get slide() {
    return this.keys['ControlLeft'] || this.keys['KeyC'] || this.touch.slide;
  }
  get pause() {
    return this.keys['Escape'];
  }
}


// ─── Player Controller ───
class Player {
  constructor(scene, audio) {
    this.scene = scene;
    this.audio = audio;
    this.mesh = null;
    this.glowMesh = null;
    this.position = new THREE.Vector3(0, 2, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.rotation = 0;
    this.height = 1.8;
    this.radius = 0.4;
    this.grounded = false;
    this.groundedTimer = 0;
    this.jumpBufferTimer = 0;
    this.wallSlide = false;
    this.wallNormal = new THREE.Vector3();
    this.sliding = false;
    this.slideTimer = 0;
    this.sprinting = false;
    this.onMovingPlatform = null;
    this.platformVelocity = new THREE.Vector3();
    this.checkpointPos = new THREE.Vector3(0, 2, 0);
    this.checkpointRot = 0;
    this.alive = true;
    this.spawnTimer = 0;
    this.trail = [];
    this.trailMesh = null;

    this._createMesh();
    this._createTrail();
  }

  _createMesh() {
    const group = new THREE.Group();

    // Body
    const bodyGeo = new THREE.CapsuleGeometry(0.3, 0.8, 4, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: COLORS.player,
      roughness: 0.3,
      metalness: 0.7,
      emissive: COLORS.playerGlow,
      emissiveIntensity: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.7;
    body.castShadow = true;
    group.add(body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const headMat = new THREE.MeshStandardMaterial({
      color: COLORS.player,
      roughness: 0.2,
      metalness: 0.8,
      emissive: COLORS.playerGlow,
      emissiveIntensity: 0.3,
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.35;
    head.castShadow = true;
    group.add(head);

    // Eye visor
    const visorGeo = new THREE.BoxGeometry(0.3, 0.08, 0.15);
    const visorMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.position.set(0, 1.35, 0.18);
    group.add(visor);

    // Glow ring
    const ringGeo = new THREE.TorusGeometry(0.5, 0.03, 8, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: COLORS.playerGlow, transparent: true, opacity: 0.6 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.2;
    group.add(ring);
    this.glowMesh = ring;

    this.mesh = group;
    this.scene.add(this.mesh);
  }

  _createTrail() {
    const maxPoints = 20;
    const positions = new Float32Array(maxPoints * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: COLORS.playerGlow,
      transparent: true,
      opacity: 0.4,
      linewidth: 2,
    });
    this.trailMesh = new THREE.Line(geometry, material);
    this.trailMesh.frustumCulled = false;
    this.scene.add(this.trailMesh);
  }

  updateTrail() {
    this.trail.unshift(this.position.clone());
    if (this.trail.length > 20) this.trail.pop();

    const positions = this.trailMesh.geometry.attributes.position.array;
    for (let i = 0; i < 20; i++) {
      if (i < this.trail.length) {
        positions[i * 3] = this.trail[i].x;
        positions[i * 3 + 1] = this.trail[i].y;
        positions[i * 3 + 2] = this.trail[i].z;
      } else {
        positions[i * 3] = this.trail[this.trail.length - 1]?.x || 0;
        positions[i * 3 + 1] = this.trail[this.trail.length - 1]?.y || 0;
        positions[i * 3 + 2] = this.trail[this.trail.length - 1]?.z || 0;
      }
    }
    this.trailMesh.geometry.attributes.position.needsUpdate = true;
  }

  reset(pos, rot = 0) {
    this.position.copy(pos);
    this.rotation = rot;
    this.velocity.set(0, 0, 0);
    this.grounded = false;
    this.wallSlide = false;
    this.sliding = false;
    this.alive = true;
    this.spawnTimer = 0.3;
    this.trail = [];
    this.onMovingPlatform = null;
    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;
    this.mesh.visible = true;
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.audio.play('fail');
    this.mesh.visible = false;
  }

  respawn() {
    this.reset(this.checkpointPos.clone(), this.checkpointRot);
    this.audio.play('checkpoint');
  }

  update(dt, input, level) {
    if (!this.alive) return;
    if (this.spawnTimer > 0) {
      this.spawnTimer -= dt;
      return;
    }

    this._updateMovement(dt, input, level);
    this._updateCollision(level);
    this._updateState(dt, input);
    this.updateTrail();

    this.mesh.position.copy(this.position);
    this.mesh.rotation.y = this.rotation;

    // Animate glow
    if (this.glowMesh) {
      this.glowMesh.rotation.z += dt * 2;
      const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.2;
      this.glowMesh.scale.setScalar(pulse);
    }
  }

  _updateMovement(dt, input, level) {
    const speed = input.sprint ? CONFIG.sprintSpeed : CONFIG.moveSpeed;
    this.sprinting = input.sprint && this.grounded;

    // Input direction relative to camera/rotation
    let moveX = 0;
    let moveZ = 0;
    if (input.forward) moveZ -= 1;
    if (input.backward) moveZ += 1;
    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;

    // Normalize
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (len > 0) {
      moveX /= len;
      moveZ /= len;
    }

    // Apply rotation to movement
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    const worldMoveX = moveX * cos - moveZ * sin;
    const worldMoveZ = moveX * sin + moveZ * cos;

    // Acceleration
    const accel = this.grounded ? 60 : 60 * CONFIG.airControl;
    const friction = this.grounded ? 40 : 2;

    this.velocity.x += worldMoveX * accel * dt;
    this.velocity.z += worldMoveZ * accel * dt;

    // Apply friction
    this.velocity.x -= this.velocity.x * friction * dt;
    this.velocity.z -= this.velocity.z * friction * dt;

        // Speed cap
    const hSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
    const maxSpeed = this.sliding ? speed * CONFIG.slideSpeedBoost : speed;
    if (hSpeed > maxSpeed) {
      const scale = maxSpeed / hSpeed;
      this.velocity.x *= scale;
      this.velocity.z *= scale;
    }

    // Gravity
    const grav = this.wallSlide ? CONFIG.wallSlideGravity : CONFIG.gravity;
    this.velocity.y += grav * dt;

    // Slide
    if (input.slide && this.grounded && !this.sliding && hSpeed > 2) {
      this.sliding = true;
      this.slideTimer = CONFIG.slideDuration;
      this.height = 0.9;
      this.audio.play('slide');
    }

    if (this.sliding) {
      this.slideTimer -= dt;
      if (this.slideTimer <= 0 || !this.grounded) {
        this.sliding = false;
        this.height = 1.8;
      }
    }

    // Jump buffer
    if (input.jump) {
      this.jumpBufferTimer = CONFIG.jumpBuffer;
    } else {
      this.jumpBufferTimer -= dt;
    }

    // Coyote time
    if (this.grounded) {
      this.groundedTimer = CONFIG.coyoteTime;
    } else {
      this.groundedTimer -= dt;
    }

    // Jump
    if (this.jumpBufferTimer > 0 && this.groundedTimer > 0) {
      this.velocity.y = CONFIG.jumpForce;
      this.grounded = false;
      this.groundedTimer = 0;
      this.jumpBufferTimer = 0;
      this.sliding = false;
      this.height = 1.8;
      this.audio.play('jump');
    }

    // Wall jump
    if (this.wallSlide && input.jump && this.jumpBufferTimer > 0) {
      this.velocity.y = CONFIG.wallJumpForce;
      this.velocity.x += this.wallNormal.x * 8;
      this.velocity.z += this.wallNormal.z * 8;
      this.wallSlide = false;
      this.jumpBufferTimer = 0;
      this.audio.play('jump');
    }

    // Apply platform velocity
    if (this.onMovingPlatform) {
      this.velocity.x += this.platformVelocity.x;
      this.velocity.z += this.platformVelocity.z;
    }

    // Apply velocity
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Update rotation to face movement
    if (hSpeed > 0.5 && (moveX !== 0 || moveZ !== 0)) {
      const targetRot = Math.atan2(worldMoveX, worldMoveZ) + Math.PI;
      let diff = targetRot - this.rotation;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.rotation += diff * Math.min(1, 10 * dt);
    }
  }

  _updateCollision(level) {
    const playerAABB = {
      min: new THREE.Vector3(
        this.position.x - this.radius,
        this.position.y,
        this.position.z - this.radius
      ),
      max: new THREE.Vector3(
        this.position.x + this.radius,
        this.position.y + this.height,
        this.position.z + this.radius
      ),
    };

    this.grounded = false;
    this.wallSlide = false;
    this.onMovingPlatform = null;

    // Check platforms
    for (const platform of level.platforms) {
      const pAABB = platform.aabb;
      if (!aabbIntersect(playerAABB, pAABB)) continue;

      // Determine collision side
      const overlapX = Math.min(playerAABB.max.x - pAABB.min.x, pAABB.max.x - playerAABB.min.x);
      const overlapY = Math.min(playerAABB.max.y - pAABB.min.y, pAABB.max.y - playerAABB.min.y);
      const overlapZ = Math.min(playerAABB.max.z - pAABB.min.z, pAABB.max.z - playerAABB.min.z);

      if (overlapY < overlapX && overlapY < overlapZ) {
        // Vertical collision
        if (this.velocity.y <= 0 && this.position.y >= pAABB.max.y - 0.5) {
          // Landing on top
          this.position.y = pAABB.max.y;
          this.velocity.y = 0;
          this.grounded = true;
          if (platform.velocity) {
            this.onMovingPlatform = platform;
            this.platformVelocity.copy(platform.velocity);
          }
          if (!this.wasGrounded) {
            this.audio.play('land');
          }
        } else if (this.velocity.y > 0) {
          // Hitting head
          this.position.y = pAABB.min.y - this.height;
          this.velocity.y = 0;
        }
      } else if (overlapX < overlapZ) {
        // Horizontal X
        if (this.position.x < pAABB.min.x) {
          this.position.x = pAABB.min.x - this.radius;
          this._handleWallCollision(new THREE.Vector3(-1, 0, 0));
        } else {
          this.position.x = pAABB.max.x + this.radius;
          this._handleWallCollision(new THREE.Vector3(1, 0, 0));
        }
        this.velocity.x = 0;
      } else {
        // Horizontal Z
        if (this.position.z < pAABB.min.z) {
          this.position.z = pAABB.min.z - this.radius;
          this._handleWallCollision(new THREE.Vector3(0, 0, -1));
        } else {
          this.position.z = pAABB.max.z + this.radius;
          this._handleWallCollision(new THREE.Vector3(0, 0, 1));
        }
        this.velocity.z = 0;
      }
    }

    this.wasGrounded = this.grounded;

    // Check obstacles
    for (const obstacle of level.obstacles) {
      if (obstacle.checkCollision(this.position, this.radius, this.height)) {
        this.die();
        return;
      }
    }

    // Check collectibles
    for (let i = level.collectibles.length - 1; i >= 0; i--) {
      const c = level.collectibles[i];
      const dx = this.position.x - c.position.x;
      const dy = this.position.y - c.position.y;
      const dz = this.position.z - c.position.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1.2) {
        this.audio.play('collectible');
        level.collectibles.splice(i, 1);
        c.mesh.visible = false;
        level.collectedCount = (level.collectedCount || 0) + 1;
      }
    }

    // Check checkpoints
    for (const cp of level.checkpoints) {
      const dx = this.position.x - cp.position.x;
      const dy = this.position.y - cp.position.y;
      const dz = this.position.z - cp.position.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1.5 && !cp.activated) {
        cp.activated = true;
        this.checkpointPos.copy(cp.position);
        this.checkpointRot = this.rotation;
        this.audio.play('checkpoint');
        if (cp.mesh) {
          cp.mesh.material.emissiveIntensity = 1;
          cp.mesh.material.color.setHex(0xffffff);
        }
      }
    }

    // Check finish
    if (level.finish) {
      const dx = this.position.x - level.finish.x;
      const dy = this.position.y - level.finish.y;
      const dz = this.position.z - level.finish.z;
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 2) {
        level.completed = true;
      }
    }

    // Fall death
    if (this.position.y < -15) {
      this.die();
    }
  }

  _handleWallCollision(normal) {
    if (!this.grounded && this.velocity.y < 0) {
      this.wallSlide = true;
      this.wallNormal.copy(normal);
    }
  }

  _updateState(dt, input) {
    // Update mesh scale for slide
    if (this.sliding) {
      this.mesh.scale.y = lerp(this.mesh.scale.y, 0.5, dt * 10);
    } else {
      this.mesh.scale.y = lerp(this.mesh.scale.y, 1, dt * 10);
    }
  }
}

// ─── Camera Controller ───
class CameraController {
  constructor(camera, player) {
    this.camera = camera;
    this.player = player;
    this.offset = new THREE.Vector3(0, CONFIG.cameraHeight, CONFIG.cameraDistance);
    this.targetPos = new THREE.Vector3();
    this.lookOffset = new THREE.Vector3();
    this.shakeIntensity = 0;
    this.baseFov = CONFIG.fovNormal;
  }

  update(dt, level) {
    const player = this.player;
    const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.z ** 2);
    const isSprinting = player.sprinting;

    // Dynamic FOV
    const targetFov = isSprinting ? CONFIG.fovSprint : CONFIG.fovNormal;
    this.camera.fov = lerp(this.camera.fov, targetFov, dt * 3);
    this.camera.updateProjectionMatrix();

    // Calculate ideal position behind player
    const rot = player.rotation;
    const dist = CONFIG.cameraDistance + speed * 0.1;
    const height = CONFIG.cameraHeight + (isSprinting ? 1 : 0);

    const idealX = player.position.x - Math.sin(rot) * dist;
    const idealZ = player.position.z - Math.cos(rot) * dist;
    const idealY = player.position.y + height;

    // Look ahead
    const lookAheadX = player.position.x + Math.sin(rot) * CONFIG.cameraLookAhead;
    const lookAheadZ = player.position.z + Math.cos(rot) * CONFIG.cameraLookAhead;

    this.targetPos.set(idealX, idealY, idealZ);
    this.lookOffset.set(lookAheadX, player.position.y + 1.5, lookAheadZ);

    // Smooth follow
    this.camera.position.lerp(this.targetPos, dt * 4);

    // Collision avoidance (simple ray cast simulation)
    const dir = new THREE.Vector3().subVectors(this.camera.position, player.position).normalize();
    const checkDist = this.camera.position.distanceTo(player.position);
    let minDist = checkDist;

    for (const platform of level.platforms) {
      const center = new THREE.Vector3(
        (platform.aabb.min.x + platform.aabb.max.x) / 2,
        (platform.aabb.min.y + platform.aabb.max.y) / 2,
        (platform.aabb.min.z + platform.aabb.max.z) / 2
      );
      const toCam = new THREE.Vector3().subVectors(this.camera.position, center);
      const d = toCam.length();
      if (d < 4 && d < minDist) {
        minDist = d;
        this.camera.position.lerp(player.position, 0.1);
      }
    }

    // Screen shake
    if (this.shakeIntensity > 0) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.z += (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= 0.9;
      if (this.shakeIntensity < 0.01) this.shakeIntensity = 0;
    }

    this.camera.lookAt(this.lookOffset);
  }

  addShake(intensity) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }
}


// ─── Level Definitions ───
const STAGES = [
  {
    id: 1,
    name: "First Steps",
    subtitle: "Learn the basics of cosmic movement",
    difficulty: "Tutorial",
    parTime: 25,
    startPos: { x: 0, y: 2, z: 0 },
    platforms: [
      { x: 0, y: 0, z: 0, w: 6, h: 1, d: 12 },
      { x: 0, y: 0, z: -16, w: 4, h: 1, d: 4 },
      { x: 0, y: 0, z: -24, w: 6, h: 1, d: 6 },
      { x: 0, y: 1, z: -34, w: 4, h: 1, d: 4 },
      { x: 0, y: 2, z: -42, w: 4, h: 1, d: 4 },
      { x: 0, y: 2, z: -52, w: 8, h: 1, d: 8 },
    ],
    obstacles: [],
    collectibles: [
      { x: 0, y: 3, z: -8 },
      { x: -2, y: 2, z: -20 },
      { x: 2, y: 3, z: -36 },
      { x: 0, y: 4, z: -48 },
    ],
    checkpoints: [
      { x: 0, y: 3, z: -12 },
      { x: 0, y: 3, z: -38 },
    ],
    finish: { x: 0, y: 3, z: -56 },
    signs: [
      { x: 0, y: 2.5, z: -4, text: "WASD to Move", rot: 0 },
      { x: 0, y: 2.5, z: -10, text: "SPACE to Jump", rot: 0 },
      { x: 0, y: 2.5, z: -30, text: "Hold SHIFT to Sprint", rot: 0 },
      { x: 0, y: 3.5, z: -50, text: "Reach the Portal!", rot: 0 },
    ],
  },
  {
    id: 2,
    name: "The Gap",
    subtitle: "Timing is everything in zero gravity",
    difficulty: "Easy",
    parTime: 35,
    startPos: { x: 0, y: 2, z: 0 },
    platforms: [
      { x: 0, y: 0, z: 0, w: 6, h: 1, d: 10 },
      { x: 0, y: -2, z: -14, w: 3, h: 1, d: 3 },
      { x: 0, y: -1, z: -22, w: 3, h: 1, d: 3 },
      { x: 0, y: 0, z: -30, w: 3, h: 1, d: 3 },
      { x: 0, y: 1, z: -38, w: 3, h: 1, d: 3 },
      { x: 0, y: 0, z: -48, w: 6, h: 1, d: 10 },
    ],
    obstacles: [],
    collectibles: [
      { x: 0, y: 1, z: -16 },
      { x: 0, y: 0, z: -24 },
      { x: 0, y: 2, z: -38 },
      { x: 2, y: 2, z: -44 },
    ],
    checkpoints: [
      { x: 0, y: 1, z: -10 },
      { x: 0, y: 1, z: -34 },
    ],
    finish: { x: 0, y: 1, z: -54 },
    signs: [
      { x: 0, y: 2.5, z: -4, text: "Mind the gaps!", rot: 0 },
      { x: 0, y: 2.5, z: -26, text: "Sprint for longer jumps", rot: 0 },
    ],
  },
  {
    id: 3,
    name: "Moving Platforms",
    subtitle: "The station is still under construction",
    difficulty: "Easy",
    parTime: 40,
    startPos: { x: 0, y: 2, z: 0 },
    platforms: [
      { x: 0, y: 0, z: 0, w: 6, h: 1, d: 8 },
      { x: 0, y: 0, z: -14, w: 3, h: 1, d: 3 },
      { x: 0, y: 0, z: -24, w: 3, h: 1, d: 3 },
      { x: 0, y: 0, z: -36, w: 3, h: 1, d: 3 },
      { x: 0, y: 0, z: -48, w: 3, h: 1, d: 3 },
      { x: 0, y: 0, z: -60, w: 8, h: 1, d: 8 },
    ],
    movingPlatforms: [
      { x: 0, y: 0, z: -14, w: 3, h: 1, d: 3, path: [{ x: -4, z: -14 }, { x: 4, z: -14 }], speed: 3 },
      { x: 0, y: 0, z: -24, w: 3, h: 1, d: 3, path: [{ x: 0, z: -20 }, { x: 0, z: -28 }], speed: 2 },
      { x: 0, y: 0, z: -36, w: 3, h: 1, d: 3, path: [{ x: -3, z: -36 }, { x: 3, z: -36 }], speed: 4 },
      { x: 0, y: 0, z: -48, w: 3, h: 1, d: 3, path: [{ x: 0, z: -44 }, { x: 0, z: -52 }], speed: 2.5 },
    ],
    obstacles: [],
    collectibles: [
      { x: 0, y: 2, z: -14 },
      { x: 0, y: 2, z: -36 },
      { x: -3, y: 2, z: -48 },
    ],
    checkpoints: [
      { x: 0, y: 1, z: -8 },
      { x: 0, y: 1, z: -30 },
    ],
    finish: { x: 0, y: 1, z: -56 },
    signs: [
      { x: 0, y: 2.5, z: -4, text: "Wait for the platform...", rot: 0 },
      { x: 0, y: 2.5, z: -20, text: "Or sprint across!", rot: 0 },
    ],
  },
  {
    id: 4,
    name: "Wall Jump Canyon",
    subtitle: "Use the walls to your advantage",
    difficulty: "Medium",
    parTime: 45,
    startPos: { x: 0, y: 2, z: 0 },
    platforms: [
      { x: 0, y: 0, z: 0, w: 6, h: 1, d: 8 },
      { x: 0, y: 0, z: -16, w: 4, h: 1, d: 4 },
      { x: 0, y: 4, z: -24, w: 4, h: 1, d: 4 },
      { x: 0, y: 8, z: -32, w: 4, h: 1, d: 4 },
      { x: 0, y: 8, z: -44, w: 6, h: 1, d: 8 },
    ],
    walls: [
      { x: -3, y: 0, z: -20, w: 1, h: 10, d: 8 },
      { x: 3, y: 4, z: -28, w: 1, h: 10, d: 8 },
    ],
    obstacles: [],
    collectibles: [
      { x: 0, y: 3, z: -16 },
      { x: -1, y: 6, z: -24 },
      { x: 1, y: 10, z: -32 },
      { x: 0, y: 10, z: -40 },
    ],
    checkpoints: [
      { x: 0, y: 1, z: -8 },
      { x: 0, y: 5, z: -24 },
    ],
    finish: { x: 0, y: 9, z: -40 },
    signs: [
      { x: 0, y: 2.5, z: -4, text: "Jump toward walls!", rot: 0 },
      { x: -2, y: 3.5, z: -18, text: "Wall slide + Jump!", rot: Math.PI / 2 },
      { x: 0, y: 6.5, z: -28, text: "Alternate sides", rot: 0 },
    ],
  },
  {
    id: 5,
    name: "The Gauntlet",
    subtitle: "Obstacles ahead. Stay focused.",
    difficulty: "Medium",
    parTime: 50,
    startPos: { x: 0, y: 2, z: 0 },
    platforms: [
      { x: 0, y: 0, z: 0, w: 6, h: 1, d: 10 },
      { x: 0, y: 0, z: -16, w: 4, h: 1, d: 8 },
      { x: 0, y: 0, z: -30, w: 4, h: 1, d: 6 },
      { x: 0, y: 0, z: -44, w: 4, h: 1, d: 6 },
      { x: 0, y: 0, z: -58, w: 6, h: 1, d: 10 },
    ],
    obstacles: [
      { type: 'spinner', x: 0, y: 1.5, z: -12, axis: 'y', speed: 2, size: 3 },
      { type: 'spinner', x: 0, y: 1.5, z: -22, axis: 'y', speed: -3, size: 2.5 },
      { type: 'pendulum', x: 0, y: 3, z: -36, length: 3, speed: 1.5 },
      { type: 'spinner', x: 0, y: 1.5, z: -50, axis: 'y', speed: 4, size: 2 },
    ],
    collectibles: [
      { x: 0, y: 3, z: -12 },
      { x: -2, y: 2, z: -26 },
      { x: 2, y: 2, z: -40 },
      { x: 0, y: 2, z: -54 },
    ],
    checkpoints: [
      { x: 0, y: 1, z: -8 },
      { x: 0, y: 1, z: -34 },
    ],
    finish: { x: 0, y: 1, z: -54 },
    signs: [
      { x: 0, y: 2.5, z: -4, text: "Dodge the spinners!", rot: 0 },
      { x: 0, y: 2.5, z: -28, text: "Slide under pendulums", rot: 0 },
      { x: 0, y: 2.5, z: -46, text: "Almost there!", rot: 0 },
    ],
  },
  {
    id: 6,
    name: "Speed Run",
    subtitle: "Velocity is your friend",
    difficulty: "Medium",
    parTime: 30,
    startPos: { x: 0, y: 2, z: 0 },
    platforms: [
      { x: 0, y: 0, z: 0, w: 6, h: 1, d: 20 },
      { x: 0, y: 0, z: -28, w: 4, h: 1, d: 4 },
      { x: 0, y: 0, z: -38, w: 4, h: 1, d: 4 },
      { x: 0, y: 0, z: -48, w: 4, h: 1, d: 4 },
      { x: 0, y: 0, z: -60, w: 8, h: 1, d: 12 },
    ],
    boostPads: [
      { x: 0, y: 0.1, z: -10, force: 25 },
      { x: 0, y: 0.1, z: -30, force: 20 },
      { x: 0, y: 0.1, z: -42, force: 20 },
    ],
    obstacles: [
      { type: 'spinner', x: 0, y: 1.5, z: -16, axis: 'y', speed: 3, size: 2 },
      { type: 'spinner', x: 0, y: 1.5, z: -34, axis: 'y', speed: -4, size: 2.5 },
      { type: 'spinner', x: 0, y: 1.5, z: -46, axis: 'y', speed: 5, size: 2 },
    ],
    collectibles: [
      { x: -2, y: 2, z: -14 },
      { x: 2, y: 2, z: -24 },
      { x: 0, y: 3, z: -36 },
      { x: 0, y: 2, z: -54 },
    ],
    checkpoints: [
      { x: 0, y: 1, z: -12 },
      { x: 0, y: 1, z: -40 },
    ],
    finish: { x: 0, y: 1, z: -56 },
    signs: [
      { x: 0, y: 2.5, z: -4, text: "HOLD SHIFT!", rot: 0 },
      { x: 0, y: 2.5, z: -20, text: "Don't stop!", rot: 0 },
      { x: 0, y: 2.5, z: -50, text: "Full speed ahead!", rot: 0 },
    ],
  },
  {
    id: 7,
    name: "The Climb",
    subtitle: "Ascend to the orbital ring",
    difficulty: "Hard",
    parTime: 55,
    startPos: { x: 0, y: 2, z: 0 },
    platforms: [
      { x: 0, y: 0, z: 0, w: 6, h: 1, d: 8 },
      { x: 0, y: 3, z: -10, w: 3, h: 1, d: 3 },
      { x: 0, y: 6, z: -18, w: 3, h: 1, d: 3 },
      { x: 0, y: 9, z: -26, w: 3, h: 1, d: 3 },
      { x: 0, y: 12, z: -34, w: 4, h: 1, d: 4 },
      { x: 0, y: 12, z: -46, w: 4, h: 1, d: 4 },
      { x: 0, y: 12, z: -58, w: 6, h: 1, d: 8 },
    ],
    movingPlatforms: [
      { x: 0, y: 3, z: -10, w: 3, h: 1, d: 3, path: [{ x: -3, z: -10 }, { x: 3, z: -10 }], speed: 2 },
      { x: 0, y: 9, z: -26, w: 3, h: 1, d: 3, path: [{ x: 0, z: -22 }, { x: 0, z: -30 }], speed: 2 },
    ],
    walls: [
      { x: -2.5, y: 3, z: -14, w: 1, h: 8, d: 4 },
      { x: 2.5, y: 6, z: -22, w: 1, h: 8, d: 4 },
    ],
    obstacles: [
      { type: 'spinner', x: 0, y: 13.5, z: -38, axis: 'y', speed: 2, size: 3 },
      { type: 'spinner', x: 0, y: 13.5, z: -50, axis: 'y', speed: -3, size: 2.5 },
    ],
    collectibles: [
      { x: 0, y: 5, z: -10 },
      { x: 0, y: 8, z: -18 },
      { x: 0, y: 11, z: -26 },
      { x: 0, y: 14, z: -42 },
      { x: 0, y: 14, z: -54 },
    ],
    checkpoints: [
      { x: 0, y: 4, z: -6 },
      { x: 0, y: 10, z: -22 },
      { x: 0, y: 13, z: -40 },
    ],
    finish: { x: 0, y: 13, z: -54 },
    signs: [
      { x: 0, y: 2.5, z: -4, text: "The only way is up", rot: 0 },
      { x: -1.5, y: 5.5, z: -14, text: "Wall jump here", rot: Math.PI / 2 },
      { x: 0, y: 14.5, z: -44, text: "Watch your head!", rot: 0 },
    ],
  },
  {
    id: 8,
    name: "Cosmic Finale",
    subtitle: "The ultimate test of skill",
    difficulty: "Expert",
    parTime: 70,
    startPos: { x: 0, y: 2, z: 0 },
    platforms: [
      { x: 0, y: 0, z: 0, w: 6, h: 1, d: 8 },
      { x: 0, y: 0, z: -14, w: 3, h: 1, d: 3 },
      { x: 0, y: 2, z: -24, w: 3, h: 1, d: 3 },
      { x: 0, y: 4, z: -34, w: 3, h: 1, d: 3 },
      { x: 0, y: 2, z: -44, w: 4, h: 1, d: 4 },
      { x: 0, y: 0, z: -54, w: 4, h: 1, d: 4 },
      { x: 0, y: 0, z: -66, w: 4, h: 1, d: 4 },
      { x: 0, y: 2, z: -76, w: 4, h: 1, d: 4 },
      { x: 0, y: 4, z: -86, w: 4, h: 1, d: 4 },
      { x: 0, y: 4, z: -98, w: 8, h: 1, d: 8 },
    ],
    movingPlatforms: [
      { x: 0, y: 0, z: -14, w: 3, h: 1, d: 3, path: [{ x: -3, z: -14 }, { x: 3, z: -14 }], speed: 3 },
      { x: 0, y: 0, z: -54, w: 4, h: 1, d: 4, path: [{ x: 0, z: -50 }, { x: 0, z: -58 }], speed: 2.5 },
      { x: 0, y: 2, z: -76, w: 4, h: 1, d: 4, path: [{ x: -3, z: -76 }, { x: 3, z: -76 }], speed: 4 },
    ],
    walls: [
      { x: -2.5, y: 2, z: -28, w: 1, h: 6, d: 4 },
      { x: 2.5, y: 2, z: -28, w: 1, h: 6, d: 4 },
      { x: -2.5, y: 0, z: -60, w: 1, h: 6, d: 4 },
      { x: 2.5, y: 0, z: -60, w: 1, h: 6, d: 4 },
    ],
    obstacles: [
      { type: 'spinner', x: 0, y: 1.5, z: -8, axis: 'y', speed: 2, size: 2.5 },
      { type: 'spinner', x: 0, y: 3.5, z: -18, axis: 'y', speed: -3, size: 2 },
      { type: 'pendulum', x: 0, y: 5, z: -38, length: 2.5, speed: 2 },
      { type: 'spinner', x: 0, y: 1.5, z: -48, axis: 'y', speed: 4, size: 2 },
      { type: 'spinner', x: 0, y: 1.5, z: -62, axis: 'y', speed: -3, size: 3 },
      { type: 'pendulum', x: 0, y: 5, z: -82, length: 3, speed: 1.5 },
      { type: 'spinner', x: 0, y: 5.5, z: -92, axis: 'y', speed: 5, size: 2 },
    ],
    boostPads: [
      { x: 0, y: 0.1, z: -10, force: 20 },
      { x: 0, y: 0.1, z: -50, force: 18 },
    ],
    collectibles: [
      { x: 0, y: 3, z: -8 },
      { x: 0, y: 5, z: -24 },
      { x: -2, y: 3, z: -44 },
      { x: 2, y: 3, z: -54 },
      { x: 0, y: 5, z: -66 },
      { x: 0, y: 6, z: -86 },
      { x: 0, y: 6, z: -94 },
    ],
    checkpoints: [
      { x: 0, y: 1, z: -6 },
      { x: 0, y: 3, z: -28 },
      { x: 0, y: 1, z: -56 },
      { x: 0, y: 5, z: -80 },
    ],
    finish: { x: 0, y: 5, z: -94 },
    signs: [
      { x: 0, y: 2.5, z: -4, text: "Final challenge", rot: 0 },
      { x: 0, y: 2.5, z: -30, text: "Everything you've learned", rot: 0 },
      { x: 0, y: 2.5, z: -70, text: "Don't look down", rot: 0 },
      { x: 0, y: 6.5, z: -90, text: "Victory is close!", rot: 0 },
    ],
  },
];


// ─── Level Builder ───
class Level {
  constructor(scene, data) {
    this.scene = scene;
    this.data = data;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.platforms = [];
    this.obstacles = [];
    this.collectibles = [];
    this.checkpoints = [];
    this.movingPlatforms = [];
    this.boostPads = [];
    this.signs = [];
    this.collectedCount = 0;
    this.completed = false;
    this.time = 0;
    this.startPos = new THREE.Vector3(data.startPos.x, data.startPos.y, data.startPos.z);
    this.finish = data.finish ? new THREE.Vector3(data.finish.x, data.finish.y, data.finish.z) : null;

    this._build();
  }

  _build() {
    // Shared geometries and materials for performance
    const platformGeo = new THREE.BoxGeometry(1, 1, 1);
    const platformMat = new THREE.MeshStandardMaterial({
      color: COLORS.platform,
      roughness: 0.4,
      metalness: 0.3,
    });
    const edgeMat = new THREE.MeshBasicMaterial({ color: COLORS.platformEdge, transparent: true, opacity: 0.8 });
    const obstacleMat = new THREE.MeshStandardMaterial({ color: COLORS.obstacle, emissive: COLORS.obstacleWarning, emissiveIntensity: 0.3 });
    const collectibleGeo = new THREE.OctahedronGeometry(0.3, 0);
    const collectibleMat = new THREE.MeshStandardMaterial({
      color: COLORS.collectible,
      emissive: COLORS.collectible,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2,
    });
    const checkpointGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 16);
    const checkpointMat = new THREE.MeshStandardMaterial({
      color: COLORS.checkpoint,
      emissive: COLORS.checkpoint,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.8,
    });
    const finishGeo = new THREE.TorusGeometry(1.5, 0.2, 8, 24);
    const finishMat = new THREE.MeshStandardMaterial({
      color: COLORS.finish,
      emissive: COLORS.finish,
      emissiveIntensity: 0.6,
    });

    // Static platforms
    if (this.data.platforms) {
      for (const p of this.data.platforms) {
        const mesh = new THREE.Mesh(platformGeo, platformMat);
        mesh.position.set(p.x, p.y, p.z);
        mesh.scale.set(p.w, p.h, p.d);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);

        
        // Edge glow
        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(p.w, p.h, p.d));
        const edgeLine = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: COLORS.platformEdge }));
        edgeLine.position.set(p.x, p.y, p.z);
        this.group.add(edgeLine);

        this.platforms.push({
          mesh,
          aabb: {
            min: new THREE.Vector3(p.x - p.w / 2, p.y - p.h / 2, p.z - p.d / 2),
            max: new THREE.Vector3(p.x + p.w / 2, p.y + p.h / 2, p.z + p.d / 2),
          },
        });
      }
    }

    // Moving platforms
    if (this.data.movingPlatforms) {
      for (const p of this.data.movingPlatforms) {
        const mesh = new THREE.Mesh(platformGeo, platformMat);
        mesh.position.set(p.x, p.y, p.z);
        mesh.scale.set(p.w, p.h, p.d);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);

        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(p.w, p.h, p.d));
        const edgeLine = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: COLORS.platformAccent }));
        edgeLine.position.set(p.x, p.y, p.z);
        this.group.add(edgeLine);

        const platform = {
          mesh,
          edgeLine,
          basePos: new THREE.Vector3(p.x, p.y, p.z),
          path: p.path.map(pt => new THREE.Vector3(pt.x, p.y, pt.z)),
          speed: p.speed,
          pathIndex: 0,
          pathProgress: 0,
          velocity: new THREE.Vector3(),
          aabb: {
            min: new THREE.Vector3(p.x - p.w / 2, p.y - p.h / 2, p.z - p.d / 2),
            max: new THREE.Vector3(p.x + p.w / 2, p.y + p.h / 2, p.z + p.d / 2),
          },
        };
        this.platforms.push(platform);
        this.movingPlatforms.push(platform);
      }
    }

    // Walls
    if (this.data.walls) {
      for (const w of this.data.walls) {
        const mesh = new THREE.Mesh(platformGeo, platformMat);
        mesh.position.set(w.x, w.y, w.z);
        mesh.scale.set(w.w, w.h, w.d);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);

        const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(w.w, w.h, w.d));
        const edgeLine = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: COLORS.platformAccent }));
        edgeLine.position.set(w.x, w.y, w.z);
        this.group.add(edgeLine);

        this.platforms.push({
          mesh,
          aabb: {
            min: new THREE.Vector3(w.x - w.w / 2, w.y - w.h / 2, w.z - w.d / 2),
            max: new THREE.Vector3(w.x + w.w / 2, w.y + w.h / 2, w.z + w.d / 2),
          },
        });
      }
    }

    // Obstacles
    if (this.data.obstacles) {
      for (const o of this.data.obstacles) {
        if (o.type === 'spinner') {
          const group = new THREE.Group();
          group.position.set(o.x, o.y, o.z);

          const barGeo = new THREE.BoxGeometry(o.size, 0.3, 0.3);
          const bar1 = new THREE.Mesh(barGeo, obstacleMat);
          bar1.castShadow = true;
          group.add(bar1);

          const bar2 = new THREE.Mesh(barGeo, obstacleMat);
          bar2.rotation.y = Math.PI / 2;
          bar2.castShadow = true;
          group.add(bar2);

          // Center glow
          const centerGeo = new THREE.SphereGeometry(0.2, 8, 8);
          const centerMesh = new THREE.Mesh(centerGeo, new THREE.MeshBasicMaterial({ color: COLORS.obstacleWarning }));
          group.add(centerMesh);

          this.group.add(group);

          this.obstacles.push({
            type: 'spinner',
            mesh: group,
            position: new THREE.Vector3(o.x, o.y, o.z),
            axis: o.axis,
            speed: o.speed,
            size: o.size,
            checkCollision(pos, radius, height) {
              const dx = pos.x - this.position.x;
              const dz = pos.z - this.position.z;
              const dist = Math.sqrt(dx * dx + dz * dz);
              return dist < this.size / 2 + radius && pos.y < this.position.y + 0.5 && pos.y + height > this.position.y - 0.5;
            },
          });
        } else if (o.type === 'pendulum') {
          const group = new THREE.Group();
          group.position.set(o.x, o.y, o.z);

          const ballGeo = new THREE.SphereGeometry(0.4, 8, 8);
          const ball = new THREE.Mesh(ballGeo, obstacleMat);
          ball.position.y = -o.length;
          ball.castShadow = true;
          group.add(ball);

          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, -o.length, 0),
          ]);
          const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: COLORS.obstacleWarning }));
          group.add(line);

          this.group.add(group);

          this.obstacles.push({
            type: 'pendulum',
            mesh: group,
            position: new THREE.Vector3(o.x, o.y, o.z),
            length: o.length,
            speed: o.speed,
            angle: 0,
            checkCollision(pos, radius, height) {
              const swingX = Math.sin(this.angle) * this.length;
              const ballX = this.position.x + swingX;
              const ballY = this.position.y - Math.abs(Math.cos(this.angle) * this.length);
              const ballZ = this.position.z;
              const dx = pos.x - ballX;
              const dy = pos.y - ballY;
              const dz = pos.z - ballZ;
              return Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.6 + radius;
            },
          });
        }
      }
    }

    
    // Boost pads
    if (this.data.boostPads) {
      for (const b of this.data.boostPads) {
        const padGeo = new THREE.CylinderGeometry(1, 1, 0.1, 16);
        const padMat = new THREE.MeshStandardMaterial({
          color: 0xff4081,
          emissive: 0xff4081,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.8,
        });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(b.x, b.y, b.z);
        this.group.add(pad);

        this.boostPads.push({
          mesh: pad,
          position: new THREE.Vector3(b.x, b.y, b.z),
          force: b.force,
        });
      }
    }

    // Collectibles
    if (this.data.collectibles) {
      for (const c of this.data.collectibles) {
        const mesh = new THREE.Mesh(collectibleGeo, collectibleMat);
        mesh.position.set(c.x, c.y, c.z);
        this.group.add(mesh);

        // Glow sprite
        const spriteMat = new THREE.SpriteMaterial({
          color: COLORS.collectible,
          transparent: true,
          opacity: 0.3,
        });
        const sprite = new THREE.Sprite(spriteMat);
        sprite.scale.set(1.5, 1.5, 1.5);
        mesh.add(sprite);

        this.collectibles.push({
          mesh,
          position: new THREE.Vector3(c.x, c.y, c.z),
        });
      }
    }

    // Checkpoints
    if (this.data.checkpoints) {
      for (const c of this.data.checkpoints) {
        const mesh = new THREE.Mesh(checkpointGeo, checkpointMat.clone());
        mesh.position.set(c.x, c.y, c.z);
        this.group.add(mesh);

        // Pillar of light
        const lightGeo = new THREE.CylinderGeometry(0.1, 0.3, 4, 8);
        const lightMat = new THREE.MeshBasicMaterial({
          color: COLORS.checkpoint,
          transparent: true,
          opacity: 0.15,
        });
        const lightPillar = new THREE.Mesh(lightGeo, lightMat);
        lightPillar.position.y = 2;
        mesh.add(lightPillar);

        this.checkpoints.push({
          mesh,
          position: new THREE.Vector3(c.x, c.y, c.z),
          activated: false,
        });
      }
    }

    // Finish
    if (this.finish) {
      const finishMesh = new THREE.Mesh(finishGeo, finishMat);
      finishMesh.position.copy(this.finish);
      finishMesh.rotation.x = Math.PI / 2;
      this.group.add(finishMesh);

      // Inner glow
      const innerGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const innerMat = new THREE.MeshBasicMaterial({
        color: COLORS.finish,
        transparent: true,
        opacity: 0.2,
      });
      const innerMesh = new THREE.Mesh(innerGeo, innerMat);
      innerMesh.position.copy(this.finish);
      this.group.add(innerMesh);

      this.finishMesh = finishMesh;
      this.finishInner = innerMesh;
    }

    // Signs
    if (this.data.signs) {
      for (const s of this.data.signs) {
        this._createSign(s);
      }
    }
  }

  _createSign(data) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(0, 20, 40, 0.85)';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 508, 124);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.text, 256, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide });
    const geometry = new THREE.PlaneGeometry(4, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(data.x, data.y, data.z);
    mesh.rotation.y = data.rot || 0;
    this.group.add(mesh);
    this.signs.push(mesh);
  }

  update(dt, player) {
    this.time += dt;

    // Update moving platforms
    for (const mp of this.movingPlatforms) {
      if (mp.path.length < 2) continue;
      const p1 = mp.path[mp.pathIndex];
      const p2 = mp.path[(mp.pathIndex + 1) % mp.path.length];
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const dist = dir.length();
      dir.normalize();

      mp.pathProgress += mp.speed * dt / dist;
      if (mp.pathProgress >= 1) {
        mp.pathProgress = 0;
        mp.pathIndex = (mp.pathIndex + 1) % mp.path.length;
      }

      const newPos = new THREE.Vector3().lerpVectors(p1, p2, mp.pathProgress);
      mp.velocity.copy(newPos).sub(mp.mesh.position).divideScalar(dt || 0.016);
      mp.mesh.position.copy(newPos);
      mp.edgeLine.position.copy(newPos);

      mp.aabb.min.set(newPos.x - mp.mesh.scale.x / 2, newPos.y - mp.mesh.scale.y / 2, newPos.z - mp.mesh.scale.z / 2);
      mp.aabb.max.set(newPos.x + mp.mesh.scale.x / 2, newPos.y + mp.mesh.scale.y / 2, newPos.z + mp.mesh.scale.z / 2);
    }

    // Update obstacles
    for (const obs of this.obstacles) {
      if (obs.type === 'spinner') {
        obs.mesh.rotation.y += obs.speed * dt;
      } else if (obs.type === 'pendulum') {
        obs.angle += obs.speed * dt;
        obs.mesh.rotation.z = Math.sin(obs.angle) * 0.6;
      }
    }

    // Update collectibles animation
    for (const c of this.collectibles) {
      if (c.mesh.visible) {
        c.mesh.rotation.y += dt * 2;
        c.mesh.position.y = c.position.y + Math.sin(this.time * 3 + c.position.x) * 0.2;
      }
    }

    // Update finish animation
    if (this.finishMesh) {
      this.finishMesh.rotation.z += dt;
      this.finishInner.scale.setScalar(1 + Math.sin(this.time * 4) * 0.1);
    }

    // Check boost pads
    for (const pad of this.boostPads) {
      const dx = player.position.x - pad.position.x;
      const dz = player.position.z - pad.position.z;
      if (Math.sqrt(dx * dx + dz * dz) < 1 && Math.abs(player.position.y - pad.position.y) < 1) {
        const forward = new THREE.Vector3(Math.sin(player.rotation), 0, Math.cos(player.rotation)).normalize();
        player.velocity.x += forward.x * pad.force;
        player.velocity.z += forward.z * pad.force;
        player.velocity.y = Math.max(player.velocity.y, pad.force * 0.3);
      }
      pad.mesh.scale.setScalar(1 + Math.sin(this.time * 8) * 0.1);
    }
  }

  dispose() {
    // Remove all level objects cleanly
    this.group.traverse(child => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach(m => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
    this.scene.remove(this.group);
  }
}




// ─── Particle System ───
class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
    this.maxParticles = 200;
    this.geometry = new THREE.BufferGeometry();
    this.positions = new Float32Array(this.maxParticles * 3);
    this.colors = new Float32Array(this.maxParticles * 3);
    this.sizes = new Float32Array(this.maxParticles);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Points(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  spawn(position, color, count = 5, speed = 3, life = 1) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      this.particles.push({
        position: position.clone(),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * speed,
          Math.random() * speed * 0.5,
          (Math.random() - 0.5) * speed
        ),
        color: new THREE.Color(color),
        life: life,
        maxLife: life,
        size: 0.1 + Math.random() * 0.2,
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 2 * dt; // gravity

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update buffer
    for (let i = 0; i < this.maxParticles; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        this.positions[i * 3] = p.position.x;
        this.positions[i * 3 + 1] = p.position.y;
        this.positions[i * 3 + 2] = p.position.z;
        this.colors[i * 3] = p.color.r;
        this.colors[i * 3 + 1] = p.color.g;
        this.colors[i * 3 + 2] = p.color.b;
        this.sizes[i] = p.size * (p.life / p.maxLife);
      } else {
        this.positions[i * 3] = 0;
        this.positions[i * 3 + 1] = -1000;
        this.positions[i * 3 + 2] = 0;
        this.sizes[i] = 0;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }
}

// ─── UI Manager ───
class UIManager {
  constructor(game) {
    this.game = game;
    this.screens = {};
    this._createScreens();
    this._createHUD();
    this._createTouchControls();
  }

  _createScreens() {
    const createScreen = (id) => {
      const el = document.createElement('div');
      el.id = id;
      el.className = 'screen';
      el.style.display = 'none';
      document.body.appendChild(el);
      this.screens[id] = el;
      return el;
    };

    // Start Screen
    const start = createScreen('screen-start');
    start.innerHTML = `
      <div class="screen-content">
        <h1 class="game-title">COSMIC RUN</h1>
        <p class="game-subtitle">3D Parkour Adventure</p>
        <div class="menu-buttons">
          <button id="btn-story" class="menu-btn primary">Story Mode</button>
          <button id="btn-time-trial" class="menu-btn">Time Trial</button>
          <button id="btn-settings" class="menu-btn">Settings</button>
        </div>
        <p class="version">v1.0 • Cosmic Ocean Ready</p>
      </div>
    `;

    // Stage Select
    const stageSelect = createScreen('screen-stages');
    stageSelect.innerHTML = `
      <div class="screen-content">
        <h2>Select Stage</h2>
        <div id="stage-grid" class="stage-grid"></div>
        <button id="btn-back-start" class="menu-btn">Back</button>
      </div>
    `;

    // Pause Menu
    const pause = createScreen('screen-pause');
    pause.innerHTML = `
      <div class="screen-content">
        <h2>Paused</h2>
        <div class="menu-buttons">
          <button id="btn-resume" class="menu-btn primary">Resume</button>
          <button id="btn-restart" class="menu-btn">Restart</button>
          <button id="btn-quit" class="menu-btn">Quit to Menu</button>
        </div>
      </div>
    `;

    // Stage Complete
    const complete = createScreen('screen-complete');
    complete.innerHTML = `
      <div class="screen-content">
        <h2 class="complete-title">Stage Complete!</h2>
        <div class="stats">
          <div class="stat"><span>Time:</span><span id="complete-time">00:00</span></div>
          <div class="stat"><span>Par:</span><span id="complete-par">00:00</span></div>
          <div class="stat"><span>Stars:</span><span id="complete-stars">0/0</span></div>
          <div class="stat"><span>Score:</span><span id="complete-score">0</span></div>
        </div>
        <div class="menu-buttons">
          <button id="btn-next-stage" class="menu-btn primary">Next Stage</button>
          <button id="btn-retry" class="menu-btn">Retry</button>
          <button id="btn-menu" class="menu-btn">Stage Select</button>
        </div>
      </div>
    `;

        // Game Over
    const gameOver = createScreen('screen-gameover');
    gameOver.innerHTML = `
      <div class="screen-content">
        <h2>Fallen Into the Void</h2>
        <p class="funny-text" id="funny-text">Gravity: 1, You: 0</p>
        <div class="menu-buttons">
          <button id="btn-try-again" class="menu-btn primary">Try Again</button>
          <button id="btn-give-up" class="menu-btn">Give Up (Weak)</button>
        </div>
      </div>
    `;

    // Settings
    const settings = createScreen('screen-settings');
    settings.innerHTML = `
      <div class="screen-content">
        <h2>Settings</h2>
        <div class="setting-row">
          <label>Audio</label>
          <input type="checkbox" id="setting-audio" checked>
        </div>
        <div class="setting-row">
          <label>Particles</label>
          <input type="checkbox" id="setting-particles" checked>
        </div>
        <div class="setting-row">
          <label>Show Timer</label>
          <input type="checkbox" id="setting-timer" checked>
        </div>
        <button id="btn-back-settings" class="menu-btn">Back</button>
      </div>
    `;

    // Bind events
    document.getElementById('btn-story').addEventListener('click', () => this.game.showStageSelect('story'));
    document.getElementById('btn-time-trial').addEventListener('click', () => this.game.showStageSelect('time-trial'));
    document.getElementById('btn-settings').addEventListener('click', () => this.showScreen('settings'));
    document.getElementById('btn-back-start').addEventListener('click', () => this.showScreen('start'));
    document.getElementById('btn-back-settings').addEventListener('click', () => this.showScreen('start'));
    document.getElementById('btn-resume').addEventListener('click', () => this.game.resume());
    document.getElementById('btn-restart').addEventListener('click', () => this.game.restartStage());
    document.getElementById('btn-quit').addEventListener('click', () => this.game.quitToMenu());
    document.getElementById('btn-next-stage').addEventListener('click', () => this.game.nextStage());
    document.getElementById('btn-retry').addEventListener('click', () => this.game.restartStage());
    document.getElementById('btn-menu').addEventListener('click', () => this.game.showStageSelect(this.game.mode));
    document.getElementById('btn-try-again').addEventListener('click', () => this.game.restartStage());
    document.getElementById('btn-give-up').addEventListener('click', () => this.game.showStageSelect(this.game.mode));
  }

  _createHUD() {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="hud-top">
        <div class="hud-timer">⏱ <span id="hud-time">00:00.00</span></div>
        <div class="hud-collectibles">★ <span id="hud-stars">0/0</span></div>
      </div>
      <div class="hud-bottom">
        <div class="hud-stage" id="hud-stage-name">Stage 1</div>
        <div class="hud-speed" id="hud-speed">0 m/s</div>
      </div>
    `;
    document.body.appendChild(hud);
  }

  _createTouchControls() {
    const touchControls = document.createElement('div');
    touchControls.id = 'touch-controls';
    touchControls.style.display = 'none';
    touchControls.innerHTML = `
      <div id="touch-joystick" class="touch-zone joystick-zone">
        <div class="joystick-knob"></div>
      </div>
      <div class="touch-buttons">
        <button id="touch-slide" class="touch-btn">SLIDE</button>
        <button id="touch-sprint" class="touch-btn">RUN</button>
        <button id="touch-jump" class="touch-btn jump-btn">JUMP</button>
      </div>
    `;
    document.body.appendChild(touchControls);
  }

  showScreen(name) {
    Object.values(this.screens).forEach(s => s.style.display = 'none');
    document.getElementById('hud').style.display = 'none';
    document.getElementById('touch-controls').style.display = 'none';
    if (name && this.screens[name]) {
      this.screens[name].style.display = 'flex';
    }
  }

  showHUD() {
    Object.values(this.screens).forEach(s => s.style.display = 'none');
    document.getElementById('hud').style.display = 'block';
    if ('ontouchstart' in window) {
      document.getElementById('touch-controls').style.display = 'flex';
    }
  }

  updateHUD(time, stars, totalStars, stageName, speed) {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    document.getElementById('hud-time').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    document.getElementById('hud-stars').textContent = `${stars}/${totalStars}`;
    document.getElementById('hud-stage-name').textContent = stageName;
    document.getElementById('hud-speed').textContent = `${speed.toFixed(1)} m/s`;
  }

  showStageComplete(time, parTime, stars, totalStars, score) {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    document.getElementById('complete-time').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;

    const pMins = Math.floor(parTime / 60);
    const pSecs = Math.floor(parTime % 60);
    document.getElementById('complete-par').textContent = `${pMins.toString().padStart(2, '0')}:${pSecs.toString().padStart(2, '0')}`;

    document.getElementById('complete-stars').textContent = `${stars}/${totalStars}`;
    document.getElementById('complete-score').textContent = score;
    this.showScreen('complete');
  }

  showGameOver() {
    const funnyTexts = [
      "Gravity: 1, You: 0",
      "The void says hello",
      "At least you tried... in space",
      "Your insurance doesn't cover this",
      "Next time, try staying on the platforms",
      "Cosmic belly flop!",
      "The stars are not for touching",
      "Did you mean to do that?",
    ];
    document.getElementById('funny-text').textContent = funnyTexts[Math.floor(Math.random() * funnyTexts.length)];
    this.showScreen('gameover');
  }

  buildStageGrid(stages, progress, onSelect) {
    const grid = document.getElementById('stage-grid');
    grid.innerHTML = '';
    stages.forEach((stage, i) => {
      const unlocked = i === 0 || (progress[stage.id - 1] && progress[stage.id - 1].completed);
      const bestTime = progress[stage.id]?.bestTime;
      const card = document.createElement('div');
      card.className = `stage-card ${unlocked ? '' : 'locked'}`;
      card.innerHTML = `
        <div class="stage-number">${stage.id}</div>
        <div class="stage-name">${stage.name}</div>
        <div class="stage-difficulty">${stage.difficulty}</div>
        ${bestTime ? `<div class="stage-best">Best: ${bestTime.toFixed(1)}s</div>` : ''}
      `;
      if (unlocked) {
        card.addEventListener('click', () => onSelect(stage.id));
      }
      grid.appendChild(card);
    });
  }
}

    // Game Over
    const gameOver = createScreen('screen-gameover');
    gameOver.innerHTML = `
      <div class="screen-content">
        <h2>Fallen Into the Void</h2>
        <p class="funny-text" id="funny-text">Gravity: 1, You: 0</p>
        <div class="menu-buttons">
          <button id="btn-try-again" class="menu-btn primary">Try Again</button>
          <button id="btn-give-up" class="menu-btn">Give Up (Weak)</button>
        </div>
      </div>
    `;

    // Settings
    const settings = createScreen('screen-settings');
    settings.innerHTML = `
      <div class="screen-content">
        <h2>Settings</h2>
        <div class="setting-row">
          <label>Audio</label>
          <input type="checkbox" id="setting-audio" checked>
        </div>
        <div class="setting-row">
          <label>Particles</label>
          <input type="checkbox" id="setting-particles" checked>
        </div>
        <div class="setting-row">
          <label>Show Timer</label>
          <input type="checkbox" id="setting-timer" checked>
        </div>
        <button id="btn-back-settings" class="menu-btn">Back</button>
      </div>
    `;

    // Bind events
    document.getElementById('btn-story').addEventListener('click', () => this.game.showStageSelect('story'));
    document.getElementById('btn-time-trial').addEventListener('click', () => this.game.showStageSelect('time-trial'));
    document.getElementById('btn-settings').addEventListener('click', () => this.showScreen('settings'));
    document.getElementById('btn-back-start').addEventListener('click', () => this.showScreen('start'));
    document.getElementById('btn-back-settings').addEventListener('click', () => this.showScreen('start'));
    document.getElementById('btn-resume').addEventListener('click', () => this.game.resume());
    document.getElementById('btn-restart').addEventListener('click', () => this.game.restartStage());
    document.getElementById('btn-quit').addEventListener('click', () => this.game.quitToMenu());
    document.getElementById('btn-next-stage').addEventListener('click', () => this.game.nextStage());
    document.getElementById('btn-retry').addEventListener('click', () => this.game.restartStage());
    document.getElementById('btn-menu').addEventListener('click', () => this.game.showStageSelect(this.game.mode));
    document.getElementById('btn-try-again').addEventListener('click', () => this.game.restartStage());
    document.getElementById('btn-give-up').addEventListener('click', () => this.game.showStageSelect(this.game.mode));
  }

  _createHUD() {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.style.display = 'none';
    hud.innerHTML = `
      <div class="hud-top">
        <div class="hud-timer">⏱ <span id="hud-time">00:00.00</span></div>
        <div class="hud-collectibles">★ <span id="hud-stars">0/0</span></div>
      </div>
      <div class="hud-bottom">
        <div class="hud-stage" id="hud-stage-name">Stage 1</div>
        <div class="hud-speed" id="hud-speed">0 m/s</div>
      </div>
    `;
    document.body.appendChild(hud);
  }

  _createTouchControls() {
    const touchControls = document.createElement('div');
    touchControls.id = 'touch-controls';
    touchControls.style.display = 'none';
    touchControls.innerHTML = `
      <div id="touch-joystick" class="touch-zone joystick-zone">
        <div class="joystick-knob"></div>
      </div>
      <div class="touch-buttons">
        <button id="touch-slide" class="touch-btn">SLIDE</button>
        <button id="touch-sprint" class="touch-btn">RUN</button>
        <button id="touch-jump" class="touch-btn jump-btn">JUMP</button>
      </div>
    `;
    document.body.appendChild(touchControls);
  }

  showScreen(name) {
    Object.values(this.screens).forEach(s => s.style.display = 'none');
    document.getElementById('hud').style.display = 'none';
    document.getElementById('touch-controls').style.display = 'none';
    if (name && this.screens[name]) {
      this.screens[name].style.display = 'flex';
    }
  }

  showHUD() {
    Object.values(this.screens).forEach(s => s.style.display = 'none');
    document.getElementById('hud').style.display = 'block';
    if ('ontouchstart' in window) {
      document.getElementById('touch-controls').style.display = 'flex';
    }
  }

  updateHUD(time, stars, totalStars, stageName, speed) {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    document.getElementById('hud-time').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    document.getElementById('hud-stars').textContent = `${stars}/${totalStars}`;
    document.getElementById('hud-stage-name').textContent = stageName;
    document.getElementById('hud-speed').textContent = `${speed.toFixed(1)} m/s`;
  }

  showStageComplete(time, parTime, stars, totalStars, score) {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    document.getElementById('complete-time').textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;

    const pMins = Math.floor(parTime / 60);
    const pSecs = Math.floor(parTime % 60);
    document.getElementById('complete-par').textContent = `${pMins.toString().padStart(2, '0')}:${pSecs.toString().padStart(2, '0')}`;

    document.getElementById('complete-stars').textContent = `${stars}/${totalStars}`;
    document.getElementById('complete-score').textContent = score;
    this.showScreen('complete');
  }

  showGameOver() {
    const funnyTexts = [
      "Gravity: 1, You: 0",
      "The void says hello",
      "At least you tried... in space",
      "Your insurance doesn't cover this",
      "Next time, try staying on the platforms",
      "Cosmic belly flop!",
      "The stars are not for touching",
      "Did you mean to do that?",
    ];
    document.getElementById('funny-text').textContent = funnyTexts[Math.floor(Math.random() * funnyTexts.length)];
    this.showScreen('gameover');
  }

  buildStageGrid(stages, progress, onSelect) {
    const grid = document.getElementById('stage-grid');
    grid.innerHTML = '';
    stages.forEach((stage, i) => {
      const unlocked = i === 0 || (progress[stage.id - 1] && progress[stage.id - 1].completed);
      const bestTime = progress[stage.id]?.bestTime;
      const card = document.createElement('div');
      card.className = `stage-card ${unlocked ? '' : 'locked'}`;
      card.innerHTML = `
        <div class="stage-number">${stage.id}</div>
        <div class="stage-name">${stage.name}</div>
        <div class="stage-difficulty">${stage.difficulty}</div>
        ${bestTime ? `<div class="stage-best">Best: ${bestTime.toFixed(1)}s</div>` : ''}
      `;
      if (unlocked) {
        card.addEventListener('click', () => onSelect(stage.id));
      }
      grid.appendChild(card);
    });
  }
}


// ─── Main Game Class ───
class CosmicRunGame {
  constructor(container, options = {}) {
    if (typeof THREE === 'undefined') {
      throw new Error('Three.js is required but not loaded');
    }
    this.container = container;
    this.options = options;
    this.state = 'menu'; // menu, playing, paused, complete, gameover
    this.mode = 'story'; // story, time-trial
    this.currentStageId = 1;
    this.stage = null;
    this.player = null;
    this.camera = null;
    this.cameraController = null;
    this.input = null;
    this.audio = null;
    this.ui = null;
    this.particles = null;
    this.renderer = null;
    this.scene = null;
    this.clock = new THREE.Clock();
    this.animFrame = null;
    this.progress = this._loadProgress();
    this.settings = this._loadSettings();

    this._initRenderer();
    this._initScene();
    this._initSystems();
    this._addStyles();
    this._createStarfield();

    this.ui.showScreen('start');
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.container.appendChild(this.renderer.domElement);

    window.addEventListener('resize', () => this._onResize());
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.background);
    this.scene.fog = new THREE.Fog(COLORS.fog, 30, CONFIG.drawDistance);

    this.camera = new THREE.PerspectiveCamera(CONFIG.fovNormal, window.innerWidth / window.innerHeight, 0.1, CONFIG.drawDistance);

    // Lighting
    const ambient = new THREE.AmbientLight(0x404080, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 50, 20);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 30;
    dirLight.shadow.camera.bottom = -30;
    dirLight.shadow.bias = -0.001;
    this.scene.add(dirLight);

    // Rim light
    const rimLight = new THREE.DirectionalLight(0x7c4dff, 0.5);
    rimLight.position.set(-20, 10, -20);
    this.scene.add(rimLight);
  }

  _initSystems() {
    this.audio = new AudioManager();
    this.input = new InputManager();
    this.ui = new UIManager(this);
    this.input.setupTouch(); // Setup touch after UI elements exist
    this.particles = new ParticleSystem(this.scene);
  }

  _createStarfield() {
    const starGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(CONFIG.starCount * 3);
    const colors = new Float32Array(CONFIG.starCount * 3);
    const rng = mulberry32(42);

    for (let i = 0; i < CONFIG.starCount; i++) {
      positions[i * 3] = (rng() - 0.5) * 400;
      positions[i * 3 + 1] = (rng() - 0.5) * 200 + 50;
      positions[i * 3 + 2] = (rng() - 0.5) * 400;

      const color = new THREE.Color();
      color.setHSL(rng() * 0.2 + 0.5, 0.5, 0.5 + rng() * 0.5);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const starMat = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    this.starfield = new THREE.Points(starGeo, starMat);
    this.scene.add(this.starfield);
  }

  _addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { overflow: hidden; background: #0a0e27; font-family: 'Segoe UI', system-ui, sans-serif; color: white; }
      canvas { display: block; }

      .screen {
        position: fixed; inset: 0;
        display: flex; align-items: center; justify-content: center;
        background: rgba(10, 14, 39, 0.92);
        backdrop-filter: blur(10px);
        z-index: 100;
        flex-direction: column;
      }
      .screen-content {
        text-align: center;
        max-width: 600px;
        width: 90%;
        padding: 2rem;
      }
      .game-title {
        font-size: clamp(2.5rem, 8vw, 5rem);
        font-weight: 900;
        letter-spacing: 0.1em;
        background: linear-gradient(135deg, #00e5ff, #7c4dff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.5rem;
        text-shadow: 0 0 40px rgba(0, 229, 255, 0.3);
      }
      .game-subtitle {
        font-size: 1.2rem;
        color: #a0a8c0;
        margin-bottom: 2rem;
        letter-spacing: 0.15em;
        text-transform: uppercase;
      }
      .version {
        margin-top: 2rem;
        font-size: 0.8rem;
        color: #606880;
      }
      .menu-buttons {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        align-items: center;
      }
      .menu-btn {
        padding: 0.9rem 2.5rem;
        font-size: 1rem;
        font-weight: 600;
        border: 2px solid rgba(0, 229, 255, 0.3);
        background: rgba(0, 229, 255, 0.05);
        color: #e0e8ff;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        min-width: 220px;
        letter-spacing: 0.05em;
      }
      .menu-btn:hover {
        background: rgba(0, 229, 255, 0.15);
        border-color: rgba(0, 229, 255, 0.6);
        transform: translateY(-2px);
      }
      .menu-btn.primary {
        background: linear-gradient(135deg, rgba(0, 229, 255, 0.2), rgba(124, 77, 255, 0.2));
        border-color: rgba(0, 229, 255, 0.5);
      }
      .menu-btn.primary:hover {
        background: linear-gradient(135deg, rgba(0, 229, 255, 0.3), rgba(124, 77, 255, 0.3));
      }

      .stage-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 1rem;
        margin: 1.5rem 0;
        max-height: 50vh;
        overflow-y: auto;
        padding: 0.5rem;
      }
      .stage-card {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(0, 229, 255, 0.2);
        border-radius: 12px;
        padding: 1rem;
        cursor: pointer;
        transition: all 0.2s;
      }
      .stage-card:hover {
        background: rgba(0, 229, 255, 0.1);
        border-color: rgba(0, 229, 255, 0.5);
        transform: scale(1.03);
      }
      .stage-card.locked {
        opacity: 0.4;
        cursor: not-allowed;
      }
      .stage-number {
        font-size: 2rem;
        font-weight: 900;
        color: #00e5ff;
      }
      .stage-name {
        font-size: 0.85rem;
        margin-top: 0.25rem;
        color: #e0e8ff;
      }
      .stage-difficulty {
        font-size: 0.7rem;
        color: #a0a8c0;
        margin-top: 0.25rem;
      }
      .stage-best {
        font-size: 0.75rem;
        color: #ffd740;
        margin-top: 0.25rem;
      }

      .stats {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 12px;
        padding: 1.5rem;
        margin: 1.5rem 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .stat {
        display: flex;
        justify-content: space-between;
        font-size: 1.1rem;
      }
      .stat span:first-child { color: #a0a8c0; }
      .stat span:last-child { color: #00e5ff; font-weight: 600; }
      .complete-title { color: #00e676; font-size: 2.5rem; }
      .funny-text { color: #ffab40; font-size: 1.1rem; margin: 1rem 0; font-style: italic; }

      .setting-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      .setting-row label { color: #e0e8ff; }
      .setting-row input[type="checkbox"] {
        width: 20px; height: 20px;
        accent-color: #00e5ff;
        cursor: pointer;
      }

      #hud {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 50;
        padding: 1rem;
      }
      .hud-top, .hud-bottom {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .hud-bottom {
        position: absolute;
        bottom: 1rem;
        left: 1rem;
        right: 1rem;
      }
      .hud-timer, .hud-collectibles, .hud-stage, .hud-speed {
        background: rgba(10, 14, 39, 0.7);
        padding: 0.5rem 1rem;
        border-radius: 8px;
        font-family: 'Courier New', monospace;
        font-size: 1rem;
        font-weight: 600;
        border: 1px solid rgba(0, 229, 255, 0.2);
      }
      .hud-timer { color: #00e5ff; }
      .hud-collectibles { color: #ffd740; }
      .hud-stage { color: #e0e8ff; font-size: 0.9rem; }
      .hud-speed { color: #69f0ae; font-size: 0.9rem; }

      #touch-controls {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 60;
      }
      .touch-zone {
        position: absolute;
        bottom: 2rem;
        left: 2rem;
        width: 140px;
        height: 140px;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.15);
        border-radius: 50%;
        pointer-events: auto;
        touch-action: none;
      }
      .joystick-knob {
        position: absolute;
        top: 50%; left: 50%;
        width: 50px; height: 50px;
        background: rgba(0, 229, 255, 0.3);
        border: 2px solid rgba(0, 229, 255, 0.6);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: transform 0.05s;
      }
      .touch-buttons {
        position: absolute;
        bottom: 2rem;
        right: 2rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        pointer-events: auto;
      }
      .touch-btn {
        width: 70px; height: 70px;
        border-radius: 50%;
        border: 2px solid rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.1);
        color: white;
        font-size: 0.7rem;
        font-weight: 700;
        cursor: pointer;
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
      }
      .touch-btn.active {
        background: rgba(0, 229, 255, 0.3);
        border-color: rgba(0, 229, 255, 0.8);
        transform: scale(0.95);
      }
      .touch-btn.jump-btn {
        width: 85px; height: 85px;
        background: rgba(0, 229, 255, 0.15);
        border-color: rgba(0, 229, 255, 0.5);
      }

      @media (max-width: 768px) {
        .touch-zone { width: 120px; height: 120px; bottom: 1rem; left: 1rem; }
        .touch-buttons { bottom: 1rem; right: 1rem; }
        .touch-btn { width: 60px; height: 60px; font-size: 0.6rem; }
        .touch-btn.jump-btn { width: 75px; height: 75px; }
        .hud-timer, .hud-collectibles { font-size: 0.85rem; }
      }
    `;
    document.head.appendChild(style);
  }

  _onResize() {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  _loadProgress() {
    try {
      const saved = localStorage.getItem('cosmicRun_progress');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  }

  _saveProgress() {
    try {
      localStorage.setItem('cosmicRun_progress', JSON.stringify(this.progress));
    } catch (e) {}
  }

  _loadSettings() {
    try {
      const saved = localStorage.getItem('cosmicRun_settings');
      return saved ? JSON.parse(saved) : { audio: true, particles: true, timer: true };
    } catch (e) {
      return { audio: true, particles: true, timer: true };
    }
  }

  showStageSelect(mode) {
    this.mode = mode;
    this.ui.showScreen('stages');
    this.ui.buildStageGrid(STAGES, this.progress, (id) => this.startStage(id));
  }

  startStage(stageId) {
    this.currentStageId = stageId;
    const stageData = STAGES.find(s => s.id === stageId);
    if (!stageData) return;

    // Clean up previous stage
    if (this.stage) {
      this.stage.dispose();
    }

    this.state = 'playing';
    this.ui.showHUD();
    this.audio.resume();

    // Build level
    this.stage = new Level(this.scene, stageData);

    // Create player
    if (this.player) {
      if (this.player.mesh && this.player.mesh.parent) this.player.mesh.parent.remove(this.player.mesh);
      if (this.player.trailMesh && this.player.trailMesh.parent) this.player.trailMesh.parent.remove(this.player.trailMesh);
    }
    this.player = new Player(this.scene, this.audio);
    this.player.reset(this.stage.startPos.clone());
    this.player.checkpointPos.copy(this.stage.startPos);

    // Camera
    this.cameraController = new CameraController(this.camera, this.player);

    // Reset time
    this.stageTime = 0;
    this.deathCount = 0;

    // Start loop
    this.clock.start();
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this._gameLoop();
  }

  _gameLoop() {
    this.animFrame = requestAnimationFrame(() => this._gameLoop());

    const dt = Math.min(this.clock.getDelta(), 0.05); // Cap delta time

    if (this.state === 'playing') {
      this._updatePlaying(dt);
    }

    // Always render
    this.renderer.render(this.scene, this.camera);
  }

  _updatePlaying(dt) {
    this.stageTime += dt;

    // Update systems
    this.player.update(dt, this.input, this.stage);
    this.stage.update(dt, this.player);
    this.cameraController.update(dt, this.stage);
    this.particles.update(dt);

    // Update starfield parallax
    if (this.starfield) {
      this.starfield.rotation.y += dt * 0.005;
    }

    // Check player death
    if (!this.player.alive && this.state !== 'gameover') {
      this.deathCount++;
      this.state = 'gameover';
      this.particles.spawn(this.player.position, COLORS.playerGlow, 20, 5, 1);
      setTimeout(() => {
        if (this.state === 'gameover') {
          this.ui.showGameOver();
        }
      }, 500);
    }

    // Respawn handling
    if (this.state === 'gameover' && this.input.jump) {
      this.player.respawn();
      this.state = 'playing';
      this.ui.showHUD();
    }

    // Check completion
    if (this.stage.completed && this.state !== 'complete') {
      this._completeStage();
    }

    // Pause
    if (this.input.pause) {
      this.pause();
      this.input.keys['Escape'] = false; // Clear to prevent instant unpause
    }

    // Speed particles
    const speed = Math.sqrt(this.player.velocity.x ** 2 + this.player.velocity.z ** 2);
    if (speed > 15 && this.settings.particles) {
      const behind = new THREE.Vector3(
        this.player.position.x - Math.sin(this.player.rotation) * 0.5,
        this.player.position.y + 0.5,
        this.player.position.z - Math.cos(this.player.rotation) * 0.5
      );
      this.particles.spawn(behind, COLORS.playerGlow, 1, 2, 0.3);
    }

    // Update HUD
    if (this.settings.timer) {
      this.ui.updateHUD(
        this.stageTime,
        this.stage.collectedCount,
        this.stage.data.collectibles?.length || 0,
        `${this.stage.data.id}. ${this.stage.data.name}`,
        speed
      );
    }
  }

  _completeStage() {
    this.state = 'complete';
    this.audio.play('complete');

    const stageData = this.stage.data;
    const totalStars = stageData.collectibles?.length || 0;
    const score = Math.max(0, Math.round(1000 - this.stageTime * 10 + this.stage.collectedCount * 100 - this.deathCount * 50));

    // Save progress
    if (!this.progress[stageData.id]) {
      this.progress[stageData.id] = {};
    }
    this.progress[stageData.id].completed = true;
    if (!this.progress[stageData.id].bestTime || this.stageTime < this.progress[stageData.id].bestTime) {
      this.progress[stageData.id].bestTime = this.stageTime;
    }
    if (!this.progress[stageData.id].bestScore || score > this.progress[stageData.id].bestScore) {
      this.progress[stageData.id].bestScore = score;
    }
    this._saveProgress();

    this.ui.showStageComplete(this.stageTime, stageData.parTime, this.stage.collectedCount, totalStars, score);
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.ui.showScreen('pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.ui.showHUD();
    this.clock.start();
  }

  restartStage() {
    this.startStage(this.currentStageId);
  }

  nextStage() {
    const nextId = this.currentStageId + 1;
    if (nextId <= STAGES.length) {
      this.startStage(nextId);
    } else {
      this.showStageSelect(this.mode);
    }
  }

  quitToMenu() {
    this.state = 'menu';
    if (this.stage) {
      this.stage.dispose();
      this.stage = null;
    }
    this.ui.showScreen('start');
  }

  destroy() {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.stage) this.stage.dispose();
    if (this.renderer) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
    // Clean up UI
    document.querySelectorAll('.screen, #hud, #touch-controls, style').forEach(el => el.remove());
  }
}

// ─── Public API ───
let gameInstance = null;

function startGame(container, options) {
  if (gameInstance) gameInstance.destroy();
  gameInstance = new CosmicRunGame(container || document.body, options);
  return gameInstance;
}

function pauseGame() {
  if (gameInstance) gameInstance.pause();
}

function resumeGame() {
  if (gameInstance) gameInstance.resume();
}

function restartGame() {
  if (gameInstance) gameInstance.restartStage();
}

function destroyGame() {
  if (gameInstance) {
    gameInstance.destroy();
    gameInstance = null;
  }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CosmicRunGame, startGame, pauseGame, resumeGame, restartGame, destroyGame };
}

// Auto-init if script is loaded directly
if (typeof window !== 'undefined') {
  window.CosmicRun = { startGame, pauseGame, resumeGame, restartGame, destroyGame, CosmicRunGame };
}
