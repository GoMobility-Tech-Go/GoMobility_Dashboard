import { useRoutes } from "react-router-dom";
import routes from "./app/routes";

const App = () => {
  return useRoutes(routes);
};

export default App;