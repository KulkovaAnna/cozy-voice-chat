class Adapters {
  static getClientUser(recieverId) {
    return function (user) {
      return {
        id: user.id,
        additionalInfo: user.additionalInfo,
        isMe: user.id === recieverId,
        joinedAt: user.joinedAt,
      };
    };
  }
}

module.exports = Adapters;
