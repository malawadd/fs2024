let chatbox = document.getElementById("chatbox");

function submitMessage() {
  const message = chatbox.value;
  chatbox.value = "";

  window.electronAPI.submitMessage("input", message);
}

function submitOnEnter(event) {
  if (event.which === 13) {
    submitMessage();
  }
}

document.getElementById("chatbox").addEventListener("keydown", submitOnEnter);

window.electronAPI.onShow(() => {
  chatbox.focus();
})
