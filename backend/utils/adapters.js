class Adapters {
  static getClientUser(user) {
    return {
      id: user.id,
      joinedAt: user.joinedAt,
      additionalInfo: user.additionalInfo,
    };
  }
}

module.exports = Adapters;
