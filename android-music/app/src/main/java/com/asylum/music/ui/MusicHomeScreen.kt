package com.asylum.music.ui

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.rememberAsyncImagePainter
import com.asylum.music.data.MusicItem
import com.asylum.music.ui.theme.SpotifyGreen
import com.asylum.music.ui.theme.SpotifyMuted
import com.asylum.music.ui.theme.SpotifyPanel
import com.asylum.music.ui.theme.SpotifyText
import com.asylum.music.viewmodel.PlayerViewModel
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun MusicHomeScreen(
    viewModel: PlayerViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val context = LocalContext.current

    viewModel.initPlayer(context)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF121212))
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Asylum",
                    style = MaterialTheme.typography.headlineMedium,
                    color = SpotifyText,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.weight(1f))

                Surface(
                    tonalElevation = 2.dp,
                    color = SpotifyPanel,
                    shape = CircleShape
                ) {
                    Text(
                        text = "S",
                        modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                        color = SpotifyText,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text("Home", color = SpotifyText, fontWeight = FontWeight.SemiBold)
                Text("Search", color = SpotifyMuted)
                Text("Library", color = SpotifyMuted)
            }

            Surface(
                color = SpotifyPanel,
                shape = RoundedCornerShape(18.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            ) {
                Column(modifier = Modifier.padding(20.dp)) {
                    Text(
                        text = "Featured",
                        color = SpotifyGreen,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Good evening",
                        color = SpotifyText,
                        style = MaterialTheme.typography.headlineLarge,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                    Text(
                        text = "Fresh tracks and calm sounds for your day.",
                        color = SpotifyMuted,
                        modifier = Modifier.padding(top = 10.dp)
                    )
                }
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                items(uiState.tracks) { song ->
                    TrackRow(
                        track = song,
                        isPlaying = uiState.currentTrack?.id == song.id,
                        onSelect = { viewModel.playTrack(song) },
                        onFavorite = { viewModel.toggleFavorite(song) }
                    )
                }
            }
        }

        Surface(
            color = Color(0xFF181818),
            shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp),
            tonalElevation = 8.dp,
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.BottomCenter)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Image(
                        painter = rememberAsyncImagePainter(uiState.currentTrack?.imageUrl),
                        contentDescription = null,
                        modifier = Modifier
                            .size(56.dp)
                            .clip(RoundedCornerShape(12.dp)),
                        contentScale = ContentScale.Crop
                    )

                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = 12.dp)
                    ) {
                        Text(
                            text = uiState.currentTrack?.title ?: "No song selected",
                            color = SpotifyText,
                            fontWeight = FontWeight.SemiBold
                        )
                        Text(
                            text = uiState.currentTrack?.artist ?: "Choose a track",
                            color = SpotifyMuted,
                            fontSize = 12.sp
                        )
                    }

                    Text(
                        text = uiState.currentPositionLabel,
                        color = SpotifyMuted,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(end = 12.dp)
                    )
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("⏮", color = SpotifyText, modifier = Modifier.weight(1f))
                    Text("▶", color = SpotifyText, modifier = Modifier.weight(1f))
                    Text("⏭", color = SpotifyText, modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun TrackRow(
    track: MusicItem,
    isPlaying: Boolean,
    onSelect: () -> Unit,
    onFavorite: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(
                if (isPlaying) Color(0xFF1A2E1E) else Color.Transparent,
                shape = RoundedCornerShape(14.dp)
            )
            .clickable { onSelect() }
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Image(
            painter = rememberAsyncImagePainter(track.imageUrl),
            contentDescription = null,
            modifier = Modifier
                .size(52.dp)
                .clip(RoundedCornerShape(10.dp)),
            contentScale = ContentScale.Crop
        )

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(start = 12.dp)
        ) {
            Text(track.title, color = SpotifyText, fontWeight = FontWeight.SemiBold)
            Text(track.artist, color = SpotifyMuted, fontSize = 12.sp)
        }

        Text(track.durationLabel, color = SpotifyMuted, fontSize = 12.sp)

        Box(
            modifier = Modifier
                .padding(start = 12.dp)
                .size(28.dp)
                .clip(CircleShape)
                .background(Color(0xFF262626))
                .clickable { onFavorite() },
            contentAlignment = Alignment.Center
        ) {
            Text("♡", color = SpotifyText, fontSize = 14.sp)
        }
    }
}
