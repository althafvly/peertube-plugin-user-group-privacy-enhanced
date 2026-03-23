import { DbService } from './db-service'
import { PeerTubeHelpers, RegisterServerOptions } from '@peertube/peertube-types'
import { RequestHandler, Response } from 'express'
import shortUuid from 'short-uuid'

import { GroupPermissionService } from './group-permission-service'

export class RouteHandlerFactory {
  private readonly peertubeHelpers: PeerTubeHelpers
  private readonly dbService: DbService
  private readonly groupPermissionServices: GroupPermissionService

  constructor (
    registerServerOptions: RegisterServerOptions,
    dbService: DbService,
    groupPermissionServices: GroupPermissionService
  ) {
    this.peertubeHelpers = registerServerOptions.peertubeHelpers
    this.dbService = dbService
    this.groupPermissionServices = groupPermissionServices
  }

  /**
   *
   * @returns List of all available user group names
   */
  createUserGroupsRouteHandler (): RequestHandler {
    return async (req, res, _next) => {
      try {
        await this.getAuthUser(res)
        const userGroups = await this.dbService.getAllUserGroupsWithIds()
        res.json(userGroups)
      } catch (error: unknown) {
        this.handleError(error, res)
      }
    }
  }

  /**
   *
   * @returns List of groups the current user is in
   */
  createUserGroupsForCurrentUserRouteHandler (): RequestHandler {
    return async (req, res, _next) => {
      try {
        const authUser = await this.getAuthUser(res)
        const userGroups = await this.dbService.getUserGroupsForUser(authUser.id)
        res.json(userGroups)
      } catch (error: unknown) {
        this.handleError(error, res)
      }
    }
  }

  createVideoGroupsRouteHandler (): RequestHandler {
    return async (req, res, _next) => {
      try {
        await this.getAuthUser(res)
        const videoShortUUID = req.params.videoShortUUID

        // Convert short UUID to full UUID
        const translator = shortUuid()
        const videoUUID = translator.toUUID(videoShortUUID)

        const groupIds = await this.dbService.getVideoGroupsByUUID(videoUUID)

        // Prevent caching to ensure fresh data
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
        res.set('Pragma', 'no-cache')
        res.set('Expires', '0')

        res.json(groupIds)
      } catch (error: unknown) {
        this.peertubeHelpers.logger.error(`Error in getVideoGroups for ${req.params.videoId}:`, error)
        this.handleError(error, res)
      }
    }
  }

  createSyncVideosRouteHandler (): RequestHandler {
    return async (req, res, _next) => {
      try {
        const authUser = await this.getAuthUser(res)
        if (authUser.role !== 0) { // 0 is Administrator
          throw new Error('Unauthorized')
        }

        let assignedCount = 0
        const unassignedVideoIds = await this.dbService.getUnassignedVideoIds()

        for (const videoId of unassignedVideoIds) {
          const assigned = await this.groupPermissionServices.autoAssignGroupIfMissing(videoId)
          if (assigned) assignedCount++
        }

        this.peertubeHelpers.logger.info(
          `Sync complete. Assigned ${assignedCount} out of ${unassignedVideoIds.length} unassigned videos.`
        )
        res.json({ status: 'ok', assigned: assignedCount })
      } catch (error: unknown) {
        this.handleError(error, res)
      }
    }
  }

  private handleError (error: unknown, res: Response): void {
    if (error instanceof Error && error.message === 'Unauthorized') {
      res.status(401).json({ error: 'Unauthorized' })
    } else {
      this.peertubeHelpers.logger.error('Error fetching user groups:', error)
      res.status(500).json({ error: 'Internal server error' })
    }
  }

  private async getAuthUser (res: Response): Promise<any> {
    const authUser = await this.peertubeHelpers.user.getAuthUser(res)
    if (!authUser) {
      throw new Error('Unauthorized')
    }
    return authUser
  }
}
