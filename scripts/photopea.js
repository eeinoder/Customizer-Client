/* Photopea scripts */

// Set color layer to the active layer (selection)
colorLayer = app.activeDocument.layers.getByName("ColorLayer");
app.activeDocument.activeLayer = colorLayer;

// Calculate color correction for color burn filter (M - mask) from desired color
// output (E - result) and initial input layer (I - image).
// M = -1 + 256(255-I)/(255-E)

// Set new fill color to hex value
var fillColor = new SolidColor();
fillColor.rgb.hexValue = "228B2B";
var blendMode = ColorBlendMode.COLORBURN;

// Fill color, blend mode, opacity, preserve transparency
// NOTE: transparency setting not recognized in fill method below.
// Using raster mask to color nontransparent pixels only
//app.activeDocument.selection.fill(fillColor, blendMode, 100, true); // NO DICE!!
app.activeDocument.selection.fill(fillColor, ColorBlendMode.COLORBURN)
