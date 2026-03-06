import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { PlaylistPlay } from "./actions/playlist-play.js";
import { PlaylistPlayback, updatePlaybackImages } from "./actions/playlist-playback.js";
import { SoundboardPlay, updateSoundboardImages } from "./actions/soundboard-play.js";
import { setRemoteAddress, setRemotePort } from "./api.js";
import { onPlaybackUpdate, startPlaybackPolling } from "./polling.js";

streamDeck.logger.setLevel(LogLevel.DEBUG);

// Register actions
const soundboardPlay = new SoundboardPlay();
streamDeck.actions.registerAction(new PlaylistPlay());
streamDeck.actions.registerAction(new PlaylistPlayback());
streamDeck.actions.registerAction(soundboardPlay);

// Handle global settings (address/port)
streamDeck.settings.onDidReceiveGlobalSettings<{ address?: string; port?: string }>((ev) => {
  if (ev.settings.address) setRemoteAddress(ev.settings.address);
  if (ev.settings.port) setRemotePort(ev.settings.port);
});

// Update images when playback state changes
onPlaybackUpdate(() => {
  updatePlaybackImages();
  updateSoundboardImages(soundboardPlay);
});

// Connect and start polling
streamDeck.connect().then(() => {
  startPlaybackPolling();
});
