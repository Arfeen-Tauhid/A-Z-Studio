import type { Project } from './api'
import { youtubeVideoId } from './youtube'

export const projectAspectRatios = ['16:9', '9:16', '1:1', '4:5'] as const

export type ProjectAspectRatio = (typeof projectAspectRatios)[number]

export function projectAspectRatio(project: Pick<Project, 'category' | 'videoAspectRatio'>) {
  return (
    project.videoAspectRatio ??
    (project.category.trim().toLowerCase() === 'short-form' ? '9:16' : '16:9')
  )
}

export function isDirectVideoUrl(value: string) {
  try {
    const url = new URL(value)
    return (
      /\.(mp4|m4v|webm|mov)$/i.test(url.pathname) ||
      (url.hostname === 'res.cloudinary.com' && url.pathname.includes('/video/upload/'))
    )
  } catch {
    return false
  }
}

export function isPlayableProjectVideo(value: string) {
  return Boolean(youtubeVideoId(value) || isDirectVideoUrl(value))
}

export function socialPlatformName(value: string) {
  try {
    const hostname = new URL(value).hostname.replace(/^www\./, '').toLowerCase()
    const platforms: Record<string, string> = {
      'instagram.com': 'Instagram',
      'tiktok.com': 'TikTok',
      'youtu.be': 'YouTube',
      'youtube.com': 'YouTube',
      'youtube-nocookie.com': 'YouTube',
      'facebook.com': 'Facebook',
      'fb.watch': 'Facebook',
      'vimeo.com': 'Vimeo',
      'linkedin.com': 'LinkedIn',
      'x.com': 'X',
      'twitter.com': 'X',
      'pinterest.com': 'Pinterest',
      'twitch.tv': 'Twitch',
    }
    return platforms[hostname] ?? 'Social platform'
  } catch {
    return 'Social platform'
  }
}
