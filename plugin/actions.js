const playlistPlayAction = {
  onKeyDown: async function (context, settings) {
    try {
      await api("playlist/play", "PUT", {
        id: settings.id,
      });
    } catch (e) {
      console.error(e);
      websocket.send(
        JSON.stringify({
          event: "showAlert",
          context: context,
        })
      );
    }
  },
};

/**
 * A mapping of streamdeck contexts to the sound id and the playing state
 * @type Record<string, {id: string, playing: boolean}>
 */
const soundboardActions = {};

const soundboardPlayAction = {
  onKeyDown: async function (context, settings) {
    try {
      if (context in soundboardActions) {
        if (soundboardActions[context].playing) {
          await api("soundboard/stop", "PUT", {
            id: settings.id,
          });
          soundboardActions[context].playing = false;
          this.updateImage(context, false);
        } else {
          await api("soundboard/play", "PUT", {
            id: settings.id,
          });
          soundboardActions[context].playing = true;
          this.updateImage(context, true);
        }
      } else {
        throw new Error("Unable to find playback state for sound");
      }
    } catch (e) {
      console.error(e);
      websocket.send(
        JSON.stringify({
          event: "showAlert",
          context: context,
        })
      );
    }
  },
  onDidReceiveSettings: function (context, settings) {
    const sound = playbackState.soundboard?.sounds.find(
      (sound) => sound.id === settings.id
    );
    const playing = Boolean(sound);
    soundboardActions[context] = { id: settings.id, playing };
    this.updateImage(context, playing);
  },
  onWillAppear: function (context, settings) {
    const sound = playbackState.soundboard?.sounds.find(
      (sound) => sound.id === settings.id
    );
    const playing = Boolean(sound);
    soundboardActions[context] = { id: settings.id, playing };
    this.updateImage(context, playing);
  },
  onWillDisappear: function (context) {
    delete soundboardActions[context];
  },
  updateImage: function (context, showStopImage) {
    if (showStopImage) {
      setImageFromURL(context, "../assets/actionSoundboardStopImage@2x.jpg");
    } else {
      setImageFromURL(context, "../assets/actionSoundboardPlayImage@2x.png");
    }
  },
};

/**
 * A mapping of playback contexts to their current playback actions
 * @type Record<string, string>
 */
const playbackActions = {};

const playlistPlaybackAction = {
  onKeyDown: async function (context, settings) {
    try {
      switch (settings.action) {
        case "play-pause":
          playbackState.controls.playing = !playbackState.controls.playing;
          await api(
            playbackState.controls.playing
              ? "playlist/playback/play"
              : "playlist/playback/pause",
            "PUT"
          );
          break;
        case "increase-volume":
          playbackState.controls.volume = Math.min(1, playbackState.controls.volume + 0.05);
          await api("playlist/playback/volume", "PUT", {
            volume: playbackState.controls.volume,
          });
          break;
        case "decrease-volume":
          playbackState.controls.volume = Math.max(0, playbackState.controls.volume - 0.05);
          await api("playlist/playback/volume", "PUT", {
            volume: playbackState.controls.volume,
          });
          break;
        case "mute":
          playbackState.controls.muted = !playbackState.controls.muted;
          await api("playlist/playback/mute", "PUT", {
            mute: playbackState.controls.muted,
          });
          break;
        case "next":
          await api("playlist/playback/next", "POST");
          break;
        case "previous":
          await api("playlist/playback/previous", "POST");
          break;
        case "shuffle":
          playbackState.controls.shuffle = !playbackState.controls.shuffle;
          await api("playlist/playback/shuffle", "PUT", {
            shuffle: playbackState.controls.shuffle,
          });
          break;
        case "repeat":
          switch (playbackState.controls.repeat) {
            case "off":
              playbackState.controls.repeat = "playlist";
              break;
            case "playlist":
              playbackState.controls.repeat = "track";
              break;
            case "track":
              playbackState.controls.repeat = "off";
              break;
          }
          await api("playlist/playback/repeat", "PUT", {
            repeat: playbackState.controls.repeat,
          });
          break;
        default:
          throw Error("Action not implemented");
      }
      this.updateImage(context, settings.action);
    } catch (e) {
      console.error(e);
      websocket.send(
        JSON.stringify({
          event: "showAlert",
          context: context,
        })
      );
    }
  },
  onDidReceiveSettings: function (context, settings) {
    playbackActions[context] = settings.action;
    this.updateImage(context, settings.action);
  },
  onWillAppear: function (context, settings) {
    playbackActions[context] = settings.action;
    this.updateImage(context, settings.action);
  },
  onWillDisappear: function (context) {
    delete playbackActions[context];
    // Hide old action when tile is disappearing to prevent
    // old data being shown when this coordinate is being used again
    this.setImageFromURL(context, "../assets/blankImage.png");
  },
  updateImage: function (context, action) {
    switch (action) {
      case "play-pause":
        if (playbackState.controls.playing) {
          setImageFromURL(context, "../assets/actionPauseImage@2x.jpg");
        } else {
          setImageFromURL(context, "../assets/actionPlayImage@2x.jpg");
        }
        break;
      case "mute":
        if (playbackState.controls.muted) {
          setImageFromURL(context, "../assets/actionMuteOnImage@2x.jpg");
        } else {
          setImageFromURL(context, "../assets/actionMuteOffImage@2x.jpg");
        }
        break;
      case "decrease-volume":
        setImageFromURL(context, "../assets/actionDecreaseVolumeImage@2x.jpg");
        break;
      case "increase-volume":
        setImageFromURL(context, "../assets/actionIncreaseVolumeImage@2x.jpg");
        break;
      case "next":
        setImageFromURL(context, "../assets/actionNextImage@2x.jpg");
        break;
      case "previous":
        setImageFromURL(context, "../assets/actionPreviousImage@2x.jpg");
        break;
      case "repeat":
        switch (playbackState.controls.repeat) {
          case "off":
            setImageFromURL(context, "../assets/actionRepeatOffImage@2x.jpg");
            break;
          case "playlist":
            setImageFromURL(
              context,
              "../assets/actionRepeatPlaylistImage@2x.jpg"
            );
            break;
          case "track":
            setImageFromURL(context, "../assets/actionRepeatTrackImage@2x.jpg");
            break;
        }
        break;
      case "shuffle":
        if (playbackState.controls.shuffle) {
          setImageFromURL(context, "../assets/actionShuffleOnImage@2x.jpg");
        } else {
          setImageFromURL(context, "../assets/actionShuffleOffImage@2x.jpg");
        }
        break;
    }
  },
};

const actions = {
  "fm.kenku.remote.playlist-play": playlistPlayAction,
  "fm.kenku.remote.soundboard-play": soundboardPlayAction,
  "fm.kenku.remote.playlist-playback": playlistPlaybackAction,
};
