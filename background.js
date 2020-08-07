
chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        if(message.type == "timeupdatefromvideo") {
            chrome.tabs.sendMessage(sender.tab.id, {type: "timeupdatefrombackground", time: message.time});
        }
        else if(message.type == "loadedsubsfromcontrols") {
            chrome.tabs.sendMessage(sender.tab.id, {type: "loadedsubsfrombackground", loadedsubs: message.loadedsubs});
        }
        else if(message.type == "offsetupdatefromcontrols") {
            chrome.tabs.sendMessage(sender.tab.id, {type: "offsetupdatefrombackground", offset: message.offset});
        }
        else if(message.type == "settimefromcontrols") {
            chrome.tabs.sendMessage(sender.tab.id, {type: "settimefrombackground", time: message.time});
        }
    }
);