const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d')

const pet = new Pet(canvas, ctx);

var fpsInterval = 1000 / 6;
var currentFrame;
var elapsed;
var then;

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
} 

function render(ctx) {
  ctx.save()
  ctx.imageSmoothingEnabled = false;

  clearCanvas()
  pet.render(ctx)

  ctx.restore()
}

function loop(timeStamp) {
  currentFrame = window.performance.now();
  elapsed = currentFrame - then;

  if (elapsed > fpsInterval) {
    then = currentFrame - (elapsed % fpsInterval);
    
    render(ctx)
  }

  requestAnimationFrame(loop);
};

then = window.performance.now();
requestAnimationFrame(loop);

window.electronAPI.onReceiveMessage((message) => {
  if (message.text == "response-open") {
    pet.standby(1)
    pet.setOrientation(message.orientation)
  }
  else if (message.text == "response-close") {
    pet.setFreeze(false)
    pet.resetActions()
  }
  else if (message.text == "processing-message") {
    pet.setFreeze(true)
    pet.process(1)
  }
})
