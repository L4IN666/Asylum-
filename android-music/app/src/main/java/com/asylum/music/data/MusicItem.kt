package com.asylum.music.data

data class MusicItem(
    val id: String,
    val title: String,
    val artist: String,
    val imageUrl: String,
    val streamUrl: String,
    val durationLabel: String = "3:32"
)
