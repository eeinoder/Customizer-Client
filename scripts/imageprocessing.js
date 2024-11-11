/* Client side image processing script */

// Canvas parameters
const canvas = document.querySelector("#product-view-canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });

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
  "mask-img": "https://i.imgur.com/NZVkbc2.png"
}

// Default color images (new image objects)
let imgObjects = {} // name : image
// Load first default image (white cart)
// TODO: make this into initImageObjects()
loadImage("color-button-white");
// Set current image data (default, onload)
currentImgDataURL = imgObjects["color-button-white"].dataURL;

/*for (const [cartImgName, cartImgURL] of Object.entries(imgURLs)) {
  let newImgObj = new Image();
  newImgObj.remoteURL = cartImgURL;
  saveImageData(newImgObj);
  imgObjects[cartImgName] = newImgObj;
}*/

// TODO: INVOKE LOADIMAGE() FOR maskImg AND baseImg on
// first click of colorpicker

// Cart images for image processing: color fill "mask", and base image, nonwhite default color images
let maskImg;
let baseImg;


// TODO: get this from image file, HTML doc, etc. Move to UI.js?
let companyName = "Unique_Vending_Carts";
let productName = "Cooler_Cart";

// NOTE: setting custom paramters for image objects:
// remoteURL: url link to png image (for now, imgur link)
// imageData: image data obtained from canvas context, imageData.data gives pixel values

// Get image data
/*cartImgs.forEach(cartImg => {
  cartImg.crossOrigin = "anonymous";
  cartImg.onload = () => {
    // Set canvas, draw to canvas
    canvas.width = cartImg.width;
    canvas.height = cartImg.height;
    ctx.drawImage(cartImg, 0, 0);
    // Get image data
    cartImg.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  };
  cartImg.src = cartImg.remoteURL;
});*/

// function load image handler
// NOTE: attemot at lazy loading images
// 1. load first image (white cart) on page load
// 2. load remaining default color images on first click
//    (check if in hashmap imgObjects)
// 3. load maskImg, baseImg (for image processing) on first interaction
//    with color picker
function loadImage(imgNodeName) {
  console.log("LOADING IMG: ", imgNodeName)
  let newImgObj = new Image();
  newImgObj.remoteURL = imgURLs[imgNodeName];
  saveImageData(newImgObj);
  imgObjects[imgNodeName] = newImgObj;
  return newImgObj;
}

// Draw image to canvas, get image data, save as object parameter
function saveImageData(imgObj) {
  imgObj.crossOrigin = "anonymous";
  imgObj.onload = () => {
    // Set canvas, draw to canvas
    canvas.width = imgObj.width;
    canvas.height = imgObj.height;
    ctx.drawImage(imgObj, 0, 0);
    // Get image data
    imgObj.imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    // Get image data url
    imgObj.dataURL = canvas.toDataURL();
  };
  imgObj.src = imgObj.remoteURL;
}




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


// TODO: optimize - save some recent imageData as dataURLs,
// set productImage.src on subsequent calls instead of new
// canvas operation everytime.
function getImageDataURL(imageData) {
  // Draw new image to canvas
  ctx.putImageData(imageData, 0, 0);
  // Convert canvas to data URL (base64 encoded PNG)
  return canvas.toDataURL();
}


function downloadImage() {
  let fileName = `${companyName}_${productName}.png`;
  let link = document.createElement("a");
  link.download = fileName;
  //link.href = productImage.src;
  link.href = currentImgDataURL;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  delete link;
}



/* HELPER FUNCTION */

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



/* TESTING */

function getRedShiftedImageData(image) {
  let pixelData = image.imageData.data;
  let redShiftPixelData = pixelData;
  let redShiftImageData = new ImageData(image.width, image.height);
  // Iterate over individual pixels
  for (let i = 0; i < pixelData.length; i += 4) {
    const red = redShiftPixelData[i];
    const green = redShiftPixelData[i + 1];
    const blue = redShiftPixelData[i + 2];
    const alpha = redShiftPixelData[i + 3];
    // Test: redshift pixels
    redShiftPixelData[i] += 50;
  }
  redShiftImageData.data = redShiftPixelData;
  return redShiftImageData;
}




//
