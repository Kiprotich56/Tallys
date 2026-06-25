import { Router, type IRouter } from "express";
import healthRouter from "./health";
import servicesRouter from "./services";
import staffRouter from "./staff";
import customersRouter from "./customers";
import appointmentsRouter from "./appointments";
import reviewsRouter from "./reviews";
import loyaltyRouter from "./loyalty";
import dashboardRouter from "./dashboard";
import mpesaRouter from "./mpesa";

const router: IRouter = Router();

router.use(healthRouter);
router.use(servicesRouter);
router.use(staffRouter);
router.use(customersRouter);
router.use(appointmentsRouter);
router.use(reviewsRouter);
router.use(loyaltyRouter);
router.use(dashboardRouter);
router.use(mpesaRouter);

export default router;
