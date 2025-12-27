// Google Analytics helper function
function trackEvent(eventName, eventParams = {}) {
    // Track in Google Analytics 4
    if (typeof gtag !== 'undefined') {
        gtag('event', eventName, eventParams);
    }
    // Also track in Plausible (if you want to keep both)
    if (window.plausible) {
        window.plausible(eventName);
    }
}

// State management
const state = {
    image: null,
    filter: 'none',
    charms: [],
    engine: null,
    world: null,
    canvas: null,
    ctx: null,
    previewCanvas2: null,
    previewCtx2: null,
    previewCanvas3: null,
    previewCtx3: null,
    previewCanvas4: null,
    previewCtx4: null,
    charmBodies: [],
    walls: [],
    isShaking: false,
    capturer: null,
    lastCharmHash: '',
    currentStep: 0,
    customMessage: '',
    audioContext: null,
    emojiCache: new Map(), // Cache for emoji images
    emojiCanvas: null, // Temporary canvas for rendering emojis
    emojiCtx: null,
    mediaRecorder: null,
    charmColor: '#4A90E2', // Default blue color for charms
    backgroundMusic: null, // Background music audio element
    musicMuted: false // Music mute state
};

// Wait for fonts to load before initializing
async function initializeApp() {
    // Wait for fonts to be ready (especially Noto Color Emoji)
    if (document.fonts && document.fonts.ready) {
        try {
            await document.fonts.ready;
        } catch (e) {
            console.warn('Font loading check failed:', e);
        }
    }
    
    // Get canvas elements
    state.canvas = document.getElementById('canvas');
    state.ctx = state.canvas?.getContext('2d');
    
    state.previewCanvas2 = document.getElementById('preview-canvas-2');
    state.previewCtx2 = state.previewCanvas2?.getContext('2d');
    
    state.previewCanvas3 = document.getElementById('preview-canvas-3');
    state.previewCtx3 = state.previewCanvas3?.getContext('2d');
    
    state.previewCanvas4 = document.getElementById('preview-canvas-4');
    state.previewCtx4 = state.previewCanvas4?.getContext('2d');
    
    // Create temporary canvas for emoji rendering
    state.emojiCanvas = document.createElement('canvas');
    state.emojiCanvas.width = 100;
    state.emojiCanvas.height = 100;
    state.emojiCtx = state.emojiCanvas.getContext('2d');
    
    // Initialize Audio Context for sound effects
    try {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.warn('Audio context not supported:', e);
    }
    
    // Initialize Matter.js
    const Engine = Matter.Engine;
    const World = Matter.World;
    
    state.engine = Engine.create();
    state.world = state.engine.world;
    state.engine.world.gravity.y = 0.8;
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for hash on load (skip to final view)
    if (window.location.hash && window.location.hash.length > 1) {
        loadFromHash();
        return;
    }
    
    // Initialize shake detection - use DeviceMotionEvent for real shake detection
    setupDeviceShakeDetection();
    
    // Also use shake.js as fallback
    if (typeof Shake !== 'undefined') {
        const shake = new Shake({
            threshold: 15,
            timeout: 1000
        });
        shake.start();
        window.addEventListener('shake', () => {
            if (state.currentStep === 5) {
            triggerShake();
            }
        });
    }
    
    // Parallax effect (only for final view)
    setupParallax();
    
    // Animation loop
    requestAnimationFrame(animate);
}

// Initialize
document.addEventListener('DOMContentLoaded', initializeApp);

function setupEventListeners() {
    // Welcome screen
    document.getElementById('start-btn').addEventListener('click', () => {
        goToStep(1);
    });
    
    // Step 1: Upload
    document.getElementById('image-upload').addEventListener('change', handleImageUpload);
    document.getElementById('image-upload').addEventListener('input', handleImageUpload);
    document.getElementById('step-1-next').addEventListener('click', () => {
        if (state.image) goToStep(2);
    });
    
    // Drag and drop
    const uploadLabel = document.querySelector('label[for="image-upload"]');
    if (uploadLabel) {
        uploadLabel.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
        });
        uploadLabel.addEventListener('dragleave', (e) => {
            e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
        });
        uploadLabel.addEventListener('drop', (e) => {
            e.preventDefault();
            e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
            const file = e.dataTransfer.files[0];
            if (file) {
                const input = document.getElementById('image-upload');
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input.files = dataTransfer.files;
                handleImageUpload({ target: input });
            }
        });
    }
    
    // Step 2: Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.filter = btn.dataset.filter;
            renderPreviewCanvas(2);
        });
    });
    document.getElementById('step-2-back').addEventListener('click', () => goToStep(1));
    document.getElementById('step-2-next').addEventListener('click', () => goToStep(3));
    
    // Step 3: Charms
    document.getElementById('charm-input').addEventListener('input', (e) => {
        const input = e.target.value;
        if (input.length <= 15) {
            state.charms = input.split('').filter(c => c !== '');
            renderPreviewCanvas(3);
        }
    });
    
    document.querySelectorAll('.charm-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            state.charms = btn.dataset.charms.split('');
            document.getElementById('charm-input').value = btn.dataset.charms;
            renderPreviewCanvas(3);
        });
    });
    
    // Charm color selection
    document.querySelectorAll('.charm-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all color buttons
            document.querySelectorAll('.charm-color-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            btn.classList.add('active');
            // Update state
            state.charmColor = btn.dataset.color;
            // Clear emoji cache to force re-render with new color
            state.emojiCache.clear();
            // Re-render preview
            renderPreviewCanvas(3);
        });
    });
    
    document.getElementById('step-3-back').addEventListener('click', () => goToStep(2));
    document.getElementById('step-3-next').addEventListener('click', () => goToStep(4));
    
    // Step 4: Text Message
    document.getElementById('custom-message-input').addEventListener('input', (e) => {
        state.customMessage = e.target.value;
        renderPreviewCanvas(4);
    });
    document.getElementById('step-4-back').addEventListener('click', () => goToStep(3));
    document.getElementById('step-4-done').addEventListener('click', () => {
        // Track "Generate Card" event
        trackEvent('GenerateCard');
        
        goToStep('loading');
        setTimeout(() => {
            goToStep(5);
            initializeFinalView();
        }, 1500);
    });
    
    // Step 5: Final view
    document.getElementById('share-btn').addEventListener('click', generateShareLink);
    document.getElementById('download-video-btn').addEventListener('click', exportVideo);
    document.getElementById('shake-btn').addEventListener('click', triggerShake);
    document.getElementById('make-another-btn').addEventListener('click', resetToStart);
    
    // Sound toggle button
    document.getElementById('sound-toggle-btn').addEventListener('click', toggleMusic);
    document.getElementById('copy-link-btn').addEventListener('click', copyShareLink);
    document.getElementById('close-share-modal').addEventListener('click', () => {
        document.getElementById('share-modal').classList.add('hidden');
    });
}

function goToStep(step) {
    // Hide all steps (full page transition)
    document.querySelectorAll('.step').forEach(s => {
        s.classList.remove('active');
        s.style.display = 'none';
    });
    
    if (step === 'loading') {
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.style.display = 'flex';
        loadingScreen.classList.add('active');
        state.currentStep = 'loading';
        updateProgress(100);
        return;
    }
    
    state.currentStep = step;
    
    // Show progress bar for steps 1-4
    const progressContainer = document.getElementById('progress-container');
    if (step >= 1 && step <= 4) {
        progressContainer.style.display = 'block';
        updateProgress((step / 4) * 100);
        document.getElementById('current-step-num').textContent = step;
        const labels = ['', 'Upload Image', 'Choose Filter', 'Add Charms', 'Add Message'];
        document.getElementById('step-label').textContent = labels[step];
    } else {
        progressContainer.style.display = 'none';
    }
    
    // Show current step as full page
    const currentStepEl = document.getElementById(`step-${step}`);
    if (currentStepEl) {
        currentStepEl.style.display = 'flex';
        currentStepEl.classList.add('active');
    }
    
    // Render previews when entering steps 2, 3, or 4
    if (step === 2) {
        setTimeout(() => renderPreviewCanvas(2), 100);
    } else if (step === 3) {
        setTimeout(() => renderPreviewCanvas(3), 100);
    } else if (step === 4) {
        setTimeout(() => renderPreviewCanvas(4), 100);
    }
}

function updateProgress(percent) {
    document.getElementById('progress-fill').style.width = percent + '%';
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type (accept all image types, but validate common ones)
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    const isValidImage = file.type.startsWith('image/');
    
    if (!isValidImage && !validTypes.includes(file.type.toLowerCase())) {
        alert('Please upload a valid image file (JPG, PNG, WEBP, GIF, or HEIC).');
        return;
    }
    
    // Check file size (3MB)
    if (file.size > 3 * 1024 * 1024) {
        alert('Image must be smaller than 3MB.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onerror = () => {
        alert('Failed to read file. Please try again.');
        document.getElementById('upload-status').textContent = '? Upload failed';
        document.getElementById('step-1-next').disabled = true;
    };
    
    reader.onload = (event) => {
        const img = new Image();
        
        img.onerror = () => {
            alert('Failed to load image. Please try a different file.');
            document.getElementById('upload-status').textContent = '? Image load failed';
            document.getElementById('step-1-next').disabled = true;
        };
        
        img.onload = () => {
            // Resize to max 720px width
            const maxWidth = 720;
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
            }
            
            const resizedCanvas = document.createElement('canvas');
            resizedCanvas.width = width;
            resizedCanvas.height = height;
            const resizedCtx = resizedCanvas.getContext('2d');
            resizedCtx.drawImage(img, 0, 0, width, height);
            
            state.image = resizedCanvas;
            
            // Update preview (small preview with confirmation)
            const previewImg = document.getElementById('upload-preview-img');
            previewImg.src = resizedCanvas.toDataURL();
            document.getElementById('upload-preview').classList.remove('hidden');
            
            // Enable next button
            document.getElementById('step-1-next').disabled = false;
            document.getElementById('upload-status').textContent = `${width} ¡Ñ ${height} pixels`;
            
            trackEvent('PhotocardCreated');
        };
        
        img.src = event.target.result;
    };
    
    reader.readAsDataURL(file);
}

function renderPreviewCanvas(step) {
    if (!state.image) return;
    
    let canvas, ctx;
    if (step === 2) {
        canvas = state.previewCanvas2;
        ctx = state.previewCtx2;
    } else if (step === 3) {
        canvas = state.previewCanvas3;
        ctx = state.previewCtx3;
    } else if (step === 4) {
        canvas = state.previewCanvas4;
        ctx = state.previewCtx4;
    } else {
        return;
    }
    
    if (!canvas || !ctx) return;
    
    // Set canvas size to match image aspect ratio (max 400px)
    const maxSize = 400;
    const imgAspect = state.image.width / state.image.height;
    let canvasWidth = maxSize;
    let canvasHeight = maxSize;
    
    if (imgAspect > 1) {
        canvasHeight = maxSize / imgAspect;
    } else {
        canvasWidth = maxSize * imgAspect;
    }
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Clear and draw image with filter
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    applyFilter(ctx, state.filter);
    ctx.drawImage(state.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    // For step 3, also draw charms preview (static, showing charm objects)
    if ((step === 3 || step === 4) && state.charms.length > 0) {
        const targetCount = Math.max(20, state.charms.length * 2);
        const objectsPerChar = Math.ceil(targetCount / state.charms.length);
        let drawn = 0;
        
        state.charms.forEach((charm, charmIndex) => {
            for (let i = 0; i < objectsPerChar && drawn < targetCount; i++) {
                const baseSize = 20;
                const sizeVariation = (Math.random() - 0.5) * 10;
        const fontSize = baseSize + sizeVariation;
        
        const x = Math.random() * (canvas.width - 40) + 20;
        const y = Math.random() * (canvas.height * 0.6) + 50;
        
        // Get color for rainbow mode
        let color = state.charmColor || '#4A90E2';
        if (color === 'rainbow') {
            color = getRainbowColor(charmIndex);
        }
        
        // Use improved emoji rendering function for preview
        ctx.save();
        renderEmojiOnCanvas(ctx, charm, x, y, fontSize, color);
        ctx.restore();
                drawn++;
            }
        });
    }
}

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

function initializeFinalView() {
    if (!state.image || !state.canvas || !state.ctx) return;
    
    const wrapper = document.getElementById('holographic-wrapper');
    
    // Set canvas size with constraints (90vw or 70vh max)
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.7;
    const imageAspect = state.image.width / state.image.height;
    
    let canvasWidth = state.image.width;
    let canvasHeight = state.image.height;
    
    // Scale down if needed
    if (canvasWidth > maxWidth) {
        canvasWidth = maxWidth;
        canvasHeight = maxWidth / imageAspect;
    }
    if (canvasHeight > maxHeight) {
        canvasHeight = maxHeight;
        canvasWidth = maxHeight * imageAspect;
    }
    
    state.canvas.width = canvasWidth;
    state.canvas.height = canvasHeight;
    
    // Wrapper will automatically size to canvas via CSS
    // Initialize charm physics
    updateCharmBodies();
    
    // Render initial canvas
    renderCanvas();
    
    // Display custom message if provided
    const messageDisplay = document.getElementById('custom-message-display');
    if (state.customMessage && state.customMessage.trim()) {
        messageDisplay.style.display = 'block';
        messageDisplay.querySelector('p').textContent = state.customMessage;
    } else {
        messageDisplay.style.display = 'none';
    }
    
    // Initialize and play background music
    initializeBackgroundMusic();
}

// Initialize background music
function initializeBackgroundMusic() {
    const audioElement = document.getElementById('background-music');
    if (!audioElement) return;
    
    state.backgroundMusic = audioElement;
    
    // Set volume (adjust as needed, 0.0 to 1.0)
    audioElement.volume = 0.5;
    
    // Play music if not muted
    if (!state.musicMuted) {
        audioElement.play().catch(e => {
            console.warn('Autoplay prevented. User interaction required:', e);
            // Music will play when user interacts with the page
        });
    }
    
    // Update icon based on mute state
    updateSoundIcon();
}

// Toggle music on/off
function toggleMusic() {
    if (!state.backgroundMusic) return;
    
    state.musicMuted = !state.musicMuted;
    
    if (state.musicMuted) {
        state.backgroundMusic.pause();
    } else {
        state.backgroundMusic.play().catch(e => {
            console.warn('Failed to play music:', e);
        });
    }
    
    updateSoundIcon();
}

// Update sound icon based on mute state
function updateSoundIcon() {
    const icon = document.getElementById('sound-icon');
    if (!icon) return;
    
    if (state.musicMuted) {
        icon.textContent = 'volume_off';
        icon.classList.remove('text-gray-700');
        icon.classList.add('text-gray-400');
    } else {
        icon.textContent = 'volume_up';
        icon.classList.remove('text-gray-400');
        icon.classList.add('text-gray-700');
    }
}

// Toggle music on/off
function toggleMusic() {
    if (!state.backgroundMusic) return;
    
    state.musicMuted = !state.musicMuted;
    
    if (state.musicMuted) {
        state.backgroundMusic.pause();
    } else {
        state.backgroundMusic.play().catch(e => {
            console.warn('Failed to play music:', e);
        });
    }
    
    updateSoundIcon();
}

// Update sound icon based on mute state
function updateSoundIcon() {
    const icon = document.getElementById('sound-icon');
    if (!icon) return;
    
    if (state.musicMuted) {
        icon.textContent = 'volume_off';
        icon.classList.remove('text-gray-700');
        icon.classList.add('text-gray-400');
    } else {
        icon.textContent = 'volume_up';
        icon.classList.remove('text-gray-400');
        icon.classList.add('text-gray-700');
    }
}

function renderCanvas() {
    if (!state.image || !state.ctx) {
        if (state.ctx) {
            state.ctx.fillStyle = '#f3f4f6';
            state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
        }
        return;
    }
    
    // Clear canvas
    state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    
    // Draw image with filter
    state.ctx.save();
    try {
        applyFilter(state.ctx, state.filter);
        state.ctx.drawImage(state.image, 0, 0, state.canvas.width, state.canvas.height);
    } finally {
        state.ctx.restore();
    }
    
    // Update charm bodies only if charms changed
    updateCharmBodies();
    
    // Draw charms on canvas
    drawCharms();
}

// Update charm physics bodies only when charms array changes
// Creates ~20 objects from up to 15 character input with size variation (¬y³Â shaker style)
function updateCharmBodies() {
    const currentHash = state.charms.join('');
    
    // Only recreate bodies if charms have changed
    if (currentHash === state.lastCharmHash && state.charmBodies.length > 0) {
        return; // No change, keep existing bodies
    }
    
    state.lastCharmHash = currentHash;
    
    // Clear existing charm bodies and walls
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
    
    if (state.charms.length === 0 || !state.canvas) return;
    
    const Bodies = Matter.Bodies;
    const World = Matter.World;
    
    // Create wall boundaries for bouncing
    const wallThickness = 50;
    const canvasWidth = state.canvas.width;
    const canvasHeight = state.canvas.height;
    
    // Top, bottom, left, right walls
    const walls = [
        Bodies.rectangle(canvasWidth / 2, -wallThickness / 2, canvasWidth, wallThickness, { isStatic: true, label: 'wall' }),
        Bodies.rectangle(canvasWidth / 2, canvasHeight + wallThickness / 2, canvasWidth, wallThickness, { isStatic: true, label: 'wall' }),
        Bodies.rectangle(-wallThickness / 2, canvasHeight / 2, wallThickness, canvasHeight, { isStatic: true, label: 'wall' }),
        Bodies.rectangle(canvasWidth + wallThickness / 2, canvasHeight / 2, wallThickness, canvasHeight, { isStatic: true, label: 'wall' })
    ];
    
    state.walls = walls;
    World.add(state.world, walls);
    
    // Generate charm objects: input length * 2 (minimum 20)
    // Each character appears multiple times with size variation
    const targetCount = Math.max(20, state.charms.length * 2);
    const objectsPerChar = Math.ceil(targetCount / state.charms.length);
    
    state.charms.forEach((charm, charIndex) => {
        for (let i = 0; i < objectsPerChar && state.charmBodies.length < targetCount; i++) {
            // Size variation: base size 25-50px (up to 50% variation from base 30px)
            const baseSize = 30;
            const sizeVariation = (Math.random() - 0.5) * 25; // -12.5 to +12.5 (up to ~42% variation)
            const radius = Math.max(12, Math.min(25, (baseSize + sizeVariation) / 2)); // Clamp between 12-25px radius
            
            // Random starting position within canvas
            const x = Math.random() * (canvasWidth - 100) + 50;
            const y = Math.random() * (canvasHeight * 0.3) + 20; // Start in upper third
            
            // Create circular body with physics properties for shaker charm effect
            const body = Bodies.circle(x, y, radius, {
                restitution: 0.6, // Bounce off walls
                friction: 0.05,   // Low friction for smooth movement
                frictionAir: 0.01, // Air resistance
                density: 0.0008,  // Lightweight for floating effect
                chamfer: { radius: 2 } // Slightly rounded edges
            });
            
            // Store charm character and size for rendering
        body.charm = charm;
            body.radius = radius;
            body.size = radius * 2;
            
        state.charmBodies.push(body);
            World.add(state.world, body);
        }
    });
}

// Get pastel rainbow color based on index
function getRainbowColor(index) {
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
    return pastelColors[index % pastelColors.length];
}

// Get emoji as image using SVG (most reliable cross-browser method)
function getEmojiImage(emoji, fontSize, colorOverride = null) {
    let color = colorOverride || state.charmColor || '#4A90E2';
    
    // Handle rainbow color
    if (color === 'rainbow') {
        // Use a default pastel color for rainbow (will be overridden in drawCharms)
        color = '#FFB3BA';
    }
    
    const cacheKey = `${emoji}_${fontSize}_${color}`;
    
    // Return cached image if available and loaded
    if (state.emojiCache.has(cacheKey)) {
        const cached = state.emojiCache.get(cacheKey);
        if (cached.complete && cached.naturalWidth > 0) {
            return cached;
        }
    }
    
    // Create SVG with charm text - use serif font with curved edges for elegant look
    const size = Math.ceil(fontSize * 2);
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <text x="50%" y="50%" font-size="${fontSize}" font-family="Georgia, Palatino, 'Palatino Linotype', 'Book Antiqua', Garamond, 'Times New Roman', Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, emoji, serif" fill="${color}" text-anchor="middle" dominant-baseline="central">${emoji}</text>
        </svg>
    `.trim();
    
    const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    
    const img = new Image();
    img.onload = () => {
        URL.revokeObjectURL(url);
    };
    img.onerror = () => {
        URL.revokeObjectURL(url);
        console.warn('Failed to load emoji as SVG:', emoji);
    };
    img.src = url;
    
    // Cache the image
    state.emojiCache.set(cacheKey, img);
    return img;
}

// Helper function to render emoji on canvas
function renderEmojiOnCanvas(ctx, emoji, x, y, fontSize, colorOverride = null) {
    let color = colorOverride || state.charmColor || '#4A90E2';
    
    // Handle rainbow color - generate pastel color based on charm character
    if (color === 'rainbow') {
        const charmIndex = state.charms.indexOf(emoji);
        color = getRainbowColor(charmIndex >= 0 ? charmIndex : Math.floor(Math.random() * 8));
    }
    
    const emojiImage = getEmojiImage(emoji, fontSize, color);
    const size = Math.ceil(fontSize * 1.2);
    
    // If image is already loaded, draw it immediately
    if (emojiImage.complete && emojiImage.naturalWidth > 0) {
        ctx.drawImage(emojiImage, x - size / 2, y - size / 2, size, size);
    } else {
        // Wait for image to load, then draw
        const drawWhenReady = () => {
            if (emojiImage.complete && emojiImage.naturalWidth > 0) {
                ctx.drawImage(emojiImage, x - size / 2, y - size / 2, size, size);
            } else {
                // Retry after a short delay
                setTimeout(drawWhenReady, 10);
            }
        };
        emojiImage.onload = drawWhenReady;
        
        // Immediate fallback: try text rendering while image loads
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${fontSize}px Georgia, Palatino, 'Palatino Linotype', 'Book Antiqua', Garamond, 'Times New Roman', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', emoji, serif`;
        ctx.fillStyle = color;
        ctx.fillText(emoji, x, y);
    }
}

// Draw charms on canvas (runs every frame, but doesn't recreate bodies)
// Uses individual sizes for each charm object
function drawCharms() {
    if (state.charmBodies.length === 0 || !state.ctx) return;
    
    state.charmBodies.forEach(body => {
        // Clamp position to canvas bounds (with padding for rendering)
        const padding = body.radius || 20;
        const x = Math.max(padding, Math.min(body.position.x, state.canvas.width - padding));
        const y = Math.max(padding, Math.min(body.position.y, state.canvas.height - padding));
        
        // Use stored size or default
        const fontSize = body.size || 30;
        
        state.ctx.save();
        state.ctx.translate(x, y);
        state.ctx.rotate(body.angle);
        
        // Use improved emoji rendering function
        renderEmojiOnCanvas(state.ctx, body.charm, 0, 0, fontSize);
        
        state.ctx.restore();
    });
}

function animate() {
    if (state.engine && state.currentStep === 5) {
        Matter.Engine.update(state.engine);
    }
    
    if (state.currentStep === 5) {
    renderCanvas();
    }
    
    requestAnimationFrame(animate);
}

function setupParallax() {
    let tiltX = 0;
    let tiltY = 0;
    
    // Device orientation
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', (e) => {
            if (state.currentStep === 5) {
                tiltX = (e.gamma || 0) / 45;
                tiltY = (e.beta || 0) / 45;
            applyParallax(tiltX, tiltY);
            }
        });
    }
    
    // Mouse move (desktop)
    if (state.canvas) {
    state.canvas.addEventListener('mousemove', (e) => {
            if (state.currentStep === 5) {
        const rect = state.canvas.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        tiltX = (e.clientX - centerX) / (rect.width / 2) * 0.3;
        tiltY = (e.clientY - centerY) / (rect.height / 2) * 0.3;
        applyParallax(tiltX, tiltY);
            }
    });
    
    state.canvas.addEventListener('mouseleave', () => {
            if (state.currentStep === 5) {
        applyParallax(0, 0);
                const wrapper = document.getElementById('holographic-wrapper');
                if (wrapper) {
                    wrapper.classList.remove('tilted');
                }
            }
    });
    
    // Click/tap on canvas to trigger shake
    state.canvas.addEventListener('click', (e) => {
        if (state.currentStep === 5 && state.charmBodies.length > 0) {
            triggerShake();
        }
    });
    
    // Touch support for mobile
    state.canvas.addEventListener('touchstart', (e) => {
        if (state.currentStep === 5 && state.charmBodies.length > 0) {
            e.preventDefault(); // Prevent default touch behavior
            triggerShake();
        }
    });
    }
}

function applyParallax(x, y) {
    if (!state.canvas) return;
    const wrapper = document.getElementById('holographic-wrapper');
    if (!wrapper) return;
    
    const maxTilt = 10;
    const rotateX = y * maxTilt;
    const rotateY = -x * maxTilt;
    
    // Apply transform to wrapper for holographic effect
    wrapper.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    
    // Add tilted class for enhanced holographic effects
    if (Math.abs(x) > 0.1 || Math.abs(y) > 0.1) {
        wrapper.classList.add('tilted');
    } else {
        wrapper.classList.remove('tilted');
    }
    
    // Update holographic overlay positions based on tilt
    const shine = wrapper.querySelector('.holo-shine');
    const glow = wrapper.querySelector('.holo-glow');
    const sparkle = wrapper.querySelector('.holo-sparkle');
    
    if (shine) {
        const offsetX = rotateY * 2;
        const offsetY = rotateX * 2;
        shine.style.backgroundPosition = `${50 + offsetX}% ${50 + offsetY}%`;
    }
    
    if (glow) {
        const offsetX = rotateY * 5;
        const offsetY = rotateX * 5;
        glow.style.backgroundPosition = `${50 + offsetX}% ${50 + offsetY}%`;
    }
}

function setupDeviceShakeDetection() {
    let lastAcceleration = { x: 0, y: 0, z: 0 };
    let lastTime = Date.now();
    let motionPermissionGranted = false;
    
    function handleDeviceMotion(event) {
        if (state.currentStep !== 5 || state.charmBodies.length === 0) return;
        
        const acceleration = event.accelerationIncludingGravity || event.acceleration;
        if (!acceleration) return;
        
        const currentTime = Date.now();
        const timeDelta = (currentTime - lastTime) / 1000; // Convert to seconds
        lastTime = currentTime;
        
        if (timeDelta < 0.01) return; // Skip if too fast
        
        // Calculate change in acceleration (jerk)
        const deltaX = acceleration.x - lastAcceleration.x;
        const deltaY = acceleration.y - lastAcceleration.y;
        const deltaZ = acceleration.z - lastAcceleration.z;
        
        // Calculate magnitude of shake
        const shakeMagnitude = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
        const threshold = 2.0; // Adjust sensitivity
        
        if (shakeMagnitude > threshold) {
            // Apply forces based on actual device movement
            const Body = Matter.Body;
            const forceMultiplier = Math.min(shakeMagnitude / 10, 0.3); // Cap max force
            
            state.charmBodies.forEach(body => {
                // Map device acceleration to canvas forces
                // Invert Y because screen Y is opposite to gravity Y
                const forceX = deltaX * forceMultiplier * 0.1;
                const forceY = -deltaY * forceMultiplier * 0.1; // Inverted
                
                Body.applyForce(body, body.position, {
                    x: forceX,
                    y: forceY
                });
            });
            
            // Play sound effect on significant shake
            if (shakeMagnitude > threshold * 1.5) {
                playShakeSound();
            }
            
            if (window.plausible && !state.isShaking) {
                state.isShaking = true;
                setTimeout(() => { state.isShaking = false; }, 1000);
            }
        }
        
        lastAcceleration = {
            x: acceleration.x || 0,
            y: acceleration.y || 0,
            z: acceleration.z || 0
        };
    }
    
    // Request permission for iOS 13+ on user interaction
    if (window.DeviceMotionEvent && typeof DeviceMotionEvent.requestPermission === 'function') {
        // Permission will be requested when user first interacts
        const requestPermissionOnInteraction = function() {
            DeviceMotionEvent.requestPermission()
                .then(response => {
                    if (response === 'granted') {
                        motionPermissionGranted = true;
                        window.addEventListener('devicemotion', handleDeviceMotion);
                    }
                })
                .catch(console.error);
            // Remove listener after first interaction
            document.removeEventListener('click', requestPermissionOnInteraction);
            document.removeEventListener('touchstart', requestPermissionOnInteraction);
        };
        document.addEventListener('click', requestPermissionOnInteraction, { once: true });
        document.addEventListener('touchstart', requestPermissionOnInteraction, { once: true });
    } else if (window.DeviceMotionEvent) {
        // Android and older iOS - no permission needed
        window.addEventListener('devicemotion', handleDeviceMotion);
    }
}

function triggerShake() {
    if (state.isShaking || state.charmBodies.length === 0 || state.currentStep !== 5) return;
    
    state.isShaking = true;
    const Body = Matter.Body;
    const force = 0.12; // Slightly reduced to prevent corner sticking
    
    // Apply random forces to all charms, but avoid corners
    state.charmBodies.forEach(body => {
        // Calculate distance from center
        const centerX = state.canvas.width / 2;
        const centerY = state.canvas.height / 2;
        const dx = body.position.x - centerX;
        const dy = body.position.y - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        
        // If too close to corner, push toward center
        if (distance > maxDistance * 0.7) {
            const angleToCenter = Math.atan2(-dy, -dx);
            const randomVariation = (Math.random() - 0.5) * 0.5;
            Body.applyForce(body, body.position, {
                x: Math.cos(angleToCenter + randomVariation) * force * 0.8,
                y: Math.sin(angleToCenter + randomVariation) * force * 0.8
            });
        } else {
            // Normal random shake
        const angle = Math.random() * Math.PI * 2;
        Body.applyForce(body, body.position, {
            x: Math.cos(angle) * force,
            y: Math.sin(angle) * force
        });
        }
    });
    
    // Play shake sound effect
    playShakeSound();
    
    
    setTimeout(() => {
        state.isShaking = false;
    }, 500);
}

function playShakeSound() {
    if (!state.audioContext) return;
    
    try {
        // Create a shaker-like sound effect using Web Audio API
        const oscillator = state.audioContext.createOscillator();
        const gainNode = state.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(state.audioContext.destination);
        
        // Create a "shake" sound - multiple quick tones
        const frequencies = [200, 250, 300, 350];
        const duration = 0.1;
        let currentTime = state.audioContext.currentTime;
        
        frequencies.forEach((freq, index) => {
            const osc = state.audioContext.createOscillator();
            const gain = state.audioContext.createGain();
            
            osc.connect(gain);
            gain.connect(state.audioContext.destination);
            
            osc.frequency.value = freq;
            osc.type = 'sine';
            
            gain.gain.setValueAtTime(0, currentTime);
            gain.gain.linearRampToValueAtTime(0.1, currentTime + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, currentTime + duration);
            
            osc.start(currentTime);
            osc.stop(currentTime + duration);
            
            currentTime += duration * 0.5;
        });
    } catch (e) {
        console.warn('Sound effect failed:', e);
    }
}

function generateShareLink() {
    if (!state.image) {
        alert('Please complete all steps first!');
        return;
    }
    
    // Encode state to base64
    const stateData = {
        filter: state.filter,
        charms: state.charms.join(''),
        image: state.image.toDataURL('image/jpeg', 0.8),
        message: state.customMessage || '',
        charmColor: state.charmColor || '#4A90E2',
        musicMuted: state.musicMuted || false
    };
    
    const encoded = btoa(JSON.stringify(stateData));
    const shareUrl = window.location.origin + window.location.pathname + '#' + encoded;
    
    document.getElementById('share-link').value = shareUrl;
    document.getElementById('share-modal').classList.remove('hidden');
    
    trackEvent('CardShared');
}

function copyShareLink() {
    const linkInput = document.getElementById('share-link');
    const text = linkInput.value;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Link copied to clipboard!');
        }).catch(() => {
            // Fallback for older browsers
            linkInput.select();
            document.execCommand('copy');
            alert('Link copied to clipboard!');
        });
    } else {
        // Fallback for older browsers
    linkInput.select();
    document.execCommand('copy');
    alert('Link copied to clipboard!');
    }
}

function loadFromHash() {
    try {
        const hash = window.location.hash.substring(1);
        if (!hash || hash.length === 0) {
            console.warn('Empty hash, skipping load');
            return;
        }
        
        const decoded = JSON.parse(atob(hash));
        
        // Validate required data
        if (!decoded.image) {
            console.error('Missing image data in share link');
            alert('Invalid share link: missing image data');
            return;
        }
        
        // Load image
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            state.image = canvas;
            
            // Load filter
            state.filter = decoded.filter || 'none';
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.filter === state.filter) {
                    btn.classList.add('active');
                }
            });
            
            // Load charms
            state.charms = decoded.charms ? decoded.charms.split('') : [];
            
            // Load charm color
            state.charmColor = decoded.charmColor || '#4A90E2';
            // Update color button selection
            document.querySelectorAll('.charm-color-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.color === state.charmColor) {
                    btn.classList.add('active');
                }
            });
            
            // Load custom message
            state.customMessage = decoded.message || '';
            
            // Load music mute state
            state.musicMuted = decoded.musicMuted || false;
            
            // Display custom message if provided
            const messageDisplay = document.getElementById('custom-message-display');
            if (state.customMessage && state.customMessage.trim()) {
                messageDisplay.style.display = 'block';
                messageDisplay.querySelector('p').textContent = state.customMessage;
            } else {
                messageDisplay.style.display = 'none';
            }
            
            // Go directly to final view
            goToStep(5);
            setTimeout(() => {
                initializeFinalView();
            }, 100);
        };
        img.onerror = () => {
            console.error('Failed to load image from share link');
            alert('Failed to load card from share link. The link may be invalid or corrupted.');
        };
        img.src = decoded.image;
    } catch (e) {
        console.error('Failed to load from hash:', e);
    }
}

async function exportVideo() {
    if (!state.image) {
        alert('Please complete all steps first!');
        return;
    }
    
    if (state.capturer !== null || state.mediaRecorder !== null) {
        alert('Export already in progress. Please wait.');
        return;
    }
    
    // Check if browser supports MediaRecorder with H.264 (MP4)
    const supportsH264 = MediaRecorder.isTypeSupported('video/mp4; codecs=avc1.42E01E') || 
                          MediaRecorder.isTypeSupported('video/mp4');
    
    // Ask user for format preference if H.264 is supported
    let useMP4 = false;
    if (supportsH264) {
        useMP4 = confirm('Export format:\n\nOK = MP4 (better for social media)\nCancel = WebM (smaller file size)\n\nNote: MP4 may not work in all browsers.');
    }
    
    // Use MediaRecorder API directly for better format control
    const stream = state.canvas.captureStream(30); // 30 fps
    
    let mimeType = 'video/webm; codecs=vp9';
    let fileExtension = 'webm';
    
    if (useMP4 && supportsH264) {
        // Try H.264 codec for MP4
        if (MediaRecorder.isTypeSupported('video/mp4; codecs=avc1.42E01E')) {
            mimeType = 'video/mp4; codecs=avc1.42E01E';
            fileExtension = 'mp4';
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            mimeType = 'video/mp4';
            fileExtension = 'mp4';
        }
    }
    
    const chunks = [];
    const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
    });
    
    recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
            chunks.push(e.data);
        }
    };
    
    recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        downloadBlob(blob, `shakecard-animation.${fileExtension}`);
        state.mediaRecorder = null;
        stream.getTracks().forEach(track => track.stop());
        
        trackEvent('VideoExported');
        alert(`Video export complete! Downloaded as ${fileExtension.toUpperCase()}.`);
    };
    
    recorder.onerror = (e) => {
        console.error('MediaRecorder error:', e);
        alert('Video export failed. Please try again.');
        state.mediaRecorder = null;
        stream.getTracks().forEach(track => track.stop());
    };
    
    state.mediaRecorder = recorder;
    recorder.start();
    
    // Simulate shake animation
    let frameCount = 0;
    const totalFrames = 150; // 5 seconds at 30fps
    let shakeProgress = 0;
    
    const exportLoop = () => {
        if (frameCount < totalFrames && recorder.state === 'recording') {
            shakeProgress = frameCount / totalFrames;
            const easeProgress = easeInOut(shakeProgress);
            
            // Apply shake forces
            if (frameCount % 5 === 0 && state.charmBodies.length > 0) {
                const Body = Matter.Body;
                const force = 0.1 * (1 - easeProgress);
                state.charmBodies.forEach(body => {
                    const angle = Math.random() * Math.PI * 2;
                    Body.applyForce(body, body.position, {
                        x: Math.cos(angle) * force,
                        y: Math.sin(angle) * force
                    });
                });
            }
            
            Matter.Engine.update(state.engine);
            renderCanvas();
            
            frameCount++;
            requestAnimationFrame(exportLoop);
        } else {
            if (recorder.state === 'recording') {
                recorder.stop();
            }
        }
    };
    
    exportLoop();
}

// Helper function to download blob
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

function resetToStart() {
    // Reset all state
    state.image = null;
    state.filter = 'none';
    state.charms = [];
    state.customMessage = '';
    state.lastCharmHash = '';
    
    // Clear charm bodies and walls
    if (state.charmBodies && state.charmBodies.length > 0) {
        state.charmBodies.forEach(body => Matter.World.remove(state.world, body));
    }
    if (state.walls && state.walls.length > 0) {
        state.walls.forEach(wall => Matter.World.remove(state.world, wall));
    }
    state.charmBodies = [];
    state.walls = [];
    
    // Reset UI elements
    const uploadInput = document.getElementById('image-upload');
    if (uploadInput) uploadInput.value = '';
    const uploadPreview = document.getElementById('upload-preview');
    if (uploadPreview) uploadPreview.classList.add('hidden');
    const charmInput = document.getElementById('charm-input');
    if (charmInput) charmInput.value = '';
    const messageInput = document.getElementById('custom-message-input');
    if (messageInput) messageInput.value = '';
    
    // Hide message display
    const messageDisplay = document.getElementById('custom-message-display');
    if (messageDisplay) messageDisplay.style.display = 'none';
    
    // Reset filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === 'none') btn.classList.add('active');
    });
    
    // Go back to welcome screen
    goToStep(0);
    
    trackEvent('NewCardStarted');
}
