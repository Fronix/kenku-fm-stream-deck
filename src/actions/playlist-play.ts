import streamDeck, {
  action,
  type KeyDownEvent,
  SingletonAction,
} from "@elgato/streamdeck";
import { api } from "../api.js";

type PlaylistPlaySettings = {
  id?: string;
};

@action({ UUID: "fm.kenku.remote.playlist-play" })
export class PlaylistPlay extends SingletonAction<PlaylistPlaySettings> {
  override async onKeyDown(ev: KeyDownEvent<PlaylistPlaySettings>): Promise<void> {
    try {
      await api("playlist/play", "PUT", { id: ev.payload.settings.id });
    } catch (e) {
      streamDeck.logger.error("Playlist play error:", e);
      await ev.action.showAlert();
    }
  }
}
