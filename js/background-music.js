const BACKGROUND_MUSIC_VIDEO_ID = "c2qofuQNV5w";

let youtubePlayer = null;
let musicPlaying = false;

function loadYoutubeIframeApi() {
    return new Promise(resolve => {
        if (window.YT && window.YT.Player) {
            resolve();
            return;
        }

        window.onYouTubeIframeAPIReady = resolve;

        const script = document.createElement("script");
        script.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(script);
    });
}

function createYoutubePlayer() {
    return new Promise(resolve => {
        youtubePlayer = new YT.Player("youtube-player", {
            videoId: BACKGROUND_MUSIC_VIDEO_ID,
            playerVars: {
                autoplay: 0,
                controls: 0,
                disablekb: 1,
                loop: 1,
                playlist: BACKGROUND_MUSIC_VIDEO_ID,
            },
            events: {
                onReady: () => resolve(),
            },
        });
    });
}

function updateMusicButton() {
    const button = document.getElementById("music-toggle-button");
    button.innerHTML = musicPlaying ? "Музыка<br>ВКЛ" : "Музыка<br>ВЫКЛ";
}

async function toggleMusic() {
    if (!youtubePlayer) {
        await loadYoutubeIframeApi();
        await createYoutubePlayer();
    }

    if (musicPlaying) {
        youtubePlayer.pauseVideo();
    } else {
        youtubePlayer.playVideo();
    }

    musicPlaying = !musicPlaying;
    updateMusicButton();
}

function bindMusicButton() {
    document.getElementById("music-toggle-button").addEventListener("click", toggleMusic);
}
