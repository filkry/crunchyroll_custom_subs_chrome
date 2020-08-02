function preventDefaults (e) {
  e.preventDefault();
  e.stopPropagation();
};

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
        console.log("drop event");
        dragevent.preventDefault();
        dragevent.stopPropagation();
        if(dragevent.dataTransfer.files.length > 0) {
            let file = dragevent.dataTransfer.files[0];
            console.log(file.name);
        }
    });

    controlsdiv.appendChild(controlstext);
    videoarea.parentNode.insertBefore(controlsdiv, videoarea.nextSibling);
}

