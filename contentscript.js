//console.log("content script running");

let video = document.getElementById("player0");

let subtitlesoctopus = null;

// -- create the subtitle display
let subdiv = document.createElement("div");
subdiv.style.position = "absolute";
subdiv.style.width = "100%";
subdiv.style.height = "100%";
subdiv.style.zIndex = "2";

let textdiv = document.createElement("div");
textdiv.style.color = "#FFFFFF";
textdiv.style.marginLeft = "auto";
textdiv.style.marginRight = "auto";
textdiv.style.textAlign = "center";
textdiv.style.fontSize = "xx-large";

let subtext = document.createTextNode("hello world");

textdiv.appendChild(subtext);
subdiv.appendChild(textdiv);
video.parentElement.appendChild(subdiv);

// -- make a canvas for subtitle octopus
let crcanvas = document.getElementById("velocity-canvas");
let ourcanvas = document.createElement("canvas");
ourcanvas.style.position = "absolute";
ourcanvas.style.zIndex = 2;
ourcanvas.style.width = 960;
ourcanvas.style.height = 540;
video.addEventListener("resize", function() {
    ourcanvas.style.width = video.style.width;
    ourcanvas.style.height = video.style.height;
});
crcanvas.after(ourcanvas);
crcanvas.style.visibility = "hidden";

// -- temp
var ctx = ourcanvas.getContext("2d");
ctx.fillStyle = "#FF0000";
ctx.fillRect(20, 20, 150, 100);

video.addEventListener("timeupdate", function() {
    subtext.nodeValue = "time: " + video.currentTime;

    if(subtitlesoctopus != null) {
        console.log("Updating subtitlesoctopus time: " + video.currentTime);
        instance.setCurrentTime(video.currentTime / 60.0);
    }

    chrome.runtime.sendMessage(
        {
            type: "timeupdatefromvideo",
            time: video.currentTime
        }
    );
    //console.log("time update: " + video.currentTime);
});

chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        if(message.type == "assfilefrombackground") {
            //console.log("assfilefrombackground");
            //console.log(message.filecontent);
            if(subtitlesoctopus != null) {
                subtitlesoctopus.freeTrack();
                subtitlesoctopus.setTrack(message.filecontent);
            }
            else {
                var options = {
                    canvas: ourcanvas,
                    subContent: message.filecontent,
                    //workerUrl: chrome.extension.getURL('/subtitles-octopus/subtitles-octopus-worker.js')
                    workerUrl: "./assets/libass-wasm/subtitles-octopus-worker.js"
                };
                subtitlesoctopus = new SubtitlesOctopus(options);
            }
        }
    }
);

video.addEventListener("timeupdate", function() {
    subtext.nodeValue = "time: " + video.currentTime;

    chrome.runtime.sendMessage(
        {
            type: "timeupdatefromvideo",
            time: video.currentTime
        }
    );
    //console.log("time update: " + video.currentTime);
});
