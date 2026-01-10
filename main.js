// State management
const state = {
    image: null,              // Canvas element containing loaded image
    filter: 'none',           // Image filter (currently unused but kept)
    charms: [],               // Array of characters to display as charms
    engine: null,             // Matter.js engine
    world: null,              // Matter.js world
    canvas: null,             // Main canvas element
    ctx: null,                // Canvas 2D context
    charmBodies: [],          // Array of Matter.js physics bodies
    walls: [],                // Array of wall boundaries
    isShaking: false,         // Prevents multiple simultaneous shakes
    lastCharmHash: '',        // Tracks charm changes for physics updates
    customMessage: '',        // Text message displayed below card
    audioContext: null,       // Web Audio API context for sound effects
    emojiCache: new Map(),    // Cache for rendered text images
    emojiCanvas: null,        // Temporary canvas for text rendering
    emojiCtx: null,           // Context for temporary canvas
    charmColor: 'rainbow',    // Color scheme ('rainbow' or hex color)
    backgroundMusic: null,    // Audio element reference
    musicMuted: false,        // Music mute state
    introScreenVisible: true, // Intro screen visibility state
    cardLoaded: false,        // Whether card has finished loading
    cardSparkleInterval: null // Interval ID for card sparkles
};

// Initialize Matter.js and canvas
async function initializeApp() {
    // Get canvas element and context
    state.canvas = document.getElementById('canvas');
    state.ctx = state.canvas?.getContext('2d');
    
    // Create temporary canvas for text rendering (100x100)
    state.emojiCanvas = document.createElement('canvas');
    state.emojiCanvas.width = 100;
    state.emojiCanvas.height = 100;
    state.emojiCtx = state.emojiCanvas.getContext('2d');
    
    // Initialize Web Audio API context
    try {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.warn('Audio context not supported:', e);
    }
    
    // Initialize Matter.js engine with gravity 0.3 (oil-like slow movement)
    const Engine = Matter.Engine;
    const World = Matter.World;
    
    state.engine = Engine.create();
    state.world = state.engine.world;
    state.engine.world.gravity.y = 0.3;
    
    // Setup event listeners
    setupEventListeners();
    
    // Setup intro screen swipe detection
    setupIntroScreen();
    
    // Load Ana's card in background (no delay - start immediately)
    loadAnasCard();
    
    // Initialize shake detection
    setupDeviceShakeDetection();
    
    // Parallax effect
    setupParallax();
    
    // Start animation loop
    requestAnimationFrame(animate);
}

// Setup event listeners
function setupEventListeners() {
    // Shake button click and touch events
    const shakeBtn = document.getElementById('shake-btn');
    if (shakeBtn) {
        shakeBtn.addEventListener('click', triggerShake);
        shakeBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            triggerShake();
        }, { passive: false });
        shakeBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, { passive: false });
    }
    
    // Sound toggle button click event
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', toggleMusic);
    }
}

// Load Ana's card directly
function loadAnasCard() {
    // Start loading image immediately
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onerror = () => {
        console.error('Failed to load doodle.jpg');
        alert('Failed to load card image. Please check that assets/doodle.jpg exists.');
    };
    
        img.onload = () => {
        // Resize image to max 720px width (maintains aspect ratio)
            const maxWidth = 720;
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            
        // Create canvas with exact image dimensions
            const resizedCanvas = document.createElement('canvas');
            resizedCanvas.width = width;
            resizedCanvas.height = height;
            const resizedCtx = resizedCanvas.getContext('2d');
        
        // Draw image to canvas
            resizedCtx.drawImage(img, 0, 0, width, height);
            
        // Set state
            state.image = resizedCanvas;
        state.charms = 'HAPPY 24 BIRTHDAY'.split('');
        state.customMessage = 'Happy Birthday Ana!!! Looking forward to spending more time with you ;)';
        state.charmColor = '#5C4033'; // Dark brown
        state.musicMuted = false;
        
        // Display custom message
        const messageDisplay = document.getElementById('custom-message-display');
        if (messageDisplay) {
            messageDisplay.style.display = 'block';
            const messageP = messageDisplay.querySelector('p');
            if (messageP) {
                messageP.textContent = state.customMessage;
            }
        }
        
        // Mark card as loaded
        state.cardLoaded = true;
        
        // Initialize final view immediately (no delay)
        // Card will be ready when user swipes/taps to open
        initializeFinalView();
        
        // Only show card if intro screen was already dismissed by user
        // Otherwise, wait for user interaction
        if (!state.introScreenVisible) {
            showCard();
        }
    };
    
    img.src = 'assets/doodle.jpg';
}

// Initialize final view
function initializeFinalView() {
    // Validate image, canvas, and context exist
    if (!state.image || !state.canvas || !state.ctx) {
        console.warn('Cannot initialize final view: missing image, canvas, or context');
        return;
    }
    
    // Set canvas internal dimensions (canvas.width/height) to match image exactly (1:1 pixel mapping)
    // This ensures physics bodies match the actual canvas size
    state.canvas.width = state.image.width;
    state.canvas.height = state.image.height;
    
    // Set canvas CSS display size to maintain aspect ratio while respecting max constraints
    // Calculate display size based on constraints (75vw max width, 70vh max height)
    const maxDisplayWidth = window.innerWidth * 0.75;
    const maxDisplayHeight = window.innerHeight * 0.7;
    const imageAspect = state.image.width / state.image.height;
    
    let displayWidth = state.image.width;
    let displayHeight = state.image.height;
    
    // Scale down if needed to fit constraints
    if (displayWidth > maxDisplayWidth) {
        displayWidth = maxDisplayWidth;
        displayHeight = maxDisplayWidth / imageAspect;
    }
    if (displayHeight > maxDisplayHeight) {
        displayHeight = maxDisplayHeight;
        displayWidth = maxDisplayHeight * imageAspect;
    }
    
    // Set canvas CSS size to maintain aspect ratio
    // Internal dimensions (canvas.width/height) remain at image size for physics
    state.canvas.style.width = displayWidth + 'px';
    state.canvas.style.height = displayHeight + 'px';
    
    // Reset Matter.js gravity to default (y: 0.3, x: 0)
    if (state.engine) {
        state.engine.world.gravity.y = 0.3;
        state.engine.world.gravity.x = 0;
    }
    
    // Call updateCharmBodies() to create physics bodies (uses canvas.width/height)
    updateCharmBodies();
    
    // Call renderCanvas() for initial render
    renderCanvas();
    
    // Display custom message if provided
    const messageDisplay = document.getElementById('custom-message-display');
    if (messageDisplay) {
        if (state.customMessage && state.customMessage.trim()) {
            messageDisplay.style.display = 'block';
            const messageP = messageDisplay.querySelector('p');
            if (messageP) {
                messageP.textContent = state.customMessage;
            }
        } else {
            messageDisplay.style.display = 'none';
        }
    }
    
    // Call initializeBackgroundMusic()
    initializeBackgroundMusic();
}

// Initialize background music
function initializeBackgroundMusic() {
    // Get #background-music audio element
    const audioElement = document.getElementById('background-music');
    if (!audioElement) return;
    
    state.backgroundMusic = audioElement;
    
    // Set volume to 0.5
    audioElement.volume = 0.5;
    
    // Play if not muted (handles autoplay prevention)
    if (!state.musicMuted) {
        audioElement.play().catch(e => {
            console.warn('Autoplay prevented. User interaction required:', e);
        });
    }
    
    // Call updateSoundIcon()
    updateSoundIcon();
}

// Toggle music on/off
function toggleMusic() {
    // Toggle state.musicMuted
    state.musicMuted = !state.musicMuted;
    
    // Pause or play music accordingly
    if (state.musicMuted) {
        state.backgroundMusic.pause();
    } else {
        state.backgroundMusic.play().catch(e => {
            console.warn('Failed to play music:', e);
        });
    }
    
    // Call updateSoundIcon()
    updateSoundIcon();
}

// Update sound icon based on mute state
function updateSoundIcon() {
    // Get #sound-icon element
    const icon = document.getElementById('sound-icon');
    if (!icon) return;
    
    // Set textContent to 'volume_off' or 'volume_up' based on mute state
    if (state.musicMuted) {
        icon.textContent = 'volume_off';
    } else {
        icon.textContent = 'volume_up';
    }
}

// Apply filter (currently only 'none' used, but keep for future)
function applyFilter(ctx, filter) {
    switch(filter) {
        case 'ccd':
            ctx.filter = 'contrast(1.2) saturate(1.3) brightness(0.95)';
            break;
        case 'mono':
            ctx.filter = 'grayscale(100%)';
            break;
        case 'blur':
            ctx.filter = 'blur(2px)';
            break;
        case 'glow':
            ctx.filter = 'brightness(1.2) contrast(1.1)';
            break;
        case '8k':
            ctx.filter = 'contrast(1.3) saturate(1.2) brightness(1.1)';
            break;
        default:
            ctx.filter = 'none';
    }
}

// Render canvas
function renderCanvas() {
    // Validate image, canvas, and context
    if (!state.image || !state.ctx || !state.canvas) {
        if (state.ctx && state.canvas) {
            state.ctx.fillStyle = '#f3f4f6';
            state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
        }
        return;
    }
    
    // Ensure canvas dimensions match image dimensions (recreates physics if needed)
    if (state.canvas.width !== state.image.width || state.canvas.height !== state.image.height) {
        state.canvas.width = state.image.width;
        state.canvas.height = state.image.height;
        // Recreate physics bodies with new dimensions
        updateCharmBodies();
    }
    
    // Clear canvas
    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    
    // Draw image with filter (1:1 pixel mapping)
    state.ctx.save();
    try {
        applyFilter(state.ctx, state.filter);
        state.ctx.drawImage(state.image, 0, 0, state.canvas.width, state.canvas.height);
    } finally {
        state.ctx.restore();
    }
    
    // Call updateCharmBodies() (only recreates if charms changed)
    updateCharmBodies();
    
    // Call drawCharms() to render all charms
    drawCharms();
    
    // Apply continuous anti-stuck corner detection (pushes charms away from corners)
    if (state.charmBodies.length > 0) {
        const cornerThreshold = 25;
        const canvasWidth = state.canvas.width;
        const canvasHeight = state.canvas.height;
        const Body = Matter.Body;
        
        state.charmBodies.forEach(body => {
            const x = body.position.x;
            const y = body.position.y;
            
            // Check if stuck near corner (within 25px)
            const nearLeft = x < cornerThreshold;
            const nearRight = x > canvasWidth - cornerThreshold;
            const nearTop = y < cornerThreshold;
            const nearBottom = y > canvasHeight - cornerThreshold;
            
            if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
                // Apply continuous small force (0.02) toward center
                const centerX = canvasWidth / 2;
                const centerY = canvasHeight / 2;
                const dx = centerX - x;
                const dy = centerY - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    Body.applyForce(body, body.position, {
                        x: (dx / distance) * 0.02,
                        y: (dy / distance) * 0.02
                    });
                }
            }
        });
    }
}

// Update charm physics bodies only when charms array changes
function updateCharmBodies() {
    // Create hash from charms array
    const currentHash = state.charms.join('');
    
    // Only recreate bodies if hash changed (optimization)
    if (currentHash === state.lastCharmHash && state.charmBodies.length > 0) {
        return;
    }
    
    state.lastCharmHash = currentHash;
    
    // Clear existing bodies and walls from Matter.js world
    state.charmBodies.forEach(body => {
        Matter.World.remove(state.world, body);
    });
    if (state.walls) {
        state.walls.forEach(wall => {
            Matter.World.remove(state.world, wall);
        });
    }
    state.charmBodies = [];
    state.walls = [];
    
    // Validate canvas has valid dimensions
    if (state.charms.length === 0 || !state.canvas) {
        console.warn('Cannot update charm bodies: missing charms or canvas');
        return;
    }
    
    if (state.canvas.width === 0 || state.canvas.height === 0) {
        console.warn('Canvas dimensions are invalid:', state.canvas.width, state.canvas.height);
        return;
    }
    
    const Bodies = Matter.Bodies;
    const World = Matter.World;
    
    // Create 4 wall boundaries at canvas edges (top, bottom, left, right) with 50px thickness
    const wallThickness = 50;
    const canvasWidth = state.canvas.width;
    const canvasHeight = state.canvas.height;
    
    // Walls positioned at canvas boundaries (0, width, height)
    const walls = [
        Bodies.rectangle(canvasWidth / 2, 0, canvasWidth, wallThickness, { isStatic: true, label: 'wall' }),
        Bodies.rectangle(canvasWidth / 2, canvasHeight, canvasWidth, wallThickness, { isStatic: true, label: 'wall' }),
        Bodies.rectangle(0, canvasHeight / 2, wallThickness, canvasHeight, { isStatic: true, label: 'wall' }),
        Bodies.rectangle(canvasWidth, canvasHeight / 2, wallThickness, canvasHeight, { isStatic: true, label: 'wall' })
    ];
    
    state.walls = walls;
    World.add(state.world, walls);
    
    // For each character in state.charms:
    state.charms.forEach((charm, charIndex) => {
        // Create exactly 1 Matter.js circle body
        // Size: random radius between 12-25px (base 30px with variation)
        const baseSize = 30;
        const sizeVariation = (Math.random() - 0.5) * 25;
        const radius = Math.max(12, Math.min(25, (baseSize + sizeVariation) / 2));
        
        // Position: random within canvas (x: 50 to width-50, y: 20 to height*0.3)
        const x = Math.random() * (canvasWidth - 100) + 50;
        const y = Math.random() * (canvasHeight * 0.3) + 20;
        
        // Physics properties: adjusted for smoother Rive-like fluid motion
        // Increased frictionAir for smoother deceleration, slightly higher restitution for fluid bounces
        const body = Bodies.circle(x, y, radius, {
            restitution: 0.35, // Slightly increased for more fluid bounces
            friction: 0.08, // Slightly reduced for smoother sliding
            frictionAir: 0.2, // Increased for smoother, more controlled deceleration (Rive-like)
            density: 0.001,
            chamfer: { radius: 2 }
        });
        
        // Store charm character, index, radius, and size on body
        body.charm = charm;
        body.charmIndex = charIndex;
        body.radius = radius;
        body.size = radius * 2;
        
        // Add body to world
        state.charmBodies.push(body);
        World.add(state.world, body);
    });
}
    
    // Draw charms on canvas
function drawCharms() {
    if (state.charmBodies.length === 0 || !state.ctx) return;
    
    // Iterate through state.charmBodies
    state.charmBodies.forEach(body => {
        // Clamp position to canvas bounds with padding
        const padding = body.radius || 20;
        const x = Math.max(padding, Math.min(body.position.x, state.canvas.width - padding));
        const y = Math.max(padding, Math.min(body.position.y, state.canvas.height - padding));
        
        // Get fontSize from body.size
        const fontSize = body.size || 30;
        
        // Save context, translate to position, rotate by body.angle
        state.ctx.save();
        state.ctx.translate(x, y);
        state.ctx.rotate(body.angle);
        
        // Calculate color override if rainbow mode (uses getRainbowColor(body.charmIndex))
        let colorOverride = null;
        if (state.charmColor === 'rainbow' && body.charmIndex !== undefined) {
            colorOverride = getRainbowColor(body.charmIndex);
        }
        
        // Call renderEmojiOnCanvas() to draw character
        renderEmojiOnCanvas(state.ctx, body.charm, 0, 0, fontSize, colorOverride);
        
        // Restore context
        state.ctx.restore();
    });
}

// Render emoji on canvas
function renderEmojiOnCanvas(ctx, emoji, x, y, fontSize, colorOverride = null) {
    // Determine color (uses override or state.charmColor, handles rainbow mode)
    let color = colorOverride || state.charmColor || '#7ED321';
    
    if (color === 'rainbow') {
        const charmIndex = state.charms.indexOf(emoji);
        color = getRainbowColor(charmIndex >= 0 ? charmIndex : Math.floor(Math.random() * 8));
    }
    
    // Detect if character is CJK (Chinese/Japanese/Korean) or regular text
    const isCJK = /[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(emoji);
    const isText = emoji.length === 1 && !/[\u{1F300}-\u{1F9FF}]/u.test(emoji);
    
    // For CJK/text:
    if (isCJK || isText) {
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Use Hoefler Text as primary font: 'Hoefler Text', serif
        // Note: Hoefler Text is a macOS system font, fallbacks ensure cross-platform compatibility
        let fontFamily = `'Hoefler Text', 'Baskerville', 'Bodoni MT', 'Didot', 'Goudy Old Style', 'Garamond', 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', Georgia, serif`;
        
        // Check for Chinese serif fonts (Noto Serif TC, Source Han Serif TC) and prepend if available
        if (document.fonts && document.fonts.check) {
            const chineseSerifFonts = ['Noto Serif TC', 'Source Han Serif TC'];
            for (const testFont of chineseSerifFonts) {
                if (document.fonts.check(`16px "${testFont}"`)) {
                    fontFamily = `"${testFont}", ${fontFamily}`;
                    break;
                }
            }
        }
        
        // Add Chinese sans-serif fallbacks
        fontFamily += `, 'Noto Sans TC', 'Microsoft JhengHei', 'Microsoft YaHei', 'PingFang TC', 'Heiti TC', 'STHeiti', 'WenQuanYi Micro Hei', 'WenQuanYi Zen Hei', 'Source Han Sans TC', 'Source Han Sans SC', sans-serif`;
        
        // Set font, fillStyle, text rendering quality
        ctx.font = `${fontSize}px ${fontFamily}`;
        ctx.fillStyle = color;
        
        if (ctx.textRenderingOptimization !== undefined) {
            ctx.textRenderingOptimization = 'optimizeQuality';
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw text directly on canvas
        ctx.fillText(emoji, x, y);
        ctx.restore();
        return;
    }
    
    // For emojis:
    // Use getEmojiImage() for cached rendering
    const emojiImage = getEmojiImage(emoji, fontSize, color);
    const size = Math.ceil(fontSize * 1.2);
    
    // Draw image, with text fallback while loading
    if (emojiImage.complete && emojiImage.naturalWidth > 0) {
        ctx.drawImage(emojiImage, x - size / 2, y - size / 2, size, size);
    } else {
        const drawWhenReady = () => {
            if (emojiImage.complete && emojiImage.naturalWidth > 0) {
                ctx.drawImage(emojiImage, x - size / 2, y - size / 2, size, size);
            } else {
                setTimeout(drawWhenReady, 10);
            }
        };
        emojiImage.onload = drawWhenReady;
        
        // Text fallback while loading - use same serif font stack
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${fontSize}px 'Hoefler Text', 'Baskerville', 'Bodoni MT', 'Didot', 'Goudy Old Style', 'Garamond', 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', Georgia, serif`;
        ctx.fillStyle = color;
        ctx.fillText(emoji, x, y);
        ctx.restore();
    }
}

// Get emoji as image using canvas
function getEmojiImage(emoji, fontSize, colorOverride = null) {
    let color = colorOverride || state.charmColor || '#7ED321';
    
    if (color === 'rainbow') {
        color = '#FFB3BA';
    }
    
    // Create cache key from emoji, fontSize, color
    const cacheKey = `${emoji}_${fontSize}_${color}`;
    
    // Return cached image if available and loaded
    if (state.emojiCache.has(cacheKey)) {
        const cached = state.emojiCache.get(cacheKey);
        if (cached.complete && cached.naturalWidth > 0) {
            return cached;
        }
    }
    
    // Create temporary canvas (size = fontSize * 2)
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    const size = Math.ceil(fontSize * 2);
    tempCanvas.width = size;
    tempCanvas.height = size;
    
    // Use Hoefler Text font stack (same as renderEmojiOnCanvas)
    // Note: Hoefler Text is a macOS system font, fallbacks ensure cross-platform compatibility
    let fontFamily = `'Hoefler Text', 'Baskerville', 'Bodoni MT', 'Didot', 'Goudy Old Style', 'Garamond', 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', Georgia, serif`;
    
    if (document.fonts && document.fonts.check) {
        const chineseSerifFonts = ['Noto Serif TC', 'Source Han Serif TC'];
        for (const testFont of chineseSerifFonts) {
            if (document.fonts.check(`16px "${testFont}"`)) {
                fontFamily = `"${testFont}", ${fontFamily}`;
                break;
            }
        }
    }
    
    fontFamily += `, 'Noto Sans TC', 'Microsoft YaHei', 'PingFang TC', 'Heiti TC', 'STHeiti', 'WenQuanYi Micro Hei', 'WenQuanYi Zen Hei', 'Source Han Sans TC', 'Source Han Sans SC', sans-serif`;
    
    tempCtx.font = `${fontSize}px ${fontFamily}`;
    tempCtx.textRenderingOptimization = 'optimizeQuality';
    tempCtx.imageSmoothingEnabled = true;
    tempCtx.imageSmoothingQuality = 'high';
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillStyle = color;
    
    // Render text to temporary canvas
    tempCtx.fillText(emoji, size / 2, size / 2);
    
    // Convert to Image object and cache
    const img = new Image();
    img.src = tempCanvas.toDataURL('image/png');
    
    state.emojiCache.set(cacheKey, img);
    return img;
}

// Get pastel rainbow color based on index
function getRainbowColor(index) {
    // Returns pastel color from array: ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFB3E6', '#C7CEEA', '#FFD3A5', '#A8E6CF']
    const pastelColors = [
        '#FFB3BA', // Pastel pink
        '#BAFFC9', // Pastel green
        '#BAE1FF', // Pastel blue
        '#FFFFBA', // Pastel yellow
        '#FFB3E6', // Pastel magenta
        '#C7CEEA', // Pastel purple
        '#FFD3A5', // Pastel orange
        '#A8E6CF'  // Pastel mint
    ];
    
    // Uses modulo to cycle through colors
    return pastelColors[index % pastelColors.length];
}

// Trigger shake
function triggerShake() {
    // Prevents multiple simultaneous shakes (checks state.isShaking)
    if (state.isShaking || state.charmBodies.length === 0) return;
    
    // Set isShaking flag
    state.isShaking = true;
    const Body = Matter.Body;
    
    // Apply force 0.15 to all charm bodies
    const force = 0.15;
    const cornerThreshold = 30;
    const canvasWidth = state.canvas.width;
    const canvasHeight = state.canvas.height;
    
    state.charmBodies.forEach(body => {
        const x = body.position.x;
        const y = body.position.y;
        
        // For charms near corners (within 30px):
        const nearLeft = x < cornerThreshold;
        const nearRight = x > canvasWidth - cornerThreshold;
        const nearTop = y < cornerThreshold;
        const nearBottom = y > canvasHeight - cornerThreshold;
        
        if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
            // Push toward center with force * 1.5
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            const dx = centerX - x;
            const dy = centerY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const pushForce = force * 1.5;
                Body.applyForce(body, body.position, {
                    x: (dx / distance) * pushForce,
                    y: (dy / distance) * pushForce
                });
            }
        } else {
            // For other charms: apply random direction force
        const angle = Math.random() * Math.PI * 2;
        Body.applyForce(body, body.position, {
            x: Math.cos(angle) * force,
            y: Math.sin(angle) * force
        });
        }
    });
    
    // Call playShakeSound()
    playShakeSound();
    
    // Reset isShaking flag after 500ms
    setTimeout(() => {
        state.isShaking = false;
    }, 500);
}

// Play shake sound
function playShakeSound() {
    if (!state.audioContext) return;
    
    try {
        // Uses Web Audio API
        const currentTime = state.audioContext.currentTime;
        
        // Creates oscillator (sine wave, 200-300Hz)
        const osc = state.audioContext.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 200 + Math.random() * 100;
        
        // Creates gain node with envelope (starts 0.3, decays to 0.01 over 0.1s)
        const gain = state.audioContext.createGain();
        gain.gain.setValueAtTime(0.3, currentTime);
        gain.gain.linearRampToValueAtTime(0.1, currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(state.audioContext.destination);
        
        // Plays short sound effect
        osc.start(currentTime);
        osc.stop(currentTime + 0.1);
    } catch (e) {
        console.warn('Sound effect failed:', e);
    }
}

// Setup device shake detection
function setupDeviceShakeDetection() {
    // Tracks last acceleration values
    let lastAcceleration = { x: 0, y: 0, z: 0 };
    let lastTime = Date.now();
    let motionPermissionGranted = false;
    
    function handleDeviceMotion(event) {
        if (state.charmBodies.length === 0) return;
        
        const acceleration = event.accelerationIncludingGravity || event.acceleration;
        if (!acceleration) return;
        
        const currentTime = Date.now();
        const timeDelta = (currentTime - lastTime) / 1000;
        lastTime = currentTime;
        
        if (timeDelta < 0.01) return;
        
        // Calculate shake magnitude from acceleration delta
        const deltaX = (acceleration.x || 0) - lastAcceleration.x;
        const deltaY = (acceleration.y || 0) - lastAcceleration.y;
        const deltaZ = (acceleration.z || 0) - lastAcceleration.z;
        
        const shakeMagnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ) / timeDelta;
        const threshold = 2.0;
        
        // If magnitude > threshold (2.0):
        if (shakeMagnitude > threshold) {
            // Apply forces to charms based on device movement
            const Body = Matter.Body;
            const forceMultiplier = Math.min(shakeMagnitude / 10, 0.3);
            
            state.charmBodies.forEach(body => {
                const forceX = deltaX * forceMultiplier * 0.1;
                const forceY = -deltaY * forceMultiplier * 0.1; // Inverted
                
                Body.applyForce(body, body.position, {
                    x: forceX,
                    y: forceY
                });
            });
            
            // Play sound if magnitude > threshold * 1.5
            if (shakeMagnitude > threshold * 1.5) {
                playShakeSound();
            }
        }
        
        lastAcceleration = {
            x: acceleration.x || 0,
            y: acceleration.y || 0,
            z: acceleration.z || 0
        };
    }
    
    // Handles iOS permission request (DeviceMotionEvent.requestPermission)
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
        document.addEventListener('touchstart', function requestPermissionOnce() {
            DeviceMotionEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        motionPermissionGranted = true;
                        window.addEventListener('devicemotion', handleDeviceMotion);
                    }
                })
                .catch(console.error);
            document.removeEventListener('touchstart', requestPermissionOnce);
        }, { once: true });
    } else {
        // Falls back to direct listener for Android/older iOS
        window.addEventListener('devicemotion', handleDeviceMotion);
    }
}

// Setup parallax
function setupParallax() {
    let tiltX = 0;
    let tiltY = 0;
    
    // Sets up deviceorientation listener (mobile):
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
            // Calculate tilt from beta/gamma
            tiltX = (e.gamma || 0) / 45;
            tiltY = (e.beta || 0) / 45;
            // Call applyParallax() and updateGravityFromOrientation()
            applyParallax(tiltX, tiltY);
            updateGravityFromOrientation(e.beta, e.gamma);
        }, { passive: true });
    }
    
    // Sets up mousemove listener on canvas (desktop):
    if (state.canvas) {
        state.canvas.addEventListener('mousemove', (e) => {
            // Calculate tilt from mouse position relative to canvas center
            const rect = state.canvas.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            tiltX = (e.clientX - centerX) / (rect.width / 2) * 0.3;
            tiltY = (e.clientY - centerY) / (rect.height / 2) * 0.3;
            // Call applyParallax()
            applyParallax(tiltX, tiltY);
        });
        
        // Sets up mouseleave listener to reset parallax
        state.canvas.addEventListener('mouseleave', () => {
            applyParallax(0, 0);
            const wrapper = document.getElementById('holographic-wrapper');
            if (wrapper) {
                wrapper.classList.remove('tilted');
            }
        });
        
        // Sets up click and touchstart listeners to trigger shake
        state.canvas.addEventListener('click', () => {
            if (state.charmBodies.length > 0) {
                triggerShake();
            }
        });
        
        state.canvas.addEventListener('touchstart', (e) => {
            if (state.charmBodies.length > 0) {
                e.preventDefault();
                triggerShake();
            }
        });
    }
}

// Apply parallax
function applyParallax(x, y) {
    if (!state.canvas) return;
    
    // Get #holographic-wrapper element
    const wrapper = document.getElementById('holographic-wrapper');
    if (!wrapper) return;
    
    // Calculate rotation (max 15 degrees) with smooth easing for Rive-like motion
    const maxTilt = 15;
    const rotateX = y * maxTilt;
    const rotateY = -x * maxTilt;
    
    // Apply CSS transform: perspective(1000px) rotateX() rotateY() with smooth transition
    wrapper.style.transition = 'transform 0.1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
    wrapper.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    
    // Add tilted class to wrapper
    wrapper.classList.add('tilted');
    
    // Update CSS custom properties --mouse-x and --mouse-y for glow/reflection effect
    // Map tilt values (-1 to 1) to percentage (0% to 100%)
    const glowX = ((x + 1) * 50);
    const glowY = ((y + 1) * 50);
    wrapper.style.setProperty('--mouse-x', `${glowX}%`);
    wrapper.style.setProperty('--mouse-y', `${glowY}%`);
}

// Update gravity based on device orientation (mobile only)
function updateGravityFromOrientation(beta, gamma) {
    if (!state.engine) return;
    
    // Only works on mobile devices (detects via user agent)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;
    
    // Normalize beta (pitch) and gamma (roll) to -1 to 1
    // Beta: positive = phone top tilted toward user (forward), negative = phone top tilted away (backward)
    // When phone end (bottom) is down, beta is negative, so we invert it for gravity
    const betaNormalized = Math.max(-90, Math.min(90, beta || 0)) / 90;
    const gammaNormalized = Math.max(-90, Math.min(90, gamma || 0)) / 90;
    
    // Calculate target gravity (Y: 0.3 กำ 0.2, X: กำ0.15)
    // Invert beta so when phone end is down (negative beta), gravity increases downward (positive)
    const defaultGravityY = 0.3;
    const maxGravity = 0.5;
    const targetGravityY = defaultGravityY + (-betaNormalized * maxGravity * 0.4);
    const targetGravityX = gammaNormalized * maxGravity * 0.3;
    
    // Smoothly interpolate current gravity toward target (increased smoothing for Rive-like fluid motion)
    const smoothingFactor = 0.15; // Increased from 0.1 for smoother transitions
    state.engine.world.gravity.y += (targetGravityY - state.engine.world.gravity.y) * smoothingFactor;
    state.engine.world.gravity.x += (targetGravityX - state.engine.world.gravity.x) * smoothingFactor;
    
    // Clamp gravity values to reasonable ranges
    state.engine.world.gravity.y = Math.max(-0.2, Math.min(0.7, state.engine.world.gravity.y));
    state.engine.world.gravity.x = Math.max(-0.5, Math.min(0.5, state.engine.world.gravity.x));
}

// Main animation loop
function animate() {
    // Only update physics and render if card is visible
    if (!state.introScreenVisible && state.engine) {
        // Update Matter.js engine
        Matter.Engine.update(state.engine);
        
        // Call renderCanvas()
        renderCanvas();
    }
    
    // Request next animation frame
    requestAnimationFrame(animate);
}

// Setup intro screen with swipe detection
function setupIntroScreen() {
    const introScreen = document.getElementById('intro-screen');
    if (!introScreen) return;
    
    let touchStartY = 0;
    let touchEndY = 0;
    let isSwiping = false;
    
    // Create sparkle particles
    function createSparkle() {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = Math.random() * 100 + '%';
        sparkle.style.top = Math.random() * 100 + '%';
        sparkle.style.animationDelay = Math.random() * 3 + 's';
        introScreen.appendChild(sparkle);
        
        setTimeout(() => {
            sparkle.remove();
        }, 3000);
    }
    
    // Create initial sparkles
    for (let i = 0; i < 15; i++) {
        setTimeout(() => createSparkle(), i * 200);
    }
    
    // Continue creating sparkles
    setInterval(() => {
        if (state.introScreenVisible && Math.random() > 0.7) {
            createSparkle();
        }
    }, 500);
    
    // Touch start
    introScreen.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        isSwiping = true;
    }, { passive: true });
    
    // Touch move - show visual feedback
    introScreen.addEventListener('touchmove', (e) => {
        if (!isSwiping) return;
        touchEndY = e.touches[0].clientY;
        const deltaY = touchStartY - touchEndY;
        
        // Visual feedback - lift envelope slightly
        if (deltaY > 0) {
            const envelope = introScreen.querySelector('.envelope');
            const liftAmount = Math.min(deltaY * 0.3, 50);
            envelope.style.transform = `translateY(-${liftAmount}px) rotate(${deltaY * 0.05}deg)`;
        }
    }, { passive: true });
    
    // Touch end - check swipe
    introScreen.addEventListener('touchend', (e) => {
        if (!isSwiping) return;
        isSwiping = false;
        
        const deltaY = touchStartY - touchEndY;
        const swipeThreshold = 50;
        
        // Reset envelope position
        const envelope = introScreen.querySelector('.envelope');
        envelope.style.transform = '';
        
        // Check if swipe up is sufficient
        if (deltaY > swipeThreshold) {
            openEnvelope();
        }
    }, { passive: true });
    
    // Click/tap to open (alternative to swipe)
    introScreen.addEventListener('click', (e) => {
        // Only trigger on click if not swiping
        if (!isSwiping) {
            openEnvelope();
        }
    });
    
    // Keyboard support (space or arrow up)
    document.addEventListener('keydown', (e) => {
        if (state.introScreenVisible && (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'Enter')) {
            e.preventDefault();
            openEnvelope();
        }
    });
}

// Open envelope and reveal card
function openEnvelope() {
    if (!state.introScreenVisible) return;
    
    state.introScreenVisible = false;
    const introScreen = document.getElementById('intro-screen');
    const step5 = document.getElementById('step-5');
    
    if (!introScreen || !step5) return;
    
    // Play opening sound
    if (state.audioContext) {
        try {
            const osc = state.audioContext.createOscillator();
            const gain = state.audioContext.createGain();
            osc.connect(gain);
            gain.connect(state.audioContext.destination);
            
            osc.frequency.value = 400;
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.3, state.audioContext.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, state.audioContext.currentTime + 0.3);
            
            osc.start(state.audioContext.currentTime);
            osc.stop(state.audioContext.currentTime + 0.3);
        } catch (e) {
            console.warn('Sound effect failed:', e);
        }
    }
    
    // Trigger envelope opening animation
    introScreen.classList.add('opening');
    
    // After envelope opens, flash and disappear
    setTimeout(() => {
        introScreen.classList.add('flashing');
        
        // Hide intro screen after flash
        setTimeout(() => {
            introScreen.classList.add('hidden');
            
            // Show card with fade-in
            step5.style.display = 'flex';
            step5.style.opacity = '0';
            step5.style.transition = 'opacity 0.8s ease-in';
            
            requestAnimationFrame(() => {
                step5.style.opacity = '1';
            });
            
            // If card is already loaded, ensure it's visible
            if (state.cardLoaded) {
                showCard();
            }
        }, 300); // Flash duration
    }, 800); // Envelope opening duration
}

// Setup sparkles for card background
function setupCardSparkles() {
    const step5 = document.getElementById('step-5');
    if (!step5) return;
    
    // Prevent multiple intervals
    if (state.cardSparkleInterval) {
        clearInterval(state.cardSparkleInterval);
    }
    
    // Create sparkle particles
    function createSparkle() {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = Math.random() * 100 + '%';
        sparkle.style.top = Math.random() * 100 + '%';
        sparkle.style.animationDelay = Math.random() * 3 + 's';
        step5.appendChild(sparkle);
        
        setTimeout(() => {
            if (sparkle.parentNode) {
                sparkle.remove();
            }
        }, 3000);
    }
    
    // Wait a bit for card to be visible, then create initial sparkles
    setTimeout(() => {
        for (let i = 0; i < 15; i++) {
            setTimeout(() => createSparkle(), i * 200);
        }
    }, 100);
    
    // Continue creating sparkles
    state.cardSparkleInterval = setInterval(() => {
        if (!state.introScreenVisible && step5.style.display !== 'none') {
            if (Math.random() > 0.7) {
                createSparkle();
            }
        }
    }, 500);
}

// Show card (called when card is loaded and intro is dismissed)
function showCard() {
    const step5 = document.getElementById('step-5');
    if (step5) {
        step5.style.display = 'flex';
    }
    // Setup sparkles for card background
    setupCardSparkles();
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', initializeApp);
