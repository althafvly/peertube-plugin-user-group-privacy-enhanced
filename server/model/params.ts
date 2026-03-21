import { MVideoFullLight } from '@peertube/peertube-types'
import * as express from 'express'

export interface VideoUpdateParams {
  video: MVideoFullLight
  body: {
    pluginData?: {
      [key: string]: any
    }
  }
  req: express.Request
  res: express.Response
}

export interface GetVideoParams {
  id: number
  userId: number
  req: express.Request
}

export interface VideoListResultParams {
  start: any
  count: any
  sort: any
  nsfw: any
  isLive: any
  skipCount: any
  displayOnlyForFollower: any
  user: any
  countVideos: any
}

export interface VideoSearchParams {
  start: any
  count: any
  sort: any
  search: any
  searchTarget: any
  displayOnlyForFollower: any
  countVideos: any
  nsfw: any
  user: any
}

export interface NotificationCreatedParams {
  webNotificationEnabled: boolean
  emailNotificationEnabled: boolean
  user: {
    id: number
  }
  notification: {
    id: number
    read: boolean
    type: number
    userId: number
    videoId: number | null
    destroy: () => Promise<void>
  }
}
