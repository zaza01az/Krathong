// Lightweight YouTube Audio Player for Loy Krathong
// Plays: https://youtu.be/yu4eRjbx26k

const VIDEO_ID = 'yu4eRjbx26k';

export class PiphatAudio {
  constructor() {
    this.player = null;
    this.isReady = false;
    this.isPlaying = false;
    this.isMuted = false;
    this.pendingPlay = false;
    this.volume = 60; // 0 - 100
  }

  init() {
    if (this.player || document.getElementById('yt-krathong-audio')) return;

    // Hidden container for the YouTube audio iframe
    const container = document.createElement('div');
    container.id = 'yt-krathong-audio';
    container.style.cssText =
      'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;left:-9999px;top:-9999px;';
    document.body.appendChild(container);

    const createPlayer = () => {
      this.player = new window.YT.Player('yt-krathong-audio', {
        height: '1',
        width: '1',
        videoId: VIDEO_ID,
        playerVars: {
          autoplay: 0,
          controls: 0,
          loop: 1,
          playlist: VIDEO_ID, // Required for single-video looping
          playsinline: 1,
          rel: 0,
        },
        events: {
          onReady: (e) => {
            this.isReady = true;
            e.target.setVolume(this.volume);
            if (this.isMuted) e.target.mute();
            if (this.pendingPlay) {
              e.target.playVideo();
              this.pendingPlay = false;
            }
          },
          onStateChange: (e) => {
            this.isPlaying = e.data === window.YT.PlayerState.PLAYING;
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        createPlayer();
      };

      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }
  }

  play() {
    this.init();
    if (this.isReady && this.player) {
      this.player.playVideo();
      this.isPlaying = true;
    } else {
      this.pendingPlay = true;
    }
  }

  stop() {
    this.pendingPlay = false;
    this.isPlaying = false;
    if (this.isReady && this.player) {
      this.player.pauseVideo();
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.play();
    }
    return this.isPlaying;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isReady && this.player) {
      if (this.isMuted) {
        this.player.mute();
      } else {
        this.player.unMute();
        this.player.setVolume(this.volume);
      }
    }
    return this.isMuted;
  }

  setVolume(vol) {
    // Accepts 0.0 - 1.0 (maps to YouTube's 0 - 100 scale)
    this.volume = Math.round(Math.max(0, Math.min(1, vol)) * 100);
    if (this.isReady && this.player && !this.isMuted) {
      this.player.setVolume(this.volume);
    }
  }

  // No-op stubs kept for backward compatibility with existing UI controls
  setMusicVolume(vol) {
    this.setVolume(vol);
  }
  setAmbienceVolume() { }
  setTempo() { }
  playKhimNote() { }

  getStatus() {
    return {
      isPlaying: this.isPlaying,
      isMuted: this.isMuted,
    };
  }
}

export const LoyKrathongAudio = PiphatAudio;
export default PiphatAudio;