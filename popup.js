document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const statusMessage = document.getElementById('status-message');
  const selectionToggle = document.getElementById('selection-toggle');
  const toggleStatus = document.getElementById('toggle-status');
  const forceEnableToggle = document.getElementById('force-enable-toggle');
  const forceStatus = document.getElementById('force-status');
  
  // Load states when popup opens
  loadSelectionToggleState();
  loadForceEnableState();
  
  // Add event listener for selection toggle
  selectionToggle.addEventListener('change', function() {
    saveSelectionToggleState(selectionToggle.checked);
    toggleStatus.textContent = selectionToggle.checked ? 'Enabled' : 'Disabled';
  });
  
  // Add event listener for force enable toggle
  forceEnableToggle.addEventListener('change', function() {
    saveForceEnableState(forceEnableToggle.checked);
    forceStatus.textContent = forceEnableToggle.checked ? 'Enabled' : 'Disabled';
  });
  
  // Function to save selection toggle state
  function saveSelectionToggleState(isEnabled) {
    chrome.storage.sync.set({ selectionHighlightEnabled: isEnabled }, function() {
      // Send message to content script to update selection state
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "toggleSelection",
            enabled: isEnabled
          });
        }
      });
    });
  }
  
  // Function to save force enable state
  function saveForceEnableState(isEnabled) {
    chrome.storage.sync.set({ forceEnableCopy: isEnabled }, function() {
      // Send message to content script to update force enable state
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "toggleForceCopy",
            enabled: isEnabled
          });
        }
      });
    });
  }
  
  // Function to load selection toggle state
  function loadSelectionToggleState() {
    chrome.storage.sync.get(['selectionHighlightEnabled'], function(result) {
      // Default to false if not set
      const isEnabled = result.selectionHighlightEnabled !== undefined ? 
                        result.selectionHighlightEnabled : false;
      
      selectionToggle.checked = isEnabled;
      toggleStatus.textContent = isEnabled ? 'Enabled' : 'Disabled';
    });
  }
  
  // Function to load force enable state
  function loadForceEnableState() {
    chrome.storage.sync.get(['forceEnableCopy'], function(result) {
      // Default to false if not set
      const isEnabled = result.forceEnableCopy !== undefined ? 
                        result.forceEnableCopy : false;
      
      forceEnableToggle.checked = isEnabled;
      forceStatus.textContent = isEnabled ? 'Enabled' : 'Disabled';
    });
  }
  
  // Function to show status message
  function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = type;
    
    // Clear message after 3 seconds
    setTimeout(() => {
      statusMessage.textContent = '';
      statusMessage.className = '';
    }, 3000);
  }
}); 