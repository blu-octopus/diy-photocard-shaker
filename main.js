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
    charmBodies: [],
    walls: [],
    isShaking: false,
    capturer: null,
    lastCharmHash: '',
    currentStep: 0
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Get canvas elements
    state.canvas = document.getElementById('canvas');
    state.ctx = state.canvas?.getContext('2d');
    
    state.previewCanvas2 = document.getElementById('preview-canvas-2');
    state.previewCtx2 = state.previewCanvas2?.getContext('2d');
    
    state.previewCanvas3 = document.getElementById('preview-canvas-3');
    state.previewCtx3 = state.previewCanvas3?.getContext('2d');
    
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
    
    // Initialize shake detection
    if (typeof Shake !== 'undefined') {
        const shake = new Shake({
            threshold: 15,
            timeout: 1000
        });
        shake.start();
        window.addEventListener('shake', () => {
            if (state.currentStep === 4) {
                triggerShake();
            }
        });
    }
    
    // Parallax effect (only for final view)
    setupParallax();
    
    // Animation loop
    requestAnimationFrame(animate);
});

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
        if (input.length <= 5) {
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
    
    document.getElementById('step-3-back').addEventListener('click', () => goToStep(2));
    document.getElementById('step-3-done').addEventListener('click', () => {
        goToStep('loading');
        setTimeout(() => {
            goToStep(4);
            initializeFinalView();
        }, 1500);
    });
    
    // Step 4: Final view
    document.getElementById('share-btn').addEventListener('click', generateShareLink);
    document.getElementById('download-video-btn').addEventListener('click', exportVideo);
    document.getElementById('shake-btn').addEventListener('click', triggerShake);
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
    
    // Show progress bar for steps 1-3
    const progressContainer = document.getElementById('progress-container');
    if (step >= 1 && step <= 3) {
        progressContainer.style.display = 'block';
        updateProgress((step / 3) * 100);
        document.getElementById('current-step-num').textContent = step;
        const labels = ['', 'Upload Image', 'Choose Filter', 'Add Charms'];
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
    
    // Render previews when entering steps 2 or 3
    if (step === 2) {
        setTimeout(() => renderPreviewCanvas(2), 100);
    } else if (step === 3) {
        setTimeout(() => renderPreviewCanvas(3), 100);
    }
}

function updateProgress(percent) {
    document.getElementById('progress-fill').style.width = percent + '%';
}

function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        alert('Please upload a JPG, PNG, or WEBP image.');
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
            
            // Update preview
            const previewImg = document.getElementById('upload-preview-img');
            previewImg.src = resizedCanvas.toDataURL();
            document.getElementById('upload-preview').classList.remove('hidden');
            
            // Enable next button
            document.getElementById('step-1-next').disabled = false;
            document.getElementById('upload-status').textContent = `? Image loaded (${width}x${height})`;
            
            if (window.plausible) window.plausible('PhotocardCreated');
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
    
    // For step 3, also draw charms preview (static, showing ~20 objects concept)
    if (step === 3 && state.charms.length > 0) {
        const targetCount = 20;
        const objectsPerChar = Math.ceil(targetCount / state.charms.length);
        let drawn = 0;
        
        state.charms.forEach((charm) => {
            for (let i = 0; i < objectsPerChar && drawn < targetCount; i++) {
                const baseSize = 20;
                const sizeVariation = (Math.random() - 0.5) * 10;
                const fontSize = baseSize + sizeVariation;
                
                const x = Math.random() * (canvas.width - 40) + 20;
                const y = Math.random() * (canvas.height * 0.6) + 50;
                
                ctx.font = `${fontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(charm, x, y);
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
    
    // Set canvas size
    state.canvas.width = state.image.width;
    state.canvas.height = state.image.height;
    
    // Initialize charm physics
    updateCharmBodies();
    
    // Render initial canvas
    renderCanvas();
    
    if (window.plausible) window.plausible('CardCreated');
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
// Creates ~20 objects from 5 character input with size variation (¬y³Â shaker style)
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
    
    // Generate ~20 charm objects from the 5 character input
    // Each character appears multiple times with size variation
    const targetCount = 20;
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
        state.ctx.font = `${fontSize}px Arial`;
        state.ctx.textAlign = 'center';
        state.ctx.textBaseline = 'middle';
        state.ctx.fillText(body.charm, 0, 0);
        state.ctx.restore();
    });
}

function animate() {
    if (state.engine && state.currentStep === 4) {
        Matter.Engine.update(state.engine);
    }
    
    if (state.currentStep === 4) {
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
            if (state.currentStep === 4) {
                tiltX = (e.gamma || 0) / 45;
                tiltY = (e.beta || 0) / 45;
                applyParallax(tiltX, tiltY);
            }
        });
    }
    
    // Mouse move (desktop)
    if (state.canvas) {
        state.canvas.addEventListener('mousemove', (e) => {
            if (state.currentStep === 4) {
                const rect = state.canvas.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                tiltX = (e.clientX - centerX) / (rect.width / 2) * 0.3;
                tiltY = (e.clientY - centerY) / (rect.height / 2) * 0.3;
                applyParallax(tiltX, tiltY);
            }
        });
        
        state.canvas.addEventListener('mouseleave', () => {
            if (state.currentStep === 4) {
                applyParallax(0, 0);
            }
        });
    }
}

function applyParallax(x, y) {
    if (!state.canvas) return;
    const maxTilt = 10;
    const rotateX = y * maxTilt;
    const rotateY = -x * maxTilt;
    state.canvas.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
}

function triggerShake() {
    if (state.isShaking || state.charmBodies.length === 0 || state.currentStep !== 4) return;
    
    state.isShaking = true;
    const Body = Matter.Body;
    const force = 0.15;
    
    // Apply random forces to all charms
    state.charmBodies.forEach(body => {
        const angle = Math.random() * Math.PI * 2;
        Body.applyForce(body, body.position, {
            x: Math.cos(angle) * force,
            y: Math.sin(angle) * force
        });
    });
    
    if (window.plausible) window.plausible('ShakeTriggered');
    
    setTimeout(() => {
        state.isShaking = false;
    }, 500);
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
        image: state.image.toDataURL('image/jpeg', 0.8)
    };
    
    const encoded = btoa(JSON.stringify(stateData));
    const shareUrl = window.location.origin + window.location.pathname + '#' + encoded;
    
    document.getElementById('share-link').value = shareUrl;
    document.getElementById('share-modal').classList.remove('hidden');
    
    if (window.plausible) window.plausible('CardShared');
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
        const decoded = JSON.parse(atob(hash));
        
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
            
            // Go directly to final view
            goToStep(4);
            setTimeout(() => {
                initializeFinalView();
            }, 100);
        };
        img.src = decoded.image;
    } catch (e) {
        console.error('Failed to load from hash:', e);
    }
}

function exportVideo() {
    if (!state.image) {
        alert('Please complete all steps first!');
        return;
    }
    
    if (state.capturer !== null) {
        alert('Export already in progress. Please wait.');
        return;
    }
    
    if (typeof CCapture === 'undefined') {
        alert('CCapture.js not loaded. Video export unavailable.');
        return;
    }
    
    const capturer = new CCapture({
        format: 'webm',
        framerate: 30,
        quality: 90,
        name: 'shakecard-animation'
    });
    
    state.capturer = capturer;
    capturer.start();
    
    let frameCount = 0;
    const totalFrames = 150; // 5 seconds at 30fps
    let shakeProgress = 0;
    
    const exportLoop = () => {
        // Simulate shake animation with ease-in-out
        if (frameCount < totalFrames) {
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
            capturer.capture(state.canvas);
            
            frameCount++;
            requestAnimationFrame(exportLoop);
        } else {
            capturer.stop();
            capturer.save();
            state.capturer = null;
            
            if (window.plausible) window.plausible('VideoExported');
            alert('Video export complete!');
        }
    };
    
    exportLoop();
}

function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}
