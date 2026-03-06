function handleSettings(settings) {
  if (settings.action) {
    document.getElementById("playbackSelect").value = settings.action;
  }
}

function sendSettings() {
  if (websocket && websocket.readyState === 1) {
    websocket.send(
      JSON.stringify({
        event: "setSettings",
        context: uuid,
        payload: {
          action: document.getElementById("playbackSelect").value,
        },
      })
    );
  }
}
