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

type SoundboardPlaySettings = {
  id?: string;
};

type SoundState = {
  id: string;
  playing: boolean;
};

const soundboardActions = new Map<string, SoundState>();

@action({ UUID: "fm.kenku.remote.soundboard-play" })
export class SoundboardPlay extends SingletonAction<SoundboardPlaySettings> {
  override async onKeyDown(ev: KeyDownEvent<SoundboardPlaySettings>): Promise<void> {
    const contextId = ev.action.id;
    const state = soundboardActions.get(contextId);

    try {
      if (!state) {
        throw new Error("Unable to find playback state for sound");
      }

      if (state.playing) {
        await api("soundboard/stop", "PUT", { id: ev.payload.settings.id });
        state.playing = false;
      } else {
        await api("soundboard/play", "PUT", { id: ev.payload.settings.id });
        state.playing = true;
      }
      await this.updateImage(ev, state.playing);
    } catch (e) {
      streamDeck.logger.error("Soundboard play error:", e);
      await ev.action.showAlert();
    }
  }

  override async onWillAppear(ev: WillAppearEvent<SoundboardPlaySettings>): Promise<void> {
    const playing = this.isPlaying(ev.payload.settings.id);
    soundboardActions.set(ev.action.id, { id: ev.payload.settings.id ?? "", playing });
    await this.updateImage(ev, playing);
  }

  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<SoundboardPlaySettings>): Promise<void> {
    const playing = this.isPlaying(ev.payload.settings.id);
    soundboardActions.set(ev.action.id, { id: ev.payload.settings.id ?? "", playing });
    await this.updateImage(ev, playing);
  }

  override onWillDisappear(ev: WillDisappearEvent<SoundboardPlaySettings>): void {
    soundboardActions.delete(ev.action.id);
  }

  private isPlaying(id?: string): boolean {
    if (!id) return false;
    return Boolean(playbackState.soundboard?.sounds.find((s) => s.id === id));
  }

  private async updateImage(ev: { action: { setImage(image: string): Promise<void> } }, showStop: boolean): Promise<void> {
    const image = showStop
      ? "imgs/actionSoundboardStopImage"
      : "imgs/actionSoundboardPlayImage";
    await ev.action.setImage(image);
  }
}

export function updateSoundboardImages(instance: SoundboardPlay): void {
  for (const [contextId, state] of soundboardActions) {
    const sounds = playbackState.soundboard?.sounds ?? [];
    const playing = sounds.some((s) => s.id === state.id);
    if (playing !== state.playing) {
      state.playing = playing;
      // Use streamDeck.actions to find the action and update its image
      const action = [...streamDeck.actions].find((a) => a.id === contextId);
      if (action?.isKey()) {
        const image = playing
          ? "imgs/actionSoundboardStopImage"
          : "imgs/actionSoundboardPlayImage";
        action.setImage(image);
      }
    }
  }
}
