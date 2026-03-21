import type { RegisterServerOptions } from '@peertube/peertube-types'
import { RouteHandlerFactory } from './service/route-handler-factory'
import { HookHandlerFactory } from './service/hook-handler-factory'
import { GroupPermissionService } from './service/group-permission-service'
import { DbService } from './service/db-service'
import { MigrationRunner } from './migrations/migration-runner'

const VideoPlaylistPrivacy = {
  PUBLIC: 1,
  UNLISTED: 2
} as const

async function register (registerServerOptions: RegisterServerOptions): Promise<void> {
  const { getRouter, registerSetting, settingsManager, registerHook, peertubeHelpers } = registerServerOptions

  // Dependency Injection
  const migrationRunner = new MigrationRunner(peertubeHelpers.database, peertubeHelpers.logger)
  const dbService = new DbService(registerServerOptions)
  const groupPermissionServices = new GroupPermissionService(registerServerOptions, dbService)
  const routeHandlerFactory = new RouteHandlerFactory(registerServerOptions, dbService, groupPermissionServices)
  const hookHandlerFactory = new HookHandlerFactory(registerServerOptions, groupPermissionServices)

  // Configuration flags
  const REINITIALIZE_DB = false

  await migrationRunner.initializeDatabase(REINITIALIZE_DB)

  registerSetting({
    name: 'user-group-definition',
    label: 'User Group Definition',
    type: 'markdown-text',
    private: true,
    descriptionHTML: `Use Markdown bullet points to create a YAML-like structure for user groups.
For example:
<pre>
- id: admin
  group_name: admin
  members:
    - root
- group_name: Group 1
  members:
    - user1
</pre>
<div style="margin-top: 15px; padding: 10px; border: 1px solid #ccc; border-radius: 5px;">
  <strong>Sync Missing Videos</strong><br />
  Click below to automatically back-assign newly created groups to old videos missing their assignment:
  <br /><br />
  <button type="button" class="peertube-button orange-button" onclick="fetch('/plugins/peertube-plugin-user-group-privacy-enhanced/router/sync-videos', {method: 'POST'}).then(r=>r.json()).then(d=>alert('Success! System auto-assigned '+d.assigned+' missing videos.')).catch(e=>alert('Error syncing videos: '+e))">Refresh / Auto-Sync Videos</button>
</div>
<div id="ugpl-interactive-gui-mount" style="position: absolute; top:0; left:0; width:100%; z-index: 100; background: var(--mainBackgroundColor);"></div>`
  })
  registerSetting({
    name: 'channel-group-map',
    label: 'Channel to Group Auto-Assignment Map',
    type: 'markdown-text',
    private: true,
    descriptionHTML: `Map channel names to their default privacy groups using a simple YAML list.
Example:
<pre>
- channel_name: kid1-channel
  group_name: kid1
- channel_name: gaming-channel
  group_name: gamers
</pre>`
  })

  registerSetting({
    name: 'fallback-group',
    label: 'Fallback Group',
    type: 'input',
    private: true,
    descriptionHTML: `If a video is uploaded to an unmapped (or missing) channel, it will optionally fall back to this group ID. Leave empty to keep videos unassigned and globally blocked. Example: <code>default</code>`
  })

  const initialSettings = await settingsManager.getSettings([])
  await groupPermissionServices.updateSettings(initialSettings)

  settingsManager.onSettingsChange(async (settings) => groupPermissionServices.updateSettings(settings))

  getRouter().get('/user-groups', routeHandlerFactory.createUserGroupsRouteHandler())
  getRouter().get('/user-groups/current-user', routeHandlerFactory.createUserGroupsForCurrentUserRouteHandler())
  getRouter().get('/video-groups/:videoShortUUID', routeHandlerFactory.createVideoGroupsRouteHandler())
  getRouter().post('/sync-videos', routeHandlerFactory.createSyncVideosRouteHandler())

  registerHook({
    target: 'action:api.video.updated',
    handler: hookHandlerFactory.getVideoUpdatedHandler()
  })
  registerHook({
    target: 'filter:api.download.video.allowed.result',
    handler: hookHandlerFactory.getVideoDownloadAllowedHandler()
  })
  registerHook({
    target: 'filter:api.download.generated-video.allowed.result',
    handler: hookHandlerFactory.getGeneratedVideoDownloadAllowedHandler()
  })
  registerHook({
    target: 'filter:api.video.get.result',
    handler: hookHandlerFactory.getGetVideoHandler()
  })
  registerHook({
    target: 'filter:api.videos.list.result',
    handler: hookHandlerFactory.getVideoListResultHandler()
  })
  registerHook({
    target: 'filter:api.search.videos.local.list.result',
    handler: hookHandlerFactory.getVideoSearchHandler()
  })
  registerHook({
    target: 'filter:api.video-playlist.videos.list.result',
    handler: hookHandlerFactory.getVideoPlaylistHandler()
  })
  registerHook({
    target: 'filter:api.accounts.videos.list.result',
    handler: hookHandlerFactory.getAccountVideosListHandler()
  })
  registerHook({
    target: 'filter:api.video-channels.videos.list.result',
    handler: hookHandlerFactory.getChannelVideosListHandler()
  })
  registerHook({
    target: 'filter:api.overviews.videos.list.result',
    handler: hookHandlerFactory.getOverviewVideoListHandler()
  })
  registerHook({
    target: 'filter:api.user.me.subscription-videos.list.result',
    handler: hookHandlerFactory.getUserMeSubscriptionVideosListHandler()
  })
  registerHook({
    target: 'action:notifier.notification.created',
    handler: hookHandlerFactory.getNotificationCreatedHandler()
  })

  // Disable PUBLIC and UNLISTED privacy option for playlists, because currently blocked videos remain visible in playlist thumbnails
  registerServerOptions.playlistPrivacyManager.deleteConstant(VideoPlaylistPrivacy.PUBLIC)
  registerServerOptions.playlistPrivacyManager.deleteConstant(VideoPlaylistPrivacy.UNLISTED)
}

async function unregister (): Promise<void> { }

module.exports = {
  register,
  unregister
}
