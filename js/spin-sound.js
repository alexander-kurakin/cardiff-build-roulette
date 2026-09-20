const SPIN_SOUND_VIDEO_ID = "Y1zPhZkzyRM";
// Source clip is 9s long, but the reel-spin animation (REEL_SPIN_DURATION_MS
// in roulette.js) only runs ~2.6s — trimmed via the IFrame API's own "end"
// playerVar instead of downloading/re-encoding the clip.
const SPIN_SOUND_END_SECONDS = 3;

let spinSoundPlayer = null;
let spinSoundReady = null;

function loadSpinSoundPlayer() {
    if (spinSoundReady) return spinSoundReady;

    spinSoundReady = loadYoutubeIframeApi().then(() => new Promise(resolve => {
        spinSoundPlayer = new YT.Player("youtube-sfx-player", {
            videoId: SPIN_SOUND_VIDEO_ID,
            playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                start: 0,
                end: SPIN_SOUND_END_SECONDS,
            },
            events: {
                onReady: () => resolve(),
            },
        });
    }));

    return spinSoundReady;
}

async function playSpinSound() {
    await loadSpinSoundPlayer();
    spinSoundPlayer.seekTo(0, true);
    spinSoundPlayer.playVideo();
}
