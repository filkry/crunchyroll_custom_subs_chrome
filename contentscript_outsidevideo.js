function preventDefaults (e) {
  e.preventDefault();
  e.stopPropagation();
};

let loadedsubs = [];

let port = chrome.runtime.connect({name: "controls_timeupdates"});

chrome.runtime.onConnect.addListener(function(port) {
    if(port.name == "controls_timeupdates") {
        port.onMessage.addListener(function(msg) {
            console.log("Controls time update: " + msg.time);
        });
    }
});

let videoarea = document.getElementById("showmedia_video");
if(videoarea != null) {
    // -- create subtitle upload/control area
    let controlsdiv = document.createElement("div");
    //controlsdiv.style.width = "100%";
    controlsdiv.style.padding = "20px";
    controlsdiv.style.borderStyle = "solid";
    controlsdiv.style.borderColor = "#000000";
    controlsdiv.style.borderWidth = "1px";
    controlsdiv.style.marginBottom = "20px";

    let controlstext = document.createTextNode("Controls Area");
    controlsdiv.style.fontSize = "xx-large";

    let tempsubsdiv = document.createElement("div");

    chrome.runtime.onMessage.addListener(
        function(message, sender, sendResponse) {
            if(message.type == "timeupdatefrombackground") {
                //console.log("Controls time: " + message.time);

                tempsubsdiv.innerHTML = "";

                lines = [];

                loadedsubs.forEach(sub => {
                    if(sub.starttime <= message.time && sub.endtime >= message.time) {
                        if(sub.hasOwnProperty('lines')) {
                            sub.lines.forEach(line => {
                                lines.push(line);
                            });
                        }
                    }
                });

                lines.forEach(line => {
                    let linep = document.createElement("p");
                    linep.innerHTML = line;
                    tempsubsdiv.appendChild(linep);
                });
            }
        }
    );

    ;['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        controlsdiv.addEventListener(eventName, preventDefaults, false)
    })

    controlsdiv.addEventListener("drop", function(dragevent) {
        //console.log("drop event");
        dragevent.preventDefault();
        dragevent.stopPropagation();
        if(dragevent.dataTransfer.files.length > 0) {
            let file = dragevent.dataTransfer.files[0];
            console.log(file.name);

            let filereader = new FileReader();
            filereader.onload = function(event) {
                //console.log(filereader.result);

                let lines = filereader.result.split('\n');

                const EParseStates = {
                    eNone: 0,
                    eWaitingForNextSub: 1,
                    eWaitingForTime: 2,
                    eReadingLines: 0,
                };
                Object.freeze(EParseStates);

                let state = EParseStates.eWaitingForNextSub;

                let matchnewsub = /^[0-9]+$/;
                let matchtime = /^(?<starthours>[0-9]+):(?<startminutes>[0-9]+):(?<startseconds>[0-9]+),(?<startmilliseconds>[0-9]+)\s?-->\s?(?<endhours>[0-9]+):(?<endminutes>[0-9]+):(?<endseconds>[0-9]+),(?<endmilliseconds>[0-9]+)\s*$/;
                let matchline = /^\S+$/;

                loadedsubs = []; // reset

                lines.forEach(line => {
                    line = line.replace('\r', '');

                    if(state == EParseStates.eWaitingForNextSub) {
                        let res = line.match(matchnewsub);
                        if(res != null && res.length > 0) {
                            loadedsubs.push({}); // append empty sub
                            state = EParseStates.eWaitingForTime;
                            //console.log("New sub!");
                        }
                    }
                    else if(state == EParseStates.eWaitingForTime) {
                        let res = line.match(matchtime);
                        if(res != null) {
                            let cursub = loadedsubs[loadedsubs.length - 1];
                            let starttime = parseFloat(res.groups.starthours) * 60.0 * 60.0 +
                                            parseFloat(res.groups.startminutes) * 60.0 +
                                            parseFloat(res.groups.startseconds) +
                                            parseFloat(res.groups.startmilliseconds) * 0.001;
                            let endtime = parseFloat(res.groups.endhours) * 60.0 * 60.0 +
                                          parseFloat(res.groups.endminutes) * 60.0 +
                                          parseFloat(res.groups.endseconds) +
                                          parseFloat(res.groups.endmilliseconds) * 0.001;
                            cursub.starttime = starttime;
                            cursub.endtime = endtime;
                            //console.log(starttime);

                            state = EParseStates.eReadingLines;
                        }
                    }
                    else if(state == EParseStates.eReadingLines) {
                        let cursub = loadedsubs[loadedsubs.length - 1];

                        let res = line.match(matchline);
                        if(res != null) {
                            if(!cursub.hasOwnProperty('lines')) {
                                cursub.lines = [];
                            }

                            let curlines = cursub.lines;
                            curlines.push(line);
                        }
                        else {
                            console.log(cursub);
                            state = EParseStates.eWaitingForNextSub;
                        }
                    }
                });
            };
            filereader.readAsText(file);
        }
    });

    controlsdiv.appendChild(controlstext);
    controlsdiv.appendChild(tempsubsdiv);
    videoarea.parentNode.insertBefore(controlsdiv, videoarea.nextSibling);
}

