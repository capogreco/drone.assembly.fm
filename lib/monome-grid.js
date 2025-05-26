// MonomeGrid - A modular Web Serial API interface for Monome Grid devices
// Provides a clean, event-driven API for grid communication

export class MonomeGrid extends EventTarget {
    constructor(options = {}) {
        super();
        
        // Configuration
        this.width = options.width || 16;
        this.height = options.height || 8;
        this.defaultIntensity = options.defaultIntensity || 15;
        
        // Connection state
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.connected = false;
        
        // Grid state
        this.ledState = Array(this.height).fill().map(() => Array(this.width).fill(0));
        this.keyState = Array(this.height).fill().map(() => Array(this.width).fill(0));
        
        // Serial processing
        this.serialWorker = null;
        this.readBuffer = new Uint8Array(256);
        this.readOffset = 0;
        
        // Protocol constants
        this.PROTOCOL = {
            // System commands
            SYS_QUERY: 0x00,
            SYS_ID: 0x01,
            SYS_SIZE: 0x05,
            SYS_SIZE_RESPONSE: 0x03,
            
            // LED commands
            LED_OFF: 0x10,
            LED_ON: 0x11,
            LED_ALL_OFF: 0x12,
            LED_ALL_ON: 0x13,
            LED_MAP: 0x14,
            LED_ROW: 0x15,
            LED_COL: 0x16,
            LED_INTENSITY: 0x17,
            LED_LEVEL_SET: 0x18,
            LED_LEVEL_ALL: 0x19,
            LED_LEVEL_MAP: 0x1A,
            
            // Key events
            KEY_UP: 0x20,
            KEY_DOWN: 0x21
        };
    }
    
    // Check if Web Serial API is available
    static isSupported() {
        return 'serial' in navigator;
    }
    
    // Connect to grid
    async connect() {
        if (!MonomeGrid.isSupported()) {
            throw new Error('Web Serial API not supported');
        }
        
        try {
            // Request port access
            this.port = await navigator.serial.requestPort({
                filters: [
                    { usbVendorId: 0x0403 }, // FTDI
                    { usbVendorId: 0x10c4 }, // CP210x
                    { usbVendorId: 0x1a86 }  // CH340
                ]
            });
            
            // Open port with monome-compatible settings
            await this.port.open({
                baudRate: 115200,
                dataBits: 8,
                stopBits: 1,
                parity: 'none',
                flowControl: 'none'
            });
            
            this.reader = this.port.readable.getReader();
            this.writer = this.port.writable.getWriter();
            this.connected = true;
            
            // Initialize grid
            await this.initialize();
            
            // Start reading
            this.startReading();
            
            // Dispatch connected event
            this.dispatchEvent(new CustomEvent('connected', {
                detail: { width: this.width, height: this.height }
            }));
            
            return true;
        } catch (error) {
            this.connected = false;
            this.dispatchEvent(new CustomEvent('error', {
                detail: { message: error.message }
            }));
            throw error;
        }
    }
    
    // Disconnect from grid
    async disconnect() {
        if (!this.connected) return;
        
        try {
            // Clear the grid before disconnecting
            await this.clear();
            
            // Stop reading
            if (this.reader) {
                await this.reader.cancel();
                this.reader.releaseLock();
                this.reader = null;
            }
            
            // Close writer
            if (this.writer) {
                this.writer.releaseLock();
                this.writer = null;
            }
            
            // Close port
            if (this.port) {
                await this.port.close();
                this.port = null;
            }
            
            this.connected = false;
            
            // Dispatch disconnected event
            this.dispatchEvent(new Event('disconnected'));
        } catch (error) {
            this.dispatchEvent(new CustomEvent('error', {
                detail: { message: error.message }
            }));
            throw error;
        }
    }
    
    // Initialize grid after connection
    async initialize() {
        // Query system info
        await this.sendCommand([this.PROTOCOL.SYS_QUERY, 0x00, 0x00]);
        await this.delay(50);
        
        // Query device ID
        await this.sendCommand([this.PROTOCOL.SYS_QUERY, 0x01, 0x00]);
        await this.delay(50);
        
        // Query grid size
        await this.sendCommand([this.PROTOCOL.SYS_QUERY, 0x00, 0x01]);
        await this.delay(50);
        
        // Set default intensity
        await this.setIntensity(this.defaultIntensity);
        await this.delay(50);
        
        // Clear grid
        await this.clear();
        await this.delay(50);
        
        // Enable key events
        const keyEventCommands = [
            [0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02],
            [0x80, 0x01, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02],
            [0x80, 0x02, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02],
            [0x80, 0x03, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02]
        ];
        
        for (const cmd of keyEventCommands) {
            await this.sendCommand(cmd);
            await this.delay(10);
        }
    }
    
    // Start reading from serial port
    async startReading() {
        try {
            while (this.connected && this.reader) {
                const { value, done } = await this.reader.read();
                if (done) break;
                
                // Process incoming data
                this.processIncomingData(value);
            }
        } catch (error) {
            if (this.connected) {
                this.dispatchEvent(new CustomEvent('error', {
                    detail: { message: error.message }
                }));
            }
        }
    }
    
    // Process incoming serial data
    processIncomingData(data) {
        if (!data || data.length === 0) return;
        
        // Copy to read buffer
        for (let i = 0; i < data.length; i++) {
            this.readBuffer[this.readOffset++] = data[i];
            
            // Process complete messages
            if (this.readOffset >= 3) {
                const messageType = this.readBuffer[0];
                
                // Handle key events
                if (messageType === this.PROTOCOL.KEY_UP || messageType === this.PROTOCOL.KEY_DOWN) {
                    const x = this.readBuffer[1];
                    const y = this.readBuffer[2];
                    const pressed = messageType === this.PROTOCOL.KEY_DOWN;
                    
                    if (x < this.width && y < this.height) {
                        this.keyState[y][x] = pressed ? 1 : 0;
                        
                        // Dispatch key event
                        this.dispatchEvent(new CustomEvent('gridKey', {
                            detail: { x, y, pressed }
                        }));
                    }
                    
                    // Reset buffer
                    this.readOffset = 0;
                } else if (this.readOffset >= 3) {
                    // Handle system responses
                    this.handleSystemResponse(
                        this.readBuffer[0],
                        this.readBuffer[1],
                        this.readBuffer[2]
                    );
                    
                    // Reset buffer
                    this.readOffset = 0;
                }
            }
        }
    }
    
    // Handle system response messages
    handleSystemResponse(cmd, data1, data2) {
        switch (cmd) {
            case this.PROTOCOL.SYS_ID:
                // Device ID response
                console.log('Grid device ID:', data1, data2);
                break;
                
            case this.PROTOCOL.SYS_SIZE_RESPONSE:
                // Grid size response
                this.width = data1;
                this.height = data2;
                console.log(`Grid size: ${this.width}x${this.height}`);
                break;
        }
    }
    
    // Send command to grid
    async sendCommand(bytes) {
        if (!this.connected || !this.writer) {
            throw new Error('Not connected to grid');
        }
        
        try {
            const data = new Uint8Array(bytes);
            await this.writer.write(data);
        } catch (error) {
            this.dispatchEvent(new CustomEvent('error', {
                detail: { message: error.message }
            }));
            throw error;
        }
    }
    
    // LED control methods
    async led(x, y, state) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        
        const cmd = state ? this.PROTOCOL.LED_ON : this.PROTOCOL.LED_OFF;
        this.ledState[y][x] = state ? 1 : 0;
        await this.sendCommand([cmd, x, y]);
    }
    
    async ledLevel(x, y, level) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        
        level = Math.max(0, Math.min(15, level));
        this.ledState[y][x] = level;
        await this.sendCommand([this.PROTOCOL.LED_LEVEL_SET, x, y, level]);
    }
    
    async ledRow(y, pattern) {
        if (y < 0 || y >= this.height) return;
        
        // Update state
        for (let x = 0; x < this.width; x++) {
            this.ledState[y][x] = (pattern >> x) & 1;
        }
        
        // Send row data (8-bit or 16-bit depending on width)
        if (this.width <= 8) {
            await this.sendCommand([this.PROTOCOL.LED_ROW, 0, y, pattern & 0xFF]);
        } else {
            await this.sendCommand([
                this.PROTOCOL.LED_ROW,
                0, y,
                pattern & 0xFF,
                (pattern >> 8) & 0xFF
            ]);
        }
    }
    
    async ledCol(x, pattern) {
        if (x < 0 || x >= this.width) return;
        
        // Update state
        for (let y = 0; y < this.height; y++) {
            this.ledState[y][x] = (pattern >> y) & 1;
        }
        
        await this.sendCommand([this.PROTOCOL.LED_COL, x, 0, pattern & 0xFF]);
    }
    
    async ledMap(offsetX, offsetY, data) {
        const mapData = [this.PROTOCOL.LED_MAP, offsetX, offsetY];
        
        // Add 8 bytes of bitmap data
        for (let i = 0; i < 8; i++) {
            mapData.push(data[i] || 0);
        }
        
        await this.sendCommand(mapData);
    }
    
    async ledLevelMap(offsetX, offsetY, levels) {
        const mapData = [this.PROTOCOL.LED_LEVEL_MAP, offsetX, offsetY];
        
        // Convert level array to packed format (2 LEDs per byte)
        for (let i = 0; i < 32; i += 2) {
            const level1 = levels[i] || 0;
            const level2 = levels[i + 1] || 0;
            mapData.push((level2 << 4) | (level1 & 0x0F));
        }
        
        await this.sendCommand(mapData);
    }
    
    async clear() {
        // Clear state
        this.ledState = Array(this.height).fill().map(() => Array(this.width).fill(0));
        
        // Send clear command
        await this.sendCommand([this.PROTOCOL.LED_ALL_OFF]);
    }
    
    async fill() {
        // Fill state
        this.ledState = Array(this.height).fill().map(() => Array(this.width).fill(1));
        
        // Send fill command
        await this.sendCommand([this.PROTOCOL.LED_ALL_ON]);
    }
    
    async setIntensity(level) {
        level = Math.max(0, Math.min(15, level));
        await this.sendCommand([this.PROTOCOL.LED_INTENSITY, level]);
    }
    
    // Utility methods
    async refresh() {
        // Refresh entire grid from state
        for (let y = 0; y < this.height; y++) {
            let pattern = 0;
            for (let x = 0; x < this.width; x++) {
                if (this.ledState[y][x]) {
                    pattern |= (1 << x);
                }
            }
            await this.ledRow(y, pattern);
            await this.delay(5);
        }
    }
    
    getLedState(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
        return this.ledState[y][x];
    }
    
    getKeyState(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return 0;
        return this.keyState[y][x];
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}