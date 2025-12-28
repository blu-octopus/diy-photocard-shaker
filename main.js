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
    charmColor: '#7ED321', // Default green color for charms (rainbow order)
    backgroundMusic: null, // Background music audio element
    musicMuted: false, // Music mute state
    uiVisible: true, // UI visibility state (action bar visible/hidden)
    previewCharmPositions: [], // Store charm positions for preview to prevent regeneration
    homeBgCanvas: null, // Background charms canvas for home page
    homeBgCtx: null,
    homeBgBodies: [], // Physics bodies for background charms
    homeBgEngine: null, // Separate physics engine for background
    homeBgWorld: null,
    homeBgAnimationId: null // Animation frame ID for background
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
    
    // Initialize home page background charms canvas
    state.homeBgCanvas = document.getElementById('home-bg-charms');
    if (state.homeBgCanvas) {
        state.homeBgCtx = state.homeBgCanvas.getContext('2d');
        // Set canvas size to match viewport
        const resizeHomeBg = () => {
            if (!state.homeBgCanvas) return;
            state.homeBgCanvas.width = window.innerWidth;
            state.homeBgCanvas.height = window.innerHeight;
            // Update physics world boundaries if engine exists
            if (state.homeBgEngine && state.homeBgWorld) {
                // Remove old walls and recreate
                if (state.homeBgBodies.length > 0) {
                    // Walls are stored separately, but we'll recreate them
                    const World = Matter.World;
                    const Bodies = Matter.Bodies;
                    const wallThickness = 100;
                    const canvasWidth = state.homeBgCanvas.width;
                    const canvasHeight = state.homeBgCanvas.height;
                    
                    // Clear old walls (they're static, so we'll just recreate the world boundaries)
                    // For simplicity, we'll just update the canvas size
                    // The walls are positioned outside viewport so they should still work
                }
            }
        };
        resizeHomeBg();
        window.addEventListener('resize', resizeHomeBg);
        
        // Initialize background physics
        initializeHomeBackgroundCharms();
    }
    
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
    state.engine.world.gravity.y = 0.3; // Reduced gravity for slower, oil-like movement
    
    // Setup event listeners
    setupEventListeners();
    
    // Check for hash on load (skip to final view)
    if (window.location.hash && window.location.hash.length > 1) {
        loadFromHash();
        return;
    }
    
    // Initialize shake detection - use DeviceMotionEvent for real shake detection
    setupDeviceShakeDetection();
    
    // Setup home page card tilt effect
    setupHomeCardTilt();
    
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
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            goToStep(1);
        });
    }
    
    // Step 1: Upload
    const imageUpload = document.getElementById('image-upload');
    if (imageUpload) {
        imageUpload.addEventListener('change', handleImageUpload);
        imageUpload.addEventListener('input', handleImageUpload);
    }
    const step1Next = document.getElementById('step-1-next');
    if (step1Next) {
        step1Next.addEventListener('click', () => {
            if (state.image) goToStep(2);
        });
    }
    
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
    const step2Back = document.getElementById('step-2-back');
    if (step2Back) {
        step2Back.addEventListener('click', () => goToStep(1));
    }
    const step2Next = document.getElementById('step-2-next');
    if (step2Next) {
        step2Next.addEventListener('click', () => goToStep(3));
    }
    
    // Step 3: Charms
    const charmInput = document.getElementById('charm-input');
    if (charmInput) {
        charmInput.addEventListener('input', (e) => {
        const input = e.target.value;
            if (input.length <= 15) {
                state.charms = input.split('').filter(c => c !== '');
                renderPreviewCanvas(3);
            }
        });
    }
    
    document.querySelectorAll('.charm-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all preset buttons
            document.querySelectorAll('.charm-preset-btn').forEach(b => b.classList.remove('active', 'selected'));
            // Add active class to clicked button
            btn.classList.add('active', 'selected');
            state.charms = btn.dataset.charms.split('');
            const charmInputEl = document.getElementById('charm-input');
            if (charmInputEl) {
                charmInputEl.value = btn.dataset.charms;
            }
            renderPreviewCanvas(3);
        });
    });
    
    // Charm color selection
    document.querySelectorAll('.charm-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all color buttons
            document.querySelectorAll('.charm-color-btn').forEach(b => b.classList.remove('active', 'selected'));
            // Add active class to clicked button
            btn.classList.add('active', 'selected');
            // Update state
            state.charmColor = btn.dataset.color;
            // Clear emoji cache to force re-render with new color
            state.emojiCache.clear();
            // Re-render preview
            renderPreviewCanvas(3);
        });
    });
    
    const step3Back = document.getElementById('step-3-back');
    if (step3Back) {
        step3Back.addEventListener('click', () => goToStep(2));
    }
    const step3Next = document.getElementById('step-3-next');
    if (step3Next) {
        step3Next.addEventListener('click', () => goToStep(4));
    }
    
    // Step 4: Text Message
    const customMessageInput = document.getElementById('custom-message-input');
    if (customMessageInput) {
        customMessageInput.addEventListener('input', (e) => {
            state.customMessage = e.target.value;
            renderPreviewCanvas(4);
        });
    }
    const step4Back = document.getElementById('step-4-back');
    if (step4Back) {
        step4Back.addEventListener('click', () => goToStep(3));
    }
    const step4Done = document.getElementById('step-4-done');
    if (step4Done) {
        step4Done.addEventListener('click', () => {
            // Track "Generate Card" event
            trackEvent('GenerateCard');
            
            goToStep('loading');
            setTimeout(() => {
                goToStep(5);
                initializeFinalView();
            }, 1500);
        });
    }
    
    // Step 5: Final view
    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
        shareBtn.addEventListener('click', generateShareLink);
    }
    const downloadVideoBtn = document.getElementById('download-video-btn');
    if (downloadVideoBtn) {
        downloadVideoBtn.addEventListener('click', exportVideo);
    }
    const shakeBtn = document.getElementById('shake-btn');
    if (shakeBtn) {
        shakeBtn.addEventListener('click', triggerShake);
    }
    const makeAnotherBtn = document.getElementById('make-another-btn');
    if (makeAnotherBtn) {
        makeAnotherBtn.addEventListener('click', resetToStart);
    }
    
    // Sound toggle button
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener('click', toggleMusic);
    }
    
    // Visibility toggle for action bar
    const visibilityToggleBtn = document.getElementById('visibility-toggle-btn');
    if (visibilityToggleBtn) {
        visibilityToggleBtn.addEventListener('click', toggleActionBarVisibility);
    }
    const copyLinkBtn = document.getElementById('copy-link-btn');
    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', copyShareLink);
    }
    const shortenUrlBtn = document.getElementById('shorten-url-btn');
    if (shortenUrlBtn) {
        shortenUrlBtn.addEventListener('click', handleShortenUrl);
    }
    const closeShareModal = document.getElementById('close-share-modal');
    if (closeShareModal) {
        closeShareModal.addEventListener('click', () => {
            const shareModal = document.getElementById('share-modal');
            if (shareModal) {
                shareModal.classList.add('hidden');
            }
        });
    }
}

function goToStep(step) {
    // Stop music if leaving step 5
    if (state.currentStep === 5 && step !== 5 && state.backgroundMusic) {
        state.backgroundMusic.pause();
        state.backgroundMusic.currentTime = 0; // Reset to beginning
    }
    
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
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
        updateProgress((step / 4) * 100);
        const currentStepNum = document.getElementById('current-step-num');
        if (currentStepNum) {
            currentStepNum.textContent = step;
        }
        const labels = ['', 'Upload Image', 'Choose Filter', 'Add Charms', 'Add Message'];
        const stepLabel = document.getElementById('step-label');
        if (stepLabel) {
            stepLabel.textContent = labels[step];
        }
    } else {
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
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
    
    // Start/stop background animation based on step
    if (step === 0) {
        // Start background animation if not already running
        if (!state.homeBgAnimationId && state.homeBgCanvas) {
            animateHomeBackground();
        }
    } else {
        // Stop background animation when leaving home page
        if (state.homeBgAnimationId) {
            cancelAnimationFrame(state.homeBgAnimationId);
            state.homeBgAnimationId = null;
        }
    }
}

function updateProgress(percent) {
    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
        progressFill.style.width = percent + '%';
    }
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
        const uploadStatus = document.getElementById('upload-status');
        if (uploadStatus) {
            uploadStatus.textContent = '¡Ñ Upload failed';
        }
        const step1NextBtn = document.getElementById('step-1-next');
        if (step1NextBtn) {
            step1NextBtn.disabled = true;
        }
    };
    
    reader.onload = (event) => {
        const img = new Image();
        
        img.onerror = () => {
            alert('Failed to load image. Please try a different file.');
            const uploadStatus = document.getElementById('upload-status');
            if (uploadStatus) {
                uploadStatus.textContent = '¡Ñ Image load failed';
            }
            const step1NextBtn = document.getElementById('step-1-next');
            if (step1NextBtn) {
                step1NextBtn.disabled = true;
            }
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
            if (previewImg) {
                previewImg.src = resizedCanvas.toDataURL();
            }
            const uploadPreview = document.getElementById('upload-preview');
            if (uploadPreview) {
                uploadPreview.classList.remove('hidden');
            }
            
            // Enable next button
            const step1NextBtn = document.getElementById('step-1-next');
            if (step1NextBtn) {
                step1NextBtn.disabled = false;
            }
            const uploadStatus = document.getElementById('upload-status');
            if (uploadStatus) {
                uploadStatus.textContent = `${width} ¡Ñ ${height} pixels`;
            }
            
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
        // Check if we need to regenerate charm positions (only if charms or color changed)
        const currentCharmHash = state.charms.join('') + (state.charmColor || '');
        const needsRegeneration = !state.previewCharmPositions.length || 
                                  state.previewCharmPositions[0]?.charmHash !== currentCharmHash ||
                                  state.previewCharmPositions[0]?.canvasWidth !== canvas.width ||
                                  state.previewCharmPositions[0]?.canvasHeight !== canvas.height;
        
        if (needsRegeneration) {
            // Generate new positions
            state.previewCharmPositions = [];
            // Each character appears 3 times
            const objectsPerChar = 3;
            let drawn = 0;
            const targetCount = state.charms.length * objectsPerChar;
            
            state.charms.forEach((charm, charmIndex) => {
                for (let i = 0; i < objectsPerChar && drawn < targetCount; i++) {
                    const baseSize = 20;
                    const sizeVariation = (Math.random() - 0.5) * 10;
                    const fontSize = baseSize + sizeVariation;
                    
                    const x = Math.random() * (canvas.width - 40) + 20;
                    const y = Math.random() * (canvas.height * 0.6) + 50;
                    
                    // Get color for rainbow mode
                    let color = state.charmColor || '#7ED321';
                    if (color === 'rainbow') {
                        color = getRainbowColor(charmIndex);
                    }
                    
                    state.previewCharmPositions.push({
                        charm,
                        charmIndex,
                        x,
                        y,
                        fontSize,
                        color,
                        charmHash: currentCharmHash,
                        canvasWidth: canvas.width,
                        canvasHeight: canvas.height
                    });
                    drawn++;
                }
            });
        }
        
        // Draw stored charm positions (don't regenerate)
        state.previewCharmPositions.forEach(pos => {
            ctx.save();
            renderEmojiOnCanvas(ctx, pos.charm, pos.x, pos.y, pos.fontSize, pos.color);
            ctx.restore();
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

// Toggle action bar visibility
function toggleActionBarVisibility() {
    const actionBar = document.querySelector('#step-5 .action-bar');
    const visibilityIcon = document.getElementById('visibility-icon');
    
    if (!actionBar || !visibilityIcon) return;
    
    // Toggle visibility
    if (actionBar.style.display === 'none') {
        actionBar.style.display = '';
        state.uiVisible = true;
        visibilityIcon.textContent = 'visibility';
        visibilityIcon.classList.remove('text-gray-400');
        visibilityIcon.classList.add('text-gray-700');
    } else {
        actionBar.style.display = 'none';
        state.uiVisible = false;
        visibilityIcon.textContent = 'visibility_off';
        visibilityIcon.classList.remove('text-gray-700');
        visibilityIcon.classList.add('text-gray-400');
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
    
    // Continuous anti-stuck check: push charms away from corners
    if (state.charmBodies.length > 0) {
        const cornerThreshold = 25;
        const canvasWidth = state.canvas.width;
        const canvasHeight = state.canvas.height;
        const Body = Matter.Body;
        
        state.charmBodies.forEach(body => {
            const x = body.position.x;
            const y = body.position.y;
            
            // Check if stuck near corner
            const nearLeft = x < cornerThreshold;
            const nearRight = x > canvasWidth - cornerThreshold;
            const nearTop = y < cornerThreshold;
            const nearBottom = y > canvasHeight - cornerThreshold;
            
            if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
                // Apply small continuous force away from corner
                const centerX = canvasWidth / 2;
                const centerY = canvasHeight / 2;
                const dx = centerX - x;
                const dy = centerY - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    Body.applyForce(body, body.position, {
                        x: (dx / distance) * 0.02, // Small continuous force
                        y: (dy / distance) * 0.02
                    });
                }
            }
        });
    }
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
    
    // Top, bottom, left, right walls - positioned AT canvas boundaries to prevent corner sticking
    const walls = [
        Bodies.rectangle(canvasWidth / 2, 0, canvasWidth, wallThickness, { isStatic: true, label: 'wall' }),
        Bodies.rectangle(canvasWidth / 2, canvasHeight, canvasWidth, wallThickness, { isStatic: true, label: 'wall' }),
        Bodies.rectangle(0, canvasHeight / 2, wallThickness, canvasHeight, { isStatic: true, label: 'wall' }),
        Bodies.rectangle(canvasWidth, canvasHeight / 2, wallThickness, canvasHeight, { isStatic: true, label: 'wall' })
    ];
    
    state.walls = walls;
    World.add(state.world, walls);
    
    // Generate charm objects: each character generates exactly 3 objects
    const objectsPerChar = 3;
    const targetCount = state.charms.length * objectsPerChar;
    
    state.charms.forEach((charm, charIndex) => {
        for (let i = 0; i < objectsPerChar; i++) {
            // Size variation: base size 25-50px (up to 50% variation from base 30px)
            const baseSize = 30;
            const sizeVariation = (Math.random() - 0.5) * 25; // -12.5 to +12.5 (up to ~42% variation)
            const radius = Math.max(12, Math.min(25, (baseSize + sizeVariation) / 2)); // Clamp between 12-25px radius
            
            // Random starting position within canvas
            const x = Math.random() * (canvasWidth - 100) + 50;
            const y = Math.random() * (canvasHeight * 0.3) + 20; // Start in upper third
            
            // Create circular body with physics properties for oil-like slow flow
            const body = Bodies.circle(x, y, radius, {
                restitution: 0.3, // Less bouncy, more dampened
                friction: 0.1,   // Slightly more friction
                frictionAir: 0.15, // High air resistance for slow, oil-like movement
                density: 0.001,  // Slightly heavier for slower fall
                chamfer: { radius: 2 } // Slightly rounded edges
            });
            
            // Store charm character, index, and size for rendering
        body.charm = charm;
            body.charmIndex = charIndex; // Store original charm index for rainbow color
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
    let color = colorOverride || state.charmColor || '#7ED321';
    
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
    let color = colorOverride || state.charmColor || '#7ED321';
    
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
        
        // Calculate color for rainbow mode based on stored charmIndex
        let colorOverride = null;
        if (state.charmColor === 'rainbow' && body.charmIndex !== undefined) {
            colorOverride = getRainbowColor(body.charmIndex);
        }
        
        // Use improved emoji rendering function
        renderEmojiOnCanvas(state.ctx, body.charm, 0, 0, fontSize, colorOverride);
        
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

// Initialize background charms for home page
function initializeHomeBackgroundCharms() {
    if (!state.homeBgCanvas || !state.homeBgCtx) return;
    
    const Engine = Matter.Engine;
    const World = Matter.World;
    const Bodies = Matter.Bodies;
    
    // Create separate physics engine for background
    state.homeBgEngine = Engine.create();
    state.homeBgWorld = state.homeBgEngine.world;
    state.homeBgEngine.world.gravity.y = 0.2; // Very slow gravity
    
    // Set canvas size
    state.homeBgCanvas.width = window.innerWidth;
    state.homeBgCanvas.height = window.innerHeight;
    
    // Create wall boundaries
    const wallThickness = 100;
    const canvasWidth = state.homeBgCanvas.width;
    const canvasHeight = state.homeBgCanvas.height;
    
    const walls = [
        Bodies.rectangle(canvasWidth / 2, -wallThickness / 2, canvasWidth, wallThickness, { isStatic: true }),
        Bodies.rectangle(canvasWidth / 2, canvasHeight + wallThickness / 2, canvasWidth, wallThickness, { isStatic: true }),
        Bodies.rectangle(-wallThickness / 2, canvasHeight / 2, wallThickness, canvasHeight, { isStatic: true }),
        Bodies.rectangle(canvasWidth + wallThickness / 2, canvasHeight / 2, wallThickness, canvasHeight, { isStatic: true })
    ];
    
    World.add(state.homeBgWorld, walls);
    
    // Generate background charm text - use decorative symbols
    const bgCharms = ['?', '?', '?', '?', '?', ':', '*', '+', '??', '?', '?', '?', '?', '?', '?', '?'];
    const numCharms = 30; // Number of background charms
    
    for (let i = 0; i < numCharms; i++) {
        const charm = bgCharms[Math.floor(Math.random() * bgCharms.length)];
        const baseSize = 20 + Math.random() * 15; // 20-35px
        const radius = baseSize / 2;
        
        // Random starting position
        const x = Math.random() * canvasWidth;
        const y = Math.random() * canvasHeight;
        
        // Create body with slow, oil-like physics
        const body = Bodies.circle(x, y, radius, {
            restitution: 0.2,
            friction: 0.1,
            frictionAir: 0.2, // High air resistance for slow movement
            density: 0.001
        });
        
        body.charm = charm;
        body.size = baseSize;
        body.radius = radius;
        
        state.homeBgBodies.push(body);
        World.add(state.homeBgWorld, body);
    }
    
    // Start animation loop if on step 0
    if (state.currentStep === 0) {
        animateHomeBackground();
    }
}

// Animate background charms
function animateHomeBackground() {
    if (state.currentStep !== 0 || !state.homeBgCanvas || !state.homeBgCtx) {
        if (state.homeBgAnimationId) {
            cancelAnimationFrame(state.homeBgAnimationId);
            state.homeBgAnimationId = null;
        }
        return;
    }
    
    // Update physics
    Matter.Engine.update(state.homeBgEngine);
    
    // Clear canvas
    state.homeBgCtx.clearRect(0, 0, state.homeBgCanvas.width, state.homeBgCanvas.height);
    
    // Draw charms in white
    state.homeBgBodies.forEach(body => {
        const x = body.position.x;
        const y = body.position.y;
        const fontSize = body.size;
        
        state.homeBgCtx.save();
        state.homeBgCtx.translate(x, y);
        state.homeBgCtx.rotate(body.angle);
        
        state.homeBgCtx.textAlign = 'center';
        state.homeBgCtx.textBaseline = 'middle';
        state.homeBgCtx.font = `${fontSize}px Georgia, Palatino, 'Palatino Linotype', 'Book Antiqua', Garamond, 'Times New Roman', serif`;
        state.homeBgCtx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // Semi-transparent white
        state.homeBgCtx.fillText(body.charm, 0, 0);
        
        state.homeBgCtx.restore();
    });
    
    state.homeBgAnimationId = requestAnimationFrame(animateHomeBackground);
}

// Setup home page card tilt effect (mouse on desktop, device motion on mobile)
function setupHomeCardTilt() {
    const card = document.getElementById('home-card');
    if (!card) return;
    
    let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let lastAcceleration = { x: 0, y: 0, z: 0 };
    
    // Mouse move handler for desktop tilt
    function handleMouseMove(event) {
        if (state.currentStep !== 0) return; // Only on home page
        if (isMobile) return; // Skip on mobile
        
        const rect = card.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Calculate tilt based on mouse position
        const tiltX = ((event.clientY - centerY) / (rect.height / 2)) * 8; // Max 8deg
        const tiltY = ((event.clientX - centerX) / (rect.width / 2)) * -8; // Max 8deg (inverted)
        
        card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
    }
    
    // Device motion handler for mobile tilt
    function handleDeviceMotion(event) {
        if (state.currentStep !== 0) return; // Only on home page
        
        const acceleration = event.accelerationIncludingGravity || event.acceleration;
        if (!acceleration) return;
        
        // Smooth the acceleration values
        const smoothFactor = 0.3;
        const smoothX = lastAcceleration.x + (acceleration.x - lastAcceleration.x) * smoothFactor;
        const smoothY = lastAcceleration.y + (acceleration.y - lastAcceleration.y) * smoothFactor;
        
        // Map acceleration to tilt (inverted for natural feel)
        const tiltX = Math.max(-10, Math.min(10, smoothY * 2)); // Max 10deg
        const tiltY = Math.max(-10, Math.min(10, -smoothX * 2)); // Max 10deg (inverted)
        
        card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(1.02)`;
        
        lastAcceleration = { x: smoothX, y: smoothY, z: acceleration.z || 0 };
    }
    
    // Reset tilt when mouse leaves
    function handleMouseLeave() {
        if (state.currentStep !== 0) return;
        if (isMobile) return;
        card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
    }
    
    // Desktop mouse events
    if (!isMobile) {
        card.addEventListener('mousemove', handleMouseMove);
        card.addEventListener('mouseleave', handleMouseLeave);
    }
    
    // Mobile device motion
    if (isMobile && window.DeviceMotionEvent) {
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
            // iOS 13+ - request permission on interaction
            document.addEventListener('touchstart', function requestPermissionOnce() {
                DeviceMotionEvent.requestPermission()
                    .then(response => {
                        if (response === 'granted') {
                            window.addEventListener('devicemotion', handleDeviceMotion);
                        }
                    })
                    .catch(console.error);
                document.removeEventListener('touchstart', requestPermissionOnce);
            }, { once: true });
        } else {
            // Android or older iOS
            window.addEventListener('devicemotion', handleDeviceMotion);
        }
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
    const force = 0.15; // Increased force for better shake effect
    
    // Define corner regions (within 30px of corners)
    const cornerThreshold = 30;
    const canvasWidth = state.canvas.width;
    const canvasHeight = state.canvas.height;
    
    state.charmBodies.forEach(body => {
        const x = body.position.x;
        const y = body.position.y;
        
        // Check if in corner region
        const nearLeft = x < cornerThreshold;
        const nearRight = x > canvasWidth - cornerThreshold;
        const nearTop = y < cornerThreshold;
        const nearBottom = y > canvasHeight - cornerThreshold;
        
        if ((nearLeft || nearRight) && (nearTop || nearBottom)) {
            // In corner - push toward center more aggressively
            const centerX = canvasWidth / 2;
            const centerY = canvasHeight / 2;
            const dx = centerX - x;
            const dy = centerY - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                const pushForce = force * 1.5; // Stronger push from corners
                Body.applyForce(body, body.position, {
                    x: (dx / distance) * pushForce,
                    y: (dy / distance) * pushForce
                });
            }
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
    
    try {
        // Create a smaller canvas for share links to keep URL short
        const maxShareDimension = 400; // Max width or height for share links
        let shareCanvas = document.createElement('canvas');
        let shareCtx = shareCanvas.getContext('2d');
        
        // Calculate dimensions to fit within maxShareDimension while maintaining aspect ratio
        let shareWidth = state.image.width;
        let shareHeight = state.image.width ? state.image.height : shareWidth;
        
        // Get actual dimensions if state.image is a canvas
        if (state.image instanceof HTMLCanvasElement) {
            shareWidth = state.image.width;
            shareHeight = state.image.height;
        } else if (state.image instanceof HTMLImageElement) {
            shareWidth = state.image.naturalWidth || state.image.width;
            shareHeight = state.image.naturalHeight || state.image.height;
        }
        
        const aspectRatio = shareWidth / shareHeight;
        if (shareWidth > shareHeight) {
            shareWidth = Math.min(shareWidth, maxShareDimension);
            shareHeight = shareWidth / aspectRatio;
        } else {
            shareHeight = Math.min(shareHeight, maxShareDimension);
            shareWidth = shareHeight * aspectRatio;
        }
        
        shareCanvas.width = Math.round(shareWidth);
        shareCanvas.height = Math.round(shareHeight);
        
        // Draw resized image
        shareCtx.drawImage(state.image, 0, 0, shareCanvas.width, shareCanvas.height);
        
        // Use lower quality for share links to keep URL manageable
        let quality = 0.5; // Start with lower quality
        let imageDataUrl = shareCanvas.toDataURL('image/jpeg', quality);
        
        // If URL is still too long, reduce quality further
        while (imageDataUrl.length > 500000 && quality > 0.2) { // ~500KB limit
            quality -= 0.05;
            imageDataUrl = shareCanvas.toDataURL('image/jpeg', quality);
        }
        
    const stateData = {
        filter: state.filter,
        charms: state.charms.join(''),
            image: imageDataUrl,
            message: state.customMessage || '',
            charmColor: state.charmColor || '#7ED321',
            musicMuted: state.musicMuted || false,
            uiVisible: state.uiVisible !== undefined ? state.uiVisible : true
    };
    
    const encoded = btoa(JSON.stringify(stateData));
    const shareUrl = window.location.origin + window.location.pathname + '#' + encoded;
    
        // Check if URL is too long (browser limit is typically ~2000-8000 chars, use 6000 for safety)
        if (shareUrl.length > 6000) {
            console.warn('Share URL is very long:', shareUrl.length, 'characters');
            // Try with even lower quality and smaller size
            const smallerSize = 300;
            if (shareWidth > shareHeight) {
                shareWidth = smallerSize;
                shareHeight = shareWidth / aspectRatio;
            } else {
                shareHeight = smallerSize;
                shareWidth = shareHeight * aspectRatio;
            }
            shareCanvas.width = Math.round(shareWidth);
            shareCanvas.height = Math.round(shareHeight);
            shareCtx.drawImage(state.image, 0, 0, shareCanvas.width, shareCanvas.height);
            quality = 0.4;
            imageDataUrl = shareCanvas.toDataURL('image/jpeg', quality);
            stateData.image = imageDataUrl;
            const newEncoded = btoa(JSON.stringify(stateData));
            const newShareUrl = window.location.origin + window.location.pathname + '#' + newEncoded;
            
            if (newShareUrl.length > 6000) {
                alert('Image is too large for share link. Please try with a smaller image.');
                return;
            }
            
            const shareLinkInput = document.getElementById('share-link');
            const shareModal = document.getElementById('share-modal');
            
            if (!shareLinkInput || !shareModal) {
                console.error('Share modal elements not found');
                alert('Error: Share modal not found. Please refresh the page.');
                return;
            }
            
            shareLinkInput.value = newShareUrl;
            shareModal.classList.remove('hidden');
        } else {
            const shareLinkInput = document.getElementById('share-link');
            const shareModal = document.getElementById('share-modal');
            
            if (!shareLinkInput || !shareModal) {
                console.error('Share modal elements not found');
                alert('Error: Share modal not found. Please refresh the page.');
                return;
            }
            
            shareLinkInput.value = shareUrl;
            shareModal.classList.remove('hidden');
        }
        
        trackEvent('CardShared');
    } catch (e) {
        console.error('Error generating share link:', e);
        alert('Failed to generate share link: ' + e.message);
    }
}

// Handle shorten URL button click
async function handleShortenUrl() {
    const shareLinkInput = document.getElementById('share-link');
    if (!shareLinkInput || !shareLinkInput.value) {
        alert('No URL to shorten');
        return;
    }
    
    const longUrl = shareLinkInput.value;
    const shortenBtn = document.getElementById('shorten-url-btn');
    
    // Show loading state
    if (shortenBtn) {
        shortenBtn.disabled = true;
        shortenBtn.innerHTML = '<span class="material-icons" style="vertical-align: middle; margin-right: 8px;">hourglass_empty</span> Shortening...';
    }
    
    try {
        const shortUrl = await shortenUrl(longUrl);
        if (shortUrl && shortUrl !== longUrl) {
            shareLinkInput.value = shortUrl;
            if (shortenBtn) {
                shortenBtn.innerHTML = '<span class="material-icons" style="vertical-align: middle; margin-right: 8px;">check</span> Shortened';
                setTimeout(() => {
                    shortenBtn.innerHTML = '<span class="material-icons" style="vertical-align: middle; margin-right: 8px;">link</span> Shorten';
                    shortenBtn.disabled = false;
                }, 2000);
            }
        } else {
            alert('Failed to shorten URL. Please try again.');
            if (shortenBtn) {
                shortenBtn.disabled = false;
                shortenBtn.innerHTML = '<span class="material-icons" style="vertical-align: middle; margin-right: 8px;">link</span> Shorten';
            }
        }
    } catch (err) {
        console.error('URL shortening failed:', err);
        alert('Failed to shorten URL. Please try again.');
        if (shortenBtn) {
            shortenBtn.disabled = false;
            shortenBtn.innerHTML = '<span class="material-icons" style="vertical-align: middle; margin-right: 8px;">link</span> Shorten';
        }
    }
}

// Shorten URL using is.gd service (free, no auth required)
async function shortenUrl(longUrl) {
    try {
        // Use is.gd API - free URL shortener, no authentication needed
        const apiUrl = `https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        if (data.shorturl) {
            return data.shorturl;
        } else {
            throw new Error(data.errormessage || 'Failed to shorten URL');
        }
    } catch (error) {
        console.warn('URL shortening error:', error);
        // Fallback: try v.gd if is.gd fails
        try {
            const apiUrl = `https://v.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
            const response = await fetch(apiUrl);
            const data = await response.json();
            
            if (data.shorturl) {
                return data.shorturl;
            }
        } catch (fallbackError) {
            console.warn('Fallback URL shortening also failed:', fallbackError);
        }
        
        // Return original URL if shortening fails
        return longUrl;
    }
}

function copyShareLink() {
    const linkInput = document.getElementById('share-link');
    if (!linkInput) {
        console.error('Share link input not found');
        alert('Error: Share link input not found.');
        return;
    }
    
    const text = linkInput.value;
    if (!text || text.trim() === '') {
        alert('No link to copy. Please generate a share link first.');
        return;
    }
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            alert('Link copied to clipboard!');
        }).catch((err) => {
            console.warn('Clipboard API failed, using fallback:', err);
            // Fallback for older browsers or when clipboard API fails
            try {
    linkInput.select();
                linkInput.setSelectionRange(0, 99999); // For mobile devices
                const successful = document.execCommand('copy');
                if (successful) {
    alert('Link copied to clipboard!');
                } else {
                    alert('Failed to copy link. Please select and copy manually.');
                }
            } catch (e) {
                console.error('Fallback copy failed:', e);
                alert('Failed to copy link. Please select and copy manually.');
            }
        });
    } else {
        // Fallback for older browsers
        try {
            linkInput.select();
            linkInput.setSelectionRange(0, 99999); // For mobile devices
            const successful = document.execCommand('copy');
            if (successful) {
                alert('Link copied to clipboard!');
            } else {
                alert('Failed to copy link. Please select and copy manually.');
            }
        } catch (e) {
            console.error('Copy failed:', e);
            alert('Failed to copy link. Please select and copy manually.');
        }
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
            state.charmColor = decoded.charmColor || '#7ED321';
            // Update color button selection
            document.querySelectorAll('.charm-color-btn').forEach(btn => {
                btn.classList.remove('active', 'selected');
                if (btn.dataset.color === state.charmColor) {
                    btn.classList.add('active', 'selected');
                }
            });
            
            // Load custom message
            state.customMessage = decoded.message || '';
            
            // Load music mute state
            state.musicMuted = decoded.musicMuted || false;
            
            // Load UI visibility state (support both old hideUI and new uiVisible)
            if (decoded.uiVisible !== undefined) {
                state.uiVisible = decoded.uiVisible;
            } else if (decoded.hideUI !== undefined) {
                // Backward compatibility with old hideUI format
                state.uiVisible = !decoded.hideUI;
            } else {
                state.uiVisible = true; // Default to visible
            }
            
            // Display custom message if provided
            const messageDisplay = document.getElementById('custom-message-display');
            if (state.customMessage && state.customMessage.trim()) {
                messageDisplay.style.display = 'block';
                messageDisplay.querySelector('p').textContent = state.customMessage;
            } else {
                messageDisplay.style.display = 'none';
            }
            
            // Apply UI visibility state
            const actionBar = document.querySelector('#step-5 .action-bar');
            const visibilityIcon = document.getElementById('visibility-icon');
            if (actionBar) {
                if (!state.uiVisible) {
                    actionBar.style.display = 'none';
                    if (visibilityIcon) {
                        visibilityIcon.textContent = 'visibility_off';
                        visibilityIcon.classList.remove('text-gray-700');
                        visibilityIcon.classList.add('text-gray-400');
                    }
                } else {
                    actionBar.style.display = '';
                    if (visibilityIcon) {
                        visibilityIcon.textContent = 'visibility';
                        visibilityIcon.classList.remove('text-gray-400');
                        visibilityIcon.classList.add('text-gray-700');
                    }
                }
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
    
    // Check if browser supports MediaRecorder
    if (typeof MediaRecorder === 'undefined') {
        alert('Video export is not supported in this browser. Please try a modern browser like Chrome, Firefox, or Edge.');
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
    
    // Check if canvas supports captureStream
    if (!state.canvas || typeof state.canvas.captureStream !== 'function') {
        alert('Video export is not supported in this browser. Please try a modern browser like Chrome, Firefox, or Edge.');
        return;
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
    // Stop music if playing
    if (state.backgroundMusic) {
        state.backgroundMusic.pause();
        state.backgroundMusic.currentTime = 0;
    }
    
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
