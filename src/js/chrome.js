/** Shared chrome for every static page (header/footer web components). */
import "./components/guld-header.js";
import "./components/guld-footer.js";
import { bindAuthChrome } from "./lib/auth.js";
import { registerServiceWorker } from "./register-sw.js";

bindAuthChrome();
registerServiceWorker();
