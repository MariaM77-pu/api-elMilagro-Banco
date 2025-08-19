const express = require('express');
const router = express.Router();
const bancoController = require('../controllers/banco.controller');

// Pago por SINPE Móvil
router.post('/pagos/sinpe', bancoController.pagoSinpe);

// Pago por Tarjeta
router.post('/pagos/tarjeta', bancoController.pagoTarjeta);

module.exports = router;
