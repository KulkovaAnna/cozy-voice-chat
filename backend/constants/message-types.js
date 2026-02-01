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
    },
  },
  SEND: {
    ALL: {
      LOBBY: {
        JOINED: 'all::lobby::joined',
        CLIENT_DISCONNECTED: 'lobby::client-disconnected',
      },
      CALL: {
        CALL_STARTED: 'all::call::started',
        CALL_ENDED: 'all::call::ended',
        ONLINE_STATUS_CHANGED: 'all::call::online-changed',
        MUTE_STATUS_CHANGED: 'all::call::mute-changed',
        SPEAKING_STATUS_CHANGED: 'all::call::speaking-changed',
      },
    },
    ME: {
      CALL_INITIATED: 'me::call-initiated',
      CALL_OFFER: 'me::call-offer',
      CALL_OFFER_ACCEPTED: 'me::call-offer-accepted',
      CALL_OFFER_DECLINED: 'me::call-offer-declined',
    },
  },
});

module.exports = MESSAGE_TYPES;
