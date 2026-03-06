import streamDeck from "@elgato/streamdeck";
import { api } from "./api.js";
import { CircuitBreaker } from "./circuit-breaker.js";

export interface PlaylistState {
  playing: boolean;
  repeat: "off" | "playlist" | "track";
  shuffle: boolean;
  muted: boolean;
  volume: number;
}

export interface SoundboardState {
  sounds: Array<{ id: string }>;
}

export const playbackState = {
  playlist: undefined as PlaylistState | undefined,
  soundboard: undefined as SoundboardState | undefined,
  controls: {
    playing: false,
    repeat: "off" as "off" | "playlist" | "track",
    shuffle: false,
    muted: false,
    volume: 1,
  },
};

let onUpdateCallback: ((playlist: PlaylistState, soundboard: SoundboardState) => void) | undefined;

export function onPlaybackUpdate(
  callback: (playlist: PlaylistState, soundboard: SoundboardState) => void,
): void {
  onUpdateCallback = callback;
}

export function startPlaybackPolling(): void {
  const request = async () => {
    const playlist = await api<PlaylistState>("playlist/playback");
    const soundboard = await api<SoundboardState>("soundboard/playback");
    return { playlist, soundboard };
  };

  const breaker = new CircuitBreaker(request);

  setInterval(async () => {
    try {
      const result = await breaker.fire();
      if (result?.playlist && result?.soundboard) {
        // Update local controls state
        let dirty = false;
        for (const key of Object.keys(playbackState.controls) as Array<keyof typeof playbackState.controls>) {
          if (result.playlist[key] !== playbackState.controls[key]) {
            dirty = true;
            (playbackState.controls as Record<string, unknown>)[key] = result.playlist[key];
          }
        }

        playbackState.playlist = result.playlist;
        playbackState.soundboard = result.soundboard;

        if (onUpdateCallback) {
          onUpdateCallback(result.playlist, result.soundboard);
        }
      }
    } catch (e) {
      streamDeck.logger.debug("Polling error:", e);
    }
  }, 1000);
}
