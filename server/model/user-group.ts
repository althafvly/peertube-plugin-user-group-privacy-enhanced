export class UserGroup {
  configId: string
  name: string
  members: string[]

  constructor (configId: string, name: string) {
    this.configId = configId || name
    this.name = name
    this.members = []
  }
}
