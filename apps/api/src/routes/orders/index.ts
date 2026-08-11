import { Router } from "express";
import { weeklyOrdersRouter } from "./weekly.js";
import { riceOrdersRouter } from "./rice.js";
import { allergenOrdersRouter } from "./allergen.js";
import { orderFormDataRouter } from "./form-data.js";
import { orderHistoryRouter } from "./history.js";
import { orderListRouter } from "./list.js";
import { newYearOrdersRouter } from "./new-year.js";
import { orderEntryRouter } from "./entry.js";
import { riceLogsRouter } from "./rice-logs.js";

export const ordersRouter = Router();

ordersRouter.use(weeklyOrdersRouter);
ordersRouter.use(newYearOrdersRouter);
ordersRouter.use(orderEntryRouter);
ordersRouter.use(orderFormDataRouter);
ordersRouter.use(riceOrdersRouter);
ordersRouter.use(allergenOrdersRouter);
ordersRouter.use(orderHistoryRouter);
ordersRouter.use(orderListRouter);
ordersRouter.use(riceLogsRouter);
