// Wait for the ENTIRE page, including external scripts, to load
window.addEventListener('load', (event) => {

    // --- VexFlow Setup ---
    const { Factory, Formatter, StaveNote, BarNote, Voice } = Vex.Flow;
    
    // --- Tone.js Setup ---
    const synth = new Tone.Synth().toDestination();
    let currentSequence = null;

    // --- Find the HTML elements ---
    const staffOutput = document.getElementById('staff-output');
    const pianoRoll = document.getElementById('piano-roll');
    const pianoRollLabels = document.getElementById('piano-roll-labels');
    const styleSelect = document.getElementById('style-select');
    
    // --- Constants ---
    // *** NEW: Tune length reduced ***
    const NUM_MEASURES = 4;
    const TICKS_PER_MEASURE = 384; // 16 * 16th notes
    const TOTAL_TICKS = TICKS_PER_MEASURE * NUM_MEASURES;
    const TICKS_PER_16TH = 24;
    // *** NEW: Taller lines for tapping ***
    const LINE_HEIGHT = 15; 

    //
    // *** NEW: Expanded 3-Octave Chromatic Map ***
    //
    const lineIndexToVexKey = [
        "G/6", "F#/6", "F/6", "E/6", "D#/6", "D/6", "C#/6", "C/6", "B/5", "A#/5", "A/5", "G#/5", 
        "G/5", "F#/5", "F/5", "E/5", "D#/5", "D/5", "C#/5", "C/5", "B/4", "A#/4", "A/4", "G#/4", 
        "G/4", "F#/4", "F/4", "E/4", "D#/4", "D/4", "C#/4", "C/4", "B/3", "A#/3", "A/3", "G#/3"
    ];
    
    // *** FIX: Full chromatic maps to prevent crashes ***
    const vexKeyToMidi = {
        "G/6": 80, "F#/6": 79, "F/6": 78, "E/6": 77, "D#/6": 76, "D/6": 75, "C#/6": 74, "C/6": 72, "B/5": 71, "A#/5": 70, "A/5": 69, "G#/5": 68, 
        "G/5": 67, "F#/5": 66, "F/5": 65, "E/5": 64, "D#/5": 63, "D/5": 62, "C#/5": 61, "C/5": 60, "B/4": 59, "A#/4": 58, "A/4": 57, "G#/4": 56, 
        "G/4": 55, "F#/4": 54, "F/4": 53, "E/4": 52, "D#/4": 51, "D/4": 50, "C#/4": 49, "C/4": 48, "B/3": 47, "A#/3": 46, "A/3": 45, "G#/3": 44,
        "b/4": 0 // Rest
    };
    
    const midiToVexKey = {
        80: "G/6", 79: "F#/6", 78: "F/6", 77: "E/6", 76: "D#/6", 75: "D/6", 74: "C#/6", 72: "C/6", 71: "B/5", 70: "A#/5", 69: "A/5", 68: "G#/5", 
        67: "G/5", 66: "F#/5", 65: "F/5", 64: "E/5", 63: "D#/5", 62: "D/5", 61: "C#/5", 60: "C/5", 59: "B/4", 58: "A#/4", 57: "A/4", 56: "G#/4", 
        55: "G/4", 54: "F#/4", 53: "F/4", 52: "E/4", 51: "D#/4", 50: "D/4", 49: "C#/4", 48: "C/4", 47: "B/3", 46: "A#/3", 45: "A/3", 44: "G#/3"
    };

    const lenToDuration = {
        1536: "w", 768: "h", 384: "w", 192: "h", 96: "q", 48: "8", 24: "16"
    };
    const vexKeyToToneKey = (key) => key ? key.replace("/", "") : "";

    // --- The Tune-Dex Data Model ---
    let tuneData = {
      title: "My New Tune",
      events: [] // The "single source of truth"
    };
    
    let isStaveInitialized = false; 

    // --- Core Drawing Functions ---

    function buildPianoRollGrid() {
        pianoRoll.innerHTML = ''; 
        pianoRollLabels.innerHTML = '';
        
        // --- Draw Grid Lines ---
        lineIndexToVexKey.forEach((key, i) => {
            const line = document.createElement('div');
            line.className = 'piano-roll-line';
            // Style "black keys" (sharps)
            if (key.includes('#')) {
                line.classList.add('sharp');
            } else if (key.startsWith('C')) {
                line.classList.add('tonic');
            }
            pianoRoll.appendChild(line);
            
            const label = document.createElement('div');
            label.className = 'piano-roll-label';
            label.textContent = key;
            if (key.includes('#')) {
                label.classList.add('sharp');
            }
            pianoRollLabels.appendChild(label);
        });

        // 3. Vertical time lines
        for (let t = 0; t <= TOTAL_TICKS; t += TICKS_PER_16TH) {
            const beat = document.createElement('div');
            beat.className = 'piano-roll-beat';
            if (t % TICKS_PER_MEASURE === 0) {
                beat.classList.add('measure');
            }
            beat.style.left = `${(t / TOTAL_TICKS) * 100}%`;
            pianoRoll.appendChild(beat);
        }
        
        // *** NEW: Set dynamic height of internal elements ***
        const totalHeight = lineIndexToVexKey.length * LINE_HEIGHT;
        pianoRoll.style.height = `${totalHeight}px`;
        pianoRollLabels.style.height = `${totalHeight}px`;
    }

    function drawNotesInPianoRoll() {
        pianoRoll.querySelectorAll('.note-block').forEach(n => n.remove());
        
        tuneData.events.forEach(event => {
            const lineIndex = lineIndexToVexKey.indexOf(event.key);
            if (lineIndex === -1 && event.type !== 'rest') return;

            const yPos = lineIndex * LINE_HEIGHT;
            const xPos = (event.pos / TOTAL_TICKS) * 100;
            const width = (event.len / TOTAL_TICKS) * 100;

            const noteBlock = document.createElement('div');
            noteBlock.className = 'note-block';
            noteBlock.style.top = `${yPos}px`;
            noteBlock.style.left = `${xPos}%`;
            noteBlock.style.width = `${width}%`;
            noteBlock.dataset.id = event.id;

            if (event.type === 'rest') {
                noteBlock.classList.add('rest');
                noteBlock.style.top = `${lineIndexToVexKey.indexOf("B/4") * LINE_HEIGHT}px`;
            }
            pianoRoll.appendChild(noteBlock);
        });
    }
    
    function drawStaff(eventsToDraw) {
        staffOutput.innerHTML = ''; 
        const vf = new Factory({
            renderer: { elementId: 'staff-output', width: 500, height: 170 },
        });
        const stave = vf.Stave(10, 10, 480);
        stave.addClef('treble').addTimeSignature("4/4");
        
        const context = vf.getContext();
        stave.setContext(context).draw();

        if (eventsToDraw.length === 0) {
            staffOutput.innerHTML = '<p style="color: #999; text-align: center;">Piano roll is empty.</p>';
            return;
        }

        eventsToDraw.sort((a, b) => a.pos - b.pos);

        let notes = [];
        let tick = 0;
        const events = [...eventsToDraw];

        while (tick < TOTAL_TICKS) {
            const eventsAtPos = events.filter(e => e.pos === tick);
            
            if (eventsAtPos.length > 0) {
                const keys = eventsAtPos.filter(e => e.type === 'note').map(e => e.key);
                const rest = eventsAtPos.find(e => e.type === 'rest');
                const len = eventsAtPos[0].len; 
                const duration = lenToDuration[len] || '16';
                
                let note;
                if (keys.length > 0) {
                    note = new StaveNote({ keys: keys, duration: duration, auto_stem: true });
                } else if (rest) {
                    note = new StaveNote({ keys: ["b/4"], duration: duration + "r" });
                }
                
                if (note) {
                    notes.push(note);
                    tick += len; 
                } else {
                    tick += TICKS_PER_16TH; 
                }
            } else {
                const nextEvent = events.find(e => e.pos > tick);
                const gap = (nextEvent ? nextEvent.pos : TOTAL_TICKS) - tick;
                
                if (gap > 0) {
                    let rests = createRestsForGap(gap);
                    notes.push(...rests);
                    tick += gap;
                } else {
                    tick = TOTAL_TICKS;
                }
            }
        }
        
        const voice = new Voice({ num_beats: NUM_MEASURES * 4, beat_value: 4 });
        voice.setStrict(false);
        voice.addTickables(notes);

        new Formatter().joinVoices([voice]).format([voice], 400);
        voice.draw(context, stave);
    }

    // Helper for auto-rest logic
    function createRestsForGap(gap) {
        let rests = [];
        let remainingGap = gap;
        const restLens = [1536, 768, 384, 192, 96, 48, 24]; 
        for (const len of restLens) {
            const duration = lenToDuration[len];
            if (duration && remainingGap >= len) {
                while (remainingGap >= len) {
                    rests.push(new StaveNote({
                        keys: ["b/4"],
                        duration: duration + "r"
                    }));
                    remainingGap -= len;
                }
            }
        }
        return rests;
    }

    // --- Interaction Functions ---
    
    function getGridCoords(e) {
        const rect = pianoRoll.getBoundingClientRect();
        // ** FIX: Add scrollTop to account for scrolling **
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top + pianoRoll.scrollTop;
        
        const lineIndex = Math.floor(y / LINE_HEIGHT);
        const vexKey = lineIndexToVexKey[lineIndex];
        
        const percentX = x / rect.width;
        const tick = percentX * TOTAL_TICKS;
        const snappedTicks = Math.floor(tick / TICKS_PER_16TH) * TICKS_PER_16TH;
        
        return { vexKey, snappedTicks };
    }

    function findEventAtClick(e) {
        const { vexKey, snappedTicks } = getGridCoords(e);
        if (!vexKey) return -1;
        
        for (let i = 0; i < tuneData.events.length; i++) {
            const event = tuneData.events[i];
            if (event.key === vexKey && snappedTicks >= event.pos && snappedTicks < (event.pos + event.len)) {
                return i;
            }
        }
        return -1; 
    }
    
    async function handlePianoRollClick(e) {
        await Tone.start(); 
        
        const { vexKey, snappedTicks } = getGridCoords(e);
        if (!vexKey) return; 

        if (findEventAtClick(e) > -1) {
            console.log("Spot taken. Double-click to remove.");
            return;
        }
        
        const newEvent = {
            id: Date.now().toString() + Math.random(),
            type: "note",
            key: vexKey,
            duration: "16",
            pos: snappedTicks,
            len: TICKS_PER_16TH
        };
        
        console.log("Adding event:", newEvent);
        tuneData.events.push(newEvent);
        
        synth.triggerAttackRelease(vexKeyToToneKey(newEvent.key), "16n", Tone.now());
        
        drawNotesInPianoRoll();
        staffOutput.innerHTML = '<p style="color: #999; text-align: center;">Click "Play" or "Improvise" to update staff</p>';
    }

    function handlePianoRollDoubleClick(e) {
        const eventIndex = findEventAtClick(e); 
        
        if (eventIndex > -1) {
            console.log("SUCCESS: Erased event at index:", eventIndex);
            tuneData.events.splice(eventIndex, 1); 
            
            drawNotesInPianoRoll();
            staffOutput.innerHTML = '<p style="color: #999; text-align: center;">Click "Play" or "Improvise" to update staff</p>';
        } else {
            console.log("No note found at that position to remove.");
        }
    }

    // --- Audio Playback ---
    async function playTune(eventsToPlay) {
        stopMelody(); 

        const toneEvents = [];
        eventsToPlay.forEach(event => {
            if (event.type === 'note') {
                const toneKey = vexKeyToToneKey(event.key);
                if (toneKey) { 
                    toneEvents.push({
                        time: `${event.pos}i`,
                        note: toneKey,
                        duration: `${event.len}i`
                    });
                }
            }
        });

        if (toneEvents.length === 0) return;

        await Tone.start();
        Tone.Transport.ticks = 0; 
        
        currentSequence = new Tone.Part((time, value) => {
            if (synth && !synth.disposed) {
                synth.triggerAttackRelease(value.note, value.duration, time);
            }
        }, toneEvents).start(0);
        
        currentSequence.loop = true;
        currentSequence.loopEnd = `${TOTAL_TICKS}i`;
        Tone.Transport.loop = true;
        Tone.Transport.loopEnd = `${TOTAL_TICKS}i`;
        
        Tone.Transport.start();
    }

    function stopMelody() {
        if (currentSequence) {
            currentSequence.stop(0);
            currentSequence.dispose();
            currentSequence = null;
        }
        Tone.Transport.stop();
        Tone.Transport.position = 0; 
        if (synth && !synth.disposed) {
            synth.triggerRelease(); 
        }
    }

    // --- Control Functions ---
    function clearAll() {
        console.log("Clearing score");
        stopMelody();
        tuneData.events = [];
        drawNotesInPianoRoll();
        drawStaff(tuneData.events);
    }
    
    function generateXpt() {
      console.log("Generating .xpt file...");
      let xmlString = `<?xml version="1.0"?>
    <!DOCTYPE lmms-project>
    <lmms-project type="pattern" creatorversion="1.3.0" creator="Tune-Dex Engine" version="20">
      <head/>
      <pattern type="1" muted="0" steps="16" name="${tuneData.title}" pos="0">\n`;

      tuneData.events.forEach(event => {
        if (event.type === 'note') {
          const midiKey = vexKeyToMidi[event.key] || 48; 
          xmlString += `    <note key="${midiKey}" pan="0" len="${event.len}" pos="${event.pos}" vol="100"/>\n`;
        }
      });

      xmlString += `  </pattern>
    </lmms-project>`;
      
      const blob = new Blob([xmlString], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "tune-dex-export.xpt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    // --- "Tune-Dex" Seed Feature ---
    
    function generateSeed() {
        if (tuneData.events.length === 0) return;
        const jsonString = JSON.stringify(tuneData.events);
        const seed = btoa(jsonString); 
        
        navigator.clipboard.writeText(seed).then(() => {
            alert("Tune-Dex Seed copied to clipboard!");
        }, () => {
            document.getElementById('seed-input').value = seed;
            alert("Seed copied to input box. Please copy it from there.");
        });
    }
    
    function loadFromSeed() {
        const seed = document.getElementById('seed-input').value;
        if (!seed) return;
        
        try {
            const jsonString = atob(seed); 
            const newEvents = JSON.parse(jsonString);
            
            if (Array.isArray(newEvents)) {
                tuneData.events = newEvents;
                drawNotesInPianoRoll();
                drawStaff(tuneData.events);
            }
        } catch (e) {
            alert("Invalid Tune-Dex Seed.");
            console.error("Seed load error:", e);
        }
    }

    //
    // --- *** STYLE ENGINE (Now with chromatic map) *** ---
    //
    const STYLE_LIBRARY = {
        "arp-major": (baseEvents) => {
            let newEvents = [];
            baseEvents.forEach(event => {
                if(event.type !== 'note') return;
                const rootMidi = vexKeyToMidi[event.key] || 48;
                const thirdMidi = rootMidi + 4;
                const fifthMidi = rootMidi + 7;
                
                const pattern = [
                    { key: midiToVexKey[rootMidi], pos: event.pos, len: TICKS_PER_16TH },
                    { key: midiToVexKey[thirdMidi], pos: event.pos + TICKS_PER_16TH, len: TICKS_PER_16TH },
                    { key: midiToVexKey[fifthMidi], pos: event.pos + (2 * TICKS_PER_16TH), len: TICKS_PER_16TH },
                    { key: midiToVexKey[thirdMidi], pos: event.pos + (3 * TICKS_PER_16TH), len: TICKS_PER_16TH }
                ];
                newEvents.push(...pattern);
            });
            // Filter out any "undefined" keys
            return newEvents.filter(e => e.key).map(e => ({...e, id: Math.random(), type: "note", duration: "16"}));
        },
        "waltz-bass": (baseEvents) => {
            let newEvents = [];
            baseEvents.forEach(event => {
                if(event.type !== 'note') return;
                const rootMidi = (vexKeyToMidi[event.key] || 48) - 12; // One octave down
                const fifthMidi = rootMidi + 7;
                
                const pattern = [
                    { key: midiToVexKey[rootMidi], pos: event.pos, len: 96, duration: "q" },
                    { key: midiToVexKey[fifthMidi], pos: event.pos + 96, len: 96, duration: "q" },
                    { key: midiToVexKey[fifthMidi], pos: event.pos + 192, len: 96, duration: "q" }
                ];
                newEvents.push(...pattern);
            });
            return newEvents.filter(e => e.key).map(e => ({...e, id: Math.random(), type: "note"}));
        },
        "power-chord": (baseEvents) => {
            let newEvents = [];
            baseEvents.forEach(event => {
                if(event.type !== 'note') return;
                const rootMidi = vexKeyToMidi[event.key] || 48;
                const fifthMidi = rootMidi + 7;
                const octaveMidi = rootMidi + 12;
                
                const originalLen = event.len;
                const originalDuration = lenToDuration[originalLen] || '16';

                newEvents.push({
                    type: "note", key: midiToVexKey[rootMidi], 
                    pos: event.pos, len: originalLen, duration: originalDuration, id: Math.random()
                });
                newEvents.push({
                    type: "note", key: midiToVexKey[fifthMidi], 
                    pos: event.pos, len: originalLen, duration: originalDuration, id: Math.random()
                });
                newEvents.push({
                    type: "note", key: midiToVexKey[octaveMidi], 
                    pos: event.pos, len: originalLen, duration: originalDuration, id: Math.random()
                });
            });
            return newEvents.filter(e => e.key);
        }
    };
    
    async function generateAndPlay() {
        stopMelody();
        
        const styleID = styleSelect.value;
        const styleFunction = STYLE_LIBRARY[styleID];
        
        if (!styleFunction) {
            alert("Unknown style selected!");
            return;
        }
        
        // Use only the first note of any chord as the base
        const baseTune = tuneData.events.filter((event, index, arr) => {
            return arr.findIndex(e => e.pos === event.pos) === index;
        });

        if (baseTune.length === 0) {
            alert("Add some notes to the piano roll first!");
            return;
        }
        
        console.log(`Generating style: ${styleID}`);
        const variationEvents = styleFunction(baseTune);
        
        // ** NEW: Replace the main tune with the variation **
        tuneData.events = variationEvents;
        
        // Re-draw both
        drawNotesInPianoRoll();
        drawStaff(tuneData.events);
        
        // Play the new variation
        await playTune(tuneData.events);
    }

    // --- Button Connections ---
    
    document.getElementById('play-button').addEventListener('click', () => {
        // "Play" button now draws the staff and plays the *original* tune
        drawStaff(tuneData.events); 
        playTune(tuneData.events);
    });
    document.getElementById('stop-button').addEventListener('click', stopMelody);
    document.getElementById('clear-button').addEventListener('click', clearAll);
    document.getElementById('export-xpt-button').addEventListener('click', generateXpt);
    
    // ** New Generate Button **
    document.getElementById('generate-button').addEventListener('click', generateAndPlay);
    
    // New Seed button listeners
    document.getElementById('seed-load-button').addEventListener('click', loadFromSeed);
    document.getElementById('seed-share-button').addEventListener('click', generateSeed);
    
    // --- Initial Load & Listener Setup ---
    pianoRoll.addEventListener('click', handlePianoRollClick);
    pianoRoll.addEventListener('dblclick', handlePianoRollDoubleClick);
    
    // Initial Draw
    buildPianoRollGrid(); // Draw the static grid ONCE
    drawNotesInPianoRoll(); // Draw any (0) initial notes
    drawStaff(tuneData.events); // Draw the empty staff

});