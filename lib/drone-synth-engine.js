// DroneSynthEngine - Multi-voice drone synthesis engine for meditation
// Supports multiple oscillator types, filters, and spatial effects

export class DroneSynthEngine extends EventTarget {
    constructor(audioContext, options = {}) {
        super();
        
        this.context = audioContext;
        this.voices = new Map();
        this.maxVoices = options.maxVoices || 16;
        this.voiceIdCounter = 0;
        
        // Master chain
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = options.masterVolume || 0.7;
        
        this.masterCompressor = this.context.createDynamicsCompressor();
        this.masterCompressor.threshold.value = -24;
        this.masterCompressor.knee.value = 30;
        this.masterCompressor.ratio.value = 12;
        this.masterCompressor.attack.value = 0.003;
        this.masterCompressor.release.value = 0.25;
        
        // Effects sends
        this.reverbSend = this.context.createGain();
        this.reverbSend.gain.value = 0.3;
        
        this.delaySend = this.context.createGain();
        this.delaySend.gain.value = 0.2;
        
        // Create effects
        this.reverb = this.createReverb();
        this.delay = this.createDelay();
        
        // Routing
        this.masterGain.connect(this.masterCompressor);
        this.masterCompressor.connect(this.context.destination);
        
        this.reverbSend.connect(this.reverb.input);
        this.reverb.output.connect(this.masterCompressor);
        
        this.delaySend.connect(this.delay.input);
        this.delay.output.connect(this.masterCompressor);
        
        // Voice settings
        this.voiceDefaults = {
            type: options.oscillatorType || 'sine',
            detune: options.detune || 0,
            filterFrequency: options.filterFrequency || 2000,
            filterQ: options.filterQ || 1,
            attack: options.attack || 2.0,
            decay: options.decay || 1.0,
            sustain: options.sustain || 0.8,
            release: options.release || 4.0
        };
    }
    
    // Create a new voice
    createVoice(frequency, velocity = 1) {
        const voiceId = this.voiceIdCounter++;
        
        const voice = {
            id: voiceId,
            frequency,
            velocity,
            
            // Oscillators (multiple for richness)
            oscillators: [],
            
            // Gain stages
            oscillatorGain: this.context.createGain(),
            velocityGain: this.context.createGain(),
            envelopeGain: this.context.createGain(),
            
            // Filter
            filter: this.context.createBiquadFilter(),
            
            // Panning
            panner: this.context.createStereoPanner(),
            
            // Output gain
            outputGain: this.context.createGain()
        };
        
        // Create oscillators with slight detuning for richness
        const detuneAmounts = [0, -5, 5, -12, 12];
        for (let i = 0; i < 3; i++) {
            const osc = this.context.createOscillator();
            osc.type = this.voiceDefaults.type;
            osc.frequency.value = frequency;
            osc.detune.value = detuneAmounts[i] + this.voiceDefaults.detune;
            voice.oscillators.push(osc);
        }
        
        // Set up filter
        voice.filter.type = 'lowpass';
        voice.filter.frequency.value = this.voiceDefaults.filterFrequency;
        voice.filter.Q.value = this.voiceDefaults.filterQ;
        
        // Initial gain values
        voice.oscillatorGain.gain.value = 0.3; // Reduce per-oscillator gain
        voice.velocityGain.gain.value = velocity;
        voice.envelopeGain.gain.value = 0;
        voice.outputGain.gain.value = 1;
        
        // Random panning for spatial interest
        voice.panner.pan.value = (Math.random() - 0.5) * 0.8;
        
        // Connect oscillators
        voice.oscillators.forEach(osc => {
            osc.connect(voice.oscillatorGain);
        });
        
        // Signal chain
        voice.oscillatorGain.connect(voice.filter);
        voice.filter.connect(voice.velocityGain);
        voice.velocityGain.connect(voice.envelopeGain);
        voice.envelopeGain.connect(voice.panner);
        voice.panner.connect(voice.outputGain);
        
        // Connect to destinations
        voice.outputGain.connect(this.masterGain);
        voice.outputGain.connect(this.reverbSend);
        voice.outputGain.connect(this.delaySend);
        
        // Store voice
        this.voices.set(voiceId, voice);
        
        // Limit voices
        if (this.voices.size > this.maxVoices) {
            const oldestId = this.voices.keys().next().value;
            this.stopVoice(oldestId);
        }
        
        return voice;
    }
    
    // Start a voice
    startVoice(frequency, velocity = 1) {
        const voice = this.createVoice(frequency, velocity);
        const now = this.context.currentTime;
        
        // Apply envelope
        voice.envelopeGain.gain.cancelScheduledValues(now);
        voice.envelopeGain.gain.setValueAtTime(0, now);
        voice.envelopeGain.gain.linearRampToValueAtTime(
            1, 
            now + this.voiceDefaults.attack
        );
        voice.envelopeGain.gain.exponentialRampToValueAtTime(
            this.voiceDefaults.sustain,
            now + this.voiceDefaults.attack + this.voiceDefaults.decay
        );
        
        // Start oscillators
        voice.oscillators.forEach(osc => {
            osc.start(now);
        });
        
        this.dispatchEvent(new CustomEvent('voiceStart', {
            detail: { id: voice.id, frequency, velocity }
        }));
        
        return voice.id;
    }
    
    // Stop a voice
    stopVoice(voiceId, immediate = false) {
        const voice = this.voices.get(voiceId);
        if (!voice) return;
        
        const now = this.context.currentTime;
        const releaseTime = immediate ? 0.05 : this.voiceDefaults.release;
        
        // Apply release envelope
        voice.envelopeGain.gain.cancelScheduledValues(now);
        voice.envelopeGain.gain.setValueAtTime(voice.envelopeGain.gain.value, now);
        voice.envelopeGain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);
        
        // Stop oscillators after release
        voice.oscillators.forEach(osc => {
            osc.stop(now + releaseTime + 0.1);
        });
        
        // Clean up
        setTimeout(() => {
            voice.oscillatorGain.disconnect();
            voice.filter.disconnect();
            voice.velocityGain.disconnect();
            voice.envelopeGain.disconnect();
            voice.panner.disconnect();
            voice.outputGain.disconnect();
            this.voices.delete(voiceId);
            
            this.dispatchEvent(new CustomEvent('voiceStop', {
                detail: { id: voiceId }
            }));
        }, (releaseTime + 0.2) * 1000);
    }
    
    // Update filter for all voices
    setFilterFrequency(frequency) {
        const now = this.context.currentTime;
        this.voiceDefaults.filterFrequency = frequency;
        
        this.voices.forEach(voice => {
            voice.filter.frequency.exponentialRampToValueAtTime(frequency, now + 0.1);
        });
    }
    
    setFilterQ(q) {
        const now = this.context.currentTime;
        this.voiceDefaults.filterQ = q;
        
        this.voices.forEach(voice => {
            voice.filter.Q.exponentialRampToValueAtTime(q, now + 0.1);
        });
    }
    
    // Set oscillator type for future voices
    setOscillatorType(type) {
        this.voiceDefaults.type = type;
    }
    
    // Update envelope settings
    setEnvelope(attack, decay, sustain, release) {
        this.voiceDefaults.attack = attack;
        this.voiceDefaults.decay = decay;
        this.voiceDefaults.sustain = sustain;
        this.voiceDefaults.release = release;
    }
    
    // Effects controls
    setReverbMix(value) {
        const now = this.context.currentTime;
        this.reverbSend.gain.exponentialRampToValueAtTime(
            Math.max(0.001, value),
            now + 0.1
        );
    }
    
    setDelayMix(value) {
        const now = this.context.currentTime;
        this.delaySend.gain.exponentialRampToValueAtTime(
            Math.max(0.001, value),
            now + 0.1
        );
    }
    
    setMasterVolume(value) {
        const now = this.context.currentTime;
        this.masterGain.gain.exponentialRampToValueAtTime(
            Math.max(0.001, value),
            now + 0.1
        );
    }
    
    // Create reverb effect
    createReverb() {
        const convolver = this.context.createConvolver();
        const length = this.context.sampleRate * 4;
        const impulse = this.context.createBuffer(2, length, this.context.sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = impulse.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        convolver.buffer = impulse;
        
        const reverbGain = this.context.createGain();
        reverbGain.gain.value = 0.5;
        
        convolver.connect(reverbGain);
        
        return {
            input: convolver,
            output: reverbGain
        };
    }
    
    // Create delay effect
    createDelay() {
        const delay = this.context.createDelay(5);
        delay.delayTime.value = 0.375;
        
        const feedback = this.context.createGain();
        feedback.gain.value = 0.4;
        
        const filter = this.context.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 400;
        
        const output = this.context.createGain();
        output.gain.value = 0.5;
        
        // Delay feedback loop
        delay.connect(feedback);
        feedback.connect(filter);
        filter.connect(delay);
        
        // Output
        delay.connect(output);
        
        return {
            input: delay,
            output: output,
            setTime: (time) => {
                delay.delayTime.exponentialRampToValueAtTime(
                    time,
                    this.context.currentTime + 0.1
                );
            },
            setFeedback: (value) => {
                feedback.gain.exponentialRampToValueAtTime(
                    Math.max(0.001, Math.min(0.95, value)),
                    this.context.currentTime + 0.1
                );
            }
        };
    }
    
    // Get current voice count
    getVoiceCount() {
        return this.voices.size;
    }
    
    // Stop all voices
    stopAll(immediate = false) {
        const voiceIds = Array.from(this.voices.keys());
        voiceIds.forEach(id => this.stopVoice(id, immediate));
    }
}