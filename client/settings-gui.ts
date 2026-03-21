// JSON is now used natively

export class SettingsGui {
  private mountPoint: HTMLElement | null = null
  private userGroupTextarea: HTMLTextAreaElement | null = null
  private channelMapTextarea: HTMLTextAreaElement | null = null

  private userGroups: any[] = []
  private channelMap: any[] = []

  initialize () {
    setInterval(() => {
      this.mountPoint = document.getElementById('ugpl-interactive-gui-mount')
      if (this.mountPoint && !this.mountPoint.dataset.initialized) {
        this.mountPoint.dataset.initialized = 'true'
        this.setupGui()
      }
    }, 1000)
  }

  private setupGui () {
    this.userGroupTextarea = document.querySelector('textarea[id$="user-group-definition"], textarea[name*="user-group-definition"]') as HTMLTextAreaElement
    this.channelMapTextarea = document.querySelector('textarea[id$="channel-group-map"], textarea[name*="channel-group-map"]') as HTMLTextAreaElement

    if (!this.userGroupTextarea || !this.channelMapTextarea) {
      console.warn('UGPL: Textareas not found, cannot mount interactive GUI.')
      return
    }

    // Hide original form groups
    const ugParent = this.userGroupTextarea.closest('peertube-plugin-custom-field-markdown-text') || this.userGroupTextarea.closest('.form-group')
    const cmParent = this.channelMapTextarea.closest('peertube-plugin-custom-field-markdown-text') || this.channelMapTextarea.closest('.form-group')

    if (ugParent) (ugParent as HTMLElement).style.display = 'none'
    if (cmParent) (cmParent as HTMLElement).style.display = 'none'

    try {
      this.userGroups = JSON.parse(this.userGroupTextarea.value) || []
    } catch (e) { this.userGroups = [] }

    try {
      this.channelMap = JSON.parse(this.channelMapTextarea.value) || []
    } catch (e) { this.channelMap = [] }

    if (!Array.isArray(this.userGroups)) this.userGroups = []
    if (!Array.isArray(this.channelMap)) this.channelMap = []

    this.render()
    this.setupEvents()
  }

  private saveToInputs () {
    if (this.userGroupTextarea) {
      this.userGroupTextarea.value = JSON.stringify(this.userGroups, null, 2)
      this.userGroupTextarea.dispatchEvent(new Event('input', { bubbles: true }))
      this.userGroupTextarea.dispatchEvent(new Event('change', { bubbles: true }))
    }
    if (this.channelMapTextarea) {
      this.channelMapTextarea.value = JSON.stringify(this.channelMap, null, 2)
      this.channelMapTextarea.dispatchEvent(new Event('input', { bubbles: true }))
      this.channelMapTextarea.dispatchEvent(new Event('change', { bubbles: true }))
    }
  }

  private render () {
    if (!this.mountPoint) return

    let groupsHtml = ''
    this.userGroups.forEach((g, i) => {
      const members = Array.isArray(g.members) ? g.members : []
      groupsHtml += `
        <div style="border: 1px solid var(--grey-border); margin-bottom: 10px; padding: 15px; border-radius: 5px;">
          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; flex-wrap: wrap;">
            <strong style="min-width: 60px;">ID:</strong> 
            <input type="text" class="form-control" placeholder="admin" value="${g.id || ''}" data-action="update-group-id" data-index="${i}">
            <strong style="min-width: 60px; margin-left:10px;">Name:</strong> 
            <input type="text" class="form-control" placeholder="Administrators" value="${g.group_name || ''}" data-action="update-group-name" data-index="${i}">
            <button type="button" class="peertube-button red-button" style="margin-left: auto;" data-action="delete-group" data-index="${i}">Delete Group</button>
          </div>
          <div style="margin-left: 20px;">
            <strong>Members:</strong>
            <ul style="margin: 5px 0; padding-left: 20px; list-style-type: none;">
              ${members.map((m: any, mi: number) => `
                <li style="margin-bottom: 5px; display: flex; align-items: center;">
                   <code>${m}</code>
                   <span style="cursor: pointer; color: #dc3545; margin-left: 10px; padding: 0 5px;" data-action="delete-member" data-gindex="${i}" data-mindex="${mi}">✖ Delete</span>
                </li>
              `).join('')}
            </ul>
            <div style="display:flex; gap: 10px; margin-top: 10px; max-width: 300px;">
              <input type="text" class="form-control form-control-sm" placeholder="Username" id="new-member-${i}">
              <button type="button" class="peertube-button grey-button" data-action="add-member" data-index="${i}">Add Member</button>
            </div>
          </div>
        </div>
      `
    })

    let channelsHtml = ''
    this.channelMap.forEach((c, i) => {
      channelsHtml += `
        <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; flex-wrap: wrap;">
          <input type="text" class="form-control" placeholder="kid1-channel" value="${c.channel_name || ''}" data-action="update-channel" data-index="${i}">
          <span style="font-size: 20px;">➡️</span>
          <input type="text" class="form-control" placeholder="kid1" value="${c.group_name || ''}" data-action="update-channel-group" data-index="${i}">
          <button type="button" class="peertube-button red-button" data-action="delete-channel" data-index="${i}">Delete Route</button>
        </div>
      `
    })

    this.mountPoint.innerHTML = `
      <div style="border: 2px solid var(--grey-border); padding: 20px; border-radius: 8px;">
        <h2 style="margin-top: 0; font-size: 1.5em;">Interactive Group Manager</h2>
        <p class="form-text text-muted" style="margin-bottom: 20px;">Use this visual editor to manage your privacy groups instead of raw JSON. Changes securely sync boundaries to the backend automatically.</p>
        
        ${groupsHtml}
        <button type="button" class="peertube-button orange-button" data-action="add-group" style="margin-top: 10px;">+ Add New Group...</button>
        
        <hr style="margin: 30px 0; border: 0; border-top: 1px solid var(--grey-border);" />
        
        <h2 style="margin-top: 0; font-size: 1.5em;">Interactive Channel Routing</h2>
        <p class="form-text text-muted" style="margin-bottom: 20px;">Map unassigned videos from specific channels automatically to privacy groups.</p>
        
        ${channelsHtml}
        <button type="button" class="peertube-button orange-button" data-action="add-channel" style="margin-top: 10px;">+ Add Channel Route...</button>

        <hr style="margin: 30px 0; border: 0; border-top: 1px solid var(--grey-border);" />
        
        <h2 style="margin-top: 0; font-size: 1.5em;">Sync Missing Videos</h2>
        <p class="form-text text-muted" style="margin-bottom: 20px;">Click below to automatically back-assign newly created groups to old videos missing their assignment:</p>
        <button type="button" class="peertube-button orange-button" data-action="sync-videos">Refresh / Auto-Sync Videos</button>
      </div>
    `
  }

  private setupEvents () {
    if (!this.mountPoint) return

    this.mountPoint.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const action = target.dataset.action
      if (!action) return

      if (action === 'add-group') {
        this.userGroups.push({ id: '', group_name: '', members: [] })
        this.saveAndRender()
      } else if (action === 'delete-group') {
        const i = parseInt(target.dataset.index!)
        this.userGroups.splice(i, 1)
        this.saveAndRender()
      } else if (action === 'add-member') {
        const i = parseInt(target.dataset.index!)
        const input = document.getElementById(`new-member-${i}`) as HTMLInputElement
        if (input && input.value.trim()) {
          if (!this.userGroups[i].members) this.userGroups[i].members = []
          this.userGroups[i].members.push(input.value.trim())
          this.saveAndRender()
        }
      } else if (action === 'delete-member') {
        const gi = parseInt(target.dataset.gindex!)
        const mi = parseInt(target.dataset.mindex!)
        this.userGroups[gi].members.splice(mi, 1)
        this.saveAndRender()
      } else if (action === 'add-channel') {
        this.channelMap.push({ channel_name: '', group_name: '' })
        this.saveAndRender()
      } else if (action === 'delete-channel') {
        const i = parseInt(target.dataset.index!)
        this.channelMap.splice(i, 1)
        this.saveAndRender()
      } else if (action === 'sync-videos') {
        fetch('/plugins/peertube-plugin-user-group-privacy-enhanced/router/sync-videos', { method: 'POST' })
          .then(r => r.json())
          .then(d => alert('Success! System auto-assigned ' + d.assigned + ' missing videos.'))
          .catch(e => alert('Error syncing videos: ' + e))
      }
    })

    this.mountPoint.addEventListener('input', (e) => {
      const target = e.target as HTMLInputElement
      const action = target.dataset.action
      if (!action) return

      const i = parseInt(target.dataset.index!)
      if (action === 'update-group-id') {
        this.userGroups[i].id = target.value
        this.saveToInputs()
      } else if (action === 'update-group-name') {
        this.userGroups[i].group_name = target.value
        this.saveToInputs()
      } else if (action === 'update-channel') {
        this.channelMap[i].channel_name = target.value
        this.saveToInputs()
      } else if (action === 'update-channel-group') {
        this.channelMap[i].group_name = target.value
        this.saveToInputs()
      }
    })
  }

  private saveAndRender () {
    this.saveToInputs()
    this.render()
  }
}
