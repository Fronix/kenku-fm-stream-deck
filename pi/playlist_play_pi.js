function handleSettings(settings) {
  if (settings.id) {
    document.getElementById("id").value = settings.id;
  }
}

function sendSettings() {
  if (websocket && websocket.readyState === 1) {
    websocket.send(
      JSON.stringify({
        event: "setSettings",
        context: uuid,
        payload: {
          id: document.getElementById("id").value,
        },
      })
    );
  }
}
