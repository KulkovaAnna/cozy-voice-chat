export default class PersonalInfo {
  public name: string;
  public avatar: string | null;

  constructor(name?: string | null, avatar?: string | null) {
    this.name = name || `Аноним_${Date.now()}`;
    this.avatar = avatar || null;
  }
}
