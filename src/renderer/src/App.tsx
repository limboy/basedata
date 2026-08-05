import { Route, Routes } from 'react-router-dom'
import ProjectListPage from './pages/ProjectListPage'
import ProjectPage from './pages/ProjectPage'

export default function App(): React.JSX.Element {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/project/:id" element={<ProjectPage />} />
    </Routes>
  )
}
