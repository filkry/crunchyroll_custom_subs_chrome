
chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        if(message.type == "timeupdatefromvideo") {
            chrome.tabs.sendMessage(sender.tab.id, {type: "timeupdatefrombackground", time: message.time});
        }
        else if(message.type == "assfilefromcontrols") {
            chrome.tabs.sendMessage(sender.tab.id, {type: "assfilefrombackground", filecontent: message.filecontent});
        }
    }
);