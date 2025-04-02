document.addEventListener('DOMContentLoaded', function() {
  // Elements
  const apiKeyInput = document.getElementById('api-key');
  const saveBtn = document.getElementById('save-btn');
  const statusMessage = document.getElementById('status-message');
  
  // Load saved API key when popup opens
  loadApiKey();
  
  // Add event listener to save button
  saveBtn.addEventListener('click', function() {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
      saveApiKey(apiKey);
    } else {
      showStatus('Please enter a valid API key', 'error');
    }
  });
  
  // Add event listener for enter key
  apiKeyInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      saveBtn.click();
    }
  });
  
  // Function to save API key
  function saveApiKey(key) {
    chrome.storage.sync.set({ geminiApiKey: key }, function() {
      showStatus('API key saved successfully!', 'success');
    });
  }
  
  // Function to load saved API key
  function loadApiKey() {
    chrome.storage.sync.get(['geminiApiKey'], function(result) {
      if (result.geminiApiKey) {
        apiKeyInput.value = result.geminiApiKey;
        showStatus('API key loaded', 'success');
      }
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