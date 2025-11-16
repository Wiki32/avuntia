import { registerRoutes, registerNotFound } from "../router.js";
import { getPublicRoutes } from "./public.js";
import { getEmpresaRoutes } from "./empresa.js";
import { getEmpleadoRoutes } from "./empleado.js";
import { getOauthRoutes } from "./oauth.js";
import { buildMaintenance, buildNotFound } from "./system.js";

export function registerAllRoutes() {
  registerRoutes({
    ...getPublicRoutes(),
    ...getEmpresaRoutes(),
    ...getEmpleadoRoutes(),
    ...getOauthRoutes(),
    "/maintenance": () => buildMaintenance()
  });
  registerNotFound((props) => buildNotFound(props));
}
