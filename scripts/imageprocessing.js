/* Client side image processing script */


// Canvas, product view parameters
const viewContainer = document.querySelector(".product-view-container");
const logoOverlay = document.querySelector("#logo-placement-overlay");
const logoImgContainer = document.querySelector(".logo-image-container");
const logoImgDiv = document.querySelector("#logo-image");
//const logoImgDivPreview = document.querySelector("#logo-image-preview");
const uploadLogoContainer = document.querySelector(".upload-logo-button-container");
const uploadLogoPrompt = document.querySelector(".upload-logo-button-prompt");
const uploadLogoControls = document.querySelector(".upload-logo-button-controls");

const canvas = document.querySelector("#product-view-canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
//const scaleLogoCanvas = document.querySelector("#scale-logo-canvas");
//const scaleLogoCtx = scaleLogoCanvas.getContext("2d", { willReadFrequently: true });

const imgURLs = {
  // Default color images
  "color-button-white": "https://i.imgur.com/PVFQMoM.jpeg",
  "color-button-red": "https://i.imgur.com/jGGP3a3.jpeg",
  "color-button-yellow": "https://i.imgur.com/VKBEiN1.jpeg",
  "color-button-green": "https://i.imgur.com/gi5LqhD.jpeg",
  "color-button-blue": "https://i.imgur.com/oxrAB4g.jpeg",
  "color-button-violet": "https://i.imgur.com/6571h3j.jpeg",
  // Images for image processing (e.g. base layer, mask layer)
  "base-img": "https://i.imgur.com/PVFQMoM.jpeg",
  "mask-img": "https://i.imgur.com/MMZyBZy.png",
  "corners-img": "https://i.imgur.com/9fqr5Jd.png",
  // Test images
  "logo-img": "https://i.imgur.com/X4FAu7l.png",
}

// Default color images (new image objects)
let imgObjects = {} // name : image
// Load first default image (white cart)
// TODO: make this into initImageObjects()
saveImageData(loadImageObject("color-button-white"), true);

// Cart images for image processing: color fill "mask", and base image, nonwhite default color images
let maskImg;
let baseImg;
let logoImg;

// Marked corner pixels (nontransparent, red) in corners-img
let markedPixelIndexes = [];  // index in imgData.data for corresponding pixel
let markedPixelCoords = [];   // coords for pixel in web page dimensions (rel. to origin of product-image)
let logoBox = {};       // coords, dimensions and bounds for rectangle bouding marked pixels for logo placement
/* logoBox = {
    logoBox.left = xMin;
    logoBox.right = xMax;
    logoBox.top = yMin;
    logoBox.bottom = yMax;
    logoBox.width = xMax - xMin;
    logoBox.height = yMax - yMin;
    logoBox.coords = [[],[],[],[]]];
  } */
let logoAspectRatio;
let hMatrix;

// TODO:
// May want to have multiple logo images applied to different surfaces
// Need multiple instances of logoImgs, cornerImgs, markedPixelIndexes,
// markedPixelCoords, logoBox, and logoAspectRatio
// Save all in separate logoObj objects

// TODO: get this from image file, HTML doc, etc. Move to UI.js?
let companyName = "Unique_Vending_Carts";
let productName = "Cooler_Cart";



/* --------------------------- GET IMAGE DATA --------------------------- */

// NOTE: setting custom paramters for image objects:
// remoteURL: url link to png image (for now, imgur link)
// imageData: image data obtained from canvas context, imageData.data gives pixel values

// function load image handler
// NOTE: attemot at lazy loading images
// 1. load first image (white cart) on page load
// 2. load remaining default color images on first click
//    (check if in hashmap imgObjects)
// 3. load maskImg, baseImg (for image processing) on first interaction
//    with color picker
function loadImageObject(imgNodeName) {
  console.log("LOADING IMG: ", imgNodeName)
  let newImgObj = new Image();
  newImgObj.remoteURL = imgURLs[imgNodeName];
  newImgObj.imgNodeName = imgNodeName;
  saveImageData(newImgObj);
  imgObjects[imgNodeName] = newImgObj;
  return newImgObj;
}

// Draw image to canvas, get image data, save as object parameter
function saveImageData(imgObj, updateCurrDataURL=false) {
  imgObj.crossOrigin = "anonymous";
  imgObj.onload = () => {
    // Set canvas, draw to canvas
    if (imgObj.imgNodeName === "corners-img") {
      // Build perspective plane => Save marked corner pixels
      saveFullImageData(imgObj);
      // Save marked pixels, find corresponging coordinates
      saveMarkedPixelData(imgObj);
      // Reorder marked pixel coords if necessary
      orderMarkedPixelCoords();
      // Calculate and save pixel coords of bounding rectangle around marked px
      saveOuterRectPixelCoords();
      // Fetch logo image
      // TODO: TESTING REMOTE SRC (imgur) LOGO TRANSFORM - REPLACE WITH UPLOAD HANDLING AND SERVER CALL
      saveLogoImage();
    }
    // NOTE: order matters -- must save corners-img before logo-img
    else if (imgObj.imgNodeName === "logo-img") {
      let scaleFactor = 0.8; // TODO: change this programmatically
      saveLogoImageData(imgObj, scaleFactor);
      saveHomography();
      saveLogo3DImage();
      showLogo3DImage();
    }
    else {
      saveFullImageData(imgObj);
    }
    if (updateCurrDataURL) {
      // Update current currentImgData, dataURL
      currentImgData = imgObj.imageData;
      currentImgDataURL = imgObj.dataURL;
    }
    // NOTE: may want to use this for logo position preview
    /*if (imgObj.imgNodeName === "logo-img") {
      // Set src to make logo img visible
      logoImgDivPreview.src = imgObj.dataURL;
    }*/
  };
  imgObj.src = imgObj.remoteURL;
}

// TODO: optimize - save some recent imageData as dataURLs,
// set productImage.src on subsequent calls instead of new
// canvas operation everytime.
function getImageDataURL(imageData) {
  // Draw new image to canvas
  ctx.putImageData(imageData, 0, 0);
  // Convert canvas to data URL (base64 encoded PNG)
  return canvas.toDataURL();
}

function downloadImage(dataURL) {
  let fileName = `${companyName}_${productName}.png`;
  let link = document.createElement("a");
  link.download = fileName;
  link.href = dataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  delete link;
}




/* --------------------------- COLOR IMAGE --------------------------- */


// Color maskImg (color overlay) with color burn pixel math
// TODO: try different color overlay methods (e.g. multiply, darken, etc.)
function getColoredImageData(maskImg, baseImg, selectedColorHex="FFFFFF", blendMode="colorBurn") {
  // Input image data
  // NOTE: assunming maskImg and baseImg are same size and centering
  let maskImgPixelData = maskImg.imageData.data;
  let baseImgPixelData = baseImg.imageData.data;
  // Result data, colored image
  let resultImageData = new ImageData(baseImg.width, baseImg.height);
  let resultPixelData = resultImageData.data;
  console.log("baseImg length: ", baseImgPixelData.length)
  console.log("resImg length: ", resultPixelData.length)
  // NOTE: data property is readonly. Assign reference, set pixel values directly.
  // Parse color RGB value from hex code string
  let selectedColorRGB = hexToRGB(selectedColorHex);
  // NOTE: refernce pixel is "middle" pixel of base layer,
  // use for reverse calculating mask color values in
  // preferred blend method to get desired color output
  // TODO: PROGRAMATICALLY SELECT THIS FROM MOUSE INPUT!!
  /*let refBasePixel = [baseImgPixelData[baseImgPixelData.length/2],
                      baseImgPixelData[baseImgPixelData.length/2+1],
                      baseImgPixelData[baseImgPixelData.length/2+2],
                      baseImgPixelData[baseImgPixelData.length/2+3]];*/
  let refBasePixel = [220,220,220,255];
  // Color that matches target color after applying desired blend mode
  let adjustedColorRGB = getColorRGBFromInverseBlendMode(refBasePixel, selectedColorRGB, blendMode);
  // Iterate over individual pixels
  for (let i = 0; i < maskImgPixelData.length; i += 4) {
    // Color maskImg, use baseImg where maskImg is transparent
    resultPixelData[i] = baseImgPixelData[i];
    resultPixelData[i+1] = baseImgPixelData[i+1];
    resultPixelData[i+2] = baseImgPixelData[i+2];
    resultPixelData[i+3] = baseImgPixelData[i+3];
    // Destructure pixel value of color image layer (r,g,b,a)
    let alpha = maskImgPixelData[i+3];
    let colorLayerPixel = [maskImgPixelData[i],
                           maskImgPixelData[i+1],
                           maskImgPixelData[i+2],
                           alpha];
    if (alpha > 0) {
      // Get colored pixel using adjusted color
      let coloredPixel = getColoredPixel(colorLayerPixel, adjustedColorRGB, blendMode);
      resultPixelData[i] = coloredPixel[0];
      resultPixelData[i+1] = coloredPixel[1];
      resultPixelData[i+2] = coloredPixel[2];
      resultPixelData[i+3] = coloredPixel[3];
    }
  }
  //console.log(baseImg.imageData)
  //console.log(resultImageData)
  return resultImageData;
}



/* --------------------------- LOGO UPLOAD --------------------------- */

// 2 options: a. automatically center, b. place manually

// PLACE MANUALLY -- Project "logo zone" on mouse hover over product image
// 1. Find homography / transformation matrix from 4 points in image
//    1a. using 4 manually colored red pixels (255,37,0) in "corners image"
// 2. Project "fullsize" rectangle div (i.e. entire area of cart side)
// 3. Highlight/color small section of div centered around mouse cursor, dimensions
//    of section same as scaled logo image => project this image
// 4. Make new logo image with logo in highlighted section, project onto cart
// 5. Save cart image / new data url ??

/*window.onmousemove = (e) => {
  console.log(`mouse pos: ${e.clientX}, ${e.clientY}`)
}*/

// Apply matrix 3d transform to input logo image
// NOTE: MUST rescale to original, consider origin with respect to base image
function getLogoImageData3D(hMatrix, logoImg) {
  let logoImgPixelData = logoImg.imageData.data;
  let pixelWidth = logoImg.imageData.width;
  let pixelHeight = logoImg.imageData.height;
  // Result data, colored image
  let resultImageData = new ImageData(pixelWidth, pixelHeight);
  let resultPixelData = resultImageData.data;
  //console.log("input data calc len: ", logoImg.height * logoImg.width * 4)
  //console.log("input imageData calc len: ", logoImg.imageData.height * logoImg.imageData.width * 4)
  //console.log("output data calc len: ", resultImageData.height * resultImageData.width * 4)
  //console.log("input data len: ", logoImgPixelData.length)
  //console.log("output data len: ", resultPixelData.length)
  // Iterate over individual pixels
  //let temp = 0;
  for (let i = 0; i < logoImgPixelData.length; i += 4) {
    let [r,g,b,a] = [logoImgPixelData[i],
                     logoImgPixelData[i+1],
                     logoImgPixelData[i+2],
                     logoImgPixelData[i+3]]
    if (a > 0) {
      let pixelCount = i/4;
      let pixelY = Math.floor(pixelCount/pixelWidth);
      let pixelX = pixelCount % pixelWidth;
      //let pixelY = Math.floor(i/(4*logoImg.width));
      //let pixelX = i % (4*logoImg.width);
      // Input coordinate
      //let inputCoord = [pixelX+logoBox.left, pixelY+logoBox.top];
      let inputCoord = [pixelX, pixelY];
      // Output coordinate
      let [xOutput, yOutput] = applyHomography(hMatrix, inputCoord);
      // Coordinate to pixel index
      //let newIndex = (Math.floor(yOutput)-logoBox.top) * (pixelWidth * 4) + (Math.floor(xOutput)-logoBox.left) * 4;
      let newIndex = (Math.floor(yOutput)) * (pixelWidth * 4) + (Math.floor(xOutput)) * 4;
      // Write pixel data to result imageData
      resultPixelData[newIndex] = r;
      resultPixelData[newIndex+1] = g;
      resultPixelData[newIndex+2] = b;
      resultPixelData[newIndex+3] = a;
    }
  }
  return resultImageData;
}

function getMergedLogoCartImageData(currentImgData, currentLogo3DImgData) {
  let logoImgPixelData = currentLogo3DImgData.data;
  let cartImgPixelData = currentImgData.data;
  // Result data, colored image
  let resultImageData = new ImageData(currentImgData.width, currentImgData.height);
  let resultPixelData = resultImageData.data;
  // Iterate over individual pixels
  for (let i = 0; i < cartImgPixelData.length; i += 4) {
    let logoPixel = [logoImgPixelData[i], logoImgPixelData[i+1], logoImgPixelData[i+2], logoImgPixelData[i+3]];
    let cartPixel = [cartImgPixelData[i], cartImgPixelData[i+1], cartImgPixelData[i+2], cartImgPixelData[i+3]];
    let resultPixel = cartPixel;
    // If logo pixel nontransparent, add to result image data
    if (logoPixel[3] > 0) {
      resultPixel = logoPixel;
    }
    resultPixelData[i] = resultPixel[0];
    resultPixelData[i+1] = resultPixel[1];
    resultPixelData[i+2] = resultPixel[2];
    resultPixelData[i+3] = resultPixel[3];
  }
  return resultImageData;
}



/* ------------------------ HELPER FUNCTIONS (CANVAS) ------------------------ */

function saveFullImageData(imgObj) {
  canvas.width = imgObj.width;
  canvas.height = imgObj.height;
  ctx.drawImage(imgObj, 0, 0);
  // Get image data
  imgObj.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  // Get image data url
  imgObj.dataURL = canvas.toDataURL();
}

// Save logo image in base cart image size container
// Scale image to fit inside scaleFactor % of side panel (logoBox dimensions)
function saveLogoImageData(imgObj, scaleFactor) {
  // TODO: err handling if logoBox is empty
  canvas.width = currentImgData.width;
  canvas.height = currentImgData.height;
  let aspectRatio = imgObj.width / imgObj.height;
  let relWidth = imgObj.width / logoBox.width;
  let relHeight = imgObj.height / logoBox.height;
  let scaleWidth = scaleFactor * logoBox.width;
  let scaleHeight = scaleWidth / aspectRatio;
  // Assuming width is larger, adjust if height > width
  if (relHeight > relWidth) {
    scaleHeight = scaleFactor * logoBox.height;
    scaleWidth = scaleHeight * aspectRatio;
  }
  // Choose draw origin such that logo is centered
  let xInit = logoBox.left + (logoBox.width - scaleWidth)/2;
  let yInit = logoBox.top + (logoBox.height - scaleHeight)/2;
  console.log("logo box top: ", logoBox.top)
  console.log("yInit: ", yInit)
  ctx.drawImage(imgObj, xInit, yInit, scaleWidth, scaleHeight);
  // Get image data
  imgObj.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  console.log(4*canvas.width*canvas.height)
  // Get image data url
  imgObj.dataURL = canvas.toDataURL();
}



/* ------------------------ HELPER FUNCTIONS (LOGO) ------------------------ */

function buildLogoPlacementZone() {
  saveImageData(loadImageObject("corners-img"));
}

// TODO: REPLACE WITH LOGO IMAGE UPLOAD, SERVER CALL
function saveLogoImage() {
  logoImg = loadImageObject("logo-img");
  saveImageData(logoImg);
}

function saveMarkedPixelData(imgObj) {
  let imgPixelData = imgObj.imageData.data;
  // Iterate over individual pixels
  for (let i = 0; i < imgPixelData.length; i += 4) {
    // Find corner pixels index for logo application
    let alpha = imgPixelData[i+3];
    let pixel = [imgPixelData[i], imgPixelData[i+1], imgPixelData[i+2], alpha];
    if (isMarkedPixel(pixel)) {
      markedPixelIndexes.push(i);
      markedPixelCoords.push(getCornerImgPixelCoords(imgObj, i));
    }
  }
}

function saveHomography() {
  // Get homography matrix
  hMatrix = getHomography(
    logoBox.coords[0], markedPixelCoords[0], logoBox.coords[1], markedPixelCoords[1],
    logoBox.coords[3], markedPixelCoords[3], logoBox.coords[2], markedPixelCoords[2]);
}

function saveLogo3DImage() {
  // Apply homography matrix, use pixel units defined by logoBox
  currentLogo3DImgData = getLogoImageData3D(hMatrix, logoImg);
  currentLogo3DImgDataURL = getImageDataURL(currentLogo3DImgData);
}

function showLogo3DImage() {
  // Make logo visible in logoImageContainer
  logoImgDiv.src = currentLogo3DImgDataURL;
  logoImgDiv.classList.remove("hidden");
  // Make logo visible in upload logo button container
  toggleLogoUploadContainer();
}

function toggleLogoUploadContainer() {
  if (!isLogoActive()) {
    uploadLogoPrompt.classList.add("hidden");
    uploadLogoControls.classList.remove("hidden");
    uploadLogoContainer.style.backgroundImage = `url(${logoImg.src})`;
    uploadLogoContainer.style.backgroundSize = 'contain';
    uploadLogoContainer.style.backgroundRepeat = 'no-repeat';
    uploadLogoContainer.style.backgroundPosition = 'center';
  }
  else {
    currentMergedImgData = "";
    currentMergedImgDataURL = "";
    uploadLogoControls.classList.add("hidden");
    uploadLogoPrompt.classList.remove("hidden");
    uploadLogoContainer.style.backgroundImage = "";
    logoImgDiv.classList.add("hidden");
  }
}

// Calculate pixel coordinate on product view img from pixel on cart image
function getCornerImgPixelCoords(imgObj, pixelIndex) {
  let imgRect = productImage.getBoundingClientRect();
  let imgWidth = imgObj.width;
  let widthRatio = imgRect.width / imgWidth;
  let pixelCount = Math.floor(pixelIndex/4);
  let pixelY = Math.floor(pixelCount/imgWidth);
  let pixelX = pixelCount % imgWidth;
  /*let adjustedPixelY = widthRatio * pixelY;
  let adjustedPixelX = widthRatio * pixelX;
  return [adjustedPixelX, adjustedPixelY];*/
  return [pixelX, pixelY]
}

// Order pixel coords to match bounding rect coords: TL, TR, BL, BR
// Pixel data is read like an array, left-to-right, top-down.
// If perspective plane is skewed such that TR pixel is read before TL,
// same for BR and BL pixel coords, swap their position in markedPixelCoords.
function orderMarkedPixelCoords() {
  // Check that markedPixelCoords is nonenempty, should contain 4 pixel coords
  if (markedPixelCoords.length !== 4) {
    return; // TODO: Handle error
  }
  // Swap top left and top right pixel coords if needed
  if (markedPixelCoords[0][0] > markedPixelCoords[1][0] &&
      markedPixelCoords[0][1] <= markedPixelCoords[1][1]) {
        let temp = markedPixelCoords[0];
        markedPixelCoords[0] = markedPixelCoords[1];
        markedPixelCoords[1] = temp;
      }
  // Swap bottom left and bottom right if needed
  if (markedPixelCoords[2][0] > markedPixelCoords[3][0] &&
      markedPixelCoords[2][1] <= markedPixelCoords[3][1]) {
        let temp = markedPixelCoords[2];
        markedPixelCoords[2] = markedPixelCoords[3];
        markedPixelCoords[3] = temp;
      }
}

// Get pixel coords for rectangle around marker corner pixels in cart img
// (i.e. make basis pixels from which to transform to perspective pixels)
// TODO: CAPTURE MOUSE CURSOR, PROJECT MOUSE POSITION AS WELL (USE DIFF ICON)
// SO PROJECTED HIGHLIGHT DIV SECTION IS ALWAYS CENTERED ON CURSOR
function saveOuterRectPixelCoords() {
  // Check that markedPixelCoords is nonenempty, should contain 4 pixel coords
  if (markedPixelCoords.length !== 4) {
    return; // TODO: Handle error
  }
  let xMin = markedPixelCoords[0][0];
  let xMax = xMin;
  let yMin = markedPixelCoords[0][1];
  let yMax = yMin;
  for (var i=1; i<4; i++) {
    xMin = Math.min(xMin, markedPixelCoords[i][0]);
    xMax = Math.max(xMax, markedPixelCoords[i][0]);
    yMin = Math.min(yMin, markedPixelCoords[i][1]);
    yMax = Math.max(yMax, markedPixelCoords[i][1]);
  }
  logoBox.left = xMin;
  logoBox.right = xMax;
  logoBox.top = yMin;
  logoBox.bottom = yMax;
  logoBox.width = xMax - xMin;
  logoBox.height = yMax - yMin;
  logoBox.coords = [[xMin,yMin],[xMax,yMin],[xMin,yMax],[xMax,yMax]];
}

// Initialize logo overlay div - Set position and transform properties
// NOTE: USE FOR FUTURE FEATURE -- PREVIEW AND PLACING LOGO
// ONCE PLACED, CONVERT COORDINATES BACK TO FULL IMG, ...
/*function initLogoOverlay() {
  // Relevant coordinates calculated relative to img, BUT logo overlay div
  // positioned relative to view container. Must correct for this before setting.
  let viewContainerRect = viewContainer.getBoundingClientRect();
  let imgRect = productImage.getBoundingClientRect();
  let xDiff = imgRect.left - viewContainerRect.left;
  let yDiff = imgRect.top - viewContainerRect.top;
  // Set position and dimensinos
  logoOverlay.style.top = logoBox.top + yDiff + "px";
  logoOverlay.style.left = logoBox.left + xDiff + "px";
  logoOverlay.style.height = logoBox.height + "px";
  logoOverlay.style.width = logoBox.width + "px";
  // Set tranform origin
  let origin = `${-logoBox.left-xDiff}px ${-logoBox.top-yDiff}px`;
  logoOverlay.style["-webkit-transform-origin"] = origin;
  logoOverlay.style["-moz-transform-origin"] = origin;
  logoOverlay.style["-o-transform-origin"] = origin;
  logoOverlay.style.transformOrigin = origin;
  // Make visible
  logoOverlay.classList.remove("hidden");
  logoImgDivPreview.classList.remove("hidden");
}*/

function isMarkedPixel(pixel, tolerance=0.005) {
  let [r, g, b, a] = pixel;
  // Impl 1. Color match pixel in mask image to red pixel
  /*let target = [255, 37, 0];
  let diffPercent = (Math.abs(target[0]-r) +
                      Math.abs(target[1]-g) +
                      Math.abs(target[2]-b)) / (3*255);
  return diffPercent <= tolerance;*/
  // Impl 2. Find only nontransparent pixels in corner image
  let targetAlpha = 255;
  let diffPercent = (targetAlpha-a)/targetAlpha;
  return diffPercent <= tolerance;
}



/* ------------------------ HELPER FUNCTIONS (COLOR) ------------------------ */

// Color pixel data according to coloring algorithm, e.g. color burn
// Pixels are 4-arrays, [red, green, blue, alpha]
// TODO: CHANGE BLEND MODE programatically
function getColoredPixel(colorLayerPixel, adjustedColorRGB, blendMode) {
  const [redInit, greenInit, blueInit, alpha] = colorLayerPixel;
  const [redTarget, greenTarget, blueTarget] = adjustedColorRGB;
  // For A = Active Layer, B = bg layer, T = target
  if (blendMode === "colorBurn") {
    // Color Burn: 1-((1-B)/A) = T
    return [255*(1-((1-(redInit/255))/(redTarget/255))),
            255*(1-((1-(greenInit/255))/(greenTarget/255))),
            255*(1-((1-(blueInit/255))/(blueTarget/255))),
            alpha];
  }
  if (blendMode === "linearBurn") {
    // Linear Burn: A+B-1 = T
    return [255*((redInit/255)+(redTarget/255)-1),
            255*((greenInit/255)+(greenTarget/255)-1),
            255*((blueInit/255)+(blueTarget/255)-1),
            alpha];
  }
}

function getColorRGBFromInverseBlendMode(refBasePixel, selectedColorRGB, blendMode) {
  const [redInit, greenInit, blueInit, alpha] = refBasePixel;
  const [redTarget, greenTarget, blueTarget] = selectedColorRGB;
  // For A = Active Layer, B = bg layer, T = target
  if (blendMode === "colorBurn") {
    // Color Burn: 1-((1-B)/A) = T  ==>  (1-B)/(1-T) = A
    return [255*((1-(redInit/255))/(1-(redTarget/255))),
            255*((1-(greenInit/255))/(1-(greenTarget/255))),
            255*((1-(blueInit/255))/(1-(blueTarget/255)))];
  }
  if (blendMode === "linearBurn") {
    // Linear Burn: A+B-1 = T  ==>  1+T-B = A
    return [255*(1-(redInit/255)+(redTarget/255)),
            255*(1-(greenInit/255)+(greenTarget/255)),
            255*(1-(blueInit/255)+(blueTarget/255))];
  }
}

// Return array of [red, green, blue] color values (0-255)
// from input hex string, e.g. 'FFFFFF'
function hexToRGB(hexCode) {
  let red = parseInt(hexCode.substring(0,2), 16);
  let green = parseInt(hexCode.substring(2,4), 16);
  let blue = parseInt(hexCode.substring(4,6), 16);
  return [red, green, blue];
}




//
