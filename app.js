const express = require('express');
const app = express();
const port = process.env.PORT || 3315;

const bancoRoutes = require('./routes/Banco.routes');

app.use(express.json());
app.use('/api', bancoRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
