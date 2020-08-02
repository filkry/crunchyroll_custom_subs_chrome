function preventDefaults (e) {
  e.preventDefault();
  e.stopPropagation();
};

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

                loadedsubs = []; // reset

                lines.forEach(line => {
                    line = line.replace('\r', '');

                    if(state == EParseStates.eWaitingForNextSub) {
                        let res = line.match(matchnewsub);
                        if(res != null && res.length > 0) {
                            loadedsubs.push({}); // append empty sub
                            state = EParseStates.eWaitingForTime;
                            console.log("New sub!");
                        }
                    }
                    else if(state == EParseStates.eWaitingForTime) {

                    }
                });
            };
            filereader.readAsText(file);
        }
    });

    controlsdiv.appendChild(controlstext);
    videoarea.parentNode.insertBefore(controlsdiv, videoarea.nextSibling);
}

