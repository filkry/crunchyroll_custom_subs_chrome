function preventDefaults (e) {
  e.preventDefault();
  e.stopPropagation();
};

let activesubids = [];
let loadedsubs = [];
let currentoffset = 0.0;
let lastvideotime = 0.0;

// -- global elements
let controlsdiv = document.createElement("div");
let offsetinput = document.createElement("input");

function setoffset(newoffset) {
    currentoffset = newoffset;
    offsetinput.value = newoffset;
    chrome.storage.sync.set({suboffset: newoffset}, function() {
        //console.log("saved offset: " + newoffset);
    });

    chrome.runtime.sendMessage({
        type: "offsetupdatefromcontrols",
        offset: newoffset
    });
}

function updateSubtitlesList() {
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

        let copybutton = document.createElement("button");
        copybutton.className = "controls_sub_display_button";
        copybutton.textContent = "copy";
        copybutton.addEventListener("click", function(){
            var range = document.createRange();
            var selection = window.getSelection();
            range.selectNodeContents(linesdiv);

            selection.removeAllRanges();
            selection.addRange(range);

            document.execCommand('copy');
        });
        subdisp.appendChild(copybutton);

        let jumpbutton = document.createElement("button");
        jumpbutton.className = "controls_sub_display_button";
        jumpbutton.textContent = "jump to";
        jumpbutton.addEventListener("click", function(){
            let subistarttime = loadedsubs[subi].starttime;
            let targettime = subistarttime + currentoffset;

            chrome.runtime.sendMessage({
                type: "settimefromcontrols",
                time: targettime
            });
            //console.log("Set current offset: " + currentoffset);
        });
        subdisp.appendChild(jumpbutton);

        let subsyncbutton = document.createElement("button");
        subsyncbutton.className = "controls_sub_display_button";
        subsyncbutton.textContent = "sync now";
        subsyncbutton.addEventListener("click", function(){
            let subistarttime = loadedsubs[subi].starttime;
            let offset = lastvideotime - subistarttime;

            setoffset(offset);
            //console.log("Set current offset: " + currentoffset);
        });
        subdisp.appendChild(subsyncbutton);
    });
}

function parseSRT(file) {
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

        updateSubtitlesList();
        sendSubsToVideo(loadedsubs);
    };
    filereader.readAsText(file);
}

function parseASS(file) {
    let filereader = new FileReader();
    filereader.onload = function(event) {
        //console.log(filereader.result);

        let matchline = /^\S+:\s?[0-9]+,(?<starthours>[0-9]+):(?<startminutes>[0-9]+):(?<startseconds>[0-9]+).(?<starthundredths>[0-9]+),(?<endhours>[0-9]+):(?<endminutes>[0-9]+):(?<endseconds>[0-9]+).(?<endhundredths>[0-9]+),[^,]*,[^,]*,[0-9]*,[0-9]*,[0-9]*,[^,]*,(?<line>.+)/;

        loadedsubs = []; // reset

        let lines = filereader.result.split("\n");
        lines.forEach(line => {
            let res = line.match(matchline);
            if(res != null) {
                let newsub = {
                    lines: []
                };
                newsub.starttime = parseFloat(res.groups.starthours) * 60.0 * 60.0 +
                                   parseFloat(res.groups.startminutes) * 60.0 +
                                   parseFloat(res.groups.startseconds) +
                                   parseFloat(res.groups.starthundredths) * 0.01;
                newsub.endtime = parseFloat(res.groups.endhours) * 60.0 * 60.0 +
                                 parseFloat(res.groups.endminutes) * 60.0 +
                                 parseFloat(res.groups.endseconds) +
                                 parseFloat(res.groups.endhundredths) * 0.01;

                if(res.groups.line != null) {
                    let lines = res.groups.line.split(/[\n\N]+/);
                    lines.forEach(line => {
                        line = line.replace("\\", "");
                        if(line.length > 0) {
                            newsub.lines.push(line);
                        }
                    });
                }
                loadedsubs.push(newsub);
            }
        });

        updateSubtitlesList();
        sendSubsToVideo(loadedsubs);
    }

    filereader.readAsText(file);
}

function sendSubsToVideo(subs) {
    chrome.runtime.sendMessage(
        {
            type: "loadedsubsfromcontrols",
            loadedsubs: subs
        }
    );
}
let videoarea = document.getElementById("showmedia_video");
if(videoarea != null) {
    // -- create subtitle upload/control area
    //controlsdiv.style.width = "100%";
    controlsdiv.style.padding = "20px";
    controlsdiv.style.borderStyle = "solid";
    controlsdiv.style.borderColor = "#000000";
    controlsdiv.style.borderWidth = "1px";
    controlsdiv.style.marginBottom = "20px";

    let dropdiv = document.createElement("div");
    dropdiv.id = "ext_drop_div";
    let droptext = document.createElement("p");
    droptext.innerHTML = "drop subtitle file (SRT) here";
    dropdiv.appendChild(droptext);

    let offsetoptspanel = document.createElement("div");
    offsetoptspanel.id = "offset_opts_panel";

    let offsetdiv = document.createElement("div");
    offsetdiv.className = "controlsdiv";
    offsetdiv.id = "offset_panel";
    offsetoptspanel.appendChild(offsetdiv);
    let offsetlabel = document.createElement("label");
    offsetlabel.innerHTML = "Offset (seconds):"
    offsetlabel.style.marginRight = "10px";
    offsetdiv.appendChild(offsetlabel);
    offsetinput.step = 0.05;
    offsetinput.value = 0.0;
    offsetdiv.appendChild(offsetinput);
    let soonerbutton = document.createElement("button");
    soonerbutton.textContent = "0.1s sooner";
    soonerbutton.style.marginLeft = "10px";
    soonerbutton.onclick = function() {
        setoffset(currentoffset - 0.1);
    };
    offsetdiv.appendChild(soonerbutton);
    let laterbutton = document.createElement("button");
    laterbutton.textContent = "0.1s later";
    laterbutton.style.marginLeft = "10px";
    laterbutton.onclick = function() {
        setoffset(currentoffset + 0.1);
    };
    offsetdiv.appendChild(laterbutton);

    let optsdiv = document.createElement("div");
    optsdiv.className = "controlsdiv";
    optsdiv.id = "opts_panel";
    offsetoptspanel.appendChild(optsdiv);

    let optschecklist = document.createElement("list");
    optsdiv.appendChild(optschecklist);

    let optsubcheckboxul = document.createElement("ul");
    optsdiv.appendChild(optsubcheckboxul);
    let optsubcheckbox = document.createElement("input");
    optsubcheckbox.type = "checkbox";
    optsubcheckbox.id = "opts_sub_checkbox";
    optsubcheckbox.className = "opts_checkbox";
    optsubcheckboxul.appendChild(optsubcheckbox);
    optsublabel = document.createElement("label");
    optsublabel.id = "opts_sub_label";
    optsublabel.className = "opts_checkbox_label";
    optsublabel.htmlFor = "opts_sub_checkbox";
    optsublabel.textContent = "Replace Crunchyroll subtitles";
    optsubcheckboxul.appendChild(optsublabel);
    optsubcheckbox.onclick = function() {
        chrome.runtime.sendMessage({
            type: "setreplacecrunchysubsfromcontrols",
            replace: optsubcheckbox.checked
        });
    };
    optsubcheckbox.checked = true;

    let optsubendpausecheckboxul = document.createElement("ul");
    optsdiv.appendChild(optsubendpausecheckboxul);
    let optsubendpausecheckbox = document.createElement("input");
    optsubendpausecheckbox.type = "checkbox";
    optsubendpausecheckbox.id = "opts_sub_end_pause_checkbox";
    optsubendpausecheckbox.className = "opts_checkbox";
    optsubendpausecheckboxul.appendChild(optsubendpausecheckbox);
    optsubendpauselabel = document.createElement("label");
    optsubendpauselabel.id = "opts_sub_end_pause_label";
    optsubendpauselabel.className = "opts_checkbox_label";
    optsubendpauselabel.htmlFor = "opts_sub_end_pause_checkbox";
    optsubendpauselabel.textContent = "Pause at end of each sub";
    optsubendpausecheckboxul.appendChild(optsubendpauselabel);
    optsubendpausecheckbox.onclick = function() {
        chrome.runtime.sendMessage({
            type: "setsubendpausefromcontrols",
            subendpause: optsubendpausecheckbox.checked
        });
    };
    optsubendpausecheckbox.checked = false;

    chrome.storage.sync.get(['suboffset'], function(result) {
        if(result != null) {
            if(result.suboffset != null) {
                setoffset(result.suboffset);
            }
        }
    });

    chrome.runtime.onMessage.addListener(
        function(message, sender, sendResponse) {
            if(message.type == "timeupdatefrombackground") {
                //console.log("Controls time: " + message.time);
                lastvideotime = message.time;

                let subis = [];

                loadedsubs.forEach((sub, subi) => {
                    let offsetstart = sub.starttime + currentoffset;
                    let offsetend = sub.endtime + currentoffset;
                    if(offsetstart <= message.time && offsetend >= message.time) {
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

            //console.log(file.name);

            if(file.name.includes(".srt") || file.name.includes(".SRT")) {
                parseSRT(file);
            }
            else if(file.name.includes(".ass") || file.name.includes(".ASS")) {
                parseASS(file);
            }
        }
    });

    controlsdiv.appendChild(dropdiv);
    controlsdiv.appendChild(offsetoptspanel);
    videoarea.parentNode.insertBefore(controlsdiv, videoarea.nextSibling);
}

