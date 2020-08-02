
chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        chrome.tabs.sendMessage(sender.tab.id, {type: "timeupdatefrombackground", time: message.time});
    }
);