package com.asylum.music.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = SpotifyGreen,
    secondary = SpotifyGreen,
    tertiary = SpotifyMuted,
    background = SpotifyBlack,
    surface = SpotifyBlack2,
    onPrimary = SpotifyBlack,
    onSecondary = SpotifyBlack,
    onBackground = SpotifyText,
    onSurface = SpotifyText
)

private val LightColorScheme = lightColorScheme(
    primary = SpotifyGreen,
    secondary = SpotifyGreen,
    tertiary = SpotifyMuted,
    background = SpotifyBlack,
    surface = SpotifyBlack2,
    onPrimary = SpotifyBlack,
    onSecondary = SpotifyBlack,
    onBackground = SpotifyText,
    onSurface = SpotifyText
)

@Composable
fun AsylumMusicTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
