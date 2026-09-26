import * as os from 'os';
import _ from 'lodash';

export default class Helpers {
  static getLocalIP(): string[] {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    for (const name of Object.keys(interfaces)) {
      const ifaceList = interfaces[name];
      if (!ifaceList) continue;
      for (const iface of ifaceList) {
        // Skip internal and non-IPv4 addresses
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }

    return addresses;
  }

  static validateIP(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(ip)) return false;

    const parts = ip.split('.').map(Number);
    return parts.every((part) => part >= 0 && part <= 255);
  }

  static generateRoomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  static generateRoomId(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 6; i++) {
      id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
  }

  static omitDeep<T>(obj: T, keysToOmit: string[]): T {
    // Если это массив - обрабатываем каждый элемент
    if (_.isArray(obj)) {
      return _.map(obj, (item) => Helpers.omitDeep(item, keysToOmit)) as T;
    }

    // Если это объект (но не специальные типы вроде Date, RegExp)
    if (
      _.isObject(obj) &&
      !_.isDate(obj) &&
      !_.isRegExp(obj) &&
      !_.isFunction(obj)
    ) {
      // Сначала удаляем указанные ключи из текущего объекта
      const newObj = _.omit(obj as Record<string, unknown>, keysToOmit);

      // Затем рекурсивно обрабатываем все оставшиеся значения
      return _.transform(
        newObj,
        function (result: Record<string, unknown>, value, key) {
          // Рекурсивно вызываем для вложенных объектов и массивов
          result[key] = Helpers.omitDeep(value, keysToOmit);
        },
        {} as Record<string, unknown>,
      ) as T;
    }

    // Все остальное (примитивы, даты, регулярки, функции) возвращаем как есть
    return obj;
  }
}
