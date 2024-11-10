/* main.js */


/* LOAD SCRIPTS SEQUENTIALLY */

let scripts = [
  "scripts/coloris.js",
  "scripts/ui.js",
  "scripts/imageprocessing.js"
];

function loadScripts(scripts){
  let script = scripts.shift();
  let el = document.createElement('script');
  document.body.append(el);
  el.onload = (script) => {
    console.log(script + ' loaded!');
      if (scripts.length) {
        loadScripts(scripts);
      }
      else {
        console.log('run app');
      }
  };
  el.src = script;
}

loadScripts(scripts);



/*function loadScript(url) {
    var script = document.createElement("script"); //Make a script DOM node
    script.src = url; //Set it's src to the provided URL
    document.body.appendChild(script); //Add it to the end of the head section of the page (could change 'head' to 'body' to add it to the end of the body section instead)
}*/


// Local Scripts
//loadScript("scripts/coloris.js");
//loadScript("scripts/ui.js");
//loadScript("scripts/imageprocessing.js");
//loadScript("scripts/photopea.js");

// CDN scripts
//loadScript("https://cdn.rawgit.com/davidshimjs/qrcodejs/gh-pages/qrcode.min.js"); // Generate QR Code
//loadScript("https://cdn.jsdelivr.net/npm/js-confetti@latest/dist/js-confetti.browser.js") // Confetti Simulation
