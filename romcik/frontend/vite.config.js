import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server:{
    host: "0.0.0.0",
    port: 5174,
    proxy:{
      "/plot": "backend:8000",
      "/plot_single": "backend:8000",
      "/validate_intervals": "backend:8000",
      "/check_convergence": "backend:8000",
      "/suggest_intervals": "backend:8000",
    },
  },
});