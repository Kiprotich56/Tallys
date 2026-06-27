import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { setBaseUrl } from "@workspace/api-client-react";

// Replace with your Render backend URL
setBaseUrl("https://tallys-ne1s.onrender.com");

createRoot(document.getElementById("root")!).render(<App />);
