import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server:{
    host: "0.0.0.0",
    port: 5174,
    proxy:{
      "/plot": "http://backend:8000",
      "/plot_single": "http://backend:8000",
      "/validate_intervals": "http://backend:8000",
      "/check_convergence": "http://backend:8000",
      "/suggest_intervals": "http://backend:8000",
    },
  },
});