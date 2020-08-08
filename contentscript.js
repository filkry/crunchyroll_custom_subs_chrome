//console.log("content script running");

let loadedsubs = null;
let currentoffset = 0.0;

let video = document.getElementById("player0");

// -- create the subtitle display
let subdiv = document.createElement("div");
subdiv.className = "video_sub_display";

let textdiv = document.createElement("div");
textdiv.className = "video_sub_display_text";

subdiv.appendChild(textdiv);
video.parentElement.appendChild(subdiv);

// -- make a canvas for subtitle octopus
let crcanvas = document.getElementById("velocity-canvas");
//let ourcanvas = document.createElement("canvas");
//ourcanvas.style.position = "absolute";
//ourcanvas.style.zIndex = 2;
//ourcanvas.style.width = 960;
//ourcanvas.style.height = 540;
//video.addEventListener("resize", function() {
//    ourcanvas.style.width = video.style.width;
//    ourcanvas.style.height = video.style.height;
//});
//crcanvas.after(ourcanvas);
crcanvas.style.visibility = "hidden";

video.addEventListener("timeupdate", function() {

    textdiv.innerHTML = "";

    let lines = [];
    if(loadedsubs != null) {
        loadedsubs.forEach((sub, subi) => {
            let offsetstart = sub.starttime + currentoffset;
            let offsetend = sub.endtime + currentoffset;
            if(offsetstart <= video.currentTime && offsetend >= video.currentTime) {
                sub.lines.forEach(line => {
                    lines.push(line);
                });
            }
        });

        lines.forEach(line => {
            let newp = document.createElement("p");
            newp.innerHTML = line;
            textdiv.appendChild(newp);
        });

        chrome.runtime.sendMessage(
            {
                type: "timeupdatefromvideo",
                time: video.currentTime
            }
        );
    }
    //console.log("time update: " + video.currentTime);
});

chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        if(message.type == "loadedsubsfrombackground") {
            loadedsubs = message.loadedsubs;
        }
        else if(message.type == "offsetupdatefrombackground") {
            currentoffset = message.offset;
        }
        else if(message.type == "settimefrombackground") {
            console.log("settimefrombackground: " + message.time);
            video.currentTime = message.time;
        }
        else if(message.type == "setreplacecrunchysubsfrombackground") {
            console.log("setreplacecrunchysubsfrombackground: " + message.replace);
            if(message.replace) {
                crcanvas.style.visibility = "hidden";
                subdiv.style.visibility = "visible";
            }
            else {
                crcanvas.style.visibility = "visible";
                subdiv.style.visibility = "hidden";
            }
        }
    }
);
