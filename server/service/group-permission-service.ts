import { RegisterServerOptions, SettingEntries } from '@peertube/peertube-types'
import { Logger } from 'winston'
import { DbService } from './db-service'
import { parse as yamlParse } from 'yaml'
import { USER_GROUP_SELECTION_FIELD } from '../../shared/constants'

export class GroupPermissionService {
  private readonly logger: Logger
  private readonly dbService: DbService
  private channelGroupMap: Record<string, string> = {}
  private fallbackGroup: string | null = 'default'

  constructor (
    registerServerOptions: RegisterServerOptions,
    dbSerbice: DbService
  ) {
    this.logger = registerServerOptions.peertubeHelpers.logger
    this.dbService = dbSerbice
  }

  public async isUserAllowedForVideo (userId: number, videoId: number): Promise<boolean> {
    if (!userId || !videoId) {
      return false
    }
    // Check if user owns the video
    const isOwner = await this.dbService.isVideoOwner(userId, videoId)
    if (isOwner) {
      return true
    }

    const videoGroups = await this.dbService.getVideoGroupPermissions(videoId)

    // If video has no group restrictions, allow access (so regular public videos don't disappear)
    if (videoGroups.length === 0) {
      return true
    }

    const userGroups = await this.dbService.getUserGroupsForUser(userId)

    // Bypass check: Users inside the 'admin' or 'superuser' groups can view ALL videos
    if (userGroups.includes('admin') || userGroups.includes('superuser')) {
      return true
    }

    const hasAccess = videoGroups.some(group => userGroups.includes(group))

    if (!hasAccess) {
      this.logger.debug(`User ${userId} not allowed for video ${videoId} - user groups: [${userGroups.join(', ')}], video groups: [${videoGroups.join(', ')}]`)
    }

    return hasAccess
  }

  public async setPermissionsForVideo (videoId: number, groupPluginData: { [key: string]: any }) {
    let selectedGroupIds: number[] = []

    // Parse group IDs from JSON format
    if (groupPluginData[USER_GROUP_SELECTION_FIELD]) {
      const groupSelectionValue = groupPluginData[USER_GROUP_SELECTION_FIELD]
      if (groupSelectionValue && groupSelectionValue.trim() !== '') {
        try {
          const parsedArray = JSON.parse(groupSelectionValue)
          if (Array.isArray(parsedArray)) {
            selectedGroupIds = parsedArray.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id))
          }
        } catch (error) {
          this.logger.error('Failed to parse group selection JSON:', error, 'Value:', groupSelectionValue)
        }
      }
    }

    this.logger.info(`Setting video ${videoId} permissions for group IDs: [${selectedGroupIds.join(', ')}]`)
    await this.dbService.setVideoGroupPermissionsByIds(videoId, selectedGroupIds)
  }

  public async loadPluginDataForVideo (video: any, videoId: number) {
    const groupIds = await this.dbService.getVideoGroupIds(videoId)

    video.pluginData = video.pluginData || {}

    // Set the user-group-selection field with the correct JSON format
    video.pluginData[USER_GROUP_SELECTION_FIELD] = JSON.stringify(groupIds.map(String))

    this.logger.info(`Loaded plugin data for video ${videoId}: ${USER_GROUP_SELECTION_FIELD} = ${video.pluginData[USER_GROUP_SELECTION_FIELD]}`)
  }

  public async updateSettings (settings: SettingEntries): Promise<any> {
    const userGroupDefinition = settings['user-group-definition'] as string

    if (!userGroupDefinition || userGroupDefinition.trim() === '') {
      this.logger.info('Empty user group definition, clearing all groups')
      await this.dbService.updateUserGroups([])
      return Promise.resolve()
    }

    try {
      const groups = yamlParse(userGroupDefinition)
      this.logger.info(`Parsed ${groups?.length || 0} user groups from settings`)

      const userGroups = groups?.map((group: any) => {
        const name = group.group_name || group.name
        return {
          configId: group.id || name,
          name,
          members: group.members || []
        }
      }) || []

      await this.dbService.updateUserGroups(userGroups)
      this.logger.info('User groups updated successfully')
    } catch (error) {
      this.logger.error('Failed to parse user group definition:', error)
    }

    // Parse Channel Map
    const channelMapDefinition = settings['channel-group-map'] as string
    if (channelMapDefinition && channelMapDefinition.trim() !== '') {
      try {
        const parsedMap = yamlParse(channelMapDefinition)
        const map: Record<string, string> = {}
        if (Array.isArray(parsedMap)) {
          parsedMap.forEach(item => {
            if (item.channel_name && item.group_name) {
              map[item.channel_name] = String(item.group_name)
            }
          })
        }
        this.channelGroupMap = map
        this.logger.info(`Parsed ${Object.keys(map).length} auto-assign channel mapping rules.`)
      } catch (error) {
        this.logger.error('Failed to parse channel group map YAML:', error)
      }
    } else {
      this.channelGroupMap = {}
    }

    // Parse Fallback Group
    this.fallbackGroup = (settings['fallback-group'] as string || '').trim() || null

    return Promise.resolve()
  }

  public async autoAssignGroupIfMissing (videoId: number): Promise<boolean> {
    const groups = await this.dbService.getVideoGroupIds(videoId)
    if (groups.length > 0) return false

    const channelName = await this.dbService.getVideoChannelName(videoId)

    const targetGroupName = (channelName && this.channelGroupMap[channelName]) ? this.channelGroupMap[channelName] : this.fallbackGroup

    if (!targetGroupName) {
      this.logger.info(`Skipped auto-assign for video ${videoId} (No fallback configured)`)
      return false
    }

    const allGroups = await this.dbService.getAllUserGroupsWithIds()
    const targetGroup = allGroups.find(g => g.name === targetGroupName)

    if (targetGroup) {
      await this.dbService.setVideoGroupPermissionsByIds(videoId, [targetGroup.id])
      this.logger.info(`Auto-assigned video ${videoId} to group limit '${targetGroupName}'`)
      return true
    } else {
      this.logger.warn(`Could not auto-assign video ${videoId}: group '${targetGroupName}' not found`)
      return false
    }
  }
}
