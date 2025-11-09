// 1. This is our "Tune-Dex Card" data model
// We use the JSON format we designed.
let tuneData = {
  id: "t-123456789",
  title: "My First Riff",
  key: "C",
  timeSignature: "4/4",
  bpm: 120,
  events: [] // Starts with an empty list of events
};

// 2. Find our HTML elements
const addButton = document.getElementById('add-note-button');
const dataDisplay = document.getElementById('data-display');

// 3. A function to display our current data
// This shows us the raw JSON data so we know it's working.
function updateDisplay() {
  // JSON.stringify formats it nicely with 2 spaces
  dataDisplay.textContent = JSON.stringify(tuneData, null, 2);
}

// 4. A function to add a new note
function addTestNote() {
  // Find the last position to "append" the new note
  let lastEvent = tuneData.events[tuneData.events.length - 1];
  let newPosition = lastEvent ? lastEvent.pos + lastEvent.len : 0;

  // This is the new note we are adding
  let newNote = {
    type: "note",
    key: 60,       // 60 is MIDI for Middle C
    pos: newPosition,
    len: 96        // 96 ticks = a quarter note
  };

  // Add the new note to our events list
  tuneData.events.push(newNote);
  console.log("Added note:", newNote);

  // Update the screen to show the new data
  updateDisplay();
}

// 5. Connect the button to our function
addButton.addEventListener('click', addTestNote);

// 6. Show the initial data when the page loads
updateDisplay();