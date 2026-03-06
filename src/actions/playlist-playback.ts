import streamDeck, {
  action,
  type DidReceiveSettingsEvent,
  type KeyDownEvent,
  SingletonAction,
  type WillAppearEvent,
  type WillDisappearEvent,
} from "@elgato/streamdeck";
import { api } from "../api.js";
import { playbackState } from "../polling.js";

type PlaybackSettings = {
  action?: string;
};

const playbackActions = new Map<string, string>();

const imageMap: Record<string, string | ((controls: typeof playbackState.controls) => string)> = {
  "play-pause": (c) => c.playing ? "imgs/actionPauseImage" : "imgs/actionPlayImage",
  "mute": (c) => c.muted ? "imgs/actionMuteOnImage" : "imgs/actionMuteOffImage",
  "decrease-volume": "imgs/actionDecreaseVolumeImage",
  "increase-volume": "imgs/actionIncreaseVolumeImage",
  "next": "imgs/actionNextImage",
  "previous": "imgs/actionPreviousImage",
  "repeat": (c) => {
    switch (c.repeat) {
      case "playlist": return "imgs/actionRepeatPlaylistImage";
      case "track": return "imgs/actionRepeatTrackImage";
      default: return "imgs/actionRepeatOffImage";
    }
  },
  "shuffle": (c) => c.shuffle ? "imgs/actionShuffleOnImage" : "imgs/actionShuffleOffImage",
};

function getImage(actionType: string): string {
  const entry = imageMap[actionType];
  if (!entry) return "imgs/blankImage";
  return typeof entry === "function" ? entry(playbackState.controls) : entry;
}

@action({ UUID: "fm.kenku.remote.playlist-playback" })
export class PlaylistPlayback extends SingletonAction<PlaybackSettings> {
  override async onKeyDown(ev: KeyDownEvent<PlaybackSettings>): Promise<void> {
    const actionType = ev.payload.settings.action;
    try {
      switch (actionType) {
        case "play-pause":
          playbackState.controls.playing = !playbackState.controls.playing;
          await api(
            playbackState.controls.playing ? "playlist/playback/play" : "playlist/playback/pause",
            "PUT",
          );
          break;
        case "increase-volume":
          playbackState.controls.volume = Math.min(1, playbackState.controls.volume + 0.05);
          await api("playlist/playback/volume", "PUT", { volume: playbackState.controls.volume });
          break;
        case "decrease-volume":
          playbackState.controls.volume = Math.max(0, playbackState.controls.volume - 0.05);
          await api("playlist/playback/volume", "PUT", { volume: playbackState.controls.volume });
          break;
        case "mute":
          playbackState.controls.muted = !playbackState.controls.muted;
          await api("playlist/playback/mute", "PUT", { mute: playbackState.controls.muted });
          break;
        case "next":
          await api("playlist/playback/next", "POST");
          break;
        case "previous":
          await api("playlist/playback/previous", "POST");
          break;
        case "shuffle":
          playbackState.controls.shuffle = !playbackState.controls.shuffle;
          await api("playlist/playback/shuffle", "PUT", { shuffle: playbackState.controls.shuffle });
          break;
        case "repeat": {
          const repeatMap = { off: "playlist", playlist: "track", track: "off" } as const;
          playbackState.controls.repeat = repeatMap[playbackState.controls.repeat];
          await api("playlist/playback/repeat", "PUT", { repeat: playbackState.controls.repeat });
          break;
        }
        default:
          throw new Error("Action not implemented");
      }
      if (actionType) {
        await ev.action.setImage(getImage(actionType));
      }
    } catch (e) {
      streamDeck.logger.error("Playback error:", e);
      await ev.action.showAlert();
    }
  }

  override async onWillAppear(ev: WillAppearEvent<PlaybackSettings>): Promise<void> {
    const actionType = ev.payload.settings.action ?? "play-pause";
    playbackActions.set(ev.action.id, actionType);
    await ev.action.setImage(getImage(actionType));
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PlaybackSettings>): Promise<void> {
    const actionType = ev.payload.settings.action ?? "play-pause";
    playbackActions.set(ev.action.id, actionType);
    await ev.action.setImage(getImage(actionType));
  }

  override onWillDisappear(ev: WillDisappearEvent<PlaybackSettings>): void {
    playbackActions.delete(ev.action.id);
  }
}

export function updatePlaybackImages(): void {
  for (const [contextId, actionType] of playbackActions) {
    const sdAction = [...streamDeck.actions].find((a) => a.id === contextId);
    if (sdAction?.isKey()) {
      sdAction.setImage(getImage(actionType));
    }
  }
}
