import { Key, Stock } from '../config/models.js';
import db from '../config/index.js';
import log from '../utils/logger.js';

const stockService = {
  addKeys: async (keys, country) => {
    console.log(country);
    const { id: stock_id } = await Stock.findOne({ where: { country }});
    console.log(stock_id);
    const promises = keys.map(async (key) => {
      const elements = key.split('|').map(part => part.trim());
      
      await Key.create({
        number: elements[0],
        mm: elements[1],
        yyyy: elements[2],
        code: elements[3],
        otherinfo: elements.length > 4 ? elements.slice(4).join('|') : null,
        stock_id,
      });
    });
    await Promise.all(promises);
  },
  getKeys: async (country, quantity) => {
    log(`Fetching ${quantity} keys for country ${country}.`);
    const stocks = await Stock.findAll({
      where: { country, '$Key.used$': false },
      include: [{ model: Key, where: { used: false } }],
      limit: quantity,
    });

    const keyIds = stocks.map(stock => stock.key_id);
    await Key.update({ used: true }, { where: { id: keyIds } });

    return stocks.map(stock => {
      const key = stock.Key;
      return `${key.number}|${key.mm}|${key.yyyy}|${stock.country}|${stock.price}|${key.otherinfo1 || ''}|${key.otherinfo2 || ''}|${key.otherinfo3 || ''}`.replace(/\|+$/, '');
    });
  },
  getBulkKeys: async (quantity) => {
    log(`Fetching ${quantity} bulk keys.`);
    const stocks = await Stock.findAll({
      where: { '$Key.used$': false },
      include: [{ model: Key, where: { used: false } }],
      limit: quantity,
    });

    const keyIds = stocks.map(stock => stock.key_id);
    await Key.update({ used: true }, { where: { id: keyIds } });

    return stocks.map(stock => {
      const key = stock.Key;
      return `${key.number}|${key.mm}|${key.yyyy}|${stock.country}|${stock.price}|${key.otherinfo1 || ''}|${key.otherinfo2 || ''}|${key.otherinfo3 || ''}`.replace(/\|+$/, '');
    });
  },
  getStock: async () => {
    log('Fetching current stock.');
    const stock = await Stock.findAll({
      attributes: [
        'country',
        [db.sequelize.fn('COUNT', db.sequelize.col('Keys.id')), 'count'],
        [db.sequelize.fn('AVG', db.sequelize.col('Stocks.price')), 'avgPrice']
      ],
      include: [{
        model: Key,
        attributes: [],
        where: { used: false }
      }],
      group: ['Stocks.country', 'Stocks.id']
    });
    return stock.map(s => ({
      country: s.country,
      count: s.dataValues.count,
      avgPrice: parseFloat(s.dataValues.avgPrice).toFixed(2),
    }));
  },
};

export default stockService;
