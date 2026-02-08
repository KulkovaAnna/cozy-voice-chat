const os = require('os');
const _ = require('lodash');

class Helpers {
  static getLocalIP() {
    const interfaces = os.networkInterfaces();
    const addresses = [];

    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Skip internal and non-IPv4 addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }

    return addresses;
  }

  static validateIP(ip) {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(ip)) return false;

    const parts = ip.split('.').map(Number);
    return parts.every((part) => part >= 0 && part <= 255);
  }

  static generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  static omitDeep(obj, keysToOmit) {
    // Если это массив - обрабатываем каждый элемент
    if (_.isArray(obj)) {
      return _.map(obj, (item) => Helpers.omitDeep(item, keysToOmit));
    }

    // Если это объект (но не специальные типы вроде Date, RegExp)
    if (
      _.isObject(obj) &&
      !_.isDate(obj) &&
      !_.isRegExp(obj) &&
      !_.isFunction(obj)
    ) {
      // Сначала удаляем указанные ключи из текущего объекта
      const newObj = _.omit(obj, keysToOmit);

      // Затем рекурсивно обрабатываем все оставшиеся значения
      return _.transform(
        newObj,
        function (result, value, key) {
          // Рекурсивно вызываем для вложенных объектов и массивов
          result[key] = Helpers.omitDeep(value, keysToOmit);
        },
        {},
      );
    }

    // Все остальное (примитивы, даты, регулярки, функции) возвращаем как есть
    return obj;
  }
}

module.exports = Helpers;
