# Utils

Utility functions for the Peace Shuttle game.

## ExplosionUtils

Reusable explosion effects for creating consistent explosions throughout the game.

### Quick Start

```typescript
import { createExplosion } from './utils/ExplosionUtils';

// Create a default explosion (matches original Shuttle.ts)
createExplosion(scene, x, y);
```

### Basic Usage

**Simple explosion with defaults:**
```typescript
createExplosion(scene, 100, 100);
// Creates: flash + debris + camera shake
```

**Custom colors:**
```typescript
createExplosion(scene, 100, 100, {
  flashColors: [0xFF0000, 0xFFFF00, 0xFFFFFF],
  flashSizes: [40, 25, 12],
  debrisColors: [0xFF6600, 0xFF0000],
});
```

**Large explosion with smoke:**
```typescript
createExplosion(scene, 100, 100, {
  includeSmoke: true,
  debrisCount: 20,
  puffCount: 8,
  shakeDuration: 500,
  shakeIntensity: 0.025,
});
```

**Small explosion without camera shake:**
```typescript
createExplosion(scene, 100, 100, {
  debrisCount: 6,
  flashSizes: [20, 12, 6],
  shakeCamera: false,
});
```

### Individual Components

You can also use explosion components individually:

**Flash only:**
```typescript
import { createExplosionFlash } from './utils/ExplosionUtils';

createExplosionFlash(scene, x, y, {
  flashColors: [0xFFFF00, 0xFF6600, 0xFFFFFF],
  flashSizes: [30, 20, 10],
  duration: 400,
});
```

**Debris only:**
```typescript
import { createExplosionDebris } from './utils/ExplosionUtils';

createExplosionDebris(scene, x, y, {
  debrisColors: [0xFF6600, 0xFFFF00, 0xFF0000],
  debrisCount: 12,
  duration: 600,
});
```

**Smoke only:**
```typescript
import { createSmokePuffs } from './utils/ExplosionUtils';

createSmokePuffs(scene, x, y, {
  puffCount: 4,
  smokeColor: 0x444444,
  riseDistance: 40,
});
```

### Migration Guide

**Before (in Shuttle.ts):**
```typescript
// Create cartoon explosion - expanding circles
const colors = [0xFF6600, 0xFFFF00, 0xFF0000, 0xFFFFFF];

const flash = this.scene.add.graphics();
flash.setPosition(crashX, crashY);
flash.fillStyle(0xFFFF00, 1);
flash.fillCircle(0, 0, 30);
flash.fillStyle(0xFF6600, 1);
flash.fillCircle(0, 0, 20);
flash.fillStyle(0xFFFFFF, 1);
flash.fillCircle(0, 0, 10);

this.scene.tweens.add({
  targets: flash,
  alpha: 0,
  duration: 400,
  onComplete: () => flash.destroy(),
});

// Flying debris pieces
for (let i = 0; i < 12; i++) {
  const angle = (i / 12) * Math.PI * 2;
  const targetX = Math.cos(angle) * (80 + Math.random() * 40);
  const targetY = Math.sin(angle) * (80 + Math.random() * 40) + 50;

  const debris = this.scene.add.graphics();
  const color = colors[Math.floor(Math.random() * colors.length)];
  debris.fillStyle(color, 1);
  debris.fillRect(-4, -4, 8, 8);
  debris.setPosition(crashX, crashY);

  this.scene.tweens.add({
    targets: debris,
    x: crashX + targetX,
    y: crashY + targetY,
    angle: Math.random() * 360,
    alpha: 0,
    duration: 600,
    ease: 'Power2',
    onComplete: () => debris.destroy(),
  });
}

this.scene.cameras.main.shake(300, 0.015);
```

**After:**
```typescript
import { createExplosion } from '../utils/ExplosionUtils';

createExplosion(this.scene, crashX, crashY);
```

### Configuration Options

See the TypeScript interfaces in `ExplosionUtils.ts` for full configuration options:

- `ExplosionFlashConfig` - Flash effect configuration
- `ExplosionDebrisConfig` - Debris effect configuration
- `SmokePuffConfig` - Smoke effect configuration
- `ExplosionConfig` - Combined configuration for all effects

### Presets

**Shuttle explosion (default):**
```typescript
createExplosion(scene, x, y);
```

**Cannon explosion (larger):**
```typescript
createExplosion(scene, x, y, {
  flashSizes: [45, 35, 25, 15, 8],
  flashColors: [0xFF4400, 0xFF6600, 0xFFAA00, 0xFFFF00, 0xFFFFFF],
  debrisCount: 8,
  includeSmoke: true,
  puffCount: 4,
  shakeDuration: 400,
});
```

**Biplane explosion (many pieces):**
```typescript
createExplosion(scene, x, y, {
  debrisCount: 20,
  includeSmoke: true,
  puffCount: 12,
  duration: 1200,
  shakeDuration: 350,
});
```

## ColorUtils

Utilities for manipulating hexadecimal colors.

### Functions

- `darkenColor(color, factor)` - Darkens a color
- `lightenColor(color, factor)` - Lightens a color
- `lerpColor(color1, color2, t)` - Interpolates between two colors

### Example

```typescript
import { darkenColor, lightenColor, lerpColor } from './utils/ColorUtils';

const darkRed = darkenColor(0xFF0000, 0.5); // 0x7F0000
const lightRed = lightenColor(0x7F0000, 2); // 0xFE0000
const purple = lerpColor(0xFF0000, 0x0000FF, 0.5); // 0x7F007F
```
