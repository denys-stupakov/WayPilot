import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server:{
    proxy:{
      "/plot": "http://localhost:5000",
      "/plot_single": "http://localhost:5000",
      "/validate_intervals": "http://localhost:5000",
      "/check_convergence": "http://localhost:5000",
      "/suggest_intervals": "http://localhost:5000",
    },
  },
});