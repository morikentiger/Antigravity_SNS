/**
 * STATUS System Library
 * A visual emotion/state visualization system
 *
 * Usage:
 *   const statusSystem = new StatusSystem(containerElement);
 *   statusSystem.update(inputData);
 *   statusSystem.destroy(); // cleanup
 */

class StatusCore {
    constructor() {
        this.state = {
            energy: 0.5,
            mood: 0.5,
            stress: 0.0,
            flow: 0.0,
            presence: 1.0
        };
    }

    update(inputs) {
        try {
            const safeInputs = {
                time_elapsed: 0,
                mood_self_report: 50,
                heart_rate_variation: 0.5,
                chat_sentiment_positive: 0.5,
                chat_sentiment_negative: 0.1,
                attack_count: 0,
                chat_chaos: 0.1,
                voice_tremor: 0,
                talk_rate: 0.5,
                chat_flow: 0.5,
                ...inputs
            };

            this.calculateMood(safeInputs);
            this.calculateStress(safeInputs);
            this.calculateEnergy(safeInputs);
            this.calculateFlow(safeInputs);
            this.calculatePresence(safeInputs);

            return this.state;
        } catch (e) {
            console.error("Core Update Error:", e);
            return this.state;
        }
    }

    calculateMood(inputs) {
        let mood = inputs.chat_sentiment_positive
            - (inputs.chat_sentiment_negative * 0.7)
            + (inputs.mood_self_report / 100 * 0.5);
        this.state.mood = this.clamp(mood, 0, 1);
    }

    calculateStress(inputs) {
        const normalizedAttack = Math.min(inputs.attack_count / 10, 1.0);
        let stress = (normalizedAttack * 0.4)
            + (inputs.chat_chaos * 0.4)
            + (inputs.voice_tremor * 0.2);
        this.state.stress = this.clamp(stress, 0, 1);
    }

    calculateEnergy(inputs) {
        const moodReport = Number(inputs.mood_self_report) || 0;
        const hrv = Number(inputs.heart_rate_variation) || 0;
        const stress = this.state.stress || 0;

        let energy = (moodReport / 100 * 0.6)
            + ((1 - stress) * 0.3)
            + (hrv * 0.1);
        this.state.energy = this.clamp(energy, 0, 1);
    }

    calculateFlow(inputs) {
        let flow = (inputs.talk_rate * 0.4)
            + (inputs.chat_flow * 0.4)
            + ((1 - inputs.heart_rate_variation) * 0.2);
        this.state.flow = this.clamp(flow, 0, 1);
    }

    calculatePresence(inputs) {
        let presence = 1.0 - this.state.stress + (this.state.flow * 0.5);
        this.state.presence = this.clamp(presence, 0, 1);
    }

    clamp(value, min, max) {
        if (isNaN(value)) return min;
        return Math.min(Math.max(value, min), max);
    }
}

class StatusRenderer {
    constructor(container) {
        this.container = container;
        this.setupDOM();
        this.setupCanvas();

        this.rainDrops = [];
        this.isRaining = false;
        this.rainIntensity = 0;

        this.isThundering = false;
        this.thunderTimer = 0;

        this.flowers = [];
        this.isFlowing = false;
        this.flowIntensity = 0;

        this.lastState = null;
        this.animationFrameId = null;

        this.animate();
    }

    setupDOM() {
        // Create container structure
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';

        // Create effect layers
        this.elements = {
            sky: this.createLayer('status-sky'), // New Sky Layer
            sunny: this.createLayer('status-sunny'),
            rainbow: this.createLayer('status-rainbow'),
            cloudCanvas: this.createCanvas('status-clouds'), // New Cloud Canvas
            flowerCanvas: this.createCanvas('status-flowers'),
            darkness: this.createLayer('status-darkness'),
            noise: this.createLayer('status-noise'),
            rainCanvas: this.createCanvas('status-rain')
        };

        // Apply styles
        this.applyStyles();
    }

    createLayer(id) {
        const layer = document.createElement('div');
        layer.id = id;
        layer.className = 'status-effect-layer';
        layer.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;
        this.container.appendChild(layer);
        return layer;
    }

    createCanvas(id) {
        const canvas = document.createElement('canvas');
        canvas.id = id;
        canvas.className = 'status-effect-layer';
        canvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
        `;
        this.container.appendChild(canvas);
        return canvas;
    }

    applyStyles() {
        // Sky Layer (Base Background)
        this.elements.sky.style.background = 'linear-gradient(to bottom, #4facfe 0%, #00f2fe 100%)';
        this.elements.sky.style.zIndex = '0';
        this.elements.sky.style.transition = 'filter 2s ease'; // Smooth transition for cloudy

        // Sunny effect (Sun Glow)
        this.elements.sunny.style.background = 'radial-gradient(circle at top right, rgba(255, 255, 200, 0.8), transparent 40%)';
        this.elements.sunny.style.mixBlendMode = 'screen';
        this.elements.sunny.style.opacity = '1'; // Default visible
        this.elements.sunny.style.transition = 'opacity 1s ease';
        this.elements.sunny.style.zIndex = '1';

        // Rainbow effect
        this.elements.rainbow.style.background = `radial-gradient(circle at 50% 100%,
            transparent 40%,
            rgba(255, 0, 0, 0.2) 42%,
            rgba(255, 165, 0, 0.2) 44%,
            rgba(255, 255, 0, 0.2) 46%,
            rgba(0, 128, 0, 0.2) 48%,
            rgba(0, 0, 255, 0.2) 50%,
            rgba(75, 0, 130, 0.2) 52%,
            rgba(238, 130, 238, 0.2) 54%,
            transparent 60%)`;
        this.elements.rainbow.style.opacity = '0';
        this.elements.rainbow.style.transition = 'opacity 2s ease';
        this.elements.rainbow.style.zIndex = '4';

        // Darkness effect (Overlay for night/deep depression)
        this.elements.darkness.style.backgroundColor = 'black';
        this.elements.darkness.style.opacity = '0';
        this.elements.darkness.style.zIndex = '3';

        // Noise effect
        this.elements.noise.style.backgroundImage = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;
        this.elements.noise.style.opacity = '0';
        this.elements.noise.style.zIndex = '6';

        // Canvas z-indexes
        this.elements.cloudCanvas.style.zIndex = '2'; // Clouds above sun/sky, below rain
        this.elements.flowerCanvas.style.zIndex = '12';
        this.elements.rainCanvas.style.zIndex = '10';
    }

    setupCanvas() {
        this.ctxRain = this.elements.rainCanvas.getContext('2d');
        this.ctxFlowers = this.elements.flowerCanvas.getContext('2d');
        this.ctxClouds = this.elements.cloudCanvas.getContext('2d');

        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const rect = this.container.getBoundingClientRect();
        this.elements.rainCanvas.width = rect.width;
        this.elements.rainCanvas.height = rect.height;
        this.elements.flowerCanvas.width = rect.width;
        this.elements.flowerCanvas.height = rect.height;
        this.elements.cloudCanvas.width = rect.width;
        this.elements.cloudCanvas.height = rect.height;
    }

    render(state) {
        this.lastState = state;

        // Calculate Cloudiness (0.0 - 1.0)
        // 0-0.2: Clear (Kaisei)
        // 0.2-0.8: Sunny (Hare)
        // 0.8-1.0: Cloudy (Kumori)
        // Formula: (1 - Mood) * 0.5 + Stress * 0.5
        // Mood=1, Stress=0 -> 0.0 (Clear)
        // Mood=0.5, Stress=0 -> 0.25 (Sunny)
        // Mood=0, Stress=1 -> 1.0 (Cloudy/Rain)
        const cloudiness = (1 - state.mood) * 0.5 + state.stress * 0.5;

        this.updateCloudState(cloudiness);
        this.applySky(cloudiness);
        this.applySunny(state.mood, state.stress, cloudiness);

        this.applyDarkness(state.mood, state.stress);
        this.applyNoise(state.stress);
        this.updateRainState(state.stress);
        this.updateThunderState(state.stress);
        this.applyRainbow(state.mood, state.stress);
        this.updateFlowState(state.flow);
    }

    applyDarkness(mood, stress) {
        let moodDarkness = 0;
        if (mood < 0.3) {
            moodDarkness = (0.3 - mood) / 0.3 * 0.8;
        }

        let stormDarkness = 0;
        if (stress > 0.5) {
            stormDarkness = (stress - 0.5) / 0.5 * 0.85;
        }

        const totalDarkness = Math.max(moodDarkness, stormDarkness);
        this.elements.darkness.style.opacity = totalDarkness;
    }

    applySunny(mood, stress, cloudiness) {
        // Sun is visible if cloudiness < 0.8 (Not Cloudy)
        // And Mood is decent
        let opacity = 0;
        if (cloudiness <= 0.8) {
            opacity = 1.0 - (cloudiness / 0.8); // Fade out as clouds increase
            // Boost if mood is high
            if (mood > 0.8) opacity = 1.0;
        }
        this.elements.sunny.style.opacity = Math.max(0, opacity);
    }

    applyRainbow(mood, stress) {
        let opacity = 0;
        if (mood > 0.8 && stress < 0.2) {
            opacity = (mood - 0.8) / 0.2;
        }
        this.elements.rainbow.style.opacity = Math.max(0, opacity);
    }

    applyNoise(stress) {
        let opacity = 0;
        if (stress > 0.7) {
            opacity = (stress - 0.7) / 0.3 * 0.5;
        }
        this.elements.noise.style.opacity = opacity;

        if (opacity > 0) {
            const shiftX = Math.random() * 100;
            const shiftY = Math.random() * 100;
            this.elements.noise.style.backgroundPosition = `${shiftX}px ${shiftY}px`;
        }
    }

    updateRainState(stress) {
        this.isRaining = stress > 0.5;
        if (this.isRaining) {
            this.rainIntensity = (stress - 0.5) / 0.5;
        } else {
            this.rainIntensity = 0;
        }
    }

    updateThunderState(stress) {
        this.isThundering = stress > 0.85;
    }

    updateFlowState(flow) {
        this.isFlowing = flow > 0.6;
        if (this.isFlowing) {
            this.flowIntensity = (flow - 0.6) / 0.4;
        } else {
            this.flowIntensity = 0;
        }
    }

    triggerThunder() {
        const flash = document.createElement('div');
        Object.assign(flash.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'white',
            opacity: '0.8',
            zIndex: '1000',
            pointerEvents: 'none',
            transition: 'opacity 0.2s ease-out'
        });
        this.container.appendChild(flash);

        this.container.style.transform = `translate(${Math.random() * 10 - 5}px, ${Math.random() * 10 - 5}px)`;

        setTimeout(() => {
            flash.style.opacity = '0';
            this.container.style.transform = 'translate(0, 0)';
            setTimeout(() => flash.remove(), 200);
        }, 50);
    }

    addRainDrop() {
        this.rainDrops.push({
            x: Math.random() * this.elements.rainCanvas.width,
            y: -10,
            speed: 10 + Math.random() * 10,
            length: 15 + Math.random() * 20
        });
    }

    addFlower() {
        this.flowers.push({
            type: 'particle',
            x: Math.random() * this.elements.flowerCanvas.width,
            y: this.elements.flowerCanvas.height + 10,
            speed: 1 + Math.random() * 2,
            size: 2 + Math.random() * 4,
            wobble: Math.random() * Math.PI * 2,
            color: `hsl(${Math.random() * 60 + 300}, 80%, 70%)`
        });
    }

    updateCloudState(cloudiness) {
        this.cloudiness = cloudiness;
        // Target clouds: 0 to 20
        // Clear (0-0.2): 0-2 clouds
        // Sunny (0.2-0.8): 2-10 clouds
        // Cloudy (0.8-1.0): 10-20 clouds
        this.targetCloudCount = Math.floor(cloudiness * 20);
        if (cloudiness < 0.1) this.targetCloudCount = 0;
    }

    applySky(cloudiness) {
        // Change sky appearance based on cloudiness
        if (cloudiness > 0.8) {
            // Cloudy: Greyish
            this.elements.sky.style.filter = 'grayscale(80%) brightness(90%)';
        } else {
            // Sunny/Clear: Blue
            this.elements.sky.style.filter = 'none';
        }
    }

    addCloud() {
        const w = this.elements.cloudCanvas.width;
        const h = this.elements.cloudCanvas.height;
        this.clouds = this.clouds || [];

        // Random cloud shape parameters
        const puffs = [];
        const puffCount = 3 + Math.floor(Math.random() * 5);
        for (let i = 0; i < puffCount; i++) {
            puffs.push({
                x: (Math.random() - 0.5) * 60,
                y: (Math.random() - 0.5) * 30,
                r: 20 + Math.random() * 30
            });
        }

        this.clouds.push({
            x: -150, // Start off-screen left
            y: Math.random() * (h * 0.6), // Top 60% of screen
            speed: 0.2 + Math.random() * 0.5,
            scale: 0.5 + Math.random() * 1.0,
            opacity: 0.6 + Math.random() * 0.3,
            puffs: puffs
        });
    }

    addBorderFlower() {
        const w = this.elements.flowerCanvas.width;
        const h = this.elements.flowerCanvas.height;
        const cx = w / 2;
        const cy = h / 2;

        const energy = this.lastState ? this.lastState.energy : 0.7;
        const encroachment = Math.min(1.0, (energy - 0.6) / 0.4);

        const minRx = w * 0.15;
        const maxRx = w * 0.45;
        const rx = maxRx - (maxRx - minRx) * encroachment;

        const minRy = h * 0.15;
        const maxRy = h * 0.45;
        const ry = maxRy - (maxRy - minRy) * encroachment;

        let x, y, valid = false;
        for (let i = 0; i < 10; i++) {
            x = Math.random() * w;
            y = Math.random() * h;

            const dx = x - cx;
            const dy = y - cy;
            const dist = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);

            if (dist > 1.0) {
                valid = true;
                break;
            }
        }

        if (!valid) return;

        const rotation = Math.random() * Math.PI * 2;
        const colors = ['#ffffff', '#fffacd', '#ffeb3b', '#fafad2', '#ffe4b5', '#f0f8ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        this.flowers.push({
            type: 'corner',
            x: x,
            y: y,
            rotation: rotation,
            scale: 0,
            maxScale: 0.2 + Math.random() * 0.3,
            color: color
        });
    }

    animate() {
        const ctxRain = this.ctxRain;
        const ctxFlowers = this.ctxFlowers;
        const ctxClouds = this.ctxClouds;
        const width = this.elements.rainCanvas.width;
        const height = this.elements.rainCanvas.height;

        ctxRain.clearRect(0, 0, width, height);
        ctxFlowers.clearRect(0, 0, width, height);
        ctxClouds.clearRect(0, 0, width, height);

        // --- Cloud Logic ---
        this.clouds = this.clouds || [];

        // Spawn clouds if below target
        if (this.clouds.length < this.targetCloudCount) {
            if (Math.random() < 0.01) { // Slow spawn rate
                this.addCloud();
            }
        } else if (this.clouds.length > this.targetCloudCount) {
            // Remove excess clouds slowly
            if (Math.random() < 0.01) {
                this.clouds.shift();
            }
        }

        // Draw Clouds
        if (this.clouds.length > 0) {
            for (let i = 0; i < this.clouds.length; i++) {
                const cloud = this.clouds[i];
                cloud.x += cloud.speed;

                // Wrap around or remove? Wrap around is better for consistent sky
                if (cloud.x > width + 150) {
                    cloud.x = -150;
                    cloud.y = Math.random() * (height * 0.6);
                }

                ctxClouds.save();
                ctxClouds.translate(cloud.x, cloud.y);
                ctxClouds.scale(cloud.scale, cloud.scale);
                ctxClouds.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;

                // Draw puffs
                for (let p of cloud.puffs) {
                    ctxClouds.beginPath();
                    ctxClouds.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                    ctxClouds.fill();
                }

                ctxClouds.restore();
            }
        }

        // Rain logic
        if (this.isRaining) {
            const dropsPerFrame = Math.floor(this.rainIntensity * 5) + 1;
            for (let k = 0; k < dropsPerFrame; k++) {
                if (Math.random() < 0.5) this.addRainDrop();
            }
        }

        if (this.rainDrops.length > 0) {
            ctxRain.strokeStyle = 'rgba(174, 194, 224, 0.6)';
            ctxRain.lineWidth = 1.5;
            ctxRain.beginPath();
            for (let i = 0; i < this.rainDrops.length; i++) {
                const drop = this.rainDrops[i];
                ctxRain.moveTo(drop.x, drop.y);
                ctxRain.lineTo(drop.x, drop.y + drop.length);
                drop.y += drop.speed;
                if (drop.y > height) {
                    this.rainDrops.splice(i, 1);
                    i--;
                }
            }
            ctxRain.stroke();
        }

        // Thunder logic
        if (this.isThundering) {
            this.thunderTimer++;
            if (this.thunderTimer > 60 + Math.random() * 120) {
                this.triggerThunder();
                this.thunderTimer = 0;
            }
        }

        // Flow particles
        if (this.isFlowing) {
            if (Math.random() < this.flowIntensity * 0.3) {
                this.addFlower();
            }
        }

        // Border flowers (High Energy)
        if (this.lastState && this.lastState.energy > 0.7) {
            const energyLevel = (this.lastState.energy - 0.7) / 0.3;
            const targetFlowerCount = Math.floor(energyLevel * 2400) + 800;
            const currentBorderFlowers = this.flowers.filter(f => f.type === 'corner').length;

            if (currentBorderFlowers < targetFlowerCount) {
                const deficit = targetFlowerCount - currentBorderFlowers;
                const spawnCount = Math.min(deficit, 50);

                for (let k = 0; k < spawnCount; k++) {
                    this.addBorderFlower();
                }
            }
        } else {
            const borderFlowers = this.flowers.filter(f => f.type === 'corner');
            if (borderFlowers.length > 0) {
                const removeCount = Math.min(5, borderFlowers.length);
                for (let k = 0; k < removeCount; k++) {
                    const idx = this.flowers.indexOf(borderFlowers[k]);
                    if (idx !== -1) this.flowers.splice(idx, 1);
                }
            }
        }

        // Draw flowers
        if (this.flowers.length > 0) {
            for (let i = 0; i < this.flowers.length; i++) {
                const f = this.flowers[i];

                if (f.type === 'corner') {
                    if (f.scale < f.maxScale) {
                        f.scale += 0.03;
                    }

                    ctxFlowers.save();
                    ctxFlowers.translate(f.x, f.y);
                    ctxFlowers.rotate(f.rotation);
                    ctxFlowers.scale(f.scale, f.scale);

                    ctxFlowers.fillStyle = f.color;
                    for (let p = 0; p < 5; p++) {
                        ctxFlowers.beginPath();
                        ctxFlowers.ellipse(0, -15, 8, 15, 0, 0, Math.PI * 2);
                        ctxFlowers.fill();
                        ctxFlowers.rotate((Math.PI * 2) / 5);
                    }
                    ctxFlowers.beginPath();
                    ctxFlowers.fillStyle = '#ffeb3b';
                    ctxFlowers.arc(0, 0, 5, 0, Math.PI * 2);
                    ctxFlowers.fill();

                    ctxFlowers.restore();
                } else {
                    f.y -= f.speed;
                    f.wobble += 0.05;
                    const x = f.x + Math.sin(f.wobble) * 20;

                    ctxFlowers.fillStyle = f.color;
                    ctxFlowers.beginPath();
                    ctxFlowers.arc(x, f.y, f.size, 0, Math.PI * 2);
                    ctxFlowers.fill();

                    ctxFlowers.shadowBlur = 10;
                    ctxFlowers.shadowColor = f.color;

                    if (f.y < -10) {
                        this.flowers.splice(i, 1);
                        i--;
                    }
                }
            }
            ctxFlowers.shadowBlur = 0;
        }

        // Noise animation
        if (this.elements.noise.style.opacity > 0) {
            const shiftX = Math.random() * 50;
            const shiftY = Math.random() * 50;
            this.elements.noise.style.backgroundPosition = `${shiftX}px ${shiftY}px`;
        }

        this.animationFrameId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }

        // Remove all created elements
        Object.values(this.elements).forEach(el => {
            if (el && el.parentNode) {
                el.parentNode.removeChild(el);
            }
        });

        window.removeEventListener('resize', () => this.resizeCanvas());
    }
}

// Main StatusSystem class
class StatusSystem {
    constructor(container) {
        this.core = new StatusCore();
        this.renderer = new StatusRenderer(container);
    }

    /**
     * Update the system with new input data
     * @param {Object} inputs - Input data object
     * @returns {Object} Current state
     */
    update(inputs) {
        const state = this.core.update(inputs);
        this.renderer.render(state);
        return state;
    }

    /**
     * Get current state without updating
     * @returns {Object} Current state
     */
    getState() {
        return this.core.state;
    }

    /**
     * Cleanup and destroy the system
     */
    destroy() {
        this.renderer.destroy();
    }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StatusSystem;
}
if (typeof window !== 'undefined') {
    window.StatusSystem = StatusSystem;
}
