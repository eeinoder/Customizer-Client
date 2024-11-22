/* Main page UI, button functionality, etc. */

/*window.onload = () => {
  initColorPicker();
}*/
const MOBILEMAXWIDTH = 700;
let currScreenSize = window.innerWidth<=MOBILEMAXWIDTH ? "mobile" : "desktop"; // "desktop" or "mobile"

window.onresize = () => {
  if (window.innerWidth <= MOBILEMAXWIDTH && currScreenSize === "desktop") {
    currScreenSize = "mobile";
    toggleMobileDropdownView();
  }
  else if (window.innerWidth > MOBILEMAXWIDTH && currScreenSize === "mobile") {
    currScreenSize = "desktop";
    toggleMobileDropdownView();
  }
}

// UI button parameters
let selectedColor = "ffffff"; // default
// Cart image data
let currentImgData;
let currentImgDataURL;
// Logo image data
let currentLogo3DImgData;
let currentLogo3DImgDataURL;
// Merged image data
let currentMergedImgData;
let currentMergedImgDataURL;

const defaultColors = {
  "color-button-white": "ffffff",
  "color-button-red": "dc8c5a",
  "color-button-yellow": "dcd15b",
  "color-button-green": "87d75b",
  "color-button-blue": "7764d7",
  "color-button-violet": "dc50dc"
};

// Default color option buttons
let defaultColorButtons = document.querySelectorAll(".default-color");
let allColorButtons = document.querySelectorAll(".color-option");

let colorButtonWhite = document.querySelector("#color-button-white");
let colorButtonRed = document.querySelector("#color-button-red");
let colorButtonYellow = document.querySelector("#color-button-yellow");
let colorButtonGreen = document.querySelector("#color-button-green");
let colorButtonBlue = document.querySelector("#color-button-blue");
let colorButtonViolet = document.querySelector("#color-button-violet");

//let colorButtonCustom = document.querySelector("#color-button-custom");
let colorisColorInput = document.querySelector("#coloris-color-picker");

// Product image
let productImage = document.querySelector("#product-image");

// Download button
let downloadButton = document.querySelector("#download-button");

// Upload logo button
let uploadLogoButton = document.querySelector(".upload-logo-button-container");

// Attach onclick event listeners to Color selection buttons
defaultColorButtons.forEach(colorButton => {
  colorButton.onclick = (e) => {
    selectColorOption(colorButton);
    let color = colorButton.id.split("-")[2];
    //let newImgPath = `style/images/compact_cooler_${color}.png`;
    let newImgPath = imgURLs[colorButton.id];
    // TODO: programatically get product name...
    productImage.src = newImgPath;
    // TODO: update color picker button color and input (hex) value
    updateColorPicker(defaultColors[colorButton.id]);
  }
})

// Coloris color picker (settings, input grab)
// TODO: must wait for something to load?
function initColorPicker() {
  // Set certain modifications
  Coloris({
    //themeMode: 'dark',
    alpha: false,
    defaultColor: '#ffffff',
    //formatToggle: true,
    closeButton: true,
    rtl: true,
  });
  // Set initial color (white)
  updateColorPicker("ffffff");
  // Set to readonly (disable keyboard popup on mobile)
  colorisColorInput.readOnly = true;
}
// Run when page first opened
initColorPicker();

// On first click, load base and mask images
colorisColorInput.onclick = (e) => {
  if (!Object.keys(imgObjects).includes("base-img")) {
    maskImg = loadImageObject("mask-img");
    saveImageData(maskImg);
    baseImg = loadImageObject("base-img");
    saveImageData(baseImg);
  }
}

// Update preview color and hex color code (i.e. if default color chosen)
function updateColorPicker(hexColor) {
  colorisColorInput.value = "#" + hexColor;
  colorisColorInput.dispatchEvent(new Event('input', { bubbles: true }));
}

// TODO: DISABLE KEYBOARD POPUP (MOBILE) ON ENTER COLOR PICKER INPUT
// COLOR PICKER EVENT HANDLING
// Pick color event
/*document.addEventListener('coloris:pick', event => {
  console.log('New color', event.detail.color);
});*/
// Close event
colorisColorInput.onclose = (e) => {
  let hexColor = colorisColorInput.value;
  const hexColorRegex = /^#[0-9a-f]{3,6}$/i;
  if (hexColorRegex.test(hexColor)) {
    let hashlessHexColor = hexColor.substring(1);
    // NOTE: POSSIBLE RACE CONDITION - CAN ONLY EXECUTE BELOW ONCE MASK AND BASE IMGs LOADED IN
    chooseCustomColor(hashlessHexColor);
  }
}

function chooseCustomColor(hexColor) {
  // Update color ONLY if color not in default colors
  // TODO: optimize - only calculate new rendering if NEW custom color
  if (isNotDefaultColor(hexColor) && hexColor !== selectedColor) {
    deselectColorOptions();
    let coloredImageData = getColoredImageData(maskImg, baseImg, hexColor)
    selectedColor = hexColor;
    currentImgData = coloredImageData;
    currentImgDataURL = getImageDataURL(coloredImageData);
    productImage.src = currentImgDataURL;
    //console.log("color picked: ", hexColor)
  }
}

downloadButton.onclick = (e) => {
  // TODO: If logo is made and visible, create new imagData with merged
  // logo layer and cart base layer
  // If currentLogo3DImgData nonempty AND logo-image is NOT HIDDEN, download merged
  if (currentLogo3DImgData && isLogoVisible()) {
    downloadImage(currentMergedImgDataURL);
  }
  else {
    downloadImage(currentImgDataURL);
  }
};

uploadLogoButton.onclick = (e) => {
  //TODO: may want to separate above into separate actions
  // 1. upload corners -> upload logo, view preview (before apply)
  // 2. on user input (click APPLY) ->
  buildLogoPlacementZone();
}


// CUSTOM COLOR SELECT
/*colorButtonCustom.onclick = (e) => {
  // TODO: call function (write it) to show overlay of imgur images
  // TODO: need to wait until images loaded before coloring image
  let coloredImageData = getColoredImageData(maskImg, baseImg, "350000");
  showImageData(coloredImageData);
}*/

function selectColorOption(selectedColorButton) {
  deselectColorOptions();
  // Apply selected style to button
  selectedColorButton.classList.add("selected-color");
  selectedColorButton.firstElementChild.classList.remove("hidden");
  // Update color selection
  selectedColor = defaultColors[selectedColorButton.id];
  // Load image, get dataURL on first selection
  if (!Object.keys(imgObjects).includes(selectedColorButton.id)) {
    saveImageData(loadImageObject(selectedColorButton.id), true);
  }
  else {
    // Update current image dataURL
    currentImgData = mgObjects[selectedColorButton.id].imageData;
    currentImgDataURL = imgObjects[selectedColorButton.id].dataURL;
  }
}

function deselectColorOptions() {
  // Deselect current button (style)
  allColorButtons.forEach(colorButton => {
    let selectImgNode = colorButton.firstElementChild;
    colorButton.classList.remove("selected-color");
    if (selectImgNode.classList.contains("color-button-select-img")) {
      colorButton.firstElementChild.classList.add("hidden");
    }
  });
}



/* TAB TOGGLE BUTTONS */

const tabToggleButtons = document.querySelectorAll(".tab-toggle-button");
const tabContentContainers = document.querySelectorAll(".tab-content-container");
const openedTabImgSrc = "style/icons/minus_black.png";
const closedTabImgSrc = "style/icons/plus_black.png";

// Toggle mobile customization drop down
function toggleMobileDropdownView() {
  // Toggle dropdown buttons (+/-) and content ui
  if (currScreenSize === "mobile") {
    // Hide content, set button src to "plus.png", show buttons
    for (var i=0; i<tabToggleButtons.length; i++) {
      tabContentContainers[i].classList.add("hidden");
      tabToggleButtons[i].src = closedTabImgSrc;
      tabToggleButtons[i].classList.remove("hidden");
    }
  }
  else if (currScreenSize === "desktop") {
    // Show content containers, hide buttons
    for (var i=0; i<tabToggleButtons.length; i++) {
      tabContentContainers[i].classList.remove("hidden");
      tabToggleButtons[i].classList.add("hidden");
    }
  }
}
// Run when page first opened
toggleMobileDropdownView();

// Toggle button click event listener
tabToggleButtons.forEach(tabToggleButton => {
  tabToggleButton.onclick = (e) => {
    let tabName = tabToggleButton.id.split("-")[0];
    let contentContainerId = `${tabName}-content-container`;
    let contentContainer = document.getElementById(contentContainerId);
    // If currently closed => open
    if (contentContainer.classList.contains("hidden")) {
      contentContainer.classList.remove("hidden");
      tabToggleButton.src = openedTabImgSrc;
    }
    // If currently open => close
    else {
      contentContainer.classList.add("hidden");
      tabToggleButton.src = closedTabImgSrc;
    }
  };
});


// TODO: ON CLICK PRODUCT VIEWER => FULLSCREEN IMAGE (?)



/* HELPER FUNCTIONS */

function isNotDefaultColor(hexColor) {
  return !Object.values(defaultColors).includes(hexColor);
}

function isLogoVisible() {
  return !logoImgDiv.classList.contains("hidden");
}
