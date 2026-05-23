import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server:{
    host: "0.0.0.0",
    port: 5174,
    proxy:{
      "/plot": "http://backend",
      "/plot_single": "http://backend",
      "/validate_intervals": "http://backend",
      "/check_convergence": "http://backend",
      "/suggest_intervals": "http://backend",
    },
  },
});