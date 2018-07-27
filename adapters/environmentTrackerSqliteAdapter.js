const moment = require('moment');

const sqliteDateTimeFormat = 'YYYY-MM-DD HH:mm:ss';

const createTable = (db) => db.run(
  `CREATE TABLE IF NOT EXISTS Outages 
  (
    id VARCHAR(36) PRIMARY KEY,
    environment VARCHAR(50),
    outageBegan DATETIME,
    outageEnded DATETIME,
    reason VARCHAR(255)
  )`
);

const persistOutage = (db, outage) => {
  db.run(
    `INSERT INTO Outages (id, environment, outageBegan, reason)
     VALUES (
      '${outage.id}',
      '${outage.environment}',
      '${outage.outageBegan.format(sqliteDateTimeFormat)}',
      '${outage.reason}'
   )`);
};

const persistResolveOutage = (db, outage) => {
  db.run(
    `UPDATE Outages
     SET outageEnded='${outage.outageEnded.format(sqliteDateTimeFormat)}'
     WHERE id='${outage.id}'`
  );
};

const outageFromDbRow = (outageRow) => ({
  id: outageRow.id,
  environment: outageRow.environment,
  outageBegan: moment(outageRow.outageBegan),
  outageEnded: outageRow.outageEnded ? moment(outageRow.outageEnded) : undefined,
  reason: outageRow.reason
});

const loadOutages = (db, instance) => {
  db.all(`
  SELECT *
  FROM Outages
  WHERE environment = '${instance.name}'
  ORDER BY outageBegan DESC`, (err, rows) => {
    if (err) { console.log(err); return; };
    rows.forEach(row => instance.outages.unshift(outageFromDbRow(row)));

    // TODO: Race condition: If the first state check returns before the outages load, the currentOutage will fall out of sync
    if (rows[0] && !rows[0].outageEnded && !instance.currentOutage) {
      instance.currentOutageId = rows[0].id;
    }
  });
}

const adapterFactory = (db) => ({
  createTable: createTable.bind(null, db),
  persistOutage: persistOutage.bind(null, db),
  persistResolveOutage: persistResolveOutage.bind(null, db),
  loadOutages: loadOutages.bind(null, db)
});

module.exports = adapterFactory;