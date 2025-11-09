// Wait for the ENTIRE page, including external scripts, to load
window.addEventListener('load', (event) => {

    // --- VexFlow Setup ---
    // Get the VexFlow classes we need
    const { Factory, Formatter, StaveNote } = Vex.Flow;
    const staffOutput = document.getElementById('staff-output');

    // --- The Tune-Dex Data Model ---
    let tuneData = {
      id: "t-123456789",
      title: "My First Riff",
      key: "C",
      timeSignature: "4/4",
      bpm: 120,
      events: []
    };

    // --- Find the HTML elements ---
    const addButton = document.getElementById('add-note-button');
    const addRestButton = document.getElementById('add-rest-button');
    const exportMidiButton = document.getElementById('export-midi-button');
    const exportXptButton = document.getElementById('export-xpt-button');

    // --- Main Drawing Function (NEW - Bypassing EasyScore) ---
    function drawStaff() {
      // Clear out the old staff drawing
      staffOutput.innerHTML = '';

      // Initialize VexFlow
      const vf = new Factory({
        renderer: { elementId: 'staff-output', width: 500, height: 150 },
      });
      
      // 1. Create a stave and draw it
      const stave = vf.Stave(10, 0, 480); // x, y, width
      stave.addClef('treble').addTimeSignature(tuneData.timeSignature);
      stave.setContext(vf.getContext()).draw();

      // If there are no events, just return (showing the empty staff)
      if (tuneData.events.length === 0) {
        console.log("No notes to draw.");
        return;
      }

      // 2. Build the notes array manually using StaveNote
      const notes = [];
      
      tuneData.events.forEach(event => {
        let note;
        
        // *** THIS IS THE FIX FOR BOTH BUGS ***
        // We will build StaveNote objects directly instead of using EasyScore
        
        if (event.type === 'rest') {
          console.log("Creating rest");
          note = new StaveNote({
            keys: ["b/4"], // 'b/4' is the default rest position
            duration: "qr" // 'qr' identifies it as a quarter rest
          });

        } else { // It's a note
          console.log("Creating note");
          // Use keyMap to create the note
          const keyMap = {
            60: 'C/4', 61: 'C#/4', 62: 'D/4', 63: 'D#/4', 64: 'E/4', 65: 'F/4',
            66: 'F#/4', 67: 'G/4', 68: 'G#/4', 69: 'A/4', 70: 'A#/4', 71: 'B/4', 72: 'C/5'
          };
          const keyName = keyMap[event.key] || 'C/4'; // Default to C4
          const duration = (event.len === 96) ? 'q' : '8'; // Default to quarter
          
          note = new StaveNote({
            keys: [keyName],
            duration: duration
          });
        }
        
        notes.push(note);
      });

      // 3. Manually format and draw the notes
      Formatter.SimpleFormat(notes, 50); // Start 50px in to clear the clef
      notes.forEach(note => {
        note.setStave(stave).setContext(vf.getContext()).draw();
      });

      console.log("Draw complete.");
    }

    // --- Note/Rest Adding Functions ---
    function addTestNote() {
      console.log("Add Note button clicked");
      let lastEvent = tuneData.events[tuneData.events.length - 1];
      let newPosition = lastEvent ? lastEvent.pos + lastEvent.len : 0;

      let newNote = {
        type: "note",
        key: 60,       // 60 is MIDI for Middle C
        pos: newPosition,
        len: 96        // 96 ticks = a quarter note
      };

      tuneData.events.push(newNote);
      drawStaff();
    }

    function addTestRest() {
      console.log("Add Rest button clicked");
      let lastEvent = tuneData.events[tuneData.events.length - 1];
      let newPosition = lastEvent ? lastEvent.pos + lastEvent.len : 0;

      let newRest = {
        type: "rest",
        pos: newPosition,
        len: 96 // 96 ticks = a quarter rest
      };

      tuneData.events.push(newRest);
      drawStaff();
    }
    
    // --- Export Functions (Unchanged) ---
    function downloadFile(content, fileName, mimeType) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
          xmlString += `    <note key="${event.key}" pan="0" len="${event.len}" pos="${event.pos}" vol="100"/>\n`;
        }
      });

      xmlString += `  </pattern>
    </lmms-project>`;
      downloadFile(xmlString, `${tuneData.title}.xpt`, 'application/xml');
    }

    // --- Button Connections ---
    addButton.addEventListener('click', addTestNote);
    addRestButton.addEventListener('click', addTestRest);
    exportXptButton.addEventListener('click', generateXpt);
    exportMidiButton.addEventListener('click', () => {
        alert("MIDI export is coming soon!");
    });

    // --- Initial Load ---
    drawStaff();

}); // <-- The closing bracket for the 'window.load' listener