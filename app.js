// Wait for the ENTIRE page, including external scripts, to load
window.addEventListener('load', (event) => {

    // --- Audio Setup (Tone.js) ---
    const synth = new Tone.Synth().toDestination();
    let currentSequence = null; 

    // --- Find the HTML elements ---
    const noteInput = document.getElementById('note-input');
    const playOriginalButton = document.getElementById('play-original-button');
    const generateButton = document.getElementById('generate-button');
    const stopButton = document.getElementById('stop-button');
    const exportXptButton = document.getElementById('export-xpt-button');

    // --- Data Maps ---
    // Map of Vex/Tone keys to MIDI numbers
    const keyToMidi = {
        "C3": 36, "D3": 38, "E3": 40, "F3": 41, "G3": 43, "A3": 45, "B3": 47,
        "C4": 48, "D4": 50, "E4": 52, "F4": 53, "G4": 55, "A4": 57, "B4": 59,
        "C5": 60, "D5": 62, "E5": 64, "F5": 65, "G5": 67, "A5": 69, "B5": 71, "C6": 72
    };

    // Map of MIDI numbers back to Keys (for generating)
    const midiToKey = {
        36: "C3", 38: "D3", 40: "E3", 41: "F3", 43: "G3", 45: "A3", 47: "B3",
        48: "C4", 50: "D4", 52: "E4", 53: "F4", 55: "G4", 57: "A4", 59: "B4",
        60: "C5", 62: "D5", 64: "E5", 65: "F5", 67: "G5", 69: "A5", 71: "B5", 72: "C6"
    };

    // --- Core Data Function: Parse Text to Events ---
    function parseNotes(text) {
        const notes = text.split(',')
            .map(s => s.trim().toUpperCase()) 
            .filter(s => s.length > 0); 
        
        let position = 0;
        const events = [];

        notes.forEach(note => {
            events.push({
                key: note,      
                pos: position,  
                len: 96,        
                duration: "4n"
            });
            position += 96; 
        });
        return events;
    }

    // --- Audio Function: Play a sequence of events ---
    async function playEvents(events, interval) {
        if (currentSequence) {
            currentSequence.stop();
            currentSequence.dispose();
        }
        
        await Tone.start();
        
        currentSequence = new Tone.Sequence((time, event) => {
            console.log("Playing:", event.key);
            synth.triggerAttackRelease(event.key, event.duration, time);
        }, events, interval);

        currentSequence.loop = false;
        Tone.Transport.start();
        currentSequence.start();
    }
    
    //
    // *** NEW, SMARTER "FAKING" ENGINE ***
    //
    function generateVariation(baseEvents) {
        const newEvents = [];
        let newPosition = 0;
        
        // For each note the user entered...
        baseEvents.forEach(event => {
            // 1. Get its MIDI number
            const rootMidi = keyToMidi[event.key] || 48; // Default to C4
            
            // 2. Define a simple major chord (Root, +4, +7 semitones)
            const thirdMidi = rootMidi + 4;
            const fifthMidi = rootMidi + 7;
            
            // 3. Convert back to note names
            const rootKey = midiToKey[rootMidi] || "C4";
            const thirdKey = midiToKey[thirdMidi] || "E4";
            const fifthKey = midiToKey[fifthMidi] || "G4";

            // 4. Create the arpeggio pattern (e.g., C-E-G-E)
            const pattern = [
                { key: rootKey,  pos: newPosition,      len: 24, duration: "16n" },
                { key: thirdKey, pos: newPosition + 24, len: 24, duration: "16n" },
                { key: fifthKey, pos: newPosition + 48, len: 24, duration: "16n" },
                { key: thirdKey, pos: newPosition + 72, len: 24, duration: "16n" }
            ];

            // 5. Add this pattern to our lists
            newEvents.push(...pattern); // ... is the "spread" operator
            
            // 6. Move the position forward one quarter note
            newPosition += 96;
        });
        
        console.log("Generated variation events:", newEvents);
        return newEvents;
    }

    // --- Button Connections ---

    // 1. Play Original Button
    playOriginalButton.addEventListener('click', async () => {
        console.log("Play Original clicked.");
        await Tone.start(); 
        const events = parseNotes(noteInput.value);
        if (events.length > 0) {
            const toneEvents = events.map(e => ({ key: e.key, duration: e.duration }));
            playEvents(toneEvents, "4n"); 
        }
    });
    
    // 2. Generate Button
    generateButton.addEventListener('click', async () => {
        console.log("Generate button clicked.");
        await Tone.start(); 
        
        const baseEvents = parseNotes(noteInput.value);
        if (baseEvents.length > 0) {
            const newEvents = generateVariation(baseEvents);
            if (newEvents.length > 0) {
                // Get just the part Tone.js needs (key and duration)
                const toneEvents = newEvents.map(e => ({ key: e.key, duration: e.duration }));
                playEvents(toneEvents, "16n");
            } else {
                console.log("Generation failed, no new events.");
            }
        } else {
            console.log("No base notes to generate from.");
        }
    });

    // 3. Stop Button
    stopButton.addEventListener('click', () => {
        console.log("Stop clicked.");
        if (currentSequence) {
            currentSequence.stop();
        }
        Tone.Transport.stop();
    });

    // 4. Export Button
    exportXptButton.addEventListener('click', () => {
        console.log("Generating .xpt file...");
        const events = parseNotes(noteInput.value);
        
        // *** FIX: Export the *generated* notes, not the original ***
        const exportEvents = generateVariation(events); 
        
        let xmlString = `<?xml version="1.0"?>
    <!DOCTYPE lmms-project>
    <lmms-project type="pattern" creatorversion="1.3.0" creator="Tune-Dex Engine" version="20">
      <head/>
      <pattern type="1" muted="0" steps="16" name="Tune-Dex Export (Variation)" pos="0">\n`;

      exportEvents.forEach(event => {
          const midiKey = keyToMidi[event.key] || 48; // Default to C4
          xmlString += `    <note key="${midiKey}" pan="0" len="${event.len}" pos="${event.pos}" vol="100"/>\n`;
      });

      xmlString += `  </pattern>
    </lmms-project>`;
        
        // Download file
        const blob = new Blob([xmlString], { type: 'application/xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "tune-dex-variation.xpt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

});