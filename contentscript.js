console.log("content script running");

//let video_frame = document.getElementById("vilos-player");

//let video_document = video_frame.contentWindow.document;

let video = document.getElementById("player0");

//video.style.display = "none";

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
//textdiv.style.marginTop = "90%";
textdiv.style.fontSize = "xx-large";

let subtext = document.createTextNode("hello world");

textdiv.appendChild(subtext);
subdiv.appendChild(textdiv);
video.parentElement.appendChild(subdiv);

video.addEventListener("timeupdate", function() {
    subtext.nodeValue = "time: " + video.currentTime;
    console.log("time update: " + video.currentTime);
});
