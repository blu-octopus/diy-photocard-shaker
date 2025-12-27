# DIY Photocard Shaker: Live Shaker Photo Card Creator
upload your favorite photocard to make them into a digital shaker charm!

-----*below content are written with AI assistant*-----

Create interactive, shareable shaker-style photo cards with emoji charms, filters, and physics-based animations.

## ? Features

- ? Upload images (JPG, PNG, WEBP - max 3MB)
- ? Apply visual filters (CCD, Mono, Blur, Glow, 8K)
- ? Add up to 15 emoji/symbol charms
- ? Shake effect with physics simulation
- ? Parallax tilt effects (device orientation or mouse)
- ? Generate shareable links
- ? Export 5-second animation videos

## ? Quick Start

1. Open [DIY Shaker Card](https://blu-octopus.github.io/diy-photocard-shaker/) in your browser
2. Start creating your shaker cards!

## ?? Tech Stack

- HTML5 + Tailwind CSS
- Vanilla JavaScript
- Canvas API
- Matter.js (physics)
- Shake.js (device motion)
- CCapture.js (video export)
- Plausible Analytics

## ? Usage

1. **Upload**: Click "Choose Image" and select your photo
2. **Filter**: Swipe or tap filter buttons to apply effects
3. **Charms**: Type emojis or select from preset sets
4. **Shake**: Tap the shake button or physically shake your device
5. **Share**: Click "Share" to generate a shareable link
6. **Export**: Click "Export Video" to download a 5-second animation

## ? Preset Charm Sets

- **Blue Set**: ??????
- **Green Set**: ????
- **Yellow Set**: ?????
- **Soft Pink**: ????¡ñ????
- **Grunge Set**: ?????????
- **Red Set**: ??£¿ ? ??? ? ?£½?

## ? Analytics

This app uses both **Google Analytics 4** (free) and **Plausible Analytics** for tracking.

### Setting Up Google Analytics 4 (Free)

1. Go to [Google Analytics](https://analytics.google.com/)
2. Sign in with your Google account (works with Google Dev Student accounts)
3. Click "Start measuring" or create a new property
4. Fill in your property details (name, timezone, currency)
5. Get your **Measurement ID** (format: `G-XXXXXXXXXX`)
6. In `index.html`, replace `G-XXXXXXXXXX` with your actual Measurement ID:
   ```html
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
   ```
7. View your analytics at [analytics.google.com](https://analytics.google.com/)

### Page Views
- **Automatic**: Both GA4 and Plausible automatically track all page visits

### Custom Events Tracked:
- `GenerateCard` - When user clicks "Create Card" button (final step)
- `PhotocardCreated` - When a user uploads an image
- `CardShared` - When a share link is generated
- `VideoExported` - When a video is exported
- `NewCardStarted` - When user clicks "Make Another One"

### Viewing Analytics:

**Google Analytics 4:**
1. Go to [analytics.google.com](https://analytics.google.com/)
2. Select your property
3. Go to **Reports** ¡÷ **Engagement** ¡÷ **Events** to see custom events
4. Go to **Reports** ¡÷ **Realtime** to see live visitors

**Plausible Analytics:**
1. Go to [Plausible Analytics Dashboard](https://plausible.io/shakecard.live)
2. Sign in with your Plausible account
3. View:
   - **Page views**: Total visitors and page views
   - **Events**: Click on "Events" tab to see custom event counts

## ? Shareable Links

Shareable links encode the entire card state (image, filter, charms) in the URL hash. Anyone with the link can view the exact same card you created!

## ? License

See LICENSE file for details.

## ? Credits

- **Holographic Effects**: Inspired by [Pokemon Cards CSS](https://github.com/simeydotme/pokemon-cards-css) by [@simeydotme](https://github.com/simeydotme)
  - Uses CSS Transforms, Gradients, Blend-modes and Filters to simulate Holofoil effects
  - Original project: https://poke-holo.simey.me/

---

Made with ? for shaker card lovers