

# Fix Build Error + Premium Animations for Landing Cards & Stream Search

## 1. Fix Build Error — `StreamHistory.tsx` line 197
`PrivateAvatarImage` expects `src` prop (not `path`). Change `path={entry.stranger.avatar_url}` to `src={entry.stranger.avatar_url}`.

## 2. Landing Page — Royal Floating User Card Animations

Replace the current simple fade-in/fade-out floating photos with a premium "royal" animation system:

- **3D perspective transforms**: Cards tilt and rotate in 3D space as they float, creating depth
- **Staggered entrance**: Cards cascade in with a luxurious spring-physics animation — scale from 0 + rotate + blur-to-sharp
- **Continuous floating**: Gentle Y-axis bobbing with individual timing per card (3-5s periods, offset phases)
- **Glassmorphism glow ring**: Each card gets a pulsing neon border glow that shifts between primary/secondary colors
- **Parallax hover effect**: On desktop, cards subtly shift position based on mouse movement across the viewport (CSS `perspective` + JS `mousemove`)
- **Shimmer sweep**: A diagonal light sweep animates across each card every few seconds (like a holographic shine)
- **Scale breathing**: Cards gently pulse between 0.97-1.03 scale on different timings
- **Connection lines**: Faint animated SVG lines connecting nearby cards, pulsing with a neon glow (representing "connections")

## 3. Stream Page — Royal Search Animation

Replace the current basic radar animation (3 expanding rings + rotating line) with a cinematic search experience:

- **Orbital rings**: 3 concentric rotating rings at different speeds and tilted angles (3D perspective), with small glowing dots orbiting along them
- **Central energy core**: Pulsing gradient sphere (primary→secondary) that breathes with a soft neon glow, replacing the static search icon
- **Floating user silhouettes**: Semi-transparent avatar placeholders drift around the core and occasionally get "pulled in" toward the center (representing potential matches being evaluated)
- **Particle field**: Small glowing particles drift outward from center in a spiral pattern
- **Status text**: Animated typewriter-style "Searching for a stranger..." with a shimmer effect on each letter
- **Wave ripple**: Concentric wave rings emit from center on a 2s interval with smooth easing
- **Progress glow**: The outer boundary of the animation area has a slow-rotating gradient border

## Files to Change

| File | Change |
|------|--------|
| `src/pages/StreamHistory.tsx` | Fix `path` → `src` prop on line 197 |
| `src/pages/Landing.tsx` | Replace `FloatingPhoto` component with premium 3D animated version + add mouse parallax + shimmer + connection lines |
| `src/pages/Stream.tsx` | Replace searching state animation (lines 1512-1546) with orbital/cinematic search animation |
| `src/index.css` | Add `@keyframes` for shimmer-sweep, orbital rotation, and holographic shine |

