# PeerTube plugin: User Group Privacy Enhanced

## About
This plugin will add a privacy layer that allows very fine-grained privacy settings for every video.
In the Plugin Settings as administrator you can define groups of use names. Every video will then have the option to select any number of groups and the video will then only be accessible to a user if the user is part of any selected group.

## How it works
This plugin features a robust **Interactive Web GUI** right inside your PeerTube admin settings! You can visually create groups, add member usernames, and map channel routing rules using our dynamic tables without touching any raw code.

*(Under the hood, all assignments are securely stored in your database as native Javascript `JSON` arrays so they are extremely fast and lightweight.)*

After creating your groups in the settings, every video edit page will display a set of dynamic checkboxes. Simply select the groups you want to share the video with! By default, no group is checked, meaning the video will fall back to its native PeerTube visibility (e.g., everyone can see it if it's explicitly set to Public).

### God Mode (Global Bypass)
If you name a group exactly `admin` or `superuser`, any user located within that group will instantly bypass all restrictions and have permanent access to view every video on your PeerTube server.

### Automatic Channel Auto-Assignment
Instead of manually assigning groups on every single upload, you can configure automatic routing rules inside the Plugin Settings!
- **Channel Map**: Use the `Channel to Group Auto-Assignment Map` to map PeerTube channel names to their respective privacy groups (e.g. `kid1-channel` -> `kid1`).
- **Global Fallback Group**: Use the `Fallback Group` setting to optionally catch unmapped videos and route them to a holding group.
- **Sync existing videos**: Click the orange **"Refresh / Auto-Sync Videos"** button in the Plugin Settings to retroactively sweep your entire database and automatically back-assign old missing videos into their mapped groups immediately!

**Note**: Because of how video plugin settings are registered there is a text field with a JSON array wich is the actual setting but below are the dynamicly created checkboxes. Maybe not ideal but it works.

## Limitations
- If the standard video privacy setting it set to public the video files will be served publicly enen though the video will not appear in the frontend! It's highly recommended to use only the privacy setting "Internal" and maybe even disable the public and unlisted option (see [this plugin](https://www.npmjs.com/package/peertube-plugin-privacy-remover))
- If a video is the first in a playlist it will be visible in the playlists thumbnail. This is a loophole that currently cannot be closed; there is to plugin hook for that. Because of that this plugin will disable the privacy options "Public" and "Unlisted" for playlists so that noone else can cause a privacy leak by adding a video to a playlist. (I mainly developed this plugin for my purposes. If someone wants to use it and dislikes this decision, feel free to create a GitHub issue regarding a feature toggle.)
- If someone had access to a video before and watched it it will continue to show up in the watch history even though it cannot be watched again. (Also currently no Plugin Hook to filter that)
- Notifications of new videos appear to subscribers if they have a current session. If not it's deleted in time and not shown. There's a [feature request](https://github.com/Chocobozzz/PeerTube/issues/7218) asking for a hook to solve this issue.

## Future Ideas
Ideas how to improve this plugin:
*(All original features mapped out have been successfully fulfilled!)*

## Development
To quickly update the plugin in the debugging instance run `npm run cli:reinstall`