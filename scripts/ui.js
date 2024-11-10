/* Main page UI, button functionality, etc. */

/*window.onload = () => {
  initColorPicker();
}*/

// UI button parameters
let selectedColor = "ffffff"; // default
let currentImgDataURL;

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

// Attach onclick event listeners to Color selection buttons
defaultColorButtons.forEach(colorButton => {
  colorButton.onclick = (e) => {
    selectColorOption(colorButton);
    let color = colorButton.id.split("-")[2];
    //let newImgPath = `style/images/compact_cooler_${color}.png`;
    let newImgPath = defaultColorsURLs[colorButton.id];
    // TODO: programatically get product name...
    productImage.src = newImgPath;
    // TODO: update color picker button color and input (hex) value
    updateColorPicker(defaultColors[colorButton.id]);
  }
})

// Coloris color picker (settings, input grab)
// TODO: must wait for something to load?
function initColorPicker() {
  Coloris({
    //themeMode: 'dark',
    alpha: false,
    defaultColor: '#ffffff',
    //formatToggle: true,
    closeButton: true,
    rtl: true,
  });
  updateColorPicker("ffffff");
}
initColorPicker();

// Update preview color and hex color code (i.e. if default color chosen)
function updateColorPicker(hexColor) {
  colorisColorInput.value = "#" + hexColor;
  colorisColorInput.dispatchEvent(new Event('input', { bubbles: true }));
}

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
    chooseCustomColor(hashlessHexColor);
  }
}

function chooseCustomColor(hexColor) {
  // Update color ONLY if color not in default colors
  // TODO: optimize - only calculate new rendering if NEW custom color
  if (isNotDefaultColor(hexColor) && hexColor !== selectedColor) {
    deselectColorOptions();
    let coloredImageData = getColoredImageData(colorImg, baseImg, hexColor)
    selectedColor = hexColor;
    currentImgDataURL = getImageDataURL(coloredImageData);
    productImage.src = currentImgDataURL;
    console.log("color picked: ", hexColor)
  }
}

downloadButton.onclick = (e) => {
  downloadImage();
};


// CUSTOM COLOR SELECT
/*colorButtonCustom.onclick = (e) => {
  // TODO: call function (write it) to show overlay of imgur images
  // TODO: need to wait until images loaded before coloring image
  let coloredImageData = getColoredImageData(colorImg, baseImg, "350000");
  showImageData(coloredImageData);
}*/

function selectColorOption(selectedColorButton) {
  deselectColorOptions();
  // Apply selected style to button
  selectedColorButton.classList.add("selected-color");
  selectedColorButton.firstElementChild.classList.remove("hidden");
  // Update color selection
  selectedColor = defaultColors[selectedColorButton.id];
  currentImgDataURL = defaultColorsImgs[selectedColorButton.id].dataURL;
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

function isNotDefaultColor(hexColor) {
  return !Object.values(defaultColors).includes(hexColor);
}
