// GridDroneMapper - Maps monome grid interactions to drone synthesis parameters
// Designed for participatory drone meditation sessions

export class GridDroneMapper extends EventTarget {
    constructor(options = {}) {
        super();
        
        // Grid dimensions
        this.width = options.width || 16;
        this.height = options.height || 8;
        
        // Mapping modes
        this.mode = options.mode || 'harmonic'; // harmonic, percussive, textural, spatial
        
        // Zone definitions for 16x8 grid
        this.zones = {
            // Harmonic mode zones
            harmonic: {
                root: { x: 0, y: 0, width: 4, height: 4 },      // Root note selection
                intervals: { x: 4, y: 0, width: 8, height: 4 }, // Harmonic intervals
                modulation: { x: 12, y: 0, width: 4, height: 4 }, // Modulation controls
                dynamics: { x: 0, y: 4, width: 16, height: 4 }   // Volume/filter dynamics
            },
            // Percussive mode zones
            percussive: {
                triggers: { x: 0, y: 0, width: 8, height: 8 },   // Trigger pads
                rhythm: { x: 8, y: 0, width: 8, height: 4 },     // Rhythm patterns
                effects: { x: 8, y: 4, width: 8, height: 4 }     // Effects sends
            },
            // Textural mode zones
            textural: {
                grains: { x: 0, y: 0, width: 16, height: 4 },    // Grain density/position
                envelope: { x: 0, y: 4, width: 8, height: 4 },   // ADSR control
                space: { x: 8, y: 4, width: 8, height: 4 }       // Reverb/delay
            },
            // Spatial mode zones
            spatial: {
                position: { x: 0, y: 0, width: 16, height: 8 }   // Full grid as 2D space
            }
        };
        
        // Harmonic series ratios for drone work
        this.harmonicRatios = [
            1,      // Unison
            9/8,    // Major second
            5/4,    // Major third
            4/3,    // Perfect fourth
            3/2,    // Perfect fifth
            5/3,    // Major sixth
            15/8,   // Major seventh
            2,      // Octave
            9/4,    // Ninth
            5/2,    // Tenth
            11/4,   // Eleventh
            3,      // Twelfth
            7/2,    // Harmonic seventh
            4,      // Double octave
            5,      // Major third + double octave
            6       // Fifth + double octave
        ];
        
        // State tracking
        this.activeNotes = new Map(); // key: "x,y", value: { ratio, velocity, startTime }
        this.rootFrequency = options.rootFrequency || 110; // A2 default
        this.scale = options.scale || 'just'; // just, pythagorean, equal
        
        // Performance settings
        this.glide = options.glide || 0.1; // Portamento time in seconds
        this.holdMode = options.holdMode || false; // Toggle vs momentary
        this.velocitySensitive = options.velocitySensitive || true;
        
        // Initialize zone states
        this.zoneStates = new Map();
    }
    
    // Handle grid key events
    handleGridKey(x, y, pressed) {
        const zone = this.getZone(x, y);
        if (!zone) return;
        
        // Route to appropriate handler based on mode
        switch (this.mode) {
            case 'harmonic':
                this.handleHarmonicKey(x, y, pressed, zone);
                break;
            case 'percussive':
                this.handlePercussiveKey(x, y, pressed, zone);
                break;
            case 'textural':
                this.handleTexturalKey(x, y, pressed, zone);
                break;
            case 'spatial':
                this.handleSpatialKey(x, y, pressed, zone);
                break;
        }
    }
    
    // Harmonic mode key handling
    handleHarmonicKey(x, y, pressed, zone) {
        const key = `${x},${y}`;
        
        switch (zone.name) {
            case 'root':
                if (pressed) {
                    // Root note selection - map to chromatic scale
                    const noteIndex = (y * 4) + x;
                    const semitones = noteIndex - 12; // Center around C
                    this.rootFrequency = 110 * Math.pow(2, semitones / 12);
                    
                    this.dispatchEvent(new CustomEvent('rootChange', {
                        detail: { frequency: this.rootFrequency, x, y }
                    }));
                }
                break;
                
            case 'intervals':
                if (pressed) {
                    // Calculate harmonic ratio based on position
                    const intervalIndex = (y * 8) + (x - 4);
                    const ratio = this.harmonicRatios[intervalIndex % this.harmonicRatios.length];
                    const frequency = this.rootFrequency * ratio;
                    
                    // Calculate velocity from Y position (higher = quieter for natural feel)
                    const velocity = this.velocitySensitive ? (1 - (y / 3)) * 0.8 + 0.2 : 1;
                    
                    this.activeNotes.set(key, {
                        ratio,
                        frequency,
                        velocity,
                        startTime: Date.now()
                    });
                    
                    this.dispatchEvent(new CustomEvent('noteOn', {
                        detail: { frequency, velocity, ratio, x, y }
                    }));
                } else if (!this.holdMode) {
                    const note = this.activeNotes.get(key);
                    if (note) {
                        this.activeNotes.delete(key);
                        
                        this.dispatchEvent(new CustomEvent('noteOff', {
                            detail: { frequency: note.frequency, x, y }
                        }));
                    }
                }
                break;
                
            case 'modulation':
                // Continuous modulation control
                const modX = (x - 12) / 3;
                const modY = y / 3;
                
                this.dispatchEvent(new CustomEvent('modulation', {
                    detail: { 
                        x: modX, 
                        y: modY, 
                        pressed,
                        type: y < 2 ? 'vibrato' : 'tremolo'
                    }
                }));
                break;
                
            case 'dynamics':
                // Global dynamics control
                if (pressed) {
                    const level = x / 15;
                    const filterCutoff = (y - 4) / 3;
                    
                    this.dispatchEvent(new CustomEvent('dynamics', {
                        detail: { level, filterCutoff, x, y }
                    }));
                }
                break;
        }
    }
    
    // Percussive mode key handling
    handlePercussiveKey(x, y, pressed, zone) {
        switch (zone.name) {
            case 'triggers':
                if (pressed) {
                    // Trigger percussion hit
                    const pitch = (y * 8) + x;
                    const velocity = this.velocitySensitive ? Math.random() * 0.5 + 0.5 : 1;
                    
                    this.dispatchEvent(new CustomEvent('trigger', {
                        detail: { pitch, velocity, x, y }
                    }));
                }
                break;
                
            case 'rhythm':
                if (pressed) {
                    // Toggle rhythm pattern step
                    const step = x - 8;
                    const pattern = y;
                    
                    this.dispatchEvent(new CustomEvent('rhythmToggle', {
                        detail: { step, pattern, x, y }
                    }));
                }
                break;
                
            case 'effects':
                if (pressed) {
                    // Effects send levels
                    const effect = Math.floor((x - 8) / 2);
                    const level = ((y - 4) / 3);
                    
                    this.dispatchEvent(new CustomEvent('effectSend', {
                        detail: { effect, level, x, y }
                    }));
                }
                break;
        }
    }
    
    // Textural mode key handling
    handleTexturalKey(x, y, pressed, zone) {
        switch (zone.name) {
            case 'grains':
                // Granular synthesis control
                const density = x / 15;
                const position = y / 3;
                
                this.dispatchEvent(new CustomEvent('grainControl', {
                    detail: { density, position, pressed, x, y }
                }));
                break;
                
            case 'envelope':
                if (pressed) {
                    // ADSR envelope control
                    const param = Math.floor(x / 2); // 0=A, 1=D, 2=S, 3=R
                    const value = (y - 4) / 3;
                    const paramNames = ['attack', 'decay', 'sustain', 'release'];
                    
                    this.dispatchEvent(new CustomEvent('envelopeChange', {
                        detail: { 
                            parameter: paramNames[param],
                            value,
                            x, y
                        }
                    }));
                }
                break;
                
            case 'space':
                if (pressed) {
                    // Spatial effects control
                    const wetness = (x - 8) / 7;
                    const size = (y - 4) / 3;
                    
                    this.dispatchEvent(new CustomEvent('spaceControl', {
                        detail: { wetness, size, x, y }
                    }));
                }
                break;
        }
    }
    
    // Spatial mode key handling
    handleSpatialKey(x, y, pressed, zone) {
        // Use entire grid as 2D spatial controller
        const xNorm = x / (this.width - 1);
        const yNorm = y / (this.height - 1);
        
        // Convert to polar coordinates for circular panning
        const centerX = 0.5;
        const centerY = 0.5;
        const dx = xNorm - centerX;
        const dy = yNorm - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy) * 2; // 0-1.4 range
        const angle = Math.atan2(dy, dx);
        
        this.dispatchEvent(new CustomEvent('spatialControl', {
            detail: {
                x: xNorm,
                y: yNorm,
                distance: Math.min(distance, 1),
                angle,
                pressed,
                gridX: x,
                gridY: y
            }
        }));
    }
    
    // Get zone for coordinates
    getZone(x, y) {
        const zones = this.zones[this.mode];
        
        for (const [name, zone] of Object.entries(zones)) {
            if (x >= zone.x && x < zone.x + zone.width &&
                y >= zone.y && y < zone.y + zone.height) {
                return { name, ...zone };
            }
        }
        
        return null;
    }
    
    // Set mode
    setMode(mode) {
        if (this.zones[mode]) {
            this.mode = mode;
            this.clearAllNotes();
            
            this.dispatchEvent(new CustomEvent('modeChange', {
                detail: { mode }
            }));
        }
    }
    
    // Clear all active notes
    clearAllNotes() {
        for (const [key, note] of this.activeNotes.entries()) {
            const [x, y] = key.split(',').map(Number);
            
            this.dispatchEvent(new CustomEvent('noteOff', {
                detail: { frequency: note.frequency, x, y }
            }));
        }
        
        this.activeNotes.clear();
    }
    
    // Get visual feedback for LED states
    getLEDState(x, y) {
        const key = `${x},${y}`;
        const zone = this.getZone(x, y);
        
        if (!zone) return 0;
        
        // Different visual feedback based on mode and zone
        switch (this.mode) {
            case 'harmonic':
                if (zone.name === 'intervals' && this.activeNotes.has(key)) {
                    return 15; // Full brightness for active notes
                } else if (zone.name === 'root') {
                    // Highlight current root
                    const noteIndex = (y * 4) + x;
                    const freq = 110 * Math.pow(2, (noteIndex - 12) / 12);
                    return Math.abs(freq - this.rootFrequency) < 1 ? 15 : 3;
                }
                return 2; // Dim for inactive
                
            case 'percussive':
                // Flash on trigger
                return 4;
                
            case 'textural':
                // Gradient based on parameter value
                return Math.floor((x / this.width) * 15);
                
            case 'spatial':
                // Distance from center
                const cx = this.width / 2;
                const cy = this.height / 2;
                const dist = Math.sqrt(Math.pow(x - cx, 2) + Math.pow(y - cy, 2));
                return Math.floor((1 - (dist / Math.max(cx, cy))) * 15);
                
            default:
                return 0;
        }
    }
    
    // Get zone layout for visual display
    getZoneLayout() {
        return this.zones[this.mode];
    }
}