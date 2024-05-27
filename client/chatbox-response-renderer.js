const body = document.querySelector('body') || document.documentElement;
body.style.overflow = 'hidden';

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
ctx.imageSmoothingEnabled = false;

const image = document.getElementById("dialog-mini");

const cornerWidth = Math.ceil(60 * 0.5)
const cornerHeight = Math.ceil(30 * 0.5)

function getWrappedLines(ctx, text, maxWidth) {
  var words = text.split(" ");
  var lines = [];
  var currentLine = words[0];

  for (var i = 1; i < words.length; i++) {
      var word = words[i];
      var width = ctx.measureText(currentLine + " " + word).width;
      if (width < maxWidth) {
          currentLine += " " + word;
      } else {
          lines.push(currentLine);
          currentLine = word;
      }
  }
  lines.push(currentLine);
  return lines;
}

ctx.textAlign = "left";
ctx.textBaseline = "top";
ctx.font = '14px Monospace';
var lineheight = 24;

function drawResponseBubble(borderWidth, borderHeight, orientation) {  
  // top left corner
  ctx.drawImage(image, 0, 0, 6, 3, 0, 0, cornerWidth, cornerHeight);

  // left border
  ctx.drawImage(image, 0, 3, 6, 3, 0, cornerHeight, cornerWidth, borderHeight);

  // bottom border
  ctx.drawImage(image, 6, 6, 6, 6, cornerWidth, borderHeight + cornerHeight, borderWidth , cornerHeight * 2);

  // bottom left corner
  if (orientation == -1) {
    ctx.drawImage(image, 0, 6, 6, 6, 0, borderHeight + cornerHeight, cornerWidth, cornerHeight * 2);
  }
  else {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(image, 12, 6, 6, 6, 0, borderHeight + cornerHeight, -cornerWidth, cornerHeight * 2);
    ctx.restore();
  }

  // top border
  ctx.drawImage(image, 6, 0, 6, 3, cornerWidth, 0, borderWidth , cornerHeight);

  // top right corner
  ctx.drawImage(image, 12, 0, 6, 3, cornerWidth + borderWidth , 0, cornerWidth, cornerHeight);

  // right border
  ctx.drawImage(image, 12, 3, 6, 3, cornerWidth + borderWidth , cornerHeight, cornerWidth, borderHeight);

  // right bottom corner
  if (orientation == -1) {
    ctx.drawImage(image, 12, 6, 6, 6, cornerWidth + borderWidth , cornerHeight + borderHeight, cornerWidth, cornerHeight * 2);
  }
  else {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(image, 0, 6, 6, 6, (cornerWidth + borderWidth ) * -1, cornerHeight + borderHeight, -cornerWidth, cornerHeight * 2);
    ctx.restore();
  }

  ctx.fillStyle = "white";
  ctx.fillRect(cornerWidth, cornerHeight, borderWidth , borderHeight);
}

var id = null

function drawResponse(text, orientation) {
  var borderHeight = 0
  var borderWidth = 0 

  text = text.replace("\t", "").replace("\n", "").trim()

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  var lines = text.split("\n")
  var maxWordWidth = 0;

  lines.forEach(line => {
    line.split(" ").forEach(word => {
      const wordWidth = ctx.measureText(word).width;
    
      if (wordWidth > maxWordWidth) {
        maxWordWidth = wordWidth;
      }
    })
  })

  borderWidth = maxWordWidth < 300 ? 300 : maxWordWidth

  const wrappedLines = lines.flatMap(line => getWrappedLines(ctx, line, borderWidth))

  borderHeight = lineheight * (wrappedLines.length + 1) - 10

  var maxLineWidth = 0

  wrappedLines.forEach(line => {
    const lineWidth = ctx.measureText(line).width;
    
      if (lineWidth > maxLineWidth) {
        maxLineWidth = lineWidth;
      }
  })

  borderWidth = parseInt(maxLineWidth)

  drawResponseBubble(borderWidth, borderHeight, orientation)

  ctx.fillStyle = "black";
  for (var i = 0; i < wrappedLines.length; i++) {
    ctx.fillText(wrappedLines[i], cornerWidth, cornerHeight + ((i + 0.5) * lineheight));
  }

  const bubbleWidth = 2 * cornerWidth + borderWidth
  const bubbleHeight = 6 * cornerHeight + borderHeight

  window.electronAPI.submitMessage("response-size", {
    width: bubbleWidth,
    height: bubbleHeight 
  })

  if (id) { window.clearTimeout(id) }
  id = window.setTimeout(() => {
    window.electronAPI.submitMessage("response-close", null)
  }, 30000)
}


canvas.addEventListener("click", () => { window.electronAPI.submitMessage("response-close", null) })

window.electronAPI.onReceiveMessage((message) => {
  drawResponse(message.text, message.orientation);
})