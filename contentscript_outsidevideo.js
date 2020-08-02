function preventDefaults (e) {
  e.preventDefault();
  e.stopPropagation();
};

let activesubids = [];
let loadedsubs = [];

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

    chrome.runtime.onMessage.addListener(
        function(message, sender, sendResponse) {
            if(message.type == "timeupdatefrombackground") {
                //console.log("Controls time: " + message.time);

                let subis = [];

                loadedsubs.forEach((sub, subi) => {
                    if(sub.starttime <= message.time && sub.endtime >= message.time) {
                        subis.push(subi);
                    }
                });

                // -- remove active sub class from all subs
                let prevactivesubids = [];
                activesubids.forEach(subid => {
                    let prevactivesub = document.getElementById(subid);
                    if(prevactivesub != null) {
                        prevactivesub.classList.remove("controls_active_sub_display");
                    }
                    prevactivesubids.push(subid);
                });
                activesubids = [];

                // -- add active sub class to new subs
                subis.forEach(subi => {
                    let newactivesubid = "ext_subtitle_list_sub_" + subi;
                    let newactivesub = document.getElementById(newactivesubid);
                    if(newactivesub != null) {
                        newactivesub.classList.add("controls_active_sub_display");
                    }

                    activesubids.push(newactivesubid);
                });

                if(activesubids.length > 0) {
                    if(!prevactivesubids.includes(activesubids[0])) {
                        let firstactivesub = document.getElementById(activesubids[0]);
                        firstactivesub.parentNode.scrollTop = firstactivesub.offsetTop - firstactivesub.parentNode.offsetTop;
                    }
                    //firstactivesub.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
                    //firstactivesub.scrollIntoView();
                }
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
                let matchline = /\S+/;

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
                            //console.log(cursub);
                            state = EParseStates.eWaitingForNextSub;
                        }
                    }
                });

                // -- update the subtitle list
                let sublist = document.getElementById("ext_subtitle_list");
                if(sublist != null) {
                    sublist.parentNode.removeChild(sublist);
                }

                sublist = document.createElement("div");
                sublist.id = "ext_subtitle_list";
                controlsdiv.appendChild(sublist);

                loadedsubs.forEach((sub, subi) => {
                    let lines = [];
                    if(sub.hasOwnProperty('lines')) {
                        sub.lines.forEach(line => {
                            lines.push(line);
                        });
                    }

                    let subdisp = document.createElement("div");
                    subdisp.id = "ext_subtitle_list_sub_" + subi;
                    subdisp.className = "controls_sub_display";
                    sublist.appendChild(subdisp);

                    let linesdiv = document.createElement("div");
                    linesdiv.className = "controls_sub_display_lines";
                    subdisp.appendChild(linesdiv);

                    lines.forEach(line => {
                        let linep = document.createElement("p");
                        linep.innerHTML = line;
                        linesdiv.appendChild(linep);
                    });

                    let subsyncbutton = document.createElement("button");
                    subsyncbutton.className = "controls_sub_display_sync_button";
                    subsyncbutton.textContent = "sync now";
                    subdisp.appendChild(subsyncbutton);
                });
            };
            filereader.readAsText(file);
        }
    });

    controlsdiv.appendChild(controlstext);
    videoarea.parentNode.insertBefore(controlsdiv, videoarea.nextSibling);
}

