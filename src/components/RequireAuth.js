import { Navigate, Outlet } from "react-router-dom"
import { useSession } from '../useSession'

function RequireAuth() {
  const { session, profile } = useSession()

  let conditionMet = session & !profile?.firstname

  return (
    <div>
      {
        conditionMet
          ? <Outlet />
          : <Navigate to="/register" />
      }
    </div>
  )
}

export default RequireAuth