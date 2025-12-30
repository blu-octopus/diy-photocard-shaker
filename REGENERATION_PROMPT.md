# Regeneration Prompt: Digital Holiday Greeting Interactive Card

## Project Overview
Build a single-page interactive digital greeting card with physics-based floating text charms, parallax effects, and background music. The card loads a pre-configured image and displays floating text characters that respond to shake interactions and device motion.

## Technical Stack
- **HTML5** - Single page structure
- **Tailwind CSS** (CDN) - Layout and styling
- **Vanilla JavaScript** - All logic
- **Canvas API** - Image and text rendering
- **Matter.js 0.19.0** (CDN) - 2D physics engine
- **Material Icons** (Google Fonts) - UI icons
- **Noto Sans TC** (Google Fonts) - Chinese font support

## File Structure
```
project/
¢u¢w¢w index.html          # Single HTML page
¢u¢w¢w main.js             # All JavaScript logic
¢|¢w¢w assets/
    ¢u¢w¢w cat.jpg         # Card base image
    ¢|¢w¢w 8-bit happy birthday.mp3  # Background music
```

## HTML Structure (`index.html`)

### Required Elements:
1. **Full-screen container** (`#step-5`) with class `step active` - Contains entire card view
2. **Techy background** - Dark blue gradient with grid pattern and radial glow
3. **Canvas** (`#canvas`) - Inside `#holographic-wrapper` div
4. **Holographic wrapper** (`#holographic-wrapper`) - Contains canvas and overlay effects
5. **Sound toggle button** (`#sound-toggle-btn`) - Fixed top-right, white circular button
6. **Shake button** (`#shake-btn`) - Fixed bottom-center, blue gradient, pulse animation
7. **Custom message display** (`#custom-message-display`) - Below canvas, white text
8. **Audio element** (`#background-music`) - Hidden, loops, source: `assets/8-bit happy birthday.mp3`

### CSS Requirements:
- **Body font**: Hoefler Text with serif fallbacks
- **Techy background**: Linear gradient `#0f172a ¡÷ #1e293b ¡÷ #334155` with grid overlay and radial glow
- **Holographic effects**: Three overlay layers (shine, glow, sparkle) activated on hover/tilt
- **Canvas styling**: Rounded corners (12px), shadow, max-width 90vw, max-height 70vh
- **Shake button**: Blue gradient (`#3b82f6 ¡÷ #6366f1 ¡÷ #3b82f6`), pulse animation, rounded-full

## JavaScript Structure (`main.js`)

### State Object
```javascript
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
    musicMuted: false         // Music mute state
};
```

### Core Functions Required

#### 1. `initializeApp()`
- Gets canvas element and context
- Creates temporary canvas for text rendering (100x100)
- Initializes Web Audio API context
- Creates Matter.js engine with gravity 0.3 (oil-like slow movement)
- Sets up event listeners
- Calls `loadAnasCard()` after 200ms delay
- Sets up device shake detection
- Sets up parallax effects
- Starts animation loop with `requestAnimationFrame(animate)`

#### 2. `loadAnasCard()`
- Creates new Image object
- Loads `assets/cat.jpg`
- On load:
  - Resizes image to max 720px width (maintains aspect ratio)
  - Creates canvas with exact image dimensions
  - Draws image to canvas
  - Sets state: `image` (canvas), `charms` = `'HAPPY 24 BIRTHDAY'.split('')`, `customMessage` = `'Happy Birthday Ana! Looking forward to spending more time with you!'`, `charmColor` = `'rainbow'`, `musicMuted` = `false`
  - Displays custom message
  - Calls `initializeFinalView()` after 100ms delay

#### 3. `initializeFinalView()`
- Validates image, canvas, and context exist
- Sets canvas internal dimensions (`canvas.width/height`) to match image exactly (1:1 pixel mapping)
- Resets Matter.js gravity to default (y: 0.3, x: 0)
- Calls `updateCharmBodies()` to create physics bodies
- Calls `renderCanvas()` for initial render
- Displays custom message if provided
- Calls `initializeBackgroundMusic()`

#### 4. `renderCanvas()`
- Validates image, canvas, and context
- Ensures canvas dimensions match image dimensions (recreates physics if needed)
- Clears canvas
- Draws image with filter (1:1 pixel mapping)
- Calls `updateCharmBodies()` (only recreates if charms changed)
- Calls `drawCharms()` to render all charms
- Applies continuous anti-stuck corner detection (pushes charms away from corners)

#### 5. `updateCharmBodies()`
- Creates hash from charms array
- Only recreates bodies if hash changed (optimization)
- Clears existing bodies and walls from Matter.js world
- Validates canvas has valid dimensions
- Creates 4 wall boundaries at canvas edges (top, bottom, left, right) with 50px thickness
- For each character in `state.charms`:
  - Creates exactly 1 Matter.js circle body
  - Size: random radius between 12-25px (base 30px with variation)
  - Position: random within canvas (x: 50 to width-50, y: 20 to height*0.3)
  - Physics properties: `restitution: 0.3`, `friction: 0.1`, `frictionAir: 0.15`, `density: 0.001`, `chamfer: { radius: 2 }`
  - Stores charm character, index, radius, and size on body
  - Adds body to world

#### 6. `drawCharms()`
- Iterates through `state.charmBodies`
- For each body:
  - Clamps position to canvas bounds with padding
  - Gets fontSize from body.size
  - Saves context, translates to position, rotates by body.angle
  - Calculates color override if rainbow mode (uses `getRainbowColor(body.charmIndex)`)
  - Calls `renderEmojiOnCanvas()` to draw character
  - Restores context

#### 7. `renderEmojiOnCanvas(ctx, emoji, x, y, fontSize, colorOverride)`
- Determines color (uses override or state.charmColor, handles rainbow mode)
- Detects if character is CJK (Chinese/Japanese/Korean) or regular text
- For CJK/text:
  - Uses Hoefler Text as primary font: `'Hoefler Text', serif`
  - Adds serif fallbacks: `'Baskerville', 'Bodoni MT', 'Didot', 'Goudy Old Style', 'Garamond', 'Palatino Linotype', 'Book Antiqua', 'Times New Roman', Georgia, serif`
  - Checks for Chinese serif fonts (Noto Serif TC, Source Han Serif TC) and prepends if available
  - Adds Chinese sans-serif fallbacks
  - Sets font, fillStyle, text rendering quality
  - Draws text directly on canvas
- For emojis:
  - Uses `getEmojiImage()` for cached rendering
  - Draws image, with text fallback while loading

#### 8. `getEmojiImage(emoji, fontSize, colorOverride)`
- Creates cache key from emoji, fontSize, color
- Returns cached image if available and loaded
- Creates temporary canvas (size = fontSize * 2)
- Uses Hoefler Text font stack (same as `renderEmojiOnCanvas`)
- Renders text to temporary canvas
- Converts to Image object and caches
- Returns image

#### 9. `getRainbowColor(index)`
- Returns pastel color from array: `['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA', '#FFB3E6', '#C7CEEA', '#FFD3A5', '#A8E6CF']`
- Uses modulo to cycle through colors

#### 10. `triggerShake()`
- Prevents multiple simultaneous shakes (checks `state.isShaking`)
- Sets `isShaking` flag
- Applies force 0.15 to all charm bodies
- For charms near corners (within 30px):
  - Pushes toward center with force * 1.5
- For other charms:
  - Applies random direction force
- Calls `playShakeSound()`
- Resets `isShaking` flag after 500ms

#### 11. `playShakeSound()`
- Uses Web Audio API
- Creates oscillator (sine wave, 200-300Hz)
- Creates gain node with envelope (starts 0.3, decays to 0.01 over 0.1s)
- Plays short sound effect

#### 12. `setupDeviceShakeDetection()`
- Tracks last acceleration values
- Listens to `DeviceMotionEvent`
- Calculates shake magnitude from acceleration delta
- If magnitude > threshold (2.0):
  - Applies forces to charms based on device movement
  - Plays sound if magnitude > threshold * 1.5
- Handles iOS permission request (DeviceMotionEvent.requestPermission)
- Falls back to direct listener for Android/older iOS

#### 13. `setupParallax()`
- Sets up `deviceorientation` listener (mobile):
  - Calculates tilt from beta/gamma
  - Calls `applyParallax()` and `updateGravityFromOrientation()`
- Sets up `mousemove` listener on canvas (desktop):
  - Calculates tilt from mouse position relative to canvas center
  - Calls `applyParallax()`
- Sets up `mouseleave` listener to reset parallax
- Sets up `click` and `touchstart` listeners to trigger shake

#### 14. `applyParallax(x, y)`
- Gets `#holographic-wrapper` element
- Calculates rotation (max 15 degrees)
- Applies CSS transform: `perspective(1000px) rotateX() rotateY()`
- Adds `tilted` class to wrapper
- Updates CSS custom properties `--mouse-x` and `--mouse-y` for glow effect

#### 15. `updateGravityFromOrientation(beta, gamma)`
- Only works on mobile devices (detects via user agent)
- Normalizes beta (pitch) and gamma (roll) to -1 to 1
- Calculates target gravity (Y: 0.3 ¡Ó 0.2, X: ¡Ó0.15)
- Smoothly interpolates current gravity toward target (smoothing factor 0.1)
- Clamps gravity values to reasonable ranges

#### 16. `initializeBackgroundMusic()`
- Gets `#background-music` audio element
- Sets volume to 0.5
- Plays if not muted (handles autoplay prevention)
- Calls `updateSoundIcon()`

#### 17. `toggleMusic()`
- Toggles `state.musicMuted`
- Pauses or plays music accordingly
- Calls `updateSoundIcon()`

#### 18. `updateSoundIcon()`
- Gets `#sound-icon` element
- Sets textContent to `'volume_off'` or `'volume_up'` based on mute state

#### 19. `animate()`
- Updates Matter.js engine
- Calls `renderCanvas()`
- Requests next animation frame

#### 20. `setupEventListeners()`
- Sets up shake button click and touch events
- Sets up sound toggle button click event

### Additional Functions
- `applyFilter(ctx, filter)` - Applies CSS filters (currently only 'none' used, but keep for future)

## Visual Design Specifications

### Background
- Dark blue gradient: `#0f172a ¡÷ #1e293b ¡÷ #334155`
- Grid overlay: 50px grid, rgba(59, 130, 246, 0.1), 30% opacity
- Radial glow: 500px circle, rgba(59, 130, 246, 0.2), centered

### Holographic Effects
- **Shine**: Animated gradient sweep, 3s infinite
- **Glow**: Radial gradient following mouse/tilt position
- **Sparkle**: Animated particle effects, 4s infinite
- All overlays: opacity 0 normally, opacity 1 on hover/tilt

### Canvas
- Rounded corners: 12px
- Shadow: `0 20px 60px rgba(0, 0, 0, 0.3)`
- Display constraints: max-width 90vw, max-height 70vh
- Internal resolution: Matches image dimensions exactly

### Buttons
- **Sound toggle**: White circle, 48x48px, Material Icons, blue icon color
- **Shake button**: Blue gradient, rounded-full, pulse animation, white text, Material Icons vibration icon

### Typography
- **Default font**: Hoefler Text (all text)
- **Fallbacks**: Baskerville, Bodoni MT, Didot, Goudy Old Style, Garamond, Palatino Linotype, Book Antiqua, Times New Roman, Georgia, serif
- **Chinese support**: Noto Serif TC, Source Han Serif TC (serif), then Noto Sans TC, Microsoft YaHei, etc. (sans-serif)

## Physics Specifications

### Gravity
- Default Y: 0.3 (downward, slow)
- Default X: 0 (no horizontal)
- Mobile: Adjusts based on device tilt (gradual, smoothed)

### Charm Properties
- **Restitution**: 0.3 (less bouncy)
- **Friction**: 0.1 (slight friction)
- **FrictionAir**: 0.15 (high air resistance for slow movement)
- **Density**: 0.001 (lightweight)
- **Chamfer**: 2px radius (slightly rounded)

### Walls
- Thickness: 50px
- Position: At canvas boundaries (0, width, height)
- Static bodies (don't move)

### Anti-Stuck System
- Detects charms within 25px of corners
- Applies continuous small force (0.02) toward center
- Runs every frame in `renderCanvas()`

## Interaction Specifications

### Shake Button
- Fixed bottom-center
- Click/touch triggers `triggerShake()`
- Prevents event propagation on touch

### Canvas Click/Touch
- Clicking/tapping canvas triggers shake
- Prevents default on touch

### Device Motion (Mobile)
- Detects actual phone shake
- Applies forces matching device movement
- Requests permission on iOS 13+
- Plays sound on significant shake

### Parallax (Desktop)
- Mouse movement tilts card
- Max tilt: 15 degrees
- Smooth transitions

### Parallax (Mobile)
- Device orientation tilts card
- Also adjusts gravity direction
- Smooth, gradual response

## Code Organization Principles

1. **Single-purpose functions** - Each function does one thing
2. **Centralized state** - All state in `state` object
3. **No unnecessary features** - No upload UI, no filter selection, no share links, no video export, no analytics
4. **Direct initialization** - Card loads immediately on page load
5. **Performance optimization** - Physics bodies only recreate when charms change (hash check)
6. **Error handling** - Validate canvas, image, context before operations
7. **Console logging** - Log important events (image load, canvas init, physics creation)

## Default Configuration

- **Image**: `assets/cat.jpg` (resized to max 720px width)
- **Charms**: `'HAPPY 24 BIRTHDAY'` (each character = 1 charm)
- **Charm color**: `'rainbow'` (pastel colors)
- **Custom message**: `'Happy Birthday Ana! Looking forward to spending more time with you!'`
- **Music**: `assets/8-bit happy birthday.mp3` (loops, volume 0.5)
- **Filter**: `'none'` (no image filter applied)

## Implementation Notes

1. Canvas dimensions must match image dimensions exactly for proper rendering
2. Physics bodies must be recreated if canvas dimensions change
3. Font loading may be asynchronous - ensure fonts are available before rendering
4. Web Audio API requires user interaction on some browsers
5. Device motion requires permission on iOS 13+
6. Rainbow colors cycle through 8 pastel colors based on character index
7. Anti-stuck system prevents charms from getting trapped in corners
8. Holographic effects only activate on hover/tilt for performance

## Testing Checklist

- [ ] Image loads and displays correctly
- [ ] Canvas dimensions match image dimensions
- [ ] Charms render with Hoefler Text font
- [ ] Physics bodies created correctly (1 per character)
- [ ] Charms respond to shake button
- [ ] Charms respond to device shake (mobile)
- [ ] Parallax works on desktop (mouse)
- [ ] Parallax works on mobile (device orientation)
- [ ] Gravity adjusts on mobile tilt
- [ ] Background music plays and toggles
- [ ] Custom message displays
- [ ] Holographic effects activate on hover/tilt
- [ ] Charms don't get stuck in corners
- [ ] Rainbow colors cycle correctly

