import { Router } from "express";
import { renderIndex, renderAbout, renderUIX, renderDiseñoApp, renderPensamientoDigital, renderMarketing,renderTransDigital, renderDesarrolloWeb, MapaSitio } from "../controllers/index.controller.js";

const router = Router();

router.get("/", renderIndex);

router.get("/about", renderAbout);

router.get("/servicios/disenio-ui-ux", renderUIX);

router.get("/servicios/disenio-de-aplicaciones", renderDiseñoApp);

router.get("/servicios/pensamiento-digital", renderPensamientoDigital);

router.get("/servicios/marketing-digital", renderMarketing);

router.get("/servicios/Transformacion-Digital",renderTransDigital);

router.get("/servicios/Desarrollo-Web",renderDesarrolloWeb);

router.get("/Mapa",MapaSitio);

export default router;
