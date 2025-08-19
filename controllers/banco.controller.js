const db = require('../db');

exports.pagoSinpe = (req, res) => {
  const { numero_origen, numero_destino, monto, descripcion } = req.body;

  const amount = Number(monto);
  if (!numero_origen || !numero_destino || isNaN(amount)) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (amount <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a cero' });
  }

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: err.message });

    // 1) Emisor por teléfono
    db.query(
      'SELECT identificacion AS id, saldo FROM usuarios WHERE numero_telefono = ?',
      [numero_origen],
      (err, rowsE) => {
        if (err) return rollback(err, res);
        if (!rowsE.length) return rollback(new Error('Emisor SINPE no registrado'), res);
        const { id: idEmisor, saldo: saldoEmisor } = rowsE[0];
        if (Number(saldoEmisor) < amount) {
          return rollback(new Error('Saldo insuficiente'), res);
        }

        // 2) Receptor por teléfono
        db.query(
          'SELECT identificacion AS id, saldo FROM usuarios WHERE numero_telefono = ?',
          [numero_destino],
          (err, rowsR) => {
            if (err) return rollback(err, res);
            if (!rowsR.length) return rollback(new Error('Receptor SINPE no registrado'), res);

            const { id: idReceptor } = rowsR[0];

            // 3) Actualizar saldos
            db.query(
              'UPDATE usuarios SET saldo = saldo - ? WHERE identificacion = ?',
              [amount, idEmisor],
              err => {
                if (err) return rollback(err, res);

                db.query(
                  'UPDATE usuarios SET saldo = saldo + ? WHERE identificacion = ?',
                  [amount, idReceptor],
                  err => {
                    if (err) return rollback(err, res);

                    // 4) Registrar transacción (enumerando columnas o usando SET)
                    db.query(
                       `INSERT INTO transacciones SET
                        identificacion_emisor     = ?,
                        numero_telefono_emisor    = ?,
                        numero_telefono_receptor  = ?,
                        monto                     = ?,
                        tipo_pago                 = ?,
                        descripcion               = ?,
                        fecha                     = NOW()`,
                      [
                        idEmisor,
                        numero_origen,
                        numero_destino,
                        amount,
                        'sinpe',
                        descripcion || null
                      ],
                      err => {
                        if (err) return rollback(err, res);
                        db.commit(commitErr => {
                          if (commitErr) return rollback(commitErr, res);
                          res.json({ message: 'Pago SINPE exitoso' });
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });

  function rollback(err, res) {
    db.rollback(() => res.status(400).json({ error: err.message }));
  }
};


exports.pagoTarjeta = (req, res) => {
  const {
    identificacion_emisor,
    numero_tarjeta_emisor,
    codigo_cvv,
    fecha_vencimiento,
    numero_tarjeta_receptor,
    monto,
    descripcion
  } = req.body;

  if (!identificacion_emisor || !numero_tarjeta_emisor || !codigo_cvv || !fecha_vencimiento || !numero_tarjeta_receptor || !monto) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }
  if (monto <= 0) {
    return res.status(400).json({ error: 'El monto debe ser mayor a cero' });
  }

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ error: err.message });

    // 1) Validar tarjeta emisor
    db.query(
      `SELECT identificacion AS id, saldo, numero_tarjeta, codigo_cvv, fecha_vencimiento
       FROM usuarios WHERE identificacion = ?`,
      [identificacion_emisor],
      (err, rowsE) => {
        if (err) return rollback(err, res);
        if (!rowsE.length) return rollback(new Error('Emisor no registrado'), res);

        const em = rowsE[0];
        const fv = em.fecha_vencimiento.toISOString().slice(0,10);
        if (
          em.numero_tarjeta !== numero_tarjeta_emisor ||
          em.codigo_cvv     !== codigo_cvv ||
          fv                 !== fecha_vencimiento
        ) return rollback(new Error('Datos de tarjeta inválidos'), res);
        if (em.saldo < monto) return rollback(new Error('Saldo insuficiente'), res);

        // 2) Receptor por número de tarjeta
        db.query(
          'SELECT identificacion AS id, saldo FROM usuarios WHERE numero_tarjeta = ?',
          [numero_tarjeta_receptor],
          (err, rowsR) => {
            if (err) return rollback(err, res);
            if (!rowsR.length) return rollback(new Error('Receptor no registrado'), res);
            const { id: idReceptor } = rowsR[0];

            // 3) Actualizar saldos
            db.query(
              'UPDATE usuarios SET saldo = saldo - ? WHERE identificacion = ?',
              [monto, identificacion_emisor],
              err => {
                if (err) return rollback(err, res);
                db.query(
                  'UPDATE usuarios SET saldo = saldo + ? WHERE identificacion = ?',
                  [monto, idReceptor],
                  err => {
                    if (err) return rollback(err, res);

                    // 4) Insertar transacción (sin identificacion_receptor)
                    db.query(
                      `INSERT INTO transacciones
                         (tipo_pago,
                          identificacion_emisor,
                          numero_tarjeta_emisor,
                          numero_tarjeta_receptor,
                          monto,
                          descripcion)
                       VALUES (?,?,?,?,?,?)`,
                      [
                        'tarjeta',
                        identificacion_emisor,
                        numero_tarjeta_emisor,
                        numero_tarjeta_receptor,
                        monto,
                        descripcion || null
                      ],
                      err => {
                        if (err) return rollback(err, res);
                        db.commit(commitErr => {
                          if (commitErr) return rollback(commitErr, res);
                          res.json({ message: 'Pago con tarjeta exitoso' });
                        });
                      }
                    );
                  }
                );
              }
            );
          }
        );
      }
    );
  });

  function rollback(err, res) {
    db.rollback(() => {
      res.status(400).json({ error: err.message });
    });
  }
};
