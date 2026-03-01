import { useState } from "react"
import Home from "./pages/Home"
import Login from "./pages/Login"
import MapPage from "./pages/MapPage"

function App() {

  const [page, setPage] = useState("map")

  if(page === "home"){
    return <Home />
  }

  if(page === "login"){
    return <Login />
  }

  if(page === "map"){
    return <MapPage />
  }

}

export default App