package com.asylum.music.data

class MusicRepository {
    fun getDemoTracks(): List<MusicItem> = listOf(
        MusicItem(
            id = "1",
            title = "Midnight Echo",
            artist = "Aster Vale",
            imageUrl = "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=400&q=80",
            streamUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            durationLabel = "3:42"
        ),
        MusicItem(
            id = "2",
            title = "Soft Horizon",
            artist = "Nova Bloom",
            imageUrl = "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
            streamUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
            durationLabel = "4:06"
        ),
        MusicItem(
            id = "3",
            title = "City Lights",
            artist = "Kairo Blue",
            imageUrl = "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=400&q=80",
            streamUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
            durationLabel = "3:28"
        ),
        MusicItem(
            id = "4",
            title = "Afterglow",
            artist = "Sora Lane",
            imageUrl = "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80",
            streamUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
            durationLabel = "4:11"
        )
    )
}
