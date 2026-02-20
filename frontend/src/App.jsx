import OSMRoads from "./OSMRoads";
import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <OSMRoads />
    </ErrorBoundary>
  );

}

export default App;