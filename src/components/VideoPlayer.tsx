"use client";

interface VideoPlayerProps {
  url: string | null;
  title: string;
}

function getEmbedUrl(url: string): string | null {
  // YouTube
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return `https://www.youtube.com/embed/${ytMatch[1]}`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  }

  return null;
}

export default function VideoPlayer({ url, title }: VideoPlayerProps) {
  if (!url) {
    return (
      <div className="aspect-video bg-gray-900 flex items-center justify-center text-gray-400">
        No video available for this lesson
      </div>
    );
  }

  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    return (
      <div className="aspect-video bg-gray-900 flex items-center justify-center text-gray-400">
        Unsupported video URL
      </div>
    );
  }

  return (
    <div className="aspect-video bg-black">
      <iframe
        src={embedUrl}
        title={title}
        className="w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
