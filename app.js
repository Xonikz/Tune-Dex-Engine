// "Tune-Dex Card" data model
let tuneData = {
  id: "t-123456789",
  title: "My First Riff",
  key: "C",
  timeSignature: "4/4",
  bpm: 120,
  events: [] // Starts with an empty list of events
};

//HTML elements
const addButton = document.getElementById('add-note-button');
const dataDisplay = document.getElementById('data-display');

// Dispay raw data
function updateDisplay() {
  // JSON.stringify formating
  dataDisplay.textContent = JSON.stringify(tuneData, null, 2);
}

// A function to add a new note
function addTestNote() {
  // Find the last position to "append" the new note
  let lastEvent = tuneData.events[tuneData.events.length - 1];
  let newPosition = lastEvent ? lastEvent.pos + lastEvent.len : 0;

  // New note we are adding
  let newNote = {
    type: "note",
    key: 60,       // 60 is MIDI for Middle C
    pos: newPosition,
    len: 96        // 96 ticks = a quarter note
  };

  // New note to the events list
  tuneData.events.push(newNote);
  console.log("Added note:", newNote);

  // Update the screen to show the new data
  updateDisplay();
}

// Connect the button to the function
addButton.addEventListener('click', addTestNote);

// Show the initial data when the page loads
updateDisplay();

// Find the new export buttons
const exportMidiButton = document.getElementById('export-midi-button');
const exportXptButton = document.getElementById('export-xpt-button');

// Download data function
function downloadFile(content, fileName, mimeType) {
  // Create a blob
  const blob = new Blob([content], { type: mimeType });

  // Create a URL for that blob
  const url = URL.createObjectURL(blob);

  // Create a temporary <a> tag to trigger the download
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a); // Add it to the page
  a.click(); // Simulate a click
  
  // Clean up by removing the tag and revoking the URL
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
// The .xpt (LMMS XML Pattern) generation engine
function generateXpt() {
  console.log("Generating .xpt file...");

  // Start building the XML string
  let xmlString = `<?xml version="1.0"?>
<!DOCTYPE lmms-project>
<lmms-project type="pattern" creatorversion="1.3.0" creator="Tune-Dex Engine" version="20">
  <head/>
  <pattern type="1" muted="0" steps="16" name="${tuneData.title}" pos="0">\n`;

  // Loop through the events and add <note> tags
  tuneData.events.forEach(event => {
    if (event.type === 'note') {
      // Add a note line to the XML
      xmlString += `    <note key="${event.key}" pan="0" len="${event.len}" pos="${event.pos}" vol="100"/>\n`;
    }
  });

  // Close the XML tags
  xmlString += `  </pattern>
</lmms-project>`;

  // Use the helper function to download the file
  downloadFile(xmlString, `${tuneData.title}.xpt`, 'application/xml');
}
// Connect the button to the function
exportXptButton.addEventListener('click', generateXpt);
exportMidiButton.addEventListener('click', () => {
    alert("MIDI export is coming soon!");
});