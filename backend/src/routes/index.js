const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const busCtrl = require('../controllers/busController');
const lignesCtrl = require('../controllers/lignesController');
const stationsCtrl = require('../controllers/stationsController');
const alertesCtrl = require('../controllers/alertesController');
const authCtrl = require('../controllers/authController');
const publicCtrl = require('../controllers/publicController');

router.get('/', (_req, res) => {
	res.json({
		status: 'ok',
		message: 'SIV API is running',
		endpoints: ['/auth/login', '/public/stations', '/public/lignes/:id/eta', '/bus', '/lignes', '/stations', '/alertes'],
	});
});

router.post('/auth/login', authCtrl.login);

router.get('/public/stations', publicCtrl.listStations);
router.get('/public/lignes/:id/eta', publicCtrl.getLigneETA);

router.get('/bus/active', auth, busCtrl.getActiveBuses);
router.get('/bus', auth, busCtrl.listBus);
router.get('/bus/:id', auth, busCtrl.getBus);
router.get('/bus/:id/position', auth, busCtrl.getBusPosition);
router.get('/bus/:id/telemetrie', auth, busCtrl.getBusTelemetrie);
router.get('/bus/:id/historique', auth, busCtrl.getBusHistorique);
router.post('/bus', auth, busCtrl.createBus);
router.put('/bus/:id', auth, busCtrl.updateBus);
router.delete('/bus/:id', auth, busCtrl.deleteBus);

router.get('/lignes', lignesCtrl.listLignes);
router.get('/lignes/:id', auth, lignesCtrl.getLigne);
router.post('/lignes', auth, lignesCtrl.createLigne);
router.put('/lignes/:id', auth, lignesCtrl.updateLigne);
router.delete('/lignes/:id', auth, lignesCtrl.deleteLigne);

router.post('/stations', auth, stationsCtrl.createStation);
router.put('/stations/:id', auth, stationsCtrl.updateStation);
router.delete('/stations/:id', auth, stationsCtrl.deleteStation);

router.get('/alertes', auth, alertesCtrl.listAlertes);
router.patch('/alertes/:id/acquitter', auth, alertesCtrl.acquitterAlerte);
router.patch('/alertes/acquitter-toutes', auth, alertesCtrl.acquitterToutes);

module.exports = router;
