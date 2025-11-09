// Wait for the ENTIRE page, including external scripts, to load
window.addEventListener('load', (event) => {

    // --- VexFlow Setup ---
    const { Factory, Formatter, StaveNote, BarNote } = Vex.Flow;
    const staffOutput = document.getElementById('staff-output');

    // --- Create and configure VexFlow components ONCE ---
    const vf = new Factory({
      renderer: { elementId: 'staff-output', width: 500, height: 150 },
    });
    const stave = vf.Stave(10, 0, 480);
    stave.addClef('treble').addTimeSignature("4/4");
    
    // --- VexFlow Sizing Constants ---
    let staveTopLineY;
    let staveHalfSpacing;
    let isStaveInitialized = false; // Flag to run setup once

    // --- The Tune-Dex Data Model ---
    let tuneData = {
      id: "t-123456789",
      title: "My First Riff",
      key: "C",
      timeSignature: "4/4",
      bpm: 120,
      events: [] 
    };
    
    // --- Application State ---
    let currentTool = {
        type: "note",
        duration: "w",
        len: 384,
        toolName: "w_note"
    };
    
    // --- Constants ---
    const TICKS_PER_MEASURE = 384; 

    // --- Find the HTML elements ---
    const exportMidiButton = document.getElementById('export-midi-button');
    const exportXptButton = document.getElementById('export-xpt-button');
    const clearButton = document.getElementById('clear-button');
    const toolButtons = document.querySelectorAll('.tool-button');
    const lineHighlighter = document.getElementById('line-highlighter');
    const undoButton = document.getElementById('undo-button');

    // --- Main Drawing Function ---
    function drawStaff() {
      vf.getContext().clear();
      stave.setContext(vf.getContext()).draw();

      if (!isStaveInitialized) {
        staveTopLineY = stave.getYForLine(0);
        staveHalfSpacing = 5; 
        isStaveInitialized = true;
        console.log("Stave Initialized. Top Y:", staveTopLineY);
      }

      if (tuneData.events.length === 0) {
        console.log("No notes to draw.");
        return;
      }

      let notes = [];
      let currentMeasureTicks = 0;

      tuneData.events.forEach(event => {
        let note;
        if (event.type === 'rest') {
          note = new StaveNote({
            keys: ["b/4"], 
            duration: event.duration + "r"
          });
        } else {
          note = new StaveNote({
            keys: [event.key],
            duration: event.duration
          });
        }
        notes.push(note);
        
        currentMeasureTicks += event.len;
        
        if (currentMeasureTicks >= TICKS_PER_MEASURE) {
            notes.push(new BarNote());
            currentMeasureTicks = 0;
        }
      });

      Formatter.SimpleFormat(notes, 50);
      notes.forEach(note => {
        note.setStave(stave).setContext(vf.getContext()).draw();
      });

      console.log("Draw complete.");
    }
    
    // --- Tool Palette and Click Logic ---
    
    // This map is now global so all functions can access it
    const lineIndexToVexKey = {
      "-4": "C/6", "-3": "B/5", "-2": "A/5", "-1": "G/5",
      0: "F/5", 1: "E/5", 2: "D/5", 3: "C/5", 4: "B/4",
      5: "A/4", 6: "G/4", 7: "F/4", 8: "E/4", 9: "D/4",
      10: "C/4", 11: "B/3", 12: "A/3", 13: "G/3"
    };

    // NEW: This function ONLY selects note tools
    function selectNoteTool(e) {
        currentTool = {
          type: "note",
          duration: e.target.dataset.duration,
          len: parseInt(e.target.dataset.len, 10),
          toolName: e.target.dataset.tool
        };
        console.log("Selected note tool:", currentTool);
        
        // Update the "selected" class
        toolButtons.forEach(btn => btn.classList.remove('selected'));
        e.target.classList.add('selected');
    }

    // NEW: This function immediately adds a rest
    function addRestTool(e) {
        console.log("Adding rest via button");
        
        // Update the "selected" class
        toolButtons.forEach(btn => btn.classList.remove('selected'));
        e.target.classList.add('selected');
        
        // Get info from the rest button
        const restDuration = e.target.dataset.duration;
        const restLen = parseInt(e.target.dataset.len, 10);

        // Find last event position
        let lastEvent = tuneData.events[tuneData.events.length - 1];
        let newPosition = lastEvent ? lastEvent.pos + lastEvent.len : 0;
        
        // Create the new rest event
        const newEvent = {
            type: "rest",
            duration: restDuration,
            pos: newPosition,
            len: restLen
        };

        console.log("Adding event:", newEvent);
        tuneData.events.push(newEvent);
        drawStaff();
    }
    
    // UPDATED: This function now ONLY adds notes
    function addEventAtClick(e) {
        if (!isStaveInitialized) return; 

        const staffTopY = staffOutput.getBoundingClientRect().top + window.scrollY;
        const clickY = e.pageY - staffTopY;
        const halfStepsDown = (clickY - staveTopLineY) / staveHalfSpacing;
        const lineIndex = Math.round(halfStepsDown);
        
        const vexKey = lineIndexToVexKey[lineIndex];
        if (!vexKey) {
            console.log("Clicked out of bounds.");
            return; 
        }
        
        let lastEvent = tuneData.events[tuneData.events.length - 1];
        let newPosition = lastEvent ? lastEvent.pos + lastEvent.len : 0;
        
        // No need to check for rest, currentTool is always a note
        const newEvent = {
            type: "note",
            key: vexKey,
            duration: currentTool.duration,
            pos: newPosition,
            len: currentTool.len
        };
        
        console.log("Adding event:", newEvent);
        tuneData.events.push(newEvent);
        drawStaff();
    }

    // --- New Highlighter and Undo Functions ---
    
    function handleStaffMouseMove(e) {
        if (!isStaveInitialized) return;

        const staffTopY = staffOutput.getBoundingClientRect().top + window.scrollY;
        const clickY = e.pageY - staffTopY;
        
        const halfStepsDown = (clickY - staveTopLineY) / staveHalfSpacing;
        const lineIndex = Math.round(halfStepsDown);
        
        const vexKey = lineIndexToVexKey[lineIndex];
        if (!vexKey) {
            lineHighlighter.style.display = 'none';
            return;
        }

        const highlightY = (staveTopLineY + (lineIndex * staveHalfSpacing)) - (staveHalfSpacing / 2);
        lineHighlighter.style.top = `${highlightY}px`;
        lineHighlighter.style.display = 'block';
    }
    
    function handleStaffMouseLeave(e) {
        lineHighlighter.style.display = 'none';
    }
    
    function undoLastEvent() {
        console.log("Undoing last event");
        tuneData.events.pop();
        drawStaff();
    }
    
    function clearStaff() {
        console.log("Clearing staff");
        tuneData.events = [];
        drawStaff();
    }
    
    // --- Export Functions ---
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
      
      const vexKeyToMidi = {
        "C/6": 72, "B/5": 71, "A/5": 69, "G/5": 67,
        "F/5": 65, "E/5": 64, "D/5": 62, "C/5": 60, "B/4": 59,
        "A/4": 57, "G/4": 55, "F/4": 53, "E/4": 52, "D/4": 50,
        "C/4": 48, "B/3": 47, "A/3": 45, "G/3": 43
      };
      
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
      downloadFile(xmlString, `${tuneData.title}.xpt`, 'application/xml');
    }

    //
    // *** THIS IS THE NEW BUTTON CONNECTION LOGIC ***
    //
    toolButtons.forEach(btn => {
        if (btn.dataset.type === 'note') {
            btn.addEventListener('click', selectNoteTool);
        } else if (btn.dataset.type === 'rest') {
            btn.addEventListener('click', addRestTool);
        }
    });

    clearButton.addEventListener('click', clearStaff);
    exportXptButton.addEventListener('click', generateXpt);
    exportMidiButton.addEventListener('click', () => {
        alert("MIDI export is coming soon!");
    });
    undoButton.addEventListener('click', undoLastEvent);
    
    // --- Initial Load & Listener Setup ---
    
    // 1. Draw the staff for the first time
    drawStaff(); 
    
    // 2. NOW that the stave is drawn, get its real coordinates
    staveTopLineY = stave.getYForLine(0);
    staveHalfSpacing = 5; 
    
    // 3. NOW, attach the listeners that depend on those coordinates
    staffOutput.addEventListener('click', addEventAtClick);
    staffOutput.addEventListener('mousemove', handleStaffMouseMove);
    staffOutput.addEventListener('mouseleave', handleStaffMouseLeave);

});