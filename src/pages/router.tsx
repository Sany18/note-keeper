import { createBrowserRouter } from "react-router-dom";

import { About } from "./About/About";
import { Privacy } from "./Privacy/Privacy";
import { NotFound404 } from "./NotFound404/NotFound404";
import App from "./App";
import { TermsOfService } from "./TermsOfService/TermsOfService";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
  },
  {
    path: "/about",
    element: <About />
  },
  {
    path: "/policy",
    element: <Privacy />,
  },
  {
    path: "/terms-of-service",
    element: <TermsOfService />
  },
  {
    path: "*",
    element: <NotFound404 />
  }
], {
  basename: import.meta.env.BASE_URL
});
