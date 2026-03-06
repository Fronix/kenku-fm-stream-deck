let websocket = null;
let uuid = null;

/**
 * @param {function} handleSettings - Callback to populate action-specific form fields from settings
 */
function connectElgatoStreamDeckSocket(
  inPort,
  inPropertyInspectorUUID,
  inRegisterEvent
) {
  uuid = inPropertyInspectorUUID;
  websocket = new WebSocket("ws://127.0.0.1:" + inPort);

  websocket.onopen = function () {
    // Register
    websocket.send(
      JSON.stringify({
        event: inRegisterEvent,
        uuid: inPropertyInspectorUUID,
      })
    );

    // Request settings
    websocket.send(
      JSON.stringify({
        event: "getSettings",
        context: uuid,
      })
    );
    websocket.send(
      JSON.stringify({
        event: "getGlobalSettings",
        context: uuid,
      })
    );
  };

  websocket.onmessage = function (evt) {
    const jsonObj = JSON.parse(evt.data);
    const { event, payload } = jsonObj;
    if (event === "didReceiveSettings") {
      const settings = payload.settings;

      // If settings is empty then populate it from the initial values
      if (Object.keys(settings).length === 0) {
        sendSettings();
      }

      handleSettings(settings);
    } else if (event === "didReceiveGlobalSettings") {
      const settings = payload.settings;

      if (settings.address) {
        document.getElementById("address").value = settings.address;
      }
      if (settings.port) {
        document.getElementById("port").value = settings.port;
      }
    }
  };
}

function sendGlobalSettings() {
  if (websocket && websocket.readyState === 1) {
    const address = document.getElementById("address").value;
    const port = document.getElementById("port").value;
    if (
      !address.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/) ||
      !port.match(/^\d+$/)
    ) {
      return;
    }
    websocket.send(
      JSON.stringify({
        event: "setGlobalSettings",
        context: uuid,
        payload: {
          address: address,
          port: port,
        },
      })
    );
  }
}
