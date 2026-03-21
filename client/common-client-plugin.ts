import type { RegisterClientOptions } from '@peertube/peertube-types/client'
import { SettingsGui } from './settings-gui'

async function register (_options: RegisterClientOptions): Promise<void> {
  const gui = new SettingsGui()
  gui.initialize()
}

export {
  register
}
