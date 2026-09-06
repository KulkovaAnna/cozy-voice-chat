const MESSAGE_TYPES = Object.freeze({
  RECEIVE: {
    LOBBY: {
      JOIN: 'lobby::join',
      INITIATE_CALL: 'lobby::initiate-call',
      ACCEPT_OFFER: 'lobby::accept-offer',
      DECLINE_OFFER: 'lobby::decline-offer',
    },
    CALL: {
      END_CALL: 'call::end',
      CHANGE_ONLINE_STATUS: 'call::online',
      CHANGE_MUTE_STATUS: 'call::mute',
      CHANGE_SPEAKING_STATUS: 'call::speaking',
      SEND_MESSAGE: 'call::send-message',
    },
  },
  SEND: {
    ALL: {
      LOBBY: {
        JOINED: 'all::lobby::joined',
        CLIENT_DISCONNECTED: 'all::lobby::client-disconnected',
      },
      CALL: {
        CALL_STARTED: 'all::call::started',
        CALL_ENDED: 'all::call::ended',
        ONLINE_STATUS_CHANGED: 'all::call::online-changed',
        MUTE_STATUS_CHANGED: 'all::call::mute-changed',
        SPEAKING_STATUS_CHANGED: 'all::call::speaking-changed',
        NEW_MESSAGE: 'all::call::new-message',
        FILE_RECEIVED: 'all::call::file-received',
        FILE_DELETED: 'all::call::file-deleted',
      },
    },
    ME: {
      CALL_INITIATED: 'me::call-initiated',
      CALL_OFFER: 'me::call-offer',
      CALL_OFFER_ACCEPTED: 'me::call-offer-accepted',
      CALL_OFFER_DECLINED: 'me::call-offer-declined',
      LOBBY_JOINED: 'me::lobby-joined',
    },
  },
});

module.exports = MESSAGE_TYPES;
