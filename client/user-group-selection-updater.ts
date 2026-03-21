import { Api } from './api'
import { USER_GROUP_SELECTION_FIELD } from '../shared/constants'

export class UserGroupSelectionUpdater {
  private readonly api: Api

  constructor (api: Api) {
    this.api = api
  }

  async initialize (): Promise<void> {
    const container = document.querySelector('.group-checkboxes') as HTMLElement

    if (container && !container.dataset.initialized) {
      container.dataset.initialized = 'true'
      await this.loadUserGroups(container)
      this.setupPrivacyVisibilityToggling()
    }
  }

  private setupPrivacyVisibilityToggling (): void {
    const checkVisibility = () => {
      // Find the select element for privacy
      const privacySelect = document.querySelector('select[name="privacy"], select#privacy, select[formcontrolname="privacy"]') as HTMLSelectElement | null

      const ourContainer = document.querySelector('.user-group-selector')
      if (!ourContainer) return

      // peertube-plugin-custom-field-html wrapper holds the entire custom field including label
      const parentFormGroup = ourContainer.closest('.form-group') || ourContainer.closest('peertube-plugin-custom-field-html') || ourContainer

      if (!privacySelect) {
        // Fallback: Show container if privacy selection field is not available
        (parentFormGroup as HTMLElement).style.display = 'block'
        return
      }

      // Number 4 corresponds to VideoPrivacy.INTERNAL in PeerTube
      const valStr = privacySelect.value ? privacySelect.value.toString() : ''
      const selectedText = privacySelect.options[privacySelect.selectedIndex] ? privacySelect.options[privacySelect.selectedIndex].text.toLowerCase() : ''

      const isInternal = valStr === '4' ||
        valStr.includes(': 4') ||
        selectedText.includes('internal')

      if (isInternal) {
        (parentFormGroup as HTMLElement).style.display = 'block'
      } else {
        (parentFormGroup as HTMLElement).style.display = 'none'
      }

      // Bind event listener if not already bound
      if (!privacySelect.dataset.ugplBound) {
        privacySelect.dataset.ugplBound = 'true'
        privacySelect.addEventListener('change', checkVisibility)
      }
    }

    // Initial check
    checkVisibility()

    // Interval check in case the component is recreated or value changes dynamically
    setInterval(checkVisibility, 2000)
  }

  private async loadUserGroups (container: HTMLElement): Promise<void> {
    try {
      const groups = await this.api.getUserGroups()
      container.innerHTML = ''

      if (groups.length === 0) {
        container.innerHTML = 'No user groups configured'
        return
      }

      groups.forEach(group => {
        const label = document.createElement('label')
        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.value = group.id.toString()
        checkbox.addEventListener('change', () => this.updateSelectedGroupsInInputField())

        label.appendChild(checkbox)
        label.appendChild(document.createTextNode(' ' + group.name))
        container.appendChild(label)
        container.appendChild(document.createElement('br'))
      })

      await this.loadExistingSelections()
    } catch (error) {
      container.innerHTML = 'Error loading groups'
    }
  }

  private async loadExistingSelections (): Promise<void> {
    const videoShortUUID = this.getVideoShortUUID()
    if (!videoShortUUID) {
      // New videos have no saved selections
      return
    }

    try {
      const selectedGroupIds = await this.api.getVideoGroupsByShortUUID(videoShortUUID)

      selectedGroupIds.forEach((groupId: number) => {
        const checkboxForGroupId = document.querySelector(`.group-checkboxes input[value="${groupId}"]`) as HTMLInputElement
        if (checkboxForGroupId) {
          checkboxForGroupId.checked = true
        }
      })
      // Update textarea silently (don't trigger form change events during initial load)
      this.updateSelectedGroupsInInputField(false)
    } catch (error) {
      console.error('Failed to load existing group selections:', error)
    }
  }

  private updateSelectedGroupsInInputField (triggerEvents: boolean = true): void {
    const checkedCheckboxes = document.querySelectorAll('.group-checkboxes input[type="checkbox"]:checked') as NodeListOf<HTMLInputElement>
    const selectedIds = Array.from(checkedCheckboxes).map(checkbox => checkbox.value)
    const input = document.querySelector(`input#${USER_GROUP_SELECTION_FIELD}`) as HTMLInputElement

    input.value = JSON.stringify(selectedIds)

    // Only trigger input event for user interactions, not during initial load
    if (triggerEvents) {
      input.dispatchEvent(new Event('input', { bubbles: true }))
    }
  }

  private getVideoShortUUID (): string | null {
    // Extract video short UUID from current URL
    const match = window.location.pathname.match(/\/videos\/manage\/([a-zA-Z0-9_-]+)/)
    return match ? match[1] : null
  }
}
