// Create context menu items
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "getQuickAnswer",
    title: "Get Answer",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "getQuickAnswer") {
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, {
      action: "getQuickAnswer",
      text: info.selectionText
    });
  }
}); 