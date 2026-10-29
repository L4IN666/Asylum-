package com.asylum.music.viewmodel

import android.content.Context
import androidx.lifecycle.ViewModel
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import com.asylum.music.data.MusicItem
import com.asylum.music.data.MusicRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

data class PlayerUiState(
    val tracks: List<MusicItem> = emptyList(),
    val currentTrack: MusicItem? = null,
    val isPlaying: Boolean = false,
    val currentPositionLabel: String = "0:00"
)

class PlayerViewModel : ViewModel() {
    private val repository = MusicRepository()
    private var player: ExoPlayer? = null

    private val _uiState = MutableStateFlow(PlayerUiState(tracks = repository.getDemoTracks()))
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()

    fun initPlayer(context: Context) {
        if (player == null) {
            player = ExoPlayer.Builder(context).build()
        }
    }

    fun playTrack(track: MusicItem) {
        val currentPlayer = player ?: return
        val mediaItem = MediaItem.fromUri(track.streamUrl)
        currentPlayer.setMediaItem(mediaItem)
        currentPlayer.prepare()
        currentPlayer.play()

        _uiState.value = _uiState.value.copy(
            currentTrack = track,
            isPlaying = true,
            currentPositionLabel = "0:00"
        )
    }

    fun toggleFavorite(track: MusicItem) {
        // placeholder favorite logic for MVP
    }

    override fun onCleared() {
        super.onCleared()
        player?.release()
        player = null
    }
}
