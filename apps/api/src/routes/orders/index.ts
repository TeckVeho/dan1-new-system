import { Router } from "express";
import { weeklyOrdersRouter } from "./weekly.js";
import { riceOrdersRouter } from "./rice.js";
import { allergenOrdersRouter } from "./allergen.js";
import { orderHistoryRouter } from "./history.js";
import { orderListRouter } from "./list.js";

export const ordersRouter = Router();

ordersRouter.use(weeklyOrdersRouter);
ordersRouter.use(riceOrdersRouter);
ordersRouter.use(allergenOrdersRouter);
ordersRouter.use(orderHistoryRouter);
ordersRouter.use(orderListRouter);
