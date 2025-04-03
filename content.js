// Create popovers
const selectionPopover = document.createElement('div');
selectionPopover.className = 'text-explainer-selection-popover';
selectionPopover.innerHTML = `
  <button id="explain-button">Explain</button>
`;
document.body.appendChild(selectionPopover);

const explanationPopover = document.createElement('div');
explanationPopover.className = 'text-explainer-explanation-popover';
explanationPopover.innerHTML = `
  <div class="explanation-header">
    <h3>Explanation</h3>
    <button id="close-explanation">×</button>
  </div>
  <div id="explanation-content">
    <div class="loading-spinner"></div>
  </div>
`;
document.body.appendChild(explanationPopover);

// Create compact answer display for bottom-right
const answerDisplay = document.createElement('div');
answerDisplay.className = 'answer-display';
answerDisplay.style.zIndex = '99999'; // Ensure highest z-index
answerDisplay.innerHTML = `
  <div class="answer-content">
    <div class="loading-spinner-small"></div>
  </div>
  <button id="close-answer">×</button>
`;
document.body.appendChild(answerDisplay);

// Variables to store state
let selectedText = '';
// YAHAN APNI API KEY DAALO (replace with your actual Gemini API key)
let apiKey = 'AIzaSyBGkLKichFF6x8SeV6uMmFu2oC9wgjk_tk';
let isTabPressed = false;

// Load API key from storage
chrome.storage.sync.get(['geminiApiKey'], function(result) {
  if (result.geminiApiKey) {
    apiKey = result.geminiApiKey;
  }
});

// Listen for text selections
document.addEventListener('mouseup', function(e) {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();
  
  if (selectedText && selectedText.length > 3) {
    // Don't show the selection popover with Explain button anymore
    // Instead, just store the selected text for keyboard shortcuts
    selectionPopover.style.display = 'none';
  } else {
    selectionPopover.style.display = 'none';
  }
});

// Listen for keyboard shortcuts (Alt+E) after text selection
document.addEventListener('keydown', function(e) {
  // Simplified: Just check for Alt+E combo for more reliability
  if (e.altKey && e.key.toLowerCase() === 'e' && selectedText && selectedText.length > 3) {
    e.preventDefault(); // Prevent default behavior
    e.stopPropagation(); // Stop event from bubbling up
    
    // Hide selection popover
    selectionPopover.style.display = 'none';
    
    // Get answer (no loading state will be shown)
    getAnswer(selectedText);
    
    return false; // For older browsers
  }
}, true); // Use capturing phase instead of bubbling

// Separate handler for Tab key (since it's more problematic)
document.addEventListener('keydown', function(e) {
  if (e.key === 'Tab' && selectedText && selectedText.length > 3) {
    // Only prevent default if we can handle this
    if (selectionPopover.style.display === 'block') {
      e.preventDefault();
      e.stopPropagation();
      
      // Hide selection popover
      selectionPopover.style.display = 'none';
      
      // Get answer
      getAnswer(selectedText);
      
      return false;
    }
  }
}, true);

// Listen for double-click on text - more reliable implementation
document.addEventListener('dblclick', function(e) {
  setTimeout(function() {
    // Use setTimeout to ensure selection has been made
    const selection = window.getSelection();
    selectedText = selection.toString().trim();
    
    if (selectedText && selectedText.length > 3) {
      // Hide selection popover
      selectionPopover.style.display = 'none';
      
      // Get answer (no loading state will be shown)
      getAnswer(selectedText);
    }
  }, 100); // Short delay to ensure selection is complete
});

// Hide popover when clicking elsewhere
document.addEventListener('mousedown', function(e) {
  if (!selectionPopover.contains(e.target) && 
      !explanationPopover.contains(e.target) &&
      !answerDisplay.contains(e.target)) {
    selectionPopover.style.display = 'none';
  }
});

// Explain button click handler
document.getElementById('explain-button').addEventListener('click', function() {
  if (selectedText) {
    isTabPressed = false;
    // Position the explanation popover in the center
    explanationPopover.style.display = 'block';
    selectionPopover.style.display = 'none';
    
    // Show loading state
    document.getElementById('explanation-content').innerHTML = `
      <div class="loading-spinner"></div>
    `;
    
    // Call Gemini API to explain the text
    getExplanation(selectedText);
  }
});

// Close explanation button
document.getElementById('close-explanation').addEventListener('click', function() {
  explanationPopover.style.display = 'none';
});

// Close answer button
document.getElementById('close-answer').addEventListener('click', function() {
  hideAnswerDisplay();
});

// Listen for messages from background script (context menu)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getQuickAnswer" && message.text) {
    // Set as current selection
    selectedText = message.text;
    
    // Get answer (which now shows loading first)
    getAnswer(selectedText);
    
    // Acknowledge receipt of message
    sendResponse({status: "processing"});
    return true; // Keep message channel open for async response
  }
});

// Function to get just the answer (for Tab key)
async function getAnswer(text) {
  // Don't show anything while loading
  hideAnswerDisplay();

  if (!apiKey) {
    document.querySelector('.answer-content').innerHTML = `
      <div class="error-message-small">API key missing</div>
    `;
    showAnswerDisplay();
    setupAutoHide();
    return;
  }
  
  try {
    // Using a direct approach for better results
    const prompt = `I need ONLY the correct answer to this aptitude problem. No explanations.

Problem: "${text}"

For multiple choice questions, answer with just the letter (A, B, C or D).
For numerical problems, give only the number.
For word problems, give the shortest possible answer.

Think carefully about the problem before answering. Double-check your answer.

FORMAT: Your response must ONLY contain the letter or number or word that is the answer, nothing else.`;
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0,
          topP: 1,
          topK: 1,
          maxOutputTokens: 10
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
      const rawResponse = data.candidates[0].content.parts[0].text.trim();
      
      // Extract answer with a clearly defined pattern
      let answer = rawResponse;
      
      // Clean up the answer
      answer = answer
        .replace(/^the\s+answer\s+is\s+/i, '')
        .replace(/^answer:\s*/i, '')
        .replace(/^option\s*/i, '')
        .replace(/^\s*-\s*/, '')
        .replace(/\.$/, '')
        .trim();
      
      // If it's a letter, make it uppercase
      if (/^[A-D]$/i.test(answer)) {
        answer = answer.toUpperCase();
      }
      
      // Only if we have a valid answer, show it
      if (answer && answer.trim() !== '') {
        // Prepare the answer content first
        document.querySelector('.answer-content').innerHTML = `
          <div class="just-answer">${answer}</div>
        `;
        
        // Now show it (only once it's ready)
        showAnswerDisplay();
        
        // Auto-hide after 2 seconds
        setupAutoHide();
      }
      
    } else {
      throw new Error('Invalid response');
    }
  } catch (error) {
    // Only show errors if they're critical
    if (error.message.includes('API error') || error.message.includes('Invalid response')) {
      document.querySelector('.answer-content').innerHTML = `
        <div class="error-message-small">${error.message}</div>
      `;
      showAnswerDisplay();
      setupAutoHide();
    }
  }
}

// Function to get explanation from Gemini API
async function getExplanation(text) {
  if (!apiKey) {
    document.getElementById('explanation-content').innerHTML = `
      <div class="error-message">
        Please set your Gemini API key in the extension popup.
      </div>
    `;
    return;
  }
  
  try {
    // Improved prompt for more accurate aptitude explanations
    const prompt = `You are an expert aptitude test solver analyzing this question from an exam or quiz.

Question: "${text}"

Please provide a detailed explanation following this structure:
1. Break down the problem and identify the key variables and relationships
2. Show your step-by-step solution with mathematical calculations clearly explained
3. Double-check your calculations and logic for accuracy
4. Highlight your final answer clearly at the end
5. If options (A/B/C/D) are provided, specify which option is correct and why the others are incorrect

Make your explanation clear, precise, and mathematically accurate.`;
    
    const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.1, // Lower temperature for more factual responses
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 2000 // Allow longer detailed explanations
        }
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API responded with status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
      const explanation = data.candidates[0].content.parts[0].text;
      
      // Process the explanation to highlight answers
      let processedExplanation = explanation.replace(/\n/g, '<br>');
      
      // Highlight answer sections - extended pattern matching
      const answerPhrases = [
        "Answer:", "Correct answer:", "The answer is", "Therefore,", "Thus,", "Hence,",
        "Option", "is the correct answer", "correct option is", "final answer", "Final answer",
        "result is", "Result is", "Solution:", "solution is", "The result is"
      ];
      
      answerPhrases.forEach(phrase => {
        const regex = new RegExp(`(${phrase}\\s*[A-D0-9\\.:\\s]*)(\\.|,|$)`, 'gi');
        processedExplanation = processedExplanation.replace(regex, '<span class="answer-highlight">$1</span>$2');
      });
      
      // Additionally highlight option letters that are the answer
      const optionRegex = /\b(Option\s*([A-D]))\b/gi;
      processedExplanation = processedExplanation.replace(optionRegex, '<span class="answer-highlight">$1</span>');
      
      // Format the answer for better readability
      const formattedExplanation = `
        <div class="explanation-answer">
          <div class="explanation-text">${processedExplanation}</div>
        </div>
      `;
      
      document.getElementById('explanation-content').innerHTML = formattedExplanation;
    } else {
      throw new Error('Invalid response from API: Missing expected data structure');
    }
  } catch (error) {
    document.getElementById('explanation-content').innerHTML = `
      <div class="error-message">
        Error getting explanation: ${error.message}
      </div>
    `;
  }
}

// Add a helper function to manage answer display
function showAnswerDisplay() {
  // Force the display to be created if it somehow doesn't exist
  if (!document.querySelector('.answer-display')) {
    const newAnswerDisplay = document.createElement('div');
    newAnswerDisplay.className = 'answer-display';
    newAnswerDisplay.style.zIndex = '99999'; 
    newAnswerDisplay.innerHTML = `
      <div class="answer-content">
        <div class="loading-spinner-small"></div>
      </div>
      <button id="close-answer">×</button>
    `;
    document.body.appendChild(newAnswerDisplay);
    
    // Update reference
    answerDisplay = newAnswerDisplay;
    
    // Add event listener to close button
    document.getElementById('close-answer').addEventListener('click', function() {
      hideAnswerDisplay();
    });
  }

  // First set display to flex but with 0 opacity for animation
  answerDisplay.style.cssText = `
    display: flex !important;
    opacity: 0 !important;
    visibility: visible !important;
    z-index: 99999 !important;
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    transform: translateY(10px) !important;
    transition: opacity 0.3s ease, transform 0.3s ease !important;
  `;
  
  // Force a browser reflow (repaint)
  void answerDisplay.offsetWidth;
  
  // Now animate to full opacity
  setTimeout(() => {
    answerDisplay.style.cssText = `
      display: flex !important;
      opacity: 1 !important;
      visibility: visible !important;
      z-index: 99999 !important;
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      transform: translateY(0) !important;
      transition: opacity 0.3s ease, transform 0.3s ease !important;
    `;
  }, 10);
  
  // Clear any existing auto-hide timers
  if (window.autoHideTimer) {
    clearTimeout(window.autoHideTimer);
  }
}

// New function to hide with animation
function hideAnswerDisplay() {
  // Animate out
  answerDisplay.style.cssText = `
    display: flex !important;
    opacity: 0 !important;
    visibility: visible !important;
    z-index: 99999 !important;
    position: fixed !important;
    bottom: 20px !important;
    right: 20px !important;
    transform: translateY(10px) !important;
    transition: opacity 0.3s ease, transform 0.3s ease !important;
  `;
  
  // After animation completes, hide completely
  setTimeout(() => {
    answerDisplay.style.display = 'none';
  }, 300);
}

// Function to set up auto-hide
function setupAutoHide() {
  // Clear any existing timer
  if (window.autoHideTimer) {
    clearTimeout(window.autoHideTimer);
  }
  
  // Set new timer for 2 seconds
  window.autoHideTimer = setTimeout(() => {
    hideAnswerDisplay();
  }, 500); // Slightly longer time for better UX
} 