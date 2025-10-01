import 'dotenv/config';
import express from 'express';
import morgan from 'morgan';
import http from 'http';
import { applySecurity } from './config/security';
import sequelize from './db/index';
import { initModels } from './db/models';
import { setupSocket, getSocketStats } from './realtime/socket';
import { startMonitorScheduler } from './scheduler/monitorScheduler';
import { notify } from './services/notifications';
import { startReportScheduler } from './services/reports';
import { runMigrationsOnStartup } from './db/init';
import monitorsRouter from './routes/monitors';
import authRouter from './routes/auth';
import cookieParser from 'cookie-parser';


const app = express();


applySecurity(app);
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());
app.use('/api/monitors', monitorsRouter);
app.use('/api/auth', authRouter);
app.get('/health', async (_req, res) => {
  try { await sequelize.authenticate(); res.json({ status: 'ok', db: 'connected' }); }
  catch (err) { res.status(500).json({ status: 'error', db: 'disconnected' }); }
});
app.get('/socket-health', (_req, res) => {
  const stats = getSocketStats();
  res.json({ ok: true, ...stats });
});
const server = http.createServer(app);
const io = setupSocket(server);
initModels();
sequelize.authenticate()
  .then(() => console.log('DB connected'))
  .catch((err) => console.error('DB connection error', err));
runMigrationsOnStartup()
  .then(() => console.log('DB migrations ensured'))
  .catch(() => {});
startMonitorScheduler(notify, (event, data) => io.emit(event, data));
startReportScheduler();
const port = Number(process.env.PORT || 4000);
server.listen(port, () => { console.log(`Server running on http://localhost:${port}`); });
