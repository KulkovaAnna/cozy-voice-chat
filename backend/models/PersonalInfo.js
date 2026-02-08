class PersonalInfo {
  /**
   * @param {string | null} name
   * @param {string | null} avatar
   */
  constructor(name, avatar) {
    /**
     * @type {string}
     */
    this.name = name || `Аноним_${Date.now()}`;
    /**
     * @type {string | null}
     */
    this.avatar = avatar || null;
  }
}

module.exports = PersonalInfo;
