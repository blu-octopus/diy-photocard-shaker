# [DIY Photocard Shaker](https://blu-octopus.github.io/diy-photocard-shaker/)

Upload your favorite photocard to make them into a digital shaker charm!

Create interactive, shareable shaker-style photo cards with emoji charms, filters, and physics-based animations.

## Features

-   Upload images (JPG, PNG, WEBP, HEIC - max 3MB, auto-resized to 720px width)
-   Apply visual filters (CCD, Mono, Blur, Glow Sparkle, 8K)
-   Add up to 15 emoji/symbol charms with 7 color presets (Blue, Green, Yellow, Pink, Grunge, Red, Rainbow)
-   Shake effect with physics simulation (button, device shake, or tap card)
-   Parallax tilt effects with holographic shine (device orientation or mouse)
-   Background music with mute toggle (state saved in share links)
-   Custom text messages
-   Generate shareable links (encodes all card settings)
-   Download 5-second animation videos (MP4/WebM)

##   Quick Start

1. Open the app in your browser
2. Upload a photo
3. Choose a filter
4. Add charms
5. Create and share your card!

##    Tech Stack

- HTML5 + Tailwind CSS
- Vanilla JavaScript
- Canvas API
- Matter.js (physics)
- Shake.js (device motion)
- MediaRecorder API (video export)
- Google Analytics 4

##   Browser Compatibility

- **Chrome/Edge**: Full support (recommended)
- **Firefox**: Full support
- **Safari**: Full support (iOS 13+ for device shake)
- **Mobile**: Optimized for iOS and Android

**Note**: Video export (MP4) requires modern browsers with MediaRecorder API support. WebM fallback available for older browsers.

##   Usage

1. **Upload**: Click "Choose Image" and select your photo (supports gallery on mobile)
2. **Filter**: Swipe or tap filter buttons to apply effects (preview updates in real-time)
3. **Charms**: Type up to 15 emojis/symbols or select from preset sets, choose charm color
4. **Message**: Add a custom text message (optional, displayed below card)
5. **Shake**: Tap the shake button, physically shake your device, or tap the card
6. **Share**: Click "Share" to generate a shareable link (copies to clipboard)
7. **Download**: Click "Download" to save a 5-second animation video (MP4 or WebM)

**Note**: On iOS, you may need to grant motion permission for device shake detection.

##   Preset Charm Sets

- **Blue Set**:       
- **Green Set**:     
- **Yellow Set**:      
- **Soft Pink**:     ¡ñ    
- **Grunge Set**:          
- **Red Set**:   £¿          £½ 
- **Rainbow**: Pastel rainbow colors (custom input required)

### Events Tracked

- `GenerateCard` - When user creates a card
- `PhotocardCreated` - When an image is uploaded
- `CardShared` - When a share link is generated
- `VideoExported` - When a video is downloaded
- `NewCardStarted` - When user starts a new card

##   Shareable Links

Shareable links encode the entire card state (image, filter, charms, color, message, music mute state) in the URL hash using Base64 encoding. Anyone with the link can view the exact same card you created! Links are fully functional and work across all browsers.

**Note**: Very large images may result in long URLs. Images are automatically resized to 720px width to keep URLs manageable.

##   Error Handling

The app includes comprehensive error handling for:
- Missing DOM elements (graceful degradation)
- Browser compatibility (feature detection)
- Image loading failures
- Video export failures
- Device permission requests

##   Credits

- **Holographic Effects**: Inspired by [Pokemon Cards CSS](https://github.com/simeydotme/pokemon-cards-css) by [@simeydotme](https://github.com/simeydotme)
- **Hover Tilt**: Inspired by [hover-tilt](https://github.com/simeydotme/hover-tilt) by [@simeydotme](https://github.com/simeydotme)

---

Made with   for shaker card lovers
